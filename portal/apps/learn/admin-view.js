import { getSession } from '../../services/auth-service.js';

let admin = false;
let fullAccess = false;

export function isAdminView(){ return admin; }

// School accounts linked to a robot (Standard School Package) open every section.
export function hasFullAccess(){ return fullAccess; }

export async function loadAdminView(){
  try {
    const s = await getSession();
    admin = !!s && s.mode === 'admin';
    fullAccess = !!s && (s.mode === 'admin' || s.mode === 'student');
  } catch { admin = false; fullAccess = false; }
  return admin;
}
