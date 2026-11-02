# Banana Digits

React + Node/Express + SQLite game using the Banana API (https://marcconrad.com/uob/banana/).
No database server to install: scores and accounts live in `server/data/banana.db`.

## Run it
Needs Node 22.13 or newer (you have 24, which is fine).

```
npm install
npm run dev
```
Open http://localhost:5173. That is all: no database password and no setup step.

Tip: keep the folder outside OneDrive (for example C:\dev\banana-game); syncing node_modules is slow.

## Continue with Google (optional)
1. Go to https://console.cloud.google.com/apis/credentials and create a project.
2. Configure the OAuth consent screen (External). Add your own Google account as a test user.
3. Create credentials: OAuth client ID, type Web application.
4. Under "Authorized JavaScript origins" add `http://localhost:5173`.
5. Copy the Client ID, run `npm run setup`, paste it, then restart `npm run dev`.

The "Continue with Google" button appears on the login page. A Google user who has the same email as an
existing account is linked to that account. Tokens are verified on the server (signature, audience, expiry).

## Game modes
- Classic: 3 tries, 3 hints, points x1
- Time attack: 15 seconds per puzzle, 2 tries, points x1.5
- One life: 1 try, no hints, points x2
- Practice: 5 tries, free hints, no points

Scoring: 100 base, -20 per hint, -15 per wrong guess, up to +20 for speed, then the mode multiplier.
All rules and scoring run on the server.

## Security
- Correct digit stays in the database until a round is lost; hints come from the server.
- bcrypt passwords, JWT in an httpOnly cookie, parameterised SQL, helmet, CORS lock, rate limits.
- `server/data` and `server/.env` are git-ignored. To reset all data, stop the server and delete `server/data`.
# Banana_game
