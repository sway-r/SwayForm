import { readSessionFromRequest } from './_lib/session.js';
import { sql } from './_lib/db.js';

export default async function handler(req, res){
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
      await Promise.all([
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
