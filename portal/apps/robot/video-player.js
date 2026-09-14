// WHEP client for the robot's live video feed. Plain RTCPeerConnection, no
// library — fetches a short-lived viewer JWT from api/robot/status.js (POST),
// then does a standard WHEP offer/answer exchange against MediaMTX (via the
// bridge VPS's video.bridge.swayform.net, not this app's own origin).
const VIDEO_BASE = 'https://video.bridge.swayform.net';

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
 * connection (each open WHEP session holds a slot on the relay).
 */
export function mountVideoPlayer(container){
  container.innerHTML = `
    <div class="robot-video-wrap">
      <video class="robot-video" autoplay playsinline muted></video>
      <p class="robot-video-note" data-role="video-note">Connecting…</p>
    </div>`;
  const videoEl = container.querySelector('.robot-video');
  const note = container.querySelector('[data-role="video-note"]');

  let pc = null;
  let resourceUrl = null;
  let stopped = false;

  async function connect(){
    try {
      const tokenRes = await fetch('/api/robot/status', { method: 'POST' });
      if (!tokenRes.ok) throw new Error(`token ${tokenRes.status}`);
      const { token, serial } = await tokenRes.json();
      if (stopped) return;

      pc = new RTCPeerConnection();
      pc.addTransceiver('video', { direction: 'recvonly' });
      pc.ontrack = (event) => { videoEl.srcObject = event.streams[0]; };
      pc.onconnectionstatechange = () => {
        if (!pc) return;
        if (pc.connectionState === 'connected') note.textContent = '';
        else if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected'){
          note.textContent = 'Connection lost.';
        }
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      await waitForIceGathering(pc);
      if (stopped) return;

      const whepUrl = `${VIDEO_BASE}/${encodeURIComponent(serial)}/whep`;
      const res = await fetch(whepUrl, {
        method: 'POST',
        headers: { 'content-type': 'application/sdp', authorization: `Bearer ${token}` },
        body: pc.localDescription.sdp,
      });
      if (!res.ok) throw new Error(`whep ${res.status}`);

      const location = res.headers.get('location');
      resourceUrl = location ? new URL(location, whepUrl).href : null;
      const answerSdp = await res.text();
      if (stopped) return;
      await pc.setRemoteDescription({ type: 'answer', sdp: answerSdp });
    } catch (e) {
      if (!stopped) note.textContent = "Couldn't connect to the robot's video feed. It may be offline.";
    }
  }

  connect();

  return {
    unmount(){
      stopped = true;
      if (pc){ pc.close(); pc = null; }
      if (resourceUrl){
        fetch(resourceUrl, { method: 'DELETE' }).catch(() => {});
        resourceUrl = null;
      }
    },
  };
}
