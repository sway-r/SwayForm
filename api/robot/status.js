import { readSessionFromRequest, requireMethod } from '../_lib/session.js';
import { requireCurrentRobotMember } from '../_lib/authz.js';
import { sql } from '../_lib/db.js';

/**
 * Polled by the portal's Robot app. This is the fallback path that works
 * even before the browser opens any bridge WebSocket (added in a later
 * phase) — it just reads whatever the bridge last wrote via heartbeat.js.
 */
export default async function handler(req, res){
  if (!requireMethod(req, res, 'GET')) return;

  const session = await readSessionFromRequest(req);
  const robotId = await requireCurrentRobotMember(session);
  if (!robotId){
    res.status(401).json({ error: 'not_authorized' });
    return;
  }

  const rows = await sql`
    SELECT serial_number, is_online, last_seen_at, agent_version
    FROM robots WHERE id = ${robotId}
  `;
  if (!rows.length){
    res.status(404).json({ error: 'not_found' });
    return;
  }

  const r = rows[0];
  res.status(200).json({
    robotSerial: r.serial_number,
    online: r.is_online,
    lastSeenAt: r.last_seen_at,
    agentVersion: r.agent_version,
  });
}
