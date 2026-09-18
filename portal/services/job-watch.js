// Follows one submitted job: one request per poll, only unseen output, eases off
// while pending, stops at a terminal status.
import { createPoller, STOP } from './adaptive-poller.js';

const TERMINAL = ['succeeded', 'failed', 'rejected', 'cancelled'];
const ACTIVE_MS = 3_000;
const PENDING_FIRST_MS = 5_000;     // first two minutes
const PENDING_MS = 15_000;          // up to thirty minutes
const PENDING_LONG_MS = 60_000;

function pendingDelay(waitedMs){
  if (waitedMs < 2 * 60_000) return PENDING_FIRST_MS;
  if (waitedMs < 30 * 60_000) return PENDING_MS;
  return PENDING_LONG_MS;
}

// onStatus(status, job), onOutput(text, truncated), onError(error, failures), onRecovered(), onGone(reason).
export function watchJob(jobId, { onStatus, onOutput, onError, onRecovered, onGone }){
  const startedAt = Date.now();
  let status = 'pending';
  let outputLen = 0;
  let failing = false;

  const poller = createPoller({
    whenHidden: 'slow',
    delayMs: () => (status === 'pending' ? pendingDelay(Date.now() - startedAt) : ACTIVE_MS),
    onError(error, failures){
      failing = true;
      if (onError) onError(error, failures);
    },
    async task(){
      const res = await fetch(`/api/robot/queue?view=job&id=${jobId}&sinceLen=${outputLen}`);
      if (res.status === 404 || res.status === 401){ // gone for good; don't retry forever
        if (onGone) onGone(res.status === 404 ? 'not_found' : 'not_authorized');
        return STOP;
      }
      if (!res.ok) throw new Error(`job status -> ${res.status}`);
      const { job } = await res.json();

      if (failing){ failing = false; if (onRecovered) onRecovered(); }
      if (job.status !== status){
        status = job.status;
        onStatus(status, job);
      }
      if (job.outputTotalLen > outputLen){
        onOutput(job.outputTail || '', !!job.outputTruncated);
        outputLen = job.outputTotalLen;
      }
      return TERMINAL.includes(job.status) ? STOP : job;
    },
  });
  poller.start();
  return { stop: () => poller.stop() };
}
