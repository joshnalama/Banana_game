import { motion } from 'framer-motion';
import { MODES, MODE_LIST } from './modes.js';
import { eventBus } from './services/eventBus.js';

export default function ModePicker({ onPick }) {
  const handlePick = (id) => {
    eventBus.emit('audio:play', { sound: 'bubble' });
    onPick(id);
  };

  return (
    <section className="mode-picker-section">
      <div className="picker-header">
        <h2 className="pick-title">SELECT ARCADE MISSION</h2>
        <p className="pick-subtitle">
          Solve Marc Conrad’s Banana equations, build your combo streak, and earn the rank of Krabby Patty Supreme!
        </p>
      </div>

      <div className="modes-grid">
        {MODE_LIST.map((id, i) => {
          const m = MODES[id];
          return (
            <motion.button
              key={id}
              className={`mode-card mode-${id}`}
              onClick={() => handlePick(id)}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06, type: 'spring', stiffness: 280, damping: 22 }}
              whileHover={{ y: -6, scale: 1.02 }}
              whileTap={{ scale: 0.96 }}
            >
              <div className="mode-card-top">
                <span className="mode-icon-circle">{m.icon}</span>
                <span className="mode-rule-badge">{m.rules}</span>
              </div>
              <b className="mode-card-title">{m.title}</b>
              <span className="mode-card-desc">{m.desc}</span>

              <div className="mode-card-footer">
                <span className="mode-tries-tag">
                  {m.tries} {m.tries === 1 ? 'Life' : 'Tries'}
                </span>
                <span className="mode-play-arrow">Play →</span>
              </div>
            </motion.button>
          );
        })}
      </div>
    </section>
  );
}
