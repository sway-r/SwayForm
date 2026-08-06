import { icon } from '../icons.js';
import { loginGuest, loginWithCredentials } from '../services/auth-service.js';

export function mount(container, { onAuthenticated }){
  container.innerHTML = `
    <div class="login-brand">
      <div class="login-brand-wallpaper"></div>
      <div class="login-brand-scrim"></div>
      <div class="login-brand-top">
        <img src="/images/logo-mark.png" alt="" class="login-brand-mark">wayForm<span class="login-brand-sep">/</span><span class="login-brand-label">Learning Portal</span>
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
        <button type="button" class="login-btn google" data-google>
          <svg viewBox="0 0 24 24" width="16" height="16"><path fill="#4285F4" d="M23 12.27c0-.8-.07-1.57-.2-2.32H12v4.4h6.2a5.3 5.3 0 0 1-2.3 3.48v2.9h3.7c2.17-2 3.4-4.94 3.4-8.46Z"/><path fill="#34A853" d="M12 23c3.1 0 5.7-1.02 7.6-2.77l-3.7-2.9c-1.03.7-2.35 1.1-3.9 1.1-3 0-5.54-2.02-6.45-4.75H1.7v2.98A11 11 0 0 0 12 23Z"/><path fill="#FBBC05" d="M5.55 13.68A6.6 6.6 0 0 1 5.2 12c0-.58.1-1.15.34-1.68V7.34H1.7A11 11 0 0 0 .5 12c0 1.77.43 3.45 1.2 4.66l3.85-2.98Z"/><path fill="#EA4335" d="M12 5.58c1.68 0 3.19.58 4.38 1.7l3.28-3.28C17.7 2.18 15.1 1 12 1a11 11 0 0 0-9.8 6.34l3.85 2.98C6.46 7.6 9 5.58 12 5.58Z"/></svg>
          <span>Continue with Google</span>
        </button>

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
  container.querySelector('[data-google]').addEventListener('click', () => {
    note.textContent = "Google sign-in isn't connected yet — use Continue as Guest below.";
    note.classList.add('visible');
  });
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
