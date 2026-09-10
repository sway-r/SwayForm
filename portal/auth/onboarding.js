import { invalidateSessionCache } from '../services/auth-service.js';
import { escapeHtml } from '../utils.js';

export function mount(container, { session, onComplete }){
  // An admin may have already linked this email to a robot (added them as
  // a student, or set them as an admin email) before this first login —
  // in that case the robot's school IS their school, not a question to
  // ask and risk them picking wrong from the dropdown. Lock it instead.
  const knownSchoolName = session && session.robotSchoolName;

  container.innerHTML = `
    <div class="login-form-side">
      <div class="login-card">
        <div class="login-card-hdr">
          <h2>Tell us about you</h2>
          <p>One-time setup — this is what other people will see, and it never changes.</p>
        </div>
        <form data-onboarding-form>
          <div class="login-field">
            <label for="ob-name">Your name</label>
            <input type="text" id="ob-name" autocomplete="name" required maxlength="100">
          </div>
          ${knownSchoolName ? `
          <div class="login-field">
            <label>School</label>
            <div class="ob-school-locked">${escapeHtml(knownSchoolName)}</div>
            <p class="ob-school-locked-note">Set by your robot's admin — contact them if this is wrong.</p>
          </div>` : `
          <div class="login-field">
            <label for="ob-school">School</label>
            <select id="ob-school" data-school-select>
              <option value="">Loading schools…</option>
            </select>
          </div>
          <div class="ob-check-row">
            <label><input type="checkbox" data-not-listed> My school isn't listed</label>
          </div>
          <div class="login-field" data-school-other-field hidden>
            <label for="ob-school-other">School name</label>
            <input type="text" id="ob-school-other" autocomplete="off" maxlength="100">
          </div>`}
          <div class="login-note" data-onboarding-note></div>
          <button type="submit" class="login-guest">Continue</button>
        </form>
      </div>
    </div>`;

  const nameInput = container.querySelector('#ob-name');
  nameInput.value = (session && (session.displayName || session.name)) || '';

  const note = container.querySelector('[data-onboarding-note]');

  let schoolSelect = null, notListedCheckbox = null, otherField = null, otherInput = null;
  if (!knownSchoolName){
    schoolSelect = container.querySelector('[data-school-select]');
    notListedCheckbox = container.querySelector('[data-not-listed]');
    otherField = container.querySelector('[data-school-other-field]');
    otherInput = container.querySelector('#ob-school-other');

    fetch('/api/schools')
      .then((res) => res.json())
      .then(({ schools }) => {
        schoolSelect.innerHTML = '<option value="">Select your school…</option>' +
          (schools || []).map((s) => `<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`).join('');
      })
      .catch(() => {
        schoolSelect.innerHTML = '<option value="">Couldn\'t load schools</option>';
      });

    notListedCheckbox.addEventListener('change', () => {
      otherField.hidden = !notListedCheckbox.checked;
      schoolSelect.disabled = notListedCheckbox.checked;
    });
  }

  container.querySelector('[data-onboarding-form]').addEventListener('submit', async (e) => {
    e.preventDefault();
    const displayName = nameInput.value.trim();
    // When locked, the server re-derives the robot's school itself rather
    // than trusting this value — it's sent along only so the "missing
    // fields" check below behaves the same either way.
    const schoolName = knownSchoolName || (notListedCheckbox.checked ? otherInput.value : schoolSelect.value).trim();

    if (!displayName || !schoolName){
      note.textContent = 'Please enter your name and school.';
      note.classList.add('visible');
      return;
    }

    try {
      const res = await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName, schoolName }),
      });
      if (!res.ok) throw new Error('Something went wrong saving your profile. Please try again.');
      invalidateSessionCache();
      onComplete();
    } catch (err){
      note.textContent = err.message;
      note.classList.add('visible');
    }
  });
}
