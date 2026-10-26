/* Certificate rules: which labs are required, what counts as having done a
 * lab, and how the assessment is built and graded. Everything here runs on
 * the server; correct answers never leave it. The assessment itself is
 * stateless: progress travels in a signed token, so answering a question
 * costs no database queries. */
import { randomInt, randomBytes, createHmac, timingSafeEqual } from 'node:crypto';
import { CURRICULUM } from '../../portal/data/curriculum.js';
import { QUESTION_BANK, SET_SIZE, SET_COUNT } from './question-bank.js';

export const CERTIFICATES = {
  foundation: {
    key: 'foundation',
    code: 'FL',
    sectionId: 'foundation',
    program: 'Foundations of Humanoid Robotics',
  },
};

export const QUESTION_COUNT = SET_SIZE;
export const PASS_MARK = 8;
export const SECONDS_PER_QUESTION = 45;
export const GRACE_SECONDS = 3;
export const RETRY_WAIT_MINUTES = 60;
export const MAX_ATTEMPT_MINUTES = 20;

/** Every lab in the certificate's section. Placeholders can never be finished, so they keep it locked. */
export function requiredLabs(key){
  const cert = CERTIFICATES[key];
  const section = cert && CURRICULUM.sections.find((s) => s.id === cert.sectionId);
  if (!section) return [];
  return section.items.map((item) => ({
    id: item.id,
    number: item.number,
    title: item.title,
    workspaceFile: item.workspaceFile || null,
    placeholder: item.kind === 'placeholder',
  }));
}

/**
 * A lab counts only if it was marked complete AND its own file ran
 * successfully on the robot. `completed` maps activity id to whether the
 * robot run was already recorded; `ranPaths` is a Set of workspace paths
 * with a succeeded robot job still on file.
 */
export function evaluateLabs(key, completed, ranPaths){
  return requiredLabs(key).map((lab) => {
    const done = !lab.placeholder && completed.has(lab.id);
    const verified = done && completed.get(lab.id) === true;
    const ran = done && !!lab.workspaceFile && (verified || ranPaths.has(lab.workspaceFile));
    return { ...lab, done, ran, newlyVerified: ran && !verified };
  });
}

export function labsUnlocked(labs){
  return labs.length > 0 && labs.every((lab) => lab.done && lab.ran);
}

/* ------------------------------------------------------------ assessment */

/** Attempts 1-5 use the five fixed sets; from the sixth on, ten random questions from all fifty. */
export function questionIdsForAttempt(attemptNumber){
  if (attemptNumber <= SET_COUNT){
    const start = (attemptNumber - 1) * SET_SIZE;
    return Array.from({ length: SET_SIZE }, (_, i) => start + i);
  }
  const ids = QUESTION_BANK.map((_, i) => i);
  for (let i = ids.length - 1; i > 0; i--){
    const j = randomInt(i + 1);
    [ids[i], ids[j]] = [ids[j], ids[i]];
  }
  return ids.slice(0, SET_SIZE);
}

function seededRandom(seed){
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Option order for one question in one attempt. The answer is always at index `correctIndex`. */
export function shuffledOptions(questionId, attemptId){
  const [, ...options] = QUESTION_BANK[questionId];
  const order = options.map((_, i) => i);
  const random = seededRandom(attemptId * 7919 + questionId * 104729 + 13);
  for (let i = order.length - 1; i > 0; i--){
    const j = Math.floor(random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return { options: order.map((i) => options[i]), correctIndex: order.indexOf(0) };
}

export function publicQuestion(token, index, secondsLeft){
  const id = token.q[index];
  return {
    index: index + 1, total: token.q.length, prompt: QUESTION_BANK[id][0],
    options: shuffledOptions(id, token.a).options, secondsLeft,
  };
}

/* ------------------------------------------------------------ signed attempt token */

function secret(){
  const value = process.env.SESSION_SECRET;
  if (!value) throw new Error('SESSION_SECRET is not set');
  return value;
}

function sign(payload){
  return createHmac('sha256', secret()).update(payload).digest('base64url');
}

/** token: { a: attemptId, e: email, q: [question ids], i: index, c: correct so far, s: attempt start ms, t: question start ms } */
export function encodeToken(token){
  const payload = Buffer.from(JSON.stringify(token)).toString('base64url');
  return `${payload}.${sign(payload)}`;
}

export function decodeToken(value){
  if (typeof value !== 'string' || value.length > 2000) return null;
  const [payload, mac] = value.split('.');
  if (!payload || !mac) return null;
  const expected = Buffer.from(sign(payload));
  const given = Buffer.from(mac);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  try {
    const token = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    return token && typeof token.e === 'string' && Array.isArray(token.q) ? token : null;
  } catch (e) { return null; }
}

/* ------------------------------------------------------------ certificate ids */

const ID_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

export function newCertificateId(key){
  const cert = CERTIFICATES[key];
  const bytes = randomBytes(8);
  const chars = [...bytes].map((b) => ID_ALPHABET[b % ID_ALPHABET.length]).join('');
  return `SF-${cert.code}-${chars.slice(0, 4)}-${chars.slice(4)}`;
}

export function validCertificateId(value){
  return typeof value === 'string' && /^SF-[A-Z]{2}-[A-Z2-9]{4}-[A-Z2-9]{4}$/.test(value);
}

export function cleanHolderName(value){
  const name = String(value || '').replace(/\s+/g, ' ').trim();
  return /^[\p{L}\p{M}][\p{L}\p{M} .'’-]{1,59}$/u.test(name) ? name : null;
}
