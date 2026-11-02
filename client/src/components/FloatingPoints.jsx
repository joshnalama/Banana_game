import { motion, AnimatePresence } from 'framer-motion';

export default function FloatingPoints({ triggerKey, points = 100, combo = 1 }) {
  if (!triggerKey) return null;

  return (
    <AnimatePresence>
      <div className="floating-points-layer" key={triggerKey}>
        <motion.div
          className="floating-score-badge"
          initial={{ opacity: 0, y: 15, scale: 0.6 }}
          animate={{ opacity: 1, y: -50, scale: [0.6, 1.25, 1.1] }}
          exit={{ opacity: 0, y: -90, scale: 0.8 }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
        >
          <span className="pts-val">+{points} PTS!</span>
          {combo > 1 && <span className="pts-combo">⚡ {combo}x COMBO</span>}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
