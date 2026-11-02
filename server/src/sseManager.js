import { generateProceduralPuzzle } from './fallbackPuzzle.js';
import { createHMACSeal } from './crypto.js';

class SSEMultiplayerManager {
  constructor() {
    this.rooms = new Map();
  }

  generateRoomCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  createRoom({ hostUser, duration = 180 }) {
    let code = this.generateRoomCode();
    while (this.rooms.has(code)) {
      code = this.generateRoomCode();
    }

    const room = {
      code,
      duration: Math.max(60, Number(duration) || 180), // 3, 5, or 7 minutes in seconds
      status: 'waiting', // waiting | countdown | active | finished
      createdAt: Date.now(),
      startedAt: null,
      endsAt: null,
      host: {
        id: hostUser.id,
        username: hostUser.username,
        avatar: hostUser.avatar || '🧽',
        score: 0,
        solved: 0,
        wrong: 0,
        streak: 0,
        ready: false,
        currentPuzzle: null,
      },
      guest: null,
      winner: null,
      forfeitedBy: null,
      subscribers: new Map(), // userId -> res
      timerId: null,
    };

    // Pre-generate puzzle for host
    this.assignNewPuzzle(room, 'host');

    this.rooms.set(code, room);
    return room;
  }

  assignNewPuzzle(room, playerRole) {
    const player = room[playerRole];
    if (!player) return;
    const puzzle = generateProceduralPuzzle();
    const puzzleId = `puz_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const seal = createHMACSeal(puzzleId, puzzle.solution);

    player.currentPuzzle = {
      puzzleId,
      image: puzzle.image,
      solution: puzzle.solution,
      sealToken: seal,
      assignedAt: Date.now(),
    };
  }

  getPublicRoom(room) {
    if (!room) return null;
    return {
      code: room.code,
      duration: room.duration,
      status: room.status,
      startedAt: room.startedAt,
      endsAt: room.endsAt,
      winner: room.winner,
      forfeitedBy: room.forfeitedBy,
      host: {
        id: room.host.id,
        username: room.host.username,
        avatar: room.host.avatar,
        score: room.host.score,
        solved: room.host.solved,
        streak: room.host.streak,
        ready: room.host.ready,
        hasPuzzle: !!room.host.currentPuzzle,
        puzzleImage: room.host.currentPuzzle?.image,
        puzzleId: room.host.currentPuzzle?.puzzleId,
        sealToken: room.host.currentPuzzle?.sealToken,
      },
      guest: room.guest ? {
        id: room.guest.id,
        username: room.guest.username,
        avatar: room.guest.avatar,
        score: room.guest.score,
        solved: room.guest.solved,
        streak: room.guest.streak,
        ready: room.guest.ready,
        hasPuzzle: !!room.guest.currentPuzzle,
        puzzleImage: room.guest.currentPuzzle?.image,
        puzzleId: room.guest.currentPuzzle?.puzzleId,
        sealToken: room.guest.currentPuzzle?.sealToken,
      } : null,
    };
  }

  joinRoom(code, guestUser) {
    const room = this.rooms.get(code.toUpperCase());
    if (!room) throw new Error('Duel arena not found. Check the room code!');
    if (room.status !== 'waiting') throw new Error('Match is already in progress or completed.');
    if (room.host.id === guestUser.id) {
      // Re-joining as host is permitted
      return room;
    }
    if (room.guest && room.guest.id !== guestUser.id) {
      throw new Error('This room already has 2 duelists.');
    }

    if (!room.guest) {
      room.guest = {
        id: guestUser.id,
        username: guestUser.username,
        avatar: guestUser.avatar || '⭐',
        score: 0,
        solved: 0,
        wrong: 0,
        streak: 0,
        ready: false,
        currentPuzzle: null,
      };
      this.assignNewPuzzle(room, 'guest');
    }

    this.broadcast(room, 'player_joined', { room: this.getPublicRoom(room) });
    return room;
  }

  subscribe(code, userId, res) {
    const room = this.rooms.get(code.toUpperCase());
    if (!room) {
      res.status(404).end();
      return;
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    room.subscribers.set(userId, res);

    // Initial state push
    res.write(`event: room_state\ndata: ${JSON.stringify(this.getPublicRoom(room))}\n\n`);

    res.on('close', () => {
      room.subscribers.delete(userId);
      // Auto-win forfeit detection if match was active
      if (room.status === 'active') {
        const isHost = room.host.id === userId;
        const isGuest = room.guest && room.guest.id === userId;
        if (isHost || isGuest) {
          this.handleForfeit(room, userId, 'disconnected');
        }
      }
    });
  }

  broadcast(room, eventName, payload) {
    const data = `event: ${eventName}\ndata: ${JSON.stringify(payload)}\n\n`;
    for (const [userId, res] of room.subscribers.entries()) {
      try {
        res.write(data);
      } catch {
        room.subscribers.delete(userId);
      }
    }
  }

  setReady(code, userId, readyState) {
    const room = this.rooms.get(code.toUpperCase());
    if (!room) throw new Error('Room not found');
    if (room.host.id === userId) room.host.ready = Boolean(readyState);
    else if (room.guest && room.guest.id === userId) room.guest.ready = Boolean(readyState);

    this.broadcast(room, 'room_state', this.getPublicRoom(room));

    // Both ready -> start countdown
    if (room.host.ready && room.guest && room.guest.ready && room.status === 'waiting') {
      this.startCountdown(room);
    }
  }

  startCountdown(room) {
    room.status = 'countdown';
    this.broadcast(room, 'countdown_start', { count: 3 });

    let count = 3;
    const interval = setInterval(() => {
      count -= 1;
      if (count > 0) {
        this.broadcast(room, 'countdown_tick', { count });
      } else {
        clearInterval(interval);
        this.startMatch(room);
      }
    }, 1000);
  }

  startMatch(room) {
    room.status = 'active';
    room.startedAt = Date.now();
    room.endsAt = Date.now() + room.duration * 1000;

    this.broadcast(room, 'match_start', { room: this.getPublicRoom(room) });

    room.timerId = setTimeout(() => {
      this.finishMatch(room);
    }, room.duration * 1000);
  }

  submitAnswer(code, userId, digit) {
    const room = this.rooms.get(code.toUpperCase());
    if (!room) throw new Error('Room not found');
    if (room.status !== 'active') throw new Error('Match is not active');

    const role = room.host.id === userId ? 'host' : room.guest?.id === userId ? 'guest' : null;
    if (!role) throw new Error('Not a participant in this duel');

    const player = room[role];
    const current = player.currentPuzzle;
    if (!current) throw new Error('No puzzle assigned');

    const isCorrect = Number(digit) === Number(current.solution);
    if (isCorrect) {
      player.streak += 1;
      player.solved += 1;
      const streakBonus = Math.min(player.streak, 5) * 15;
      const pts = 100 + streakBonus;
      player.score += pts;

      // Assign next puzzle
      this.assignNewPuzzle(room, role);

      this.broadcast(room, 'player_scored', {
        role,
        userId,
        points: pts,
        totalScore: player.score,
        streak: player.streak,
        solved: player.solved,
        newPuzzle: {
          puzzleId: player.currentPuzzle.puzzleId,
          image: player.currentPuzzle.image,
          sealToken: player.currentPuzzle.sealToken,
        },
      });

      return { correct: true, points: pts, score: player.score, streak: player.streak };
    } else {
      player.streak = 0;
      player.wrong += 1;
      this.broadcast(room, 'player_missed', {
        role,
        userId,
        wrong: player.wrong,
      });
      return { correct: false, streak: 0 };
    }
  }

  handleForfeit(room, userId, reason = 'forfeit') {
    if (room.status === 'finished') return;
    if (room.timerId) clearTimeout(room.timerId);

    room.status = 'finished';
    room.forfeitedBy = userId;

    if (room.host.id === userId) {
      room.winner = room.guest ? room.guest.username : 'Nobody';
    } else {
      room.winner = room.host.username;
    }

    this.broadcast(room, 'match_forfeit', {
      winner: room.winner,
      forfeitedBy: userId,
      reason,
      room: this.getPublicRoom(room),
    });
  }

  finishMatch(room) {
    if (room.status === 'finished') return;
    if (room.timerId) clearTimeout(room.timerId);

    room.status = 'finished';
    const hostScore = room.host.score;
    const guestScore = room.guest?.score || 0;

    if (hostScore > guestScore) {
      room.winner = room.host.username;
    } else if (guestScore > hostScore) {
      room.winner = room.guest.username;
    } else {
      room.winner = 'Tie Game!';
    }

    this.broadcast(room, 'match_finished', {
      winner: room.winner,
      hostScore,
      guestScore,
      room: this.getPublicRoom(room),
    });
  }
}

export const sseManager = new SSEMultiplayerManager();

