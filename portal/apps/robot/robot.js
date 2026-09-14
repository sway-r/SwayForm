import { icon } from '../../icons.js';
import { getSession } from '../../services/auth-service.js';
import { mountVideoPlayer } from './video-player.js';

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

  const isAdmin = session.mode === 'admin';

  container.innerHTML = `<div class="robot-root p-scroll la-surface">
      <div class="robot-tabs" data-role="tabs">
        <button type="button" class="robot-tab is-active" data-tab="status">Status</button>
        <button type="button" class="robot-tab" data-tab="video">Live Video</button>
        ${isAdmin ? '<button type="button" class="robot-tab" data-tab="code">VS Code</button>' : ''}
      </div>
      <div class="robot-tab-panel" data-panel="status">
        <div class="robot-hero">
          <div class="robot-hero-icon">${icon('robot')}</div>
          <h1 class="robot-hero-title">${session.robotSerial}</h1>
          <span class="robot-status-badge" data-role="status-badge">Checking…</span>
          <p class="robot-hero-note" data-role="status-note">Run on Robot is already available from the lab code editor's Queue on Robot button — this screen just shows whether the robot's agent is currently connected.</p>
        </div>
      </div>
      <div class="robot-tab-panel" data-panel="video" hidden></div>
      ${isAdmin ? '<div class="robot-tab-panel" data-panel="code" hidden></div>' : ''}
    </div>`;
  ctx.setAppTitle && ctx.setAppTitle('Robot');

  const badge = container.querySelector('[data-role="status-badge"]');
  const note = container.querySelector('[data-role="status-note"]');
  const tabsEl = container.querySelector('[data-role="tabs"]');
  const statusPanel = container.querySelector('[data-panel="status"]');
  const videoPanel = container.querySelector('[data-panel="video"]');
  const codePanel = container.querySelector('[data-panel="code"]');

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

  // The video player only connects once its tab is actually selected —
  // leaving the Robot app open on Status shouldn't hold a viewer slot on
  // the relay. Torn down again when switching away or unmounting.
  let videoPlayer = null;

  // The code-server iframe mints a fresh single-use token every time the
  // tab is opened, rather than trying to detect a still-valid cookie
  // client-side (it's httpOnly, not readable from JS anyway) — cheap and
  // always correct.
  async function openCodeServerTab(){
    codePanel.innerHTML = '<p class="robot-video-note">Connecting…</p>';
    try {
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'code-server-token' }),
      });
      if (!res.ok) throw new Error(`token ${res.status}`);
      const { token } = await res.json();
      codePanel.innerHTML = `<iframe class="robot-code-frame" src="https://code.bridge.swayform.net/_exchange?token=${encodeURIComponent(token)}"></iframe>`;
    } catch (e) {
      codePanel.innerHTML = '<p class="robot-video-note">Couldn\'t connect to the robot\'s code editor.</p>';
    }
  }

  tabsEl.addEventListener('click', (e) => {
    const btn = e.target.closest('.robot-tab');
    if (!btn) return;
    const tab = btn.dataset.tab;

    tabsEl.querySelectorAll('.robot-tab').forEach((el) => el.classList.toggle('is-active', el === btn));
    statusPanel.hidden = tab !== 'status';
    videoPanel.hidden = tab !== 'video';
    if (codePanel) codePanel.hidden = tab !== 'code';

    if (tab === 'video' && !videoPlayer){
      videoPlayer = mountVideoPlayer(videoPanel);
    } else if (tab !== 'video' && videoPlayer){
      videoPlayer.unmount();
      videoPlayer = null;
    }

    if (tab === 'code' && codePanel && !codePanel.dataset.loaded){
      codePanel.dataset.loaded = 'true';
      openCodeServerTab();
    }
  });

  return {
    unmount(){
      clearInterval(pollTimer);
      if (videoPlayer) videoPlayer.unmount();
    },
  };
}
