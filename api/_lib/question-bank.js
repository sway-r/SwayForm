/* Foundations Assessment question bank: 50 questions in 5 sets of 10.
 * Each entry is [prompt, correct answer, wrong, wrong, wrong]. The correct
 * answer is written first and the order is shuffled per attempt on the server. */

export const QUESTION_BANK = [
  /* ---- set 1 ---- */
  ['In ROS 2, what is a node?', 'A program that does one job and can talk to other nodes', 'A single wire inside the robot', 'A file that stores joint angles', 'A button in the Code Editor'],
  ['How do ROS 2 nodes pass messages to each other without calling each other directly?', 'By publishing and subscribing to topics', 'By editing each other’s files', 'By restarting the robot between messages', 'By typing into each other’s terminals'],
  ['Why do SwayForm labs keep joint angles between a minimum and a maximum?', 'To keep the robot’s joints inside safe limits', 'To make the movement look smoother', 'Because Python cannot use large numbers', 'To make the code run faster'],
  ['In a lab, what does time.sleep(1.0) do?', 'Pauses the program for one second', 'Moves a joint by one degree', 'Turns the robot off for a minute', 'Skips the next line of code'],
  ['What does motion.move_joint("right_elbow", 60) ask the robot to do?', 'Move the right elbow to 60 degrees', 'Wait 60 seconds', 'Move 60 joints at once', 'Open the right hand 60 percent'],
  ['Before running code that moves the robot, what should you always do?', 'Make sure the area around the robot is clear and you know how to stop it', 'Turn the volume up', 'Close the Textbook window', 'Reset your progress'],
  ['What does this loop print?\nfor number in [3, 2, 1]:\n    print(number)', '3, then 2, then 1', '1, then 2, then 3', 'Only 3', 'Nothing, because the list is not a number'],
  ['ELBOW_BEND = 60\nELBOW_START = 0\nmotion.move_joint("right_elbow", ELBOW_BEND)\ntime.sleep(1.5)\nmotion.move_joint("right_elbow", ELBOW_START)\n\nWhere is the right elbow when the code finishes?', 'At 0 degrees', 'At 60 degrees', 'At 1.5 degrees', 'At 30 degrees'],
  ['Where do you write and edit your lab code in the Learning Portal?', 'In the Code Editor window', 'In the Settings window', 'In the Account window', 'In the browser address bar'],
  ['What does a line starting with # do in Python?', 'Python ignores it, so you can leave notes for people', 'It runs the line as a command', 'It makes the line run twice', 'It deletes the line above it'],

  /* ---- set 2 ---- */
  ['What does a ROS 2 publisher do?', 'Sends messages out on a topic', 'Saves your code to the cloud', 'Draws the robot on screen', 'Checks your answers'],
  ['What does a ROS 2 subscriber do?', 'Receives messages from a topic', 'Sends messages to the Code Editor', 'Deletes old topics', 'Turns the robot on'],
  ['A joint’s safe maximum is 45 but your code asks for 90. What should safe code do?', 'Limit the angle to 45 before moving', 'Move to 90 anyway', 'Move to 135 to be sure', 'Ignore the limit when nobody is nearby'],
  ['What does max(min(angle + STEP, MAX), MIN) accomplish?', 'It keeps the new angle between MIN and MAX', 'It always returns STEP', 'It doubles the angle', 'It removes the angle from memory'],
  ['Why is the "return the arm home" step placed in a finally: block?', 'So it still runs if something goes wrong earlier', 'So it runs before everything else', 'So it only runs when the code fails', 'So the robot moves twice as fast'],
  ['How many times does this run?\nfor i in range(3):\n    wave_once()', '3 times', '2 times', '4 times', 'Forever'],
  ['In Python, what is a function defined with def?', 'A named block of code you can run whenever you call it', 'A number that cannot change', 'A comment about the code', 'A copy of the robot’s joints'],
  ['STEP = 10\nangle = 40\nangle += STEP\n\nWhat is angle now?', '50', '40', '10', '400'],
  ['What does if key == "LEFT": do in a keyboard lab?', 'Runs the code under it only when the left arrow is pressed', 'Presses the left arrow for you', 'Renames the key to LEFT', 'Counts how many keys exist'],
  ['Your program stops and prints a traceback. What does that tell you?', 'Python hit a problem, and the last line says what went wrong', 'The robot is broken', 'The program finished perfectly', 'The Code Editor needs to be reinstalled'],

  /* ---- set 3 ---- */
  ['What is [3, 2, 1] in Python?', 'A list, an ordered collection of values', 'A single number', 'A function', 'A comment'],
  ['In HEAD_PITCH = "head_pitch", what do the quotation marks mean?', 'The value is text, not a number or a variable', 'The line is a comment', 'The line is skipped', 'The robot should say it out loud'],
  ['Why put values like CURL_ANGLE = 80 at the top of a lab instead of repeating 80 everywhere?', 'You can change the value in one place and the whole lab updates', 'Python refuses to run numbers inside functions', 'It makes the robot move faster', 'It hides the number from the robot'],
  ['What does motion.set_hand_pose("right_hand", "open") do?', 'Opens the right hand', 'Closes the right hand', 'Waves the right hand', 'Turns off the hand motors forever'],
  ['Why is it smart to try a small angle change first on a new movement?', 'It helps you find problems before the robot makes a big, sudden move', 'Small angles are always faster', 'The robot ignores large angles', 'It saves your code automatically'],
  ['Which shortcut saves the file you are editing in the Code Editor?', 'Ctrl+S', 'Ctrl+Q', 'Ctrl+Z', 'Ctrl+P'],
  ['A program keeps looping and never ends on its own. What do you need?', 'A way to stop it', 'A bigger monitor', 'Nothing, it will stop by itself', 'A new robot'],
  ['Which Python tool repeats something until a condition changes, such as until the q key is pressed?', 'A while loop', 'An import statement', 'A comment', 'A print statement'],
  ['angle = 60\nangle = max(-45, min(45, angle))\n\nWhat is angle after these lines?', '45', '60', '-45', '15'],
  ['In ROS 2, what does a topic carry?', 'Messages of one kind of information', 'Only your password', 'Python files', 'Electricity to the motors'],

  /* ---- set 4 ---- */
  ['def wave(motion):\n    pass\n\nWhat does this function do right now?', 'Nothing yet, pass is a placeholder', 'It waves once', 'It raises an error', 'It waves forever'],
  ['What does random.choice(["rock", "paper", "scissors"]) do?', 'Picks one of the three at random', 'Always returns "rock"', 'Plays all three at once', 'Sorts the list'],
  ['What does print() do in a lab program?', 'Shows text in the output so you can see what the program is doing', 'Prints a page on paper', 'Saves the file', 'Moves a joint'],
  ['What is the "gentle_close" hand pose used for in the handshake labs?', 'Closing the hand softly around another hand', 'Making a tight fist', 'Opening the hand fully', 'Turning the wrist'],
  ['What does motion.move_joint_group("right_arm", {...}) do?', 'Moves several joints of the right arm together', 'Moves only the right finger', 'Deletes the right arm from the program', 'Waits for the right arm to finish'],
  ['Why do labs use hold times like HOLD_SECONDS = 1.5?', 'To give the robot time to finish a move before the next command', 'To slow down your computer', 'To count how many moves you made', 'To lock the file'],
  ['What is debugging?', 'Finding and fixing why your code does not do what you expected', 'Writing code with no mistakes at all', 'Deleting your project', 'Restarting the robot'],
  ['Your code runs but the robot does not move. What is a good first step?', 'Read the output and any error message', 'Delete the file', 'Change every number in the code at once', 'Ignore it and mark the lab complete'],
  ['Why does indentation matter in Python?', 'It shows which lines belong inside a function, loop, or if block', 'It only makes code look nice', 'It changes the color of the text', 'Python ignores it'],
  ['What does elif mean?', 'Another condition that is checked only if the earlier ones were false', 'The end of the program', 'A kind of loop', 'A comment'],

  /* ---- set 5 ---- */
  ['x = 5\nx = x - 2\nprint(x)\n\nWhat prints?', '3', '5', '2', '7'],
  ['What does this print?\nfor n in [1, 2, 3]:\n    print(n * 2)', '2, then 4, then 6', '1, then 2, then 3', '6', '2, then 3, then 4'],
  ['Why do ROS 2 topics have names?', 'So publishers and subscribers can find the same stream of messages', 'So the robot can sing them', 'So the code runs faster', 'So files can be renamed'],
  ['Why do robot programs go through a queue and an approval step before they run?', 'So only one program moves the robot at a time and someone can check it is safe', 'To make the robot slower', 'To save disk space', 'Because the robot can only run code on Fridays'],
  ['What is a variable in Python?', 'A name that holds a value', 'A kind of loop', 'A joint on the robot', 'A button in the editor'],
  ['TORSO_MIN = -45 and TORSO_MAX = 45. Your code asks for a torso angle of 50. What should happen?', 'It should be limited to 45', 'The robot should move to 50 anyway', 'The robot should move to 95', 'The limits should be deleted'],
  ['Why do SwayForm programs end by returning the arm to its home pose?', 'It leaves the robot in a safe, known position', 'It makes the code shorter', 'It saves the file', 'It turns the robot off'],
  ['What does import time do?', 'Makes tools like time.sleep available to your program', 'Shows the clock on the screen', 'Slows the program down', 'Imports your friend’s code'],
  ['Two move commands are written one after the other with no time.sleep between them. What happens?', 'The second command is sent right away, with no pause', 'The robot waits a full minute', 'Only the first command runs', 'The program crashes every time'],
  ['Your code finishes with no errors, but the robot did something different than you wanted. What does that tell you?', 'Running without errors does not prove it does what you meant, so you keep testing and fixing it', 'The robot is broken', 'The code is perfect', 'Errors only appear on the robot'],
];

export const SET_SIZE = 10;
export const SET_COUNT = QUESTION_BANK.length / SET_SIZE;
