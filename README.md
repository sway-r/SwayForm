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
  Pre-Installed Demos, **Foundation Labs** (20 labs, 10 built),
  **Wave** (behavior section 1, 12 labs), and **More Sections** (planned)),
  assigns numbering
  (`4.3`), and pulls each activity's real content *by reference* from
  `learning-path.js` via `pull(id)`. It never retypes lesson content itself.
- **`portal/apps/learn/lesson-renderer.js`**: renders the step/block model
  from `learning-path.js` into what the student actually sees.

So "rewriting the labs" means editing lesson content in
`learning-path.js` (and possibly restructuring how items are grouped in
`curriculum.js`), most likely for the **Foundation Labs** section, the
first 10 guided labs that take a student from ROS 2 basics to a first
joint-to-keyboard teleop capstone.

## The Wave section

Behavior section 1 is section 5 in `curriculum.js`: 12 labs, all written in
one file, **`portal/data/wave-section.js`**, in lab order. It is a first draft
for the lab team to expand and sharpen.

| Lab | Format |
|---|---|
| 1 | Intro, no code |
| 2, 4, 5, 7, 9, 10 | Code labs that each fill one marked gap in a shared file |
| 3, 8, 11 | Multiple-choice checks |
| 6 | Quiz, 80% to pass |
| 12 | Robot run: needs the lab 6 quiz, a finished program, and admin approval |

**The 70/30 idea.** Students write about 30% of one program. The starter
`wave_builder.py` (in `portal/data/workspace-files.js`) opens with about 70%
written and a one-line `# TODO lab N` note at each gap. Check counts the notes
left, and Run says everything is set once none remain. If you change the
starter or what a lab asks for, update `FILLS` in `test/wave-section.test.mjs`.
That test pins the TODO counts the lessons promise and the 25 to 35% share.

**Question blocks** work in any lab (see `portal/apps/learn/interactive-blocks.js`):

- `{ type: 'mcq', question, options: [...], answer: 0, explain }`
- `{ type: 'match', prompt, pairs: [[left, right], ...] }` (right-hand texts must be unique)
- `{ type: 'quiz', id, title, passPercent: 80, questions: [{ question, options, answer, explain }] }`

Options are shuffled on screen, so the right answer can be first in the list.
A lab can't be marked complete until every question in it is solved; add
`required: false` to a block to exempt it. `lab.robotGate` (see lab 12) holds
Queue on Robot back until named labs are complete and named files have no TODO.

**Lab 12 sends the real `wave.py` to the robot**, not the student's file. Robot
files are hash-pinned on the Pi, so running a student-built file needs Pi-side
work first. Ask Swayam before changing anything about how that run works.

## Previewing your changes

Run the pages on your own computer before you commit. Save a file, refresh the browser, and you see the change.

**Learning Portal (labs, anything in `portal/`):** in the repo folder run `node preview-portal.mjs`, then open `http://localhost:3000/learn`. You are signed in as a guest, so there is no login and no backend. Stop it with Ctrl+C. Anything that needs the real backend (login, saved progress, the robot) won't work here.

**Main website (the `*.html` pages at the root):** run `npx serve .` and open a page such as `http://localhost:3000/home`.

If you change files in `portal/`, say so in your pull request. Don't edit `api/` unless Swayam asks.

## Repo layout (quick map)

| Path | What it is |
|---|---|
| `*.html`, `styles.css` at root | Marketing site (swayform.net) |
| `portal/` | The Learning Portal app, static ES modules, no build step |
| `portal/data/` | Curriculum + lesson content (see above) |
| `portal/apps/learn/` | Lesson rendering, code editor, notebook workspace |
| `preview-portal.mjs` | Runs the Learning Portal locally for previewing, not deployed |
| `api/` | Vercel serverless functions (Node), one file per endpoint |
| `bridge/` | Service that authenticates and relays jobs to the physical robot |
| `test/` | `node --test test/*.test.mjs` |
| `db/schema.sql`, `db/migrations/` | Postgres (Neon) schema |

## Git workflow

- `main` is the live site and is protected. Never commit or push to it.
- Clone once (`git clone https://github.com/sway-r/SwayForm.git`). Never
  clone again; update the copy you have instead.
- Each person has their own branch named after them (for example
  `greyson-labs`). Work and commit only on your own branch.
- At the start of every work session: `git checkout <your-branch>`, then
  `git pull origin main` to bring in everyone else's merged changes, then
  start working.
- Commit as you go and push to `origin/<your-branch>` freely. Vercel builds
  a private preview of the branch, and only Swayam can open that link.
- When a piece of work is ready, open a pull request from your branch into
  `main` on GitHub (`github.com/sway-r/SwayForm`). Swayam reviews and merges
  it; you can't merge it yourself.
- Don't run `vercel link`, `vercel env pull` or `vercel dev`, and never
  ask for passwords or secrets. Preview locally instead (see Previewing
  your changes).

## Things to know before touching content

- **Don't rename lesson/section ids**: routes and student progress
  records key on them; renaming one needs a deliberate migration, not a
  casual rename.
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

## If you're Claude reading this to teach a helper

Walk them through, in order: (1) what SwayForm and the Learning Portal are,
(2) the `learning-path.js` / `curriculum.js` split, (3) how to preview
pages locally with `npx serve .`, (4) the git workflow above.
