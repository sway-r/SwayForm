# SwayForm Learning Portal Studio

A **local-only** visual editor for the SwayForm Learning Portal
(`learning.swayform.net`). Studio is a GUI layer over the real repository —
it reads the actual source files students are served, and writes surgical,
validated, Git-committed changes back to them. There is no separate
database, no CMS service, and no duplicated content.

**Never deployed:** `studio/` is excluded from Vercel by `/.vercelignore`,
both servers bind `127.0.0.1` only, and nothing in the production portal
references Studio.

---

## Launching

```
cd studio
npm run studio
```

- **Studio UI** → http://127.0.0.1:4600
- **Student preview** → http://127.0.0.1:4601 — this is the *real* portal,
  served from the repo exactly as `learning.swayform.net` serves it (same
  rewrites), with one difference: any file your unsaved draft modifies is
  substituted in memory. What you see is literally the production code
  running your draft.

`npm test` runs the adapter/validation test suite (safe: candidates are
written to a temp dir, never the repo).

## What each page does

| Page | Edits |
|---|---|
| **Curriculum** | Sections and items in `curriculum.js`: rename/describe/icon, reorder (buttons for sections, drag & drop for items — including across sections), hide (unlist, content preserved — the file's existing pattern), restore, duplicate, permanent delete, **+ New Lesson** wizard, add/remove sections, placeholders |
| **Lesson editor** | Opens from any item. **Notebook**: the lesson *is* the editor — an iframe onto the real portal (real components, CSS, renderer) with an in-page editing overlay, instantly switchable between **Edit** and **Preview**. Click text to edit it in place with a floating format toolbar; hover a block for drag/duplicate/delete; use the gap `+` or the `☰` in the notebook's own top bar to insert (lead/heading/p/list/steps/checklist/callout/divider/terminal/table/terms/troubleshoot/reveal/image/**video**/code); click a block to open a Figma-style right-hand inspector for its structured fields (code language/filename/height/line-numbers/copy button/Open-in-Editor, image width/align/corners/lightbox, video source/ratio/caption, …). Preview Mode strips every Studio affordance — pixel-identical to the student view. **Starter Code**: Monaco on the lesson's workspace file. **Workspace**: starter file, default-open file, per-lesson terminal bounds, read-only files. **Metadata**: title/summary/kind/difficulty/time/concepts, listing form (real/demo), display-title override, completion screen |
| **Workspace Files** | The students' virtual ROS 2 filesystem (`workspace-files.js`): IDE tree, Monaco, add/rename/delete. Renames retarget every lesson and notebook block referencing the file; deletes are refused while referenced |
| **Portal Home** | The post-login desktop: drag icons to reorder, rename, pick icons from the portal set, default window sizes, hide/show icons (hidden apps stay reachable by URL — routes never break) |
| **Assets** | `/images`: upload, replace, reference-guarded delete, per-asset usage (lessons + site files) |
| **Global Settings** | Global terminal bounds (min/default/max, allow-create, name prefix) and global read-only files → `workspace-config.js` |
| **Changes & History** | Unsaved-change list with old → new, revert-one, Advanced (unified git-style diff), validation status, **Save Changes**, and recent commits with patch view |

`Ctrl+K` searches lesson names, notebook text, code, and workspace files.
`Ctrl+Z` / `Ctrl+Shift+Z` undo/redo draft changes.

## How editing works (architecture)

```
studio/server/
  content-load.mjs   READ:  live-imports the real portal modules (always
                     accurate) + parses curriculum.js's AST for source facts
                     (real()/demo()/placeholder() call forms, overrides,
                     number pad styles). Produces the normalized model.
  ops.mjs            Every UI edit is one operation applied to the model.
                     The draft is an op log replayed over base → undo/redo,
                     summaries, crash-safe persistence (.draft.json).
  adapters/*.mjs     WRITE: recast AST reconcilers. Base-vs-final diffs are
                     applied by patching/moving EXISTING nodes (comments
                     travel with them); only genuinely new content gets
                     fresh nodes. A no-op reprint is byte-identical
                     (tested). workspace-config.js is the one generated,
                     Studio-owned file.
  validate.mjs       SwayForm structural checks (unique ids, references,
                     numbering, block schemas, terminal bounds, images).
  save.mjs           The Save pipeline (below).

studio/preview/
  edit-overlay.js    Injected into the preview server's HTML only (never
                     the deployable portal). Dormant until the Studio UI
                     posts studio:init — decorates the REAL rendered
                     notebook DOM with hover/click/drag affordances and
                     posts studio:op / studio:insert / studio:selected
                     back to the parent. It never writes source itself;
                     every change still goes through sendOp -> draft ->
                     adapters, same as every other Studio view.
```

The Notebook tab (`studio/web/src/views/LiveNotebook.jsx`) is a thin
postMessage bridge over that overlay: it forwards ops to the same draft
API everything else uses, pushes the fresh draft-merged activity back into
the iframe after each change, and renders a narrow inspector panel
(reusing the same `BlockForm` component the old block-list editor used)
when a block is selected. Preview Mode just flips `editMode:false`, which
the overlay uses to hide every one of its own DOM nodes — the rendered
page is then byte-for-byte what `renderBlocks()` produces for a student.

The content model mirrors the real architecture: `curriculum.js` is a
listing layer over `learning-path.js`'s content store, and Studio keeps
them separate the same way. "Hide lesson" removes only the listing —
identical to the hand-authored pattern already documented inside
`curriculum.js`.

## Save Changes

Nothing touches the repo until you press **Save Changes**. Then:

1. **Stale check** — every tracked file's hash must match what Studio
   loaded (edits made outside Studio block the save until you reload).
2. **Generate** — draft → candidate sources via the AST reconcilers; every
   candidate must parse.
3. **Curriculum validation** — the structural checks above; errors block.
4. **Automated review** — heuristics over the diffs (unexpected large
   deletions, serialization artifacts).
5. **Write** — candidates written; originals snapshotted for rollback.
6. **Reload & verify** — the written files are re-imported and the result
   must deep-equal the draft (a failed round-trip rolls everything back).
7. **Commit** — `git add`/`commit` scoped to exactly the written paths, so
   unrelated working-tree changes are never swept in. **No push** — push
   manually when ready.

Any failure before step 7 restores every file and reports what failed,
why, and where. Failure UIs offer "Return to editing" — the draft is kept.

## Student terminal system (product behavior)

`workspace-config.js` (Studio-managed) drives the live portal:

- Workspaces open with **3** terminals; students can open up to **5** and
  can never close the last **1** (all three per-lesson configurable).
- Tabs rename on double-click; each tab is an independent mock-shell
  session (own cwd/history/scrollback).
- Files listed as read-only open locked in the student Code Editor.

## Limitations / future work

- **No renaming of lesson/section IDs** — routes and progress records key
  on them; changing them is a migration, done deliberately in code.
- **New desktop apps** are code, not content — Studio edits the five
  existing apps' presentation, not app creation.
- **Block types are the renderer's real set** — Studio deliberately cannot
  invent block types the portal can't render; the video block was added to
  BOTH `lesson-renderer.js` and Studio together for exactly this reason.
- **"Claude review" step** is implemented as deterministic heuristics; an
  LLM review pass would need an API key and is intentionally out of scope.
- **reference.js (Help app)** and login-page copy are not yet exposed;
  the adapter pattern extends naturally when needed.
- Curriculum ops assume the current two-file architecture; if that is ever
  restructured, `content-load.mjs` + the writers are the only places that
  know the source shapes.

## Security posture

- Both servers bind `127.0.0.1` explicitly; no external exposure.
- All writes go through a hard **allowlist** of ten content files
  (`repo.mjs WRITABLE_FILES`) — adapters cannot write anywhere else.
- IDs are validated as kebab-case slugs; workspace paths must match
  `ros2_ws/...` with no traversal; asset uploads are basename-validated
  image files capped at 20 MB.
- Git runs via `execFile` argument arrays (no shell interpolation), always
  pathspec-scoped.
- Curriculum text is data end-to-end; nothing a lesson contains is ever
  executed by Studio or the portal build.
