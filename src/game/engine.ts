import {
  COLS,
  ROWS,
  SELL_RATE,
  START_GOLD,
  START_LIVES,
  TOWERS,
  WAYPOINTS,
  WAVES,
  buildStats,
  describePaths,
  pointAlong,
  stakeSpots,
  upgradeBlock,
  upgradeCost,
  waveHint,
  wavePreview,
  type Aim,
  type Built,
  type CreepKind,
  type HudPath,
  type PathLevels,
  type TowerKind,
  clearBonus,
  creepStats,
  expandWave,
  isBuildable,
  type ScriptEntry,
} from "@/game/balance";
import { AudioBus } from "@/game/audio";

export type Phase = "menu" | "prep" | "fight" | "won" | "lost";

export type Tower = {
  alive: boolean;
  id: number;
  kind: TowerKind;
  cx: number;
  cy: number;
  x: number;
  y: number;
  cd: number;
  paths: PathLevels;
  spent: number;
  kick: number;
  spin: number;
};

export type Creep = {
  alive: boolean;
  id: number;
  kind: CreepKind;
  x: number;
  y: number;
  wp: number;
  dist: number;
  hp: number;
  maxHp: number;
  speed: number;
  armor: number;
  gold: number;
  slow: number;
  slowT: number;
  flash: number;
  age: number;
  face: number;
  lead: boolean;
  camo: boolean;
  splits: number;
  burn: number;
  burnT: number;
  shred: number;
  shredT: number;
  immuneT: number;
  touchSpike: number;
};

export type HitPayload = {
  dmg: number;
  slow: number;
  slowDur: number;
  splash: boolean;
  pen: boolean;
  popsLead: boolean;
  burn: number;
  burnDur: number;
  shred: number;
  knock: number;
  bonus: number;
};

export type Shot = {
  alive: boolean;
  kind: TowerKind;
  mode: "homing" | "lob" | "linear";
  x: number;
  y: number;
  drawX: number;
  drawY: number;
  angle: number;
  vx: number;
  vy: number;
  tx: number;
  ty: number;
  sx: number;
  sy: number;
  ox: number;
  oy: number;
  target: number;
  dmg: number;
  speed: number;
  splash: number;
  slow: number;
  slowDur: number;
  age: number;
  life: number;
  flight: number;
  pierce: number;
  hits: number[];
  returning: boolean;
  returned: boolean;
  burn: number;
  burnDur: number;
  shred: number;
  knock: number;
  bonus: number;
  pen: boolean;
  popsLead: boolean;
  detect: boolean;
  frag: number;
};

export type Spike = {
  alive: boolean;
  id: number;
  owner: number;
  x: number;
  y: number;
  hits: number;
  dmg: number;
  life: number;
  burn: number;
  burnDur: number;
  popsLead: boolean;
  pen: boolean;
  bonus: number;
};

export type Particle = {
  alive: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  r: number;
  color: string;
};

export type Floater = {
  alive: boolean;
  x: number;
  y: number;
  vy: number;
  text: string;
  life: number;
  max: number;
  gold: boolean;
};

export type HudTower = {
  id: number;
  kind: TowerKind;
  code: string;
  paths: HudPath[];
  damage: number;
  rate: number;
  range: number;
  pierce: number;
  splash: number;
  slow: number;
  sell: number;
};

export type Hud = {
  phase: Phase;
  paused: boolean;
  lives: number;
  gold: number;
  wave: number;
  waves: number;
  preview: string;
  creepsLeft: number;
  placing: TowerKind | null;
  selected: HudTower | null;
  aim: Aim;
  speed: 1 | 2;
  muted: boolean;
  note: string;
  kills: number;
  leaks: number;
  wavesCleared: number;
  score: number;
  best: number;
  hint: string;
};

const BEST_KEY = "holdfast-best";

function makePool<T>(n: number, create: () => T): T[] {
  return Array.from({ length: n }, create);
}

export class Game {
  phase: Phase = "menu";
  paused = false;
  lives = START_LIVES;
  gold = START_GOLD;
  wave = 1;
  aim: Aim = "first";
  speed: 1 | 2 = 1;
  placing: TowerKind | null = null;
  selectedId = 0;
  kills = 0;
  leaks = 0;
  wavesCleared = 0;
  best = 0;
  note = "";
  trauma = 0;
  hurtFlash = 0;
  hover: { x: number; y: number } | null = null;

  towers: Tower[] = [];
  creeps: Creep[] = [];
  shots: Shot[] = [];
  spikes: Spike[] = [];
  particles: Particle[] = [];
  floaters: Floater[] = [];

  private nextId = 1;
  private script: ScriptEntry[] = [];
  private scriptI = 0;
  private spawnT = 0;
  private noteT = 0;
  private hitstop = 0;
  private acc = 0;
  private listeners = new Set<() => void>();
  private rev = 0;
  private snap: Hud | null = null;
  private snapRev = -1;
  readonly audio = new AudioBus();

  constructor() {
    try {
      const saved = Number(localStorage.getItem(BEST_KEY) || 0);
      if (Number.isFinite(saved)) this.best = saved;
    } catch {
      /* private mode */
    }
    this.towers = makePool(48, () => ({
      alive: false,
      id: 0,
      kind: "sentry",
      cx: 0,
      cy: 0,
      x: 0,
      y: 0,
      cd: 0,
      paths: [0, 0, 0],
      spent: 0,
      kick: 0,
      spin: 0,
    }));
    this.creeps = makePool(160, () => ({
      alive: false,
      id: 0,
      kind: "grub",
      x: 0,
      y: 0,
      wp: 1,
      dist: 0,
      hp: 0,
      maxHp: 0,
      speed: 1,
      armor: 1,
      gold: 0,
      slow: 0,
      slowT: 0,
      flash: 0,
      age: 0,
      face: 1,
      lead: false,
      camo: false,
      splits: 0,
      burn: 0,
      burnT: 0,
      shred: 0,
      shredT: 0,
      immuneT: 0,
      touchSpike: 0,
    }));
    this.shots = makePool(280, () => ({
      alive: false,
      kind: "sentry",
      mode: "homing",
      x: 0,
      y: 0,
      drawX: 0,
      drawY: 0,
      angle: 0,
      vx: 0,
      vy: 0,
      tx: 0,
      ty: 0,
      sx: 0,
      sy: 0,
      ox: 0,
      oy: 0,
      target: 0,
      dmg: 0,
      speed: 0,
      splash: 0,
      slow: 0,
      slowDur: 0,
      age: 0,
      life: 1,
      flight: 1,
      pierce: 1,
      hits: [],
      returning: false,
      returned: false,
      burn: 0,
      burnDur: 0,
      shred: 0,
      knock: 0,
      bonus: 0,
      pen: false,
      popsLead: false,
      detect: false,
      frag: 0,
    }));
    this.spikes = makePool(80, () => ({
      alive: false,
      id: 0,
      owner: 0,
      x: 0,
      y: 0,
      hits: 0,
      dmg: 0,
      life: 0,
      burn: 0,
      burnDur: 0,
      popsLead: false,
      pen: false,
      bonus: 0,
    }));
    this.particles = makePool(360, () => ({
      alive: false,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      life: 0,
      max: 1,
      r: 0.06,
      color: "#eceae4",
    }));
    this.floaters = makePool(48, () => ({
      alive: false,
      x: 0,
      y: 0,
      vy: -0.4,
      text: "",
      life: 0,
      max: 0.8,
      gold: false,
    }));
    const onVis = () => {
      if (document.visibilityState === "visible") this.audio.unlock();
    };
    document.addEventListener("visibilitychange", onVis);
    this.disposeVis = () => document.removeEventListener("visibilitychange", onVis);
  }

  private disposeVis = () => {};

  subscribe(fn: () => void) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private touch() {
    this.rev++;
    this.snap = null;
    for (const fn of this.listeners) fn();
  }

  hud(): Hud {
    if (this.snap && this.snapRev === this.rev) return this.snap;
    const selected = this.selectedTower();
    const previewIndex = Math.min(WAVES.length, Math.max(1, this.wave)) - 1;
    let creepsLeft = 0;
    if (this.phase === "fight") {
      creepsLeft = this.script.length - this.scriptI;
      for (const c of this.creeps) if (c.alive) creepsLeft++;
    }
    const built = selected ? buildStats(selected.kind, selected.paths) : null;
    const hud: Hud = {
      phase: this.phase,
      paused: this.paused,
      lives: this.lives,
      gold: this.gold,
      wave: this.wave,
      waves: WAVES.length,
      preview: wavePreview(previewIndex),
      creepsLeft,
      placing: this.placing,
      selected: selected
        ? {
            id: selected.id,
            kind: selected.kind,
            code: `${selected.paths[0]}-${selected.paths[1]}-${selected.paths[2]}`,
            paths: describePaths(selected.kind, selected.paths),
            damage: built?.damage ?? 0,
            rate: built?.rate ?? 0,
            range: built?.range ?? 0,
            pierce: built?.pierce ?? 0,
            splash: built?.splash ?? 0,
            slow: built?.slow ?? 0,
            sell: Math.floor((TOWERS[selected.kind].cost + selected.spent) * SELL_RATE),
          }
        : null,
      aim: this.aim,
      speed: this.speed,
      muted: this.audio.muted,
      note: this.note,
      kills: this.kills,
      leaks: this.leaks,
      wavesCleared: this.wavesCleared,
      score: this.score(),
      best: this.best,
      hint: this.phase === "prep" || this.phase === "fight" ? waveHint(previewIndex) : "",
    };
    this.snap = hud;
    this.snapRev = this.rev;
    return hud;
  }

  private score() {
    return this.wavesCleared * 120 + this.kills * 8 + this.lives * 15 + this.gold;
  }

  private say(text: string) {
    this.note = text;
    this.noteT = 1.6;
    this.touch();
  }

  begin() {
    this.audio.unlock();
    this.audio.startDrone();
    this.resetRun();
    this.phase = "prep";
    this.touch();
  }

  restart() {
    this.begin();
  }

  private resetRun() {
    this.paused = false;
    this.lives = START_LIVES;
    this.gold = START_GOLD;
    this.wave = 1;
    this.placing = null;
    this.selectedId = 0;
    this.kills = 0;
    this.leaks = 0;
    this.wavesCleared = 0;
    this.note = "";
    this.noteT = 0;
    this.trauma = 0;
    this.hurtFlash = 0;
    this.script = [];
    this.scriptI = 0;
    this.spawnT = 0;
    this.hitstop = 0;
    this.aim = "first";
    this.speed = 1;
    for (const t of this.towers) t.alive = false;
    for (const c of this.creeps) c.alive = false;
    for (const s of this.shots) s.alive = false;
    for (const sp of this.spikes) sp.alive = false;
    for (const p of this.particles) p.alive = false;
    for (const f of this.floaters) f.alive = false;
  }

  togglePause() {
    if (this.phase !== "prep" && this.phase !== "fight") return;
    this.paused = !this.paused;
    this.audio.ui();
    this.touch();
  }

  toggleMute() {
    this.audio.unlock();
    this.audio.setMuted(!this.audio.muted);
    this.touch();
  }

  setAim(aim: Aim) {
    this.aim = aim;
    this.audio.ui();
    this.touch();
  }

  setSpeed(speed: 1 | 2) {
    this.speed = speed;
    this.touch();
  }

  chooseTower(kind: TowerKind) {
    if (this.phase !== "prep" && this.phase !== "fight") return;
    this.placing = this.placing === kind ? null : kind;
    if (this.placing) this.selectedId = 0;
    this.audio.ui();
    this.touch();
  }

  cancel() {
    if (this.placing) {
      this.placing = null;
      this.touch();
      return;
    }
    if (this.selectedId) {
      this.selectedId = 0;
      this.touch();
    }
  }

  space() {
    if (this.phase === "menu") this.begin();
    else if (this.phase === "won" || this.phase === "lost") this.restart();
    else if (this.paused) this.togglePause();
    else if (this.phase === "prep") this.send();
    else if (this.phase === "fight") this.togglePause();
  }

  send() {
    if (this.phase !== "prep" || this.paused) return;
    this.phase = "fight";
    this.script = expandWave(this.wave - 1);
    this.scriptI = 0;
    this.spawnT = 0;
    this.audio.wave();
    this.touch();
  }

  upgrade(path: number) {
    const t = this.selectedTower();
    if (!t || this.paused) return;
    if (path < 0 || path > 2) return;
    const state = upgradeBlock(t.paths, path);
    if (state === "max") return;
    if (state === "cross") {
      this.say("Only two paths. The second stops at tier 2.");
      this.audio.deny();
      return;
    }
    const cost = upgradeCost(t.kind, t.paths[path]);
    if (this.gold < cost) {
      this.say("Not enough gold.");
      this.audio.deny();
      return;
    }
    this.gold -= cost;
    t.spent += cost;
    t.paths[path] += 1;
    const bought = TOWERS[t.kind].paths[path].tiers[t.paths[path] - 1];
    this.say(bought.name);
    this.audio.ui();
    this.touch();
  }

  sell() {
    const t = this.selectedTower();
    if (!t || this.paused) return;
    const value = Math.floor((TOWERS[t.kind].cost + t.spent) * SELL_RATE);
    this.gold += value;
    t.alive = false;
    this.selectedId = 0;
    this.audio.place();
    this.touch();
  }

  pointerMove(x: number, y: number) {
    if (this.phase === "menu" || this.phase === "won" || this.phase === "lost") {
      this.hover = null;
      return;
    }
    this.hover = { x, y };
  }

  pointerLeave() {
    this.hover = null;
  }

  pointerDown(x: number, y: number) {
    if (this.paused || this.phase === "menu" || this.phase === "won" || this.phase === "lost") return;
    const cx = Math.floor(x);
    const cy = Math.floor(y);
    if (cx < 0 || cy < 0 || cx >= COLS || cy >= ROWS) {
      if (this.selectedId || this.placing) {
        this.selectedId = 0;
        this.placing = null;
        this.touch();
      }
      return;
    }
    const occupied = this.towerAt(cx, cy);
    if (this.placing) {
      if (occupied) {
        this.selectedId = occupied.id;
        this.placing = null;
        this.audio.ui();
        this.touch();
        return;
      }
      this.tryPlace(cx, cy);
      return;
    }
    if (occupied) {
      this.selectedId = occupied.id;
      this.audio.ui();
      this.touch();
      return;
    }
    if (this.selectedId) {
      this.selectedId = 0;
      this.touch();
    }
  }

  private tryPlace(cx: number, cy: number) {
    if (!this.placing) return;
    if (!isBuildable(cx, cy)) {
      this.say("Build on open grass, not the road.");
      this.audio.deny();
      return;
    }
    const def = TOWERS[this.placing];
    if (this.gold < def.cost) {
      this.say("Not enough gold.");
      this.audio.deny();
      return;
    }
    const slot = this.towers.find((t) => !t.alive);
    if (!slot) {
      this.say("No room for another tower.");
      return;
    }
    this.gold -= def.cost;
    slot.alive = true;
    slot.id = ++this.nextId;
    slot.kind = this.placing;
    slot.cx = cx;
    slot.cy = cy;
    slot.x = cx + 0.5;
    slot.y = cy + 0.5;
    slot.cd = 0;
    slot.paths[0] = 0;
    slot.paths[1] = 0;
    slot.paths[2] = 0;
    slot.spent = 0;
    slot.kick = 0;
    slot.spin = 0;
    this.selectedId = slot.id;
    this.audio.place();
    this.touch();
  }

  private towerAt(cx: number, cy: number) {
    return this.towers.find((t) => t.alive && t.cx === cx && t.cy === cy) ?? null;
  }

  private selectedTower() {
    if (!this.selectedId) return null;
    return this.towers.find((t) => t.alive && t.id === this.selectedId) ?? null;
  }

  frame(realDt: number) {
    const dt = Math.min(0.05, realDt);
    this.trauma = Math.max(0, this.trauma - dt * 1.8);
    this.hurtFlash = Math.max(0, this.hurtFlash - dt * 1.6);
    if (
      this.paused ||
      this.phase === "menu" ||
      this.phase === "won" ||
      this.phase === "lost"
    ) {
      return;
    }
    const scaled = this.phase === "fight" ? dt * this.speed : dt;
    this.acc += scaled;
    const step = 1 / 60;
    let n = 0;
    while (this.acc >= step && n < 6) {
      this.step(step);
      this.acc -= step;
      n++;
    }
    if (n === 6) this.acc = 0;
  }

  private step(dt: number) {
    if (this.hitstop > 0) {
      this.hitstop = Math.max(0, this.hitstop - dt);
      this.decayFx(dt);
      return;
    }
    if (this.noteT > 0) {
      this.noteT -= dt;
      if (this.noteT <= 0) {
        this.note = "";
        this.touch();
      }
    }
    if (this.phase === "fight") {
      this.spawnT += dt;
      while (
        this.scriptI < this.script.length &&
        this.script[this.scriptI].delay <= this.spawnT
      ) {
        this.spawnCreep(this.script[this.scriptI].kind);
        this.scriptI++;
      }
      for (const c of this.creeps) if (c.alive) this.moveCreep(c, dt);
      if (this.phase !== "fight") {
        this.decayFx(dt);
        return;
      }
      for (const sp of this.spikes) {
        if (!sp.alive) continue;
        sp.life -= dt;
        if (sp.life <= 0 || sp.hits <= 0) sp.alive = false;
      }
      for (const t of this.towers) if (t.alive) this.tickTower(t, dt);
      for (const s of this.shots) if (s.alive) this.tickShot(s, dt);
      if (
        this.phase === "fight" &&
        this.scriptI >= this.script.length &&
        !this.creeps.some((c) => c.alive)
      ) {
        this.onWaveCleared();
      }
    } else {
      for (const t of this.towers) if (t.alive) t.kick = Math.max(0, t.kick - dt * 4);
    }
    this.decayFx(dt);
  }

  private decayFx(dt: number) {
    for (const p of this.particles) {
      if (!p.alive) continue;
      p.life -= dt;
      if (p.life <= 0) {
        p.alive = false;
        continue;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 0.4 * dt;
    }
    for (const f of this.floaters) {
      if (!f.alive) continue;
      f.life -= dt;
      if (f.life <= 0) {
        f.alive = false;
        continue;
      }
      f.y += f.vy * dt;
    }
    for (const t of this.towers) if (t.alive && this.phase === "fight") t.kick = Math.max(0, t.kick - dt * 4);
  }

  private spawnCreep(kind: CreepKind) {
    const start = WAYPOINTS[0];
    this.placeCreep(kind, start.x, start.y, 1, 0, 1);
  }

  private placeCreep(kind: CreepKind, x: number, y: number, wp: number, dist: number, goldMul: number) {
    const slot = this.creeps.find((c) => !c.alive);
    if (!slot) return;
    const stats = creepStats(kind, Math.max(0, this.wave - 1));
    slot.alive = true;
    slot.id = ++this.nextId;
    slot.kind = kind;
    slot.x = x;
    slot.y = y;
    slot.wp = wp;
    slot.dist = dist;
    slot.hp = stats.hp;
    slot.maxHp = stats.hp;
    slot.speed = stats.speed;
    slot.armor = stats.armor;
    slot.gold = Math.max(1, Math.round(stats.gold * goldMul));
    slot.slow = 0;
    slot.slowT = 0;
    slot.flash = 0;
    slot.age = 0;
    slot.face = 1;
    slot.lead = stats.lead;
    slot.camo = stats.camo;
    slot.splits = stats.splits;
    slot.burn = 0;
    slot.burnT = 0;
    slot.shred = 0;
    slot.shredT = 0;
    slot.immuneT = 0;
    slot.touchSpike = 0;
  }

  private moveCreep(c: Creep, dt: number) {
    c.age += dt;
    c.flash = Math.max(0, c.flash - dt);
    c.immuneT = Math.max(0, c.immuneT - dt);
    c.slowT = Math.max(0, c.slowT - dt);
    if (c.slowT <= 0) c.slow = 0;
    if (c.shredT > 0) {
      c.shredT -= dt;
      if (c.shredT <= 0) c.shred = 0;
    }
    if (c.burnT > 0) {
      c.burnT -= dt;
      c.hp -= c.burn * dt * (1 + c.shred);
      if (Math.floor(c.age * 5) !== Math.floor((c.age - dt) * 5)) c.flash = 0.06;
      if (c.hp <= 0) {
        this.killCreep(c);
        return;
      }
    }
    const speed = c.speed * (c.slowT > 0 ? 1 - c.slow : 1);
    let left = speed * dt;
    while (left > 0 && c.alive) {
      if (c.wp >= WAYPOINTS.length) {
        this.leak(c);
        return;
      }
      const p = WAYPOINTS[c.wp];
      const dx = p.x - c.x;
      const dy = p.y - c.y;
      const dist = Math.hypot(dx, dy);
      if (Math.abs(dx) > Math.abs(dy) + 0.001) c.face = dx < 0 ? -1 : 1;
      if (dist <= left + 1e-4) {
        if (dist > 0) {
          c.x = p.x;
          c.y = p.y;
          c.dist += dist;
        }
        left -= dist;
        c.wp += 1;
        if (c.wp >= WAYPOINTS.length) {
          this.leak(c);
          return;
        }
      } else {
        const inv = 1 / dist;
        c.x += dx * inv * left;
        c.y += dy * inv * left;
        c.dist += left;
        left = 0;
      }
    }
    if (c.alive) this.touchSpikes(c);
  }

  private leak(c: Creep) {
    c.alive = false;
    if (this.phase !== "fight") return;
    this.lives -= 1;
    this.leaks += 1;
    this.trauma = Math.min(1, this.trauma + 0.55);
    this.hurtFlash = 1;
    this.audio.leak();
    this.burst(c.x, c.y, "#c4524a", 10);
    if (this.lives <= 0) {
      this.lives = 0;
      this.finish("lost");
    }
    this.touch();
  }

  private tickTower(t: Tower, dt: number) {
    t.cd -= dt;
    if (t.cd > 0) return;
    const stats = buildStats(t.kind, t.paths);
    if (stats.flight === "stake") {
      this.dropSpikes(t, stats);
      t.cd = 1 / Math.max(0.05, stats.rate);
      t.kick = 1;
      return;
    }
    const target = this.pickTarget(t, stats);
    if (!target) return;
    this.fire(t, target, stats);
    t.cd = 1 / Math.max(0.05, stats.rate);
    t.kick = 1;
  }

  private dropSpikes(t: Tower, stats: Built) {
    const spots = stakeSpots(t.x, t.y, stats.range, stats.drops);
    if (spots.length === 0) return;
    for (const spot of spots) {
      let pile = this.spikes.find(
        (sp) => sp.alive && sp.owner === t.id && (sp.x - spot.x) ** 2 + (sp.y - spot.y) ** 2 < 0.2,
      );
      if (!pile) {
        pile = this.spikes.find((sp) => !sp.alive);
        if (!pile) return;
        pile.alive = true;
        pile.id = ++this.nextId;
        pile.owner = t.id;
        pile.x = spot.x;
        pile.y = spot.y;
        pile.hits = 0;
      }
      pile.hits = Math.min(36, pile.hits + stats.spikeHits);
      pile.dmg = stats.damage;
      pile.life = stats.spikeLife;
      pile.burn = stats.burn;
      pile.burnDur = stats.burnDur;
      pile.popsLead = stats.popsLead;
      pile.pen = stats.pen;
      pile.bonus = stats.bonus;
    }
    this.audio.shoot("stake");
    this.burst(spots[0].x, spots[0].y, "#c8b79a", 4);
  }

  private pickTarget(t: Tower, stats: Built) {
    const r2 = stats.range * stats.range;
    let best: Creep | null = null;
    let bestScore = 0;
    let found = false;
    for (const c of this.creeps) {
      if (!c.alive) continue;
      if (c.camo && !stats.detect) continue;
      const dx = c.x - t.x;
      const dy = c.y - t.y;
      const d2 = dx * dx + dy * dy;
      if (d2 > r2) continue;
      let score = c.dist;
      if (this.aim === "last") score = -c.dist;
      else if (this.aim === "close") score = -d2;
      else if (this.aim === "strong") score = c.hp;
      if (!found || score > bestScore) {
        found = true;
        best = c;
        bestScore = score;
      }
    }
    return best;
  }

  private fire(t: Tower, target: Creep, stats: Built) {
    if (stats.flight === "radial") {
      const n = Math.max(1, stats.radial);
      for (let i = 0; i < n; i++) {
        const angle = t.spin + (Math.PI * 2 * i) / n;
        this.launch(t, target, stats, angle, 0, 0);
      }
      t.spin += 0.28;
    } else {
      const ang = Math.atan2(target.y - (t.y - 0.12), target.x - t.x);
      const n = Math.max(1, stats.shots);
      for (let i = 0; i < n; i++) {
        const spread = n === 1 ? 0 : (i - (n - 1) / 2) * (stats.flight === "lob" ? 0.46 : 0.2);
        const angle = ang + (stats.flight === "linear" ? spread * 0.75 : 0);
        const px = Math.cos(ang + Math.PI / 2) * spread;
        const py = Math.sin(ang + Math.PI / 2) * spread;
        this.launch(t, target, stats, angle, px, py);
      }
    }
    this.audio.shoot(t.kind);
    const tint =
      t.kind === "rime" ? "#c5ebe4" : t.kind === "lance" ? "#d5e6ff" : t.kind === "glaive" ? "#e2c48a" : "#f0e2c8";
    this.burst(t.x, t.y - 0.12, tint, 4);
  }

  private launch(t: Tower, target: Creep, stats: Built, angle: number, ox: number, oy: number) {
    const slot = this.shots.find((s) => !s.alive);
    if (!slot) return;
    const linear = stats.flight === "linear" || stats.flight === "radial";
    slot.alive = true;
    slot.kind = t.kind;
    slot.mode = stats.flight === "lob" ? "lob" : linear ? "linear" : "homing";
    slot.x = t.x + ox * 0.35;
    slot.y = t.y - 0.12 + oy * 0.35;
    slot.drawX = slot.x;
    slot.drawY = slot.y;
    slot.sx = slot.x;
    slot.sy = slot.y;
    slot.ox = t.x;
    slot.oy = t.y - 0.12;
    slot.tx = target.x + (stats.flight === "lob" ? ox : 0);
    slot.ty = target.y + (stats.flight === "lob" ? oy : 0);
    slot.target = target.id;
    slot.dmg = stats.damage;
    slot.speed = Math.max(0.01, stats.speed || 8);
    slot.splash = stats.splash;
    slot.slow = stats.slow;
    slot.slowDur = stats.slowDur;
    slot.age = 0;
    slot.pierce = Math.max(1, stats.pierce);
    slot.hits.length = 0;
    slot.returning = linear && stats.returns;
    slot.returned = false;
    slot.burn = stats.burn;
    slot.burnDur = stats.burnDur;
    slot.shred = stats.shred;
    slot.knock = stats.knock;
    slot.bonus = stats.bonus;
    slot.pen = stats.pen;
    slot.popsLead = stats.popsLead;
    slot.detect = stats.detect;
    slot.frag = stats.frag;
    slot.vx = Math.cos(angle) * slot.speed;
    slot.vy = Math.sin(angle) * slot.speed;
    slot.angle = angle;
    const dist = Math.hypot(slot.tx - slot.x, slot.ty - slot.y);
    slot.flight = 0.4 + dist * 0.11;
    slot.life = linear ? (stats.range * (stats.returns ? 1.15 : 1)) / slot.speed : 2.4;
  }

  private tickShot(s: Shot, dt: number) {
    s.age += dt;
    if (s.mode === "lob") {
      const t = Math.min(1, s.age / Math.max(0.05, s.flight));
      const arc = Math.sin(t * Math.PI) * (0.45 + Math.hypot(s.tx - s.sx, s.ty - s.sy) * 0.12);
      s.drawX = s.sx + (s.tx - s.sx) * t;
      s.drawY = s.sy + (s.ty - s.sy) * t - arc;
      s.angle = Math.atan2(s.ty - s.sy, s.tx - s.sx);
      if (t >= 1) this.explode(s);
      return;
    }
    if (s.mode === "linear") {
      this.tickLinear(s, dt);
      return;
    }
    this.tickHoming(s, dt);
  }

  private tickHoming(s: Shot, dt: number) {
    const target = this.creepById(s.target);
    if (target && !s.hits.includes(target.id) && (!target.camo || s.detect)) {
      s.tx = target.x;
      s.ty = target.y;
    } else if (!target) {
      const next = this.nearestCreep(s.x, s.y, 1.5, s);
      if (next) {
        s.target = next.id;
        s.tx = next.x;
        s.ty = next.y;
      }
    }
    const dx = s.tx - s.x;
    const dy = s.ty - s.y;
    const dist = Math.hypot(dx, dy) || 0.0001;
    const step = s.speed * dt;
    if (dist <= Math.max(0.12, step)) {
      s.x = s.tx;
      s.y = s.ty;
      s.drawX = s.x;
      s.drawY = s.y;
      const landed = this.creepById(s.target);
      if (landed && !s.hits.includes(landed.id) && (!landed.camo || s.detect)) {
        s.hits.push(landed.id);
        this.applyHit(landed, this.payload(s, false));
        if (s.splash > 0) this.splashDisc(s.x, s.y, s.splash, s, landed.id, s.dmg, true);
      } else if (s.splash > 0) this.splashDisc(s.x, s.y, s.splash, s, 0, s.dmg, true);
      else this.burst(s.x, s.y, "#eceae4", 3);
      s.pierce -= 1;
      if (s.pierce > 0) {
        const next = this.nearestCreep(s.x, s.y, 1.55, s);
        if (next) {
          s.target = next.id;
          s.tx = next.x;
          s.ty = next.y;
          this.audio.hit();
          return;
        }
      }
      s.alive = false;
      this.audio.hit();
      return;
    }
    const inv = 1 / dist;
    s.x += dx * inv * step;
    s.y += dy * inv * step;
    s.drawX = s.x;
    s.drawY = s.y;
    s.angle = Math.atan2(dy, dx);
    if (s.age > 2.4) s.alive = false;
  }

  private tickLinear(s: Shot, dt: number) {
    s.x += s.vx * dt;
    s.y += s.vy * dt;
    s.drawX = s.x;
    s.drawY = s.y;
    s.angle = Math.atan2(s.vy, s.vx);
    for (const c of this.creeps) {
      if (!c.alive || s.hits.includes(c.id)) continue;
      if (c.camo && !s.detect) continue;
      const dx = c.x - s.x;
      const dy = c.y - s.y;
      if (dx * dx + dy * dy > 0.09) continue;
      s.hits.push(c.id);
      this.applyHit(c, this.payload(s, false));
      s.pierce -= 1;
      if (s.pierce <= 0) {
        s.alive = false;
        this.audio.hit();
        return;
      }
    }
    if (!s.alive) return;
    if (s.returned) {
      const dx = s.x - s.ox;
      const dy = s.y - s.oy;
      if (dx * dx + dy * dy < 0.16) {
        s.alive = false;
        return;
      }
    }
    if (s.age >= s.life) {
      if (s.returning && !s.returned) {
        s.vx = -s.vx;
        s.vy = -s.vy;
        s.returned = true;
        s.age = 0;
        s.hits.length = 0;
        return;
      }
      s.alive = false;
    }
  }

  private explode(s: Shot) {
    s.alive = false;
    this.splashDisc(s.tx, s.ty, Math.max(0.2, s.splash), s, 0, s.dmg, true);
    if (s.frag > 0) {
      for (let i = 0; i < s.frag; i++) {
        const a = (Math.PI * 2 * i) / s.frag + 0.35;
        this.splashDisc(s.tx + Math.cos(a) * 0.62, s.ty + Math.sin(a) * 0.62, 0.42, s, 0, s.dmg * 0.45, false);
      }
    }
    this.burst(s.tx, s.ty, "#e07a3a", 16);
    this.trauma = Math.min(1, this.trauma + 0.32);
    this.hitstop = Math.min(0.07, this.hitstop + 0.035);
    this.audio.boom();
  }

  private splashDisc(
    x: number,
    y: number,
    radius: number,
    s: Shot,
    skip: number,
    dmg: number,
    extra: boolean,
  ) {
    if (radius <= 0) return;
    const r2 = radius * radius;
    for (const c of this.creeps) {
      if (!c.alive || c.id === skip) continue;
      if (c.camo && !s.detect) continue;
      const dx = c.x - x;
      const dy = c.y - y;
      if (dx * dx + dy * dy > r2) continue;
      const hit = this.payload(s, true);
      hit.dmg = dmg;
      if (!extra) {
        hit.slow = 0;
        hit.slowDur = 0;
        hit.knock = 0;
        hit.burn = 0;
        hit.shred = 0;
      }
      this.applyHit(c, hit);
    }
  }

  private payload(s: Shot, splash: boolean): HitPayload {
    return {
      dmg: s.dmg,
      slow: s.slow,
      slowDur: s.slowDur,
      splash,
      pen: s.pen,
      popsLead: s.popsLead,
      burn: s.burn,
      burnDur: s.burnDur,
      shred: s.shred,
      knock: s.knock,
      bonus: s.bonus,
    };
  }

  private nearestCreep(x: number, y: number, range: number, s: Shot) {
    const r2 = range * range;
    let best: Creep | null = null;
    let bestD = Infinity;
    for (const c of this.creeps) {
      if (!c.alive || s.hits.includes(c.id)) continue;
      if (c.camo && !s.detect) continue;
      const d = (c.x - x) ** 2 + (c.y - y) ** 2;
      if (d <= r2 && d < bestD) {
        best = c;
        bestD = d;
      }
    }
    return best;
  }

  private applyHit(c: Creep, hit: HitPayload) {
    if (!c.alive) return false;
    if (c.lead && !hit.popsLead) {
      if (c.immuneT <= 0) {
        this.floater(c.x, c.y - 0.4, "Immune", false);
        c.immuneT = 0.85;
      }
      return false;
    }
    let amount = hit.dmg;
    const bulky =
      c.hp > c.maxHp * 0.5 ||
      c.kind === "maw" ||
      c.kind === "beetle" ||
      c.kind === "cluster" ||
      c.kind === "shell";
    if (bulky && hit.bonus) amount *= 1 + hit.bonus;
    amount *= 1 + c.shred;
    if (!hit.pen && !hit.splash) amount *= c.armor;
    const dealt = Math.max(1, Math.round(amount));
    c.hp -= dealt;
    c.flash = 0.09;
    this.floater(c.x, c.y - 0.35, String(dealt), false);
    if (hit.slow > 0) {
      const resist = c.kind === "beetle" || c.kind === "shell" ? 0.62 : c.kind === "maw" || c.kind === "cluster" ? 0.4 : 1;
      c.slow = Math.max(c.slow, Math.min(0.8, hit.slow * resist));
      c.slowT = Math.max(c.slowT, hit.slowDur);
    }
    if (hit.burn > 0) {
      c.burn = Math.max(c.burn, hit.burn);
      c.burnT = Math.max(c.burnT, hit.burnDur);
    }
    if (hit.shred > 0) {
      c.shred = Math.max(c.shred, hit.shred);
      c.shredT = Math.max(c.shredT, 4);
    }
    if (hit.knock > 0 && c.hp > 0) {
      const resist = c.kind === "maw" ? 0.22 : c.kind === "beetle" || c.kind === "cluster" ? 0.45 : c.kind === "shell" ? 0.55 : 1;
      const at = pointAlong(c.dist - hit.knock * resist);
      c.x = at.x;
      c.y = at.y;
      c.wp = at.wp;
      c.dist = at.dist;
    }
    this.burst(c.x, c.y, hit.splash ? "#e7b089" : "#f4efe6", hit.splash ? 5 : 3);
    if (c.hp <= 0) this.killCreep(c);
    return true;
  }

  private touchSpikes(c: Creep) {
    if (c.touchSpike) {
      const held = this.spikes.find((sp) => sp.alive && sp.id === c.touchSpike);
      if (!held || (held.x - c.x) ** 2 + (held.y - c.y) ** 2 > 0.2) c.touchSpike = 0;
    }
    if (c.touchSpike) return;
    for (const sp of this.spikes) {
      if (!sp.alive || sp.hits <= 0) continue;
      const dx = c.x - sp.x;
      const dy = c.y - sp.y;
      if (dx * dx + dy * dy > 0.2) continue;
      if (c.lead && !sp.popsLead) {
        if (c.immuneT <= 0) {
          this.floater(c.x, c.y - 0.4, "Immune", false);
          c.immuneT = 0.9;
        }
        continue;
      }
      const connected = this.applyHit(c, {
        dmg: sp.dmg,
        slow: 0,
        slowDur: 0,
        splash: false,
        pen: sp.pen,
        popsLead: true,
        burn: sp.burn,
        burnDur: sp.burnDur,
        shred: 0,
        knock: 0,
        bonus: sp.bonus,
      });
      if (connected) {
        sp.hits -= 1;
        if (c.alive) c.touchSpike = sp.id;
        if (sp.hits <= 0) sp.alive = false;
      }
      return;
    }
  }

  private killCreep(c: Creep) {
    if (!c.alive) return;
    const splits = c.splits;
    const parentDist = c.dist;
    c.alive = false;
    this.kills += 1;
    this.gold += c.gold;
    this.floater(c.x, c.y - 0.55, `+${c.gold}`, true);
    this.burst(c.x, c.y, c.kind === "maw" ? "#d7c4a3" : "#eceae4", c.kind === "maw" ? 22 : 12);
    if (c.kind === "maw") {
      this.trauma = Math.min(1, this.trauma + 0.7);
      this.hitstop = 0.07;
    }
    if (splits > 0) {
      for (let i = 0; i < splits; i++) {
        const at = pointAlong(Math.max(0, parentDist - 0.34 * (i + 1)));
        this.placeCreep("grub", at.x, at.y, at.wp, at.dist, 0.45);
      }
    }
    this.audio.kill();
    this.touch();
  }

  private creepById(id: number) {
    for (const c of this.creeps) if (c.alive && c.id === id) return c;
    return null;
  }

  private onWaveCleared() {
    this.wavesCleared = this.wave;
    const bonus = clearBonus(this.wave);
    this.gold += bonus;
    this.floater(8, 1.2, `+${bonus}`, true);
    if (this.wave >= WAVES.length) {
      this.finish("won");
      return;
    }
    this.wave += 1;
    this.phase = "prep";
    this.say(`Wave clear. +${bonus} gold.`);
    this.audio.ui();
    this.touch();
  }

  private finish(phase: "won" | "lost") {
    this.phase = phase;
    this.paused = false;
    this.placing = null;
    const score = this.score();
    if (score > this.best) {
      this.best = score;
      try {
        localStorage.setItem(BEST_KEY, String(score));
      } catch {
        /* ignore */
      }
    }
    if (phase === "won") this.audio.win();
    else this.audio.lose();
    this.touch();
  }

  private burst(x: number, y: number, color: string, n: number) {
    let left = n;
    for (const p of this.particles) {
      if (p.alive) continue;
      const a = Math.random() * Math.PI * 2;
      const s = 0.4 + Math.random() * 1.6;
      p.alive = true;
      p.x = x;
      p.y = y;
      p.vx = Math.cos(a) * s;
      p.vy = Math.sin(a) * s - 0.4;
      p.life = 0.25 + Math.random() * 0.35;
      p.max = p.life;
      p.r = 0.04 + Math.random() * 0.07;
      p.color = color;
      left--;
      if (left <= 0) break;
    }
  }

  private floater(x: number, y: number, text: string, gold: boolean) {
    const slot = this.floaters.find((f) => !f.alive);
    if (!slot) return;
    slot.alive = true;
    slot.x = x + (gold ? 0.15 : 0);
    slot.y = y;
    slot.vy = gold ? -0.55 : -0.4;
    slot.text = text;
    slot.life = gold ? 0.9 : 0.55;
    slot.max = slot.life;
    slot.gold = gold;
  }

  dispose() {
    this.disposeVis();
    this.audio.dispose();
    this.listeners.clear();
  }
}
