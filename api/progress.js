import { readSessionFromRequest } from './_lib/session.js';
import { sql } from './_lib/db.js';
import { privateResponse, requireBrowserMutation, rateLimit } from './_lib/browser-security.js';
import { findActivity } from '../portal/data/learning-path.js';
import { findQuiz } from '../portal/data/quizzes.js';
import { summarizeQuizResults } from './_lib/grades.js';

export default async function handler(req, res){
  privateResponse(res);
  if (req.method === 'POST' && !requireBrowserMutation(req, res)) return;
  const session = await readSessionFromRequest(req);
  if (!session || session.mode === 'guest'){
    res.status(401).json({ error: 'not_authenticated' });
    return;
  }
  const email = session.email;

  if (req.method === 'GET' && req.query && req.query.view === 'grades'){
    const rows = await sql`SELECT quiz_id, percent, passed, finished_at FROM quiz_results WHERE email = ${email} ORDER BY finished_at`;
    res.status(200).json({ quizResults: summarizeQuizResults(rows) });
    return;
  }

  if (req.method === 'GET'){
    const [completedRows, currentRows] = await Promise.all([
      sql`SELECT activity_id FROM progress_completed WHERE email = ${email}`,
      sql`SELECT activity_id, step_index FROM progress_current WHERE email = ${email}`,
    ]);
    res.status(200).json({
      completed: completedRows.map((r) => r.activity_id),
      current: currentRows.length ? { activityId: currentRows[0].activity_id, stepIndex: currentRows[0].step_index } : null,
    });
    return;
  }

  if (req.method !== 'POST'){
    res.status(405).json({ error: 'method_not_allowed' });
    return;
  }

  const body = req.body || {};
  if (!await rateLimit(res, 'progress', email, 120)) return;
  if (['complete', 'incomplete', 'current'].includes(body.action)){
    const entry = typeof body.activityId === 'string' && body.activityId.length <= 120 ? findActivity(body.activityId) : null;
    if (!entry){ res.status(400).json({ error: 'invalid_activity' }); return; }
    if (body.action === 'current' && (!Number.isInteger(body.stepIndex) || body.stepIndex < 0 || body.stepIndex >= entry.activity.steps.length)){
      res.status(400).json({ error: 'invalid_step' }); return;
    }
  }

  switch (body.action){
    case 'quiz_result': {
      // One finished try. The browser grades it, the server checks the shape and works out the score.
      const quiz = typeof body.quizId === 'string' ? findQuiz(body.quizId) : null;
      const { correct, total } = body;
      if (!quiz || total !== quiz.count || !Number.isInteger(correct) || correct < 0 || correct > total){
        res.status(400).json({ error: 'invalid_quiz_result' }); return;
      }
      if (!await rateLimit(res, 'quiz', email, 10)) return;
      const percent = Math.round((correct / total) * 100);
      await sql`
        INSERT INTO quiz_results (email, quiz_id, correct, total, percent, passed)
        VALUES (${email}, ${quiz.id}, ${correct}, ${total}, ${percent}, ${correct * 100 >= quiz.passPercent * total})
      `;
      res.status(200).json({ ok: true, percent });
      return;
    }
    case 'complete': {
      if (!body.activityId){ res.status(400).json({ error: 'missing_activity_id' }); return; }
      // Remember now whether this lab's own file already ran successfully on the robot; the
      // robot_jobs rows that prove it are purged after 90 days (see certificates.js).
      const labFile = findActivity(body.activityId).activity.workspaceFile || '';
      await sql`
        INSERT INTO progress_completed (email, activity_id, robot_verified)
        VALUES (${email}, ${body.activityId}, ${labFile} <> '' AND EXISTS (
          SELECT 1 FROM robot_jobs WHERE student_email = ${email} AND workspace_path = ${labFile} AND status = 'succeeded'))
        ON CONFLICT (email, activity_id) DO UPDATE SET robot_verified = TRUE
          WHERE NOT progress_completed.robot_verified AND EXCLUDED.robot_verified
      `;
      res.status(200).json({ ok: true });
      return;
    }
    case 'incomplete': {
      if (!body.activityId){ res.status(400).json({ error: 'missing_activity_id' }); return; }
      await sql`DELETE FROM progress_completed WHERE email = ${email} AND activity_id = ${body.activityId}`;
      res.status(200).json({ ok: true });
      return;
    }
    case 'current': {
      if (!body.activityId){ res.status(400).json({ error: 'missing_activity_id' }); return; }
      const stepIndex = Number.isInteger(body.stepIndex) ? body.stepIndex : 0;
      await sql`
        INSERT INTO progress_current (email, activity_id, step_index)
        VALUES (${email}, ${body.activityId}, ${stepIndex})
        ON CONFLICT (email) DO UPDATE
          SET activity_id = EXCLUDED.activity_id, step_index = EXCLUDED.step_index, updated_at = now()
      `;
      res.status(200).json({ ok: true });
      return;
    }
    case 'reset': {
      await sql.transaction([
        sql`DELETE FROM progress_completed WHERE email = ${email}`,
        sql`DELETE FROM progress_current WHERE email = ${email}`,
      ]);
      res.status(200).json({ ok: true });
      return;
    }
    default:
      res.status(400).json({ error: 'unknown_action' });
  }
}
