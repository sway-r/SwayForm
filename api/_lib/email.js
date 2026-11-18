// Sends mail through Resend's HTTP API once RESEND_API_KEY and EMAIL_FROM are set; until then it sends nothing.

export const PORTAL_URL = 'https://learning.swayform.net';

export function emailConfigured(){
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
}

export async function sendEmail({ to, subject, text, html }){
  if (!emailConfigured()) return { sent: false, reason: 'not_configured' };
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: process.env.EMAIL_FROM, to: [to], subject, text, html }),
      signal: AbortSignal.timeout(8000),
    });
    return res.ok ? { sent: true } : { sent: false, reason: `status_${res.status}` };
  } catch {
    return { sent: false, reason: 'unreachable' };
  }
}

const escape = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

export function invitationEmail({ schoolName }){
  const school = schoolName || 'your school';
  const subject = `You're invited to ${school}'s SwayForm class`;
  const steps = [
    `Open ${PORTAL_URL}`,
    'Sign in with Google, using this email address.',
    'Open Account and click Accept under School invitations.',
  ];
  const text = `Hi,\n\nYour teacher at ${school} invited you to the SwayForm Learning Portal, where you will learn to program a real robot.\n\n${steps.map((s, i) => `${i + 1}. ${s}`).join('\n')}\n\nThe invitation expires in 14 days. If you weren't expecting it, you can ignore this email.\n\nSwayForm`;
  const html = `<p>Hi,</p><p>Your teacher at ${escape(school)} invited you to the SwayForm Learning Portal, where you will learn to program a real robot.</p><ol><li>Open <a href="${PORTAL_URL}">${PORTAL_URL.replace('https://', '')}</a></li><li>${steps[1]}</li><li>${steps[2]}</li></ol><p>The invitation expires in 14 days. If you weren't expecting it, you can ignore this email.</p><p>SwayForm</p>`;
  return { subject, text, html };
}
