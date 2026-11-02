import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../services/api.js';
import { eventBus } from '../services/eventBus.js';
import Numpad from './Numpad.jsx';
import MinionReactionAvatar from './MinionReactionAvatar.jsx';
import FloatingPoints from './FloatingPoints.jsx';
import GameOverModal from './GameOverModal.jsx';
import { MODES } from '../../../shared/src/constants.js';

export default function PuzzleArena({ modeKey = 'classic', onExit, onScoreUpdate, userAvatar = '🧽' }) {
  const modeConfig = MODES[modeKey] || MODES.classic;

  const [round, setRound] = useState(null);
  const [status, setStatus] = useState('loading'); // loading | playing | won | lost | finished
  const [hints, setHints] = useState([]);
  const [triesLeft, setTriesLeft] = useState(modeConfig.tries);
  const [wrongGuesses, setWrongGuesses] = useState([]);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [totalSolved, setTotalSolved] = useState(0);
  const [totalAttempted, setTotalAttempted] = useState(0);
  const [sessionScore, setSessionScore] = useState(0);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [timeAttackRemaining, setTimeAttackRemaining] = useState(modeConfig.limit || 60);
  const [busy, setBusy] = useState(false);
  const [shake, setShake] = useState(false);
  const [floatingTrigger, setFloatingTrigger] = useState(0);
  const [lastGain, setLastGain] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');
  const [zoomImage, setZoomImage] = useState(false);

  const timerRef = useRef(null);
  const roundStartTimeRef = useRef(Date.now());

  // Load next puzzle round
  const loadNewRound = useCallback(async () => {
    setStatus('loading');
    setErrorMsg('');
    setHints([]);
    setWrongGuesses([]);
    setElapsedSec(0);
    roundStartTimeRef.current = Date.now();

    try {
      const data = await api('/api/game/round', {
        method: 'POST',
        body: { mode: modeKey },
      });
      setRound(data);
      setTriesLeft(data.tries);
      setStatus('playing');
      eventBus.emit('puzzle:start', { roundId: data.roundId, mode: modeKey });
    } catch (err) {
      setErrorMsg(err.message || 'Failed to load puzzle.');
      setStatus('error');
    }
  }, [modeKey]);

  useEffect(() => {
    loadNewRound();
  }, [loadNewRound]);

  // Timer loop for Speed Rush & Time Attack
  useEffect(() => {
    if (status !== 'playing') return;

    timerRef.current = setInterval(() => {
      setElapsedSec((prev) => prev + 1);

      if (modeKey === 'timeattack') {
        setTimeAttackRemaining((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            setStatus('finished');
            return 0;
          }
          return prev - 1;
        });
      } else if (modeConfig.limit > 0) {
        // Individual puzzle timer (Speed Rush)
        setElapsedSec((prev) => {
          if (prev >= modeConfig.limit) {
            handleTimeoutLoss();
          }
          return prev;
        });
      }
    }, 1000);

    return () => clearInterval(timerRef.current);
  }, [status, modeKey, modeConfig.limit]);

  const handleTimeoutLoss = async () => {
    if (status !== 'playing' || !round) return;
    setStatus('lost');
    setStreak(0);
    eventBus.emit('audio:play', { sound: 'wrong' });
    try {
      const r = await api('/api/game/giveup', {
        method: 'POST',
        body: { roundId: round.roundId },
      });
      setRound((prev) => ({ ...prev, solution: r.solution }));
    } catch {}
  };

  // Submit Answer
  const handleDigitGuess = async (digit) => {
    if (busy || status !== 'playing' || !round) return;
    setBusy(true);
    setErrorMsg('');

    const latencyMs = Date.now() - roundStartTimeRef.current;
    setTotalAttempted((prev) => prev + 1);

    try {
      const res = await api('/api/game/answer', {
        method: 'POST',
        body: { roundId: round.roundId, answer: digit },
      });

      if (res.correct) {
        const nextStreak = streak + 1;
        setStreak(nextStreak);
        setBestStreak((prev) => Math.max(prev, nextStreak));
        setTotalSolved((prev) => prev + 1);
        setSessionScore((prev) => prev + (res.points || 0));
        setLastGain(res.points || 100);
        setFloatingTrigger((prev) => prev + 1);
        onScoreUpdate?.(res.score);

        eventBus.emit('audio:play', { sound: 'correct', param: nextStreak });
        eventBus.emit('puzzle:solved', {
          roundId: round.roundId,
          points: res.points,
          streak: nextStreak,
          latencyMs,
        });

        // Perfect 10 condition check
        if (modeKey === 'perfect10' && totalSolved + 1 >= 10) {
          setStatus('finished');
          return;
        }

        // Advance to next puzzle after celebration
        setTimeout(() => {
          loadNewRound();
        }, 850);
      } else {
        setWrongGuesses((prev) => [...prev, digit]);
        setStreak(0);
        setShake(true);
        setTimeout(() => setShake(false), 500);

        eventBus.emit('audio:play', { sound: 'wrong' });
        eventBus.emit('puzzle:failed', { roundId: round.roundId, digit });

        if (res.over) {
          setRound((prev) => ({ ...prev, solution: res.solution }));
          if (modeKey === 'survival' || modeKey === 'perfect10') {
            setStatus('finished');
          } else {
            setStatus('lost');
          }
        } else {
          setTriesLeft(res.attemptsLeft);
        }
      }
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setBusy(false);
    }
  };

  // Request Hint
  const handleRequestHint = async () => {
    if (busy || hints.length >= (round?.maxHints || 0) || !round) return;
    try {
      const res = await api('/api/game/hint', {
        method: 'POST',
        body: { roundId: round.roundId },
      });
      eventBus.emit('audio:play', { sound: 'bubble' });
      setHints(res.hints || []);
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  // Give Up
  const handleGiveUp = async () => {
    if (status !== 'playing' || !round) return;
    try {
      const res = await api('/api/game/giveup', {
        method: 'POST',
        body: { roundId: round.roundId },
      });
      setRound((prev) => ({ ...prev, solution: res.solution }));
      setStatus('lost');
      setStreak(0);
      eventBus.emit('audio:play', { sound: 'wrong' });
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  if (status === 'finished') {
    return (
      <GameOverModal
        stats={{
          score: sessionScore,
          solved: totalSolved,
          total: totalAttempted || 1,
          bestCombo: bestStreak,
          modeTitle: modeConfig.title,
        }}
        onPlayAgain={() => {
          setSessionScore(0);
          setTotalSolved(0);
          setTotalAttempted(0);
          setStreak(0);
          setTimeAttackRemaining(modeConfig.limit || 60);
          loadNewRound();
        }}
        onDashboard={onExit}
      />
    );
  }

  const remainingPuzzleTime = modeConfig.limit > 0 ? Math.max(0, modeConfig.limit - elapsedSec) : 0;

  return (
    <div className="puzzle-arena-container">
      {/* Top HUD */}
      <div className="arena-hud">
        <button className="hud-exit-btn" onClick={onExit}>
          ← Back to Modes
        </button>

        <div className="hud-center-badge">
          <span className="mode-pill-tag">
            {modeConfig.icon} {modeConfig.title}
          </span>
          {modeKey === 'timeattack' ? (
            <span className={`timer-countdown ${timeAttackRemaining <= 10 ? 'urgent' : ''}`}>
              ⏱️ {timeAttackRemaining}s
            </span>
          ) : modeConfig.limit > 0 ? (
            <span className={`timer-countdown ${remainingPuzzleTime <= 5 ? 'urgent' : ''}`}>
              ⏱️ {remainingPuzzleTime}s
            </span>
          ) : null}
        </div>

        {/* Lives / Hearts */}
        <div className="hud-lives-track">
          {Array.from({ length: modeConfig.tries }, (_, i) => (
            <span key={i} className={`hud-heart ${i < triesLeft ? 'full' : 'spent'}`}>
              ❤️
            </span>
          ))}
        </div>
      </div>

      {/* Main Split Layout: Puzzle Card & Interaction Console */}
      <div className="arena-stage-grid">
        {/* Left Column: Puzzle Graphic & Fallback Indicator */}
        <div className={`puzzle-display-card ${shake ? 'shake-active' : ''}`}>
          {round?.isFallback && (
            <div className="fallback-banner">
              ⚡ FAULT-TOLERANT PROCEDURAL ENGINE ACTIVE
            </div>
          )}

          <div className="puzzle-image-wrapper" onClick={() => setZoomImage(true)}>
            {status === 'loading' && (
              <div className="puzzle-shimmer-loading">
                <span className="shimmer-bubble">🫧</span>
                <span>Calculating Bikini Matrix…</span>
              </div>
            )}

            {round?.image && (
              <img
                src={round.image}
                alt="Bikini Bottom Banana Equation"
                className="puzzle-img"
              />
            )}

            {status === 'playing' && (
              <button className="zoom-hint-pill" onClick={(e) => { e.stopPropagation(); setZoomImage(true); }}>
                🔍 Click to Inspect / Zoom
              </button>
            )}
          </div>

          {/* Floating Points Overlay */}
          <FloatingPoints triggerKey={floatingTrigger} points={lastGain} combo={streak} />

          {/* Round Lost Reveal */}
          {status === 'lost' && (
            <div className="solution-reveal-banner">
              <span>Tartar Sauce! The missing digit was:</span>
              <b className="revealed-digit">{round?.solution}</b>
              <button className="next-puzzle-action-btn" onClick={loadNewRound}>
                Next Puzzle 🍍
              </button>
            </div>
          )}

          {errorMsg && <div className="arena-error-box">{errorMsg}</div>}
        </div>

        {/* Right Column: Console with Reactive Avatar, Numpad, and Hints */}
        <div className="puzzle-console-card">
          {/* Reaction Avatar Strip */}
          <div className="console-avatar-bar">
            <MinionReactionAvatar
              streak={streak}
              isWrong={shake}
              avatarIcon={userAvatar}
            />
            <div className="score-summary-tag">
              <span className="pts-count">{sessionScore}</span>
              <span className="pts-label">SESSION PTS</span>
            </div>
          </div>

          {/* Numpad Console */}
          <div className="console-numpad-wrapper">
            <span className="numpad-header-label">INPUT QUANTUM DIGIT:</span>
            <Numpad
              onDigit={handleDigitGuess}
              disabled={busy || status !== 'playing'}
              wrongDigits={wrongGuesses}
            />
          </div>

          {/* Tactical Hints Panel */}
          <div className="console-hints-panel">
            <div className="hints-header-bar">
              <span>💡 HINTS ({hints.length}/{round?.maxHints || modeConfig.hints})</span>
              {status === 'playing' && (round?.maxHints || 0) > hints.length && (
                <button className="request-hint-btn" onClick={handleRequestHint}>
                  Request Hint (−20 pts)
                </button>
              )}
            </div>

            {hints.length === 0 ? (
              <p className="no-hints-text">
                {modeConfig.hints === 0
                  ? 'No hints permitted in Survival mode!'
                  : 'Numpad digits 0-9. Request a hint if Plankton’s cipher confuses you!'}
              </p>
            ) : (
              <ul className="hints-list">
                {hints.map((h, i) => (
                  <motion.li
                    key={i}
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="hint-item"
                  >
                    {h}
                  </motion.li>
                ))}
              </ul>
            )}

            {status === 'playing' && (
              <button className="give-up-btn" onClick={handleGiveUp}>
                Surrender Puzzle
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Image Inspection / Zoom Modal */}
      <AnimatePresence>
        {zoomImage && round?.image && (
          <div className="zoom-modal-backdrop" onClick={() => setZoomImage(false)}>
            <motion.div
              className="zoom-modal-content"
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.8 }}
              onClick={(e) => e.stopPropagation()}
            >
              <img src={round.image} alt="Zoomed Puzzle" className="zoomed-img" />
              <button className="zoom-close-btn" onClick={() => setZoomImage(false)}>
                ✕ Close Inspection
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
