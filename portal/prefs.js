/* Device-local portal preferences (text size, editor word wrap and minimap,
 * reduce motion). Saved in this browser only. Importing this module applies
 * the saved reduce-motion setting; changes broadcast 'swayform:prefs-changed'. */
const KEY = 'swayform.portal.prefs';
export const TEXT_SIZE_MIN = 10;
export const TEXT_SIZE_MAX = 18;
export const TEXT_SIZE_DEFAULT = 13;
const DEFAULTS = { textSize: TEXT_SIZE_DEFAULT, editorWordWrap: false, editorMinimap: false, reduceMotion: false };

export function getPrefs(){
  let prefs;
  try { prefs = { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) || '{}') }; }
  catch (e) { prefs = { ...DEFAULTS }; }
  const size = Number(prefs.textSize);
  prefs.textSize = Number.isFinite(size) ? Math.min(TEXT_SIZE_MAX, Math.max(TEXT_SIZE_MIN, Math.round(size))) : TEXT_SIZE_DEFAULT;
  return prefs;
}

export function applyPrefs(prefs = getPrefs()){
  document.documentElement.toggleAttribute('data-reduce-motion', !!prefs.reduceMotion);
  document.documentElement.style.setProperty('--p-text-zoom', String(prefs.textSize / TEXT_SIZE_DEFAULT));
}

export function setPref(name, value){
  const prefs = { ...getPrefs(), [name]: value };
  try { localStorage.setItem(KEY, JSON.stringify(prefs)); } catch (e) { /* noop */ }
  applyPrefs(prefs);
  window.dispatchEvent(new CustomEvent('swayform:prefs-changed', { detail: prefs }));
}

export function resetPrefs(){
  try { localStorage.removeItem(KEY); } catch (e) { /* noop */ }
  applyPrefs({ ...DEFAULTS });
  window.dispatchEvent(new CustomEvent('swayform:prefs-changed', { detail: { ...DEFAULTS } }));
}

applyPrefs();
