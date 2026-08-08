/* Application-wide theme — Light or Dark. Sets a `data-theme` attribute on
 * <html>; every light "app" surface (--la-* tokens in portal.css) reacts to
 * it automatically via CSS, so this module only owns persistence + the
 * attribute itself. The Portal Desktop wallpaper/chrome and the Code
 * Editor/Terminal stay on their own dark tokens regardless of theme — see
 * portal.css. Applied synchronously (see the inline snippet in index.html)
 * before first paint to avoid a light-mode flash when Dark is saved. */
const KEY = 'swayform.portal.theme';

export function getTheme(){
  try { return localStorage.getItem(KEY) === 'dark' ? 'dark' : 'light'; }
  catch (e) { return 'light'; }
}

export function applyTheme(theme){
  document.documentElement.dataset.theme = theme === 'dark' ? 'dark' : 'light';
}

export function setTheme(theme){
  try { localStorage.setItem(KEY, theme === 'dark' ? 'dark' : 'light'); } catch (e) { /* noop */ }
  applyTheme(theme);
}
