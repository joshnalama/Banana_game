import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { api } from '../services/api.js';
import { eventBus } from '../services/eventBus.js';
import Numpad from './Numpad.jsx';
import MatchIntro from './MatchIntro.jsx';

export default function MultiplayerArena({ user, onExit }) {
  const [room, setRoom] = useState(null);
  const [roomCodeInput, setRoomCodeInput] = useState('');
  const [selectedDuration, setSelectedDuration] = useState(180); // 3, 5, or 7 mins (180, 300, 420)
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [showCountdown, setShowCountdown] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [copied, setCopied] = useState(false);
  const sseRef = useRef(null);

  // Auto-connect SSE stream when room is active
  useEffect(() => {
    if (!room?.code) return;

    const sseUrl = `/api/rooms/${room.code}/stream`;
    const sse = new EventSource(sseUrl, { withCredentials: true });
    sseRef.current = sse;

    sse.onerror = (e) => {
      // Reconnection or close notice
      console.warn('SSE stream notice:', e);
    };

    sse.addEventListener('room_state', (e) => {
      const data = JSON.parse(e.data);
      setRoom(data);
    });

    sse.addEventListener('player_joined', (e) => {
      const data = JSON.parse(e.data);
      setRoom(data.room);
      eventBus.emit('audio:play', { sound: 'fanfare' });
    });

    sse.addEventListener('countdown_start', () => {
      setShowCountdown(true);
    });

    sse.addEventListener('match_start', (e) => {
      const data = JSON.parse(e.data);
      setRoom(data.room);
      setShowCountdown(false);
      eventBus.emit('audio:play', { sound: 'countdown_go' });
    });

    sse.addEventListener('player_scored', (e) => {
      const data = JSON.parse(e.data);
      setRoom((prev) => {
        if (!prev) return prev;
        const updated = { ...prev };
        if (updated[data.role]) {
          updated[data.role].score = data.totalScore;
          updated[data.role].streak = data.streak;
          updated[data.role].solved = data.solved;
          if (data.newPuzzle) {
            updated[data.role].puzzleImage = data.newPuzzle.image;
            updated[data.role].puzzleId = data.newPuzzle.puzzleId;
          }
        }
        return updated;
      });

      if (data.userId === user?.id) {
        eventBus.emit('audio:play', { sound: 'correct', param: data.streak });
      } else {
        eventBus.emit('audio:play', { sound: 'bubble' });
      }
    });

    sse.addEventListener('player_missed', (e) => {
      const data = JSON.parse(e.data);
      if (data.userId === user?.id) {
        eventBus.emit('audio:play', { sound: 'wrong' });
      }
    });

    sse.addEventListener('match_forfeit', (e) => {
      const data = JSON.parse(e.data);
      setRoom(data.room);
      eventBus.emit('audio:play', { sound: 'fanfare' });
    });

    sse.addEventListener('match_finished', (e) => {
      const data = JSON.parse(e.data);
      setRoom(data.room);
      eventBus.emit('audio:play', { sound: 'fanfare' });
    });

    return () => {
      sse.close();
    };
  }, [room?.code, user?.id]);

  // Match timer loop
  useEffect(() => {
    if (room?.status !== 'active' || !room.endsAt) return;
    const interval = setInterval(() => {
      const remain = Math.max(0, Math.round((room.endsAt - Date.now()) / 1000));
      setTimeLeft(remain);
      if (remain <= 0) clearInterval(interval);
    }, 1000);
    return () => clearInterval(interval);
  }, [room?.status, room?.endsAt]);

  // Create duel room
  const handleCreateRoom = async () => {
    setBusy(true);
    setErrorMsg('');
    try {
      const res = await api('/api/rooms/create', {
        method: 'POST',
        body: { duration: selectedDuration },
      });
      setRoom(res.room);
      eventBus.emit('audio:play', { sound: 'bubble' });
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setBusy(false);
    }
  };

  // Join duel room
  const handleJoinRoom = async (codeToJoin) => {
    const code = (codeToJoin || roomCodeInput).trim().toUpperCase();
    if (!code) return;
    setBusy(true);
    setErrorMsg('');
    try {
      const res = await api(`/api/rooms/${code}/join`, { method: 'POST' });
      setRoom(res.room);
      eventBus.emit('audio:play', { sound: 'bubble' });
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setBusy(false);
    }
  };

  // Toggle ready status
  const handleToggleReady = async () => {
    if (!room) return;
    const isHost = room.host.id === user.id;
    const currentReady = isHost ? room.host.ready : room.guest?.ready;
    try {
      await api(`/api/rooms/${room.code}/ready`, {
        method: 'POST',
        body: { ready: !currentReady },
      });
      eventBus.emit('audio:play', { sound: 'click' });
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  // Submit Answer in duel
  const handleNumpadSubmit = async (digit) => {
    if (!room || room.status !== 'active') return;
    try {
      await api(`/api/rooms/${room.code}/answer`, {
        method: 'POST',
        body: { digit },
      });
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  // Forfeit duel
  const handleForfeit = async () => {
    if (!room) return;
    try {
      await api(`/api/rooms/${room.code}/forfeit`, { method: 'POST' });
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  const copyRoomCode = () => {
    if (!room?.code) return;
    navigator.clipboard?.writeText(room.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    eventBus.emit('audio:play', { sound: 'bubble' });
  };

  // Lobby view if not in a room
  if (!room) {
    return (
      <div className="multiplayer-lobby-container">
        <div className="lobby-header">
          <button className="hud-exit-btn" onClick={onExit}>
            ← Back to Menu
          </button>
          <h2>⚓ 1v1 BIKINI BOTTOM MULTIPLAYER DUEL</h2>
          <p>Challenge another fry cook in real-time split-screen duel via Server-Sent Events (SSE)!</p>
        </div>

        {errorMsg && <div className="arena-error-box">{errorMsg}</div>}

        <div className="lobby-cards-grid">
          {/* Create Room Card */}
          <div className="lobby-action-card">
            <span className="lobby-card-icon">🍍</span>
            <h3>Host a Duel Arena</h3>
            <p>Create a private arena and share the room code with your opponent.</p>

            <div className="duration-selector">
              <span>Match Duration:</span>
              <div className="duration-buttons">
                {[
                  { sec: 180, label: '3 Mins' },
                  { sec: 300, label: '5 Mins' },
                  { sec: 420, label: '7 Mins' },
                ].map((d) => (
                  <button
                    key={d.sec}
                    className={`duration-btn ${selectedDuration === d.sec ? 'active' : ''}`}
                    onClick={() => setSelectedDuration(d.sec)}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>

            <button
              className="action-btn-primary"
              disabled={busy}
              onClick={handleCreateRoom}
            >
              {busy ? 'Preparing Arena…' : 'Create Arena Room 🚀'}
            </button>
          </div>

          {/* Join Room Card */}
          <div className="lobby-action-card">
            <span className="lobby-card-icon">🪼</span>
            <h3>Join Existing Arena</h3>
            <p>Enter the 6-character room code from your fellow duelist.</p>

            <div className="join-code-input-row">
              <input
                type="text"
                placeholder="ROOM CODE (e.g. KRABBY)"
                maxLength={6}
                value={roomCodeInput}
                onChange={(e) => setRoomCodeInput(e.target.value.toUpperCase())}
                className="room-code-input"
              />
              <button
                className="action-btn-primary"
                disabled={busy || !roomCodeInput.trim()}
                onClick={() => handleJoinRoom()}
              >
                Join Duel
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const isHost = room.host.id === user.id;
  const myData = isHost ? room.host : room.guest;
  const opponentData = isHost ? room.guest : room.host;

  return (
    <div className="multiplayer-arena-container">
      {showCountdown && <MatchIntro onComplete={() => setShowCountdown(false)} title="DUEL BEGINS!" />}

      {/* Room Header Banner */}
      <div className="duel-header-bar">
        <div className="duel-room-badge">
          <span>ARENA: </span>
          <b className="room-code-text" onClick={copyRoomCode} title="Click to copy">
            {room.code}
          </b>
          <button className="copy-code-btn" onClick={copyRoomCode}>
            {copied ? '✓ Copied' : '📋 Copy'}
          </button>
        </div>

        <div className="duel-status-pill">
          {room.status === 'waiting' && '⏳ WAITING FOR DUELIST'}
          {room.status === 'countdown' && '🚨 GET READY!'}
          {room.status === 'active' && `⚔️ ACTIVE MATCH · ${timeLeft}s LEFT`}
          {room.status === 'finished' && '🏆 MATCH CONCLUDED'}
        </div>

        <button className="hud-exit-btn" onClick={onExit}>
          Leave Arena
        </button>
      </div>

      {/* Match Result Overlay if finished */}
      {room.status === 'finished' && (
        <motion.div
          className="duel-victory-overlay"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
        >
          <h2>{room.winner === user.username ? '🏆 VICTORY IS YOURS!' : '⚓ MATCH RECAP'}</h2>
          <p>Winner: <b style={{ color: '#fee135' }}>{room.winner}</b></p>
          <div className="duel-final-scores">
            <div>
              <span>{room.host.avatar} {room.host.username}</span>
              <b>{room.host.score} pts</b>
            </div>
            <div className="score-vs-divider">VS</div>
            <div>
              <span>{room.guest ? `${room.guest.avatar} ${room.guest.username}` : 'No Opponent'}</span>
              <b>{room.guest?.score || 0} pts</b>
            </div>
          </div>
          <button className="action-btn-primary" onClick={() => setRoom(null)}>
            Back to Multiplayer Lobby
          </button>
        </motion.div>
      )}

      {/* Split-Screen 1v1 Arena */}
      <div className="duel-split-stage">
        {/* Left Side: You */}
        <div className="duel-player-pane my-pane">
          <div className="duel-player-header">
            <span className="player-avatar-large">{myData?.avatar || '🧽'}</span>
            <div>
              <h3>{myData?.username || 'You'} (YOU)</h3>
              <span className="player-stats-sub">
                Score: <b>{myData?.score || 0}</b> · Solved: {myData?.solved || 0} · Streak: {myData?.streak || 0}x
              </span>
            </div>
          </div>

          {room.status === 'waiting' && (
            <div className="waiting-ready-box">
              <button
                className={`ready-toggle-btn ${myData?.ready ? 'is-ready' : ''}`}
                onClick={handleToggleReady}
              >
                {myData?.ready ? '✓ READY TO DUEL!' : 'READY UP'}
              </button>
            </div>
          )}

          {room.status === 'active' && (
            <div className="duel-active-content">
              {myData?.puzzleImage && (
                <div className="duel-puzzle-box">
                  <img src={myData.puzzleImage} alt="Your Duel Puzzle" className="duel-img" />
                </div>
              )}
              <Numpad onDigit={handleNumpadSubmit} />
              <button className="forfeit-btn" onClick={handleForfeit}>
                Surrender Match
              </button>
            </div>
          )}
        </div>

        {/* Right Side: Opponent (Live SSE Telemetry) */}
        <div className="duel-player-pane opponent-pane">
          <div className="duel-player-header">
            <span className="player-avatar-large">{opponentData?.avatar || '❓'}</span>
            <div>
              <h3>{opponentData?.username || 'Waiting for Opponent…'}</h3>
              <span className="player-stats-sub">
                Score: <b>{opponentData?.score || 0}</b> · Solved: {opponentData?.solved || 0} · Streak: {opponentData?.streak || 0}x
              </span>
            </div>
          </div>

          {!opponentData ? (
            <div className="waiting-placeholder">
              <span className="spinning-bubble">🫧</span>
              <p>Share room code <b>{room.code}</b> to start the duel!</p>
            </div>
          ) : room.status === 'waiting' ? (
            <div className="waiting-ready-box">
              <span className={`ready-status-badge ${opponentData.ready ? 'ready' : 'not-ready'}`}>
                {opponentData.ready ? '✓ OPPONENT IS READY' : '⏳ WAITING FOR READY'}
              </span>
            </div>
          ) : (
            <div className="opponent-telemetry-feed">
              <div className="opponent-live-badge">● LIVE SSE STREAM</div>
              <div className="opponent-score-progress">
                <span>Opponent Score</span>
                <b>{opponentData.score} PTS</b>
              </div>
              <div className="opponent-streak-progress">
                <span>Current Streak</span>
                <b>🔥 {opponentData.streak}x COMBO</b>
              </div>
              <div className="opponent-avatar-status">
                <span className="reaction-emoji-big">{opponentData.avatar}</span>
                <p>Opponent is solving puzzle #{opponentData.solved + 1}…</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

