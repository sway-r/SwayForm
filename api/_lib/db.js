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

export async function findProfileForEmail(email){
  const normalized = email.trim().toLowerCase();
  const rows = await sql`SELECT display_name, school_name, created_at FROM user_profiles WHERE email = ${normalized}`;
  return rows.length ? rows[0] : undefined;
}

export async function upsertProfile(email, { displayName, schoolName }){
  const normalized = email.trim().toLowerCase();
  const rows = await sql`
    INSERT INTO user_profiles (email, display_name, school_name)
    VALUES (${normalized}, ${displayName}, ${schoolName})
    ON CONFLICT (email) DO UPDATE
      SET display_name = EXCLUDED.display_name,
          school_name = EXCLUDED.school_name,
          updated_at = now()
    RETURNING display_name, school_name, created_at
  `;
  return rows[0];
}

export async function listSchoolNames(){
  const rows = await sql`
    SELECT DISTINCT school_name FROM robots
    WHERE school_name IS NOT NULL AND school_name <> ''
    ORDER BY school_name
  `;
  return rows.map((r) => r.school_name);
}

/**
 * Merges the mutable, user-editable profile (name/school, if onboarding is
 * done) into an otherwise-static session object from the signed cookie —
 * looked up fresh on every call so a saved profile shows up immediately,
 * with no need to re-sign the cookie.
 */
export async function enrichSessionWithProfile(session){
  if (!session || session.mode === 'guest') return session;

  const profile = await findProfileForEmail(session.email);
  return {
    ...session,
    hasProfile: !!profile,
    displayName: profile ? profile.display_name : session.name,
    schoolName: profile ? profile.school_name : null,
    profileCreatedAt: profile ? profile.created_at : null,
  };
}
