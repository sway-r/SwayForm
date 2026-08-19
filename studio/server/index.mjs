/* SwayForm Learning Portal Studio — local server.
 *
 *   http://127.0.0.1:4600  Studio UI + API   (Vite middleware, React app)
 *   http://127.0.0.1:4601  Student preview   (the REAL portal, served from
 *                          the repo exactly like learning.swayform.net, with
 *                          draft-modified data files substituted in-memory)
 *
 * Both servers bind 127.0.0.1 explicitly — never exposed to the network.
 * The preview is the actual production portal code; nothing is duplicated,
 * so what you see in preview is what students get after a save.
 */
import { register } from 'node:module';
register('./esm-loader.mjs', import.meta.url);

import path from 'node:path';
import fs from 'node:fs';
import express from 'express';
import * as Diff from 'diff';
import { REPO_ROOT, absPath } from './repo.mjs';
import { DraftStore } from './draft.mjs';
import { generateChanges } from './writers.mjs';
import { validateModel } from './validate.mjs';
import { searchContent } from './search.mjs';
import { listAssetsWithUsage, uploadAsset, deleteAsset } from './assets.mjs';
import { listIconNames } from './content-load.mjs';
import { runSave } from './save.mjs';
import { gitLog, gitShow, gitStatus } from './gitops.mjs';
import { WRITABLE_FILES } from './repo.mjs';

const STUDIO_PORT = Number(process.env.STUDIO_PORT || 4600);
const PREVIEW_PORT = Number(process.env.STUDIO_PREVIEW_PORT || 4601);
const HOST = '127.0.0.1';

const draft = new DraftStore();
await draft.init();

/* Candidate-source cache for the preview server + diff endpoints. */
let changeCache = { revision: -1, changes: [] };
function draftChanges() {
  if (changeCache.revision !== draft.revision) {
    try {
      changeCache = { revision: draft.revision, changes: generateChanges(draft.base, draft.merged()) };
    } catch (err) {
      // A generator bug must not take the whole preview down — fall back to disk.
      console.error('[studio] change generation failed:', err.message);
      changeCache = { revision: draft.revision, changes: [], error: err.message };
    }
  }
  return changeCache;
}

/* ============================================================ Studio API */
const api = express.Router();
api.use(express.json({ limit: '32mb' }));

const wrap = (fn) => (req, res) => {
  Promise.resolve(fn(req, res)).catch((err) => {
    res.status(400).json({ error: String(err.message || err) });
  });
};

api.get('/state', wrap(async (req, res) => {
  res.json({
    revision: draft.revision,
    changeCount: draft.changeCount(),
    canUndo: draft.pointer > 0,
    canRedo: draft.pointer < draft.ops.length,
    staleFiles: draft.staleFiles(),
    generatorError: draftChanges().error || null,
  });
}));

api.get('/content', wrap(async (req, res) => {
  res.json({
    revision: draft.revision,
    content: draft.merged(),
    iconNames: listIconNames(),
  });
}));

api.post('/op', wrap(async (req, res) => {
  const summary = draft.apply(req.body.op);
  res.json({ ok: true, summary, revision: draft.revision });
}));

api.post('/ops', wrap(async (req, res) => {
  const summaries = [];
  for (const op of req.body.ops) summaries.push(draft.apply(op));
  res.json({ ok: true, summaries, revision: draft.revision });
}));

api.post('/undo', wrap(async (req, res) => res.json({ ok: draft.undo(), revision: draft.revision })));
api.post('/redo', wrap(async (req, res) => res.json({ ok: draft.redo(), revision: draft.revision })));
api.post('/discard', wrap(async (req, res) => { draft.discard(); res.json({ ok: true, revision: draft.revision }); }));
api.post('/revert', wrap(async (req, res) => { draft.revertOp(req.body.index); res.json({ ok: true, revision: draft.revision }); }));
api.post('/reload', wrap(async (req, res) => {
  const dropped = await draft.reloadBase();
  res.json({ ok: true, dropped, revision: draft.revision });
}));

api.get('/changes', wrap(async (req, res) => {
  const { changes } = draftChanges();
  res.json({
    revision: draft.revision,
    ops: draft.changeList(),
    files: changes.map((c) => {
      const beforeLines = c.before.split('\n');
      const afterLines = c.after.split('\n');
      let adds = 0, dels = 0;
      Diff.diffLines(c.before, c.after).forEach((part) => {
        if (part.added) adds += part.count;
        if (part.removed) dels += part.count;
      });
      return { path: c.path, adds, dels, beforeLines: beforeLines.length, afterLines: afterLines.length, created: c.before === '' };
    }),
  });
}));

api.get('/diff', wrap(async (req, res) => {
  const { changes } = draftChanges();
  const patches = changes.map((c) => ({
    path: c.path,
    patch: Diff.createTwoFilesPatch(`a/${c.path}`, `b/${c.path}`, c.before, c.after, '', '', { context: 3 }),
  }));
  res.json({ revision: draft.revision, patches });
}));

api.get('/validate', wrap(async (req, res) => {
  res.json({ revision: draft.revision, ...validateModel(draft.merged()) });
}));

api.get('/search', wrap(async (req, res) => {
  res.json({ hits: searchContent(draft.merged(), String(req.query.q || '')) });
}));

api.get('/assets', wrap(async (req, res) => {
  res.json({ assets: listAssetsWithUsage(draft.merged()) });
}));

api.post('/assets/upload', wrap(async (req, res) => {
  const { name, dataBase64, overwrite } = req.body;
  res.json(uploadAsset(name, dataBase64, { overwrite: !!overwrite }));
}));

/* Raw-binary upload (videos and large images — avoids base64+JSON bloat). */
api.post('/assets/upload-bin', express.raw({ type: () => true, limit: '210mb' }), wrap(async (req, res) => {
  const name = String(req.query.name || '');
  res.json(uploadAsset(name, Buffer.from(req.body).toString('base64'), { overwrite: req.query.overwrite === '1' }));
}));

api.post('/assets/delete', wrap(async (req, res) => {
  res.json(deleteAsset(draft.merged(), req.body.name));
}));

api.post('/save', wrap(async (req, res) => {
  const result = await runSave(draft);
  changeCache = { revision: -1, changes: [] };
  res.json(result);
}));

api.get('/git/log', wrap(async (req, res) => {
  res.json({ commits: await gitLog(WRITABLE_FILES, 25) });
}));

api.get('/git/show', wrap(async (req, res) => {
  res.json({ patch: await gitShow(String(req.query.hash)) });
}));

api.get('/git/status', wrap(async (req, res) => {
  res.json({ entries: await gitStatus() });
}));

/* ============================================================ Preview server */
/* Mirrors vercel.json's learning.swayform.net behavior: SPA routes serve
 * portal/index.html; static assets come from the repo; the portal data
 * modules are substituted with draft-applied candidates when they differ.
 * A tiny injected script seeds a guest session so preview skips login and
 * flags the page as a Studio preview. */

const PREVIEW_INJECT = `<script>/* injected by SwayForm Studio preview — not part of the real portal */
try {
  window.__STUDIO_PREVIEW__ = true;
  if (!localStorage.getItem('swayform.portal.session')) {
    localStorage.setItem('swayform.portal.session', JSON.stringify({
      mode: 'guest', displayName: 'Studio Preview', startedAt: new Date().toISOString()
    }));
  }
} catch (e) {}
</script>
<script type="module" src="/__studio__/edit-overlay.js"></script>`;

const SPA_ROUTES = [/^\/$/, /^\/login$/, /^\/learn(\/.*)?$/, /^\/project(\/.*)?$/, /^\/account$/, /^\/help(\/.*)?$/, /^\/settings$/];

function buildPreviewApp() {
  const preview = express();
  preview.set('etag', false);
  preview.use((req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
  });

  // Studio's editing overlay — served from studio/, never from the repo's
  // deployable tree. Dormant unless the page is embedded in the Studio UI.
  preview.get('/__studio__/edit-overlay.js', (req, res) => {
    res.type('application/javascript')
      .send(fs.readFileSync(path.join(REPO_ROOT, 'studio', 'preview', 'edit-overlay.js'), 'utf8'));
  });

  // Draft-applied data modules (and any other Studio-writable file).
  preview.get(/^\/(portal\/.*\.js)$/, (req, res, next) => {
    const rel = req.params[0];
    const { changes } = draftChanges();
    const hit = changes.find((c) => c.path === rel);
    if (hit) {
      res.type('application/javascript').send(hit.after);
      return;
    }
    if (rel === 'portal/data/workspace-config.js' && !fs.existsSync(absPath(rel))) {
      // Not on disk yet (pre-Phase-7 repo state) — serve the generated default
      // so preview never 404s if something imports it.
      import('./adapters/workspace-config-writer.mjs').then(({ generateWorkspaceConfig }) => {
        res.type('application/javascript').send(generateWorkspaceConfig(draft.merged().workspaceConfig));
      }).catch(next);
      return;
    }
    next();
  });

  // SPA routes -> portal/index.html with the preview-session script injected.
  preview.get(/.*/, (req, res, next) => {
    const p = req.path;
    if (p.startsWith('/.git') || p.startsWith('/studio')) { res.status(404).end(); return; }
    if (SPA_ROUTES.some((re) => re.test(p))) {
      let html = fs.readFileSync(absPath('portal/index.html'), 'utf8');
      html = html.replace('<script src="/site-data.js"></script>', PREVIEW_INJECT + '\n<script src="/site-data.js"></script>');
      res.type('html').send(html);
      return;
    }
    next();
  });

  preview.use(express.static(REPO_ROOT, { index: false, dotfiles: 'ignore' }));
  return preview;
}

/* ============================================================ boot */
const app = express();
app.use('/api', api);

const { createServer: createViteServer } = await import('vite');
const vite = await createViteServer({
  root: path.join(REPO_ROOT, 'studio', 'web'),
  server: { middlewareMode: true },
  appType: 'spa',
});
app.use(vite.middlewares);

app.listen(STUDIO_PORT, HOST, () => {
  console.log(`\n  SwayForm Learning Portal Studio`);
  console.log(`  Studio UI:       http://${HOST}:${STUDIO_PORT}`);
});

buildPreviewApp().listen(PREVIEW_PORT, HOST, () => {
  console.log(`  Student preview: http://${HOST}:${PREVIEW_PORT}\n`);
});
