/* Studio-only Node module loader.
 *
 * The Learning Portal has no package.json anywhere (it's a no-build-step
 * site — browsers read <script type="module"> directly), so Node's default
 * module resolution treats every portal/**\/*.js file as CommonJS and fails
 * on `import`/`export` syntax. Adding a package.json to the main repo just
 * to satisfy Node would be a real change to production static assets for a
 * dev-tool's benefit.
 *
 * This hook forces "module" format for repo .js files (including with a
 * ?v=N cache-busting query, which Studio uses to re-import content after a
 * save). It touches nothing on disk and has zero effect on browsers.
 */
export async function load(url, context, nextLoad) {
  const clean = url.split('?')[0];
  if (clean.endsWith('.js') && !clean.includes('/node_modules/')) {
    return nextLoad(url, { ...context, format: 'module' });
  }
  return nextLoad(url, context);
}
