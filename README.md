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
  **Wave** (behavior section 1, 6 labs), and **More Sections** (planned)),
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

Behavior section 1 is group 5 of Behavior Sections (labs 5.01 to 5.06) in `curriculum.js`: 6 labs, all written in
one file, **`portal/data/wave-section.js`**, in lab order. It is a first draft
for the lab team to expand and sharpen.

| Lab | Format |
|---|---|
| 1 | Intro, no code |
| 2 | Imports and settings, code plus multiple-choice checks |
| 3 | Functions, code, then the quiz (80% to pass) |
| 4 | Loops, code, bug hunts and multiple-choice checks |
| 5 | Order and cleanup, code that finishes the program, bug hunts and multiple-choice checks |
| 6 | A short review, the final quiz, then the robot run: needs both quizzes, a finished program, and admin approval |

Labs 2 to 5 each fill marked gaps in one shared file.

**How lab text is written.** Every lab, in Wave and after it, follows the same
pattern and voice: a friendly instructor talking the student through it, step
by step.

- Open with a **Summary** step (`id: 'summary'`, shown without a number; the
  `summary()` helper in `wave-section.js` builds it): "Estimated time to
  completion: 20 minutes", then "In this lab, you are going to learn about..."
  and a short list of what they will do.
- Then numbered sections, one idea each. The textbook numbers them from the lab
  number (lab 5.04 gives 5.4.1, 5.4.2, ...).
- In each section: explain the idea in plain words ("In simple terms, ..."),
  with an everyday comparison if it helps, show a short example ("Have a look:"),
  then have the student do it ("Let's fix that.", "Now, it's your turn.").
- Caption every code block with what it is for: `Example`, `Write in wave_builder.py`,
  `Find this in wave_builder.py`, or `Edit in wave.py`.
- After every action (Check, Run, Queue on Robot), show the result: "You should
  get something similar to this:", then a `terminal` block with `label: 'Output'`
  holding what the screen really prints, then "As you can see, ..." to explain it.
- Ask before you tell: "So, what do you think would happen if ...? Let's find
  out!" Bug hunts (a `troubleshoot` block) work this way.
- Short, warm sentences: "Let's", "Have a look", "Pretty useful, right?", "But
  there's more!". Keep exclamation marks to one or two per section. No em dashes
  and no AI-sounding words.
- Keep the page plain: prose and code first. A table only for a real comparison,
  a callout only for safety or the Reset tip.

**The 70/30 idea.** Students write about 30% of one program. The starter
`wave_builder.py` (in `portal/data/workspace-files.js`) opens with about 70%
written and a one-line `# TODO lab N` note at each gap. Check shows a progress bar of
the notes done (for example, 1 of 7 pieces done), and Run says everything is set once none remain. If you change the
starter or what a lab asks for, update `FILLS` in `test/wave-section.test.mjs`.
That test pins the TODO counts the lessons promise and the 25 to 35% share.

**Question blocks** work in any lab (see `portal/apps/learn/interactive-blocks.js`):

- `{ type: 'mcq', question, options: [...], answer: 0, explain }`
- `{ type: 'match', prompt, pairs: [[left, right], ...], distractors: [...] }` (right-hand texts must be unique; optional `distractors` are extra wrong answers, so the last pair can't be guessed by elimination)
- `{ type: 'quiz', id, title, prepare, passPercent: 80, count: 10, questions: [{ question, options, answer, explain, review: { id, label } }] }`

In the lab, a quiz only shows what to prepare (`prepare`, plus the rules) and a
**Start quiz** button, which asks "Have you prepared?" before it starts. The quiz
then fills the whole screen with nothing but the questions and their choices.
A student can't leave it until they submit: the rest of the portal is locked,
and leaving the page anyway still counts as a try. Every try draws `count`
questions at random from the bank in a new order, with the choices shuffled,
so keep the bank bigger than `count`. Quiz questions are multiple choice only.
After a try the student waits 15 minutes (`QUIZ_WAIT_MINUTES` in
`portal/services/quiz-passes.js`) before the next one; the results page marks
what they missed, with `explain` and a link to the `review` lab. A pass is
remembered, so the quiz stays passed after a reload. Passes and tries are kept
in that browser for that account, like code drafts. Admins never wait, see the
answers, and can close the quiz without submitting. Options are shuffled on
screen, so the right answer can be first in the list.
A lab can't be marked complete until every question in it is solved; add
`required: false` to a block to exempt it.

**Locks are off until launch.** `LABS_LOCKED` in `curriculum.js` is `false`,
so every lab and every step is open to everyone. Setting it to `true` brings
back two locks. First, until a lab's first required question is solved, the
steps after it are blurred and can't be used. Second, a section with
`sequential: true` (Wave and More Sections; Foundation Labs stay open) opens its
labs one at a time: a lab stays locked until every lab before it is complete,
and the lab's Next button opens once the lab itself is complete. Admins
(teachers) skip every lock and see every answer, with each `reveal` block's hint and
solution already open. Students must press Show Hint before a `reveal` block's
Show Solution button works. `lab.robotGate` (see lab 6) holds
Queue on Robot back until named labs are complete (`needsComplete`), named
quizzes are passed (`needsQuiz`), and named files have no TODO (`needsNoTodos`).
Lab 6 has a final quiz (10 questions per try from a bank of 25) that unlocks
the robot run.

**Lab 6 sends the real `wave.py` to the robot**, not the student's file. Robot
files are hash-pinned on the Pi, so running a student-built file needs Pi-side
work first. Ask Swayam before changing anything about how that run works.

## Section 2: Greeting Gestures

Behavior section 2 is group 6 of Behavior Sections (labs 6.01 to 6.12) in `curriculum.js`: 12 labs, all in
**`portal/data/handshake-section.js`**. The idea of the whole section: one
movement structure (get into a pose, do the finishing move, come back home),
three behaviors. It is a working first draft, written in the same voice and
format as Wave, for the lab team to expand.

| Labs | Behavior | What they cover | Practice file |
|---|---|---|---|
| 1 to 5 | Handshake | 1 reviews Wave and warms up; 2 joint control; 3 movement sequencing; 4 coordination; 5 review, five-question quiz, robot run | `handshake_builder.py`, 7 TODOs |
| 6 to 10 | Fist Bump | 6 reuses the handshake structure; 7 joint positions; 8 timing; 9 the finishing move (and `if`); 10 review, five-question quiz, robot run | `fist_bump_builder.py`, 6 TODOs |
| 11 and 12 | Beckon | 11 video, requirements, starter code, planning; 12 the challenge, written on their own, then the robot run | `beckon_builder.py`, 4 TODOs |

The practice files live in `portal/data/workspace-files.js`. The students
write about 30% of the handshake and the fist bump, and more of the beckon.
If you change a practice file or what a lab asks for, update `FILLS` in
`test/handshake-section.test.mjs`: it pins the TODO counts the Check outputs
promise, the 25 to 35% share, and every line a lesson points at.

Keep the beckon true to the real robot: the shoulder swings forward, the
wrist turns palm up, and the four fingers curl in and out 3 times. **The elbow
and the thumb do not move**, and the lessons say so.

Still to do:

- **Lab 11's video.** The `video` block has no `src` yet. Add the beckon
  clip to `videos/` and set `src` (and a `poster`) on that block.
- Anything deeper: more bug hunts, more questions, a bigger quiz bank.

The three robot runs send the real files: lab 5 changes `SHAKE_CYCLES` in
`handshake.py` from 1 to 3, lab 10 switches `ENABLE_HEAD_NOD` in
`fist_bump.py` to `True`, and lab 12 changes `BECKON_CYCLES` in `beckon.py`
from 1 to 3. Ask Swayam before changing how any of them work.

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
