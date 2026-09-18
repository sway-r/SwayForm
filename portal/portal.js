/* SwayForm Learning Portal — window manager, desktop, router.
   No build step: this is a plain ES module loaded directly by the browser. */
import { icon } from './icons.js';
import * as LearnApp from './apps/learn/learn.js';
import * as AccountApp from './apps/account/account.js';
import * as HelpApp from './apps/help/help.js';
import * as SettingsApp from './apps/settings/settings.js';
import * as RobotApp from './apps/robot/robot.js';
import * as AdminApp from './apps/admin/admin.js';
import * as CodeEditorApp from './apps/code-editor/code-editor.js';
import * as Login from './auth/login.js';
import * as Onboarding from './auth/onboarding.js';
import { isAuthenticated, getSession, logout } from './services/auth-service.js';
import { setWorkspaceAccount } from './apps/learn/editor/mock-fs.js';
import { startAdminJobWatch, stopAdminJobWatch, onPendingCountChange } from './services/robot-jobs-service.js';

const REGISTRY = [LearnApp, AccountApp, HelpApp, SettingsApp, RobotApp, AdminApp, CodeEditorApp]
  .reduce((map, mod) => { map[mod.meta.id] = mod; return map; }, {});

const STORAGE_KEY = 'swayform.portal.openApps';

const loginRootEl = document.getElementById('login-root');
const desktopEl = document.getElementById('desktop');
const desktopIconsEl = document.getElementById('desktop-icons');
const guestBadgeEl = document.getElementById('desktop-guest-badge');
const layerEl = document.getElementById('windows-layer');
const taskbarWinsEl = document.getElementById('taskbar-windows');
const launcherEl = document.getElementById('taskbar-launcher');
const clockEl = document.getElementById('desktop-clock');
const logoutBtnEl = document.getElementById('taskbar-logout');

/** appId -> { el, meta, instance, maximized, geometry:{left,top,w,h} } */
const windows = new Map();
let zCounter = 10;
let activeAppId = null;

/* -------------------------------------------------------- Desktop icons */
// The entire purpose of Home: a place to launch applications. No hero, no
// progress widgets, no dashboard — just shortcuts, like a real desktop.
function renderDesktopIcons(session){
  desktopIconsEl.innerHTML = '';
  const positions = loadIconPositions();
  visibleApps(session).forEach(mod => {
    const btn = document.createElement('button');
    btn.className = 'desktop-icon';
    btn.type = 'button';
    btn.dataset.appId = mod.meta.id;
    btn.setAttribute('role', 'listitem');
    btn.setAttribute('aria-label', mod.meta.title);
    btn.innerHTML = `
      <span class="desktop-icon-glyph">${icon(mod.meta.icon)}<span class="desktop-icon-badge" data-badge hidden></span></span>
      <span class="desktop-icon-label">${mod.meta.title}</span>`;
    btn.addEventListener('click', () => {
      // A drag-then-release fires a click right after mouseup on the same
      // element — swallow exactly that one so dropping an icon doesn't also
      // launch the app underneath your cursor.
      if (btn._justDragged){ btn._justDragged = false; return; }
      openApp(mod.meta.id);
    });
    const saved = positions[mod.meta.id];
    if (saved){
      btn.style.position = 'absolute';
      btn.style.left = saved.left + 'px';
      btn.style.top = saved.top + 'px';
    }
    makeIconDraggable(btn, mod.meta.id);
    desktopIconsEl.appendChild(btn);
  });
}

/** Purely cosmetic, per-browser (same as window layout below, not synced
 * across devices) — lets someone arrange their desktop icons how they like.
 * Nothing reads these positions except this render function. */
const ICON_POSITIONS_KEY = 'swayform_desktop_icon_positions';

function loadIconPositions(){
  try { return JSON.parse(localStorage.getItem(ICON_POSITIONS_KEY) || '{}'); }
  catch (e) { return {}; }
}

function saveIconPosition(appId, left, top){
  try {
    const positions = loadIconPositions();
    positions[appId] = { left, top };
    localStorage.setItem(ICON_POSITIONS_KEY, JSON.stringify(positions));
  } catch (e) { /* storage unavailable — position just won't stick, non-fatal */ }
}

/** Free-drag a desktop icon to an absolute position within .desktop-icons.
 * Icons nobody has ever dragged stay in the normal flex-column flow — only
 * a moved icon gets pulled out of flow via position:absolute, so the rest
 * of the stack reflows to fill the gap, same as a real desktop. */
function makeIconDraggable(btn, appId){
  let drag = null;
  btn.addEventListener('mousedown', (e) => {
    const rect = btn.getBoundingClientRect();
    const parentRect = desktopIconsEl.getBoundingClientRect();
    drag = { sx: e.clientX, sy: e.clientY, left: rect.left - parentRect.left, top: rect.top - parentRect.top, moved: false };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  });
  function onMove(e){
    if (!drag) return;
    const dx = e.clientX - drag.sx, dy = e.clientY - drag.sy;
    if (!drag.moved && Math.hypot(dx, dy) < 4) return; // ignore jitter — not a real drag yet
    drag.moved = true;
    btn.classList.add('dragging');
    btn.style.position = 'absolute';
    const parentRect = desktopIconsEl.getBoundingClientRect();
    const left = Math.max(0, Math.min(drag.left + dx, parentRect.width - btn.offsetWidth));
    const top = Math.max(0, Math.min(drag.top + dy, parentRect.height - btn.offsetHeight));
    btn.style.left = left + 'px';
    btn.style.top = top + 'px';
  }
  function onUp(){
    if (!drag) return;
    const wasMoved = drag.moved;
    drag = null;
    btn.classList.remove('dragging');
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseup', onUp);
    if (wasMoved){
      btn._justDragged = true;
      saveIconPosition(appId, parseFloat(btn.style.left), parseFloat(btn.style.top));
    }
  }
}

const BASE_TITLE = document.title;

/** Admin-only: a badge on the Admin desktop icon + a "(N)" tab-title prefix
 * for pending Run on Robot submissions, so an admin notices a student is
 * waiting even without the Admin app open. See robot-jobs-service.js. */
function setAdminJobBadge(count){
  const badgeEl = desktopIconsEl.querySelector('[data-app-id="admin"] [data-badge]');
  if (badgeEl){
    badgeEl.hidden = count <= 0;
    badgeEl.textContent = count > 9 ? '9+' : String(count);
  }
  document.title = count > 0 ? `(${count}) ${BASE_TITLE}` : BASE_TITLE;
}

// Studio (studio/server/content-load.mjs + adapters/portal-home-writer.mjs)
// statically AST-parses this exact function for its desktop-icon editor —
// it must stay a plain `return [Ident, ...]` with no logic, or Studio's
// parser silently falls through to "every imported app" and its writer
// throws when saving. Keep any conditional/session-based app visibility out
// of this function; put it in visibleApps() below instead.
function REGISTRY_ORDER(){
  return [LearnApp, AccountApp, HelpApp, SettingsApp];
}

// Session-gated apps (Robot, Admin) are spliced in here rather than in
// REGISTRY_ORDER() itself — their visibility is role-based access, not a
// content-editorial on/off toggle, so it's deliberately outside what
// Studio's desktop-icon editor manages. robot.js itself further branches on
// whether a robot is actually linked, since "not linked yet" is a real,
// honest state worth showing (with a path to simulation access), not a
// reason to hide the icon entirely.
function visibleApps(session){
  const apps = REGISTRY_ORDER();
  if (session && session.mode !== 'guest') apps.splice(1, 0, RobotApp);
  if (session && session.mode === 'admin') apps.splice(1, 0, AdminApp);
  if (session && session.mode === 'admin' && session.robotId) apps.splice(1, 0, CodeEditorApp);
  return apps;
}

/* ---------------------------------------------------------- Window geometry */
function layerBounds(){
  const r = layerEl.getBoundingClientRect();
  return { w: r.width, h: r.height };
}

function maximizedRect(){
  const { w, h } = layerBounds();
  return { left: 0, top: 0, w: Math.max(320, w), h: Math.max(220, h) };
}

/** A maximized window owns the whole screen above the taskbar: the brand/
 *  clock topline is hidden while any visible window is maximized, which
 *  changes the layer's height — so every maximized window is re-fitted
 *  afterwards. Call after anything that changes maximized/minimized/open
 *  state. */
function syncMaximizedLayout(){
  const anyMaximized = [...windows.values()].some((w) => w.maximized && !w.minimized);
  desktopEl.classList.toggle('has-maximized', anyMaximized);
  windows.forEach((win) => {
    if (!win.maximized) return;
    const r = maximizedRect();
    Object.assign(win.el.style, { left: r.left + 'px', top: r.top + 'px', width: r.w + 'px', height: r.h + 'px' });
  });
}

function centeredRect(defaultSize){
  const { w, h } = layerBounds();
  const cw = Math.min(defaultSize.w, w - 40);
  const ch = Math.min(defaultSize.h, h - 40);
  return { left: Math.max(12, (w - cw) / 2), top: Math.max(12, (h - ch) / 2), w: cw, h: ch };
}

/* ---------------------------------------------------------- Window creation */
function openApp(appId, params, opts){
  opts = opts || {};
  const mod = REGISTRY[appId];
  if (!mod) return;

  let win = windows.get(appId);
  if (!win){
    win = createWindow(mod, opts.geometry || null);
    windows.set(appId, win);
    persistOpenApps();
  }
  if (opts.path) win.lastPath = opts.path;
  win.el.classList.remove('minimized');
  win.minimized = false;
  if (!opts.noFocus) focusWindow(appId);
  renderTaskbar();

  if (params && win.instance && typeof win.instance.onParams === 'function'){
    win.instance.onParams(params);
  } else if (params && win.pendingParams !== params){
    win.pendingParams = params;
  }
  if (!opts.silent) navigateForApp(appId, params);
}

function createWindow(mod, saved){
  const el = document.createElement('section');
  // A window reopened from a saved desktop session resumes the same
  // maximized/restored state and bounds it had before refresh, instead of
  // always forcing maximized — otherwise "restore on refresh" only ever
  // restored WHICH apps were open, never how the student had arranged them.
  const startMaximized = saved ? !!saved.maximized : true;
  el.className = 'window ' + (startMaximized ? 'maximized' : 'restored');
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-label', mod.meta.title);

  const restoredGeometry = (saved && saved.w) ? { left: saved.left, top: saved.top, w: saved.w, h: saved.h } : centeredRect(mod.meta.defaultSize || { w: 900, h: 620 });
  const rect = startMaximized ? maximizedRect() : restoredGeometry;
  Object.assign(el.style, { left: rect.left + 'px', top: rect.top + 'px', width: rect.w + 'px', height: rect.h + 'px' });

  el.innerHTML = `
    <header class="window-header">
      <span class="window-title-icon">${icon(mod.meta.icon)}</span>
      <span class="window-title">${mod.meta.title}</span>
      <span class="window-title-sub"></span>
      <span class="window-header-spacer"></span>
      <div class="window-controls">
        <button type="button" class="win-ctrl" data-act="minimize" aria-label="Minimize">${icon('minimize')}</button>
        <button type="button" class="win-ctrl" data-act="toggle" aria-label="${startMaximized ? 'Restore' : 'Maximize'}">${icon(startMaximized ? 'restore' : 'maximize')}</button>
        <button type="button" class="win-ctrl close" data-act="close" aria-label="Close">${icon('close')}</button>
      </div>
    </header>
    <div class="window-body"></div>`;

  layerEl.appendChild(el);

  const body = el.querySelector('.window-body');
  const subEl = el.querySelector('.window-title-sub');
  const titleEl = el.querySelector('.window-title');
  const header = el.querySelector('.window-header');

  const win = { el, meta: mod.meta, instance: null, maximized: startMaximized, minimized: false,
    geometry: restoredGeometry, lastPath: null, closed: false };

  el.addEventListener('mousedown', () => focusWindow(mod.meta.id));

  el.querySelector('[data-act="close"]').addEventListener('click', (e) => { e.stopPropagation(); closeWindow(mod.meta.id); });
  el.querySelector('[data-act="minimize"]').addEventListener('click', (e) => { e.stopPropagation(); minimizeWindow(mod.meta.id); });
  el.querySelector('[data-act="toggle"]').addEventListener('click', (e) => { e.stopPropagation(); toggleMaximize(mod.meta.id); });

  makeDraggable(header, el, win);
  observeManualResize(el, win);

  const ctx = {
    windowEl: body,
    setTitle(sub){ subEl.textContent = sub ? '— ' + sub : ''; },
    setAppTitle(t){ titleEl.textContent = t; },
    navigate(path, params){ navigateForApp(mod.meta.id, params, path); },
    openApp(id, p){ openApp(id, p); },
    close(){ closeWindow(mod.meta.id); },
  };

  // Robot and Code Editor mount asynchronously (they await getSession()
  // before rendering) — mod.mount() then returns a Promise, not the
  // {unmount()} instance itself. Storing that Promise directly as
  // win.instance meant closeWindow()'s `typeof win.instance.unmount ===
  // 'function'` check never matched, so closing Robot never cleared its
  // status-poll interval or released its live video connection. Await the
  // result and, if the window was already closed by the time it resolves,
  // unmount it immediately instead of leaving it referenced by nothing.
  const mountResult = mod.mount(body, ctx);
  if (mountResult && typeof mountResult.then === 'function'){
    mountResult.then((instance) => {
      if (win.closed){ if (instance && typeof instance.unmount === 'function') instance.unmount(); return; }
      win.instance = instance || null;
    }).catch((err) => console.error(`${mod.meta.id}: mount failed`, err));
  } else {
    win.instance = mountResult;
  }
  return win;
}

function makeDraggable(handle, el, win){
  let drag = null;
  handle.addEventListener('mousedown', (e) => {
    if (e.target.closest('.win-ctrl')) return;
    if (win.maximized) return; // maximized windows don't drag
    drag = { sx: e.clientX, sy: e.clientY, left: parseFloat(el.style.left), top: parseFloat(el.style.top) };
    el.classList.add('dragging');
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  });
  function onMove(e){
    if (!drag) return;
    const dx = e.clientX - drag.sx, dy = e.clientY - drag.sy;
    const { w, h } = layerBounds();
    let left = drag.left + dx, top = drag.top + dy;
    left = Math.max(-el.offsetWidth + 80, Math.min(left, w - 80));
    top = Math.max(0, Math.min(top, h - 40));
    el.style.left = left + 'px';
    el.style.top = top + 'px';
    win.geometry.left = left; win.geometry.top = top;
  }
  function onUp(){
    if (!drag) return;
    drag = null;
    el.classList.remove('dragging');
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseup', onUp);
    persistOpenApps();
  }
}

/** Restored windows use native CSS `resize:both` (see .window.restored in
 * portal.css) rather than a custom handle. win.geometry only tracked
 * left/top from dragging — a manual corner-drag resize was applied to the
 * element's style directly but never written back, so restoring from
 * maximized silently reverted to the size at creation/last drag. This
 * keeps win.geometry.w/h in sync with whatever size the user last set,
 * while maximized (where geometry must stay the pre-maximize size). */
function observeManualResize(el, win){
  const ro = new ResizeObserver(() => {
    if (win.maximized) return;
    const w = el.offsetWidth, h = el.offsetHeight;
    if (w && h){ win.geometry.w = w; win.geometry.h = h; persistOpenApps(); }
  });
  ro.observe(el);
}

/* ---------------------------------------------------------- Window actions */
function focusWindow(appId){
  const win = windows.get(appId);
  if (!win) return;
  activeAppId = appId;
  windows.forEach((w, id) => w.el.classList.toggle('focused', id === appId));
  win.el.style.zIndex = ++zCounter;
  renderTaskbar();
  syncFocusUrl(appId, win);
  // Every focus change is a candidate "this is what a refresh should come
  // back to" — see restoreOpenApps()/showDesktop() for why recording this
  // explicitly (not inferring it from window-creation order) matters.
  persistOpenApps();
}

/** Keep the address bar pointing at whichever app is actually focused.
 * openApp() already does this itself via navigateForApp() below, but
 * switching focus by clicking the taskbar or an already-open window calls
 * focusWindow() directly and skipped it entirely — so the URL stayed on
 * whatever app was last opened/deep-linked, and refreshing reopened THAT
 * app on top instead of the one you were actually looking at. Uses the
 * window's own last known path when there is one (so a deep link, e.g.
 * into a specific Learn activity, survives a focus switch), falling back
 * to the app's bare path otherwise. replaceState, not pushState —
 * refocusing an already-open window isn't a new place to "go back" to. */
function syncFocusUrl(appId, win){
  const path = win.lastPath || pathForApp(appId, {});
  if (location.pathname !== path) history.replaceState({}, '', path);
}

function closeWindow(appId){
  const win = windows.get(appId);
  if (!win) return;
  win.closed = true;
  if (win.instance && typeof win.instance.unmount === 'function') win.instance.unmount();
  win.el.remove();
  windows.delete(appId);
  if (activeAppId === appId) activeAppId = null;
  persistOpenApps();
  renderTaskbar();
  if (windows.size === 0) navigateTo('/');
}

function minimizeWindow(appId){
  const win = windows.get(appId);
  if (!win) return;
  win.minimized = true;
  win.el.classList.add('minimized');
  renderTaskbar();
}

/** "Show desktop" — minimizes every open window in one shot, without
 * closing any of them (unlike closeWindow, nothing here unmounts an app or
 * touches persisted layout). One renderTaskbar() call at the end instead of
 * one per window. */
function minimizeAllWindows(){
  windows.forEach((win) => {
    win.minimized = true;
    win.el.classList.add('minimized');
  });
  renderTaskbar();
}

function toggleMaximize(appId){
  const win = windows.get(appId);
  if (!win) return;
  win.maximized = !win.maximized;
  const toggleBtn = win.el.querySelector('[data-act="toggle"]');
  if (win.maximized){
    win.el.classList.add('maximized');
    win.el.classList.remove('restored');
    const r = maximizedRect();
    Object.assign(win.el.style, { left: r.left + 'px', top: r.top + 'px', width: r.w + 'px', height: r.h + 'px', resize: 'none' });
    toggleBtn.innerHTML = icon('restore');
    toggleBtn.setAttribute('aria-label', 'Restore');
  } else {
    win.el.classList.remove('maximized');
    win.el.classList.add('restored');
    const r = win.geometry;
    Object.assign(win.el.style, { left: r.left + 'px', top: r.top + 'px', width: r.w + 'px', height: r.h + 'px' });
    toggleBtn.innerHTML = icon('maximize');
    toggleBtn.setAttribute('aria-label', 'Maximize');
  }
  syncMaximizedLayout();
  focusWindow(appId);
  persistOpenApps();
}

/* ---------------------------------------------------------- Taskbar */
function renderTaskbar(){
  // Every open/close/minimize/restore path ends here, so this is the one
  // place that reliably sees each window-visibility change.
  syncMaximizedLayout();
  taskbarWinsEl.innerHTML = '';
  windows.forEach((win, appId) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'taskbar-win' + (appId === activeAppId && !win.minimized ? ' active' : '');
    btn.innerHTML = `${icon(win.meta.icon)}<span>${win.meta.title}</span>`;
    btn.addEventListener('click', () => {
      if (win.minimized || appId !== activeAppId){
        win.minimized = false;
        win.el.classList.remove('minimized');
        focusWindow(appId);
      } else {
        minimizeWindow(appId);
      }
    });
    taskbarWinsEl.appendChild(btn);
  });
}

/* ---------------------------------------------------------- Router */
const ROUTES = {
  learn: {
    app: 'learn',
    parse: (p) => {
      if (p[0] === 'section') return { view: 'section', sectionId: p[1] };
      if (p[0] === 'activity') return { view: 'activity', activityId: p[1] };
      return { view: 'home' };
    },
  },
  account: { app: 'account', parse: () => ({}) },
  help: { app: 'help', parse: (p) => ({ topic: p[0] }) },
  settings: { app: 'settings', parse: () => ({}) },
  'my-robot': { app: 'robot', parse: () => ({}) },
  admin: { app: 'admin', parse: () => ({}) },
  'code-editor': { app: 'code-editor', parse: () => ({}) },
};

function routeFromPath(pathname){
  const parts = pathname.replace(/^\/+|\/+$/g, '').split('/').filter(Boolean);
  if (!parts.length) return null;
  const route = ROUTES[parts[0]];
  if (!route) return null;
  return { appId: route.app, params: route.parse(parts.slice(1)) };
}

function pathForApp(appId, params){
  params = params || {};
  switch (appId){
    case 'learn':
      if (params.view === 'activity' && params.activityId) return '/learn/activity/' + params.activityId;
      if (params.view === 'section' && params.sectionId) return '/learn/section/' + params.sectionId;
      return '/learn';
    case 'account': return '/account';
    case 'help': return '/help' + (params.topic ? '/' + params.topic : '');
    case 'settings': return '/settings';
    case 'robot': return '/my-robot';
    case 'admin': return '/admin';
    case 'code-editor': return '/code-editor';
    default: return '/';
  }
}

function navigateForApp(appId, params, explicitPath){
  const path = explicitPath || pathForApp(appId, params);
  const win = windows.get(appId);
  if (win) win.lastPath = path;
  navigateTo(path, { skipDispatch: true });
}

function navigateTo(path, opts){
  opts = opts || {};
  if (location.pathname !== path) history.pushState({}, '', path);
  if (!opts.skipDispatch){
    const route = routeFromPath(path);
    if (route) openApp(route.appId, route.params);
  }
}

window.addEventListener('popstate', () => {
  const route = routeFromPath(location.pathname);
  if (route) openApp(route.appId, route.params, { silent: true, path: location.pathname });
});

/* ---------------------------------------------------------- Persistence */
// Stores each open app's full geometry (left/top/w/h/maximized), not just
// which apps are open — otherwise every reopened window came back centered
// at its default size, discarding any drag/resize/maximize the student did
// before refreshing. Also records activeAppId (called from focusWindow() on
// every focus change) — restoreOpenApps() recreates windows in whatever
// order they happen to iterate in, which is creation order, not "what was
// actually on top" — without an explicit record, a refresh could resurface
// a different app than the one you were actually looking at.
function persistOpenApps(){
  try {
    const windowState = {};
    windows.forEach((win, id) => {
      windowState[id] = { left: win.geometry.left, top: win.geometry.top, w: win.geometry.w, h: win.geometry.h, maximized: win.maximized };
    });
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ activeAppId, windows: windowState }));
  } catch (e) { /* storage unavailable — non-fatal */ }
}

/** Recreates every previously-open window (geometry restored, not focused
 * yet — see the noFocus opt) and returns whichever app id was actually
 * active when the state was saved, for the caller to focus once at the end
 * instead of leaving whatever this loop's creation order happened to land
 * on. */
function restoreOpenApps(){
  let windowState = {};
  let savedActiveAppId = null;
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    if (Array.isArray(raw)){
      // Oldest shape: a bare array of app IDs, no geometry, no active app.
      windowState = raw.reduce((m, id) => { m[id] = null; return m; }, {});
    } else if (raw && raw.windows){
      windowState = raw.windows;
      savedActiveAppId = raw.activeAppId || null;
    } else {
      // Previous shape: a flat { id: geometry } map, no activeAppId recorded.
      windowState = raw || {};
    }
  } catch (e) { windowState = {}; }
  Object.keys(windowState).filter((id) => REGISTRY[id]).forEach((id) => {
    openApp(id, null, { silent: true, geometry: windowState[id], noFocus: true });
  });
  return savedActiveAppId;
}

/* ---------------------------------------------------------- Clock */
function tickClock(){
  const d = new Date();
  clockEl.textContent = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
tickClock();
setInterval(tickClock, 15000);

/* ---------------------------------------------------------- Launcher */
launcherEl.addEventListener('click', () => minimizeAllWindows());
launcherEl.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); launcherEl.click(); }
});

/* ---------------------------------------------------------- Logout */
// The one primary way to end the session — Account's own Sign Out button
// calls this same function, so there's a single consistent logout path
// regardless of where it's triggered from.
logoutBtnEl.querySelector('.taskbar-logout-glyph').innerHTML = icon('logout');
logoutBtnEl.addEventListener('click', async () => {
  if (!window.confirm('Log out of SwayForm Learning Portal?')) return;
  desktopEl.hidden = true;
  try { await logout(); }
  catch (error){ window.alert(error.message || 'Sign-out failed. Reconnect and retry.'); location.href = '/login?logout=pending'; return; }
  location.href = '/login';
});

window.addEventListener('resize', () => {
  syncMaximizedLayout();
  const { w: lw, h: lh } = layerBounds();
  windows.forEach((win) => {
    if (win.maximized) return;
    // Reclamp restored windows too — otherwise shrinking the viewport (or
    // rotating a tablet) can strand a window's header entirely off-screen
    // with no way to grab it back, since drag/resize bounds above were only
    // ever checked against the viewport size at the time of that gesture.
    const w = Math.min(win.geometry.w, Math.max(320, lw));
    const h = Math.min(win.geometry.h, Math.max(220, lh));
    const left = Math.max(0, Math.min(win.geometry.left, Math.max(0, lw - w)));
    const top = Math.max(0, Math.min(win.geometry.top, Math.max(0, lh - h)));
    win.geometry.w = w; win.geometry.h = h; win.geometry.left = left; win.geometry.top = top;
    Object.assign(win.el.style, { left: left + 'px', top: top + 'px', width: w + 'px', height: h + 'px' });
  });
});

/* ---------------------------------------------------------- Boot / auth gate */
async function showDesktop(){
  const session = await getSession();
  if (!session){ showLogin(); return; }
  setWorkspaceAccount(session);

  // Every path into the desktop (boot, Google login, guest login) funnels
  // through here — so this is the one place a first-time real login gets
  // routed to onboarding instead, before anything renders fabricated-looking
  // fallback state for a profile that doesn't exist yet.
  if (session && session.mode !== 'guest' && session.hasProfile === false){
    showOnboarding(session);
    return;
  }

  loginRootEl.hidden = true;
  desktopEl.hidden = false;

  guestBadgeEl.hidden = !(session && session.mode === 'guest');

  renderDesktopIcons(session);

  if (session && session.mode === 'admin'){
    startAdminJobWatch();
    onPendingCountChange(setAdminJobBadge);
  } else {
    stopAdminJobWatch();
    setAdminJobBadge(0);
  }

  // Capture the actual refresh-time URL before restoring anything — restored
  // windows don't focus themselves anymore (see restoreOpenApps()'s noFocus),
  // but this is still the most specific signal available for a deep-linked
  // view (e.g. one particular Learn activity), so it still takes priority
  // below when present.
  const bootPath = location.pathname;
  const initialRoute = routeFromPath(bootPath);

  // Always restore whatever was open last session first (with its saved
  // geometry) — otherwise refreshing on a deep link like /learn or /account
  // skipped this branch entirely and every window came back at its default
  // maximized bounds, discarding position/size for THIS window even though
  // the general case (refresh on the bare desktop) preserved it correctly.
  const savedActiveAppId = restoreOpenApps();

  if (initialRoute){
    // A specific deep-linked view (e.g. /learn/activity/finger-count) beats
    // "whichever app was active" — it's more specific about what the
    // student was actually looking at, down to the sub-view.
    openApp(initialRoute.appId, initialRoute.params, { silent: true, path: bootPath });
    history.replaceState({}, '', bootPath);
  } else if (savedActiveAppId && windows.has(savedActiveAppId)){
    // No specific deep link (e.g. refreshed on the bare desktop after
    // minimizing everything) — fall back to whichever app was actually
    // focused when state was last saved, instead of leaving
    // restoreOpenApps()'s creation-order artifact focused. This also fixes
    // the URL itself via focusWindow -> syncFocusUrl, so no separate
    // history.replaceState is needed here.
    focusWindow(savedActiveAppId);
  } else {
    history.replaceState({}, '', bootPath);
  }
}

function showLogin(){
  desktopEl.hidden = true;
  loginRootEl.hidden = false;
  Login.mount(loginRootEl, {
    onAuthenticated: () => { showDesktop(); },
  });
}

function showOnboarding(session){
  desktopEl.hidden = true;
  loginRootEl.hidden = false;
  Onboarding.mount(loginRootEl, { session, onComplete: () => showDesktop() });
}

async function boot(){
  const authed = await isAuthenticated();
  if (!authed){
    showLogin();
    return;
  }
  await showDesktop();
}

const saveNotice = document.createElement('div');
saveNotice.setAttribute('role', 'alert');
saveNotice.className = 'portal-save-notice';
saveNotice.hidden = true;
document.body.appendChild(saveNotice);
window.addEventListener('swayform:save-error', (event) => {
  saveNotice.textContent = event.detail;
  saveNotice.hidden = false;
});

boot().catch(() => {
  desktopEl.hidden = true;
  loginRootEl.hidden = false;
  loginRootEl.textContent = 'Could not check your session. Check your connection and reload to retry.';
});

export const Portal = { openApp, closeWindow, navigateTo };
window.SwayPortal = Portal;
