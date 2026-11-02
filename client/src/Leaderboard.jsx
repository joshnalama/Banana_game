import { useEffect, useState } from 'react';
import { api } from './services/api.js';
import { eventBus } from './services/eventBus.js';

export default function Leaderboard() {
  const [players, setPlayers] = useState(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    api('/api/leaderboard')
      .then((d) => setPlayers(d.players))
      .catch((e) => setErr(e.message));
  }, []);

  const medals = ['🥇', '🥈', '🥉'];

  if (err) return <div className="arena-error-box">{err}</div>;
  if (!players) {
    return (
      <div className="card-box">
        <div className="skeleton-loading-tall" />
      </div>
    );
  }

  const topScore = players[0]?.score || 1;

  return (
    <div className="leaderboard-wrapper">
      <div className="leaderboard-header">
        <h2>🏆 BIKINI BOTTOM HALL OF FAME</h2>
        <p>Top mathematical fry cooks ranked by cumulative score and accuracy.</p>
      </div>

      <div className="leaderboard-card">
        {players.length === 0 ? (
          <p className="empty-board-msg">
            No fry cooks on the board yet! Solve a puzzle in Arcade mode to claim #1.
          </p>
        ) : (
          <ol className="leaderboard-list">
            {players.map((p, i) => (
              <li
                key={p.username}
                className={`leaderboard-row ${p.me ? 'is-me' : ''}`}
                style={{ animationDelay: `${i * 45}ms` }}
                onClick={() => eventBus.emit('audio:play', { sound: 'bubble' })}
              >
                <span className="rank-position">{medals[i] || `#${i + 1}`}</span>

                <div className="player-identity-col">
                  <span className="player-avatar-badge">{p.avatar}</span>
                  <div className="player-name-group">
                    <span className="player-username">
                      {p.username} {p.me && <b className="you-tag">(YOU)</b>}
                    </span>
                    <span className="player-stats-mini">
                      Solved: {p.won} · Best Streak: {p.bestStreak || 0}x
                    </span>
                  </div>
                </div>

                <div className="player-score-bar-col">
                  <div className="score-meter-track">
                    <div
                      className="score-meter-fill"
                      style={{ width: `${Math.min(100, (p.score / topScore) * 100)}%` }}
                    />
                  </div>
                </div>

                <div className="player-points-col">
                  <b>{p.score}</b>
                  <small>PTS</small>
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}
