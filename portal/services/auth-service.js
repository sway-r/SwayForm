/* Auth abstraction. Backed by localStorage for now — every method is shaped
   as if it could hit a real API later (callers use `await`), so swapping in
   real authentication is a one-file change with no call-site rewrites. */
const SESSION_KEY = 'swayform.portal.session';

function readSession(){
  try { return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null'); }
  catch (e) { return null; }
}
function writeSession(session){
  try {
    if (session) localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    else localStorage.removeItem(SESSION_KEY);
  } catch (e) { /* storage unavailable */ }
}

export async function getSession(){
  return readSession();
}

export async function isAuthenticated(){
  return !!readSession();
}

export async function loginGuest(){
  const session = { mode: 'guest', displayName: 'Guest User', startedAt: new Date().toISOString() };
  writeSession(session);
  return session;
}

/** Present for shape-compatibility with a future real login; not implemented yet. */
export async function loginWithCredentials(){
  throw new Error('Authentication is not connected yet. Continue as Guest for now.');
}

export async function logout(){
  writeSession(null);
}

export function isAuthenticatedSync(){
  return !!readSession();
}
