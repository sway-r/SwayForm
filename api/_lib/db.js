import { neon } from '@neondatabase/serverless';

const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;
if (!connectionString) throw new Error('DATABASE_URL (or POSTGRES_URL) is not set');

export const sql = neon(connectionString);

/**
 * Looks up who an email belongs to: an admin (checked first) or an active
 * student. Returns undefined if the email isn't authorized for anything.
 */
export async function findRoleForEmail(email){
  const normalized = email.trim().toLowerCase();

  const admin = await sql`
    SELECT r.id AS robot_id, r.serial_number AS robot_serial
    FROM admin_emails ae
    JOIN admin_accounts aa ON aa.id = ae.admin_account_id
    JOIN robots r ON r.id = aa.robot_id
    WHERE ae.email = ${normalized}
  `;
  if (admin.length){
    const row = admin[0];
    return { role: 'admin', robotId: row.robot_id, robotSerial: row.robot_serial };
  }

  const student = await sql`
    SELECT r.id AS robot_id, r.serial_number AS robot_serial
    FROM students s
    JOIN robots r ON r.id = s.robot_id
    WHERE s.email = ${normalized} AND s.status = 'active'
  `;
  if (student.length){
    const row = student[0];
    return { role: 'student', robotId: row.robot_id, robotSerial: row.robot_serial };
  }

  return undefined;
}
