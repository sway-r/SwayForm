/* Thin API client + a tiny app store (no state library — one subscriber set,
 * refetch-on-revision). Ops are sent on explicit user actions (blur, click,
 * drop), never per keystroke, so refetching content after each op is cheap.
 */

async function http(method, path, body) {
  const res = await fetch('/api' + path, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `${method} ${path} failed (${res.status})`);
  return data;
}

export const api = {
  get: (path) => http('GET', path),
  post: (path, body) => http('POST', path, body || {}),
};

/* ------------------------------------------------------------- store */

const listeners = new Set();
export const store = {
  content: null,       // normalized model
  iconNames: [],
  revision: -1,
  changeCount: 0,
  canUndo: false,
  canRedo: false,
  staleFiles: [],
  loading: true,
  error: null,
  toasts: [],
};

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function emit() { listeners.forEach((fn) => fn()); }

let toastId = 0;
export function toast(text, kind = 'info', ms = 3500) {
  const id = ++toastId;
  store.toasts = [...store.toasts, { id, text, kind }];
  emit();
  setTimeout(() => {
    store.toasts = store.toasts.filter((t) => t.id !== id);
    emit();
  }, ms);
}

export async function refreshState() {
  const s = await api.get('/state');
  store.changeCount = s.changeCount;
  store.canUndo = s.canUndo;
  store.canRedo = s.canRedo;
  store.staleFiles = s.staleFiles;
  if (s.generatorError) toast('Change generation error: ' + s.generatorError, 'error', 8000);
  if (s.revision !== store.revision) {
    const c = await api.get('/content');
    store.content = c.content;
    store.iconNames = c.iconNames;
    store.revision = c.revision;
  }
  store.loading = false;
  emit();
}

/** Apply one op; refresh; toast errors. Returns true on success. */
export async function sendOp(op) {
  try {
    await api.post('/op', { op });
    await refreshState();
    return true;
  } catch (err) {
    toast(err.message, 'error', 6000);
    return false;
  }
}

export async function sendOps(ops) {
  try {
    await api.post('/ops', { ops });
    await refreshState();
    return true;
  } catch (err) {
    toast(err.message, 'error', 6000);
    await refreshState(); // some ops may have landed before the failure
    return false;
  }
}

export async function undo() { await api.post('/undo'); await refreshState(); }
export async function redo() { await api.post('/redo'); await refreshState(); }

export const PREVIEW_BASE = `http://127.0.0.1:4601`;
