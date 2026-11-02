import { useEffect, useState } from 'react';
import { api } from './services/api.js';
import { eventBus } from './services/eventBus.js';

export default function Profile({ onAvatarChange, onOpenAuth }) {
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    api('/api/profile')
      .then(setData)
      .catch((e) => setErr(e.message));
  }, []);

  const handlePickAvatar = async (avatar) => {
    try {
      await api('/api/profile', { method: 'PATCH', body: { avatar } });
      setData((prev) => ({
        ...prev,
        profile: { ...prev.profile, avatar },
      }));
      onAvatarChange(avatar);
      eventBus.emit('audio:play', { sound: 'fanfare' });
    } catch (e) {
      setErr(e.message);
    }
  };

  if (err) return <div className="arena-error-box">{err}</div>;
  if (!data) return <div className="card-box"><div className="skeleton-loading-tall" /></div>;

  const p = data.profile;
  const stats = [
    { label: 'Overall Score', val: `${p.score} pts`, icon: '🍍' },
    { label: 'Bikini Rank', val: `#${p.rank}`, icon: '🏅' },
    { label: 'Puzzles Solved', val: p.rounds_won, icon: '🍔' },
    { label: 'Accuracy', val: `${p.accuracy}%`, icon: '🎯' },
    { label: 'Best Combo Streak', val: `${p.best_streak}x`, icon: '🔥' },
    { label: 'Total Matches', val: p.totalGames || (p.rounds_won + p.rounds_lost), icon: '🫧' },
  ];

  return (
    <div className="profile-wrapper">
      <div className="profile-card">
        {/* Avatar Hero */}
        <div className="profile-hero-banner">
          <div className="profile-avatar-circle">{p.avatar}</div>
          <h2>{p.username}</h2>
          <div className="profile-badges-row">
            <span className="role-badge">{p.role === 'admin' ? '👑 Admin' : '⭐ Fry Cook'}</span>
            {p.is_guest ? (
              <span className="guest-badge">Guest Account</span>
            ) : (
              <span className="registered-badge">Verified Cook</span>
            )}
          </div>
          {p.email && <p className="profile-email-text">{p.email}</p>}
        </div>

        {/* Guest conversion banner */}
        {p.is_guest && (
          <div className="guest-upgrade-banner">
            <div>
              <b>You are playing on an Instant Guest session!</b>
              <p>Create a permanent account to protect your high score across devices.</p>
            </div>
            <button className="action-btn-primary" onClick={onOpenAuth}>
              Save Identity
            </button>
          </div>
        )}

        {/* Stats Grid */}
        <div className="profile-stats-grid">
          {stats.map((s, i) => (
            <div key={i} className="profile-stat-box">
              <span className="stat-icon-mini">{s.icon}</span>
              <b className="stat-number">{s.val}</b>
              <span className="stat-label-text">{s.label}</span>
            </div>
          ))}
        </div>

        {/* SpongeBob Avatar Customizer */}
        <div className="avatar-selection-panel">
          <h3>Choose Bikini Bottom Character</h3>
          <p className="avatar-panel-subtitle">Select your cartoon avatar for leaderboards and duels:</p>
          <div className="avatar-buttons-grid">
            {data.avatars.map((a) => (
              <button
                key={a}
                className={`avatar-choice-btn ${a === p.avatar ? 'is-active' : ''}`}
                onClick={() => handlePickAvatar(a)}
                title={`Use ${a}`}
              >
                {a}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
