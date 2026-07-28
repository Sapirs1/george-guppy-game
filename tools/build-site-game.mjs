#!/usr/bin/env node
/**
 * Zero-dependency build script for the George Guppy game.
 *
 * Uses Node 26's built-in `module.stripTypeScriptTypes` to remove TypeScript
 * syntax and outputs standard ESM JavaScript that can run from a static host
 * with no bundler. Phaser is loaded from a CDN importmap so we don't need to
 * install npm packages locally.
 */
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { stripTypeScriptTypes } from 'node:module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const ROOT = resolve(__dirname, '..');
const SRC_DIR = join(ROOT, 'george-guppy', 'src');
const OUT_DIR = join(ROOT, 'site', 'game');
const PHASER_CDN = 'https://esm.sh/phaser@3.88.2';

// Neither the unit tests nor the hand-written Phaser type stub belong in a
// production bundle — they were being transpiled and shipped to the web host.
const SKIP_DIRS = new Set(['__tests__', 'types']);

async function* walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) {
        continue;
      }
      yield* walk(path);
    } else if (entry.name.endsWith('.ts') && !entry.name.endsWith('.d.ts')) {
      yield path;
    }
  }
}

function transpile(buf) {
  const decoder = new TextDecoder('utf-8', { fatal: false, ignoreBOM: false });
  const source = decoder.decode(buf).replace(/^\uFEFF/, '');
  return stripTypeScriptTypes(source, { mode: 'strip' });
}

/**
 * Resolve the bare `phaser` specifier to a real relative path.
 *
 * Bare specifiers require an import map, which only landed in Safari 16.4
 * (March 2023). iPads capped at iPadOS 15 — Air 2, mini 4, 5th gen, i.e. exactly
 * the hand-me-down devices this audience uses — cannot resolve it, so the whole
 * module graph silently fails to evaluate and the child gets a spinner. A
 * relative path needs no import map and works back to Safari 11.
 *
 * `depth` is how many directories deep the importing file sits inside src/.
 */
function phaserSpecifierFor(depth) {
  return `${'../'.repeat(depth + 1)}vendor/phaser-shim.js`;
}

function rewriteSpecifier(specifier, depth) {
  if (specifier === 'phaser') {
    return phaserSpecifierFor(depth);
  }
  if (specifier.startsWith('./') || specifier.startsWith('../')) {
    const withoutTs = specifier.replace(/\.ts$/u, '');
    if (!withoutTs.endsWith('.js') && !withoutTs.endsWith('.json')) {
      return `${withoutTs}.js`;
    }
    return withoutTs;
  }
  return specifier;
}

function rewriteImports(code, depth) {
  return code.replace(
    /((?:import\s+(?:[^'"]*?)\s+from\s+|export\s+(?:[^'"]*?)\s+from\s+|import\s+)['"])([^'"]+)(['"];?)/gu,
    (_match, prefix, specifier, suffix) => {
      return `${prefix}${rewriteSpecifier(specifier, depth).replace(/\\/gu, '/')}${suffix}`;
    }
  );
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  // Emit a tiny ESM shim so every `import Phaser from 'phaser'` can resolve
  // through a relative path (no import map required). It re-exports the
  // Phaser global loaded via a classic script tag, which works even on older
  // Safari/iPadOS versions that don't support import maps.
  const vendorDir = join(OUT_DIR, 'vendor');
  await mkdir(vendorDir, { recursive: true });
  const shim = `// Auto-generated Phaser shim for the standalone ESM build.\n` +
    `export default window.Phaser;\n` +
    `export const { Game, Scene, GameObjects, Math: PMath, Curves, Time, Input, Sound, Scale } = window.Phaser;\n`;
  await writeFile(join(vendorDir, 'phaser-shim.js'), shim, 'utf-8');

  // Inject the classic Phaser script into the standalone index so `window.Phaser`
  // exists before any module loads.
  const phaserScriptTag = `<script src="https://cdn.jsdelivr.net/npm/phaser@3.88.2/dist/phaser.min.js"></script>`;

  for await (const path of walk(SRC_DIR)) {
    const rel = relative(SRC_DIR, path);
    const outRel = rel.replace(/\.ts$/u, '.js');
    const outPath = join(OUT_DIR, 'src', outRel);
    await mkdir(dirname(outPath), { recursive: true });

    // How many directories deep this file sits inside src/, so the `phaser`
    // specifier can be rewritten to a correct relative path from HERE.
    const depth = outRel.split(/[\\/]/u).length - 1;

    const source = await readFile(path);
    let js = transpile(source);
    js = rewriteImports(js, depth);

    await writeFile(outPath, js, 'utf-8');
    console.log('built', outRel);
  }

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <title>George the Cranky Guppy</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html, body { width: 100%; height: 100%; overflow: hidden; background: #0b1d2e; touch-action: none; }
    #game-container { width: 100vw; height: 100vh; display: flex; align-items: center; justify-content: center; }
    #loading { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; color: #a8d8f0; font-family: system-ui, sans-serif; font-size: 1.25rem; pointer-events: none; z-index: 1; }
    #rotate-prompt { position: fixed; inset: 0; display: none; align-items: center; justify-content: center; flex-direction: column; gap: 16px; background: #0b1d2e; color: #eaf6ff; font-family: Nunito, system-ui, sans-serif; font-size: 1.25rem; text-align: center; padding: 24px; z-index: 10; }
    #rotate-prompt svg { width: 64px; height: 64px; stroke: #ffd166; }
    #rotate-prompt .hint { font-size: 1rem; color: #9dc4de; max-width: 320px; }
    @media (orientation: portrait) and (max-width: 896px) { #rotate-prompt { display: flex; } #game-container canvas { visibility: hidden; } }
  </style>
  ${phaserScriptTag}
</head>
<body>
  <div id="rotate-prompt">
    <svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
      <path d="M12 7v10"/>
      <path d="M9 10l3-3 3 3"/>
      <path d="M9 14l3 3 3-3"/>
    </svg>
    <div>Please rotate your device</div>
    <div class="hint">George likes a little room. Turn your phone sideways to play.</div>
  </div>
  <div id="game-container">
    <div id="loading">George is waking up…</div>
  </div>
  <script type="module" src="src/main.js"></script>
</body>
</html>
`;
  await writeFile(join(OUT_DIR, 'index.html'), html, 'utf-8');
  console.log('site/game ready in', OUT_DIR);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
