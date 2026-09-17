/**
 * One structured line per recurring (polled) database read, so the real
 * production request mix and payload sizes can be read straight out of the
 * Vercel logs: filter on `"evt":"db_read"`, group by `view`.
 *
 * `dbBytes` approximates what Neon sent back (the JSON size of the rows).
 * Callers pass counts and sizes only — never emails, code, or job output.
 */
export function logDbRead(fields){
  if (process.env.SWAYFORM_DB_METRICS === 'off') return;
  console.log(JSON.stringify({ evt: 'db_read', ...fields }));
}

export function approxBytes(rows){
  return Buffer.byteLength(JSON.stringify(rows), 'utf8');
}
