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
// A time budget, not an attempt count; plus FEED_DURATION_MS it must stay under the bridge's VIEWER_TTL_MS.
const CONNECT_BUDGET_MS = 25_000;
const WHEP_ATTEMPT_TIMEOUT_MS = 5_000;
const WHEP_RETRY_DELAY_MS = 700;
// How long a 'disconnected' feed gets to recover by itself before it's torn down.
const RECOVERY_GRACE_MS = 6_000;

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

  // The attempt that owns the UI. An older one may still be unwinding; it only ever touches its own state.
  let current = null;
  let autoStopTimer = null;
  let countdownTimer = null;
  let recoveryTimer = null;
  let connectionLost = false;

  function releaseSession(attempt){
    if (!attempt.resourceUrl) return;
    const url = attempt.resourceUrl; attempt.resourceUrl = null;
    fetch(url, { method: 'DELETE', headers: { authorization: `Bearer ${attempt.token}` }, signal: AbortSignal.timeout(5000) }).catch(() => {});
  }

  /** Best-effort — tells the bridge to relay video.stop to the agent once
   * refcounting says nobody's left watching. Uses keepalive so it still
   * fires if this is happening because the tab/window is closing. */
  function notifyBridgeStop(attempt){
    fetch('/api/robot/status', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action: 'stop', viewerId: attempt.viewerId }), signal: AbortSignal.timeout(5000), keepalive: true,
    }).catch(() => {});
  }

  function closeAttempt(attempt){
    if (attempt.pc){ attempt.pc.close(); attempt.pc = null; }
    releaseSession(attempt);
  }

  function resetUi(){
    clearTimeout(autoStopTimer); autoStopTimer = null;
    clearInterval(countdownTimer); countdownTimer = null;
    clearTimeout(recoveryTimer); recoveryTimer = null;
    connectionLost = false;
    videoEl.srcObject = null;
    liveWrap.hidden = true;
    showBtn.hidden = false;
  }

  function stopFeed(){
    const attempt = current;
    if (!attempt) return;
    current = null;
    resetUi();
    closeAttempt(attempt);
    notifyBridgeStop(attempt);
  }

  // A dropped feed is released at once rather than sitting frozen until the 30s timer.
  function dropFeed(){
    if (!current) return;
    stopFeed();
    idleNote.textContent = 'The video connection dropped. Tap Show feed to reconnect.';
  }

  async function startFeed(){
    if (current) return;
    // viewerId names this viewer to the bridge, so our stop can only ever remove our own entry.
    const attempt = { viewerId: crypto.randomUUID(), pc: null, token: null, resourceUrl: null };
    current = attempt;
    const live = () => current === attempt;
    idleNote.textContent = '';
    showBtn.hidden = true;
    liveWrap.hidden = false;
    note.textContent = 'Connecting…';
    const connectDeadline = Date.now() + CONNECT_BUDGET_MS;

    try {
      const tokenRes = await fetch('/api/robot/status', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'start', viewerId: attempt.viewerId }), signal: AbortSignal.timeout(10_000),
      });
      if (!tokenRes.ok) throw new Error(`token ${tokenRes.status}`);
      const { token, serial } = await tokenRes.json();
      // The stop sent at cancel time may have reached the bridge before this start did.
      if (!live()){ notifyBridgeStop(attempt); return; }
      attempt.token = token;

      const pc = new RTCPeerConnection();
      attempt.pc = pc;
      pc.addTransceiver('video', { direction: 'recvonly' });
      pc.ontrack = (event) => { if (live()) videoEl.srcObject = event.streams[0]; };
      pc.onconnectionstatechange = () => {
        if (!live()) return;
        const state = pc.connectionState;
        if (state === 'failed'){ dropFeed(); return; }
        if (state === 'disconnected'){
          // Often a blip ICE recovers from on its own; give it a moment first.
          connectionLost = true;
          note.textContent = 'Connection interrupted — trying to recover…';
          if (!recoveryTimer) recoveryTimer = setTimeout(() => { recoveryTimer = null; if (connectionLost) dropFeed(); }, RECOVERY_GRACE_MS);
        } else if (state === 'connected' && connectionLost){
          connectionLost = false;
          clearTimeout(recoveryTimer); recoveryTimer = null;
        }
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      await waitForIceGathering(pc);
      if (!live()) return;

      const whepUrl = `${VIDEO_BASE}/${encodeURIComponent(serial)}/whep`;
      const postWhep = () => fetch(whepUrl, {
        method: 'POST',
        headers: { 'content-type': 'application/sdp', authorization: `Bearer ${token}` },
        body: pc.localDescription.sdp,
        signal: AbortSignal.timeout(Math.max(1_000, Math.min(WHEP_ATTEMPT_TIMEOUT_MS, connectDeadline - Date.now()))),
      });

      // The 'start' request above only pings the Pi to begin publishing —
      // it doesn't wait for confirmation. The real WHIP handshake (camera
      // open, ffmpeg offer/answer/ICE/DTLS/SRTP) was assumed to take ~1.5s
      // on real hardware, but observed publish times run closer to 5s, so a
      // 6-attempt/700ms (~4.2s) budget was giving up right as the Pi's
      // publish came up — and the catch block's notifyBridgeStop() below
      // then killed that just-established publish out from under it
      // (visible in mediamtx as "is publishing" immediately followed by
      // "closed: terminated", on a loop). CONNECT_BUDGET_MS gives enough
      // margin over that observed time that a normal-but-slow handshake
      // doesn't get torn down by our own timeout. A "no publisher"
      // rejection can surface as a thrown network error, not just a non-2xx
      // response (MediaMTX resetting the connection rather than answering
      // with a clean 404) — catch per-attempt so a throw retries too,
      // instead of skipping the whole retry loop on the first attempt.
      let res = null;
      let lastError = null;
      for (let tries = 0; live() && (tries === 0 || Date.now() < connectDeadline); tries++){
        if (tries > 0){
          note.textContent = 'Waiting for the robot to start streaming…';
          await new Promise((r) => setTimeout(r, WHEP_RETRY_DELAY_MS));
          if (!live()) return;
        }
        try {
          res = await postWhep();
          if (res.ok) break;
          lastError = new Error(`whep ${res.status}`);
          // A rejected token won't start working; "no publisher yet" (404) is the case worth waiting on.
          if (res.status === 401 || res.status === 403) break;
        } catch (e) {
          res = null;
          lastError = e;
        }
      }
      // A session the relay opened still has to be released, even if nobody is waiting for it any more.
      if (res && res.ok){
        const location = res.headers.get('location');
        const resource = location ? new URL(location, whepUrl) : null;
        if (resource && resource.origin !== VIDEO_BASE) throw new Error('unexpected_video_origin');
        attempt.resourceUrl = resource ? resource.href : null;
      }
      if (!live()){ releaseSession(attempt); return; }
      if (!res || !res.ok) throw lastError || new Error('whep_failed');

      const answerSdp = await res.text();
      if (!live()){ releaseSession(attempt); return; }
      await pc.setRemoteDescription({ type: 'answer', sdp: answerSdp });
      if (!live()) return;

      let secondsLeft = Math.round(FEED_DURATION_MS / 1000);
      note.textContent = `Feed stops automatically in ${secondsLeft}s.`;
      countdownTimer = setInterval(() => {
        secondsLeft -= 1;
        if (secondsLeft <= 0){ clearInterval(countdownTimer); countdownTimer = null; return; }
        if (!connectionLost) note.textContent = `Feed stops automatically in ${secondsLeft}s.`;
      }, 1000);
      autoStopTimer = setTimeout(stopFeed, FEED_DURATION_MS);
    } catch (e) {
      closeAttempt(attempt);
      // Already stopped or replaced: whoever did that reset the UI and told the bridge.
      if (!live()) return;
      current = null;
      resetUi();
      idleNote.textContent = "Couldn't connect to the robot's video feed. It may be offline.";
      // The 'start' relay may have already reached the bridge before this
      // failed further down the chain — send 'stop' so it doesn't think a
      // viewer is still watching.
      notifyBridgeStop(attempt);
    }
  }

  showBtn.addEventListener('click', startFeed);

  return {
    unmount(){
      stopFeed();
    },
  };
}
