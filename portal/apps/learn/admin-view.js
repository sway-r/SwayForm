import { getSession } from '../../services/auth-service.js';

let admin = false;

export function isAdminView(){ return admin; }

export async function loadAdminView(){
  try { const s = await getSession(); admin = !!s && s.mode === 'admin'; }
  catch { admin = false; }
  return admin;
}
