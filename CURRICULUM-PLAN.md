# Curriculum Plan (draft)

**Status:** draft, still being planned (started 2026-11-14). Expect changes.

## The idea

Every section is built around one robot behavior. Python topics are taught inside the behavior that needs them, with plenty of explanation.

- **Round 1:** 10 behaviors. Students write about 30% of each program, like the Wave section does now.
- **Round 2:** after finishing all of Round 1, students come back to the same 10 behaviors and write about 60%.
- **Block 3:** 10 more sections, each a new behavior. More behaviors come after that.

That makes 30 sections to start.

## Rule for Round 2

Each behavior gets an upgrade in Round 2, so the robot does something new and the extra code uses new topics. Round 2 should never be the Round 1 file with more blanks.

Example: in Round 1, Wave waves N times. In Round 2, it waves with either arm at any speed.

## Rounds 1 and 2

| # | Behavior | Round 1 (about 30%) | Round 2 (about 60%) |
|---|---|---|---|
| 1 | Wave | wave N times: imports, constants, functions, for loops, try/finally (built) | any arm, any speed: parameters, default values, keyword arguments, return values |
| 2 | Yes and No (head) | nod and shake on command: calling functions with inputs, timing | Magic 8-Ball: lists, random, if/elif/else |
| 3 | Handshake | reach, grip, shake, release in order: sequences, constants | gentle or firm grip: arithmetic on angles, int vs float, a clamp function that returns a value |
| 4 | Fist Bump | optional head nod: booleans, if | three bump styles: if/elif/else, comparisons, and/or/not |
| 5 | Finger Count | show a number: lists, indexing | count up and down, reject bad numbers: slicing, None, while, input checks |
| 6 | Finger Wave | one finger at a time: loop over a list, staggered sleep | smooth ripple: enumerate, math.sin, radians, floats |
| 7 | Rock Paper Scissors | one round: random.choice, if/elif | best of five: while, keeping score, rules as a dict, f-strings |
| 8 | Dance Routine | chain given moves: functions calling functions | dance from data: a list of (pose, beats) tuples, nested loops, tempo |
| 9 | Keyboard Drive | drive the head: event loop, if/elif, clamp | drive everything: dict dispatch (key to function), state and scope |
| 10 | Target Lock | put the five steps in order: program flow | write the checks: functions returning True/False, early return, all(), any() |

## Ideas for Block 3 (not picked yet)

| Behavior | Topics it would teach |
|---|---|
| Morse Code with head nods | strings, dict lookup |
| Finger Binary (0 to 31 on five fingers) | number systems, %, //, bin() |
| Simon Says | lists, append, comparing lists |
| Mirror Me | comprehensions, zip |
| Traffic Light | state machines |
| Gesture Class | classes, attributes, methods |
| Limit Guard | raise, try/except, reading tracebacks |
| Record and Replay | building lists while running, JSON |
| Smooth Reach | interpolation, easing, the time module |
| Track It (simulated camera) | moving average, mapping ranges, feedback loops |
| Reach | trigonometry for a two-joint arm |
| Test Your Moves | assert on recorded robot calls |

## How each lab teaches

Every concept lab follows the same six beats:

1. The idea in plain words, with an everyday comparison.
2. Where it shows up in this behavior, explained line by line.
3. Predict what the robot will do.
4. Change it, run it, and watch.
5. Common mistakes, with the real error message and the fix.
6. Two or three check questions.

Each lab also gets one "Why robots need this" callout. All of the block types for this already exist; see "Question blocks" in README.md.

## Good to know when writing labs

- Run in the editor does not execute Python yet. It only checks whether any `# TODO` is left (`portal/apps/learn/workspace/mock-shell.js`). Round 2 needs a Run that actually runs the student's code, because at 60% there are many right answers.
- Only five behaviors can run on the real robot today: Wave, Handshake, Fist Bump, Finger Count and Target Lock, each with one allowed change. The other five run in the editor only for now.
- If you change a starter file's TODOs, update its share test the way Wave does (`FILLS` in `test/wave-section.test.mjs`).

## Still open

1. Which 10 behaviors make up Block 3, and how much of the code students write there.
2. What the robot runs in Round 2.
3. When Run in the editor gets real Python.
4. How many labs each section has in each round.
5. The order in which the other five behaviors get real-robot support.
