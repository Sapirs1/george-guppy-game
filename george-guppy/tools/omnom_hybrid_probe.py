"""
Hybrid probe for Om Nom Run (Scrapling-style + Playwright MCP fallback).

Because Scrapling itself cannot be installed in this locked-down autopilot
environment, this script re-implements the lightweight-fetch half of the hybrid
method using only Python's standard library (urllib + json). It pulls the
Om Nom Run PlayCanvas scene manifest and scene graph, then derives a concise
feature/UX inventory that can be folded back into George Guppy.

The companion Playwright MCP half already drove the live page and produced
screenshots (omnom-*.png) and runtime entity enumeration.
"""

import json
import urllib.request
from urllib.error import HTTPError, URLError
from pathlib import Path

BASE = "https://games.cdn.famobi.com/html5games/o/om-nom-run/v1240/"
SCENE_URL = BASE + "1121883.json"
CONFIG_URL = BASE + "config.json"
OUT_DIR = Path(__file__).resolve().parent.parent / "research"


def fetch_json(url: str, timeout: int = 30) -> tuple[object | None, str | None]:
    req = urllib.request.Request(
        url,
        headers={
            "User-Agent": (
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/125.0.0.0 Safari/537.36"
            ),
            "Accept": "application/json,*/*",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return json.loads(resp.read().decode("utf-8")), None
    except HTTPError as e:
        return None, f"HTTP {e.code} {e.reason}"
    except URLError as e:
        return None, str(e.reason)
    except json.JSONDecodeError as e:
        return None, f"JSON decode error: {e}"


def summarize_scene(scene: dict) -> dict:
    raw_entities = scene.get("entities", [])

    # PlayCanvas scenes are sometimes stored as a dict keyed by GUID. The file we target
    # uses a compressed format where entity names are replaced by short symbols; readable
    # names only appear at runtime after the engine rehydrates them. We therefore report
    # structural facts and let the Playwright MCP half supply readable entity names.
    if isinstance(raw_entities, dict):
        entity_count = len(raw_entities)
    elif isinstance(raw_entities, list):
        entity_count = len(raw_entities)
    else:
        entity_count = 0

    return {
        "total_entities": entity_count,
        "scene_name": scene.get("name"),
        "settings_sample": {k: scene.get("settings", {}).get(k) for k in ["physics", "render"] if scene.get("settings", {}).get(k)},
    }


def summarize_config(config: dict) -> dict:
    assets = config.get("assets", {})
    type_counts: dict[str, int] = {}
    scripts: list[str] = []
    audio: list[str] = []
    textures: list[str] = []
    models: list[str] = []

    for asset in assets.values():
        if not isinstance(asset, dict):
            continue
        t = asset.get("type", "unknown")
        type_counts[t] = type_counts.get(t, 0) + 1
        name = (
            asset.get("name")
            or (asset.get("data") or {}).get("name")
            or (asset.get("file") or {}).get("filename")
            or ""
        )
        if t == "script" and name:
            scripts.append(name)
        elif t == "audio" and name:
            audio.append(name)
        elif t == "texture" and name:
            textures.append(name)
        elif t == "model" and name:
            models.append(name)

    gameplay_scripts = sorted(
        [s for s in scripts if any(k in s.lower() for k in [
            "controller", "manager", "powerup", "collectable", "mission",
            "camera", "character", "popup", "location", "parser", "trigger"
        ])]
    )

    return {
        "type_counts": type_counts,
        "script_count": len(scripts),
        "gameplay_scripts": gameplay_scripts[:80],
        "audio_count": len(audio),
        "texture_count": len(textures),
        "model_count": len(models),
        "sample_scripts": sorted(scripts)[:30],
    }


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    report: dict[str, object] = {"source": BASE}

    scene, scene_err = fetch_json(SCENE_URL)
    report["scene"] = {"ok": scene is not None, "error": scene_err}
    if scene:
        report["scene_summary"] = summarize_scene(scene)
        (OUT_DIR / "omnom_scene_summary.json").write_text(
            json.dumps(report["scene_summary"], indent=2), encoding="utf-8"
        )

    config, config_err = fetch_json(CONFIG_URL)
    report["config"] = {"ok": config is not None, "error": config_err}
    if config:
        report["config_summary"] = summarize_config(config)
        (OUT_DIR / "omnom_config_summary.json").write_text(
            json.dumps(report["config_summary"], indent=2), encoding="utf-8"
        )

    (OUT_DIR / "omnom_hybrid_report.json").write_text(
        json.dumps(report, indent=2), encoding="utf-8"
    )

    if scene and config:
        print("Hybrid probe succeeded. Summary:")
        print(json.dumps(report, indent=2))
    else:
        print("Hybrid probe partial failure:")
        print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
