import { useEffect, useState } from 'react';
import { api } from './api.js';

export default function Profile({ onAvatar }) {
  const [d, setD] = useState(null);
  const [err, setErr] = useState('');
  useEffect(() => { api('/api/profile').then(setD).catch((e) => setErr(e.message)); }, []);

  async function pick(avatar) {
    try { await api('/api/profile', { method: 'PATCH', body: { avatar } }); setD({ ...d, profile: { ...d.profile, avatar } }); onAvatar(avatar); }
    catch (e) { setErr(e.message); }
  }

  if (err) return <div className="error">{err}</div>;
  if (!d) return <div className="card"><div className="skeleton tall" /></div>;
  const p = d.profile;
  const stats = [['Score', p.score], ['Rank', `#${p.rank}`], ['Solved', p.rounds_won], ['Accuracy', `${p.accuracy}%`], ['Best streak', p.best_streak]];

  return (
    <div className="card profile">
      <div className="avatar" key={p.avatar}>{p.avatar}</div>
      <h2>{p.username}</h2>
      <p className="muted">{p.email} · Joined {new Date(p.created_at * 1000).toLocaleDateString()}</p>
      <div className="stats">{stats.map(([k, v]) => <div key={k}><b>{v}</b><span>{k}</span></div>)}</div>
      <h3>Choose avatar</h3>
      <div className="avatars">{d.avatars.map((a) => (
        <button key={a} className={a === p.avatar ? 'on' : ''} onClick={() => pick(a)} aria-label={`Use ${a}`}>{a}</button>))}</div>
    </div>
  );
}
