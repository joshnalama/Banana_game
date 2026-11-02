import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { api } from './services/api.js';
import { soundEngine } from './services/soundEngine.js';
import { eventBus } from './services/eventBus.js';
import Game from './Game.jsx';
import MultiplayerArena from './components/MultiplayerArena.jsx';
import Leaderboard from './Leaderboard.jsx';
import Profile from './Profile.jsx';
import IdentityPromptModal from './components/IdentityPromptModal.jsx';
import CinematicIntroModal from './components/CinematicIntroModal.jsx';

const TABS = [
  ['play', '🍍 Arcade'],
  ['duel', '⚔️ 1v1 Duel'],
  ['board', '🏆 Hall of Fame'],
  ['me', '👤 Fry Cook Profile'],
];

export default function App() {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState('play');
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showIntroModal, setShowIntroModal] = useState(false);
  const [isMuted, setIsMuted] = useState(soundEngine.isMuted());

  useEffect(() => {
    // Attempt session resume
    api('/api/auth/me')
      .then((d) => setUser(d.user))
      .catch(() => {
        // Not logged in -> prompt auth or instant guest
        setShowAuthModal(true);
      })
      .finally(() => {
        setReady(true);
        // Check if intro has been seen
        if (!localStorage.getItem('spongebob_intro_seen')) {
          setShowIntroModal(true);
          localStorage.setItem('spongebob_intro_seen', 'true');
        }
      });
  }, []);

  const handleToggleSound = () => {
    const nextMuted = soundEngine.toggleMute();
    setIsMuted(nextMuted);
    if (!nextMuted) {
      eventBus.emit('audio:play', { sound: 'bubble' });
    }
  };

  const handleLogout = async () => {
    await api('/api/auth/logout', { method: 'POST' }).catch(() => {});
    setUser(null);
    setTab('play');
    setShowAuthModal(true);
  };

  if (!ready) {
    return (
      <div className="ocean-splash-screen">
        <span className="splash-character">🧽</span>
        <span className="splash-text">Entering Bikini Bottom…</span>
      </div>
    );
  }

  return (
    <div className="ocean-app-wrapper">
      {/* Whimsical Bikini Bottom Floating Flower Clouds */}
      <div className="flower-cloud cloud-1" />
      <div className="flower-cloud cloud-2" />
      <div className="flower-cloud cloud-3" />

      {/* Floating Ocean Bubbles */}
      <div className="ocean-bubbles-ambient" aria-hidden="true">
        {Array.from({ length: 14 }, (_, i) => (
          <span
            key={i}
            className="ambient-bubble"
            style={{
              left: `${(i * 13 + 7) % 95}%`,
              animationDelay: `${(i * 0.45) % 4}s`,
              animationDuration: `${5 + (i % 4) * 2}s`,
              transform: `scale(${0.5 + (i % 3) * 0.3})`,
            }}
          />
        ))}
      </div>

      {/* Top Nautical Header */}
      <header className="nautical-header">
        <div className="header-brand" onClick={() => setTab('play')}>
          <span className="brand-icon">🍍</span>
          <div className="brand-title-group">
            <span className="brand-main">BIKINI BOTTOM MATH LAB</span>
            <span className="brand-sub">SpongeBob Quantum Banana Game</span>
          </div>
        </div>

        <nav className="header-nav">
          {TABS.map(([id, label]) => (
            <button
              key={id}
              className={`nav-tab-btn ${tab === id ? 'is-active' : ''}`}
              onClick={() => {
                eventBus.emit('audio:play', { sound: 'bubble' });
                setTab(id);
              }}
            >
              {label}
            </button>
          ))}
        </nav>

        {/* Right utility buttons */}
        <div className="header-actions">
          {/* Audio toggle button */}
          <button
            className="header-icon-btn"
            onClick={handleToggleSound}
            title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
          >
            {isMuted ? '🔇' : '🔊'}
          </button>

          {/* Cinematic Intro replay button */}
          <button
            className="header-icon-btn"
            onClick={() => {
              eventBus.emit('audio:play', { sound: 'bubble' });
              setShowIntroModal(true);
            }}
            title="Watch Cinematic Intro"
          >
            🎬 Intro
          </button>

          {user ? (
            <div className="user-profile-pill">
              <span className="user-avatar-tag">{user.avatar}</span>
              <span className="user-name-tag">{user.username}</span>
              <span className="user-score-tag"><b>{user.score}</b> PTS</span>
              <button className="user-logout-link" onClick={handleLogout} title="Log Out">
                ✕
              </button>
            </div>
          ) : (
            <button
              className="sign-in-pill-btn"
              onClick={() => setShowAuthModal(true)}
            >
              Log In / Guest 🚀
            </button>
          )}
        </div>
      </header>

      {/* Main Content View with Smooth Page Transitions */}
      <main className="main-viewport">
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.22 }}
          >
            {tab === 'play' && (
              <Game
                user={user}
                onScore={(newScore) => setUser((prev) => (prev ? { ...prev, score: newScore } : prev))}
              />
            )}

            {tab === 'duel' && (
              user ? (
                <MultiplayerArena
                  user={user}
                  onExit={() => setTab('play')}
                />
              ) : (
                <div className="guest-login-required-card">
                  <h2>⚓ DUEL ARENA REQUIRES VIRTUAL IDENTITY</h2>
                  <p>Choose an instant guest nickname or sign in to challenge other players!</p>
                  <button className="action-btn-primary" onClick={() => setShowAuthModal(true)}>
                    Enter Virtual Identity Portal
                  </button>
                </div>
              )
            )}

            {tab === 'board' && <Leaderboard />}

            {tab === 'me' && (
              <Profile
                onAvatarChange={(avatar) => setUser((prev) => (prev ? { ...prev, avatar } : prev))}
                onOpenAuth={() => setShowAuthModal(true)}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Virtual Identity Auth Modal */}
      <IdentityPromptModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onAuthenticated={(authenticatedUser) => {
          setUser(authenticatedUser);
          setShowAuthModal(false);
        }}
      />

      {/* Cinematic Theater Intro Modal */}
      <CinematicIntroModal
        isOpen={showIntroModal}
        onClose={() => setShowIntroModal(false)}
      />
    </div>
  );
}
