/* Follows ONE submitted Run on Robot job from the student's editor.

   This used to download the student's entire job list — every past job's
   full code and output — every 3 seconds, for as long as the job existed,
   just to find one row and compare its status. Now each poll asks for that
   one job, and only for output written since the last poll.

   Cadence follows what the student is actually waiting for: a pending job
   is waiting on a person (an admin's review), which can take minutes or all
   afternoon, so it eases off; an approved/running job changes in seconds, so
   it polls quickly. A terminal status ends the loop immediately. */
import { createPoller, STOP } from './adaptive-poller.js';

const TERMINAL = ['succeeded', 'failed', 'rejected', 'cancelled'];
const ACTIVE_MS = 3_000;            // approved/running
const PENDING_FIRST_MS = 5_000;     // first two minutes of waiting for review
const PENDING_MS = 15_000;          // two to thirty minutes
const PENDING_LONG_MS = 60_000;     // beyond thirty minutes

function pendingDelay(waitedMs){
  if (waitedMs < 2 * 60_000) return PENDING_FIRST_MS;
  if (waitedMs < 30 * 60_000) return PENDING_MS;
  return PENDING_LONG_MS;
}

/**
 * @param {number} jobId
 * @param {object} handlers
 * @param {(status, job) => void} handlers.onStatus   each time status changes
 * @param {(text, truncated) => void} handlers.onOutput  new output only
 * @param {(error, failures) => void} [handlers.onError] a poll failed (it retries)
 * @param {() => void} [handlers.onRecovered]           polls work again
 * @param {(reason) => void} [handlers.onGone]          job no longer readable; loop ended
 * @returns {{ stop(): void }}
 */
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
      // Gone for good (history cleared, removed from the class, signed out):
      // retrying can't fix it, so stop instead of polling a 404 forever.
      if (res.status === 404 || res.status === 401){
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
