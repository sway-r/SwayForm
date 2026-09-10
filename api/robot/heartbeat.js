import { requireMethod } from '../_lib/session.js';
import { requireBridgeSecret } from '../_lib/bridge.js';
import { sql } from '../_lib/db.js';

/**
 * Called by the bridge server whenever a robot's agent connects,
 * disconnects, or sends a periodic heartbeat. Writes straight to
 * is_online/last_seen_at — the two columns reserved for exactly this since
 * the original auth schema.
 */
export default async function handler(req, res){
  if (!requireMethod(req, res, 'POST')) return;
  if (!requireBridgeSecret(req, res)) return;

  const { robotId, online, agentVersion } = req.body || {};
  if (!robotId){
    res.status(400).json({ error: 'missing_robot_id' });
    return;
  }

  await sql`
    UPDATE robots
    SET is_online = ${!!online}, last_seen_at = now(), agent_version = ${agentVersion || null}
    WHERE id = ${robotId}
  `;
  res.status(200).json({ ok: true });
}
