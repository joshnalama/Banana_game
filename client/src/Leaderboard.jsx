import { useEffect, useState } from 'react';
import { api } from './api.js';

export default function Leaderboard() {
  const [players, setPlayers] = useState(null);
  const [err, setErr] = useState('');
  useEffect(() => { api('/api/leaderboard').then((d) => setPlayers(d.players)).catch((e) => setErr(e.message)); }, []);

  if (err) return <div className="error">{err}</div>;
  if (!players) return <div className="card"><div className="skeleton tall" /></div>;
  if (!players.length) return <div className="card"><p>No scores yet. Solve a puzzle to take first place.</p></div>;
  const top = players[0].score || 1;
  const medal = ['🥇', '🥈', '🥉'];

  return (
    <div className="card board">
      <h2>Top players</h2>
      <ol>
        {players.map((p, i) => (
          <li key={p.username} className={p.me ? 'me' : ''} style={{ animationDelay: `${i * 60}ms` }}>
            <span className="rank">{medal[i] || i + 1}</span>
            <span className="name">{p.avatar} {p.username}{p.me && ' (you)'}</span>
            <span className="bar"><i style={{ width: `${(p.score / top) * 100}%`, animationDelay: `${i * 60 + 200}ms` }} /></span>
            <b>{p.score}</b>
          </li>
        ))}
      </ol>
    </div>
  );
}
