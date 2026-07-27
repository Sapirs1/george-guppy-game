export interface LevelConfig {
  id: number;
  name: string;
  backgroundKey: string;
  width: number;
  height: number;
  playerStart: { x: number; y: number };
  walls: { x: number; y: number }[];
  bubbles: { x: number; y: number; text?: string }[];
  npcs: { x: number; y: number; texture: string; dialogKey: string }[];
  hazards?: { x: number; y: number; texture: string }[];
  objective?: string;
}

export const levels: LevelConfig[] = [
  {
    id: 0,
    name: 'Strange Tank',
    backgroundKey: 'bg_strange_tank',
    width: 800,
    height: 600,
    playerStart: { x: 120, y: 300 },
    walls: [
      { x: 250, y: 180 },
      { x: 300, y: 180 },
      { x: 550, y: 420 },
      { x: 500, y: 120 },
      { x: 700, y: 250 },
    ],
    bubbles: [
      { x: 320, y: 260, text: 'not' },
      { x: 520, y: 360, text: 'my' },
      { x: 680, y: 160, text: 'tank' },
    ],
    npcs: [
      { x: 700, y: 500, texture: 'snail', dialogKey: 'snail_intro' },
    ],
    objective: 'Collect all bubbles and talk to the snail',
  },
  {
    id: 1,
    name: 'Rain Barrel',
    backgroundKey: 'bg_rain_barrel',
    width: 800,
    height: 600,
    playerStart: { x: 80, y: 300 },
    walls: [
      { x: 0, y: 0 },
      { x: 50, y: 0 },
      { x: 100, y: 0 },
      { x: 200, y: 0 },
      { x: 600, y: 0 },
      { x: 650, y: 0 },
      { x: 700, y: 0 },
      { x: 750, y: 0 },
      { x: 0, y: 550 },
      { x: 750, y: 550 },
      { x: 150, y: 100 },
      { x: 600, y: 450 },
    ],
    bubbles: [
      { x: 200, y: 200, text: 'too' },
      { x: 400, y: 300, text: 'dark' },
      { x: 650, y: 150, text: 'in' },
      { x: 500, y: 500, text: 'here' },
    ],
    npcs: [
      { x: 700, y: 300, texture: 'frog', dialogKey: 'frog_barrel' },
    ],
    hazards: [
      { x: 400, y: 520, texture: 'drain' },
    ],
    objective: 'Avoid the drain and collect every bubble',
  },
  {
    id: 2,
    name: 'Kitchen Sink',
    backgroundKey: 'bg_kitchen_sink',
    width: 800,
    height: 600,
    objective: 'Find the sponge of wisdom',
    playerStart: { x: 100, y: 500 },
    walls: [
      { x: 0, y: 0 },
      { x: 50, y: 0 },
      { x: 100, y: 0 },
      { x: 150, y: 0 },
      { x: 200, y: 0 },
      { x: 250, y: 0 },
      { x: 600, y: 0 },
      { x: 650, y: 0 },
      { x: 700, y: 0 },
      { x: 0, y: 100 },
      { x: 750, y: 100 },
      { x: 300, y: 300 },
      { x: 350, y: 300 },
    ],
    bubbles: [
      { x: 250, y: 200, text: 'far' },
      { x: 550, y: 220, text: 'too' },
      { x: 400, y: 450, text: 'warm' },
      { x: 680, y: 480, text: 'here' },
    ],
    npcs: [
      { x: 600, y: 100, texture: 'sponge', dialogKey: 'sponge_wisdom' },
    ],
  },
  {
    id: 3,
    name: 'Homecoming',
    backgroundKey: 'bg_homecoming',
    width: 800,
    height: 600,
    objective: 'Return home at last',
    playerStart: { x: 60, y: 300 },
    walls: [
      { x: 350, y: 150 },
      { x: 400, y: 150 },
      { x: 450, y: 150 },
      { x: 550, y: 400 },
    ],
    bubbles: [
      { x: 220, y: 280, text: 'home' },
      { x: 500, y: 320, text: 'at' },
      { x: 700, y: 500, text: 'last' },
    ],
    npcs: [
      // Deliberately NOT 'victory_epilogue' — that bank is the finale, and
      // giving it to this snail let a child read the ending before earning it,
      // then watch it replay on completion.
      { x: 700, y: 120, texture: 'snail', dialogKey: 'snail_homecoming' },
    ],
  },
];
