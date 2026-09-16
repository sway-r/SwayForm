// Admin-only embedded editor for the robot's real filesystem — a separate
// desktop app (not a Robot-app tab) so it reads as its own tool, not a
// sub-feature. code-server running on the Pi, reached through the bridge;
// see docs/robot-connectivity.md's Phase 4 for the full exchange-token/
// tunnel design.
import { getSession } from '../../services/auth-service.js';

export const meta = {
  id: 'code-editor',
  title: 'Code Editor',
  icon: 'terminal',
  defaultSize: { w: 960, h: 640 },
};

export async function mount(container, ctx){
  const session = await getSession();
  ctx.setAppTitle && ctx.setAppTitle('Code Editor');

  if (!session || session.mode !== 'admin' || !session.robotId){
    container.innerHTML = `<div class="code-editor-root p-scroll la-surface">
        <p class="code-editor-note">Admin access only.</p>
      </div>`;
    return;
  }

  container.innerHTML = `<div class="code-editor-root">
      <p class="code-editor-note" data-role="note">Connecting…</p>
    </div>`;
  const rootEl = container.querySelector('.code-editor-root');

  try {
    const res = await fetch('/api/admin', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action: 'code-server-token' }),
    });
    if (!res.ok) throw new Error(`token ${res.status}`);
    const { token } = await res.json();
    // Without an explicit allow list, the workbench's terminal can write to
    // the clipboard (browsers allow that from any user gesture) but can't
    // read it back for paste -- Chrome blocks clipboard-read in iframes
    // unless it's delegated here, surfacing as its own in-workbench error
    // dialog rather than anything visibly wrong on the portal's side.
    rootEl.innerHTML = `<iframe class="code-editor-frame" allow="clipboard-read; clipboard-write" src="https://code.bridge.swayform.net/_exchange?token=${encodeURIComponent(token)}"></iframe>`;
  } catch (e) {
    rootEl.innerHTML = '<p class="code-editor-note">Couldn\'t connect to the robot\'s code editor.</p>';
  }
}
