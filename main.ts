// Canyon Courier — the hand-in program (Node 22, standard library only).
// It copies this repository's game/ and screenshots/ into the output
// directory and writes dossier.json with the kit's vendored library, so
// the grader can check the game and the judge can read it. The program
// runs twice in the grader and both runs must write identical bytes:
// it copies files as they are and the dossier builder is deterministic,
// so the output is stable by construction.

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(out, { recursive: true });
cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) {
  cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });
}

// The gate's caps, mirrored from the competition rules: at most 4
// screenshots of 256 KiB, at most 993 files / 48 MiB in game/, and the
// dossier text capped at 160 KiB.
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);
