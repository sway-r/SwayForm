// Tiny manual .env loader — avoids pulling in the `dotenv` dependency for
// one file. Only used for local dev; the real VPS sets env vars via its
// systemd unit, not a .env file.
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const dir = dirname(fileURLToPath(import.meta.url));
const envPath = join(dir, '.env');

if (existsSync(envPath)){
  for (const line of readFileSync(envPath, 'utf8').split('\n')){
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (!(key in process.env)) process.env[key] = value;
  }
}
