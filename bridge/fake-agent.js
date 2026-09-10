// Stands in for the real Pi agent during Phase 1 testing — connects, sends
// hello, and stays open so you can watch the portal's Status tab/DB flip to
// Online, then Ctrl-C it and watch it flip back to Offline.
//
// Usage: node fake-agent.js [wsUrl] [token] [serial]
import { WebSocket } from 'ws';

const url = process.argv[2] || 'ws://localhost:9000/agent';
const token = process.argv[3] || 'test-token';
const serial = process.argv[4] || 'robot005';

console.log(`connecting to ${url} as serial=${serial} ...`);
const ws = new WebSocket(url);

ws.on('open', () => {
  console.log('connected — sending hello');
  ws.send(JSON.stringify({ t: 'hello', token, serial, agentVersion: 'fake-agent-0.0.1' }));
});
ws.on('message', (raw) => console.log('recv:', raw.toString()));
ws.on('close', (code, reason) => console.log('closed', code, reason.toString()));
ws.on('error', (e) => console.error('error:', e.message));
