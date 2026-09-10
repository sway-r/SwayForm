/**
 * Verifies a server-to-server request from the bridge VPS (agent-auth,
 * heartbeat, and later job-result). A static shared secret is enough here —
 * this call never reaches a browser, unlike the short-lived per-viewer JWTs
 * used for browser-facing bridge access added in later phases.
 */
export function requireBridgeSecret(req, res){
  const expected = process.env.BRIDGE_SERVICE_SECRET;
  if (!expected) throw new Error('BRIDGE_SERVICE_SECRET is not set');

  const provided = req.headers['x-bridge-secret'];
  if (provided !== expected){
    res.status(401).json({ error: 'not_authorized' });
    return false;
  }
  return true;
}
