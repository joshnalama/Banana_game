import { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import confetti from 'canvas-confetti';
import { api } from './api.js';
import { MODES } from './modes.js';
import ModePicker from './ModePicker.jsx';

const BONUS_SECONDS = 20;

export default function Game({ onScore }) {
  const [mode, setMode] = useState(null);
  return mode
    ? <Round key={mode} mode={mode} onScore={onScore} onExit={() => setMode(null)} />
    : <ModePicker onPick={setMode} />;
}

function Round({ mode, onScore, onExit }) {
  const meta = MODES[mode];
  const [round, setRound] = useState(null);
  const [status, setStatus] = useState('loading'); // loading | open | won | lost | error
  const [hints, setHints] = useState([]);
  const [left, setLeft] = useState(meta.tries);
  const [wrong, setWrong] = useState([]);
  const [shake, setShake] = useState(false);
  const [gain, setGain] = useState(0);
  const [solution, setSolution] = useState(null);
  const [rain, setRain] = useState(0);
  const [sec, setSec] = useState(0);
  const [busy, setBusy] = useState(false);
  const [imgReady, setImgReady] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setStatus('loading'); setError(''); setHints([]); setWrong([]); setSec(0);
    setGain(0); setSolution(null); setImgReady(false);
    try {
      const r = await api('/api/game/round', { method: 'POST', body: { mode } });
      setRound(r); setLeft(r.tries); setStatus('open');
    } catch (e) { setError(e.message); setStatus('error'); }
  }, [mode]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (status !== 'open' || !imgReady) return;
    const t = setInterval(() => setSec((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [status, imgReady]);

  const finishLost = (sol) => { setSolution(sol); setStatus('lost'); };

  async function giveUp() {
    if (status !== 'open') return;
    try {
      const r = await api('/api/game/giveup', { method: 'POST', body: { roundId: round.roundId } });
      finishLost(r.solution);
    } catch (e) { if (e.status !== 409) setError(e.message); }
  }

  // Time attack: when the countdown reaches zero the round is lost.
  useEffect(() => {
    if (status === 'open' && round?.limit && sec >= round.limit) giveUp();
  }, [sec]); // eslint-disable-line

  async function guess(d) {
    if (busy || status !== 'open') return;
    setBusy(true); setError('');
    try {
      const r = await api('/api/game/answer', { method: 'POST', body: { roundId: round.roundId, answer: d } });
      if (r.correct) {
        setGain(r.points); setStatus('won'); setRain((n) => n + 1); onScore(r.score);
        confetti({ particleCount: 90, spread: 70, origin: { y: 0.6 }, colors: ['#f7d44c', '#2f7d5b', '#1e2a3a'], disableForReducedMotion: true });
      } else {
        setWrong((w) => [...w, d]);
        setShake(true); setTimeout(() => setShake(false), 550);
        navigator.vibrate?.([90, 40, 90, 40, 90]);
        if (r.over) finishLost(r.solution); else setLeft(r.attemptsLeft);
      }
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }

  async function hint() {
    if (busy || hints.length >= round.maxHints) return;
    try {
      const r = await api('/api/game/hint', { method: 'POST', body: { roundId: round.roundId } });
      if (r.over) finishLost(r.solution); else setHints(r.hints);
    } catch (e) { setError(e.message); }
  }

  const timed = !!round?.limit;
  const window_ = timed ? round.limit : BONUS_SECONDS;
  const remaining = Math.max(0, window_ - sec);
  const base = Math.max(10, 100 - hints.length * 20 - wrong.length * 15);
  const possible = Math.round((base + Math.max(0, BONUS_SECONDS - sec)) * ({ classic: 1, timed: 1.5, survival: 2, practice: 0 }[mode]));
  const maxHints = round?.maxHints ?? meta.tries;

  return (
    <section className="game">
      {rain > 0 && <div className="rain" key={rain} aria-hidden>{Array.from({ length: 16 }, (_, i) => (
        <span key={i} style={{ left: `${(i * 37) % 100}%`, animationDelay: `${(i % 6) * 0.12}s` }}>🍌</span>))}</div>}

      <div className={`card puzzle ${shake ? 'shake' : ''} ${status === 'won' ? 'glow' : ''}`}>
        <div className="meta">
          <button className="link" onClick={onExit}>← {meta.icon} {meta.title}</button>
          <span aria-label={`${left} tries left`}>
            {Array.from({ length: round?.tries ?? meta.tries }, (_, i) => <span key={i} className={i < left ? 'heart' : 'heart off'}>♥</span>)}
          </span>
          <span className="worth">
            {mode === 'practice' ? 'Practice' : <>Worth <b>{status === 'open' ? possible : '—'}</b></>}
            {timed && status === 'open' && <b className={remaining <= 5 ? 'clock hot' : 'clock'}> {remaining}s</b>}
          </span>
        </div>
        <div className="timer" aria-hidden><i style={{ width: `${(remaining / window_) * 100}%`, background: timed && remaining <= 5 ? 'var(--bad)' : undefined }} /></div>

        <div className="imgbox">
          {status !== 'error' && !imgReady && <div className="skeleton" />}
          {round && <img src={round.image} alt="Banana puzzle: find the missing digit" onLoad={() => setImgReady(true)}
            style={{ opacity: imgReady ? 1 : 0 }} />}
          {status === 'error' && <div className="error">{error}</div>}
        </div>

        {status === 'won' && <div className="float" key={rain}>{mode === 'practice' ? '✔' : `+${gain}`}</div>}
        {status === 'lost' && <p className="lost">The digit was <b>{solution}</b>.</p>}

        {status === 'open' && (
          <div className="pad">
            {Array.from({ length: 10 }, (_, d) => (
              <button key={d} disabled={busy || wrong.includes(d)} onClick={() => guess(d)} className={wrong.includes(d) ? 'digit bad' : 'digit'}>{d}</button>
            ))}
          </div>
        )}
        {error && status !== 'error' && <div className="error" role="alert">{error}</div>}

        <div className="actions">
          {status === 'open' && maxHints > 0 && (
            <button className="ghost" onClick={hint} disabled={hints.length >= maxHints || busy}>
              💡 Hint {hints.length}/{maxHints} {mode !== 'practice' && hints.length < maxHints && '(−20)'}
            </button>
          )}
          {status === 'open' && mode === 'survival' && <span className="muted">No hints in this mode.</span>}
          {['won', 'lost', 'error'].includes(status) && (
            <button className="primary" onClick={load}>{status === 'error' ? 'Try again' : 'Next banana'}</button>
          )}
        </div>
      </div>

      <aside className="card hints">
        <h3>Hints</h3>
        {hints.length === 0 && <p className="muted">{maxHints === 0 ? 'Hints are off in this mode.' : 'Each hint narrows it down' + (mode === 'practice' ? '.' : ' but costs 20 points.')}</p>}
        <ol>
          <AnimatePresence>
            {hints.map((h, i) => (
              <motion.li key={i} initial={{ opacity: 0, x: 30, scale: 0.9 }} animate={{ opacity: 1, x: 0, scale: 1 }} transition={{ type: 'spring', stiffness: 300, damping: 20 }}>{h}</motion.li>
            ))}
          </AnimatePresence>
        </ol>
        <p className="muted small">Scoring: 100 base, −20 per hint, −15 per wrong guess, up to +20 for speed, then the mode multiplier.</p>
      </aside>
    </section>
  );
}
