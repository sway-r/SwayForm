// WHEP client for the robot's live video feed. Plain RTCPeerConnection, no
// library — fetches a short-lived viewer JWT from api/robot/status.js (POST),
// then does a standard WHEP offer/answer exchange against MediaMTX (via the
// bridge VPS's video.bridge.swayform.net, not this app's own origin).
//
// On-demand, not always-on: the Pi's camera encode used to run around the
// clock regardless of whether anyone was watching (24+ hours nonstop, video
// transfer to whoever had the Robot app open). Now nothing connects until
// the viewer taps "Show feed", and the feed self-stops after
// FEED_DURATION_MS either way — both ends: the WHEP connection here, and
// (best-effort, via api/robot/status.js -> bridge) the Pi's encode itself,
// refcounted per-robot on the bridge so one viewer's timeout doesn't cut a
// still-watching second viewer's feed.
const VIDEO_BASE = 'https://video.bridge.swayform.net';
const FEED_DURATION_MS = 30_000;

function waitForIceGathering(pc){
  if (pc.iceGatheringState === 'complete') return Promise.resolve();
  return new Promise((resolve) => {
    function check(){
      if (pc.iceGatheringState === 'complete'){
        pc.removeEventListener('icegatheringstatechange', check);
        resolve();
      }
    }
    pc.addEventListener('icegatheringstatechange', check);
    // Belt-and-suspenders: don't hang forever on a slow/blocked network.
    setTimeout(() => { pc.removeEventListener('icegatheringstatechange', check); resolve(); }, 4000);
  });
}

/**
 * Mounts a live video player into `container`. Returns { unmount() } —
 * call it when the Live Video tab is hidden/closed to release the viewer
 * connection (each open WHEP session holds a slot on the relay) and tell
 * the Pi to stop encoding if this was the last viewer watching.
 */
export function mountVideoPlayer(container){
  container.innerHTML = `
    <div class="robot-video-wrap">
      <div class="robot-video-idle" data-role="idle">
        <button type="button" class="p-btn primary" data-role="show-feed">Show feed</button>
        <p class="robot-video-note" data-role="idle-note"></p>
      </div>
      <div class="robot-video-live" data-role="live" hidden>
        <video class="robot-video" autoplay playsinline muted></video>
        <p class="robot-video-note" data-role="video-note"></p>
      </div>
    </div>`;
  const showBtn = container.querySelector('[data-role="show-feed"]');
  const idleNote = container.querySelector('[data-role="idle-note"]');
  const liveWrap = container.querySelector('[data-role="live"]');
  const videoEl = container.querySelector('.robot-video');
  const note = container.querySelector('[data-role="video-note"]');

  let pc = null;
  let resourceUrl = null;
  let viewerToken = null;
  let active = false;
  let autoStopTimer = null;
  let countdownTimer = null;

  function releaseResource(){
    if (!resourceUrl) return;
    const url = resourceUrl; resourceUrl = null;
    fetch(url, { method: 'DELETE', headers: { authorization: `Bearer ${viewerToken}` }, signal: AbortSignal.timeout(5000) }).catch(() => {});
  }

  /** Best-effort — tells the bridge to relay video.stop to the agent once
   * refcounting says nobody's left watching. Uses keepalive so it still
   * fires if this is happening because the tab/window is closing. */
  function notifyBridgeStop(){
    fetch('/api/robot/status', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action: 'stop' }), signal: AbortSignal.timeout(5000), keepalive: true,
    }).catch(() => {});
  }

  function teardown(){
    clearTimeout(autoStopTimer); autoStopTimer = null;
    clearInterval(countdownTimer); countdownTimer = null;
    if (pc){ pc.close(); pc = null; }
    releaseResource();
    videoEl.srcObject = null;
    liveWrap.hidden = true;
    showBtn.hidden = false;
  }

  function stopFeed(){
    if (!active) return;
    active = false;
    teardown();
    notifyBridgeStop();
  }

  async function startFeed(){
    if (active) return;
    active = true;
    idleNote.textContent = '';
    showBtn.hidden = true;
    liveWrap.hidden = false;
    note.textContent = 'Connecting…';

    try {
      const tokenRes = await fetch('/api/robot/status', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'start' }), signal: AbortSignal.timeout(10_000),
      });
      if (!tokenRes.ok) throw new Error(`token ${tokenRes.status}`);
      const { token, serial } = await tokenRes.json();
      if (!active) return;
      viewerToken = token;

      pc = new RTCPeerConnection();
      pc.addTransceiver('video', { direction: 'recvonly' });
      pc.ontrack = (event) => { videoEl.srcObject = event.streams[0]; };
      pc.onconnectionstatechange = () => {
        if (!pc) return;
        if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected'){
          note.textContent = 'Connection lost.';
        }
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      await waitForIceGathering(pc);
      if (!active) return;

      const whepUrl = `${VIDEO_BASE}/${encodeURIComponent(serial)}/whep`;
      const res = await fetch(whepUrl, {
        method: 'POST',
        headers: { 'content-type': 'application/sdp', authorization: `Bearer ${token}` },
        body: pc.localDescription.sdp,
        signal: AbortSignal.timeout(10_000),
      });
      if (!res.ok) throw new Error(`whep ${res.status}`);

      const location = res.headers.get('location');
      const resource = location ? new URL(location, whepUrl) : null;
      if (resource && resource.origin !== VIDEO_BASE) throw new Error('unexpected_video_origin');
      resourceUrl = resource ? resource.href : null;
      const answerSdp = await res.text();
      if (!active){ releaseResource(); return; }
      await pc.setRemoteDescription({ type: 'answer', sdp: answerSdp });

      let secondsLeft = Math.round(FEED_DURATION_MS / 1000);
      note.textContent = `Feed stops automatically in ${secondsLeft}s.`;
      countdownTimer = setInterval(() => {
        secondsLeft -= 1;
        if (secondsLeft <= 0){ clearInterval(countdownTimer); countdownTimer = null; return; }
        note.textContent = `Feed stops automatically in ${secondsLeft}s.`;
      }, 1000);
      autoStopTimer = setTimeout(stopFeed, FEED_DURATION_MS);
    } catch (e) {
      const wasActive = active;
      active = false;
      teardown();
      idleNote.textContent = "Couldn't connect to the robot's video feed. It may be offline.";
      // The 'start' relay may have already reached the bridge before this
      // failed further down the chain — send 'stop' so it doesn't think a
      // viewer is still watching.
      if (wasActive) notifyBridgeStop();
    }
  }

  showBtn.addEventListener('click', startFeed);

  return {
    unmount(){
      stopFeed();
    },
  };
}
