/* Tiny shared helper: the "reading surface" theme (light/dark) used by the
   Learn app's notebook pane and the Help app's docs viewer — set from the
   Settings app, applied live to every open window via a DOM class toggle. */
const KEY = 'swayform.portal.readingTheme';

export function getReadingTheme(){
  try { return localStorage.getItem(KEY) === 'dark' ? 'dark' : 'light'; }
  catch (e) { return 'light'; }
}

export function applyReadingTheme(el){
  el.classList.toggle('on-dark', getReadingTheme() === 'dark');
}

export function setReadingTheme(theme){
  try { localStorage.setItem(KEY, theme); } catch (e) { /* noop */ }
  document.querySelectorAll('.content-surface').forEach((el) => el.classList.toggle('on-dark', theme === 'dark'));
}
