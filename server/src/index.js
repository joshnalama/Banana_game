import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import { dataDir } from './db.js';
import routes from './routes.js';

// No setup needed: a private signing key is created once and kept in server/data (git-ignored).
if (!process.env.JWT_SECRET) {
  const f = path.join(dataDir, 'jwt.secret');
  if (!fs.existsSync(f)) fs.writeFileSync(f, crypto.randomBytes(32).toString('hex'), { mode: 0o600 });
  process.env.JWT_SECRET = fs.readFileSync(f, 'utf8').trim();
}

const app = express();
app.disable('x-powered-by');
app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173', credentials: true }));
app.use(express.json({ limit: '10kb' }));
app.use(cookieParser());
app.use('/api', rateLimit({ windowMs: 15 * 60 * 1000, limit: 600 }));
app.use('/api', routes);
app.use((req, res) => res.status(404).json({ error: 'Not found' }));
app.use((err, req, res, next) => { // eslint-disable-line
  console.error(err); // details stay in the server log only
  res.status(500).json({ error: 'Something went wrong on our side.' });
});

const port = process.env.PORT || 5000;
app.listen(port, () => console.log(`API ready on port ${port} (SQLite file: server/data/banana.db)`));
