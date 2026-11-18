export {
  PATH_COLORS,
  TOWER_ORDER,
  TOWERS,
  buildStats,
  describePaths,
  pathCode,
  upgradeBlock,
  upgradeCost,
  type Built,
  type Flight,
  type HudPath,
  type PathLevels,
  type ShotArt,
  type TowerDef,
  type TowerKind,
  type UpgradeState,
} from "@/game/catalog";

export type CreepKind = "grub" | "mite" | "beetle" | "shell" | "wisp" | "cluster" | "maw";
export type Aim = "first" | "last" | "close" | "strong";

export const COLS = 16;
export const ROWS = 10;

export const START_GOLD = 170;
export const START_LIVES = 20;
export const SELL_RATE = 0.6;

export type Vec = { x: number; y: number };

/** Cell-center waypoints, including the entrance just inside the rift. */
export const WAYPOINTS: Vec[] = [
  { x: 0.2, y: 2.5 },
  { x: 7.5, y: 2.5 },
  { x: 7.5, y: 5.5 },
  { x: 2.5, y: 5.5 },
  { x: 2.5, y: 8.5 },
  { x: 15.15, y: 8.5 },
];

const pathCells = new Set<string>();
function row(x0: number, x1: number, y: number) {
  for (let x = x0; x <= x1; x++) pathCells.add(`${x},${y}`);
}
function col(x: number, y0: number, y1: number) {
  for (let y = y0; y <= y1; y++) pathCells.add(`${x},${y}`);
}
row(0, 7, 2);
col(7, 2, 5);
row(2, 7, 5);
col(2, 5, 8);
row(2, 15, 8);

export const PATH_CELLS = pathCells;

export function pointAlong(dist: number) {
  let left = Math.max(0, dist);
  let x = WAYPOINTS[0].x;
  let y = WAYPOINTS[0].y;
  for (let i = 1; i < WAYPOINTS.length; i++) {
    const p = WAYPOINTS[i];
    const seg = Math.hypot(p.x - x, p.y - y);
    if (left <= seg) {
      const t = seg > 0 ? left / seg : 0;
      return { x: x + (p.x - x) * t, y: y + (p.y - y) * t, wp: i, dist: Math.max(0, dist) };
    }
    left -= seg;
    x = p.x;
    y = p.y;
  }
  return { x, y, wp: WAYPOINTS.length, dist: Math.max(0, dist - left) };
}

export const PATH_SAMPLES: Vec[] = (() => {
  const out: Vec[] = [];
  for (let i = 1; i < WAYPOINTS.length; i++) {
    const a = WAYPOINTS[i - 1];
    const b = WAYPOINTS[i];
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    const steps = Math.max(1, Math.round(len / 0.45));
    for (let s = 0; s <= steps; s++) {
      const t = s / steps;
      out.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
    }
  }
  return out;
})();

export function stakeSpots(x: number, y: number, range: number, drops: number): Vec[] {
  const r2 = range * range;
  let bestI = -1;
  let bestD = Infinity;
  for (let i = 0; i < PATH_SAMPLES.length; i++) {
    const sample = PATH_SAMPLES[i];
    const d = (sample.x - x) ** 2 + (sample.y - y) ** 2;
    if (d <= r2 && d < bestD) {
      bestD = d;
      bestI = i;
    }
  }
  if (bestI < 0) return [];
  const out = [PATH_SAMPLES[bestI]];
  if (drops > 1) {
    const j = Math.min(PATH_SAMPLES.length - 1, bestI + 2);
    if (j !== bestI) out.push(PATH_SAMPLES[j]);
  }
  return out;
}

/** Decor that isn't road but shouldn't take a tower. */
export const BLOCKED = new Set(["0,1", "0,3", "14,7", "15,7", "14,9", "15,9"]);

export function cellKey(x: number, y: number) {
  return `${x},${y}`;
}

export function isBuildable(cx: number, cy: number) {
  if (cx < 0 || cy < 0 || cx >= COLS || cy >= ROWS) return false;
  const key = cellKey(cx, cy);
  return !PATH_CELLS.has(key) && !BLOCKED.has(key);
}

export type CreepDef = {
  kind: CreepKind;
  name: string;
  hp: number;
  speed: number;
  gold: number;
  armor: number;
  scale: number;
  lead: boolean;
  camo: boolean;
  splits: number;
};

export const CREEPS: Record<CreepKind, CreepDef> = {
  grub: { kind: "grub", name: "Grub", hp: 32, speed: 0.96, gold: 8, armor: 1, scale: 0.78, lead: false, camo: false, splits: 0 },
  mite: { kind: "mite", name: "Mite", hp: 26, speed: 1.55, gold: 10, armor: 1, scale: 0.7, lead: false, camo: false, splits: 0 },
  beetle: { kind: "beetle", name: "Beetle", hp: 155, speed: 0.6, gold: 18, armor: 0.78, scale: 0.96, lead: false, camo: false, splits: 0 },
  shell: { kind: "shell", name: "Shell", hp: 78, speed: 0.62, gold: 13, armor: 1, scale: 0.9, lead: true, camo: false, splits: 0 },
  wisp: { kind: "wisp", name: "Wisp", hp: 20, speed: 1.72, gold: 11, armor: 1, scale: 0.74, lead: false, camo: true, splits: 0 },
  cluster: { kind: "cluster", name: "Cluster", hp: 210, speed: 0.52, gold: 10, armor: 0.88, scale: 1.05, lead: false, camo: false, splits: 3 },
  maw: { kind: "maw", name: "Maw", hp: 980, speed: 0.4, gold: 140, armor: 0.9, scale: 1.38, lead: false, camo: false, splits: 0 },
};

export type WaveGroup = { kind: CreepKind; count: number; every: number };

export const WAVES: WaveGroup[][] = [
  [{ kind: "grub", count: 8, every: 1.05 }],
  [{ kind: "grub", count: 12, every: 0.72 }],
  [
    { kind: "grub", count: 6, every: 0.7 },
    { kind: "mite", count: 8, every: 0.46 },
  ],
  [
    { kind: "mite", count: 8, every: 0.42 },
    { kind: "shell", count: 4, every: 0.85 },
  ],
  [
    { kind: "beetle", count: 3, every: 1.2 },
    { kind: "grub", count: 8, every: 0.48 },
    { kind: "shell", count: 3, every: 0.75 },
  ],
  [
    { kind: "mite", count: 8, every: 0.36 },
    { kind: "wisp", count: 8, every: 0.4 },
  ],
  [
    { kind: "beetle", count: 4, every: 1 },
    { kind: "wisp", count: 7, every: 0.36 },
    { kind: "shell", count: 3, every: 0.7 },
  ],
  [
    { kind: "cluster", count: 4, every: 1.1 },
    { kind: "mite", count: 8, every: 0.32 },
  ],
  [
    { kind: "wisp", count: 10, every: 0.3 },
    { kind: "beetle", count: 5, every: 0.85 },
    { kind: "cluster", count: 3, every: 1.05 },
  ],
  [
    { kind: "shell", count: 5, every: 0.55 },
    { kind: "wisp", count: 6, every: 0.34 },
    { kind: "maw", count: 1, every: 0.2 },
    { kind: "cluster", count: 2, every: 0.9 },
  ],
  [
    { kind: "cluster", count: 4, every: 0.85 },
    { kind: "beetle", count: 4, every: 0.7 },
    { kind: "wisp", count: 8, every: 0.28 },
  ],
  [
    { kind: "mite", count: 8, every: 0.26 },
    { kind: "shell", count: 5, every: 0.45 },
    { kind: "maw", count: 1, every: 0.2 },
    { kind: "cluster", count: 3, every: 0.75 },
    { kind: "wisp", count: 6, every: 0.24 },
  ],
];

export function waveHpMul(waveIndex: number) {
  return 1 + waveIndex * 0.09;
}

export function creepStats(kind: CreepKind, waveIndex: number) {
  const def = CREEPS[kind];
  const mul = waveHpMul(waveIndex);
  return {
    ...def,
    hp: Math.round(def.hp * mul),
    gold: def.gold + Math.floor(waveIndex / 2),
  };
}

export function clearBonus(wave: number) {
  return 16 + wave * 7;
}

export type ScriptEntry = { kind: CreepKind; delay: number };

export function expandWave(waveIndex: number): ScriptEntry[] {
  const out: ScriptEntry[] = [];
  let t = 0.35;
  const groups = WAVES[waveIndex] ?? [];
  groups.forEach((group, gi) => {
    for (let i = 0; i < group.count; i++) {
      out.push({ kind: group.kind, delay: t });
      t += group.every;
    }
    if (gi < groups.length - 1) t += 0.9;
  });
  return out;
}

export function wavePreview(waveIndex: number) {
  const groups = WAVES[waveIndex] ?? [];
  return groups
    .map((g) => {
      const name = CREEPS[g.kind].name;
      const label = g.count === 1 ? name : `${name}s`;
      return `${g.count} ${label}`;
    })
    .join(" · ");
}

export function waveHint(waveIndex: number) {
  const kinds = new Set((WAVES[waveIndex] ?? []).map((group) => group.kind));
  if (kinds.has("maw")) return "A Maw is in this wave. Aim Strong.";
  if (kinds.has("wisp") && kinds.has("shell")) return "Wisps hide from towers without sight. Shells ignore sharp steel.";
  if (kinds.has("wisp")) return "Wisps are unseen unless a path grants sight. Stakes on the road still bite them.";
  if (kinds.has("shell")) return "Shells ignore sharp steel. Blast, frost, or a path that cracks shells.";
  if (kinds.has("cluster")) return "Clusters split into Grubs when they fall.";
  return "";
}

export function pluralName(kind: CreepKind, n: number) {
  const name = CREEPS[kind].name;
  return n === 1 ? name : `${name}s`;
}

export const AIM_OPTIONS: { id: Aim; label: string }[] = [
  { id: "first", label: "First" },
  { id: "last", label: "Last" },
  { id: "close", label: "Near" },
  { id: "strong", label: "Strong" },
];
