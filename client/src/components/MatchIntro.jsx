import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { eventBus } from '../services/eventBus.js';

export default function MatchIntro({ onComplete, title = "I'M READY!" }) {
  const [count, setCount] = useState(3);

  useEffect(() => {
    eventBus.emit('audio:play', { sound: 'countdown_tick' });

    const timer = setInterval(() => {
      setCount((prev) => {
        if (prev === 1) {
          eventBus.emit('audio:play', { sound: 'countdown_go' });
          return 0; // "SOLVE!"
        }
        if (prev <= 0) {
          clearInterval(timer);
          onComplete();
          return 0;
        }
        eventBus.emit('audio:play', { sound: 'countdown_tick' });
        return prev - 1;
      });
    }, 900);

    // Spacebar bypass listener
    const handleKeyDown = (e) => {
      if (e.code === 'Space') {
        clearInterval(timer);
        eventBus.emit('audio:play', { sound: 'countdown_go' });
        onComplete();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      clearInterval(timer);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onComplete]);

  return (
    <div className="match-intro-overlay" onClick={onComplete}>
      {/* Bubble Particle Field */}
      <div className="countdown-bubble-field">
        {Array.from({ length: 18 }, (_, i) => (
          <span
            key={i}
            className="countdown-bubble"
            style={{
              left: `${(i * 17) % 100}%`,
              animationDelay: `${(i * 0.18) % 2}s`,
              transform: `scale(${0.6 + (i % 4) * 0.25})`,
            }}
          />
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={count}
          className="countdown-number-box"
          initial={{ scale: 0.2, opacity: 0, rotate: -20 }}
          animate={{ scale: 1, opacity: 1, rotate: 0 }}
          exit={{ scale: 1.8, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 450, damping: 18 }}
        >
          {count > 0 ? (
            <span className="count-number">{count}</span>
          ) : (
            <span className="count-solve">{title}</span>
          )}
        </motion.div>
      </AnimatePresence>

      <div className="countdown-bypass-hint">
        Press <kbd>SPACE</kbd> or Click anywhere to skip
      </div>
    </div>
  );
}
