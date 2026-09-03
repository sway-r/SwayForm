/* Reusable nested-desktop window manager. Framework-agnostic vanilla JS —
 * this repo has no bundler, so this is hand-rolled rather than pulling a
 * drag/resize library over the network (same reasoning as loading Monaco
 * via its own CDN script: keep dependencies to what's already established).
 *
 * One instance manages one "desktop" element (here: the Activity Workspace's
 * body). Apps are registered lazily — nothing mounts until first `open()`.
 * Layout (position/size/minimized/maximized/open) persists to localStorage
 * under a caller-supplied storageKey — activity-workspace.js scopes that key
 * per activity.id, so each activity remembers its own arrangement.
 *
 * A window that's never been dragged/resized/snapped stays "pristine": its
 * bounds are always re-derived from the percentage-based defaultLayout
 * against the CURRENT desktop size (on open and on every resize), rather
 * than trusting whatever pixel bounds got persisted last time — otherwise
 * reopening on a differently-sized desktop (portal window not maximized,
 * a different monitor, a fullscreen toggle) reapplies stale pixels sized
 * for a different viewport. The moment a window is actually customized,
 * `pristine` flips to false and its saved bounds are respected as-is.
 */
import { icon } from '../../../icons.js';

const SNAP_MARGIN = 28;
const MIN_W = 260;
const MIN_H = 180;

function clamp(v, lo, hi) { return Math.max(lo, Math.min(v, hi)); }

export class WorkspaceWindowManager {
  constructor(desktopEl, { storageKey, defaultLayout }) {
    this.desktopEl = desktopEl;
    this.storageKey = storageKey;
    this.defaultLayout = defaultLayout; // { [id]: {x,y,w,h,minimized,maximized,open} } in %/px mix — see below
    this.apps = new Map();   // id -> { title, icon, minWidth, minHeight, render }
    this.windows = new Map(); // id -> runtime state + el + instance
    this.zCounter = 10;
    this.activeId = null;
    this.listeners = new Set();

    this._snapPreviewEl = document.createElement('div');
    this._snapPreviewEl.className = 'ww-snap-preview';
    this.desktopEl.appendChild(this._snapPreviewEl);

    this._layout = this._loadLayout();

    this._ro = new ResizeObserver(() => this._reclampAll());
    this._ro.observe(this.desktopEl);
  }

  /** Disconnects the ResizeObserver. Call when the desktop element is about
   * to be torn down — otherwise a resize notification for the (now zero-size
   * or removed) element can fire asynchronously afterward, and _reclampAll's
   * _persist() would overwrite the just-saved layout with an empty one since
   * this.windows was already cleared by close(). */
  destroy() { this._ro.disconnect(); }

  onChange(cb) { this.listeners.add(cb); return () => this.listeners.delete(cb); }
  _notify() { this.listeners.forEach((cb) => cb(this.getAllStates())); }

  registerApp(id, config) {
    this.apps.set(id, config);
  }

  getAllStates() {
    const out = {};
    this.apps.forEach((cfg, id) => { out[id] = this.getState(id); });
    return out;
  }

  getState(id) {
    const w = this.windows.get(id);
    if (w) return { open: w.open, minimized: w.minimized, maximized: w.maximized, active: id === this.activeId };
    const persisted = this._layout[id];
    return { open: !!(persisted && persisted.open), minimized: !!(persisted && persisted.minimized), maximized: false, active: false };
  }

  /* ---------------------------------------------------------------- bounds */
  _desktopBounds() {
    const r = this.desktopEl.getBoundingClientRect();
    return { w: r.width, h: r.height };
  }

  _defaultBoundsFor(id) {
    const cfg = this.apps.get(id) || {};
    return this._boundsFromPct(this.defaultLayout[id] || {}, cfg.minWidth, cfg.minHeight);
  }

  /** minW/minH floor the computed size at each app's registered minWidth/
   *  minHeight (falling back to the global MIN_W/MIN_H) — without this, a
   *  percentage of a narrow desktop can land well under what the app can
   *  actually render (e.g. the Notebook shrinking to ~160px and going
   *  effectively blank). x/y are then clamped so a floored window never
   *  hangs off the right/bottom edge. */
  _boundsFromPct(d, minW, minH) {
    const { w: dw, h: dh } = this._desktopBounds();
    const w = Math.min(dw, Math.max(minW || MIN_W, Math.round((d.wPct != null ? d.wPct : 40) / 100 * dw)));
    const h = Math.min(dh, Math.max(minH || MIN_H, Math.round((d.hPct != null ? d.hPct : 80) / 100 * dh)));
    const x = clamp(Math.round((d.xPct != null ? d.xPct : 4) / 100 * dw), 0, Math.max(0, dw - w));
    const y = clamp(Math.round((d.yPct != null ? d.yPct : 4) / 100 * dh), 0, Math.max(0, dh - h));
    return { x, y, w, h, minimized: !!d.minimized, maximized: !!d.maximized };
  }

  /** Apply an explicit named layout (e.g. a preset) — same shape as
   * defaultLayout. Apps missing from layoutMap are closed; others are
   * opened/repositioned to the given bounds, minimized if requested. */
  applyLayout(layoutMap) {
    this.apps.forEach((cfg, id) => {
      const d = layoutMap[id];
      if (!d) { this.close(id); return; }
      const bounds = this._boundsFromPct(d, cfg.minWidth, cfg.minHeight);
      const w = this.open(id, { silent: true });
      w.maximized = false;
      w.x = bounds.x; w.y = bounds.y; w.w = bounds.w; w.h = bounds.h;
      // An explicit preset (e.g. "Learn + Code") is a deliberate non-default
      // arrangement — mark it customized so a later desktop resize clamps
      // it in place instead of snapping it back to the tiled default.
      w.pristine = false;
      this._applyBounds(w);
      if (d.minimized) this.minimize(id);
    });
    this._persist();
    this._notify();
  }

  /* ---------------------------------------------------------------- persistence */
  _loadLayout() {
    try { return JSON.parse(localStorage.getItem(this.storageKey) || '{}'); }
    catch (e) { return {}; }
  }

  _persist() {
    // Merge into this._layout rather than rebuilding it from this.windows —
    // this.windows only holds apps instantiated so far *this session*, so a
    // wholesale rebuild would silently drop the saved position of an app
    // that hasn't been open()'d yet (e.g. mid-boot-sequence), before its own
    // open() call gets a chance to read it back.
    this.windows.forEach((w, id) => {
      this._layout[id] = { x: w.x, y: w.y, w: w.w, h: w.h, minimized: w.minimized, maximized: w.maximized, open: w.open, prevBounds: w.prevBounds, pristine: w.pristine };
    });
    try { localStorage.setItem(this.storageKey, JSON.stringify(this._layout)); } catch (e) { /* noop */ }
  }

  resetLayout() {
    this.apps.forEach((cfg, id) => this.close(id));
    try { localStorage.removeItem(this.storageKey); } catch (e) { /* noop */ }
    this._layout = {};
    // open() focuses each app as it opens, so whichever app opens LAST ends
    // up active. Reopen with codeEditor last — matching bootDefault()'s
    // explicit open order in activity-workspace.js — so Code Editor, the
    // primary work surface, ends up focused after a reset, not Terminal
    // (registration order alone would open Notebook, Code Editor, Terminal).
    const keys = Array.from(this.apps.keys());
    const order = keys.includes('codeEditor')
      ? [...keys.filter((id) => id !== 'codeEditor'), 'codeEditor']
      : keys;
    order.forEach((id) => {
      const d = this.defaultLayout[id] || {};
      if (d.minimized) return; // stays closed-until-opened, dock shows it available
      this.open(id, { silent: true });
    });
    this._notify();
  }

  /* ---------------------------------------------------------------- lifecycle */
  open(id, opts) {
    opts = opts || {};
    const cfg = this.apps.get(id);
    if (!cfg) return;
    let w = this.windows.get(id);
    if (!w) {
      const persisted = this._layout[id];
      // Only trust persisted pixel bounds once the student has actually
      // dragged/resized/snapped this window ("pristine" is false). A window
      // that's never been touched re-derives its bounds fresh from the
      // percentage-based default every time, against the CURRENT desktop
      // size — otherwise reopening an activity on a differently-sized
      // desktop (portal window not maximized this time, a different
      // monitor, browser fullscreen toggled) reapplied stale pixel bounds
      // computed for whatever size the desktop happened to be the last
      // time this activity was opened, which is what made the tiled
      // default layout look broken/overlapping until "Workspace" (which
      // resets and clears persisted bounds entirely) was clicked.
      const customized = persisted && persisted.pristine === false;
      const base = customized ? persisted : this._defaultBoundsFor(id);
      w = {
        id, title: cfg.title,
        x: base.x, y: base.y, w: base.w, h: base.h,
        minimized: false, maximized: !!base.maximized, open: true,
        prevBounds: base.prevBounds || null,
        pristine: !customized,
        minW: cfg.minWidth || MIN_W, minH: cfg.minHeight || MIN_H,
        el: null, bodyEl: null, instance: null,
      };
      this.windows.set(id, w);
      this._createEl(w, cfg);
    }
    // A maximized window's stored x/y/w/h are a snapshot of the desktop size
    // at the moment it was maximized — reopening it (e.g. after a reload,
    // or a viewport resize since it was closed) must refit to the CURRENT
    // desktop, matching what _reclampAll already does on a live resize.
    // Otherwise it renders "maximized" at stale dimensions with its resize
    // handles hidden and dragging disabled — a stuck window.
    if (w.maximized) {
      const { w: dw, h: dh } = this._desktopBounds();
      w.x = 0; w.y = 0; w.w = dw; w.h = dh;
    }
    w.open = true;
    w.minimized = false;
    this._applyBounds(w);
    this._syncVisibility(w);
    this.focus(id);
    this._persist();
    if (!opts.silent) this._notify();
    return w;
  }

  close(id) {
    const w = this.windows.get(id);
    if (!w) return;
    if (w.instance && typeof w.instance.dispose === 'function') w.instance.dispose();
    if (w.el) w.el.remove();
    this.windows.delete(id);
    if (this.activeId === id) this.activeId = null;
    // Keep a "closed" record so geometry is remembered if reopened this session.
    this._layout[id] = { x: w.x, y: w.y, w: w.w, h: w.h, minimized: false, maximized: w.maximized, open: false, prevBounds: w.prevBounds, pristine: w.pristine };
    try { localStorage.setItem(this.storageKey, JSON.stringify(this._layout)); } catch (e) { /* noop */ }
    this._notify();
  }

  minimize(id) {
    const w = this.windows.get(id);
    if (!w) return;
    w.minimized = true;
    this._syncVisibility(w);
    if (this.activeId === id) this.activeId = null;
    this._persist();
    this._notify();
  }

  maximize(id) { const w = this.windows.get(id); if (w && !w.maximized) this.toggleMaximize(id); }
  restore(id) { const w = this.windows.get(id); if (w && w.maximized) this.toggleMaximize(id); }

  toggleMaximize(id) {
    const w = this.windows.get(id);
    if (!w) return;
    const { w: dw, h: dh } = this._desktopBounds();
    if (!w.maximized) {
      w.prevBounds = { x: w.x, y: w.y, w: w.w, h: w.h };
      w.x = 0; w.y = 0; w.w = dw; w.h = dh;
      w.maximized = true;
    } else {
      const p = w.prevBounds || this._defaultBoundsFor(id);
      w.x = p.x; w.y = p.y; w.w = p.w; w.h = p.h;
      w.maximized = false;
    }
    this._applyBounds(w);
    this.focus(id);
    this._persist();
    this._notify();
  }

  focus(id) {
    const w = this.windows.get(id);
    if (!w || w.minimized) return;
    this.activeId = id;
    this.windows.forEach((ww, wid) => ww.el && ww.el.classList.toggle('ww-focused', wid === id));
    w.el.style.zIndex = String(++this.zCounter);
    this._notify();
  }

  toggle(id) {
    const w = this.windows.get(id);
    if (!w || !w.open || w.minimized) this.open(id);
    else if (this.activeId === id) this.minimize(id);
    else this.focus(id);
  }

  getInstance(id) {
    const w = this.windows.get(id);
    return w ? w.instance : null;
  }

  /* ---------------------------------------------------------------- DOM */
  _createEl(w, cfg) {
    const el = document.createElement('section');
    // The app-id class lets workspace.css give specific apps (Code Editor,
    // Terminal) a dark developer theme while every other window stays light.
    el.className = 'ww-window ww-app-' + w.id;
    el.innerHTML = `
      <header class="ww-titlebar">
        <span class="ww-titlebar-icon">${icon(cfg.icon)}</span>
        <span class="ww-titlebar-title"></span>
        <span class="ww-titlebar-spacer"></span>
        <div class="ww-controls">
          <button type="button" class="ww-ctrl" data-act="min" aria-label="Minimize">${icon('minimize')}</button>
          <button type="button" class="ww-ctrl" data-act="max" aria-label="Maximize">${icon('maximize')}</button>
          <button type="button" class="ww-ctrl close" data-act="close" aria-label="Close">${icon('close')}</button>
        </div>
      </header>
      <div class="ww-body"></div>
      ${['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'].map((d) => `<div class="ww-resize ww-resize-${d}" data-dir="${d}"></div>`).join('')}
    `;
    this.desktopEl.appendChild(el);
    w.el = el;
    w.bodyEl = el.querySelector('.ww-body');
    w.titleEl = el.querySelector('.ww-titlebar-title');

    el.addEventListener('mousedown', () => this.focus(w.id));
    el.querySelector('[data-act="min"]').addEventListener('click', (e) => { e.stopPropagation(); this.minimize(w.id); });
    el.querySelector('[data-act="max"]').addEventListener('click', (e) => { e.stopPropagation(); this.toggleMaximize(w.id); });
    el.querySelector('[data-act="close"]').addEventListener('click', (e) => { e.stopPropagation(); this.close(w.id); });

    const titlebar = el.querySelector('.ww-titlebar');
    this._makeDraggable(titlebar, w);
    titlebar.addEventListener('dblclick', (e) => { if (e.target.closest('.ww-ctrl')) return; this.toggleMaximize(w.id); });

    el.querySelectorAll('.ww-resize').forEach((handle) => this._makeResizable(handle, w));

    const winApi = {
      setTitle: (sub) => { w.titleEl.textContent = sub ? `${cfg.title} — ${sub}` : cfg.title; },
      focus: () => this.focus(w.id),
      close: () => this.close(w.id),
      isMaximized: () => w.maximized,
    };
    w.titleEl.textContent = cfg.title;
    w.instance = cfg.render(w.bodyEl, winApi) || null;
  }

  _syncVisibility(w) {
    w.el.classList.toggle('ww-minimized', w.minimized);
    w.el.classList.toggle('ww-maximized', w.maximized);
    const maxBtn = w.el.querySelector('[data-act="max"]');
    maxBtn.innerHTML = w.maximized ? icon('restore') : icon('maximize');
    maxBtn.setAttribute('aria-label', w.maximized ? 'Restore' : 'Maximize');
    w.el.querySelectorAll('.ww-resize').forEach((h) => { h.style.display = w.maximized ? 'none' : ''; });
  }

  _applyBounds(w) {
    Object.assign(w.el.style, { left: w.x + 'px', top: w.y + 'px', width: w.w + 'px', height: w.h + 'px' });
    this._syncVisibility(w);
  }

  _reclampAll() {
    const { w: dw, h: dh } = this._desktopBounds();
    this.windows.forEach((w) => {
      if (w.maximized) { w.x = 0; w.y = 0; w.w = dw; w.h = dh; this._applyBounds(w); return; }
      if (w.pristine) {
        // Never dragged/resized/snapped — always re-derive from the
        // percentage default against the CURRENT desktop size instead of
        // clamping stale pixels. Clamping each tiled window independently
        // doesn't preserve their relationship to each other, so a viewport
        // change (fullscreen toggle, browser resize, a narrower/taller
        // window) could leave the default tiled layout overlapping even
        // though every individual window was still technically "in bounds".
        const b = this._defaultBoundsFor(w.id);
        w.x = b.x; w.y = b.y; w.w = b.w; w.h = b.h;
        this._applyBounds(w);
        return;
      }
      // Full containment on an automatic reclamp (viewport resize) — unlike
      // the interactive drag clamp, a window must never end up with its
      // title bar controls hanging off the edge after the browser resizes.
      w.w = Math.min(w.w, Math.max(w.minW || MIN_W, dw));
      w.h = Math.min(w.h, Math.max(w.minH || MIN_H, dh));
      w.x = clamp(w.x, 0, Math.max(0, dw - w.w));
      w.y = clamp(w.y, 0, Math.max(0, dh - w.h));
      this._applyBounds(w);
    });
    this._persist();
  }

  /* ---------------------------------------------------------------- drag */
  _makeDraggable(handle, w) {
    const DRAG_THRESHOLD = 4; // px — below this, treat mousedown+mouseup as a plain click, not a drag
    let drag = null;
    handle.addEventListener('mousedown', (e) => {
      if (e.target.closest('.ww-ctrl')) return;
      drag = { sx: e.clientX, sy: e.clientY, x0: w.x, y0: w.y, moved: false };
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    });
    const onMove = (e) => {
      if (!drag) return;
      if (!drag.moved) {
        const dist = Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy);
        if (dist < DRAG_THRESHOLD) return;
        drag.moved = true;
        if (w.maximized) {
          // Dragging a maximized window's titlebar restores it first (standard
          // desktop-OS convention) instead of doing nothing, keeping the cursor
          // at the same relative x-offset on the titlebar it grabbed so the
          // window doesn't jump out from underneath it.
          const grabFrac = (drag.sx - w.x) / w.w;
          const p = w.prevBounds || this._defaultBoundsFor(w.id);
          w.maximized = false;
          w.w = p.w; w.h = p.h;
          w.x = drag.sx - grabFrac * w.w;
          w.y = 0;
          drag.x0 = w.x; drag.y0 = w.y;
        }
        w.el.classList.add('ww-dragging');
        document.body.classList.add('ww-no-select');
      }
      const { w: dw, h: dh } = this._desktopBounds();
      let x = drag.x0 + (e.clientX - drag.sx);
      let y = drag.y0 + (e.clientY - drag.sy);
      x = clamp(x, -w.w + 120, dw - 80);
      y = clamp(y, 0, dh - 36);
      w.x = x; w.y = y;
      this._applyBounds(w);
      this._updateSnapPreview(e, dw, dh);
    };
    const onUp = (e) => {
      if (!drag) return;
      const { moved } = drag;
      drag = null;
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      if (!moved) return; // plain click (or the first half of a dblclick) — not a drag, nothing to snap/persist
      w.pristine = false;
      w.el.classList.remove('ww-dragging');
      document.body.classList.remove('ww-no-select');
      const zone = this._snapZoneFor(e);
      this._hideSnapPreview();
      if (zone) this._applySnap(w, zone);
      this._persist();
    };
  }

  _snapZoneFor(e) {
    const r = this.desktopEl.getBoundingClientRect();
    const x = e.clientX - r.left, y = e.clientY - r.top;
    if (y < SNAP_MARGIN) return 'full';
    if (x < SNAP_MARGIN) return 'left';
    if (x > r.width - SNAP_MARGIN) return 'right';
    return null;
  }

  _updateSnapPreview(e, dw, dh) {
    const zone = this._snapZoneFor(e);
    if (!zone) { this._hideSnapPreview(); return; }
    const rects = {
      full: { x: 0, y: 0, w: dw, h: dh },
      left: { x: 0, y: 0, w: dw / 2, h: dh },
      right: { x: dw / 2, y: 0, w: dw / 2, h: dh },
    };
    const r = rects[zone];
    Object.assign(this._snapPreviewEl.style, { left: r.x + 'px', top: r.y + 'px', width: r.w + 'px', height: r.h + 'px', opacity: 1 });
  }

  _hideSnapPreview() { this._snapPreviewEl.style.opacity = 0; }

  _applySnap(w, zone) {
    const { w: dw, h: dh } = this._desktopBounds();
    w.pristine = false;
    if (w.maximized) { w.maximized = false; }
    if (zone === 'full') { w.prevBounds = { x: w.x, y: w.y, w: w.w, h: w.h }; w.x = 0; w.y = 0; w.w = dw; w.h = dh; w.maximized = true; }
    else if (zone === 'left') { w.x = 0; w.y = 0; w.w = dw / 2; w.h = dh; }
    else if (zone === 'right') { w.x = dw / 2; w.y = 0; w.w = dw / 2; w.h = dh; }
    this._applyBounds(w);
  }

  /* ---------------------------------------------------------------- resize */
  _makeResizable(handle, w) {
    const dir = handle.dataset.dir;
    let start = null;
    handle.addEventListener('mousedown', (e) => {
      e.stopPropagation();
      if (w.maximized) return;
      this.focus(w.id); // stopPropagation above prevents the window's own mousedown->focus from bubbling
      start = { sx: e.clientX, sy: e.clientY, x: w.x, y: w.y, w: w.w, h: w.h };
      document.body.classList.add('ww-resizing-cursor-' + dir, 'ww-no-select');
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    });
    const onMove = (e) => {
      if (!start) return;
      const { w: dw, h: dh } = this._desktopBounds();
      const dx = e.clientX - start.sx, dy = e.clientY - start.sy;
      let { x, y, w: ww, h: hh } = start;
      const minW = w.minW || MIN_W, minH = w.minH || MIN_H;
      if (dir.includes('e')) ww = clamp(start.w + dx, minW, dw - x);
      if (dir.includes('s')) hh = clamp(start.h + dy, minH, dh - y);
      if (dir.includes('w')) { const newW = clamp(start.w - dx, minW, start.x + start.w); x = start.x + start.w - newW; ww = newW; }
      if (dir.includes('n')) { const newH = clamp(start.h - dy, minH, start.y + start.h); y = start.y + start.h - newH; hh = newH; }
      w.x = x; w.y = y; w.w = ww; w.h = hh;
      this._applyBounds(w);
    };
    const onUp = () => {
      start = null;
      w.pristine = false;
      document.body.className = document.body.className.replace(/ww-resizing-cursor-\S+/g, '').replace('ww-no-select', '');
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      this._persist();
    };
  }
}
