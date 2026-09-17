export const MAX_ACTIVE_SEATS = 15;
export const MAX_TOTAL_STUDENTS = 40;

// A robot counts as online while is_online is set AND its last presence
// write is newer than this. The bridge (bridge/server.js,
// PRESENCE_WRITE_INTERVAL_MS) writes presence every 60s while an agent is
// connected, so this allows one write to be lost or late before the robot
// flips to offline. A normal disconnect doesn't wait for this at all — the
// bridge writes is_online=false the moment the socket closes. This window
// only bounds how long a robot can look online after the BRIDGE ITSELF dies.
// Keep it above 2x the bridge's write interval if either one changes.
export const ROBOT_ONLINE_CUTOFF_MS = 150_000;
