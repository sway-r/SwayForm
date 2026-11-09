# SwayForm, onboarding for the labs rewrite

You're reading this because you're helping a collaborator (Greyson) rewrite
the "labs" in the SwayForm Learning Portal. This file is for whoever's
helping him get oriented, read it fully before making changes, then use it
to explain the project to him as he works.

## What SwayForm is

SwayForm is a robotics education platform: a marketing site plus a
"Learning Portal" (`learning.swayform.net`) where students work through
ROS 2 robotics lessons, readings, guided coding labs, and demos, inside a
browser-based mock workspace (file tree, terminal, code editor), with some
lessons dispatching real jobs to a physical robot over a bridge service.
Commercial launch is planned for **Fall 2027**: this is pre-launch,
actively-developed work, not a live product yet.

## What "the labs" actually means

The curriculum lives across two files, deliberately kept separate:

- **`portal/data/learning-path.js`** (~1,700 lines): the actual content
  store: every lesson's steps and blocks (text, code, callouts, images,
  checklists, etc.), keyed by activity id. This is where lab *content*
  lives.
- **`portal/data/curriculum.js`**: the listing/navigation layer on top: it
  groups activities into sections (Getting Started, Intro to ROS 2,
  Pre-Installed Demos, **Foundation Labs** (20 labs, 10 built), and
  **Behavior Sections** (labs 21+, planned)), assigns numbering
  (`4.3`), and pulls each activity's real content *by reference* from
  `learning-path.js` via `pull(id)`. It never retypes lesson content itself.
- **`portal/apps/learn/lesson-renderer.js`**: renders the step/block model
  from `learning-path.js` into what the student actually sees.

So "rewriting the labs" means editing lesson content in
`learning-path.js` (and possibly restructuring how items are grouped in
`curriculum.js`), most likely for the **Foundation Labs** section, the
first 10 guided labs that take a student from ROS 2 basics to a first
joint-to-keyboard teleop capstone.

## Previewing your changes

Run the pages on your own computer before you commit. From the repo root:

```
npx serve .
```

Open the address it prints (usually `http://localhost:3000`) and add the page name: `/home`, `/robot`, `/for-schools`, and so on. Save a file, refresh the browser, and you see the change.

This runs the main website: the `*.html` pages, `styles.css` and `site-data.js` at the root. The Learning Portal (`portal/`) needs the login backend, so it can't be previewed this way; if you change files in `portal/`, say so in your pull request. Don't edit `api/` unless Swayam asks. Don't use `studio/`; it isn't part of this workflow.

## Repo layout (quick map)

| Path | What it is |
|---|---|
| `*.html`, `styles.css` at root | Marketing site (swayform.net) |
| `portal/` | The Learning Portal app, static ES modules, no build step |
| `portal/data/` | Curriculum + lesson content (see above) |
| `portal/apps/learn/` | Lesson rendering, code editor, notebook workspace |
| `api/` | Vercel serverless functions (Node), one file per endpoint |
| `bridge/` | Service that authenticates and relays jobs to the physical robot |
| `studio/` | The local content-editing tool described above, never deployed |
| `test/` | `node --test test/*.test.mjs` |
| `db/schema.sql`, `db/migrations/` | Postgres (Neon) schema |

## Git workflow

- `main` is the live site and is protected. Never commit or push to it.
- Clone once (`git clone https://github.com/sway-r/SwayForm.git`). Never
  clone again; update the copy you have instead.
- Each person has their own branch named after them (for example
  `greyson-labs`). Work and commit only on your own branch, and run
  `git branch --show-current` before every commit to check.
- At the start of every work session: `git checkout <your-branch>`, then
  `git pull origin main` to bring in everyone else's merged changes, then
  start working.
- Commit as you go and push to `origin/<your-branch>` freely. Vercel builds
  a private preview of the branch, and only Swayam can open that link.
- When a piece of work is ready, open a pull request from your branch into
  `main` on GitHub (`github.com/sway-r/SwayForm`). Swayam reviews and merges
  it; you can't merge it yourself.
- Don't run `vercel link`, `vercel env pull` or `vercel dev`, and never
  ask for passwords or secrets. Preview with `npx serve .` instead (see
  Previewing your changes).

## Things to know before touching content

- **Don't rename lesson/section ids**: routes and student progress
  records key on them; the Studio README calls this out explicitly as
  something that needs a deliberate migration, not a casual rename.
- **Pre-Installed Demos → Wave and Handshake are real**, running against
  actual robot source (mirrored from the real `swayform_ws` robot repo),
  don't treat them as mockups.
- **Placeholders are honest**: Rock Paper Scissors, Pick and
  Place, foundation labs 11-20 and the behavior sections are intentionally marked
  `planned`/not-yet-written, not hidden bugs. Leave them as placeholders
  unless you're specifically asked to author that content.
- Student privacy/auth hardening landed recently (session isolation, school
  invitations, scoped bridge auth), if lab content ever touches
  account/progress/robot-dispatch code paths (not just lesson text), be
  extra careful and ask before changing anything under `api/` or `bridge/`.

## If you're Claude reading this to teach Greyson

Walk him through, in order: (1) what SwayForm/the Learning Portal is,
(2) the `learning-path.js` / `curriculum.js` split, (3) launching Studio
and using its live preview to see edits land in real time, (4) the git
workflow above. Point him at `studio/README.md` for the editor's full
feature set once he's oriented. Don't let him hand-edit the data files
directly unless he specifically wants to work outside Studio, the visual
editor exists precisely so lesson authors don't need to touch raw JS/AST
structure.
