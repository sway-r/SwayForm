export function mount(container, { session, onComplete }){
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
          </div>
          <div class="login-note" data-onboarding-note></div>
          <button type="submit" class="login-guest">Continue</button>
        </form>
      </div>
    </div>`;

  const nameInput = container.querySelector('#ob-name');
  nameInput.value = (session && (session.displayName || session.name)) || '';

  const schoolSelect = container.querySelector('[data-school-select]');
  const notListedCheckbox = container.querySelector('[data-not-listed]');
  const otherField = container.querySelector('[data-school-other-field]');
  const otherInput = container.querySelector('#ob-school-other');
  const note = container.querySelector('[data-onboarding-note]');

  fetch('/api/schools')
    .then((res) => res.json())
    .then(({ schools }) => {
      schoolSelect.innerHTML = '<option value="">Select your school…</option>' +
        (schools || []).map((s) => `<option value="${s.replace(/"/g, '&quot;')}">${s}</option>`).join('');
    })
    .catch(() => {
      schoolSelect.innerHTML = '<option value="">Couldn\'t load schools</option>';
    });

  notListedCheckbox.addEventListener('change', () => {
    otherField.hidden = !notListedCheckbox.checked;
    schoolSelect.disabled = notListedCheckbox.checked;
  });

  container.querySelector('[data-onboarding-form]').addEventListener('submit', async (e) => {
    e.preventDefault();
    const displayName = nameInput.value.trim();
    const schoolName = (notListedCheckbox.checked ? otherInput.value : schoolSelect.value).trim();

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
      onComplete();
    } catch (err){
      note.textContent = err.message;
      note.classList.add('visible');
    }
  });
}
