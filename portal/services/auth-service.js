/* Auth abstraction. Guest sessions are backed by localStorage; real Google
   sessions are backed by an httpOnly cookie set by /api/auth/*, which is why
   getSession() has to ask the server — it deliberately can't read that
   cookie itself. */
const SESSION_KEY = 'swayform.portal.session';

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
  const guest = readGuestSession();
  if (guest) return guest;

  if (!sessionFetchPromise){
    sessionFetchPromise = fetch('/api/auth/session')
      .then((res) => res.json())
      .then((data) => data.session || null)
      .catch(() => null);
  }
  return sessionFetchPromise;
}

export async function isAuthenticated(){
  return !!(await getSession());
}

export async function loginGuest(){
  const session = { mode: 'guest', displayName: 'Guest User', startedAt: new Date().toISOString() };
  writeGuestSession(session);
  invalidateSessionCache();
  return session;
}

/** Verifies a Google ID token with the backend and, on success, starts a real session. */
export async function loginWithGoogle(credential){
  const res = await fetch('/api/auth/google', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ credential }),
  });
  const data = await res.json();

  if (!res.ok){
    throw new Error(data.message || 'Google sign-in failed. Please try again.');
  }
  invalidateSessionCache();
  return data.session;
}

/** Present for shape-compatibility with a future real login; not implemented yet. */
export async function loginWithCredentials(){
  throw new Error('Authentication is not connected yet. Continue as Guest for now.');
}

export async function logout(){
  writeGuestSession(null);
  invalidateSessionCache();
  try { await fetch('/api/auth/logout', { method: 'POST' }); }
  catch (e) { /* best-effort; cookie will just expire */ }
}

/** Guest-only: an httpOnly session cookie is deliberately invisible to JS. */
export function isAuthenticatedSync(){
  return !!readGuestSession();
}
