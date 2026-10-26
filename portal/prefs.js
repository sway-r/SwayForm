/* Device-local portal preferences (editor font size, word wrap, minimap,
 * reduce motion). Saved in this browser only. Importing this module applies
 * the saved reduce-motion setting; changes broadcast 'swayform:prefs-changed'. */
const KEY = 'swayform.portal.prefs';
const DEFAULTS = { editorFontSize: 13, editorWordWrap: false, editorMinimap: false, reduceMotion: false };
export const FONT_SIZES = [12, 13, 14, 16, 18];

export function getPrefs(){
  try { return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) || '{}') }; }
  catch (e) { return { ...DEFAULTS }; }
}

export function applyPrefs(prefs = getPrefs()){
  document.documentElement.toggleAttribute('data-reduce-motion', !!prefs.reduceMotion);
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
