                                                     
                                                        

/**
 * Builds the UI text shown in the top-left panel during gameplay.
 * Extracted from GameScene so it can be unit-tested without Phaser.
 */
export function formatUiText(levelName        , bubbleCount        )         {
  return `Level: ${levelName}\nBubbles: ${bubbleCount}`;
}

/**
 * Clamps a requested level index to the range of available levels.
 * Mirrors the clamping used in GameScene.init().
 */
export function clampLevelIndex(index        , levelCount        )         {
  if (!Number.isFinite(index) || !Number.isFinite(levelCount)) {
    return 0;
  }
  if (levelCount <= 0) {
    return 0;
  }
  return Math.max(0, Math.min(levelCount - 1, index));
}

/**
 * Validates a set of level configurations against the available texture keys
 * and dialogue banks. Returns an array of human-readable error messages;
 * an empty array means every level is loadable.
 */
export function validateLevelData(
  levels                        ,
  dialogues                                                   ,
  textures                   
)           {
  const errors           = [];
  const textureSet = new Set(textures);

  for (const level of levels) {
    const levelLabel = level.name ?? `Level ${level.id + 1}`;

    if (!textureSet.has(level.backgroundKey)) {
      errors.push(`${levelLabel}: missing background texture "${level.backgroundKey}"`);
    }

    if (level.width <= 0 || level.height <= 0) {
      errors.push(`${levelLabel}: level dimensions must be positive`);
    }

    if (
      level.playerStart.x < 0 ||
      level.playerStart.x > level.width ||
      level.playerStart.y < 0 ||
      level.playerStart.y > level.height
    ) {
      errors.push(`${levelLabel}: playerStart out of bounds`);
    }

    for (const npc of level.npcs) {
      if (!textureSet.has(npc.texture)) {
        errors.push(`${levelLabel}: missing NPC texture "${npc.texture}"`);
      }
      if (!dialogues[npc.dialogKey]) {
        errors.push(`${levelLabel}: missing dialog key "${npc.dialogKey}"`);
      }
    }

    if (level.hazards) {
      for (const hazard of level.hazards) {
        if (!textureSet.has(hazard.texture)) {
          errors.push(`${levelLabel}: missing hazard texture "${hazard.texture}"`);
        }
      }
    }
  }

  return errors;
}
