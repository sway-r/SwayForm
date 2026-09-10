import { icon } from '../icons.js';
import { loginGuest, loginWithCredentials, loginWithGoogle } from '../services/auth-service.js';

const GOOGLE_CLIENT_ID = '214694324547-cdpd0h6rdcdharusaiain5d7fmgpdjtr.apps.googleusercontent.com';

export function mount(container, { onAuthenticated }){
  container.innerHTML = `
    <div class="login-brand">
      <div class="login-brand-wallpaper"></div>
      <div class="login-brand-scrim"></div>
      <div class="login-brand-top">
        <span class="login-brand-s">S</span>wayForm<span class="login-brand-sep">/</span><span class="login-brand-label">Learning Portal</span>
      </div>
      <div class="login-brand-mid">
        <h1>Learn to program a real robot.</h1>
        <p>Every activity builds an actual SwayForm behavior — the concepts show up exactly when you need them, not before.</p>
      </div>
      <div class="login-brand-features">
        <div class="login-feature">${icon('learn')}<span>A learning path built around robot behaviors, not abstract theory</span></div>
        <div class="login-feature">${icon('terminal')}<span>A real ROS 2 workspace and editor, the same one you'll use on hardware</span></div>
        <div class="login-feature">${icon('checkCircle')}<span>Your progress saved automatically as you go</span></div>
      </div>
    </div>
    <div class="login-form-side">
      <div class="login-card">
        <div class="login-card-hdr">
          <h2>Sign in</h2>
          <p>Continue your SwayForm Learning Portal session.</p>
        </div>
        <p class="login-consent">By continuing, you agree to SwayForm's <a href="/terms" target="_blank" rel="noopener noreferrer">Terms of Use</a> and <a href="/privacy" target="_blank" rel="noopener noreferrer">Privacy Policy</a>, including the <a href="/student-privacy" target="_blank" rel="noopener noreferrer">Student Privacy Notice</a>.</p>
        <form data-login-form>
          <div class="login-field">
            <label for="login-email">Email or username</label>
            <input type="text" id="login-email" placeholder="you@school.edu" autocomplete="username">
          </div>
          <div class="login-field">
            <label for="login-password">Password</label>
            <input type="password" id="login-password" placeholder="••••••••" autocomplete="current-password">
          </div>
          <a href="#" class="login-forgot" data-forgot>Forgot password?</a>
          <div class="login-note" data-auth-note>Authentication isn't connected yet — use Continue as Guest below.</div>
          <button type="submit" class="login-btn">${icon('lock')}<span>Sign In</span></button>
        </form>
        <div class="login-google-slot" data-google-loading>Loading Google sign-in…</div>
        <div data-google></div>

        <div class="login-divider">or</div>

        <button type="button" class="login-guest" data-guest>${icon('arrowRight')}<span>Continue as Guest</span></button>
        <p class="login-guest-note">Guest progress is saved locally in this browser. Sign in with a school account later to keep it.</p>
      </div>
    </div>`;

  const note = container.querySelector('[data-auth-note]');

  container.querySelector('[data-login-form]').addEventListener('submit', async (e) => {
    e.preventDefault();
    try { await loginWithCredentials(); }
    catch (err){ note.textContent = err.message; note.classList.add('visible'); }
  });
  // The GIS script tag loads with `async defer`, so it may not be ready yet
  // when this screen mounts (e.g. on a cold page load, or a slow school
  // network) — poll indefinitely rather than giving up on a timeout.
  //
  // This renders Google's own Sign-In button (google.accounts.id.renderButton)
  // instead of a custom button that calls prompt() (One Tap) — prompt() is
  // meant to appear automatically, not be triggered by a manual click, and
  // is unreliable exactly like this on mobile (Safari blocks the
  // third-party cookies it needs, and Google silently suppresses it after a
  // few dismissals) — it can silently do nothing, with no error at all.
  // renderButton is the actual supported click/tap sign-in entry point.
  const googleSlot = container.querySelector('[data-google]');
  const loadingNote = container.querySelector('[data-google-loading]');
  function initGoogleButton(){
    if (!(window.google && window.google.accounts && window.google.accounts.id)) return false;
    window.google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: async ({ credential }) => {
        try {
          await loginWithGoogle(credential);
          onAuthenticated();
        } catch (err){
          note.textContent = err.message;
          note.classList.add('visible');
        }
      },
    });
    loadingNote.hidden = true;
    const width = Math.round(googleSlot.getBoundingClientRect().width) || 328;
    window.google.accounts.id.renderButton(googleSlot, {
      theme: 'outline', size: 'large', shape: 'rectangular', text: 'continue_with', logo_alignment: 'left', width,
    });
    return true;
  }
  if (!initGoogleButton()){
    // No giving-up timeout — but do stop once this screen is gone (e.g. the
    // user logged in as guest while GIS was still loading), or this would
    // poll forever in the background for the rest of the page's life.
    const retry = setInterval(() => {
      if (!googleSlot.isConnected){ clearInterval(retry); return; }
      if (initGoogleButton()) clearInterval(retry);
    }, 200);
  }
  container.querySelector('[data-forgot]').addEventListener('click', (e) => {
    e.preventDefault();
    note.textContent = "Password reset isn't connected yet — use Continue as Guest below.";
    note.classList.add('visible');
  });
  container.querySelector('[data-guest]').addEventListener('click', async () => {
    await loginGuest();
    onAuthenticated();
  });
}
