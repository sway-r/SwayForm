import { readSessionFromRequest } from './_lib/session.js';
import { sql } from './_lib/db.js';
import { privateResponse, requireBrowserMutation, rateLimit } from './_lib/browser-security.js';
import { findActivity } from '../portal/data/learning-path.js';

export default async function handler(req, res){
  privateResponse(res);
  if (req.method === 'POST' && !requireBrowserMutation(req, res)) return;
  const session = await readSessionFromRequest(req);
  if (!session || session.mode === 'guest'){
    res.status(401).json({ error: 'not_authenticated' });
    return;
  }
  const email = session.email;

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
    case 'complete': {
      if (!body.activityId){ res.status(400).json({ error: 'missing_activity_id' }); return; }
      await sql`
        INSERT INTO progress_completed (email, activity_id) VALUES (${email}, ${body.activityId})
        ON CONFLICT (email, activity_id) DO NOTHING
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
