import WebSocket from 'ws';

// Connects to the sim container's gateway, retrying while Gazebo boots. `ready` resolves on its first 'ready' message.
export function connectGateway({ url, token }, { onMessage, onClose }, { retryMs = 1000 } = {}){
  let ws = null;
  let closed = false;
  let isReady = false;
  let resolveReady, rejectReady;
  const ready = new Promise((res, rej) => { resolveReady = res; rejectReady = rej; });
  ready.catch(() => {});

  function open(){
    if (closed) return;
    ws = new WebSocket(url, { maxPayload: 1024 * 1024, handshakeTimeout: 5000 });
    ws.on('open', () => ws.send(JSON.stringify({ type: 'hello', token })));
    ws.on('message', (data) => {
      let msg;
      try { msg = JSON.parse(data.toString('utf8')); } catch { return; }
      if (msg.type === 'ready' && !isReady){ isReady = true; resolveReady(msg); return; }
      if (isReady) onMessage(msg);
    });
    ws.on('error', () => {});
    ws.on('close', () => {
      if (closed) return;
      if (!isReady){ setTimeout(open, retryMs); return; }
      closed = true;
      onClose();
    });
  }
  open();

  return {
    ready,
    close(){
      closed = true;
      if (!isReady) rejectReady(new Error('closed'));
      if (ws) ws.terminate();
    },
  };
}
