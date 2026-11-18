import {
  COLS,
  CREEPS,
  PATH_COLORS,
  ROWS,
  TOWERS,
  WAYPOINTS,
  buildStats,
  type CreepKind,
  type ShotArt,
  type TowerKind,
  isBuildable,
} from "@/game/balance";
import type { Game } from "@/game/engine";

const CELL = 80;

type Art = {
  grass: HTMLImageElement;
  path: HTMLImageElement;
  gate: HTMLImageElement;
  rift: HTMLImageElement;
  towers: Record<TowerKind, HTMLImageElement>;
  creeps: Record<CreepKind, HTMLImageElement[]>;
  shots: Record<ShotArt, HTMLImageElement>;
  spike: HTMLImageElement;
  field: HTMLCanvasElement;
};

let art: Art | null = null;
let loading: Promise<void> | null = null;
let view = { scale: 1, ox: 0, oy: 0, bw: 1, bh: 1 };
const reduceMotion =
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(src));
    img.src = src;
  });
}

function creepFrames(kind: CreepKind) {
  return [0, 1, 2, 3].map((i) => loadImage(`/game/creep-${kind}-${i}.png`));
}

export function loadArt() {
  if (!loading) {
    loading = (async () => {
      const [
        grass,
        path,
        gate,
        rift,
        sentry,
        burr,
        glaive,
        rime,
        mortar,
        lance,
        stake,
        grub,
        mite,
        beetle,
        shell,
        wisp,
        cluster,
        maw,
        bolt,
        shellShot,
        frost,
        spark,
        glaiveShot,
        thorn,
        spike,
      ] = await Promise.all([
        loadImage("/game/grass.png"),
        loadImage("/game/path.png"),
        loadImage("/game/gate.png"),
        loadImage("/game/rift.png"),
        loadImage("/game/tower-sentry.png"),
        loadImage("/game/tower-burr.png"),
        loadImage("/game/tower-glaive.png"),
        loadImage("/game/tower-rime.png"),
        loadImage("/game/tower-mortar.png"),
        loadImage("/game/tower-lance.png"),
        loadImage("/game/tower-stake.png"),
        Promise.all(creepFrames("grub")),
        Promise.all(creepFrames("mite")),
        Promise.all(creepFrames("beetle")),
        Promise.all(creepFrames("shell")),
        Promise.all(creepFrames("wisp")),
        Promise.all(creepFrames("cluster")),
        Promise.all(creepFrames("maw")),
        loadImage("/game/shot-bolt.png"),
        loadImage("/game/shot-shell.png"),
        loadImage("/game/shot-frost.png"),
        loadImage("/game/shot-spark.png"),
        loadImage("/game/shot-glaive.png"),
        loadImage("/game/shot-thorn.png"),
        loadImage("/game/spike.png"),
      ]);
      const field = document.createElement("canvas");
      field.width = COLS * CELL;
      field.height = ROWS * CELL;
      art = {
        grass,
        path,
        gate,
        rift,
        towers: { sentry, burr, glaive, rime, mortar, lance, stake },
        creeps: { grub, mite, beetle, shell, wisp, cluster, maw },
        shots: { bolt, shell: shellShot, frost, spark, glaive: glaiveShot, thorn },
        spike,
        field,
      };
      paintField(art);
    })();
  }
  return loading;
}

function paintField(a: Art) {
  const ctx = a.field.getContext("2d");
  if (!ctx) return;
  const w = a.field.width;
  const h = a.field.height;
  const grassPat = ctx.createPattern(a.grass, "repeat");
  if (grassPat) {
    const m = new DOMMatrix();
    m.a = (CELL * 2.35) / a.grass.width;
    m.d = (CELL * 2.35) / a.grass.height;
    grassPat.setTransform(m);
    ctx.fillStyle = grassPat;
  } else ctx.fillStyle = "#3d5a34";
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = "rgba(12, 18, 12, 0.18)";
  ctx.fillRect(0, 0, w, h);

  const trace = () => {
    ctx.beginPath();
    ctx.moveTo(WAYPOINTS[0].x * CELL, WAYPOINTS[0].y * CELL);
    for (let i = 1; i < WAYPOINTS.length; i++) {
      ctx.lineTo(WAYPOINTS[i].x * CELL, WAYPOINTS[i].y * CELL);
    }
  };
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = "rgba(42, 32, 18, 0.55)";
  ctx.lineWidth = CELL * 0.98;
  trace();
  ctx.stroke();

  const pathPat = ctx.createPattern(a.path, "repeat");
  if (pathPat) {
    const m = new DOMMatrix();
    m.a = (CELL * 1.7) / a.path.width;
    m.d = (CELL * 1.7) / a.path.height;
    pathPat.setTransform(m);
    ctx.strokeStyle = pathPat;
  } else ctx.strokeStyle = "#b08958";
  ctx.lineWidth = CELL * 0.74;
  trace();
  ctx.stroke();

  const vignette = ctx.createRadialGradient(w / 2, h / 2, w * 0.25, w / 2, h / 2, w * 0.72);
  vignette.addColorStop(0, "rgba(0,0,0,0)");
  vignette.addColorStop(1, "rgba(8,10,8,0.42)");
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, w, h);
}

export function artReady() {
  return art !== null;
}

export function screenToWorld(canvas: HTMLCanvasElement, clientX: number, clientY: number) {
  const rect = canvas.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return null;
  const x = ((clientX - rect.left) / rect.width) * view.bw;
  const y = ((clientY - rect.top) / rect.height) * view.bh;
  return { x: (x - view.ox) / view.scale, y: (y - view.oy) / view.scale };
}

export function draw(canvas: HTMLCanvasElement, game: Game) {
  const rect = canvas.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const bw = Math.max(1, Math.round(rect.width * dpr));
  const bh = Math.max(1, Math.round(rect.height * dpr));
  if (canvas.width !== bw || canvas.height !== bh) {
    canvas.width = bw;
    canvas.height = bh;
  }
  const scale = Math.min(bw / COLS, bh / ROWS);
  let ox = (bw - COLS * scale) / 2;
  let oy = (bh - ROWS * scale) / 2;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = "#101210";
  ctx.fillRect(0, 0, bw, bh);
  if (!art) {
    view = { scale, ox, oy, bw, bh };
    return;
  }

  const now = performance.now() / 1000;
  view = { scale, ox, oy, bw, bh };
  const amp = reduceMotion ? 0 : game.trauma * game.trauma * scale * 0.22;
  const sox = ox + Math.sin(now * 41) * amp;
  const soy = oy + Math.cos(now * 36) * amp;

  ctx.setTransform(scale / CELL, 0, 0, scale / CELL, sox, soy);
  ctx.drawImage(art.field, 0, 0);
  ctx.setTransform(scale, 0, 0, scale, sox, soy);

  for (const sp of game.spikes) {
    if (!sp.alive) continue;
    ctx.save();
    ctx.globalAlpha = 0.5 + Math.min(0.5, sp.hits / 14);
    blit(ctx, art.spike, sp.x, sp.y + 0.05, 0.62, 0.62, 1);
    ctx.restore();
  }

  const hover = game.hover;
  const hcx = hover ? Math.floor(hover.x) : -1;
  const hcy = hover ? Math.floor(hover.y) : -1;

  if (game.placing && hcx >= 0 && hcx < COLS && hcy >= 0 && hcy < ROWS) {
    const ok = isBuildable(hcx, hcy) && !game.towers.some((t) => t.alive && t.cx === hcx && t.cy === hcy);
    const range = TOWERS[game.placing].range;
    ctx.beginPath();
    ctx.arc(hcx + 0.5, hcy + 0.5, range, 0, Math.PI * 2);
    ctx.fillStyle = ok ? "rgba(236, 234, 228, 0.08)" : "rgba(196, 82, 74, 0.12)";
    ctx.fill();
    ctx.lineWidth = 0.035;
    ctx.strokeStyle = ok ? "rgba(236, 234, 228, 0.55)" : "rgba(196, 82, 74, 0.8)";
    ctx.stroke();
  }

  for (const t of game.towers) {
    if (!t.alive) continue;
    if (t.id !== game.selectedId) continue;
    const range = buildStats(t.kind, t.paths).range;
    ctx.beginPath();
    ctx.arc(t.x, t.y, range, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(236, 234, 228, 0.06)";
    ctx.fill();
    ctx.lineWidth = 0.03;
    ctx.strokeStyle = "rgba(236, 234, 228, 0.45)";
    ctx.stroke();
  }

  type Sprite = { y: number; draw: () => void };
  const sprites: Sprite[] = [];

  sprites.push({
    y: 2.5,
    draw: () => blit(ctx, art!.rift, 0.48, 2.52, 1.28, 1.28, 1),
  });
  sprites.push({
    y: 8.55,
    draw: () => blit(ctx, art!.gate, 15.42, 8.22, 1.85, 1.85, 1),
  });

  for (const t of game.towers) {
    if (!t.alive) continue;
    sprites.push({
      y: t.y,
      draw: () => {
        shadow(ctx, t.x, t.y + 0.28, 0.42, 0.14);
        const kick = t.kick;
        const w = 1.12 * (1 + kick * 0.05);
        const h = 1.12 * (1 - kick * 0.06);
        blit(ctx, art!.towers[t.kind], t.x, t.y - 0.08 - kick * 0.04, w, h, 1);
        const ranks = t.paths;
        if (ranks[0] || ranks[1] || ranks[2]) {
          for (let p = 0; p < 3; p++) {
            for (let i = 0; i < 3; i++) {
              ctx.fillStyle = i < ranks[p] ? PATH_COLORS[p] : "rgba(236,234,228,0.28)";
              ctx.beginPath();
              ctx.arc(t.x - 0.2 + p * 0.16, t.y - 0.78 - i * 0.09, 0.032, 0, Math.PI * 2);
              ctx.fill();
            }
          }
        }
        if (t.id === game.selectedId) {
          ctx.strokeStyle = "rgba(236, 234, 228, 0.85)";
          ctx.lineWidth = 0.03;
          ctx.strokeRect(t.cx + 0.08, t.cy + 0.08, 0.84, 0.84);
        }
      },
    });
  }

  if (game.placing && hcx >= 0 && hcx < COLS && hcy >= 0 && hcy < ROWS) {
    const occupied = game.towers.some((t) => t.alive && t.cx === hcx && t.cy === hcy);
    if (isBuildable(hcx, hcy) && !occupied) {
      sprites.push({
        y: hcy + 0.5,
        draw: () => {
          ctx.save();
          ctx.globalAlpha = 0.55;
          blit(ctx, art!.towers[game.placing!], hcx + 0.5, hcy + 0.42, 1.12, 1.12, 1);
          ctx.restore();
        },
      });
    }
  }

  for (const c of game.creeps) {
    if (!c.alive) continue;
    sprites.push({
      y: c.y,
      draw: () => {
        const def = CREEPS[c.kind];
        const frame = Math.floor(c.dist * 2.4) % 4;
        const img = art!.creeps[c.kind][frame] ?? art!.creeps[c.kind][0];
        const pop = Math.min(1, c.age / 0.16);
        const s = def.scale * (0.72 + 0.28 * pop);
        if (c.slowT > 0) {
          ctx.beginPath();
          ctx.ellipse(c.x, c.y + s * 0.28, s * 0.42, s * 0.16, 0, 0, Math.PI * 2);
          ctx.fillStyle = "rgba(150, 198, 190, 0.35)";
          ctx.fill();
        }
        shadow(ctx, c.x, c.y + s * 0.32, s * 0.36, s * 0.12);
        ctx.save();
        if (def.camo) ctx.globalAlpha = 0.78;
        if (c.flash > 0 && !reduceMotion) ctx.filter = "brightness(1.7)";
        blit(ctx, img, c.x, c.y, s, s, c.face);
        ctx.restore();
        if (def.camo) {
          ctx.beginPath();
          ctx.arc(c.x, c.y, s * 0.46, 0, Math.PI * 2);
          ctx.strokeStyle = "rgba(186, 214, 216, 0.55)";
          ctx.lineWidth = 0.025;
          ctx.stroke();
        }
        if (c.burnT > 0) {
          ctx.beginPath();
          ctx.arc(c.x, c.y, s * 0.34, 0, Math.PI * 2);
          ctx.strokeStyle = "rgba(224, 122, 58, 0.75)";
          ctx.lineWidth = 0.03;
          ctx.stroke();
        }
        if (c.hp < c.maxHp) {
          const bw = Math.min(0.9, s);
          const x = c.x - bw / 2;
          const y = c.y - s * 0.58;
          ctx.fillStyle = "rgba(16, 18, 16, 0.7)";
          ctx.fillRect(x, y, bw, 0.08);
          ctx.fillStyle = c.hp / c.maxHp < 0.35 ? "#c4524a" : "#eceae4";
          ctx.fillRect(x, y, bw * Math.max(0, c.hp / c.maxHp), 0.08);
        }
      },
    });
  }

  sprites.sort((a, b) => a.y - b.y);
  for (const s of sprites) s.draw();

  for (const shot of game.shots) {
    if (!shot.alive) continue;
    const img = art.shots[TOWERS[shot.kind].shot];
    const size = shot.mode === "lob" ? 0.46 : shot.kind === "glaive" ? 0.48 : 0.34;
    ctx.save();
    ctx.translate(shot.drawX, shot.drawY);
    ctx.rotate(shot.angle);
    ctx.drawImage(img, -size / 2, -size / 2, size, size);
    ctx.restore();
  }

  for (const p of game.particles) {
    if (!p.alive) continue;
    ctx.globalAlpha = Math.max(0, p.life / p.max);
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  ctx.font = "600 0.4px Outfit, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  for (const f of game.floaters) {
    if (!f.alive) continue;
    ctx.globalAlpha = Math.max(0, Math.min(1, f.life / (f.max * 0.4)));
    ctx.fillStyle = f.gold ? "#f3ead7" : "#ffffff";
    ctx.fillText(f.text, f.x, f.y);
  }
  ctx.globalAlpha = 1;

  if (game.hurtFlash > 0) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = `rgba(140, 32, 24, ${0.28 * game.hurtFlash})`;
    ctx.fillRect(0, 0, bw, bh);
  }
}

function shadow(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  rx: number,
  ry: number,
) {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(8, 10, 8, 0.35)";
  ctx.fill();
}

function blit(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number,
  face = 1,
) {
  ctx.save();
  ctx.translate(x, y);
  if (face < 0) ctx.scale(-1, 1);
  ctx.drawImage(img, -w / 2, -h / 2, w, h);
  ctx.restore();
}
