"use client";
import { useEffect, useRef, useState } from "react";

const W = 800;
const H = 560;
const RADII = { 1: 16, 2: 30, 3: 48 } as const;
const POINTS = { 1: 100, 2: 50, 3: 20 } as const;

type Size = 1 | 2 | 3;
type Ast = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: Size;
  r: number;
  rot: number;
  spin: number;
  shape: number[];
};
type Bullet = { x: number; y: number; vx: number; vy: number; life: number };
type Particle = { x: number; y: number; vx: number; vy: number; life: number; color: string };
type GameState = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  thrusting: boolean;
  fire: number;
  bullets: Bullet[];
  asts: Ast[];
  particles: Particle[];
  score: number;
  lives: number;
  wave: number;
  invuln: number;
  t: number;
};

const wrap = (v: number, max: number, m = 30) => (v < -m ? max + m : v > max + m ? -m : v);

function makeAst(size: Size, x: number, y: number, boost = 0): Ast {
  const a = Math.random() * Math.PI * 2;
  const sp = 35 + Math.random() * 45 + (3 - size) * 25 + boost;
  return {
    x,
    y,
    vx: Math.cos(a) * sp,
    vy: Math.sin(a) * sp,
    size,
    r: RADII[size],
    rot: Math.random() * 6,
    spin: (Math.random() - 0.5) * 1.5,
    shape: Array.from({ length: 10 }, () => 0.75 + Math.random() * 0.4),
  };
}

function spawnWave(g: GameState) {
  const n = Math.min(10, 3 + g.wave);
  g.asts = [];
  for (let i = 0; i < n; i++) {
    let x: number;
    let y: number;
    do {
      x = Math.random() * W;
      y = Math.random() * H;
    } while (Math.hypot(x - g.x, y - g.y) < 200);
    g.asts.push(makeAst(3, x, y, g.wave * 4));
  }
}

function newGame(): GameState {
  const g: GameState = {
    x: W / 2,
    y: H / 2,
    vx: 0,
    vy: 0,
    angle: -Math.PI / 2,
    thrusting: false,
    fire: 0,
    bullets: [],
    asts: [],
    particles: [],
    score: 0,
    lives: 3,
    wave: 1,
    invuln: 0,
    t: 0,
  };
  spawnWave(g);
  return g;
}

function explode(g: GameState, x: number, y: number, color: string, count = 14) {
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    const sp = 40 + Math.random() * 200;
    g.particles.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0.4 + Math.random() * 0.5, color });
  }
}

function shipPath(ctx: CanvasRenderingContext2D) {
  ctx.beginPath();
  ctx.moveTo(18, 0);
  ctx.lineTo(-12, -11);
  ctx.lineTo(-6, 0);
  ctx.lineTo(-12, 11);
  ctx.closePath();
}

function drawScene(ctx: CanvasRenderingContext2D, g: GameState) {
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, "#05060f");
  bg.addColorStop(1, "#1e1b4b");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = "rgba(255,255,255,0.5)";
  for (let i = 0; i < 50; i++) ctx.fillRect((i * 137 + 29) % W, (i * 71 + 11) % H, 2, 2);

  // asteroids
  ctx.lineJoin = "round";
  g.asts.forEach((a) => {
    ctx.save();
    ctx.translate(a.x, a.y);
    ctx.rotate(a.rot);
    ctx.beginPath();
    a.shape.forEach((m, i) => {
      const ang = (i / a.shape.length) * Math.PI * 2;
      const px = Math.cos(ang) * a.r * m;
      const py = Math.sin(ang) * a.r * m;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    });
    ctx.closePath();
    ctx.fillStyle = "rgba(76,29,149,0.35)";
    ctx.fill();
    ctx.shadowColor = "#a78bfa";
    ctx.shadowBlur = 10;
    ctx.strokeStyle = "#c4b5fd";
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.restore();
  });

  // bullets
  ctx.save();
  ctx.shadowColor = "#fde047";
  ctx.shadowBlur = 10;
  ctx.fillStyle = "#fde047";
  g.bullets.forEach((b) => {
    ctx.beginPath();
    ctx.arc(b.x, b.y, 3, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.restore();

  // ship (blinks while shielded)
  if (!(g.invuln > 0 && Math.floor(g.invuln * 10) % 2 === 0)) {
    ctx.save();
    ctx.translate(g.x, g.y);
    ctx.rotate(g.angle);
    if (g.thrusting) {
      ctx.fillStyle = "#f97316";
      ctx.beginPath();
      ctx.moveTo(-8, -5);
      ctx.lineTo(-22 - Math.random() * 10, 0);
      ctx.lineTo(-8, 5);
      ctx.closePath();
      ctx.fill();
    }
    shipPath(ctx);
    ctx.fillStyle = "rgba(34,211,238,0.25)";
    ctx.fill();
    ctx.shadowColor = "#22d3ee";
    ctx.shadowBlur = 12;
    ctx.strokeStyle = "#67e8f9";
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.restore();
  }

  // particles
  g.particles.forEach((p) => {
    ctx.globalAlpha = Math.max(0, p.life * 2);
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x - 2, p.y - 2, 4, 4);
  });
  ctx.globalAlpha = 1;

  // HUD
  for (let i = 0; i < g.lives; i++) {
    ctx.save();
    ctx.translate(26 + i * 28, 30);
    ctx.rotate(-Math.PI / 2);
    shipPath(ctx);
    ctx.strokeStyle = "#f43f5e";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
  }
  ctx.font = "22px sans-serif";
  ctx.textAlign = "right";
  ctx.fillStyle = "rgba(255,255,255,0.8)";
  ctx.fillText(`Wave ${g.wave}`, W - 16, 34);
}

export default function AsteroidBlaster() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const game = useRef<GameState>(newGame());
  const keys = useRef<Set<string>>(new Set());
  const tLeft = useRef(false);
  const tRight = useRef(false);
  const tThrust = useRef(false);
  const tFire = useRef(false);
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const [wave, setWave] = useState(1);
  const [running, setRunning] = useState(false);
  const [gameOver, setGameOver] = useState(false);

  const start = () => {
    game.current = newGame();
    setScore(0);
    setWave(1);
    setGameOver(false);
    setRunning(true);
  };

  // keyboard + idle frame
  useEffect(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (ctx) drawScene(ctx, game.current);

    const down = (e: KeyboardEvent) => {
      if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", " "].includes(e.key)) e.preventDefault();
      keys.current.add(e.key.toLowerCase());
    };
    const up = (e: KeyboardEvent) => keys.current.delete(e.key.toLowerCase());
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
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
      const k = keys.current;
      g.t += dt;
      g.invuln = Math.max(0, g.invuln - dt);

      const left = k.has("arrowleft") || k.has("a") || tLeft.current;
      const right = k.has("arrowright") || k.has("d") || tRight.current;
      const thrust = k.has("arrowup") || k.has("w") || tThrust.current;
      const shoot = k.has(" ") || tFire.current;

      // ship movement
      g.angle += (Number(right) - Number(left)) * 4.2 * dt;
      g.thrusting = thrust;
      if (thrust) {
        g.vx += Math.cos(g.angle) * 280 * dt;
        g.vy += Math.sin(g.angle) * 280 * dt;
      }
      const damp = Math.pow(0.55, dt);
      g.vx *= damp;
      g.vy *= damp;
      const sp = Math.hypot(g.vx, g.vy);
      if (sp > 420) {
        g.vx = (g.vx / sp) * 420;
        g.vy = (g.vy / sp) * 420;
      }
      g.x = wrap(g.x + g.vx * dt, W);
      g.y = wrap(g.y + g.vy * dt, H);

      // fire
      g.fire -= dt;
      if (shoot && g.fire <= 0 && g.bullets.length < 5) {
        g.bullets.push({
          x: g.x + Math.cos(g.angle) * 18,
          y: g.y + Math.sin(g.angle) * 18,
          vx: Math.cos(g.angle) * 540,
          vy: Math.sin(g.angle) * 540,
          life: 1.1,
        });
        g.fire = 0.2;
      }
      g.bullets.forEach((b) => {
        b.x = wrap(b.x + b.vx * dt, W, 5);
        b.y = wrap(b.y + b.vy * dt, H, 5);
        b.life -= dt;
      });
      g.bullets = g.bullets.filter((b) => b.life > 0);

      // asteroids
      g.asts.forEach((a) => {
        a.x = wrap(a.x + a.vx * dt, W, a.r);
        a.y = wrap(a.y + a.vy * dt, H, a.r);
        a.rot += a.spin * dt;
      });

      // bullets vs asteroids (big rocks split in two)
      const spawned: Ast[] = [];
      g.bullets = g.bullets.filter((b) => {
        const idx = g.asts.findIndex((a) => Math.hypot(a.x - b.x, a.y - b.y) < a.r);
        if (idx === -1) return true;
        const a = g.asts[idx];
        g.asts.splice(idx, 1);
        g.score += POINTS[a.size];
        setScore(g.score);
        explode(g, a.x, a.y, "#c4b5fd", 8 + a.size * 4);
        if (a.size > 1) {
          const s = (a.size - 1) as Size;
          spawned.push(makeAst(s, a.x, a.y, g.wave * 4), makeAst(s, a.x, a.y, g.wave * 4));
        }
        return false;
      });
      g.asts.push(...spawned);

      // ship vs asteroids
      if (g.invuln <= 0) {
        const hit = g.asts.find((a) => Math.hypot(a.x - g.x, a.y - g.y) < a.r * 0.85 + 10);
        if (hit) {
          explode(g, g.x, g.y, "#67e8f9", 28);
          g.lives -= 1;
          g.x = W / 2;
          g.y = H / 2;
          g.vx = 0;
          g.vy = 0;
          g.angle = -Math.PI / 2;
          g.invuln = 2.5;
        }
      }

      // next wave
      if (g.asts.length === 0) {
        g.wave += 1;
        setWave(g.wave);
        spawnWave(g);
      }

      // particles
      g.particles.forEach((p) => {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.life -= dt;
      });
      g.particles = g.particles.filter((p) => p.life > 0);

      drawScene(ctx, g);

      if (g.lives <= 0) {
        setBest((b) => Math.max(b, g.score));
        setRunning(false);
        setGameOver(true);
        return;
      }
      raf = requestAnimationFrame(frame);
    };

    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [running]);

  const hold = (ref: { current: boolean }) => ({
    onPointerDown: () => (ref.current = true),
    onPointerUp: () => (ref.current = false),
    onPointerLeave: () => (ref.current = false),
    onPointerCancel: () => (ref.current = false),
  });
  const btn = "h-14 flex-1 touch-none select-none rounded-xl bg-white/10 text-sm active:bg-white/25";

  return (
    <div className="flex w-full flex-col items-center gap-4">
      <div className="flex gap-6 text-lg text-white/80">
        <span>Score: {score}</span>
        <span>Best: {best}</span>
        <span>Wave: {wave}</span>
      </div>

      <div className="relative w-full max-w-5xl">
        <canvas
          ref={canvasRef}
          width={W}
          height={H}
          className="h-auto w-full rounded-xl border border-white/10"
        />
        {!running && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-xl bg-black/65">
            {gameOver && <p className="text-2xl font-semibold text-rose-400">Ship lost! Score: {score}</p>}
            <button onClick={start} className="rounded-lg bg-purple-600 px-6 py-2 text-lg hover:bg-purple-500">
              {gameOver ? "Blast again" : "Start"}
            </button>
            <p className="text-sm text-white/60">← → rotate · ↑ thrust · Space fire</p>
          </div>
        )}
      </div>

      {/* on-screen controls for phones */}
      <div className="flex w-full max-w-md gap-2 md:hidden">
        <button {...hold(tLeft)} className={btn}>◀ LEFT</button>
        <button {...hold(tRight)} className={btn}>RIGHT ▶</button>
        <button {...hold(tThrust)} className={btn}>THRUST</button>
        <button {...hold(tFire)} className={`${btn} bg-rose-600/70`}>FIRE</button>
      </div>
    </div>
  );
}