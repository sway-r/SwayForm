/** Escapes text for safe insertion into innerHTML. Use for any user-controlled
 *  or server-sourced string (names, school names, emails, ...) that isn't
 *  otherwise known to be safe. */
export function escapeHtml(s){
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
