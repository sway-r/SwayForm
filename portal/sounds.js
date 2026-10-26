/* Low-key synthesized UI sounds (Web Audio, no audio files). Off unless the
 * Sound effects setting is on. Importing this module installs one delegated
 * click listener; playSound() can also be called directly. */
import { getPrefs } from './prefs.js';

const VOLUME = 0.05;
const SOUNDS = {
  click: [{ f: 640, d: 0.04 }],
  toggle: [{ f: 480, d: 0.05 }, { f: 720, d: 0.06, at: 0.05 }],
  open: [{ f: 420, d: 0.07 }, { f: 640, d: 0.09, at: 0.06 }],
  close: [{ f: 560, d: 0.06 }, { f: 360, d: 0.08, at: 0.05 }],
  success: [{ f: 523, d: 0.12 }, { f: 659, d: 0.12, at: 0.1 }, { f: 784, d: 0.24, at: 0.2 }],
  error: [{ f: 220, d: 0.18, type: 'triangle' }],
};

let ctx = null;

function audioContext(){
  if (ctx) return ctx;
  try {
    const Ctor = window.AudioContext || window.webkitAudioContext;
    if (Ctor) ctx = new Ctor();
  } catch (e) { /* audio unavailable */ }
  return ctx;
}

export function playSound(name){
  if (!getPrefs().sounds) return;
  const notes = SOUNDS[name];
  const audio = audioContext();
  if (!notes || !audio) return;
  if (audio.state === 'suspended') audio.resume().catch(() => {});
  const start = audio.currentTime;
  notes.forEach((n) => {
    const at = start + (n.at || 0);
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.type = n.type || 'sine';
    osc.frequency.value = n.f;
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(VOLUME, at + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + n.d);
    osc.connect(gain).connect(audio.destination);
    osc.start(at);
    osc.stop(at + n.d + 0.02);
  });
}

function soundForClick(target){
  if (target.closest('.set-switch, label.set-row')) return null;
  if (target.closest('.desktop-icon')) return 'open';
  if (target.closest('.win-ctrl[data-act="close"]')) return 'close';
  if (target.closest('button, [role="button"], a[href], .p-btn')) return 'click';
  return null;
}

if (typeof document !== 'undefined'){
  document.addEventListener('click', (e) => {
    const name = e.target instanceof Element ? soundForClick(e.target) : null;
    if (name) playSound(name);
  });
  document.addEventListener('change', (e) => {
    if (e.target instanceof Element && e.target.matches('.set-switch input')) playSound('toggle');
  });
  window.addEventListener('swayform:lab-complete', () => playSound('success'));
  window.addEventListener('swayform:save-error', () => playSound('error'));
}
