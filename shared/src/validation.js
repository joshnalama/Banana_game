import { GRADE_TIERS } from './constants.js';

export function validateDigit(digit) {
  const n = Number(digit);
  return Number.isInteger(n) && n >= 0 && n <= 9;
}

export function validateUsername(username) {
  return typeof username === 'string' && /^[A-Za-z0-9_]{3,20}$/.test(username);
}

export function validateEmail(email) {
  return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 120;
}

export function calculateGrade(ratioOrScore, isScore = false) {
  if (isScore) {
    if (ratioOrScore >= 1200) return GRADE_TIERS.S;
    if (ratioOrScore >= 800) return GRADE_TIERS.A;
    if (ratioOrScore >= 500) return GRADE_TIERS.B;
    if (ratioOrScore >= 250) return GRADE_TIERS.C;
    return GRADE_TIERS.D;
  }
  const ratio = Math.max(0, Math.min(1, ratioOrScore));
  if (ratio >= GRADE_TIERS.S.minRatio) return GRADE_TIERS.S;
  if (ratio >= GRADE_TIERS.A.minRatio) return GRADE_TIERS.A;
  if (ratio >= GRADE_TIERS.B.minRatio) return GRADE_TIERS.B;
  if (ratio >= GRADE_TIERS.C.minRatio) return GRADE_TIERS.C;
  return GRADE_TIERS.D;
}

export function calculatePuzzleScore({ base = 100, hintsUsed = 0, wrongAttempts = 0, elapsedSec = 0, modeMult = 1, combo = 1 }) {
  const penalty = hintsUsed * 20 + wrongAttempts * 15;
  const speedBonus = Math.max(0, 20 - elapsedSec);
  const rawBase = Math.max(10, base - penalty + speedBonus);
  const comboMultiplier = 1 + Math.min(combo - 1, 5) * 0.2; // up to 2x for 5x streak
  return Math.round(rawBase * modeMult * comboMultiplier);
}
