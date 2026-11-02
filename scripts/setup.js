// Optional: npm run setup
// Saves your Google Client ID so the "Continue with Google" button appears.
// The game works without it (username + password login).
import readline from 'node:readline/promises';
import fs from 'node:fs';

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
console.log('Paste your Google OAuth Client ID (looks like 123-abc.apps.googleusercontent.com).');
console.log('Leave empty to skip Google sign-in.\n');
const id = (await rl.question('Google Client ID: ')).trim();
rl.close();

if (id && !/^[\w.-]+\.apps\.googleusercontent\.com$/.test(id)) {
  console.error('\nThat does not look like a Google Client ID. Nothing was saved.');
  process.exit(1);
}
const env = `PORT=5000\nCLIENT_ORIGIN=http://localhost:5173\nGOOGLE_CLIENT_ID=${id}\n`;
fs.writeFileSync(new URL('../server/.env', import.meta.url), env);
console.log(id ? '\nSaved. Restart "npm run dev" to see the Google button.' : '\nSaved without Google sign-in.');
