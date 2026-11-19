import { SignJWT } from 'jose';

// Keep PURPOSE/AUDIENCE in sync with sim/orchestrator/auth.js.
const PURPOSE = 'sim-session';
const AUDIENCE = 'swayform-sim';
const TOKEN_TTL_SECONDS = 60; // only has to survive the WebSocket hello

// Admins only while the simulator is being built; add 'student' at launch (and portal/data/sim-config.js visibleTo).
export const SIM_ROLES = new Set(['admin']);

/** The orchestrator's wss:// base, or null when no simulation servers are set up (the default). */
export function simOrchestratorUrl(){
  const url = process.env.SIM_ORCHESTRATOR_URL;
  const secret = process.env.SIM_SERVICE_SECRET;
  if (!url || !secret || !/^wss:\/\/[a-z0-9.-]+(:\d+)?$/i.test(url)) return null;
  return url;
}

export async function mintSimToken({ email, role, robotId }){
  const key = new TextEncoder().encode(process.env.SIM_SERVICE_SECRET);
  return new SignJWT({ purpose: PURPOSE, role, robotId })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(String(email).toLowerCase())
    .setAudience(AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(`${TOKEN_TTL_SECONDS}s`)
    .sign(key);
}
