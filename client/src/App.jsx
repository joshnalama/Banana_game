import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { api } from './api.js';
import Auth from './Auth.jsx';
import Game from './Game.jsx';
import Leaderboard from './Leaderboard.jsx';
import Profile from './Profile.jsx';

const TABS = [['play', 'Play'], ['board', 'Leaderboard'], ['me', 'Profile']];

export default function App() {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState('play');

  useEffect(() => {
    api('/api/auth/me').then((d) => setUser(d.user)).catch(() => {}).finally(() => setReady(true));
  }, []);

  if (!ready) return <div className="splash">🍌</div>;
  if (!user) return <Auth onAuth={setUser} />;

  const logout = async () => { await api('/api/auth/logout', { method: 'POST' }).catch(() => {}); setUser(null); setTab('play'); };

  return (
    <div className="app">
      <header className="top">
        <div className="brand"><span className="logo">🍌</span> Banana Digits</div>
        <nav>
          {TABS.map(([id, label]) => (
            <button key={id} className={tab === id ? 'tab on' : 'tab'} onClick={() => setTab(id)}>{label}</button>
          ))}
        </nav>
        <div className="who">
          <span className="pill" key={user.score}>{user.avatar} {user.username} · <b>{user.score}</b> pts</span>
          <button className="ghost" onClick={logout}>Log out</button>
        </div>
      </header>
      <main>
        <AnimatePresence mode="wait">
          <motion.div key={tab} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>
            {tab === 'play' && <Game onScore={(score) => setUser((u) => ({ ...u, score }))} />}
            {tab === 'board' && <Leaderboard />}
            {tab === 'me' && <Profile onAvatar={(avatar) => setUser((u) => ({ ...u, avatar }))} />}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
