import { icon } from '../../icons.js';
import { getSession } from '../../services/auth-service.js';

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

  container.innerHTML = `<div class="robot-root p-scroll la-surface">
      <div class="robot-hero">
        <div class="robot-hero-icon">${icon('robot')}</div>
        <h1 class="robot-hero-title">${session.robotSerial}</h1>
        <span class="robot-status-badge" data-role="status-badge">Checking…</span>
        <p class="robot-hero-note" data-role="status-note">Live video, the run queue, and the embedded editor land here in later phases. For now this just shows whether the robot's agent is currently connected.</p>
      </div>
    </div>`;
  ctx.setAppTitle && ctx.setAppTitle('Robot');

  const badge = container.querySelector('[data-role="status-badge"]');
  const note = container.querySelector('[data-role="status-note"]');

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

  return {
    unmount(){ clearInterval(pollTimer); },
  };
}
