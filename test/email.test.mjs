import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sendEmail, emailConfigured, invitationEmail, PORTAL_URL } from '../api/_lib/email.js';

test('without a provider configured, nothing is sent and nothing fails', async () => {
  delete process.env.RESEND_API_KEY;
  assert.equal(emailConfigured(), false);
  assert.deepEqual(await sendEmail({ to: 'a@example.test', subject: 's', text: 't' }), { sent: false, reason: 'not_configured' });
});

test('the invitation email names the school and says how to accept', () => {
  const mail = invitationEmail({ schoolName: 'Miller Grove <High>' });
  assert.match(mail.subject, /Miller Grove <High>/);
  assert.ok(mail.text.includes(PORTAL_URL) && mail.text.includes('Accept'));
  assert.ok(mail.html.includes('Miller Grove &lt;High&gt;') && !mail.html.includes('<High>'));
  assert.ok(!(mail.text + mail.html).includes(String.fromCharCode(0x2014)));
});
