import { icon } from '../../icons.js';
import { getSession } from '../../services/auth-service.js';
import { mountVideoPlayer } from './video-player.js';
import { createPoller } from '../../services/adaptive-poller.js';

// The admin-only embedded editor lives in its own desktop app, "Workspace"
// (apps/workspace/workspace.js), not as a tab here — see that file for
// the exchange-token/iframe details, unchanged from when it was a tab.

export const meta = {
  id: 'robot',
  title: 'Robot',
  icon: 'robot',
  defaultSize: { w: 640, h: 440 },
};

const POLL_INTERVAL_MS = 15_000;

function formatLastSeen(iso){
  if (!iso) return 'never';
  const seconds = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  return `${hours}h ago`;
}

export async function mount(container, ctx){
  const session = await getSession();

  if (!session || !session.robotId){
    container.innerHTML = `<div class="robot-root p-scroll la-surface">
        <div class="robot-hero">
          <div class="robot-hero-icon">${icon('robot')}</div>
          <h1 class="robot-hero-title">No robot linked</h1>
          <p class="robot-hero-note">You're not the admin of a robot at your school. You can purchase the simulation of the robot for full use here when it's available.</p>
          <button type="button" class="p-btn ghost" disabled title="Not available yet">${icon('externalLink')}<span>Purchase simulation access</span></button>
        </div>
      </div>`;
    ctx.setAppTitle && ctx.setAppTitle('Robot');
    return;
  }

  // Status and Live Video used to be separate tabs — merged into one
  // always-visible view (a compact status bar, video filling the rest)
  // since there was no real reason to hide one to see the other, and it
  // also removes a second piece of "which tab was I on" state that a
  // refresh could lose (see portal.js's per-window lastPath for the
  // top-level app-focus version of that same problem).
  const isAdmin = session.mode === 'admin';

  container.innerHTML = `<div class="robot-root robot-connected la-surface">
      <div class="robot-status-bar">
        <span class="robot-status-badge" data-role="status-badge">Checking…</span>
        <span class="robot-status-text">
          <strong>${session.robotSerial}</strong>
          <span data-role="status-note"></span>
        </span>
        ${isAdmin ? `
          <span class="robot-status-spacer"></span>
          <button type="button" class="p-btn ghost robot-idle-toggle" data-role="idle-toggle" title="Holds the robot still in its safe rest pose (elbows bent, shoulders back) when no job is running">Live Robot Session: off</button>
          <button type="button" class="p-btn ghost robot-idle-toggle" data-role="movement-toggle" disabled title="Turn Live Robot Session on first">Movement: off</button>
        ` : ''}
      </div>
      <div class="robot-video-panel" data-panel="video"></div>
    </div>`;
  ctx.setAppTitle && ctx.setAppTitle('Robot');

  const badge = container.querySelector('[data-role="status-badge"]');
  const note = container.querySelector('[data-role="status-note"]');
  const videoPanel = container.querySelector('[data-panel="video"]');
  const idleToggle = container.querySelector('[data-role="idle-toggle"]');
  const movementToggle = container.querySelector('[data-role="movement-toggle"]');
  let busy = false; // one change at a time: the two toggles depend on each other

  // Movement is the ambient gestures; it only exists inside a live session, so it is locked while the session is off.
  function showToggles(data){
    if (!idleToggle || busy) return;
    const sessionOn = !!data.idleSessionEnabled;
    const movementOn = sessionOn && !!data.movementEnabled;
    idleToggle.textContent = `Live Robot Session: ${sessionOn ? 'on' : 'off'}`;
    idleToggle.classList.toggle('is-on', sessionOn);
    movementToggle.textContent = `Movement: ${movementOn ? 'on' : 'off'}`;
    movementToggle.classList.toggle('is-on', movementOn);
    movementToggle.disabled = !sessionOn;
    movementToggle.title = sessionOn
      ? 'Small ambient gestures (glances, waves) while the session is on. Off keeps the robot still in its rest pose.'
      : 'Turn Live Robot Session on first';
  }

  async function refreshStatus({ keepNote = false } = {}){
    const res = await fetch('/api/robot/status');
    if (!res.ok) throw new Error(`status ${res.status}`);
    const data = await res.json();

    badge.textContent = data.online ? 'Online' : 'Offline';
    badge.classList.toggle('is-online', !!data.online);
    if (!keepNote){
      note.textContent = data.online
        ? 'Robot agent connected.'
        : `Robot agent not connected. Last seen: ${formatLastSeen(data.lastSeenAt)}.`;
    }

    showToggles(data);
  }

  // Pauses while hidden or minimized; refreshes as soon as it's back.
  const statusPoller = createPoller({
    task: refreshStatus,
    delayMs: () => POLL_INTERVAL_MS,
    whenHidden: 'pause',
    isRelevant: () => container.offsetParent !== null,
    onError(){
      badge.textContent = 'Unknown';
      badge.classList.remove('is-online');
      note.textContent = "Couldn't reach the server to check robot status. Retrying.";
    },
  });

  // Shared by both toggles. The server decides the result; this only shows it.
  async function change(button, action, pendingText, describeError){
    if (busy) return;
    busy = true;
    idleToggle.disabled = movementToggle.disabled = true;
    button.textContent = pendingText;
    let shown = null;
    let keepNote = true;
    try {
      const res = await fetch('/api/robot/status', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (res.ok){
        shown = data;
        if (data.delivered === false) note.textContent = "Turned off here, but the robot couldn't be reached to confirm it stopped moving. Check on it.";
        else keepNote = false;
      } else {
        note.textContent = describeError(data);
      }
    } catch (e) {
      note.textContent = "Couldn't reach the server to change that.";
    } finally {
      busy = false;
      idleToggle.disabled = false;
      if (shown) showToggles(shown);
      // Re-read either way: a refusal can mean the saved state was stale, and a success clears an old message.
      await refreshStatus({ keepNote }).catch(() => { movementToggle.disabled = !idleToggle.classList.contains('is-on'); });
    }
  }

  if (idleToggle){
    idleToggle.addEventListener('click', () => {
      const turningOn = !idleToggle.classList.contains('is-on');
      change(idleToggle, turningOn ? 'idle-on' : 'idle-off', turningOn ? 'Starting…' : 'Stopping…', (data) => (
        data.error === 'job_in_progress'
          ? "Can't start — a student's job is pending, approved, or running right now."
          : (data.message || "Couldn't change the live session.")
      ));
    });
    movementToggle.addEventListener('click', () => {
      const turningOn = !movementToggle.classList.contains('is-on');
      change(movementToggle, turningOn ? 'movement-on' : 'movement-off', turningOn ? 'Starting…' : 'Stopping…', (data) => (
        data.error === 'job_in_progress'
          ? "Can't start Movement — a student's job is running right now."
          : (data.message || "Couldn't change Movement.")
      ));
    });
  }

  statusPoller.start();
  const videoPlayer = mountVideoPlayer(videoPanel);

  return {
    unmount(){
      statusPoller.stop();
      videoPlayer.unmount();
    },
  };
}
