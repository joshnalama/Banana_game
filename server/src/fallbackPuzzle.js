/**
 * Fault-Tolerant Procedural SVG Fallback Generator
 * Produces valid mathematical puzzles with a deterministic 0-9 single-digit solution
 * if Marc Conrad's Banana API experiences network latency, 5xx outages, or rate limits.
 */

export function generateProceduralPuzzle() {
  // Ensure the solution is an integer from 0 to 9
  const solution = Math.floor(Math.random() * 10); // 0..9

  // Choose positive values for items A and B such that A + B > solution
  // valA in [5..8], valB in [5..8] => valA + valB in [10..16]
  const valA = Math.floor(Math.random() * 4) + 5;
  const valB = Math.floor(Math.random() * 4) + 5;

  // valC is chosen so that: valA + valB - valC = solution
  // => valC = (valA + valB) - solution
  // Since valA + valB >= 10 and solution <= 9, valC is strictly >= 1 and positive!
  const valC = (valA + valB) - solution;

  const row1Sum = valA + valA + valA;
  const row2Sum = valA + valB + valB;
  const row3Sum = valB + valC * 2;

  // Symbols (SpongeBob Bikini Bottom Theme)
  const symA = '🍔'; // Krabby Patty
  const symB = '🪼'; // Jellyfish
  const symC = '🍍'; // Pineapple

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 700 460" width="700" height="460">
    <defs>
      <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#0f2b46"/>
        <stop offset="50%" stop-color="#134074"/>
        <stop offset="100%" stop-color="#081c30"/>
      </linearGradient>
      <filter id="shadow" x="-5%" y="-5%" width="110%" height="110%">
        <feDropShadow dx="0" dy="4" stdDeviation="4" flood-color="#000" flood-opacity="0.5"/>
      </filter>
    </defs>

    <!-- Deep Nautical Background -->
    <rect width="100%" height="100%" rx="24" fill="url(#bg)"/>
    
    <!-- Bubble Decorations -->
    <circle cx="50" cy="80" r="14" fill="#8da9c4" opacity="0.15"/>
    <circle cx="80" cy="50" r="8" fill="#8da9c4" opacity="0.2"/>
    <circle cx="640" cy="120" r="22" fill="#8da9c4" opacity="0.12"/>
    <circle cx="620" cy="380" r="16" fill="#8da9c4" opacity="0.18"/>
    <circle cx="60" cy="400" r="28" fill="#8da9c4" opacity="0.1"/>

    <!-- Header Banner -->
    <rect x="30" y="20" width="640" height="48" rx="14" fill="#0b1d2e" stroke="#fee135" stroke-width="2"/>
    <text x="350" y="52" font-family="'Fredoka', 'Comic Sans MS', sans-serif" font-size="22" font-weight="bold" fill="#fee135" text-anchor="middle" letter-spacing="1">
      🍍 BIKINI BOTTOM MATH LAB · PROCEDURAL FALLBACK 🧽
    </text>

    <!-- Puzzle Grid Card -->
    <rect x="30" y="80" width="640" height="350" rx="18" fill="#081b2d" stroke="#25517a" stroke-width="2" filter="url(#shadow)"/>

    <!-- Row 1: A + A + A = r1 -->
    <g transform="translate(60, 135)">
      <text x="40" y="0" font-size="38" text-anchor="middle">${symA}</text>
      <text x="110" y="-8" font-family="sans-serif" font-size="32" font-weight="bold" fill="#8da9c4" text-anchor="middle">+</text>
      <text x="180" y="0" font-size="38" text-anchor="middle">${symA}</text>
      <text x="250" y="-8" font-family="sans-serif" font-size="32" font-weight="bold" fill="#8da9c4" text-anchor="middle">+</text>
      <text x="320" y="0" font-size="38" text-anchor="middle">${symA}</text>
      <text x="400" y="-8" font-family="sans-serif" font-size="34" font-weight="bold" fill="#fee135" text-anchor="middle">=</text>
      <rect x="440" y="-36" width="100" height="48" rx="12" fill="#134074" stroke="#8da9c4" stroke-width="2"/>
      <text x="490" y="-2" font-family="'Fredoka', sans-serif" font-size="30" font-weight="bold" fill="#ffffff" text-anchor="middle">${row1Sum}</text>
    </g>

    <!-- Row 2: A + B + B = r2 -->
    <g transform="translate(60, 215)">
      <text x="40" y="0" font-size="38" text-anchor="middle">${symA}</text>
      <text x="110" y="-8" font-family="sans-serif" font-size="32" font-weight="bold" fill="#8da9c4" text-anchor="middle">+</text>
      <text x="180" y="0" font-size="38" text-anchor="middle">${symB}</text>
      <text x="250" y="-8" font-family="sans-serif" font-size="32" font-weight="bold" fill="#8da9c4" text-anchor="middle">+</text>
      <text x="320" y="0" font-size="38" text-anchor="middle">${symB}</text>
      <text x="400" y="-8" font-family="sans-serif" font-size="34" font-weight="bold" fill="#fee135" text-anchor="middle">=</text>
      <rect x="440" y="-36" width="100" height="48" rx="12" fill="#134074" stroke="#8da9c4" stroke-width="2"/>
      <text x="490" y="-2" font-family="'Fredoka', sans-serif" font-size="30" font-weight="bold" fill="#ffffff" text-anchor="middle">${row2Sum}</text>
    </g>

    <!-- Row 3: B + C + C = r3 -->
    <g transform="translate(60, 295)">
      <text x="40" y="0" font-size="38" text-anchor="middle">${symB}</text>
      <text x="110" y="-8" font-family="sans-serif" font-size="32" font-weight="bold" fill="#8da9c4" text-anchor="middle">+</text>
      <text x="180" y="0" font-size="38" text-anchor="middle">${symC}</text>
      <text x="250" y="-8" font-family="sans-serif" font-size="32" font-weight="bold" fill="#8da9c4" text-anchor="middle">+</text>
      <text x="320" y="0" font-size="38" text-anchor="middle">${symC}</text>
      <text x="400" y="-8" font-family="sans-serif" font-size="34" font-weight="bold" fill="#fee135" text-anchor="middle">=</text>
      <rect x="440" y="-36" width="100" height="48" rx="12" fill="#134074" stroke="#8da9c4" stroke-width="2"/>
      <text x="490" y="-2" font-family="'Fredoka', sans-serif" font-size="30" font-weight="bold" fill="#ffffff" text-anchor="middle">${row3Sum}</text>
    </g>

    <!-- Row 4: A + B - C = ? -->
    <g transform="translate(60, 375)">
      <text x="40" y="0" font-size="38" text-anchor="middle">${symA}</text>
      <text x="110" y="-8" font-family="sans-serif" font-size="32" font-weight="bold" fill="#8da9c4" text-anchor="middle">+</text>
      <text x="180" y="0" font-size="38" text-anchor="middle">${symB}</text>
      <text x="250" y="-8" font-family="sans-serif" font-size="32" font-weight="bold" fill="#fee135" text-anchor="middle">−</text>
      <text x="320" y="0" font-size="38" text-anchor="middle">${symC}</text>
      <text x="400" y="-8" font-family="sans-serif" font-size="34" font-weight="bold" fill="#fee135" text-anchor="middle">=</text>
      
      <!-- Mystery Question Glowing Box -->
      <rect x="440" y="-40" width="100" height="56" rx="14" fill="#fee135" stroke="#ffffff" stroke-width="3" filter="url(#shadow)"/>
      <text x="490" y="-1" font-family="'Fredoka', sans-serif" font-size="38" font-weight="bold" fill="#0b1d2e" text-anchor="middle">?</text>
    </g>
  </svg>`;

  const dataUri = `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;

  return {
    image: dataUri,
    solution, // Guaranteed 0..9 and mathematically consistent!
    isFallback: true,
  };
}
