import { motion } from 'framer-motion';
import { MODES, MODE_LIST } from './modes.js';

export default function ModePicker({ onPick }) {
  return (
    <section>
      <h2 className="pick-title">Choose how to play</h2>
      <div className="modes">
        {MODE_LIST.map((id, i) => {
          const m = MODES[id];
          return (
            <motion.button key={id} className="mode" onClick={() => onPick(id)}
              initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08, type: 'spring', stiffness: 260, damping: 22 }}
              whileHover={{ y: -6, rotate: -1 }} whileTap={{ scale: 0.96 }}>
              <span className="mode-icon">{m.icon}</span>
              <b>{m.title}</b>
              <span>{m.desc}</span>
              <small>{m.rules}</small>
            </motion.button>
          );
        })}
      </div>
    </section>
  );
}
