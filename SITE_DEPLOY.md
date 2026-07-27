# Deploy George the Cranky Guppy to yechielsfisheryfarm.com

## What was built

A completely static game + site bundle lives under `site/`.

- `site/index.html` — Home page with the game embedded at the bottom (SEO/UX safe).
- `site/activities.html` — Activities page with the game embedded.
- `site/styles.css` — Responsive, low-CLS layout.
- `site/embed.js` — Lazy-load helper for the iframe.
- `site/game/` — Self-contained George the Cranky Guppy build.
  - `index.html` loads the Phaser engine from a CDN via importmap.
  - `src/` contains the transpiled JavaScript of the game.

## How to upload (no build needed on your server)

1. Copy the **entire `site/` folder** onto your web host.
2. If your main domain already has an existing site, upload the contents of
   `site/` to the same directory as your existing pages.
3. Ensure these files are publicly accessible:
   - `index.html`
   - `activities.html`
   - `styles.css`
   - `embed.js`
   - `game/index.html`
   - `game/src/*.js`
4. Visit `https://www.yechielsfisheryfarm.com/` and `/activities.html` to
   confirm the game loads.

## Wix / hosted-site specific notes

- The game is wrapped in a `<section class="game-section" id="game">`.
- The embed code in `site/index.html` and `site/activities.html` is safe to
  copy/paste into a Wix HTML embed or custom code block if you only want the
  game section:

```html
<section class="game-section" id="game" aria-labelledby="game-heading">
  <h2 id="game-heading">Play George the Cranky Guppy</h2>
  <p class="game-instructions">Tap or click anywhere to swim. Collect bubbles, meet sea creatures, and dodge drains.</p>
  <div class="game-frame" role="img" aria-label="George the Cranky Guppy game">
    <iframe id="george-guppy-frame" src="game/index.html" title="George the Cranky Guppy" loading="lazy" allow="autoplay; fullscreen" sandbox="allow-scripts allow-same-origin allow-popups"></iframe>
  </div>
</section>
<link rel="stylesheet" href="styles.css" />
<script src="embed.js" defer></script>
```

Make sure the `game/` folder is uploaded alongside the pages so `game/index.html`
resolves correctly.

## SEO/UX safeguards already applied

- `loading="lazy"` on the iframe avoids delaying LCP.
- Fixed `aspect-ratio` container prevents layout shift (CLS).
- Proper `<title>`, `<meta name="description">`, and `<link rel="canonical">`.
- Skip-link-friendly ids and ARIA labels.
- No autoplaying audio until the user taps Play.

## Rebuilding locally

If you edit the TypeScript source under `george-guppy/src/`, run:

```powershell
node tools/build-site-game.mjs
```

This uses only Node's built-in TypeScript strip feature so it works even when
`npm install` is blocked.
