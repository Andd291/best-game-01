// LENTERA — entry program for make.fun's "Make the best game" bounty.
// It hands the game in: copies game/ and screenshots/ beside this file
// into /output (or MAKEFUN_OUTPUT_DIR outside the grader) and writes
// /output/dossier.json with buildDossier from vendor/makefun-game.ts.
// Node 22, standard library only, no network, fully deterministic:
// two runs write the same bytes.
import { cpSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const root = dirname(fileURLToPath(import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// The grader hands us an empty output directory, and it is mounted
// so its parent is not writable by the grader's user: never remove
// the output directory itself, only write into it.
mkdirSync(out, { recursive: true });

// The game itself and its screenshots, exactly as they sit in the repo.
cpSync(join(root, 'game'), join(out, 'game'), { recursive: true });
cpSync(join(root, 'screenshots'), join(out, 'screenshots'), { recursive: true });

// The dossier the scorer rebuilds and compares byte for byte.
const dossier = buildDossier(out, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
});
writeFileSync(join(out, 'dossier.json'), dossier);
