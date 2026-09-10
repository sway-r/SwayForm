# SwayForm bridge server

The always-on relay between the physical robot (Pi, no public IP), the
portal's browser clients, and the `api/` Vercel backend. Not deployed to
Vercel — it runs as its own long-lived Node process, currently on your own
machine for local testing, eventually on a small VPS.

Phase 1 (current): accepts the Pi agent's WebSocket connection, verifies its
token against the database via `api/robot/agent-auth.js`, and writes
online/offline status via `api/robot/heartbeat.js`. No video or job-queue
relaying yet — those land in later phases.

## Local setup

```
cd bridge
npm install
cp .env.example .env
# fill in VERCEL_API_BASE and BRIDGE_SERVICE_SECRET in .env
npm start
```

`BRIDGE_SERVICE_SECRET` must be the exact same value as the `BRIDGE_SERVICE_SECRET`
env var on the Vercel side (see `docs/environment-variables.md`) — it's how
`api/robot/agent-auth.js`/`heartbeat.js` know a request really came from this
bridge and not from a random caller.

## Testing without a real Pi

In a second terminal, once `robots.agent_token_hash` has a row set up
(see below):

```
cd bridge
npm run fake-agent -- ws://localhost:9000/agent <plaintext-token> <serial>
```

Watch the bridge's console for `hello.ok`, then check the portal's Robot app
(or `GET /api/robot/status`) — it should show Online. Ctrl-C the fake agent
and it should flip back to Offline within a few seconds.

To set up a token for testing, run this once in the Neon SQL Editor (pick
any plaintext token, e.g. from `node -e "console.log(require('crypto').randomBytes(24).toString('hex'))"`):

```sql
UPDATE robots
SET agent_token_hash = encode(sha256('<plaintext-token>'::bytea), 'hex')
WHERE serial_number = '<your-robot-serial>';
```

## Deploying to a VPS (later phase)

Not needed until you're ready to connect the real Pi from outside your home
network. At that point: provision a small box, point `bridge.swayform.net`
at it, run this directory there under a systemd unit instead of `npm start`
in a terminal, and update the Pi's `SWAYFORM_BRIDGE_URL` to point at it
instead of localhost.
