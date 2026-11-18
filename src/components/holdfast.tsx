import { useEffect, useRef, useState } from "react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { Coins, Flag, Heart, Pause, Play, Volume2, VolumeX } from "lucide-react";
import {
  AIM_OPTIONS,
  TOWER_ORDER,
  TOWERS,
  type Aim,
  type HudPath,
  type TowerKind,
} from "@/game/balance";
import { Game, type Hud } from "@/game/engine";
import { draw, loadArt, screenToWorld } from "@/game/render";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function Holdfast() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<Game | null>(null);
  const [hud, setHud] = useState<Hud | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const game = new Game();
    gameRef.current = game;
    setHud(game.hud());
    const unsub = game.subscribe(() => setHud(game.hud()));
    let raf = 0;
    let last = performance.now();
    let stop = false;
    const loop = (now: number) => {
      if (stop) return;
      const dt = (now - last) / 1000;
      last = now;
      game.frame(dt);
      const canvas = canvasRef.current;
      if (canvas) draw(canvas, game);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (e.key >= "1" && e.key <= "7") {
        const kind = TOWER_ORDER[Number(e.key) - 1];
        if (kind) game.chooseTower(kind);
      } else if (e.key === "Escape") game.cancel();
      else if (e.key === " ") {
        e.preventDefault();
        game.space();
      } else if (e.key === "p" || e.key === "P") game.togglePause();
    };
    window.addEventListener("keydown", onKey);
    void loadArt()
      .then(() => setReady(true))
      .catch(() => setReady(true));
    return () => {
      stop = true;
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", onKey);
      unsub();
      game.dispose();
      if (gameRef.current === game) gameRef.current = null;
    };
  }, []);

  const game = gameRef.current;
  const phase = hud?.phase ?? "menu";
  const inRun = phase === "prep" || phase === "fight";

  const pointFrom = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const current = gameRef.current;
    if (!canvas || !current) return;
    return screenToWorld(canvas, e.clientX, e.clientY);
  };

  return (
    <main className="flex h-dvh flex-col bg-bg text-fg">
      {inRun && hud ? (
        <header className="flex shrink-0 items-center gap-2 px-3 pt-[max(0.75rem,env(safe-area-inset-top))] pb-2 sm:px-4">
          <Stat icon={<Heart className="size-4" />} label="Lives" value={hud.lives} danger={hud.lives <= 5} />
          <Stat icon={<Coins className="size-4" />} label="Gold" value={hud.gold} />
          <Stat
            icon={<Flag className="size-4" />}
            label="Wave"
            value={`${Math.min(hud.wave, hud.waves)}/${hud.waves}`}
          />
          <div className="ml-auto flex items-center gap-2">
            <IconButton label={hud.muted ? "Unmute" : "Mute"} onClick={() => gameRef.current?.toggleMute()}>
              {hud.muted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
            </IconButton>
            <IconButton label={hud.paused ? "Resume" : "Pause"} onClick={() => gameRef.current?.togglePause()}>
              {hud.paused ? <Play className="size-4" /> : <Pause className="size-4" />}
            </IconButton>
          </div>
        </header>
      ) : (
        <div className="h-[max(0.75rem,env(safe-area-inset-top))]" />
      )}

      <div className="relative min-h-0 flex-1">
        <canvas
          ref={canvasRef}
          className="absolute inset-0 h-full w-full touch-none"
          onContextMenu={(e) => {
            e.preventDefault();
            gameRef.current?.cancel();
          }}
          onPointerDown={(e) => {
            const p = pointFrom(e);
            if (p) gameRef.current?.pointerDown(p.x, p.y);
          }}
          onPointerMove={(e) => {
            const p = pointFrom(e);
            if (p) gameRef.current?.pointerMove(p.x, p.y);
          }}
          onPointerLeave={() => gameRef.current?.pointerLeave()}
        />

        {hud?.note ? (
          <p className="pointer-events-none absolute top-3 left-1/2 z-10 -translate-x-1/2 rounded-md bg-surface px-3 py-2 text-sm text-fg shadow-none">
            {hud.note}
          </p>
        ) : null}

        {phase === "menu" ? (
          <Overlay>
            <p className="text-xs font-medium tracking-[0.18em] text-muted uppercase">Marsh road</p>
            <h1 className="font-display text-4xl leading-none font-medium tracking-tight text-fg sm:text-5xl">
              Holdfast
            </h1>
            <p className="max-w-sm text-sm leading-normal text-muted">
              Twelve waves walk a single road toward your gate. Gold from each kill buys towers, and every tower has three named paths.
            </p>
            <ul className="max-w-sm space-y-2 text-sm leading-normal text-fg">
              <li>Master one path to tier 3. A second path stops at tier 2. The third stays shut.</li>
              <li>Shells ignore sharp steel. Wisps stay unseen until a path grants sight. Clusters split into Grubs.</li>
              <li>Burrs throw a ring of thorns. Glaives pierce and return. Stakes wait on the road, even for Wisps.</li>
            </ul>
            <button
              type="button"
              className="mt-1 min-h-11 rounded-md bg-accent px-5 text-sm font-medium text-accent-fg"
              onClick={() => gameRef.current?.begin()}
            >
              {ready ? "Begin" : "Preparing the road…"}
            </button>
          </Overlay>
        ) : null}

        {hud && (phase === "won" || phase === "lost") ? (
          <Overlay>
            <p className="text-xs font-medium tracking-[0.18em] text-muted uppercase">
              {phase === "won" ? "The gate holds" : "The gate fell"}
            </p>
            <h2 className="font-display text-4xl leading-none font-medium tracking-tight">
              {phase === "won" ? "Victory" : "Defeated"}
            </h2>
            <dl className="grid w-full max-w-xs grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <Row k="Waves cleared" v={hud.wavesCleared} />
              <Row k="Creeps stopped" v={hud.kills} />
              <Row k="Leaks" v={hud.leaks} />
              <Row k="Score" v={hud.score} />
              <Row k="Best" v={hud.best} />
            </dl>
            <button
              type="button"
              className="min-h-11 rounded-md bg-accent px-5 text-sm font-medium text-accent-fg"
              onClick={() => gameRef.current?.restart()}
            >
              Play again
            </button>
          </Overlay>
        ) : null}

        {hud?.paused && inRun ? (
          <Overlay compact>
            <h2 className="font-display text-3xl font-medium tracking-tight">Paused</h2>
            <button
              type="button"
              className="min-h-11 rounded-md bg-accent px-5 text-sm font-medium text-accent-fg"
              onClick={() => gameRef.current?.togglePause()}
            >
              Resume
            </button>
          </Overlay>
        ) : null}
      </div>

      {inRun && hud ? (
        <footer className="shrink-0 border-t border-line bg-surface px-3 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
            <div className="min-w-0 flex-1">
              <div className="flex gap-2 overflow-x-auto pb-1">
                {TOWER_ORDER.map((kind, index) => (
                  <TowerCard
                    key={kind}
                    kind={kind}
                    hotkey={index + 1}
                    active={hud.placing === kind}
                    short={hud.gold < TOWERS[kind].cost}
                    onClick={() => gameRef.current?.chooseTower(kind)}
                  />
                ))}
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={phase !== "prep" || hud.paused}
                  className="min-h-11 rounded-md bg-accent px-4 text-sm font-medium text-accent-fg disabled:opacity-40"
                  onClick={() => gameRef.current?.send()}
                >
                  {phase === "fight" ? `${hud.creepsLeft} on the road` : `Send wave ${hud.wave}`}
                </button>
                <div className="flex rounded-md bg-surface-2 p-1">
                  <SpeedButton on={hud.speed === 1} onClick={() => gameRef.current?.setSpeed(1)}>
                    1×
                  </SpeedButton>
                  <SpeedButton on={hud.speed === 2} onClick={() => gameRef.current?.setSpeed(2)}>
                    2×
                  </SpeedButton>
                </div>
                <div className="flex rounded-md bg-surface-2 p-1" role="group" aria-label="Aim">
                  {AIM_OPTIONS.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      aria-pressed={hud.aim === opt.id}
                      className={cn(
                        "min-h-11 rounded-sm px-3 text-sm font-medium",
                        hud.aim === opt.id ? "bg-accent text-accent-fg" : "text-muted",
                      )}
                      onClick={() => gameRef.current?.setAim(opt.id as Aim)}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
              <p className="mt-2 text-xs text-muted">
                Next: {hud.preview}
                {hud.hint ? ` — ${hud.hint}` : ""}
                <span className="hidden sm:inline"> Keys 1–7 pick a tower. Space sends or pauses.</span>
              </p>
            </div>
            <Inspect hud={hud} game={game} />
          </div>
        </footer>
      ) : null}
    </main>
  );
}

function Stat({
  icon,
  label,
  value,
  danger = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  danger?: boolean;
}) {
  return (
    <div className="flex min-h-11 items-center gap-2 rounded-md bg-surface px-3" aria-label={`${label} ${value}`}>
      <span className={danger ? "text-danger" : "text-muted"} aria-hidden>
        {icon}
      </span>
      <span className={cn("text-sm font-medium tabular-nums", danger && "text-danger")}>{value}</span>
    </div>
  );
}

function IconButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="flex size-11 items-center justify-center rounded-md bg-surface text-fg"
    >
      {children}
    </button>
  );
}

function TowerCard({
  kind,
  hotkey,
  active,
  short,
  onClick,
}: {
  kind: TowerKind;
  hotkey: number;
  active: boolean;
  short: boolean;
  onClick: () => void;
}) {
  const def = TOWERS[kind];
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "flex min-h-11 w-36 shrink-0 items-center gap-2 rounded-md bg-surface-2 p-2 text-left",
        active && "outline outline-2 outline-accent",
      )}
    >
      <img src={`/game/tower-${kind}.png`} alt="" className="size-11 rounded-sm object-contain" />
      <span className="min-w-0">
        <span className="flex items-baseline gap-2">
          <span className="text-sm font-medium">{def.name}</span>
          <span className="text-xs text-subtle">{hotkey}</span>
        </span>
        <span className={cn("block text-xs tabular-nums", short ? "text-danger" : "text-muted")}>
          {def.cost} gold · {def.blurb}
        </span>
      </span>
    </button>
  );
}

function SpeedButton({
  on,
  onClick,
  children,
}: {
  on: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={cn(
        "min-h-11 min-w-11 rounded-sm px-3 text-sm font-medium tabular-nums",
        on ? "bg-accent text-accent-fg" : "text-muted",
      )}
    >
      {children}
    </button>
  );
}

function Inspect({ hud, game }: { hud: Hud; game: Game | null }) {
  if (!hud.selected) {
    return (
      <div className="rounded-lg bg-bg px-4 py-3 text-sm text-muted lg:w-72">
        {hud.placing
          ? "Click open grass to build. Select a tower to open its three paths."
          : "Choose a tower, then click the grass. Paths are named upgrades, not plain stat bumps."}
      </div>
    );
  }
  const sel = hud.selected;
  const def = TOWERS[sel.kind];
  return (
    <div className="rounded-lg bg-bg px-3 py-3 sm:px-4 lg:w-[28rem]">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-sm font-medium">
          {def.name} <span className="text-muted tabular-nums">{sel.code}</span>
        </h2>
        <span className="text-xs text-muted tabular-nums">
          {Math.round(sel.damage)} dmg · {sel.rate.toFixed(1)}/s
          {sel.pierce > 1 ? ` · pierce ${sel.pierce}` : ""}
          {sel.splash > 0 ? ` · splash ${sel.splash.toFixed(1)}` : ""}
          {sel.slow > 0 ? ` · slow ${Math.round(sel.slow * 100)}%` : ""}
        </span>
      </div>
      <p className="mt-1 text-xs leading-snug text-muted">
        {sel.paths.some((path) => path.owned.length > 0)
          ? sel.paths.flatMap((path) => path.owned).join(" · ")
          : "One path to tier 3. A second path stops at tier 2."}
      </p>
      <div className="mt-2 grid grid-cols-3 gap-2">
        {sel.paths.map((path) => (
          <PathButton
            key={path.index}
            path={path}
            broke={hud.gold < path.cost}
            paused={hud.paused}
            onClick={() => game?.upgrade(path.index)}
          />
        ))}
      </div>
      <button
        type="button"
        disabled={hud.paused}
        className="mt-2 min-h-11 w-full rounded-md bg-surface-2 px-3 text-sm text-fg disabled:opacity-40"
        onClick={() => game?.sell()}
      >
        Sell {sel.sell}
      </button>
    </div>
  );
}

const PATH_TONE = ["bg-path-a", "bg-path-b", "bg-path-c"] as const;

function PathButton({
  path,
  broke,
  paused,
  onClick,
}: {
  path: HudPath;
  broke: boolean;
  paused: boolean;
  onClick: () => void;
}) {
  const locked = path.state === "cross";
  const maxed = path.state === "max";
  const disabled = path.state !== "ok" || broke || paused;
  const price = maxed ? "Max" : locked ? "Locked" : String(path.cost);
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="flex min-h-11 flex-col items-start gap-1 rounded-md bg-surface-2 px-2 py-2 text-left disabled:opacity-60"
    >
      <span className="flex w-full items-center justify-between gap-1">
        <span className="text-xs font-medium tracking-wide text-muted uppercase">{path.name}</span>
        <span className={cn("text-xs tabular-nums", broke && !maxed && !locked ? "text-danger" : "text-muted")}>
          {price}
        </span>
      </span>
      <span className="inline-flex gap-1" aria-hidden>
        {[0, 1, 2].map((i) => (
          <span key={i} className={cn("size-1.5 rounded-full", i < path.level ? PATH_TONE[path.index] : "bg-line")} />
        ))}
      </span>
      <span className="text-xs leading-snug font-medium text-fg">{path.nextName}</span>
      <span className="text-xs leading-snug text-muted">{path.nextBlurb}</span>
    </button>
  );
}

function Overlay({ children, compact = false }: { children: React.ReactNode; compact?: boolean }) {
  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center p-4">
      <div
        className={cn(
          "rise-in flex w-full max-w-md flex-col items-start gap-4 rounded-xl bg-surface px-6 py-6",
          compact && "max-w-xs items-center text-center",
        )}
      >
        {children}
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: number }) {
  return (
    <>
      <dt className="text-muted">{k}</dt>
      <dd className="text-right font-medium tabular-nums">{v}</dd>
    </>
  );
}
