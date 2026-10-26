/* Device-local portal preferences (text size, editor word wrap and minimap,
 * hide completed labs, lab timer, sound effects, reduce motion). Saved in this
 * browser only. Importing this module applies the saved text size and motion
 * setting; changes broadcast 'swayform:prefs-changed'. */
const KEY = 'swayform.portal.prefs';
export const TEXT_SIZE_MIN = 10;
export const TEXT_SIZE_MAX = 18;
export const TEXT_SIZE_DEFAULT = 13;

function osPrefersReducedMotion(){
  try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; }
  catch (e) { return false; }
}

function defaults(){
  return {
    textSize: TEXT_SIZE_DEFAULT,
    editorWordWrap: true,
    editorMinimap: true,
    hideCompleted: false,
    showTimer: false,
    sounds: false,
    reduceMotion: osPrefersReducedMotion(),
  };
}

export function getPrefs(){
  let prefs;
  try { prefs = { ...defaults(), ...JSON.parse(localStorage.getItem(KEY) || '{}') }; }
  catch (e) { prefs = defaults(); }
  const size = Number(prefs.textSize);
  prefs.textSize = Number.isFinite(size) ? Math.min(TEXT_SIZE_MAX, Math.max(TEXT_SIZE_MIN, Math.round(size))) : TEXT_SIZE_DEFAULT;
  return prefs;
}

export function applyPrefs(prefs = getPrefs()){
  const root = document.documentElement;
  root.style.setProperty('--p-text-zoom', String(prefs.textSize / TEXT_SIZE_DEFAULT));
  root.toggleAttribute('data-reduce-motion', !!prefs.reduceMotion);
}

export function setPref(name, value){
  const prefs = { ...getPrefs(), [name]: value };
  try { localStorage.setItem(KEY, JSON.stringify(prefs)); } catch (e) { /* noop */ }
  applyPrefs(prefs);
  window.dispatchEvent(new CustomEvent('swayform:prefs-changed', { detail: prefs }));
}

export function resetPrefs(){
  try { localStorage.removeItem(KEY); } catch (e) { /* noop */ }
  const prefs = getPrefs();
  applyPrefs(prefs);
  window.dispatchEvent(new CustomEvent('swayform:prefs-changed', { detail: prefs }));
}

applyPrefs();
