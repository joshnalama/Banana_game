# 🍍 Bikini Bottom Math Lab · SpongeBob Banana Game

An enterprise-grade, event-driven mathematical puzzle game powered by **React 18**, **Node.js/Express**, and **SQLite**, designed around the vibrant world of **SpongeBob SquarePants** and consuming **Marc Conrad's Banana API**.

---

## 🐙 1. Git Repository & Architecture

- **Repository URL:** `https://github.com/joshnalama/Banana_game.git`
- **Primary Development Branch:** `develop`
- **Release Branch:** `main`
- **Monorepo Architecture:** npm workspaces (`client/`, `server/`, `shared/`)
- **Gitflow Branching Strategy:** Strict isolation between `feature/*`, `develop`, and `main`
- **Conventional Commits:** Standardized semantic commits (`feat(...)`, `fix(...)`, `docs(...)`, `test(...)`)

```
banana-game/
├── package.json              # Monorepo workspaces coordinator
├── shared/                   # Shared contracts, schemas, modes & validation
│   ├── package.json
│   └── src/
│       ├── constants.js      # Modes, grade tiers, quotes, avatar definitions
│       ├── validation.js     # Shared contract validation & score formulas
│       └── index.js
├── server/                   # Backend microservice
│   ├── package.json
│   └── src/
│       ├── index.js          # Express app, helmet, CORS, rate limits
│       ├── db.js             # SQLite driver (built-in node:sqlite, zero server setup)
│       ├── crypto.js         # HMAC-SHA256 solution tokens & guest identity
│       ├── fallbackPuzzle.js # Fault-tolerant procedural SVG puzzle generator
│       ├── sseManager.js     # Real-time SSE 1v1 multiplayer duel engine
│       └── routes.js         # API endpoints (Auth, Game, Duel rooms, Admin RBAC)
└── client/                   # Frontend Vite + React SPA
    ├── package.json
    ├── vite.config.js
    └── src/
        ├── services/
        │   ├── eventBus.js    # Custom Decoupled Pub/Sub Event Bus
        │   ├── soundEngine.js # Web Audio API sound synthesizer
        │   └── api.js         # Fetch wrapper with credentials & error handling
        ├── components/        # Specialized React UI components
        │   ├── CinematicIntroModal.jsx  # Full-screen AAA theater intro player
        │   ├── MinionCenterpiece.jsx    # SpongeBob Quantum Scientist hero model
        │   ├── MultiplayerArena.jsx     # Real-time split-screen 1v1 SSE duel arena
        │   ├── PuzzleArena.jsx          # Core single-player 5-mode arena
        │   ├── GameOverModal.jsx        # Recap screen with S/A/B/C/D grade tiers
        │   ├── Numpad.jsx               # Tactile 0-9 arcade input with keyboard bindings
        │   ├── MinionReactionAvatar.jsx # Dynamic reactive avatar reflecting streak
        │   ├── FloatingPoints.jsx       # Animated floating score & combo indicators
        │   ├── IdentityPromptModal.jsx  # Google / Email / Instant Guest auth portal
        │   ├── GoogleSignInButton.jsx   # Google Identity Services SDK button
        │   └── MatchIntro.jsx           # 3-2-1 arcade countdown with spacebar bypass
        ├── Game.jsx          # Single-player arcade controller
        ├── ModePicker.jsx    # Mode selection cards
        ├── Leaderboard.jsx   # Hall of Fame with medals & real-time rankings
        ├── Profile.jsx       # User stats, rank, and avatar customizer
        └── styles.css        # SpongeBob SquarePants Bikini Bottom design system
```

---

## 🧠 2. Skills & Academic Competencies Demonstrated

### Theme 1: Version Control (Gitflow & Monorepo)
- **Gitflow Branching Strategy:** Isolation between feature branches, `develop`, and `main`.
- **Conventional Commits:** Standardized semantic commits.
- **Multi-Package Monorepo:** Workspace dependency orchestration between frontend (`client`), backend (`server`), and contract validation (`shared`).

### Theme 2: Event-Driven Architecture (EDA)
- **Custom Decoupled Pub/Sub Event Bus (`CustomEventBus`):** EventEmitter pattern that decouples puzzle interactions, audio synthesizer, and telemetry audits without tight component coupling.
- **Web Audio API Sound Engine:** Real-time synthesized polyphonic audio generation (sine/square/triangle oscillators and gain envelopes) driven by EventBus signals, running completely offline.
- **Server-Sent Events (SSE):** Real-time unidirectional streaming (`/api/rooms/:id/stream`) for the 1v1 Multiplayer duel engine with auto-win forfeit detection.

### Theme 3: Interoperability & Distributed Systems
- **RESTful JSON Communication:** Live consumption of Marc Conrad’s Banana API (`https://marcconrad.com/uob/banana/api.php?out=json`).
- **Fault-Tolerant Procedural SVG Fallback:** Self-healing fallback generator that renders valid mathematical puzzle SVGs offline if the remote API experiences downtime or network latency.
- **HMAC-SHA256 Cryptographic Sealing:** Solution tokens cryptographically signed on the server so the browser cannot reverse-engineer or tamper with solutions in transit.

### Theme 4: Virtual Identity & Information Security
- **Federated Identity via Google OAuth 2.0 / OpenID Connect:** Token verification using `google-auth-library` and Google Identity Services SDK.
- **Guest Identity Generation:** Cryptographically random session tokens for unauthenticated players.
- **Security Hardening:** Password hashing using `bcryptjs` (salt rounds = 10), stateless JWT in secure HttpOnly cookies, rate limiting, and Role-Based Access Control (RBAC: Admin vs. Player).

---

## 🧩 3. Frontend React Components (`client/src/components/`)

| Component | File Path | Purpose & Functionality |
| :--- | :--- | :--- |
| **CinematicIntroModal** | `CinematicIntroModal.jsx` | Full-screen AAA theater-style intro video player featuring ambient backlight glow, progress scrubber, and skip-to-dashboard transition. |
| **MinionCenterpiece** | `MinionCenterpiece.jsx` | SpongeBob Quantum Scientist hero model with interactive gaze-tracking eyes, pulsing Arc Reactor core, revolving holographic data rings, and speech telemetry. |
| **MultiplayerArena** | `MultiplayerArena.jsx` | Real-time split-screen 1v1 duel arena powered by SSE, supporting 3/5/7-min matches, shareable URLs, room code entry, and auto-win forfeit detection. |
| **PuzzleArena** | `PuzzleArena.jsx` | Core single-player gameplay arena supporting all 5 arcade modes (Speed Rush, Survival, Perfect 10, Time Attack, Practice), high-precision response timing, and combo multipliers. |
| **GameOverModal** | `GameOverModal.jsx` | Match recap screen with dynamic grade tiers (S/A/B/C/D), celebratory confetti animations, and automatic leaderboard persistence. |
| **Numpad** | `Numpad.jsx` | Tactile 0–9 arcade input pad supporting mouse clicks, touch interactions, and physical keyboard bindings. |
| **MinionReactionAvatar** | `MinionReactionAvatar.jsx` | Dynamic reactive avatar reflecting real-time player streak (calm, focused, celebratory "I'm ready!", or disappointed "Barnacles!"). |
| **FloatingPoints** | `FloatingPoints.jsx` | Animated floating score popup indicators (+100 PTS!) on correct solutions. |
| **IdentityPromptModal** | `IdentityPromptModal.jsx` | Virtual Identity authentication modal supporting Google Sign-In, Email/Password login/registration, or Guest Play. |
| **GoogleSignInButton** | `GoogleSignInButton.jsx` | Official Google Identity Services SDK button integration with credential callback handler. |
| **MatchIntro** | `MatchIntro.jsx` | Arcade countdown sequence (3... 2... 1... I'M READY / SOLVE!) with particle field and spacebar bypass. |

---

## 🚀 4. Quick Start

### Prerequisites
- Node.js `v22.13.0` or higher (tested on Node v24).

### Installation & Run
```bash
# 1. Install workspace dependencies
npm install

# 2. Start both server (port 5000) and client (port 5173) concurrently
npm run dev
```

Visit **`http://localhost:5173`** in your browser.

---

## 🧪 5. Verification & Testing

Run unit & integration tests on contracts, fallback SVG generator, HMAC cryptographic sealing, and SSE room management:
```bash
node scripts/test-endpoints.js
```
