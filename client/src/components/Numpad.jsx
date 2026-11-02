import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { eventBus } from '../services/eventBus.js';

export default function Numpad({ onDigit, disabled = false, wrongDigits = [] }) {
  // Physical keyboard binding
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (disabled) return;
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      const digit = parseInt(e.key, 10);
      if (!isNaN(digit) && digit >= 0 && digit <= 9) {
        if (!wrongDigits.includes(digit)) {
          eventBus.emit('audio:play', { sound: 'numpad' });
          onDigit(digit);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [disabled, wrongDigits, onDigit]);

  const handleDigitClick = (digit) => {
    if (disabled || wrongDigits.includes(digit)) return;
    eventBus.emit('audio:play', { sound: 'numpad' });
    onDigit(digit);
  };

  return (
    <div className="arcade-numpad-grid">
      {Array.from({ length: 10 }, (_, idx) => {
        // Layout: 1-9 in 3x3 grid, 0 centered at bottom
        const digit = idx === 9 ? 0 : idx + 1;
        const isWrong = wrongDigits.includes(digit);

        return (
          <motion.button
            key={digit}
            className={`arcade-numpad-key ${isWrong ? 'key-wrong' : ''} ${digit === 0 ? 'key-zero' : ''}`}
            disabled={disabled || isWrong}
            onClick={() => handleDigitClick(digit)}
            whileHover={!disabled && !isWrong ? { scale: 1.06, y: -3 } : {}}
            whileTap={!disabled && !isWrong ? { scale: 0.92, y: 3 } : {}}
            transition={{ type: 'spring', stiffness: 450, damping: 20 }}
          >
            <span className="numpad-digit">{digit}</span>
            {isWrong && <span className="numpad-strikethrough">✕</span>}
          </motion.button>
        );
      })}
    </div>
  );
}
