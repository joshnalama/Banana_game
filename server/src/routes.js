import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import { OAuth2Client } from 'google-auth-library';
import { db } from './db.js';
import { generateProceduralPuzzle } from './fallbackPuzzle.js';
import { createHMACSeal, verifyHMACSeal, generateGuestIdentifier } from './crypto.js';
import { sseManager } from './sseManager.js';
import { MODES as SHARED_MODES, SPONGEBOB_AVATARS } from '../../shared/src/constants.js';

const r = Router();
const AVATARS = SPONGEBOB_AVATARS.map((a) => a.icon).concat(['🍌', '🌴', '🥥']);
const COOKIE = { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', maxAge: 7 * 24 * 3600 * 1000 };
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 60, message: { error: 'Too many attempts. Try again later.' } });
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res)).catch(next);

const publicUser = (u) => ({
  id: u.id,
  username: u.username,
  avatar: u.avatar,
  score: u.score,
  role: u.role || 'player',
  isGuest: Boolean(u.is_guest),
});

const isUnique = (e) => /UNIQUE constraint/i.test(e?.message || '');

function requireAuth(req, res, next) {
  try {
    const token = req.cookies.token || req.headers.authorization?.replace(/^Bearer\s+/i, '');
    req.userId = jwt.verify(token || '', process.env.JWT_SECRET).id;
    next();
  } catch {
    res.status(401).json({ error: 'Please log in to continue.' });
  }
}

function requireAdmin(req, res, next) {
  requireAuth(req, res, () => {
    const user = db.prepare('SELECT role FROM users WHERE id=?').get(req.userId);
    if (user?.role !== 'admin') {
      return res.status(403).json({ error: 'Administrator access required.' });
    }
    next();
  });
}

const issue = (res, id) => res.cookie('token', jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' }), COOKIE);

/* ---------- Config ---------- */
r.get('/config', (req, res) => res.json({
  googleClientId: process.env.GOOGLE_CLIENT_ID || null,
  modes: SHARED_MODES,
  avatars: AVATARS,
}));

/* ---------- Virtual Identity & Auth ---------- */
r.post('/auth/register', authLimiter, wrap(async (req, res) => {
  const { username = '', email = '', password = '', avatar = '🧽' } = req.body || {};
  if (!/^[A-Za-z0-9_]{3,20}$/.test(username)) return res.status(400).json({ error: 'Username: 3-20 letters, numbers or _.' });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 120) return res.status(400).json({ error: 'Enter a valid email address.' });
  if (typeof password !== 'string' || password.length < 8 || password.length > 72) return res.status(400).json({ error: 'Password must be 8-72 characters.' });

  try {
    const hash = await bcrypt.hash(password, 10);
    const chosenAvatar = AVATARS.includes(avatar) ? avatar : '🧽';
    const { lastInsertRowid: id } = db.prepare('INSERT INTO users (username,email,password_hash,avatar,role,is_guest) VALUES (?,?,?,?,?,?)')
      .run(username, email.toLowerCase(), hash, chosenAvatar, 'player', 0);
    issue(res, Number(id));
    res.status(201).json({ user: { id: Number(id), username, avatar: chosenAvatar, score: 0, role: 'player', isGuest: false } });
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

// Guest Identity Generation with cryptographically random identifiers
r.post('/auth/guest', authLimiter, wrap(async (req, res) => {
  const { guestName, avatar } = req.body || {};
  const chosenAvatar = AVATARS.includes(avatar) ? avatar : '🧽';
  const idInfo = generateGuestIdentifier();
  const username = guestName && /^[A-Za-z0-9_]{3,16}$/.test(guestName)
    ? `${guestName}_${Math.floor(100 + Math.random() * 900)}`
    : idInfo.username;
  const guestEmail = `${username.toLowerCase()}_${Date.now()}@guest.local`;

  try {
    const { lastInsertRowid: id } = db.prepare('INSERT INTO users (username,email,avatar,role,is_guest) VALUES (?,?,?,?,?)')
      .run(username, guestEmail, chosenAvatar, 'player', 1);
    issue(res, Number(id));
    res.json({ user: { id: Number(id), username, avatar: chosenAvatar, score: 0, role: 'player', isGuest: true } });
  } catch (e) {
    // If collision, generate fallback identifier
    const fallbackName = `Guest_${Math.floor(1000 + Math.random() * 9000)}`;
    const fallbackEmail = `${fallbackName.toLowerCase()}_${Date.now()}@guest.local`;
    const { lastInsertRowid: id } = db.prepare('INSERT INTO users (username,email,avatar,role,is_guest) VALUES (?,?,?,?,?)')
      .run(fallbackName, fallbackEmail, chosenAvatar, 'player', 1);
    issue(res, Number(id));
    res.json({ user: { id: Number(id), username: fallbackName, avatar: chosenAvatar, score: 0, role: 'player', isGuest: true } });
  }
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
    p = (await googleClient.verifyIdToken({ idToken: credential, audience: clientId })).getPayload();
  } catch {
    return res.status(401).json({ error: 'Google sign-in failed. Please try again.' });
  }
  if (!p?.sub || !p.email || !p.email_verified) return res.status(401).json({ error: 'Your Google email is not verified.' });

  let u = db.prepare('SELECT * FROM users WHERE google_id=?').get(p.sub);
  if (!u) {
    u = db.prepare('SELECT * FROM users WHERE email=?').get(p.email.toLowerCase());
    if (u) db.prepare('UPDATE users SET google_id=? WHERE id=?').run(p.sub, u.id);
  }
  if (!u) {
    const base = String(p.given_name || p.name || p.email.split('@')[0]).replace(/[^A-Za-z0-9_]/g, '').slice(0, 14) || 'FryCook';
    for (let i = 0; i < 8 && !u; i++) {
      const name = i === 0 && base.length >= 3 ? base : `${base.slice(0, 12)}${Math.floor(100 + Math.random() * 900)}`;
      try {
        const { lastInsertRowid } = db.prepare('INSERT INTO users (username,email,google_id,avatar,role,is_guest) VALUES (?,?,?,?,?,?)')
          .run(name, p.email.toLowerCase(), p.sub, '🧽', 'player', 0);
        u = db.prepare('SELECT * FROM users WHERE id=?').get(lastInsertRowid);
      } catch (e) { if (!isUnique(e)) throw e; }
    }
    if (!u) return res.status(500).json({ error: 'Could not create your account. Try again.' });
  }
  issue(res, u.id);
  res.json({ user: publicUser(u) });
}));

r.post('/auth/logout', (req, res) => {
  res.clearCookie('token', { ...COOKIE, maxAge: undefined });
  res.json({ ok: true });
});

r.get('/auth/me', requireAuth, (req, res) => {
  const u = db.prepare('SELECT id,username,avatar,score,role,is_guest FROM users WHERE id=?').get(req.userId);
  if (!u) return res.status(401).json({ error: 'Session expired.' });
  res.json({ user: publicUser(u) });
});

/* ---------- RBAC Admin Telemetry Route ---------- */
r.get('/admin/metrics', requireAdmin, (req, res) => {
  const totalUsers = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
  const totalRounds = db.prepare('SELECT COUNT(*) as count FROM rounds').get().count;
  const wonRounds = db.prepare("SELECT COUNT(*) as count FROM rounds WHERE status='won'").get().count;
  const activeDuelRooms = sseManager.rooms.size;
  res.json({
    metrics: {
      totalUsers,
      totalRounds,
      wonRounds,
      winRate: totalRounds ? Math.round((wonRounds / totalRounds) * 100) : 0,
      activeDuelRooms,
      uptimeSeconds: process.uptime(),
      timestamp: Date.now(),
    },
  });
});

/* ---------- Game Mechanics & Puzzles ---------- */
const BANANA_API = process.env.BANANA_API || 'https://marcconrad.com/uob/banana/api.php?out=json';

const hintsFor = (round, n) => {
  const s = round.solution;
  const other = (s + (round.id % 8) + 1) % 10;
  return [
    `The missing digit is ${s % 2 === 0 ? 'even' : 'odd'}.`,
    `It is between ${s <= 4 ? '0 and 4' : '5 and 9'}.`,
    `It is either ${Math.min(s, other)} or ${Math.max(s, other)}.`,
  ].slice(0, n);
};

function lose(round, wrong) {
  const done = db.prepare("UPDATE rounds SET status='lost', wrong_attempts=? WHERE id=? AND status='open'").run(wrong, round.id);
  if (done.changes && round.mode !== 'practice') {
    db.prepare('UPDATE users SET rounds_lost=rounds_lost+1, streak=0 WHERE id=?').run(round.user_id);
  }
}

r.post('/game/round', requireAuth, wrap(async (req, res) => {
  const mode = String(req.body?.mode || 'classic');
  const cfg = SHARED_MODES[mode] || SHARED_MODES.classic;

  let solution;
  let image;
  let isFallback = false;

  // Attempt live consumption of Marc Conrad's Banana API
  try {
    const response = await fetch(BANANA_API, { signal: AbortSignal.timeout(3500) });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    const sol = Number(data?.solution);
    const img = String(data?.question || '').replace(/^http:/, 'https:');
    if (Number.isInteger(sol) && sol >= 0 && sol <= 9 && /^https:\/\//.test(img)) {
      solution = sol;
      image = img;
    } else {
      throw new Error('Malformed Banana API response');
    }
  } catch (err) {
    // Self-healing Procedural SVG Fallback generator kicks in
    const fallback = generateProceduralPuzzle();
    solution = fallback.solution;
    image = fallback.image;
    isFallback = true;
  }

  // Insert round record
  const { lastInsertRowid: roundId } = db.prepare('INSERT INTO rounds (user_id,image_url,solution,mode) VALUES (?,?,?,?)')
    .run(req.userId, image, solution, mode);

  // Cryptographically seal solution with HMAC-SHA256
  const sealToken = createHMACSeal(roundId, solution);
  db.prepare('UPDATE rounds SET hmac_token=? WHERE id=?').run(sealToken, roundId);

  res.json({
    roundId: Number(roundId),
    image,
    mode,
    tries: cfg.tries,
    maxHints: cfg.hints,
    limit: cfg.limit,
    sealToken,
    isFallback,
  });
}));

function openRound(req, res) {
  const round = db.prepare('SELECT *, (unixepoch() - started_at) AS elapsed FROM rounds WHERE id=? AND user_id=?')
    .get(Number(req.body?.roundId), req.userId);
  if (!round) { res.status(404).json({ error: 'Round not found.' }); return null; }
  if (round.status !== 'open') { res.status(409).json({ error: 'This round is already finished.' }); return null; }
  round.cfg = SHARED_MODES[round.mode] || SHARED_MODES.classic;
  if (round.cfg.limit && round.elapsed > round.cfg.limit + 5) {
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
  if (!Number.isInteger(answer) || answer < 0 || answer > 9) {
    return res.status(400).json({ error: 'Pick a digit from 0 to 9.' });
  }

  // Cryptographic seal verification
  if (round.hmac_token) {
    const isSealAuthentic = verifyHMACSeal(round.id, round.solution, round.hmac_token);
    if (!isSealAuthentic) {
      return res.status(400).json({ error: 'Cryptographic seal signature verification failed.' });
    }
  }

  if (answer === round.solution) {
    const user = db.prepare('SELECT streak FROM users WHERE id=?').get(req.userId);
    const combo = (user?.streak || 0) + 1;
    const base = Math.max(10, 100 - round.hints_used * 20 - round.wrong_attempts * 15);
    const speed = Math.max(0, 20 - round.elapsed);
    const comboMult = 1 + Math.min(combo - 1, 5) * 0.2;
    const points = Math.round((base + speed) * round.cfg.mult * comboMult);

    const done = db.prepare("UPDATE rounds SET status='won' WHERE id=? AND status='open'").run(round.id);
    if (!done.changes) return res.status(409).json({ error: 'This round is already finished.' });

    if (round.mode !== 'practice') {
      db.prepare('UPDATE users SET score=score+?, rounds_won=rounds_won+1, streak=streak+1, best_streak=MAX(best_streak, streak+1) WHERE id=?')
        .run(points, req.userId);
    }

    const updatedUser = db.prepare('SELECT score, streak FROM users WHERE id=?').get(req.userId);
    return res.json({
      correct: true,
      points,
      score: updatedUser.score,
      streak: updatedUser.streak,
      solution: round.solution,
    });
  }

  const wrong = round.wrong_attempts + 1;
  if (wrong >= round.cfg.tries) {
    lose(round, wrong);
    return res.json({ correct: false, over: true, solution: round.solution, streak: 0 });
  }
  db.prepare('UPDATE rounds SET wrong_attempts=? WHERE id=?').run(wrong, round.id);
  res.json({ correct: false, over: false, attemptsLeft: round.cfg.tries - wrong });
});

/* ---------- 1v1 Multiplayer Duel Engine (SSE) ---------- */
r.post('/rooms/create', requireAuth, (req, res) => {
  const hostUser = db.prepare('SELECT id,username,avatar FROM users WHERE id=?').get(req.userId);
  if (!hostUser) return res.status(401).json({ error: 'Session expired.' });
  const duration = Number(req.body?.duration) || 180;
  const room = sseManager.createRoom({ hostUser, duration });
  res.json({ room: sseManager.getPublicRoom(room) });
});

r.post('/rooms/:code/join', requireAuth, (req, res) => {
  const guestUser = db.prepare('SELECT id,username,avatar FROM users WHERE id=?').get(req.userId);
  if (!guestUser) return res.status(401).json({ error: 'Session expired.' });
  try {
    const room = sseManager.joinRoom(req.params.code, guestUser);
    res.json({ room: sseManager.getPublicRoom(room) });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

r.get('/rooms/:code/stream', (req, res) => {
  const token = req.cookies.token || req.query.token;
  let userId;
  try {
    userId = jwt.verify(token || '', process.env.JWT_SECRET).id;
  } catch {
    return res.status(401).end();
  }
  sseManager.subscribe(req.params.code, userId, res);
});

r.post('/rooms/:code/ready', requireAuth, (req, res) => {
  const { ready = true } = req.body || {};
  try {
    sseManager.setReady(req.params.code, req.userId, ready);
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

r.post('/rooms/:code/answer', requireAuth, (req, res) => {
  const { digit } = req.body || {};
  try {
    const result = sseManager.submitAnswer(req.params.code, req.userId, digit);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

r.post('/rooms/:code/forfeit', requireAuth, (req, res) => {
  const room = sseManager.rooms.get(req.params.code.toUpperCase());
  if (!room) return res.status(404).json({ error: 'Room not found' });
  sseManager.handleForfeit(room, req.userId, 'surrendered');
  res.json({ ok: true });
});

/* ---------- Leaderboard & Profile ---------- */
r.get('/leaderboard', requireAuth, (req, res) => {
  const rows = db.prepare('SELECT id,username,avatar,score,rounds_won,best_streak FROM users WHERE score>0 ORDER BY score DESC, rounds_won DESC, id ASC LIMIT 25').all();
  res.json({
    players: rows.map((p) => ({
      username: p.username,
      avatar: p.avatar,
      score: p.score,
      won: p.rounds_won,
      bestStreak: p.best_streak,
      me: p.id === req.userId,
    })),
  });
});

r.get('/profile', requireAuth, (req, res) => {
  const u = db.prepare('SELECT username,email,avatar,score,rounds_won,rounds_lost,streak,best_streak,role,is_guest,created_at FROM users WHERE id=?').get(req.userId);
  if (!u) return res.status(401).json({ error: 'Session expired.' });
  const rank = db.prepare('SELECT COUNT(*)+1 AS "rank" FROM users WHERE score>?').get(u.score).rank;
  const total = u.rounds_won + u.rounds_lost;
  res.json({
    profile: {
      ...u,
      rank,
      accuracy: total ? Math.round((u.rounds_won / total) * 100) : 0,
      totalGames: total,
    },
    avatars: AVATARS,
  });
});

r.patch('/profile', requireAuth, (req, res) => {
  const { avatar } = req.body || {};
  if (!AVATARS.includes(avatar)) return res.status(400).json({ error: 'Choose one of the listed avatars.' });
  db.prepare('UPDATE users SET avatar=? WHERE id=?').run(avatar, req.userId);
  res.json({ avatar });
});

export default r;
