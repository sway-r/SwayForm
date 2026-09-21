/* Auth abstraction. Guest sessions are backed by localStorage; real Google
   sessions are backed by an httpOnly cookie set by /api/auth/*, which is why
   getSession() has to ask the server — it deliberately can't read that
   cookie itself. */
const SESSION_KEY = 'swayform.portal.session';
const LOGOUT_PENDING_KEY = 'swayform.portal.logout-pending';
const AUTH_CHANGE_KEY = 'swayform.portal.auth-change';

export function hasPendingLogout(){
  if (typeof window !== 'undefined' && new URL(window.location.href).searchParams.get('logout') === 'pending') return true;
  try { return localStorage.getItem(LOGOUT_PENDING_KEY) === '1'; } catch { return false; }
}

const DRAFTS_PREFIX = 'swayform.portal.fs.';

// Code drafts (mock-fs.js). Sign-out removes them all; signing in keeps only that account's own.
function clearPrivateBrowserData(keepEmail){
  const keepKey = keepEmail ? DRAFTS_PREFIX + encodeURIComponent(keepEmail) : null;
  for (const store of [() => localStorage, () => sessionStorage]){
    try {
      const storage = store();
      for (let i = storage.length - 1; i >= 0; i--){
        const key = storage.key(i);
        if (key?.startsWith(DRAFTS_PREFIX) && key !== keepKey) storage.removeItem(key);
      }
    } catch { /* storage may be unavailable */ }
  }
}

function announceAuthChange(){
  try { localStorage.setItem(AUTH_CHANGE_KEY, `${Date.now()}:${Math.random()}`); } catch { /* unavailable */ }
}
// The tab that signed in or out already cleared the shared drafts; other tabs only need to reload.
if (typeof window !== 'undefined') window.addEventListener('storage', (event) => {
  if (event.key === AUTH_CHANGE_KEY || event.key === LOGOUT_PENDING_KEY) window.location.reload();
});

function readGuestSession(){
  try { return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null'); }
  catch (e) { return null; }
}
function writeGuestSession(session){
  try {
    if (session) localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    else localStorage.removeItem(SESSION_KEY);
  } catch (e) { /* storage unavailable */ }
}

// Cached as the in-flight/resolved promise itself so several components
// mounting in the same tick (a common case: boot() + several restored
// windows each calling getSession()) share one network request instead of
// each firing their own. Must be cleared by anything that actually changes
// server-side session state (login, logout, completing onboarding) — see
// invalidateSessionCache() — or callers would keep seeing stale state right
// after one of those events.
let sessionFetchPromise = null;

export function invalidateSessionCache(){
  sessionFetchPromise = null;
}

export async function getSession(){
  if (hasPendingLogout()) return null;
  const guest = readGuestSession();
  if (guest) return guest;

  if (!sessionFetchPromise){
    sessionFetchPromise = fetch('/api/auth/session')
      .then((res) => { if (!res.ok) throw new Error('Could not check your session. Please retry.'); return res.json(); })
      .then((data) => data.session || null)
      .catch((error) => { sessionFetchPromise = null; throw error; });
  }
  return sessionFetchPromise;
}

export async function isAuthenticated(){
  return !!(await getSession());
}

export async function loginGuest(){
  if (hasPendingLogout()) throw new Error('Complete sign-out before starting another session.');
  const session = { mode: 'guest', displayName: 'Guest User', startedAt: new Date().toISOString() };
  writeGuestSession(session);
  invalidateSessionCache();
  return session;
}

/** Verifies a Google ID token with the backend and, on success, starts a real session. */
export async function loginWithGoogle(credential){
  if (hasPendingLogout()) throw new Error('Complete sign-out before starting another session.');
  const res = await fetch('/api/auth/google', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ credential }),
  });
  const data = await res.json();

  if (!res.ok){
    throw new Error(data.message || 'Google sign-in failed. Please try again.');
  }
  writeGuestSession(null);
  clearPrivateBrowserData(data.session?.email);
  announceAuthChange();
  invalidateSessionCache();
  return data.session;
}

/** Present for shape-compatibility with a future real login; not implemented yet. */
export async function loginWithCredentials(){
  throw new Error('Authentication is not connected yet. Continue as Guest for now.');
}

export async function logout(){
  try { localStorage.setItem(LOGOUT_PENDING_KEY, '1'); } catch { /* unavailable */ }
  clearPrivateBrowserData();
  invalidateSessionCache();
  const res = await fetch('/api/auth/logout', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}',
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) throw new Error('Sign-out was not completed. Reconnect and use Retry sign-out before leaving this shared computer.');
  const check = await fetch('/api/auth/session', { cache: 'no-store', signal: AbortSignal.timeout(10000) });
  if (!check.ok || (await check.json()).session) throw new Error('Could not confirm sign-out. Please retry.');
  writeGuestSession(null);
  try { localStorage.removeItem(LOGOUT_PENDING_KEY); } catch { /* unavailable */ }
  announceAuthChange();
}

/** Guest-only: an httpOnly session cookie is deliberately invisible to JS. */
export function isAuthenticatedSync(){
  return !!readGuestSession();
}
