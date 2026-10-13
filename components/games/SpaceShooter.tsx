"use client";
import { useEffect, useRef, useState } from "react";

const W = 480;
const H = 720;
const SHIP_Y = H - 80;
const SHIP_SPEED = 380;

type Bullet = { x: number; y: number };
type Enemy = { x: number; y: number; r: number; hp: number; speed: number; phase: number };
type Particle = { x: number; y: number; vx: number; vy: number; life: number; color: string };
type Star = { x: number; y: number; s: number };
type GameState = {
  x: number;
  targetX: number | null;
  bullets: Bullet[];
  enemies: Enemy[];
  particles: Particle[];
  stars: Star[];
  score: number;
  lives: number;
  fire: number;
  spawn: number;
  invuln: number;
  t: number;
};

const newGame = (): GameState => ({
  x: W / 2,
  targetX: null,
  bullets: [],
  enemies: [],
  particles: [],
  stars: Array.from({ length: 70 }, () => ({
    x: Math.random() * W,
    y: Math.random() * H,
    s: 0.5 + Math.random() * 1.5,
  })),
  score: 0,
  lives: 3,
  fire: 0,
  spawn: 0.8,
  invuln: 0,
  t: 0,
});

function explode(g: GameState, x: number, y: number, color: string, count = 14) {
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    const sp = 60 + Math.random() * 220;
    g.particles.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0.5 + Math.random() * 0.4, color });
  }
}

function drawShip(ctx: CanvasRenderingContext2D, g: GameState) {
  if (g.invuln > 0 && Math.floor(g.invuln * 10) % 2 === 0) return; // blink

  ctx.save();
  ctx.translate(g.x, SHIP_Y);

  // engine flame
  ctx.fillStyle = "#f97316";
  ctx.beginPath();
  ctx.moveTo(-8, 22);
  ctx.lineTo(0, 40 + Math.random() * 10);
  ctx.lineTo(8, 22);
  ctx.closePath();
  ctx.fill();

  // wings
  ctx.fillStyle = "#7c3aed";
  ctx.beginPath();
  ctx.moveTo(0, -10);
  ctx.lineTo(34, 24);
  ctx.lineTo(10, 18);
  ctx.lineTo(-10, 18);
  ctx.lineTo(-34, 24);
  ctx.closePath();
  ctx.fill();

  // body
  const body = ctx.createLinearGradient(-12, 0, 12, 0);
  body.addColorStop(0, "#0891b2");
  body.addColorStop(0.5, "#67e8f9");
  body.addColorStop(1, "#0891b2");
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.moveTo(0, -34);
  ctx.quadraticCurveTo(14, -6, 12, 24);
  ctx.lineTo(-12, 24);
  ctx.quadraticCurveTo(-14, -6, 0, -34);
  ctx.fill();

  // cockpit
  ctx.fillStyle = "#0f172a";
  ctx.beginPath();
  ctx.ellipse(0, -6, 5, 10, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawEnemy(ctx: CanvasRenderingContext2D, e: Enemy) {
  ctx.save();
  ctx.translate(e.x, e.y);

  // saucer body
  ctx.fillStyle = e.hp > 1 ? "#be123c" : "#e11d48";
  ctx.beginPath();
  ctx.ellipse(0, 4, e.r, e.r * 0.55, 0, 0, Math.PI * 2);
  ctx.fill();

  // dome
  ctx.fillStyle = "#a5f3fc";
  ctx.beginPath();
  ctx.arc(0, -2, e.r * 0.5, Math.PI, 0);
  ctx.fill();

  // eyes
  ctx.fillStyle = "#0f172a";
  ctx.beginPath();
  ctx.arc(-e.r * 0.2, -e.r * 0.15, 3, 0, Math.PI * 2);
  ctx.arc(e.r * 0.2, -e.r * 0.15, 3, 0, Math.PI * 2);
  ctx.fill();

  // lights
  ctx.fillStyle = "#fde047";
  for (let i = -1; i <= 1; i++) {
    ctx.beginPath();
    ctx.arc(i * e.r * 0.5, e.r * 0.2, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

function drawScene(ctx: CanvasRenderingContext2D, g: GameState) {
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, "#05060f");
  bg.addColorStop(1, "#1e1b4b");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = "#fff";
  g.stars.forEach((s) => {
    ctx.globalAlpha = 0.3 + s.s * 0.3;
    ctx.fillRect(s.x, s.y, s.s * 1.5, s.s * 1.5);
  });
  ctx.globalAlpha = 1;

  // bullets
  ctx.fillStyle = "#fde047";
  g.bullets.forEach((b) => {
    ctx.beginPath();
    ctx.roundRect(b.x - 2.5, b.y - 12, 5, 16, 3);
    ctx.fill();
  });

  g.enemies.forEach((e) => drawEnemy(ctx, e));
  drawShip(ctx, g);

  // particles
  g.particles.forEach((p) => {
    ctx.globalAlpha = Math.max(0, p.life * 1.5);
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x - 2, p.y - 2, 4, 4);
  });
  ctx.globalAlpha = 1;

  // lives
  ctx.font = "24px sans-serif";
  ctx.textAlign = "left";
  ctx.fillStyle = "#f43f5e";
  ctx.fillText("♥".repeat(Math.max(0, g.lives)), 14, 34);
}

export default function SpaceShooter() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const game = useRef<GameState>(newGame());
  const keys = useRef<Set<string>>(new Set());
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const [running, setRunning] = useState(false);
  const [gameOver, setGameOver] = useState(false);

  const start = () => {
    game.current = newGame();
    setScore(0);
    setGameOver(false);
    setRunning(true);
  };

  const aim = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    game.current.targetX = ((e.clientX - rect.left) / rect.width) * W;
  };

  // keyboard + idle frame
  useEffect(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (ctx) drawScene(ctx, game.current);

    const down = (e: KeyboardEvent) => {
      if (["ArrowLeft", "ArrowRight", " "].includes(e.key)) e.preventDefault();
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
      g.t += dt;
      g.invuln = Math.max(0, g.invuln - dt);

      // move ship
      const k = keys.current;
      const dir = (k.has("arrowright") || k.has("d") ? 1 : 0) - (k.has("arrowleft") || k.has("a") ? 1 : 0);
      if (dir !== 0) {
        g.targetX = null;
        g.x += dir * SHIP_SPEED * dt;
      } else if (g.targetX !== null) {
        g.x += (g.targetX - g.x) * Math.min(1, dt * 14);
      }
      g.x = Math.max(30, Math.min(W - 30, g.x));

      // stars
      g.stars.forEach((s) => {
        s.y += s.s * 60 * dt;
        if (s.y > H) {
          s.y = 0;
          s.x = Math.random() * W;
        }
      });

      // auto fire
      g.fire -= dt;
      if (g.fire <= 0) {
        const offsets = g.score >= 15 ? [-12, 12] : [0];
        offsets.forEach((o) => g.bullets.push({ x: g.x + o, y: SHIP_Y - 30 }));
        g.fire = 0.22;
      }
      g.bullets.forEach((b) => (b.y -= 650 * dt));
      g.bullets = g.bullets.filter((b) => b.y > -20);

      // spawn enemies
      g.spawn -= dt;
      if (g.spawn <= 0) {
        const r = 20 + Math.random() * 14;
        g.enemies.push({
          x: r + Math.random() * (W - r * 2),
          y: -r,
          r,
          hp: r > 30 ? 2 : 1,
          speed: 90 + Math.random() * 80 + Math.min(150, g.score * 3),
          phase: Math.random() * 6,
        });
        g.spawn = Math.max(0.35, 1.0 - g.score * 0.015);
      }

      g.enemies.forEach((e) => {
        e.y += e.speed * dt;
        e.x += Math.sin(g.t * 2 + e.phase) * 40 * dt;
      });

      // bullet vs enemy
      g.bullets = g.bullets.filter((b) => {
        const hit = g.enemies.find((e) => Math.hypot(b.x - e.x, b.y - e.y) < e.r + 4);
        if (!hit) return true;
        hit.hp -= 1;
        explode(g, b.x, b.y, "#fde047", 4);
        return false;
      });

      g.enemies = g.enemies.filter((e) => {
        // destroyed
        if (e.hp <= 0) {
          explode(g, e.x, e.y, "#fb7185");
          g.score += e.r > 30 ? 2 : 1;
          setScore(g.score);
          return false;
        }
        // hits the player
        if (g.invuln <= 0 && Math.hypot(e.x - g.x, e.y - SHIP_Y) < e.r + 16) {
          explode(g, g.x, SHIP_Y, "#67e8f9", 24);
          g.lives -= 1;
          g.invuln = 1.5;
          return false;
        }
        // escaped past the player
        if (e.y - e.r > H) {
          g.lives -= 1;
          return false;
        }
        return true;
      });

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

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex gap-6 text-lg text-white/80">
        <span>Score: {score}</span>
        <span>Best: {best}</span>
      </div>

      <div className="relative">
                <canvas
          ref={canvasRef}
          width={W}
          height={H}
          onPointerMove={aim}
          onPointerDown={aim}
          className="h-auto w-auto max-h-[75vh] max-w-full touch-none rounded-xl border border-white/10"
        />
        {!running && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-xl bg-black/60">
            {gameOver && <p className="text-2xl font-semibold text-rose-400">Ship destroyed! Score: {score}</p>}
            <button onClick={start} className="rounded-lg bg-purple-600 px-6 py-2 text-lg hover:bg-purple-500">
              {gameOver ? "Fly again" : "Start"}
            </button>
            <p className="text-sm text-white/60">← → / A D / mouse / drag to move. Auto-fire is on.</p>
          </div>
        )}
      </div>
    </div>
  );
}