import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';

const { mountVideoPlayer } = await import('../portal/apps/robot/video-player.js');

const flush = async () => { for (let i = 0; i < 5; i++) await new Promise((resolve) => setImmediate(resolve)); };

function makeContainer(){
  const els = new Map();
  const el = () => ({ hidden: false, textContent: '', srcObject: null, handlers: {}, addEventListener(type, fn){ this.handlers[type] = fn; } });
  return {
    set innerHTML(_){},
    querySelector(sel){ if (!els.has(sel)) els.set(sel, el()); return els.get(sel); },
    click(){ return els.get('[data-role="show-feed"]').handlers.click(); },
  };
}

let peers, whepPosts, stops, deletes;
beforeEach(() => {
  peers = []; whepPosts = []; stops = []; deletes = [];
  globalThis.RTCPeerConnection = class {
    constructor(){ this.closed = false; this.iceGatheringState = 'complete'; this.connectionState = 'new'; peers.push(this); }
    addTransceiver(){}
    async createOffer(){ return {}; }
    async setLocalDescription(){ this.localDescription = { sdp: 'offer' }; }
    async setRemoteDescription(){}
    close(){ this.closed = true; }
  };
  globalThis.fetch = (url, init) => {
    if (init.method === 'DELETE'){ deletes.push({ url, auth: init.headers.authorization }); return Promise.resolve({ ok: true }); }
    if (url === '/api/robot/status'){
      const body = JSON.parse(init.body);
      if (body.action === 'stop'){ stops.push(body.viewerId); return Promise.resolve({ ok: true }); }
      return Promise.resolve({ ok: true, json: async () => ({ token: `token-${body.viewerId}`, serial: 'S1' }) });
    }
    return new Promise((resolve, reject) => whepPosts.push({ resolve, reject, auth: init.headers.authorization }));
  };
});
afterEach(() => { delete globalThis.RTCPeerConnection; delete globalThis.fetch; });

const whepOk = (session) => ({ ok: true, status: 201, headers: { get: (k) => (k === 'location' ? `/S1/whep/${session}` : null) }, text: async () => 'answer' });

// A's connection fails while its WHEP request is still pending, then B connects.
async function supersede(container){
  container.click(); await flush();
  peers[0].connectionState = 'failed'; peers[0].onconnectionstatechange(); await flush();
  container.click(); await flush();
  whepPosts[1].resolve(whepOk('session-b')); await flush();
}

test('a stale attempt that fails late leaves the reconnected feed alone', async () => {
  const container = makeContainer();
  const player = mountVideoPlayer(container);
  await supersede(container);
  const stopsBefore = [...stops];
  assert.equal(stopsBefore.length, 1, 'only the dropped attempt told the bridge to stop');

  whepPosts[0].resolve({ ok: false, status: 401 }); await flush();
  assert.equal(peers[1].closed, false, 'the live connection stays open');
  assert.deepEqual(stops, stopsBefore, 'and no stop goes out under its viewer id');
  assert.deepEqual(deletes, []);
  player.unmount();
});

test('a stale attempt that succeeds late releases its own session and nothing else', async () => {
  const container = makeContainer();
  const player = mountVideoPlayer(container);
  await supersede(container);

  whepPosts[0].resolve(whepOk('session-a')); await flush();
  assert.equal(peers[1].closed, false);
  assert.deepEqual(deletes, [{ url: 'https://video.bridge.swayform.net/S1/whep/session-a', auth: whepPosts[0].auth }]);
  player.unmount();
});

test('closing the player while the session request is pending still releases the session', async () => {
  const container = makeContainer();
  const player = mountVideoPlayer(container);
  container.click(); await flush();
  player.unmount();
  assert.deepEqual(deletes, [], 'nothing to release yet');

  whepPosts[0].resolve(whepOk('session-late')); await flush();
  assert.deepEqual(deletes, [{ url: 'https://video.bridge.swayform.net/S1/whep/session-late', auth: whepPosts[0].auth }]);
  assert.equal(stops.length, 1);
});
