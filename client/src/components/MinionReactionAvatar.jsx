import { motion, AnimatePresence } from 'framer-motion';

export default function MinionReactionAvatar({ streak = 0, isWrong = false, avatarIcon = '🧽' }) {
  // Reaction states:
  // 1. wrong: 'Barnacles!' (disappointed)
  // 2. streak >= 3: 'I'm Ready! 🔥' (celebratory)
  // 3. streak >= 1: 'Focused 🎯'
  // 4. streak == 0: 'Calm 🫧'

  let state = 'calm';
  let moodLabel = 'Calm';
  let badgeColor = '#8da9c4';

  if (isWrong) {
    state = 'wrong';
    moodLabel = 'Barnacles!';
    badgeColor = '#ef4444';
  } else if (streak >= 3) {
    state = 'celebratory';
    moodLabel = "I'm Ready! 🔥";
    badgeColor = '#f59e0b';
  } else if (streak >= 1) {
    state = 'focused';
    moodLabel = 'Focused 🎯';
    badgeColor = '#10b981';
  }

  return (
    <div className="reaction-avatar-container">
      <AnimatePresence mode="wait">
        <motion.div
          key={state}
          className={`reaction-avatar-circle mood-${state}`}
          initial={{ scale: 0.8, rotate: isWrong ? -15 : 0 }}
          animate={{ scale: 1, rotate: 0 }}
          exit={{ scale: 0.8 }}
          transition={{ type: 'spring', stiffness: 350, damping: 20 }}
        >
          <span className="reaction-emoji">{avatarIcon}</span>
          {streak >= 3 && <span className="reaction-crown">👑</span>}
        </motion.div>
      </AnimatePresence>

      <div className="reaction-mood-pill" style={{ borderColor: badgeColor, color: badgeColor }}>
        {moodLabel}
      </div>
    </div>
  );
}

