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
// See the retry loop below for why this is wider than the Pi's typical
// publish time — it needs margin, not just the happy-path estimate.
const WHEP_MAX_ATTEMPTS = 15;
const WHEP_RETRY_DELAY_MS = 700;

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
      const postWhep = () => fetch(whepUrl, {
        method: 'POST',
        headers: { 'content-type': 'application/sdp', authorization: `Bearer ${token}` },
        body: pc.localDescription.sdp,
        signal: AbortSignal.timeout(10_000),
      });

      // The 'start' request above only pings the Pi to begin publishing —
      // it doesn't wait for confirmation. The real WHIP handshake (camera
      // open, ffmpeg offer/answer/ICE/DTLS/SRTP) was assumed to take ~1.5s
      // on real hardware, but observed publish times run closer to 5s, so a
      // 6-attempt/700ms (~4.2s) budget was giving up right as the Pi's
      // publish came up — and the catch block's notifyBridgeStop() below
      // then killed that just-established publish out from under it
      // (visible in mediamtx as "is publishing" immediately followed by
      // "closed: terminated", on a loop). WHEP_MAX_ATTEMPTS gives enough
      // margin over that observed time that a normal-but-slow handshake
      // doesn't get torn down by our own timeout. A "no publisher"
      // rejection can surface as a thrown network error, not just a non-2xx
      // response (MediaMTX resetting the connection rather than answering
      // with a clean 404) — catch per-attempt so a throw retries too,
      // instead of skipping the whole retry loop on the first attempt.
      let res = null;
      let lastError = null;
      for (let attempt = 0; attempt < WHEP_MAX_ATTEMPTS && active; attempt++){
        if (attempt > 0){
          note.textContent = 'Waiting for the robot to start streaming…';
          await new Promise((r) => setTimeout(r, WHEP_RETRY_DELAY_MS));
          if (!active) return;
        }
        try {
          res = await postWhep();
          if (res.ok) break;
          lastError = new Error(`whep ${res.status}`);
        } catch (e) {
          res = null;
          lastError = e;
        }
      }
      if (!active) return;
      if (!res || !res.ok) throw lastError || new Error('whep_failed');

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
