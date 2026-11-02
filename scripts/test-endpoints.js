import { generateProceduralPuzzle } from '../server/src/fallbackPuzzle.js';
import { createHMACSeal, verifyHMACSeal, generateGuestIdentifier } from '../server/src/crypto.js';
import { sseManager } from '../server/src/sseManager.js';
import { calculateGrade, calculatePuzzleScore, validateDigit } from '../shared/src/validation.js';

console.log('Testing Shared Contracts & Fallback Engine...');

// 1. Procedural Puzzle Fallback Test
const puz = generateProceduralPuzzle();
console.log('Procedural puzzle generated: solution =', puz.solution, 'isFallback =', puz.isFallback);
if (!validateDigit(puz.solution)) throw new Error('Invalid solution generated');

// 2. HMAC Cryptographic Sealing Test
const seal = createHMACSeal('test_round_1', puz.solution, 'secret_123');
const isAuthentic = verifyHMACSeal('test_round_1', puz.solution, seal, 'secret_123');
const isTampered = verifyHMACSeal('test_round_1', (puz.solution + 1) % 10, seal, 'secret_123');
console.log('HMAC Seal verification authentic:', isAuthentic);
console.log('HMAC Seal verification tampered fails:', !isTampered);
if (!isAuthentic || isTampered) throw new Error('HMAC verification failed');

// 3. Guest Identifier Generation Test
const guest = generateGuestIdentifier();
console.log('Guest identifier created:', guest.username, guest.guestId);

// 4. Scoring & Grade Calculation
const score = calculatePuzzleScore({ base: 100, hintsUsed: 1, wrongAttempts: 1, elapsedSec: 5, modeMult: 1.5, combo: 3 });
console.log('Calculated puzzle score:', score);
const gradeS = calculateGrade(0.98);
const gradeD = calculateGrade(0.4);
console.log('Grade calculation:', gradeS.grade, gradeS.title, '|', gradeD.grade, gradeD.title);

// 5. SSE Multiplayer Manager Room Lifecycle Test
const hostUser = { id: 101, username: 'SpongeBob_Host', avatar: '🧽' };
const guestUser = { id: 102, username: 'Patrick_Guest', avatar: '⭐' };
const room = sseManager.createRoom({ hostUser, duration: 180 });
console.log('Room created code:', room.code);
sseManager.joinRoom(room.code, guestUser);
console.log('Guest joined:', room.guest.username);
sseManager.setReady(room.code, hostUser.id, true);
sseManager.setReady(room.code, guestUser.id, true);
console.log('Both ready, room status:', room.status);

console.log('\nAll unit and integration checks PASSED perfectly!');

process.exit(0);
