/* SwayForm Learning Portal — window manager, desktop, router.
   No build step: this is a plain ES module loaded directly by the browser. */
import { icon } from './icons.js';
import * as LearnApp from './apps/learn/learn.js';
import * as ProjectsApp from './apps/projects/projects.js';
import * as AccountApp from './apps/account/account.js';
import * as HelpApp from './apps/help/help.js';
import * as SettingsApp from './apps/settings/settings.js';
import * as Login from './auth/login.js';
import { isAuthenticated, getSession, logout } from './services/auth-service.js';

const REGISTRY = [LearnApp, ProjectsApp, AccountApp, HelpApp, SettingsApp]
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
function renderDesktopIcons(){
  desktopIconsEl.innerHTML = '';
  REGISTRY_ORDER().forEach(mod => {
    const btn = document.createElement('button');
    btn.className = 'desktop-icon';
    btn.type = 'button';
    btn.setAttribute('role', 'listitem');
    btn.setAttribute('aria-label', mod.meta.title);
    btn.innerHTML = `
      <span class="desktop-icon-glyph">${icon(mod.meta.icon)}</span>
      <span class="desktop-icon-label">${mod.meta.title}</span>`;
    btn.addEventListener('click', () => openApp(mod.meta.id));
    desktopIconsEl.appendChild(btn);
  });
}

function REGISTRY_ORDER(){
  return [LearnApp, ProjectsApp, AccountApp, HelpApp, SettingsApp];
}

/* ---------------------------------------------------------- Window geometry */
function layerBounds(){
  const r = layerEl.getBoundingClientRect();
  return { w: r.width, h: r.height };
}

function maximizedRect(){
  const { w, h } = layerBounds();
  return { left: 10, top: 10, w: Math.max(320, w - 20), h: Math.max(220, h - 20) };
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
  win.el.classList.remove('minimized');
  win.minimized = false;
  focusWindow(appId);
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
    geometry: restoredGeometry };

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

  win.instance = mod.mount(body, ctx);
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
}

function closeWindow(appId){
  const win = windows.get(appId);
  if (!win) return;
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
  focusWindow(appId);
  persistOpenApps();
}

/* ---------------------------------------------------------- Taskbar */
function renderTaskbar(){
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
  project: { app: 'projects', parse: (p) => ({ projectId: p[0] }) },
  account: { app: 'account', parse: () => ({}) },
  help: { app: 'help', parse: (p) => ({ topic: p[0] }) },
  settings: { app: 'settings', parse: () => ({}) },
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
    case 'projects': return '/project' + (params.projectId ? '/' + params.projectId : '');
    case 'account': return '/account';
    case 'help': return '/help' + (params.topic ? '/' + params.topic : '');
    case 'settings': return '/settings';
    default: return '/';
  }
}

function navigateForApp(appId, params, explicitPath){
  const path = explicitPath || pathForApp(appId, params);
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
  if (route) openApp(route.appId, route.params, { silent: true });
});

/* ---------------------------------------------------------- Persistence */
// Stores each open app's full geometry (left/top/w/h/maximized), not just
// which apps are open — otherwise every reopened window came back centered
// at its default size, discarding any drag/resize/maximize the student did
// before refreshing.
function persistOpenApps(){
  try {
    const state = {};
    windows.forEach((win, id) => {
      state[id] = { left: win.geometry.left, top: win.geometry.top, w: win.geometry.w, h: win.geometry.h, maximized: win.maximized };
    });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) { /* storage unavailable — non-fatal */ }
}

function restoreOpenApps(){
  let state = {};
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    // Back-compat: older sessions stored a bare array of app IDs with no geometry.
    state = Array.isArray(raw) ? raw.reduce((m, id) => { m[id] = null; return m; }, {}) : raw;
  } catch (e) { state = {}; }
  Object.keys(state).filter((id) => REGISTRY[id]).forEach((id) => {
    openApp(id, null, { silent: true, geometry: state[id] });
  });
}

/* ---------------------------------------------------------- Clock */
function tickClock(){
  const d = new Date();
  clockEl.textContent = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
tickClock();
setInterval(tickClock, 15000);

/* ---------------------------------------------------------- Launcher */
launcherEl.addEventListener('click', () => openApp('learn'));
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
  await logout();
  location.href = '/';
});

window.addEventListener('resize', () => {
  const { w: lw, h: lh } = layerBounds();
  windows.forEach((win) => {
    if (win.maximized){
      const r = maximizedRect();
      Object.assign(win.el.style, { left: r.left + 'px', top: r.top + 'px', width: r.w + 'px', height: r.h + 'px' });
      return;
    }
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
  loginRootEl.hidden = true;
  desktopEl.hidden = false;

  const session = await getSession();
  guestBadgeEl.hidden = !(session && session.mode === 'guest');

  renderDesktopIcons();

  // Always restore whatever was open last session first (with its saved
  // geometry) — otherwise refreshing on a deep link like /learn or /account
  // skipped this branch entirely and every window came back at its default
  // maximized bounds, discarding position/size for THIS window even though
  // the general case (refresh on the bare desktop) preserved it correctly.
  restoreOpenApps();
  const initialRoute = routeFromPath(location.pathname);
  if (initialRoute){
    openApp(initialRoute.appId, initialRoute.params, { silent: true });
    history.replaceState({}, '', location.pathname);
  }
}

function showLogin(){
  desktopEl.hidden = true;
  loginRootEl.hidden = false;
  Login.mount(loginRootEl, {
    onAuthenticated: () => { showDesktop(); },
  });
}

async function boot(){
  const authed = await isAuthenticated();
  if (!authed){
    showLogin();
    return;
  }
  await showDesktop();
}

boot();

export const Portal = { openApp, closeWindow, navigateTo };
window.SwayPortal = Portal;
