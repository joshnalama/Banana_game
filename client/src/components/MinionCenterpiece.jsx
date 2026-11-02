import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { eventBus } from '../services/eventBus.js';
import { SPONGEBOB_QUOTES } from '../../../shared/src/constants.js';

export default function MinionCenterpiece({ streak = 0, onPoke }) {
  const [quoteIndex, setQuoteIndex] = useState(0);
  const [eyePos, setEyePos] = useState({ x: 0, y: 0 });
  const [isPoked, setIsPoked] = useState(false);
  const containerRef = useRef(null);

  // Mouse gaze tracking
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      const deltaX = e.clientX - centerX;
      const deltaY = e.clientY - centerY;
      const angle = Math.atan2(deltaY, deltaX);
      const distance = Math.min(Math.hypot(deltaX, deltaY) / 25, 6);

      setEyePos({
        x: Math.cos(angle) * distance,
        y: Math.sin(angle) * distance,
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Periodic speech quote rotation
  useEffect(() => {
    const timer = setInterval(() => {
      setQuoteIndex((prev) => (prev + 1) % SPONGEBOB_QUOTES.length);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  const handleCharacterClick = () => {
    setIsPoked(true);
    setTimeout(() => setIsPoked(false), 450);
    setQuoteIndex((prev) => (prev + 1) % SPONGEBOB_QUOTES.length);
    eventBus.emit('audio:play', { sound: 'giggle' });
    onPoke?.();
  };

  return (
    <div className="spongebob-centerpiece-wrapper" ref={containerRef}>
      {/* Speech Telemetry Bubble */}
      <motion.div
        className="speech-telemetry"
        key={quoteIndex}
        initial={{ opacity: 0, y: 10, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.3 }}
      >
        <span className="telemetry-badge">QUANTUM TELEMETRY</span>
        <p className="telemetry-quote">“{SPONGEBOB_QUOTES[quoteIndex]}”</p>
      </motion.div>

      {/* 3D Holographic Orbit Ring */}
      <div className="holographic-orbit-ring" />
      <div className="holographic-orbit-ring inner" />

      {/* SpongeBob Quantum Scientist SVG Character */}
      <motion.div
        className="spongebob-model"
        onClick={handleCharacterClick}
        animate={
          isPoked
            ? { scale: [1, 0.88, 1.12, 1], rotate: [0, -5, 5, 0] }
            : { y: [0, -8, 0] }
        }
        transition={
          isPoked
            ? { duration: 0.45, ease: 'easeInOut' }
            : { repeat: Infinity, duration: 3.5, ease: 'easeInOut' }
        }
      >
        <svg
          viewBox="0 0 240 280"
          className="spongebob-svg"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* Sponge Sponge Gradient */}
            <radialGradient id="spongeYellow" cx="40%" cy="30%" r="70%">
              <stop offset="0%" stop-color="#fff176" />
              <stop offset="65%" stop-color="#fee135" />
              <stop offset="100%" stop-color="#e0b91f" />
            </radialGradient>
            {/* Arc Reactor Glow */}
            <radialGradient id="arcReactorGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stop-color="#38bdf8" />
              <stop offset="50%" stop-color="#0284c7" />
              <stop offset="100%" stop-color="#0369a1" />
            </radialGradient>
            <filter id="glowFilter" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Legs & Shoes */}
          <rect x="80" y="210" width="16" height="35" fill="#fee135" stroke="#134074" strokeWidth="3" />
          <rect x="144" y="210" width="16" height="35" fill="#fee135" stroke="#134074" strokeWidth="3" />
          {/* Socks */}
          <rect x="78" y="230" width="20" height="15" fill="#ffffff" stroke="#134074" strokeWidth="2" />
          <rect x="142" y="230" width="20" height="15" fill="#ffffff" stroke="#134074" strokeWidth="2" />
          <line x1="78" y1="235" x2="98" y2="235" stroke="#38bdf8" strokeWidth="2" />
          <line x1="78" y1="239" x2="98" y2="239" stroke="#ef4444" strokeWidth="2" />
          <line x1="142" y1="235" x2="162" y2="235" stroke="#38bdf8" strokeWidth="2" />
          <line x1="142" y1="239" x2="162" y2="239" stroke="#ef4444" strokeWidth="2" />
          {/* Shoes */}
          <ellipse cx="80" cy="250" rx="16" ry="9" fill="#0b1d2e" stroke="#134074" strokeWidth="2" />
          <ellipse cx="160" cy="250" rx="16" ry="9" fill="#0b1d2e" stroke="#134074" strokeWidth="2" />

          {/* Golden Spatula in Right Hand */}
          <g transform="translate(185, 95) rotate(15)">
            <rect x="12" y="10" width="6" height="60" rx="3" fill="#94a3b8" stroke="#134074" strokeWidth="2" />
            <rect x="5" y="-5" width="20" height="24" rx="4" fill="#f59e0b" stroke="#134074" strokeWidth="2" />
            <line x1="10" y1="0" x2="10" y2="12" stroke="#134074" strokeWidth="2" />
            <line x1="15" y1="0" x2="15" y2="12" stroke="#134074" strokeWidth="2" />
            <line x1="20" y1="0" x2="20" y2="12" stroke="#134074" strokeWidth="2" />
          </g>

          {/* Left Arm Waving */}
          <path d="M 40 130 Q 15 110 25 80" fill="none" stroke="#fee135" strokeWidth="12" strokeLinecap="round" />
          <circle cx="25" cy="80" r="10" fill="#fee135" stroke="#134074" strokeWidth="2" />

          {/* Sponge Body */}
          <rect
            x="40"
            y="30"
            width="160"
            height="150"
            rx="16"
            fill="url(#spongeYellow)"
            stroke="#134074"
            strokeWidth="4"
          />

          {/* Sponge Pores */}
          <circle cx="55" cy="50" r="9" fill="#cfa419" opacity="0.6" />
          <circle cx="180" cy="48" r="11" fill="#cfa419" opacity="0.6" />
          <circle cx="62" cy="140" r="7" fill="#cfa419" opacity="0.6" />
          <circle cx="178" cy="145" r="10" fill="#cfa419" opacity="0.6" />
          <circle cx="120" cy="42" r="6" fill="#cfa419" opacity="0.5" />

          {/* Eyes (Gaze-Tracking) */}
          <g>
            {/* Left Eye Whites */}
            <circle cx="90" cy="80" r="28" fill="#ffffff" stroke="#134074" strokeWidth="3" />
            {/* Left Eye Iris & Pupil with gaze tracking */}
            <circle cx={90 + eyePos.x} cy={80 + eyePos.y} r="13" fill="#38bdf8" />
            <circle cx={90 + eyePos.x} cy={80 + eyePos.y} r="7" fill="#0b1d2e" />
            <circle cx={88 + eyePos.x} cy={77 + eyePos.y} r="3" fill="#ffffff" />
            {/* Left Eyelashes */}
            <line x1="80" y1="52" x2="75" y2="42" stroke="#134074" strokeWidth="3" strokeLinecap="round" />
            <line x1="90" y1="50" x2="90" y2="40" stroke="#134074" strokeWidth="3" strokeLinecap="round" />
            <line x1="100" y1="52" x2="105" y2="42" stroke="#134074" strokeWidth="3" strokeLinecap="round" />

            {/* Right Eye Whites */}
            <circle cx="145" cy="80" r="28" fill="#ffffff" stroke="#134074" strokeWidth="3" />
            {/* Right Eye Iris & Pupil with gaze tracking */}
            <circle cx={145 + eyePos.x} cy={80 + eyePos.y} r="13" fill="#38bdf8" />
            <circle cx={145 + eyePos.x} cy={80 + eyePos.y} r="7" fill="#0b1d2e" />
            <circle cx={143 + eyePos.x} cy={77 + eyePos.y} r="3" fill="#ffffff" />
            {/* Right Eyelashes */}
            <line x1="135" y1="52" x2="130" y2="42" stroke="#134074" strokeWidth="3" strokeLinecap="round" />
            <line x1="145" y1="50" x2="145" y2="40" stroke="#134074" strokeWidth="3" strokeLinecap="round" />
            <line x1="155" y1="52" x2="160" y2="42" stroke="#134074" strokeWidth="3" strokeLinecap="round" />
          </g>

          {/* Cute Nose */}
          <path d="M 118 85 Q 128 85 125 102 Q 115 104 115 90" fill="#fee135" stroke="#134074" strokeWidth="3" />

          {/* Freckled Cheeks */}
          <circle cx="68" cy="100" r="8" fill="#f87171" opacity="0.4" />
          <circle cx="64" cy="98" r="1.5" fill="#b91c1c" />
          <circle cx="68" cy="96" r="1.5" fill="#b91c1c" />
          <circle cx="71" cy="101" r="1.5" fill="#b91c1c" />

          <circle cx="170" cy="100" r="8" fill="#f87171" opacity="0.4" />
          <circle cx="166" cy="98" r="1.5" fill="#b91c1c" />
          <circle cx="170" cy="96" r="1.5" fill="#b91c1c" />
          <circle cx="173" cy="101" r="1.5" fill="#b91c1c" />

          {/* Cheerful Smile with Two Front Teeth */}
          <path d="M 80 108 Q 118 135 156 108" fill="none" stroke="#134074" strokeWidth="4" strokeLinecap="round" />
          {/* Two Front Teeth */}
          <rect x="108" y="112" width="10" height="12" rx="2" fill="#ffffff" stroke="#134074" strokeWidth="2" />
          <rect x="122" y="112" width="10" height="12" rx="2" fill="#ffffff" stroke="#134074" strokeWidth="2" />

          {/* Shirt & Tie Collar */}
          <rect x="42" y="172" width="156" height="20" fill="#ffffff" stroke="#134074" strokeWidth="3" />
          {/* Collar flaps */}
          <polygon points="100,172 118,185 106,185" fill="#ffffff" stroke="#134074" strokeWidth="2" />
          <polygon points="140,172 122,185 134,185" fill="#ffffff" stroke="#134074" strokeWidth="2" />
          {/* Red Tie */}
          <polygon points="115,180 125,180 130,205 120,215 110,205" fill="#ef4444" stroke="#134074" strokeWidth="2" />

          {/* Brown Square Pants */}
          <rect x="42" y="190" width="156" height="24" fill="#a16207" stroke="#134074" strokeWidth="3" />
          {/* Black Belt Dashes */}
          <line x1="55" y1="195" x2="70" y2="195" stroke="#0b1d2e" strokeWidth="3" />
          <line x1="85" y1="195" x2="100" y2="195" stroke="#0b1d2e" strokeWidth="3" />
          <line x1="140" y1="195" x2="155" y2="195" stroke="#0b1d2e" strokeWidth="3" />
          <line x1="170" y1="195" x2="185" y2="195" stroke="#0b1d2e" strokeWidth="3" />

          {/* Pulsing Quantum Arc Reactor / Jellyfish Core on Center */}
          <g transform="translate(120, 155)" filter="url(#glowFilter)">
            <circle cx="0" cy="0" r="14" fill="url(#arcReactorGlow)" stroke="#38bdf8" strokeWidth="2" />
            <circle cx="0" cy="0" r="8" fill="#e0f2fe" opacity="0.8" />
            {/* Spinning reactor core blades */}
            <circle cx="0" cy="0" r="3" fill="#ffffff" />
          </g>
        </svg>

        {/* Dynamic Streak Badge */}
        {streak > 0 && (
          <motion.div
            className="streak-bubble-badge"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 350, damping: 15 }}
          >
            🔥 {streak}x COMBO
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
