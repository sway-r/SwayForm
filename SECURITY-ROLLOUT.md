# Portal and bridge security rollout

This branch is based on main 0b88ec0 and includes the recovered portal privacy fixes plus bridge hardening. These are code changes, not proof of a secure live installation.

## Required deployment order

1. Schedule a maintenance window. Stop the bridge process and stop physical robot programs. Do not run the old bridge against the new queue API: dispatch now claims a job before delivery, and lifecycle updates require robotId.
2. Apply db/migrations/005_portal_privacy.sql to the intended database. It adds tables without deleting existing records. Test against a separate preview database first. Do not point a preview deployment at student production data.
3. Configure CODE_SERVER_ROBOT_ID on both Vercel and the VPS to the numeric database robot ID of the single Pi served by code.bridge.swayform.net. Do not guess this ID. Without it, Workspace access is intentionally disabled. A future multi-school editor needs separate destinations and isolation.
4. Deploy this complete API/frontend release to Vercel, then install bridge dependencies with npm ci in bridge/ and restart the updated bridge. Viewer JWTs now require purpose=video-viewer; use matching versions of status.js and server.js.
5. Existing portal sessions will require sign-in again. Export code drafts before rollout: legacy shared drafts are discarded; new drafts are tab/account scoped and cleared at sign-out. Student additions now require invitation acceptance in Account; no email is sent automatically.
6. Verify Google sign-in/out and logout replay, invitation acceptance/decline, cross-school denial, progress persistence, and the configured editor with synthetic accounts. Test video and the queue with a fake agent before a supervised physical test.

## Queue behavior and recovery

Dispatch claims one approved job under a robot row lock and the database's one-running-job constraint before returning its code. No other job is dispatched while it is running. A claimed job is never automatically resent after reconnect: replaying motion after an ambiguous delivery is unsafe.

Cancel applies only to pending/approved jobs. A running record is not an emergency-stop control. If a job is stuck, physically stop the robot, stop/disconnect its agent, confirm no program is still running, and have the operator reconcile that specific running record before restarting. There is deliberately no browser button that merely clears the execution lock while hardware could still move.

## Verification

Run npm ci at the root, npm ci --prefix bridge, npm ci --prefix studio, then npm test and npm test --prefix studio. Security tests use synthetic PostgreSQL data and a local fake API/WebSocket bridge; they never connect to the Pi or issue physical commands. The test harness uses node:module registerHooks and requires a recent Node version (tested with the workspace runtime).

## Remaining deployment checks

- Inspect actual VPS reverse-proxy, MediaMTX, code-server and systemd configuration. They are not included in this repository. Confirm TLS, firewall exposure, webhook authorization, editor authentication on every route including WebSocket upgrades, allowed iframe origin, CORS and service-user privileges.
- Verify the real Pi agent validates code hashes, obeys timeouts, terminates child processes and stops motion safely. Its implementation is outside this repository; fake-agent tests do not establish physical safety.
- Separate Workspace cookies last up to 30 minutes and are not revoked by portal logout. Media sessions may outlive their short admission JWT. Immediate access revocation across these services needs explicit session termination, not only token expiry.
- The CSP is report-only, not an enforced XSS barrier.
- Existing memberships are preserved. Review existing school rosters because invitation acceptance only governs future additions.
- Verify school Wi-Fi access with school IT using the actual block page and approved domain list.
- This is a targeted security/debug pass, not a guarantee of zero bugs or a completed student privacy compliance review.
