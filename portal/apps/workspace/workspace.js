// Admin-only embedded editor for the robot's real filesystem, a separate
// desktop app (not a Robot-app tab) so it reads as its own tool, not a
// sub-feature. code-server running on the Pi, reached through the bridge;
// see docs/robot-connectivity.md's Phase 4 for the full exchange-token/
// tunnel design. Named "Workspace" (not "Code Editor") to stay distinct
// from the student-facing Code Editor in apps/learn/workspace/.
import { getSession } from '../../services/auth-service.js';

export const meta = {
  id: 'workspace',
  title: 'Workspace',
  icon: 'terminal',
  defaultSize: { w: 960, h: 640 },
};

export async function mount(container, ctx){
  const session = await getSession();
  ctx.setAppTitle && ctx.setAppTitle('Workspace');

  if (!session || session.mode !== 'admin' || !session.robotId){
    container.innerHTML = `<div class="workspace-root p-scroll la-surface">
        <p class="workspace-note">Admin access only.</p>
      </div>`;
    return;
  }

  container.innerHTML = '<div class="workspace-root la-surface"></div>';
  const rootEl = container.querySelector('.workspace-root');

  // Single-use link, 30-min session, cross-origin frame: Reconnect is the only way back from a dead one.
  async function connect(){
    rootEl.innerHTML = '<p class="workspace-note">Connecting…</p>';
    try {
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'code-server-token' }),
        signal: AbortSignal.timeout(15_000),
      });
      if (!res.ok) throw new Error(`token ${res.status}`);
      const { token } = await res.json();
      // Without an explicit allow list, the workbench's terminal can write to
      // the clipboard (browsers allow that from any user gesture) but can't
      // read it back for paste -- Chrome blocks clipboard-read in iframes
      // unless it's delegated here, surfacing as its own in-workbench error
      // dialog rather than anything visibly wrong on the portal's side.
      rootEl.innerHTML = `<iframe class="workspace-frame" allow="clipboard-read; clipboard-write" src="https://code.bridge.swayform.net/_exchange?token=${encodeURIComponent(token)}"></iframe>
        <div class="workspace-bar">
          <span>Blank, stuck, or "invalid or expired link"? Sessions last 30 minutes.</span>
          <button type="button" class="p-btn ghost" data-role="reconnect">Reconnect</button>
        </div>`;
    } catch (e) {
      rootEl.innerHTML = `<div class="workspace-note">
          <p>Couldn't connect to the robot's workspace.</p>
          <button type="button" class="p-btn ghost" data-role="reconnect">Try again</button>
        </div>`;
    }
    rootEl.querySelector('[data-role="reconnect"]').addEventListener('click', connect);
  }

  // Shown on every open; nothing connects to the robot until the admin accepts.
  rootEl.innerHTML = `<div class="workspace-warn p-scroll">
      <div class="workspace-warn-card" role="alertdialog" aria-labelledby="ws-warn-title">
        <h2 id="ws-warn-title">Full access to the robot</h2>
        <p>The Workspace gives you complete, unfiltered access to the robot's code. This is the robot's full source, completely open.</p>
        <p>Anything you change here can and will change how the robot runs. Changes can be disruptive, and some of them may not be possible to undo.</p>
        <p><strong>Only use the Workspace if you are 100% sure you know what you are doing.</strong></p>
        <p>You can give your students access to the Workspace by emailing us at <a href="mailto:support@swayform.net">support@swayform.net</a>. The same risks apply, so be careful.</p>
        <div class="workspace-warn-actions">
          <button type="button" class="p-btn ghost" data-role="cancel">Close</button>
          <button type="button" class="p-btn primary" data-role="accept">I understand, open the Workspace</button>
        </div>
      </div>
    </div>`;
  rootEl.querySelector('[data-role="cancel"]').addEventListener('click', () => ctx.close && ctx.close());
  rootEl.querySelector('[data-role="accept"]').addEventListener('click', connect);
}
