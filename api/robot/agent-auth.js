import { createHash } from 'node:crypto';
import { requireMethod } from '../_lib/session.js';
import { requireBridgeSecret } from '../_lib/bridge.js';
import { sql } from '../_lib/db.js';

/**
 * Called by the bridge server (never directly by a browser or the Pi) when
 * a robot's agent connects and presents its long-lived token. Verifies it
 * against the hash stored for that robot and reports which robot it is.
 */
export default async function handler(req, res){
  if (!requireMethod(req, res, 'POST')) return;
  if (!requireBridgeSecret(req, res)) return;

  const { token, serial } = req.body || {};
  if (!token || !serial){
    res.status(400).json({ error: 'missing_fields' });
    return;
  }

  const tokenHash = createHash('sha256').update(token).digest('hex');
  const rows = await sql`
    SELECT id, serial_number FROM robots
    WHERE serial_number = ${serial} AND agent_token_hash = ${tokenHash}
  `;
  if (!rows.length){
    res.status(401).json({ error: 'invalid_token' });
    return;
  }

  res.status(200).json({ robotId: rows[0].id, robotSerial: rows[0].serial_number });
}
