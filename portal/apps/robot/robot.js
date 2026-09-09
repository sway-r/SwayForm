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
  const serial = (session && session.robotSerial) || 'your robot';

  container.innerHTML = `
    <div class="robot-root p-scroll la-surface">
      <div class="robot-hero">
        <div class="robot-hero-icon">${icon('robot')}</div>
        <h1 class="robot-hero-title">${serial}</h1>
        <span class="robot-status-badge">Not connected yet</span>
        <p class="robot-hero-note">Live robot connectivity is coming soon. Once your robot is online, you'll be able to connect here and run your code on real hardware.</p>
      </div>
    </div>`;

  ctx.setAppTitle && ctx.setAppTitle('Robot');
}
