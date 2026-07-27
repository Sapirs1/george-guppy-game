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

async function* walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* walk(path);
    } else if (entry.name.endsWith('.ts')) {
      yield path;
    }
  }
}

function transpile(buf) {
  const decoder = new TextDecoder('utf-8', { fatal: false, ignoreBOM: false });
  const source = decoder.decode(buf).replace(/^\uFEFF/, '');
  return stripTypeScriptTypes(source, { mode: 'strip' });
}

function rewriteSpecifier(specifier) {
  if (specifier.startsWith('./') || specifier.startsWith('../')) {
    const withoutTs = specifier.replace(/\.ts$/u, '');
    if (!withoutTs.endsWith('.js') && !withoutTs.endsWith('.json')) {
      return `${withoutTs}.js`;
    }
    return withoutTs;
  }
  return specifier;
}

function rewriteImports(code) {
  return code.replace(
    /((?:import\s+(?:[^'"]*?)\s+from\s+|export\s+(?:[^'"]*?)\s+from\s+|import\s+)['"])([^'"]+)(['"];?)/gu,
    (_match, prefix, specifier, suffix) => {
      return `${prefix}${rewriteSpecifier(specifier).replace(/\\/gu, '/')}${suffix}`;
    }
  );
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  for await (const path of walk(SRC_DIR)) {
    const rel = relative(SRC_DIR, path);
    const outRel = rel.replace(/\.ts$/u, '.js');
    const outPath = join(OUT_DIR, 'src', outRel);
    await mkdir(dirname(outPath), { recursive: true });

    const source = await readFile(path);
    let js = transpile(source);
    js = rewriteImports(js);

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
  </style>
  <script type="importmap">
  {
    "imports": {
      "phaser": "${PHASER_CDN}"
    }
  }
  </script>
</head>
<body>
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
