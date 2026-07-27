# Om Nom Run — hybrid reconnaissance learnings

## Method

The project uses a **hybrid reconnaissance workflow** requested by the user:

1. **Playwright MCP half** — drives the real browser, captures rendered UI screenshots,
   enumerates the live PlayCanvas `pc.app` entity tree, and inspects console/network state.
2. **Lightweight fetch half** — a Python stdlib-based scraper (`tools/omnom_hybrid_probe.py`)
   that pulls the PlayCanvas scene file (`1121883.json`) and asset manifest (`config.json`)
   directly from the Famobi CDN without a headless browser.

`scrapling` itself cannot be installed in this locked-down environment, so the lightweight
half was implemented using only `urllib` + `json` from the Python standard library. This
keeps the same spirit of the hybrid method while respecting autopilot security restrictions.

## URLs

- Wrapper: `https://play.famobi.com/wrapper/om-nom-run/A1000-10`
- Game iframe: `https://play.famobi.com/om-nom-run/A1000-10B`
- CDN game: `https://games.cdn.famobi.com/html5games/o/om-nom-run/v1240/`
- Scene: `https://games.cdn.famobi.com/html5games/o/om-nom-run/v1240/1121883.json`
- Config: `https://games.cdn.famobi.com/html5games/o/om-nom-run/v1240/config.json`

## Engine/stack (from `__settings__.js`)

- **PlayCanvas** (`playcanvas-stable.min.js`)
- **Ammo.js** WASM physics, gravity `[0, -9.8, 0]`
- **BASIS** texture compression
- 3,335 assets: 135 scripts, 502 textures, 814 models, 47 audio clips, 275 animations
- `SCENE_PATH = "1121883.json"`, `CONFIG_FILENAME = "config.json"`
- Input enabled: keyboard, mouse, touch

## UX patterns observed (lobby screenshot)

- Centered rounded modal popups with thick colored borders, drop shadows, and a clear
  close button (`COLLECT REWARD` → `CLAIM`).
- Oversized, saturated CTA buttons (`GO!`, `CLAIM`) with bold text.
- Top bar with a small currency icon + counter and a settings gear.
- Side feature icons (calendar = daily rewards, trophy = achievements).
- 3D rendered background behind UI layers.
- Bright, cartoon palette and consistent iconography.

## Gameplay architecture (from runtime + script inventory)

- Lane-change runner with swipe/keyboard input (`characterLaneChangeController.js`).
- Character controller, movement controller, raycast/collision controllers.
- Power-ups: magnet, high-jump boots, rocket, double coins, x5 multiplier
  (`powerupCollectable.js`, `powerupManager.js`, `powerupSpot.js`).
- Mission system (`MissionPanelBig.js`, `MissionPanelSmall.js`, `MissionTypes.js`,
  `levelMissionController.js`, `MissionReward.js`, `MissionTarget.js`).
- Meta screens: `DailyRewardsPopup`, `LuckWheelLocation`, `MissionsLocation`,
  `CharacterUpgradeLocation`, `StuntChampionshipLocation`, `RevivePopup`,
  `GiveUpPopup`, `RestartLocation`, `FreeRunLocation`, `SettingsPopup`.
- Audio architecture: `soundController.js`, `musicController.js`.
- Save/progression: `localStorageController.js`, `ScaleManager.js`.

## What was ported to George Guppy

Because George Guppy is a narrative tap-to-swim puzzle game, not an endless runner, we
ported the **polish patterns**, not the runner mechanics:

- Rounded modal overlays with drop shadows and bold CTAs (`PauseOverlay`,
  `LevelCompleteOverlay`).
- Top-corner pause/settings icons.
- HUD panel with an icon and counter.
- Reward-style level-complete card with a particle burst.
- Big, saturated `PLAY` button on the menu with hover feedback.
- Smoother loading bar in `BootScene`.
- Centralized `SoundManager` inspired by `soundController.js` / `musicController.js`
  so scenes ask for "play bubble blip" or "start ambience" instead of touching raw
  Web Audio nodes.

## Remaining opportunities

If the project ever becomes more arcade-like, Om Nom Run proves the value of:

- A centralized `SoundManager` that mirrors `soundController.js`/`musicController.js`.
- A `MissionManager` that tracks per-level objectives and feeds a HUD mission panel.
- `TriggerController`-style event zones that fire once, e.g., door open, boss spawn.
- Temporary power-up collectables managed by a `PowerupManager`.
- Daily reward / streak system via `DailyRewardsPopup` analog.
