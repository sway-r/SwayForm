# SwayForm — onboarding for the labs rewrite

You're reading this because you're helping a collaborator (Greyson) rewrite
the "labs" in the SwayForm Learning Portal. This file is for whoever's
helping him get oriented — read it fully before making changes, then use it
to explain the project to him as he works.

## What SwayForm is

SwayForm is a robotics education platform: a marketing site plus a
"Learning Portal" (`learning.swayform.net`) where students work through
ROS 2 robotics lessons — readings, guided coding labs, and demos — inside a
browser-based mock workspace (file tree, terminal, code editor), with some
lessons dispatching real jobs to a physical robot over a bridge service.
Commercial launch is planned for **Fall 2027** — this is pre-launch,
actively-developed work, not a live product yet.

## What "the labs" actually means

The curriculum lives across two files, deliberately kept separate:

- **`portal/data/learning-path.js`** (~1,700 lines) — the actual content
  store: every lesson's steps and blocks (text, code, callouts, images,
  checklists, etc.), keyed by activity id. This is where lab *content*
  lives.
- **`portal/data/curriculum.js`** — the listing/navigation layer on top: it
  groups activities into sections (Getting Started, Intro to ROS 2,
  Pre-Installed Demos, **Control — Level 1 with 10 guided labs**, and three
  planned-but-unwritten levels: React/Perceive/Create), assigns numbering
  (`4.3`), and pulls each activity's real content *by reference* from
  `learning-path.js` via `pull(id)`. It never retypes lesson content itself.
- **`portal/apps/learn/lesson-renderer.js`** — renders the step/block model
  from `learning-path.js` into what the student actually sees.

So "rewriting the labs" means editing lesson content in
`learning-path.js` (and possibly restructuring how items are grouped in
`curriculum.js`), most likely for the **Control (Level 1)** section — the
10 guided labs that take a student from ROS 2 basics to a first
joint-to-keyboard teleop capstone.

## The tool for this: Studio

Don't hand-edit `learning-path.js`/`curriculum.js` as raw JS by default —
there's a purpose-built local visual editor for exactly this:

```
cd studio
npm run studio
```

- Studio UI → `http://127.0.0.1:4600`
- Live student preview → `http://127.0.0.1:4601` (the *real* portal code,
  with unsaved draft edits substituted in memory — what you see there is
  literally production code rendering the draft)

Full docs: [studio/README.md](studio/README.md) — read this before editing
labs. Key things it explains: the Curriculum page (reorder/hide/add
sections and items), the Notebook lesson editor (click-to-edit blocks,
inspector panel, live preview), Workspace Files (the student's virtual ROS 2
filesystem), and the Save pipeline (validates, writes, commits locally —
**never pushes automatically**; push manually when ready).

Studio is local-only — never deployed, binds `127.0.0.1` only, writes are
allowlisted to ten known content files. It's safe to experiment in.

## Running things locally

There's no bundler/build step — the portal is plain ES modules served
directly. To run the full app (portal + API) against the real backend:

```
vercel link
vercel env pull .env.local
vercel dev
```

You'll need to be invited to the Vercel project for `vercel link` to work —
ask Swayam. `.env.local` is gitignored; never commit it.

If you only need to edit lesson content, you mostly just need `studio/`
running (`npm run studio`) — it doesn't require the Vercel backend.

## Repo layout (quick map)

| Path | What it is |
|---|---|
| `*.html`, `styles.css` at root | Marketing site (swayform.net) |
| `portal/` | The Learning Portal app — static ES modules, no build step |
| `portal/data/` | Curriculum + lesson content (see above) |
| `portal/apps/learn/` | Lesson rendering, code editor, notebook workspace |
| `api/` | Vercel serverless functions (Node) — one file per endpoint |
| `bridge/` | Service that authenticates and relays jobs to the physical robot |
| `studio/` | The local content-editing tool described above — never deployed |
| `test/` | `node --test test/*.test.mjs` |
| `db/schema.sql`, `db/migrations/` | Postgres (Neon) schema |

## Git workflow

- Work happens on the **`greyson-labs`** branch (already created and pushed
  from `main`) — not directly on `main`.
- Commit as you go; push to `origin/greyson-labs` freely.
- When a batch of lab rewrites is ready for review, open a pull request
  from `greyson-labs` into `main` on GitHub
  (`github.com/sway-r/SwayForm`) rather than merging it yourself.
- If Studio's Save pipeline creates commits locally (it does, as part of
  Save Changes), those still just land on whatever branch is checked out —
  confirm you're on `greyson-labs` before saving.

## Things to know before touching content

- **Don't rename lesson/section ids** — routes and student progress
  records key on them; the Studio README calls this out explicitly as
  something that needs a deliberate migration, not a casual rename.
- **Pre-Installed Demos → Wave and Handshake are real**, running against
  actual robot source (mirrored from the real `swayform_ws` robot repo) —
  don't treat them as mockups.
- **Placeholders are honest** — Hand Mimic, Rock Paper Scissors, Pick and
  Place, and all of React/Perceive/Create levels are intentionally marked
  `planned`/not-yet-written, not hidden bugs. Leave them as placeholders
  unless you're specifically asked to author that content.
- Student privacy/auth hardening landed recently (session isolation, school
  invitations, scoped bridge auth) — if lab content ever touches
  account/progress/robot-dispatch code paths (not just lesson text), be
  extra careful and ask before changing anything under `api/` or `bridge/`.

## If you're Claude reading this to teach Greyson

Walk him through, in order: (1) what SwayForm/the Learning Portal is,
(2) the `learning-path.js` / `curriculum.js` split, (3) launching Studio
and using its live preview to see edits land in real time, (4) the git
workflow above. Point him at `studio/README.md` for the editor's full
feature set once he's oriented. Don't let him hand-edit the data files
directly unless he specifically wants to work outside Studio — the visual
editor exists precisely so lesson authors don't need to touch raw JS/AST
structure.
