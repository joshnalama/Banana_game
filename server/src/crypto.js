import crypto from 'node:crypto';

/**
 * HMAC-SHA256 Cryptographic Sealing & Verification
 * Used to sign puzzle solutions securely so that client responses
 * can be verified without tampering or exposing raw answers.
 */

const getSecret = (secret) => secret || process.env.JWT_SECRET || 'banana_default_security_salt_secret_2026';

export function createHMACSeal(roundId, solution, secret) {
  const hmac = crypto.createHmac('sha256', getSecret(secret));
  hmac.update(`${roundId}:${solution}:banana_salt`);
  return hmac.digest('hex');
}

export function verifyHMACSeal(roundId, candidateSolution, sealToken, secret) {
  const expected = createHMACSeal(roundId, candidateSolution, secret);
  try {
    return crypto.timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(sealToken, 'hex'));
  } catch {
    return false;
  }
}

export function generateGuestIdentifier() {
  const randomHex = crypto.randomBytes(3).toString('hex').toUpperCase();
  const guestAvatars = ['SpongeBob', 'Patrick', 'Squidward', 'Sandy', 'Gary', 'Plankton'];
  const name = guestAvatars[Math.floor(Math.random() * guestAvatars.length)];
  return {
    username: `${name}_${randomHex}`,
    guestId: `guest_${crypto.randomBytes(8).toString('hex')}`,
  };
}
