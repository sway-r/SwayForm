import { icon } from '../../icons.js';
import { getSession } from '../../services/auth-service.js';
import { mountVideoPlayer } from './video-player.js';

// The admin-only embedded code editor lives in its own desktop app
// (apps/code-editor/code-editor.js), not as a tab here — see that file for
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
  container.innerHTML = `<div class="robot-root robot-connected la-surface">
      <div class="robot-status-bar">
        <span class="robot-status-badge" data-role="status-badge">Checking…</span>
        <span class="robot-status-text">
          <strong>${session.robotSerial}</strong>
          <span data-role="status-note"></span>
        </span>
      </div>
      <div class="robot-video-panel" data-panel="video"></div>
    </div>`;
  ctx.setAppTitle && ctx.setAppTitle('Robot');

  const badge = container.querySelector('[data-role="status-badge"]');
  const note = container.querySelector('[data-role="status-note"]');
  const videoPanel = container.querySelector('[data-panel="video"]');

  async function refreshStatus(){
    try {
      const res = await fetch('/api/robot/status');
      if (!res.ok) throw new Error(`status ${res.status}`);
      const data = await res.json();

      badge.textContent = data.online ? 'Online' : 'Offline';
      badge.classList.toggle('is-online', !!data.online);
      note.textContent = data.online
        ? 'Robot agent connected.'
        : `Robot agent not connected. Last seen: ${formatLastSeen(data.lastSeenAt)}.`;
    } catch (e) {
      badge.textContent = 'Unknown';
      note.textContent = "Couldn't reach the server to check robot status.";
    }
  }

  await refreshStatus();
  const pollTimer = setInterval(refreshStatus, POLL_INTERVAL_MS);
  const videoPlayer = mountVideoPlayer(videoPanel);

  return {
    unmount(){
      clearInterval(pollTimer);
      videoPlayer.unmount();
    },
  };
}
