# SwayForm bridge

Long-running VPS relay for authenticated Pi WebSockets, one-at-a-time robot job delivery, MediaMTX video authorization and the configured Pi's code-editor token exchange. The website APIs are consolidated at /api/robot/agent.

## Configuration

Install dependencies with npm ci in this directory. Set VERCEL_API_BASE and BRIDGE_SERVICE_SECRET through the service environment. The shared secret must match Vercel. Set CODE_SERVER_ROBOT_ID to the database ID of the Pi behind code.bridge.swayform.net on both services; other robots cannot access that shared editor. PORT defaults to 9000.

Use TLS and a reverse proxy for public traffic. The repository does not contain the deployed proxy/MediaMTX/code-server configuration. Do not assume those services are protected merely because the Node bridge authenticates its own routes.

## Protocol

Connect at /agent and send hello with token, serial and optional agentVersion within ten seconds. Other messages are rejected before authentication. One socket per robot is accepted. Ping/pong detects dead connections. Frame size and pending message backlog are bounded.

The bridge polls the API, which atomically claims at most one approved job before returning code. The Pi receives job.run and reports job.accepted, job.output and job.exit. Updates are accepted only for jobs dispatched on that authenticated connection and are scoped to its robot ID in the API. The bridge serializes lifecycle messages to preserve their order.

A claimed job is not replayed after reconnect. If delivery or completion is uncertain, it remains locked for operator reconciliation after a verified physical stop. The portal Cancel action does not stop a running physical program.

## Testing and rollout

Run npm test from the repository root after installing root and bridge dependencies. Tests launch an isolated local bridge with a synthetic API. Do not use fake-agent against production unless explicitly carrying out an authorized integration test.

Read ../SECURITY-ROLLOUT.md before deployment. This API/bridge protocol update requires a coordinated maintenance window and the portal privacy database migration.
