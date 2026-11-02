import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { eventBus } from '../services/eventBus.js';

export default function CinematicIntroModal({ isOpen, onClose }) {
  const [progress, setProgress] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [activeAct, setActiveAct] = useState(0);
  const timerRef = useRef(null);

  const acts = [
    {
      title: 'BIKINI BOTTOM · SECTOR 7',
      subtitle: 'The Chum Bucket Incident',
      body: 'Deep in the Marianas Trench, Sheldon J. Plankton deployed a Quantum Cipher to lock away the legendary Krabby Patty formula using Marc Conrad’s mathematical puzzles!',
      badge: 'ALERT',
      accent: '#ff85a2',
      art: '🪼 🦠 🔐',
    },
    {
      title: 'THE SECRET FORMULA ENCRYPTED',
      subtitle: 'Banana Matrix Infiltration',
      body: 'Every puzzle conceals a critical digit. The mathematical equilibrium of the ocean hangs on whether a fry cook can decipher the equations before the timer runs out.',
      badge: 'CIPHER',
      accent: '#fee135',
      art: '🍔 🍍 🍌',
    },
    {
      title: 'SPONGEBOB SQUAREPANTS',
      subtitle: 'Quantum Spatula Activated',
      body: '"I\'m ready! I\'m ready! I\'m ready!" Harness the power of the Golden Spatula, ignite your combo streaks, and claim the rank of Krabby Patty Supreme!',
      badge: 'MISSION',
      accent: '#38bdf8',
      art: '🧽 ⭐ 🚀',
    },
  ];

  useEffect(() => {
    if (!isOpen) {
      setProgress(0);
      setActiveAct(0);
      return;
    }

    eventBus.emit('audio:play', { sound: 'bubble' });

    if (isPlaying) {
      timerRef.current = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 100) {
            clearInterval(timerRef.current);
            return 100;
          }
          const next = prev + 1.2;
          const actIndex = Math.min(Math.floor((next / 100) * acts.length), acts.length - 1);
          setActiveAct(actIndex);
          return next;
        });
      }, 100);
    } else {
      clearInterval(timerRef.current);
    }

    return () => clearInterval(timerRef.current);
  }, [isOpen, isPlaying]);

  if (!isOpen) return null;

  const current = acts[activeAct];

  return (
    <AnimatePresence>
      <motion.div
        className="cinematic-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        {/* Ambient Backlight Glow */}
        <div
          className="ambient-glow"
          style={{
            background: `radial-gradient(circle at 50% 50%, ${current.accent}33 0%, rgba(11,37,69,0.85) 70%)`,
          }}
        />

        {/* Theater Content Card */}
        <motion.div
          className="theater-card"
          initial={{ scale: 0.9, y: 30 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9, y: 30 }}
          transition={{ type: 'spring', damping: 25, stiffness: 280 }}
        >
          {/* Top Bar */}
          <div className="theater-header">
            <span className="badge" style={{ borderColor: current.accent, color: current.accent }}>
              ● {current.badge}
            </span>
            <div className="theater-title-tags">
              <span>ACT {activeAct + 1} OF 3</span>
              <span className="dot">·</span>
              <span>CINEMATIC ARCHIVE</span>
            </div>
            <button className="theater-skip-btn" onClick={onClose}>
              Skip to Dashboard ✕
            </button>
          </div>

          {/* Visual Display */}
          <div className="theater-stage">
            <motion.div
              key={activeAct}
              className="stage-art"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.35 }}
            >
              <div className="stage-emoji">{current.art}</div>
              <div className="hologram-grid" />
            </motion.div>

            <motion.div
              key={`text-${activeAct}`}
              className="stage-text"
              initial={{ y: 15, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.35, delay: 0.1 }}
            >
              <h4 style={{ color: current.accent }}>{current.title}</h4>
              <h2>{current.subtitle}</h2>
              <p>{current.body}</p>
            </motion.div>
          </div>

          {/* Scrubber and Controls */}
          <div className="theater-controls">
            <button
              className="play-pause-btn"
              onClick={() => {
                setIsPlaying(!isPlaying);
                eventBus.emit('audio:play', { sound: 'click' });
              }}
            >
              {isPlaying ? '⏸ Pause' : '▶ Play'}
            </button>

            {/* Interactive Scrubber */}
            <div
              className="scrubber-track"
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const clickPos = (e.clientX - rect.left) / rect.width;
                const newPct = Math.max(0, Math.min(100, clickPos * 100));
                setProgress(newPct);
                setActiveAct(Math.min(Math.floor((newPct / 100) * acts.length), acts.length - 1));
                eventBus.emit('audio:play', { sound: 'bubble' });
              }}
            >
              <div className="scrubber-fill" style={{ width: `${progress}%`, background: current.accent }} />
              <div className="scrubber-thumb" style={{ left: `${progress}%` }} />
            </div>

            <span className="scrubber-time">{Math.round(progress)}%</span>

            <button
              className="ready-action-btn"
              onClick={() => {
                eventBus.emit('audio:play', { sound: 'fanfare' });
                onClose();
              }}
            >
              I'm Ready! 🚀
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

