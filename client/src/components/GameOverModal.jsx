import { useEffect } from 'react';
import { motion } from 'framer-motion';
import confetti from 'canvas-confetti';
import { calculateGrade } from '../../../shared/src/validation.js';
import { eventBus } from '../services/eventBus.js';

export default function GameOverModal({
  stats = {
    score: 0,
    solved: 0,
    total: 1,
    bestCombo: 0,
    avgTimeSec: 0,
    modeTitle: 'Speed Rush',
  },
  onPlayAgain,
  onDashboard,
}) {
  const accuracy = stats.total > 0 ? stats.solved / stats.total : 0;
  const gradeObj = calculateGrade(accuracy);

  useEffect(() => {
    if (gradeObj.grade === 'S' || gradeObj.grade === 'A') {
      eventBus.emit('audio:play', { sound: 'fanfare' });
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#fee135', '#38bdf8', '#ff85a2', '#10b981'],
      });
    } else {
      eventBus.emit('audio:play', { sound: 'giggle' });
    }
  }, [gradeObj.grade]);

  return (
    <div className="game-over-backdrop">
      <motion.div
        className="game-over-modal-card"
        initial={{ scale: 0.85, y: 30, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 350, damping: 22 }}
      >
        {/* Grade Ribbon & Title */}
        <div className="game-over-header">
          <div className="grade-badge-circle" style={{ borderColor: gradeObj.color, color: gradeObj.color }}>
            <span className="grade-letter">{gradeObj.grade}</span>
            <span className="grade-rank-tier">RANK</span>
          </div>

          <div className="grade-text-group">
            <h2 style={{ color: gradeObj.color }}>{gradeObj.title}</h2>
            <p className="grade-desc">{gradeObj.desc}</p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="recap-stats-grid">
          <div className="recap-stat-box">
            <span className="stat-label">FINAL SCORE</span>
            <span className="stat-val score-highlight">+{stats.score}</span>
          </div>
          <div className="recap-stat-box">
            <span className="stat-label">ACCURACY</span>
            <span className="stat-val">{Math.round(accuracy * 100)}%</span>
          </div>
          <div className="recap-stat-box">
            <span className="stat-label">PUZZLES SOLVED</span>
            <span className="stat-val">{stats.solved} / {stats.total}</span>
          </div>
          <div className="recap-stat-box">
            <span className="stat-label">MAX COMBO</span>
            <span className="stat-val">🔥 {stats.bestCombo}x</span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="game-over-actions">
          <button
            className="action-btn-primary"
            onClick={() => {
              eventBus.emit('audio:play', { sound: 'bubble' });
              onPlayAgain();
            }}
          >
            🍍 Play Again
          </button>
          <button
            className="action-btn-ghost"
            onClick={() => {
              eventBus.emit('audio:play', { sound: 'bubble' });
              onDashboard();
            }}
          >
            Dashboard
          </button>
        </div>
      </motion.div>
    </div>
  );
}

