import { icon } from '../../icons.js';
import { getSession } from '../../services/auth-service.js';

export const meta = {
  id: 'robot',
  title: 'Robot',
  icon: 'robot',
  defaultSize: { w: 640, h: 440 },
};

export async function mount(container, ctx){
  const session = await getSession();

  container.innerHTML = session && session.robotId
    ? `<div class="robot-root p-scroll la-surface">
        <div class="robot-hero">
          <div class="robot-hero-icon">${icon('robot')}</div>
          <h1 class="robot-hero-title">${session.robotSerial}</h1>
          <span class="robot-status-badge">Not connected yet</span>
          <p class="robot-hero-note">Live robot connectivity is coming soon. Once your robot is online, you'll be able to connect here and run your code on real hardware.</p>
        </div>
      </div>`
    : `<div class="robot-root p-scroll la-surface">
        <div class="robot-hero">
          <div class="robot-hero-icon">${icon('robot')}</div>
          <h1 class="robot-hero-title">No robot linked</h1>
          <p class="robot-hero-note">You're not the admin of a robot at your school. You can purchase the simulation of the robot for full use here when it's available.</p>
          <button type="button" class="p-btn ghost" disabled title="Not available yet">${icon('externalLink')}<span>Purchase simulation access</span></button>
        </div>
      </div>`;

  ctx.setAppTitle && ctx.setAppTitle('Robot');
}
