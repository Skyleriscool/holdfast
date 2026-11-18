export type TowerKind = "sentry" | "burr" | "glaive" | "rime" | "mortar" | "lance" | "stake";
export type Flight = "homing" | "lob" | "linear" | "radial" | "stake";
export type ShotArt = "bolt" | "shell" | "frost" | "spark" | "glaive" | "thorn";
export type DamageType = "sharp" | "blast" | "cold";
export type PathLevels = [number, number, number];

export const PATH_COLORS = ["#d4845a", "#7ea37a", "#8aa0b8"] as const;
export const TIER_COUNT = 3;
const TIER_MUL = [0.48, 0.92, 2.15];

export type TierFx = {
  dmg?: number;
  rate?: number;
  range?: number;
  pierce?: number;
  shots?: number;
  radial?: number;
  splash?: number;
  slow?: number;
  slowDur?: number;
  popsLead?: boolean;
  detect?: boolean;
  pen?: boolean;
  burn?: number;
  burnDur?: number;
  shred?: number;
  bonus?: number;
  knock?: number;
  spikeHits?: number;
  spikeLife?: number;
  drops?: number;
  frag?: number;
};

export type UpgradeTier = { name: string; blurb: string; effect: TierFx };
export type UpgradePath = { name: string; tiers: [UpgradeTier, UpgradeTier, UpgradeTier] };

export type TowerDef = {
  kind: TowerKind;
  name: string;
  blurb: string;
  cost: number;
  range: number;
  damage: number;
  rate: number;
  speed: number;
  splash: number;
  slow: number;
  slowDur: number;
  pierce: number;
  radial: number;
  returns: boolean;
  spikeHits: number;
  spikeLife: number;
  flight: Flight;
  damageType: DamageType;
  shot: ShotArt;
  paths: [UpgradePath, UpgradePath, UpgradePath];
};

function tier(name: string, blurb: string, effect: TierFx): UpgradeTier {
  return { name, blurb, effect };
}

export const TOWERS: Record<TowerKind, TowerDef> = {
  sentry: {
    kind: "sentry",
    name: "Sentry",
    blurb: "Steady bolts",
    cost: 55,
    range: 2.35,
    damage: 11,
    rate: 1.4,
    speed: 8.5,
    splash: 0,
    slow: 0,
    slowDur: 0,
    pierce: 1,
    radial: 0,
    returns: false,
    spikeHits: 0,
    spikeLife: 0,
    flight: "homing",
    damageType: "sharp",
    shot: "bolt",
    paths: [
      {
        name: "Point",
        tiers: [
          tier("Keen Tip", "Bolts bite deeper.", { dmg: 0.3 }),
          tier("Barbed Bolt", "Each bolt punches through.", { pierce: 2 }),
          tier("Broadhead", "A heavy head that cracks shells.", { dmg: 0.55, pierce: 1, popsLead: true }),
        ],
      },
      {
        name: "Volley",
        tiers: [
          tier("Quick Draw", "The string comes back faster.", { rate: 0.32 }),
          tier("Twin Barrel", "Two bolts leave together.", { shots: 1 }),
          tier("Gatling", "A mean, rattling volley.", { rate: 0.7, shots: 1 }),
        ],
      },
      {
        name: "Sight",
        tiers: [
          tier("Long Barrel", "Watches farther down the road.", { range: 0.2 }),
          tier("Keen Eyes", "Wisps stop being rumors.", { detect: true, range: 0.12 }),
          tier("Deadeye", "Picks the thickest carapace.", { bonus: 0.85, pen: true }),
        ],
      },
    ],
  },
  burr: {
    kind: "burr",
    name: "Burr",
    blurb: "Ring of thorns",
    cost: 70,
    range: 1.42,
    damage: 6,
    rate: 1.2,
    speed: 8.2,
    splash: 0,
    slow: 0,
    slowDur: 0,
    pierce: 1,
    radial: 8,
    returns: false,
    spikeHits: 0,
    spikeLife: 0,
    flight: "radial",
    damageType: "sharp",
    shot: "thorn",
    paths: [
      {
        name: "Blades",
        tiers: [
          tier("More Thorns", "The hub grows another ring.", { radial: 2, dmg: 0.12 }),
          tier("Even More", "Thorns packed shoulder to shoulder.", { radial: 4 }),
          tier("Blade Storm", "The whole ring becomes a storm.", { radial: 4, dmg: 0.45, rate: 0.2 }),
        ],
      },
      {
        name: "Tempo",
        tiers: [
          tier("Faster Hub", "The wheel spins up.", { rate: 0.35 }),
          tier("Relentless", "It barely pauses.", { rate: 0.4 }),
          tier("Thorn Zone", "A blur of iron around the post.", { rate: 0.55, dmg: 0.35 }),
        ],
      },
      {
        name: "Reach",
        tiers: [
          tier("Longer Thorns", "They fly a little farther.", { range: 0.28 }),
          tier("Hot Shots", "Heated tips crack shells.", { popsLead: true, burn: 4, burnDur: 1.5 }),
          tier("Inferno Ring", "The ring leaves a scorch.", { range: 0.22, dmg: 0.5, burn: 9, burnDur: 2.2, popsLead: true }),
        ],
      },
    ],
  },
  glaive: {
    kind: "glaive",
    name: "Glaive",
    blurb: "Blades that return",
    cost: 95,
    range: 2.6,
    damage: 10,
    rate: 1.05,
    speed: 6.6,
    splash: 0,
    slow: 0,
    slowDur: 0,
    pierce: 3,
    radial: 0,
    returns: true,
    spikeHits: 0,
    spikeLife: 0,
    flight: "linear",
    damageType: "sharp",
    shot: "glaive",
    paths: [
      {
        name: "Edge",
        tiers: [
          tier("Gleaming", "A cleaner cut.", { dmg: 0.25 }),
          tier("Serrated", "The blade keeps its victims.", { pierce: 2, dmg: 0.15 }),
          tier("Glaive Lord", "A burning edge that cracks shells.", { dmg: 0.5, pierce: 2, popsLead: true, burn: 5, burnDur: 1.4 }),
        ],
      },
      {
        name: "Throw",
        tiers: [
          tier("Faster Throw", "The arm comes around quicker.", { rate: 0.3 }),
          tier("Twin Glaive", "Two blades in the air.", { shots: 1 }),
          tier("Fan of Blades", "A handful, all at once.", { shots: 1, rate: 0.4 }),
        ],
      },
      {
        name: "Flight",
        tiers: [
          tier("Long Flight", "The arc reaches farther.", { range: 0.22 }),
          tier("Press", "The return shoves them back.", { knock: 0.45, slow: 0.2, slowDur: 0.7 }),
          tier("Maw Press", "Big bodies get bullied. Wisps show.", { knock: 0.9, slow: 0.35, slowDur: 1.1, bonus: 0.45, detect: true }),
        ],
      },
    ],
  },
  rime: {
    kind: "rime",
    name: "Rime",
    blurb: "Frost that slows",
    cost: 90,
    range: 1.95,
    damage: 5,
    rate: 1.15,
    speed: 6.4,
    splash: 0,
    slow: 0.46,
    slowDur: 1.7,
    pierce: 1,
    radial: 0,
    returns: false,
    spikeHits: 0,
    spikeLife: 0,
    flight: "homing",
    damageType: "cold",
    shot: "frost",
    paths: [
      {
        name: "Chill",
        tiers: [
          tier("Permafrost", "The cold lingers.", { slowDur: 0.8, slow: 0.08 }),
          tier("Deep Freeze", "Legs go stiff.", { slow: 0.18 }),
          tier("Absolute Zero", "A pulse of stillness.", { splash: 1.05, slow: 0.1, dmg: 0.35 }),
        ],
      },
      {
        name: "Shard",
        tiers: [
          tier("Harder Ice", "The shard hits like stone.", { dmg: 0.45 }),
          tier("Shatter", "Ice bursts on impact.", { splash: 0.72, dmg: 0.2 }),
          tier("Impale", "Pins the thick ones in place.", { dmg: 0.8, pierce: 3, bonus: 0.7, pen: true }),
        ],
      },
      {
        name: "Brittle",
        tiers: [
          tier("Cold Snap", "A wider bite of winter.", { range: 0.16, slowDur: 0.4 }),
          tier("Embrittlement", "Frozen hides take more.", { shred: 0.28 }),
          tier("Super Brittle", "Everything afterward hurts more.", { shred: 0.5, slow: 0.08 }),
        ],
      },
    ],
  },
  mortar: {
    kind: "mortar",
    name: "Mortar",
    blurb: "Arcing shells",
    cost: 135,
    range: 3.15,
    damage: 26,
    rate: 0.46,
    speed: 0,
    splash: 1.12,
    slow: 0,
    slowDur: 0,
    pierce: 1,
    radial: 0,
    returns: false,
    spikeHits: 0,
    spikeLife: 0,
    flight: "lob",
    damageType: "blast",
    shot: "shell",
    paths: [
      {
        name: "Blast",
        tiers: [
          tier("Bigger Shells", "A wider crater.", { splash: 0.28, dmg: 0.2 }),
          tier("Frag Burst", "The shell throws splinters.", { frag: 4, dmg: 0.15 }),
          tier("The Big One", "One shell. A lot of road.", { splash: 0.5, dmg: 0.55, burn: 8, burnDur: 2 }),
        ],
      },
      {
        name: "Barrage",
        tiers: [
          tier("Faster Reload", "The crew works quicker.", { rate: 0.32 }),
          tier("Rapid Shells", "The tube stays hot.", { rate: 0.42 }),
          tier("Artillery", "Three shells, one order.", { shots: 2, rate: 0.2 }),
        ],
      },
      {
        name: "Signal",
        tiers: [
          tier("Ranging", "The spotter calls farther.", { range: 0.16 }),
          tier("Signal Flare", "Wisps light up for the crew.", { detect: true }),
          tier("Burning Ground", "The crater keeps cooking.", { burn: 12, burnDur: 2.4, splash: 0.15 }),
        ],
      },
    ],
  },
  lance: {
    kind: "lance",
    name: "Lance",
    blurb: "Long rapid sparks",
    cost: 175,
    range: 3.85,
    damage: 13,
    rate: 2.35,
    speed: 13,
    splash: 0,
    slow: 0,
    slowDur: 0,
    pierce: 1,
    radial: 0,
    returns: false,
    spikeHits: 0,
    spikeLife: 0,
    flight: "homing",
    damageType: "sharp",
    shot: "spark",
    paths: [
      {
        name: "Caliber",
        tiers: [
          tier("Full Metal", "Jackets that crack shells.", { dmg: 0.35, popsLead: true }),
          tier("Deadly Precision", "It prefers a large target.", { bonus: 0.45 }),
          tier("Cripple", "A shot that staggers the big ones.", { dmg: 0.65, slow: 0.4, slowDur: 1.15, knock: 0.28 }),
        ],
      },
      {
        name: "Semi",
        tiers: [
          tier("Faster Firing", "The trigger gets lighter.", { rate: 0.28 }),
          tier("Even Faster", "Short, sharp bursts.", { rate: 0.38 }),
          tier("Full Auto", "It does not let go.", { rate: 0.75 }),
        ],
      },
      {
        name: "Focus",
        tiers: [
          tier("Longer Barrel", "The spark carries farther.", { range: 0.18 }),
          tier("Shrapnel", "The hit throws scrap.", { splash: 0.55 }),
          tier("Elite Focus", "Sees wisps. Ignores plate.", { detect: true, pen: true, bonus: 0.35 }),
        ],
      },
    ],
  },
  stake: {
    kind: "stake",
    name: "Stake",
    blurb: "Iron on the road",
    cost: 120,
    range: 2.4,
    damage: 16,
    rate: 0.48,
    speed: 0,
    splash: 0,
    slow: 0,
    slowDur: 0,
    pierce: 1,
    radial: 0,
    returns: false,
    spikeHits: 5,
    spikeLife: 9,
    flight: "stake",
    damageType: "sharp",
    shot: "thorn",
    paths: [
      {
        name: "Pile",
        tiers: [
          tier("Bigger Piles", "More iron in the heap.", { spikeHits: 3, dmg: 0.2 }),
          tier("White Hot", "Hot stakes crack shells.", { popsLead: true, burn: 6, burnDur: 1.5 }),
          tier("Carpet", "Two heaps along the road.", { spikeHits: 5, dmg: 0.35, drops: 1 }),
        ],
      },
      {
        name: "Works",
        tiers: [
          tier("Faster Production", "The winch never idles.", { rate: 0.35 }),
          tier("Even Faster", "Piles arrive back to back.", { rate: 0.4 }),
          tier("Carapace Bite", "Built to chew plate and bosses.", { dmg: 0.45, rate: 0.25, bonus: 0.55, pen: true }),
        ],
      },
      {
        name: "Stock",
        tiers: [
          tier("Long Life", "The heap waits.", { spikeLife: 8 }),
          tier("Deadly Stakes", "Fewer, and they hurt.", { dmg: 0.6 }),
          tier("Permaspike", "A stockpile that barely fades.", { spikeLife: 40, spikeHits: 4, dmg: 0.35 }),
        ],
      },
    ],
  },
};

export const TOWER_ORDER: TowerKind[] = ["sentry", "burr", "glaive", "rime", "mortar", "lance", "stake"];

export function upgradeCost(kind: TowerKind, tierIndex: number) {
  if (tierIndex < 0 || tierIndex >= TIER_COUNT) return 0;
  return Math.max(10, Math.round(TOWERS[kind].cost * TIER_MUL[tierIndex]));
}

export type UpgradeState = "ok" | "max" | "cross";

/** One path may reach tier 3. A second path stops at tier 2. The third stays shut. */
export function upgradeBlock(levels: PathLevels, path: number): UpgradeState {
  if (levels[path] >= TIER_COUNT) return "max";
  const next: PathLevels = [levels[0], levels[1], levels[2]];
  next[path] += 1;
  if (next.filter((v) => v > 0).length > 2) return "cross";
  const sorted = [...next].sort((a, b) => b - a);
  if (sorted[1] > 2) return "cross";
  return "ok";
}

export function pathCode(levels: PathLevels) {
  return `${levels[0]}-${levels[1]}-${levels[2]}`;
}

export type Built = {
  damage: number;
  rate: number;
  range: number;
  pierce: number;
  splash: number;
  slow: number;
  slowDur: number;
  shots: number;
  radial: number;
  popsLead: boolean;
  detect: boolean;
  pen: boolean;
  burn: number;
  burnDur: number;
  shred: number;
  bonus: number;
  knock: number;
  spikeHits: number;
  spikeLife: number;
  drops: number;
  frag: number;
  returns: boolean;
  speed: number;
  flight: Flight;
};

export function buildStats(kind: TowerKind, levels: PathLevels): Built {
  const def = TOWERS[kind];
  let dmg = 1;
  let rate = 1;
  let range = 1;
  const built: Built = {
    damage: def.damage,
    rate: def.rate,
    range: def.range,
    pierce: def.pierce,
    splash: def.splash,
    slow: def.slow,
    slowDur: def.slowDur,
    shots: 1,
    radial: def.radial,
    popsLead: def.damageType !== "sharp",
    detect: false,
    pen: def.damageType === "blast",
    burn: 0,
    burnDur: 0,
    shred: 0,
    bonus: 0,
    knock: 0,
    spikeHits: def.spikeHits,
    spikeLife: def.spikeLife,
    drops: 1,
    frag: 0,
    returns: def.returns,
    speed: def.speed,
    flight: def.flight,
    };
  for (let p = 0; p < 3; p++) {
    const n = levels[p] ?? 0;
    for (let i = 0; i < n; i++) {
      const effect = def.paths[p].tiers[i].effect;
      if (effect.dmg) dmg += effect.dmg;
      if (effect.rate) rate += effect.rate;
      if (effect.range) range += effect.range;
      if (effect.pierce) built.pierce += effect.pierce;
      if (effect.shots) built.shots += effect.shots;
      if (effect.radial) built.radial += effect.radial;
      if (effect.splash) built.splash += effect.splash;
      if (effect.slow) built.slow += effect.slow;
      if (effect.slowDur) built.slowDur += effect.slowDur;
      if (effect.popsLead) built.popsLead = true;
      if (effect.detect) built.detect = true;
      if (effect.pen) built.pen = true;
      if (effect.burn) built.burn = Math.max(built.burn, effect.burn);
      if (effect.burnDur) built.burnDur = Math.max(built.burnDur, effect.burnDur);
      if (effect.shred) built.shred = Math.max(built.shred, effect.shred);
      if (effect.bonus) built.bonus += effect.bonus;
      if (effect.knock) built.knock = Math.max(built.knock, effect.knock);
      if (effect.spikeHits) built.spikeHits += effect.spikeHits;
      if (effect.spikeLife) built.spikeLife += effect.spikeLife;
      if (effect.drops) built.drops += effect.drops;
      if (effect.frag) built.frag += effect.frag;
    }
  }
  built.damage = def.damage * dmg;
  built.rate = def.rate * rate;
  built.range = def.range * range;
  built.slow = Math.min(0.8, built.slow);
  return built;
}

export type HudPath = {
  index: number;
  name: string;
  level: number;
  nextName: string;
  nextBlurb: string;
  cost: number;
  state: UpgradeState;
  owned: string[];
};

export function describePaths(kind: TowerKind, levels: PathLevels): HudPath[] {
  return [0, 1, 2].map((index) => {
    const path = TOWERS[kind].paths[index];
    const level = levels[index] ?? 0;
    const state = upgradeBlock(levels, index);
    const next = level < TIER_COUNT ? path.tiers[level] : null;
    return {
      index,
      name: path.name,
      level,
      nextName: next?.name ?? path.tiers[TIER_COUNT - 1].name,
      nextBlurb: next?.blurb ?? "This path is finished.",
      cost: next && state === "ok" ? upgradeCost(kind, level) : 0,
      state,
      owned: path.tiers.slice(0, level).map((entry) => entry.name),
    };
  });
}
