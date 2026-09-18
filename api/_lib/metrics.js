// One log line per polled read, so the production request mix can be seen in
// Vercel logs. Counts and sizes only — never emails, code, or output.
export function logDbRead(fields){
  if (process.env.SWAYFORM_DB_METRICS === 'off') return;
  console.log(JSON.stringify({ evt: 'db_read', ...fields }));
}

export function approxBytes(rows){
  return Buffer.byteLength(JSON.stringify(rows), 'utf8');
}
