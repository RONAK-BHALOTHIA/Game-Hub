"use client";
import { useEffect, useRef, useState } from "react";

const W = 900;
const H = 540;
const DURATION = 40;
const MAG = 8;
const RELOAD = 1.0;
const FLOOR = H - 90;

type Target = {
  x: number;
  y: number;
  r: number;
  vx: number;
  life: number;
  gold: boolean;
  hit: boolean;
  fade: number;
};
type Pop = { x: number; y: number; text: string; t: number; color: string };
type GameState = {
  targets: Target[];
  pops: Pop[];
  ammo: number;
  reload: number;
  time: number;
  score: number;
  spawn: number;
  mx: number;
  my: number;
  shots: number;
  hits: number;
  flash: number;
};

const newGame = (): GameState => ({
  targets: [],
  pops: [],
  ammo: MAG,
  reload: 0,
  time: DURATION,
  score: 0,
  spawn: 0.3,
  mx: W / 2,
  my: H / 2,
  shots: 0,
  hits: 0,
  flash: 0,
});

function drawTarget(ctx: CanvasRenderingContext2D, t: Target) {
  const alpha = t.hit ? t.fade : Math.min(1, t.life / 0.4);
  if (alpha <= 0) return;
  const scale = t.hit ? 1 + (1 - t.fade) * 0.4 : alpha;

  const rings = t.gold
    ? ["#facc15", "#fef9c3", "#facc15", "#fef9c3", "#dc2626"]
    : ["#e2e8f0", "#ef4444", "#e2e8f0", "#ef4444", "#fde047"];

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(t.x, t.y);
  ctx.scale(scale, scale);

  if (t.gold) {
    ctx.shadowColor = "#facc15";
    ctx.shadowBlur = 18;
  }
  rings.forEach((color, i) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(0, 0, t.r * (1 - i * 0.2), 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  });
  ctx.restore();
}

function drawScene(ctx: CanvasRenderingContext2D, g: GameState, reloading: boolean) {
  // background
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, "#05060f");
  bg.addColorStop(1, "#312e81");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // range floor with lines
  ctx.fillStyle = "#14162b";
  ctx.fillRect(0, FLOOR, W, H - FLOOR);
  ctx.fillStyle = "#22d3ee";
  ctx.fillRect(0, FLOOR, W, 3);
  ctx.strokeStyle = "rgba(255,255,255,0.08)";
  ctx.lineWidth = 2;
  for (let i = 1; i < 4; i++) {
    ctx.beginPath();
    ctx.moveTo(0, FLOOR + i * 22);
    ctx.lineTo(W, FLOOR + i * 22);
    ctx.stroke();
  }

  g.targets.forEach((t) => drawTarget(ctx, t));

  // score pop-ups
  ctx.textAlign = "center";
  ctx.font = "bold 28px sans-serif";
  g.pops.forEach((p) => {
    ctx.globalAlpha = Math.max(0, p.t * 2);
    ctx.fillStyle = p.color;
    ctx.fillText(p.text, p.x, p.y);
  });
  ctx.globalAlpha = 1;

  // muzzle flash
  if (g.flash > 0) {
    ctx.fillStyle = `rgba(255,255,255,${g.flash * 4})`;
    ctx.fillRect(0, 0, W, H);
  }

  // crosshair
  ctx.strokeStyle = reloading ? "#94a3b8" : "#f43f5e";
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(g.mx, g.my, 16, 0, Math.PI * 2);
  ctx.moveTo(g.mx - 28, g.my);
  ctx.lineTo(g.mx - 8, g.my);
  ctx.moveTo(g.mx + 8, g.my);
  ctx.lineTo(g.mx + 28, g.my);
  ctx.moveTo(g.mx, g.my - 28);
  ctx.lineTo(g.mx, g.my - 8);
  ctx.moveTo(g.mx, g.my + 8);
  ctx.lineTo(g.mx, g.my + 28);
  ctx.stroke();
  ctx.fillStyle = reloading ? "#94a3b8" : "#f43f5e";
  ctx.beginPath();
  ctx.arc(g.mx, g.my, 2, 0, Math.PI * 2);
  ctx.fill();

  // time
  ctx.textAlign = "center";
  ctx.font = "bold 40px sans-serif";
  ctx.fillStyle = g.time <= 5 ? "#f43f5e" : "#fff";
  ctx.fillText(String(Math.max(0, Math.ceil(g.time))), W / 2, 56);

  // ammo
  for (let i = 0; i < MAG; i++) {
    ctx.fillStyle = i < g.ammo ? "#facc15" : "rgba(255,255,255,0.15)";
    ctx.beginPath();
    ctx.roundRect(24 + i * 18, H - 56, 9, 28, 3);
    ctx.fill();
  }
  if (reloading) {
    ctx.textAlign = "left";
    ctx.font = "bold 18px sans-serif";
    ctx.fillStyle = "#facc15";
    ctx.fillText("RELOADING...", 24, H - 66);
    ctx.fillStyle = "rgba(255,255,255,0.15)";
    ctx.fillRect(24, H - 20, 8 * 18, 6);
    ctx.fillStyle = "#facc15";
    ctx.fillRect(24, H - 20, 8 * 18 * (1 - g.reload / RELOAD), 6);
  }
}

export default function TargetShooter() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const game = useRef<GameState>(newGame());
  const runningRef = useRef(false);
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const [accuracy, setAccuracy] = useState(0);
  const [running, setRunning] = useState(false);
  const [finished, setFinished] = useState(false);

  const point = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    game.current.mx = ((e.clientX - rect.left) / rect.width) * W;
    game.current.my = ((e.clientY - rect.top) / rect.height) * H;
  };

  const fire = () => {
    const g = game.current;
    if (!runningRef.current || g.reload > 0 || g.ammo <= 0) return;
    g.ammo -= 1;
    g.shots += 1;
    g.flash = 0.06;

    // topmost target under the crosshair
    for (let i = g.targets.length - 1; i >= 0; i--) {
      const t = g.targets[i];
      if (t.hit) continue;
      const d = Math.hypot(g.mx - t.x, g.my - t.y);
      if (d > t.r) continue;
      const ratio = d / t.r;
      let pts = ratio < 0.2 ? 50 : ratio < 0.6 ? 20 : 10;
      if (t.gold) pts += 30;
      g.score += pts;
      g.hits += 1;
      t.hit = true;
      g.pops.push({ x: t.x, y: t.y - t.r, text: `+${pts}`, t: 0.8, color: t.gold ? "#facc15" : "#67e8f9" });
      setScore(g.score);
      break;
    }

    if (g.ammo === 0) g.reload = RELOAD;
  };

  const start = () => {
    game.current = newGame();
    runningRef.current = true;
    setScore(0);
    setFinished(false);
    setRunning(true);
  };

  // keyboard (R to reload) + idle frame
  useEffect(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (ctx) drawScene(ctx, game.current, false);

    const onKey = (e: KeyboardEvent) => {
      const g = game.current;
      if (e.key.toLowerCase() === "r" && runningRef.current && g.reload <= 0 && g.ammo < MAG) {
        g.reload = RELOAD;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // game loop
  useEffect(() => {
    if (!running) return;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let last = performance.now();

    const frame = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      const g = game.current;

      g.time -= dt;
      g.flash = Math.max(0, g.flash - dt);

      // reload
      if (g.reload > 0) {
        g.reload -= dt;
        if (g.reload <= 0) {
          g.reload = 0;
          g.ammo = MAG;
        }
      }

      // spawn targets
      g.spawn -= dt;
      if (g.spawn <= 0 && g.targets.length < 5) {
        const progress = 1 - g.time / DURATION;
        const gold = Math.random() < 0.12;
        const r = gold ? 24 : 32 + Math.random() * 18;
        const speed = (gold ? 220 : 70) + Math.random() * 120 + progress * 80;
        g.targets.push({
          x: 80 + Math.random() * (W - 160),
          y: 110 + Math.random() * (FLOOR - 200),
          r,
          vx: Math.random() < 0.5 ? speed : -speed,
          life: gold ? 2.2 : 3 + Math.random(),
          gold,
          hit: false,
          fade: 1,
        });
        g.spawn = 0.7 - progress * 0.35 + Math.random() * 0.3;
      }

      // update targets
      g.targets.forEach((t) => {
        if (t.hit) {
          t.fade -= dt * 5;
          return;
        }
        t.x += t.vx * dt;
        if (t.x - t.r < 0) {
          t.x = t.r;
          t.vx = Math.abs(t.vx);
        } else if (t.x + t.r > W) {
          t.x = W - t.r;
          t.vx = -Math.abs(t.vx);
        }
        t.life -= dt;
      });
      g.targets = g.targets.filter((t) => (t.hit ? t.fade > 0 : t.life > 0));

      // pop-ups
      g.pops.forEach((p) => {
        p.t -= dt;
        p.y -= 40 * dt;
      });
      g.pops = g.pops.filter((p) => p.t > 0);

      drawScene(ctx, g, g.reload > 0);

      if (g.time <= 0) {
        runningRef.current = false;
        setBest((b) => Math.max(b, g.score));
        setAccuracy(g.shots ? Math.round((g.hits / g.shots) * 100) : 0);
        setRunning(false);
        setFinished(true);
        return;
      }
      raf = requestAnimationFrame(frame);
    };

    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [running]);

  return (
    <div className="flex w-full flex-col items-center gap-4">
      <div className="flex gap-8 text-xl text-white/80">
        <span>Score: {score}</span>
        <span>Best: {best}</span>
      </div>

      <div className="relative w-full max-w-5xl">
        <canvas
          ref={canvasRef}
          width={W}
          height={H}
          onPointerMove={point}
          onPointerDown={(e) => {
            point(e);
            fire();
          }}
          className="h-auto w-full cursor-none touch-none rounded-xl border border-white/10"
        />
        {!running && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-xl bg-black/70">
            {finished && (
              <>
                <p className="text-3xl font-semibold text-cyan-300">Time&apos;s up! Score: {score}</p>
                <p className="text-white/70">Accuracy: {accuracy}%</p>
              </>
            )}
            <button onClick={start} className="rounded-lg bg-purple-600 px-6 py-2 text-lg hover:bg-purple-500">
              {finished ? "Shoot again" : "Start"}
            </button>
            <p className="text-sm text-white/60">Click to fire · R to reload · bullseye = 50 · gold = +30 bonus</p>
          </div>
        )}
      </div>
    </div>
  );
}