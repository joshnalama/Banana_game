import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import { OAuth2Client } from 'google-auth-library';
import { db } from './db.js';

const r = Router();
const AVATARS = ['🍌', '🐵', '🦍', '🌴', '🥥', '🍍', '🦜', '🐒'];
const COOKIE = { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', maxAge: 7 * 24 * 3600 * 1000 };
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, message: { error: 'Too many attempts. Try again later.' } });
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res)).catch(next);
const publicUser = (u) => ({ id: u.id, username: u.username, avatar: u.avatar, score: u.score });
const isUnique = (e) => /UNIQUE constraint/i.test(e?.message || '');

function requireAuth(req, res, next) {
  try {
    req.userId = jwt.verify(req.cookies.token || '', process.env.JWT_SECRET).id;
    next();
  } catch {
    res.status(401).json({ error: 'Please log in to continue.' });
  }
}
const issue = (res, id) => res.cookie('token', jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' }), COOKIE);

/* ---------- config (tells the browser if Google sign-in is available) ---------- */
r.get('/config', (req, res) => res.json({ googleClientId: process.env.GOOGLE_CLIENT_ID || null }));

/* ---------- auth ---------- */
r.post('/auth/register', authLimiter, wrap(async (req, res) => {
  const { username = '', email = '', password = '' } = req.body || {};
  if (!/^[A-Za-z0-9_]{3,20}$/.test(username)) return res.status(400).json({ error: 'Username: 3-20 letters, numbers or _.' });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 120) return res.status(400).json({ error: 'Enter a valid email.' });
  if (typeof password !== 'string' || password.length < 8 || password.length > 72) return res.status(400).json({ error: 'Password must be 8-72 characters.' });
  try {
    const hash = await bcrypt.hash(password, 12);
    const { lastInsertRowid: id } = db.prepare('INSERT INTO users (username,email,password_hash) VALUES (?,?,?)').run(username, email.toLowerCase(), hash);
    issue(res, Number(id));
    res.status(201).json({ user: { id: Number(id), username, avatar: '🍌', score: 0 } });
  } catch (e) {
    if (isUnique(e)) return res.status(409).json({ error: 'Username or email already in use.' });
    throw e;
  }
}));

r.post('/auth/login', authLimiter, wrap(async (req, res) => {
  const { username = '', password = '' } = req.body || {};
  const u = db.prepare('SELECT * FROM users WHERE username=? OR email=?').get(String(username), String(username).toLowerCase());
  if (u && !u.password_hash) return res.status(401).json({ error: 'This account uses Google. Choose "Continue with Google".' });
  const ok = u && (await bcrypt.compare(String(password), u.password_hash));
  if (!ok) return res.status(401).json({ error: 'Wrong username or password.' });
  issue(res, u.id);
  res.json({ user: publicUser(u) });
}));

let googleClient;
r.post('/auth/google', authLimiter, wrap(async (req, res) => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) return res.status(503).json({ error: 'Google sign-in is not set up on this server.' });
  const credential = req.body?.credential;
  if (typeof credential !== 'string' || credential.length > 4096) return res.status(400).json({ error: 'Missing Google credential.' });

  let p;
  try {
    googleClient ||= new OAuth2Client(clientId);
    p = (await googleClient.verifyIdToken({ idToken: credential, audience: clientId })).getPayload(); // checks signature, audience, expiry
  } catch {
    return res.status(401).json({ error: 'Google sign-in failed. Please try again.' });
  }
  if (!p?.sub || !p.email || !p.email_verified) return res.status(401).json({ error: 'Your Google email is not verified.' });

  let u = db.prepare('SELECT * FROM users WHERE google_id=?').get(p.sub);
  if (!u) {
    u = db.prepare('SELECT * FROM users WHERE email=?').get(p.email.toLowerCase());
    if (u) db.prepare('UPDATE users SET google_id=? WHERE id=?').run(p.sub, u.id); // link to the existing account
  }
  if (!u) {
    const base = String(p.given_name || p.name || p.email.split('@')[0]).replace(/[^A-Za-z0-9_]/g, '').slice(0, 14) || 'player';
    for (let i = 0; i < 8 && !u; i++) {
      const name = i === 0 && base.length >= 3 ? base : `${base.slice(0, 12)}${Math.floor(100 + Math.random() * 900)}`;
      try {
        const { lastInsertRowid } = db.prepare('INSERT INTO users (username,email,google_id) VALUES (?,?,?)').run(name, p.email.toLowerCase(), p.sub);
        u = db.prepare('SELECT * FROM users WHERE id=?').get(lastInsertRowid);
      } catch (e) { if (!isUnique(e)) throw e; }
    }
    if (!u) return res.status(500).json({ error: 'Could not create your account. Try again.' });
  }
  issue(res, u.id);
  res.json({ user: publicUser(u) });
}));

r.post('/auth/logout', (req, res) => { res.clearCookie('token', { ...COOKIE, maxAge: undefined }); res.json({ ok: true }); });

r.get('/auth/me', requireAuth, (req, res) => {
  const u = db.prepare('SELECT id,username,avatar,score FROM users WHERE id=?').get(req.userId);
  if (!u) return res.status(401).json({ error: 'Session expired.' });
  res.json({ user: publicUser(u) });
});

/* ---------- game ---------- */
// Rules for each mode live on the server so players cannot change them.
const MODES = {
  classic:  { tries: 3, hints: 3, limit: 0,  mult: 1 },
  timed:    { tries: 2, hints: 3, limit: 15, mult: 1.5 },
  survival: { tries: 1, hints: 0, limit: 0,  mult: 2 },
  practice: { tries: 5, hints: 3, limit: 0,  mult: 0 },
};
const GRACE = 5; // seconds allowed for network delay in timed mode
const BANANA_API = process.env.BANANA_API || 'https://marcconrad.com/uob/banana/api.php?out=json';

const hintsFor = (round, n) => {
  const s = round.solution;
  const other = (s + (round.id % 8) + 1) % 10; // never equals s
  return [
    `The missing digit is ${s % 2 === 0 ? 'even' : 'odd'}.`,
    `It is between ${s <= 4 ? '0 and 4' : '5 and 9'}.`,
    `It is either ${Math.min(s, other)} or ${Math.max(s, other)}.`,
  ].slice(0, n);
};

function lose(round, wrong) {
  const done = db.prepare("UPDATE rounds SET status='lost', wrong_attempts=? WHERE id=? AND status='open'").run(wrong, round.id);
  if (done.changes && round.mode !== 'practice') db.prepare('UPDATE users SET rounds_lost=rounds_lost+1, streak=0 WHERE id=?').run(round.user_id);
}

r.post('/game/round', requireAuth, wrap(async (req, res) => {
  const mode = String(req.body?.mode || 'classic');
  if (!Object.hasOwn(MODES, mode)) return res.status(400).json({ error: 'Unknown game mode.' });
  let data;
  try {
    data = await (await fetch(BANANA_API, { signal: AbortSignal.timeout(8000) })).json();
  } catch {
    return res.status(502).json({ error: 'The Banana puzzle service is not responding. Try again.' });
  }
  const solution = Number(data?.solution);
  const image = String(data?.question || '').replace(/^http:/, 'https:');
  if (!Number.isInteger(solution) || solution < 0 || solution > 9 || !/^https:\/\//.test(image)) {
    return res.status(502).json({ error: 'The puzzle service sent an unexpected answer.' });
  }
  const { lastInsertRowid } = db.prepare('INSERT INTO rounds (user_id,image_url,solution,mode) VALUES (?,?,?,?)').run(req.userId, image, solution, mode);
  const c = MODES[mode];
  res.json({ roundId: Number(lastInsertRowid), image, mode, tries: c.tries, maxHints: c.hints, limit: c.limit });
}));

function openRound(req, res) {
  const round = db.prepare('SELECT *, (unixepoch() - started_at) AS elapsed FROM rounds WHERE id=? AND user_id=?').get(Number(req.body?.roundId), req.userId);
  if (!round) { res.status(404).json({ error: 'Round not found.' }); return null; }
  if (round.status !== 'open') { res.status(409).json({ error: 'This round is already finished.' }); return null; }
  round.cfg = MODES[round.mode] || MODES.classic;
  if (round.cfg.limit && round.elapsed > round.cfg.limit + GRACE) {
    lose(round, round.wrong_attempts);
    res.json({ correct: false, over: true, expired: true, solution: round.solution });
    return null;
  }
  return round;
}

r.post('/game/hint', requireAuth, (req, res) => {
  const round = openRound(req, res); if (!round) return;
  if (round.cfg.hints === 0) return res.status(403).json({ error: 'Hints are turned off in this mode.' });
  let n = round.hints_used;
  if (n < round.cfg.hints) {
    n += 1;
    db.prepare("UPDATE rounds SET hints_used=? WHERE id=? AND status='open'").run(n, round.id);
  }
  res.json({ hints: hintsFor(round, n) });
});

r.post('/game/giveup', requireAuth, (req, res) => {
  const round = openRound(req, res); if (!round) return;
  lose(round, round.wrong_attempts);
  res.json({ over: true, solution: round.solution });
});

r.post('/game/answer', requireAuth, (req, res) => {
  const round = openRound(req, res); if (!round) return;
  const answer = Number(req.body?.answer);
  if (!Number.isInteger(answer) || answer < 0 || answer > 9) return res.status(400).json({ error: 'Pick a digit from 0 to 9.' });

  if (answer === round.solution) {
    const base = Math.max(10, 100 - round.hints_used * 20 - round.wrong_attempts * 15);
    const speed = Math.max(0, 20 - round.elapsed);
    const points = Math.round((base + speed) * round.cfg.mult);
    const done = db.prepare("UPDATE rounds SET status='won' WHERE id=? AND status='open'").run(round.id);
    if (!done.changes) return res.status(409).json({ error: 'This round is already finished.' });
    if (round.mode !== 'practice') {
      db.prepare('UPDATE users SET score=score+?, rounds_won=rounds_won+1, streak=streak+1, best_streak=MAX(best_streak, streak+1) WHERE id=?').run(points, req.userId);
    }
    return res.json({ correct: true, points, score: db.prepare('SELECT score FROM users WHERE id=?').get(req.userId).score });
  }

  const wrong = round.wrong_attempts + 1;
  if (wrong >= round.cfg.tries) {
    lose(round, wrong);
    return res.json({ correct: false, over: true, solution: round.solution });
  }
  db.prepare('UPDATE rounds SET wrong_attempts=? WHERE id=?').run(wrong, round.id);
  res.json({ correct: false, over: false, attemptsLeft: round.cfg.tries - wrong });
});

/* ---------- leaderboard & profile ---------- */
r.get('/leaderboard', requireAuth, (req, res) => {
  const rows = db.prepare('SELECT id,username,avatar,score,rounds_won FROM users WHERE score>0 ORDER BY score DESC, rounds_won DESC, id ASC LIMIT 20').all();
  res.json({ players: rows.map((p) => ({ username: p.username, avatar: p.avatar, score: p.score, won: p.rounds_won, me: p.id === req.userId })) });
});

r.get('/profile', requireAuth, (req, res) => {
  const u = db.prepare('SELECT username,email,avatar,score,rounds_won,rounds_lost,best_streak,created_at FROM users WHERE id=?').get(req.userId);
  const rank = db.prepare('SELECT COUNT(*)+1 AS "rank" FROM users WHERE score>?').get(u.score).rank;
  const total = u.rounds_won + u.rounds_lost;
  res.json({ profile: { ...u, rank, accuracy: total ? Math.round((u.rounds_won / total) * 100) : 0 }, avatars: AVATARS });
});

r.patch('/profile', requireAuth, (req, res) => {
  const { avatar } = req.body || {};
  if (!AVATARS.includes(avatar)) return res.status(400).json({ error: 'Choose one of the listed avatars.' });
  db.prepare('UPDATE users SET avatar=? WHERE id=?').run(avatar, req.userId);
  res.json({ avatar });
});

export default r;
