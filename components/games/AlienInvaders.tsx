"use client";
import { useEffect, useRef, useState } from "react";

const W = 480;
const H = 640;
const ROWS = 5;
const COLS = 8;
const AW = 36;
const AH = 28;
const GAPX = 48;
const GAPY = 40;
const GX0 = 40;
const GY0 = 90;
const PY = H - 60;
const BS = 7;

// pixel sprites: [type][frame]
const SPRITES: string[][][] = [
  [
    ["...###...", "..#####..", ".#######.", "##.###.##", "#########", "..#...#..", ".#.....#."],
    ["...###...", "..#####..", ".#######.", "##.###.##", "#########", ".#.#.#.#.", "#.......#"],
  ],
  [
    ["#.#####.#", "#########", "##.###.##", "#########", ".#######.", "..#...#..", ".#.....#."],
    ["#.#####.#", "#########", "##.###.##", "#########", ".#######.", ".#.#.#.#.", "#.......#"],
  ],
  [
    ["..#####..", ".#######.", "#########", "###.#.###", "#########", ".##...##.", "##.....##"],
    ["..#####..", ".#######.", "#########", "###.#.###", "#########", "..##.##..", ".##...##."],
  ],
];
const TYPE_COLOR = ["#f472b6", "#22d3ee", "#a3e635"];
const rowType = (r: number) => (r === 0 ? 0 : r <= 2 ? 1 : 2);
const rowPoints = (r: number) => (r === 0 ? 30 : r <= 2 ? 20 : 10);

type Alien = { r: number; c: number; alive: boolean };
type Block = { x: number; y: number; alive: boolean };
type Shot = { x: number; y: number };
type Particle = { x: number; y: number; vx: number; vy: number; life: number; color: string };
type GameState = {
  px: number;
  targetX: number | null;
  fire: number;
  aliens: Alien[];
  gx: number;
  gy: number;
  dir: 1 | -1;
  walk: number;
  bullets: Shot[];
  bombs: Shot[];
  blocks: Block[];
  particles: Particle[];
  ufo: { x: number; dir: 1 | -1 } | null;
  ufoTimer: number;
  bombTimer: number;
  score: number;
  lives: number;
  wave: number;
  invuln: number;
  t: number;
};

const makeAliens = (): Alien[] =>
  Array.from({ length: ROWS * COLS }, (_, i) => ({ r: Math.floor(i / COLS), c: i % COLS, alive: true }));

function makeBlocks(): Block[] {
  const blocks: Block[] = [];
  [100, 240, 380].forEach((cx) => {
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 8; c++) {
        if ((r === 0 && (c === 0 || c === 7)) || (r === 4 && c >= 3 && c <= 4)) continue;
        blocks.push({ x: cx - 28 + c * BS, y: 455 + r * BS, alive: true });
      }
    }
  });
  return blocks;
}

const newGame = (): GameState => ({
  px: W / 2,
  targetX: null,
  fire: 0,
  aliens: makeAliens(),
  gx: 0,
  gy: 0,
  dir: 1,
  walk: 0,
  bullets: [],
  bombs: [],
  blocks: makeBlocks(),
  particles: [],
  ufo: null,
  ufoTimer: 12,
  bombTimer: 1,
  score: 0,
  lives: 3,
  wave: 1,
  invuln: 0,
  t: 0,
});

const ax = (g: GameState, a: Alien) => GX0 + g.gx + a.c * GAPX;
const ay = (g: GameState, a: Alien) => GY0 + g.gy + a.r * GAPY;

function explode(g: GameState, x: number, y: number, color: string, count = 12) {
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    const sp = 50 + Math.random() * 200;
    g.particles.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0.4 + Math.random() * 0.4, color });
  }
}

function drawSprite(ctx: CanvasRenderingContext2D, rows: string[], x: number, y: number, color: string) {
  ctx.fillStyle = color;
  rows.forEach((row, j) => {
    for (let i = 0; i < row.length; i++) {
      if (row[i] === "#") ctx.fillRect(x + i * 4, y + j * 4, 4, 4);
    }
  });
}

function drawScene(ctx: CanvasRenderingContext2D, g: GameState) {
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, "#05060f");
  bg.addColorStop(1, "#1e1b4b");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = "rgba(255,255,255,0.5)";
  for (let i = 0; i < 40; i++) ctx.fillRect((i * 97 + 13) % W, (i * 61 + 7) % (H - 80), 2, 2);

  // bunkers
  ctx.fillStyle = "#4ade80";
  g.blocks.forEach((b) => b.alive && ctx.fillRect(b.x, b.y, BS - 1, BS - 1));

  // aliens
  const frame = Math.floor(g.walk / 14) % 2;
  g.aliens.forEach((a) => {
    if (!a.alive) return;
    const t = rowType(a.r);
    drawSprite(ctx, SPRITES[t][frame], ax(g, a), ay(g, a), TYPE_COLOR[t]);
  });

  // ufo
  if (g.ufo) {
    ctx.fillStyle = "#f43f5e";
    ctx.beginPath();
    ctx.ellipse(g.ufo.x, 46, 24, 9, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#fda4af";
    ctx.beginPath();
    ctx.arc(g.ufo.x, 40, 9, Math.PI, 0);
    ctx.fill();
    ctx.fillStyle = "#fde047";
    [-14, 0, 14].forEach((o) => ctx.fillRect(g.ufo!.x + o - 2, 46, 4, 3));
  }

  // player
  if (!(g.invuln > 0 && Math.floor(g.invuln * 10) % 2 === 0)) {
    ctx.fillStyle = "#7c3aed";
    ctx.beginPath();
    ctx.moveTo(g.px - 26, PY + 6);
    ctx.lineTo(g.px - 14, PY - 10);
    ctx.lineTo(g.px + 14, PY - 10);
    ctx.lineTo(g.px + 26, PY + 6);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#22d3ee";
    ctx.fillRect(g.px - 22, PY - 8, 44, 14);
    ctx.fillRect(g.px - 14, PY - 14, 28, 8);
    ctx.fillRect(g.px - 3, PY - 26, 6, 14);
  }

  // bullets and bombs
  ctx.fillStyle = "#fde047";
  g.bullets.forEach((b) => ctx.fillRect(b.x - 2, b.y, 4, 14));
  ctx.fillStyle = "#fb7185";
  g.bombs.forEach((b) => {
    const wob = Math.sin(b.y * 0.3) * 3;
    ctx.fillRect(b.x - 2 + wob, b.y, 5, 14);
  });

  // particles
  g.particles.forEach((p) => {
    ctx.globalAlpha = Math.max(0, p.life * 2);
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x - 2, p.y - 2, 4, 4);
  });
  ctx.globalAlpha = 1;

  // HUD
  ctx.font = "22px sans-serif";
  ctx.textAlign = "left";
  ctx.fillStyle = "#f43f5e";
  ctx.fillText("♥".repeat(Math.max(0, g.lives)), 14, 34);
  ctx.textAlign = "right";
  ctx.fillStyle = "rgba(255,255,255,0.8)";
  ctx.fillText(`Wave ${g.wave}`, W - 14, 34);
}

export default function AlienInvaders() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const game = useRef<GameState>(newGame());
  const keys = useRef<Set<string>>(new Set());
  const firing = useRef(false);
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const [wave, setWave] = useState(1);
  const [running, setRunning] = useState(false);
  const [gameOver, setGameOver] = useState(false);

  const aim = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    game.current.targetX = ((e.clientX - rect.left) / rect.width) * W;
  };

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
      const k = keys.current;
      g.t += dt;
      g.invuln = Math.max(0, g.invuln - dt);

      // next wave
      if (g.aliens.every((a) => !a.alive)) {
        g.wave += 1;
        setWave(g.wave);
        g.aliens = makeAliens();
        g.gx = 0;
        g.gy = Math.min(g.wave - 1, 4) * 16;
        g.dir = 1;
        g.bullets = [];
        g.bombs = [];
        g.blocks = makeBlocks();
      }

      // move player
      const dir = (k.has("arrowright") || k.has("d") ? 1 : 0) - (k.has("arrowleft") || k.has("a") ? 1 : 0);
      if (dir !== 0) {
        g.targetX = null;
        g.px += dir * 400 * dt;
      } else if (g.targetX !== null) {
        g.px += (g.targetX - g.px) * Math.min(1, dt * 16);
      }
      g.px = Math.max(30, Math.min(W - 30, g.px));

      // fire
      g.fire -= dt;
      if ((firing.current || k.has(" ")) && g.fire <= 0 && g.bullets.length < 3) {
        g.bullets.push({ x: g.px, y: PY - 30 });
        g.fire = 0.3;
      }
      g.bullets.forEach((b) => (b.y -= 560 * dt));
      g.bullets = g.bullets.filter((b) => b.y > -20);

      // move aliens
      const alive = g.aliens.filter((a) => a.alive);
      const speed = Math.min(260, 30 + g.wave * 8 + (ROWS * COLS - alive.length) * 5);
      g.gx += g.dir * speed * dt;
      g.walk += speed * dt;
      const minC = Math.min(...alive.map((a) => a.c));
      const maxC = Math.max(...alive.map((a) => a.c));
      const left = GX0 + g.gx + minC * GAPX;
      const right = GX0 + g.gx + maxC * GAPX + AW;
      if (g.dir === 1 && right > W - 10) {
        g.dir = -1;
        g.gy += 18;
        g.gx -= right - (W - 10);
      } else if (g.dir === -1 && left < 10) {
        g.dir = 1;
        g.gy += 18;
        g.gx += 10 - left;
      }

      // alien bombs
      g.bombTimer -= dt;
      if (g.bombTimer <= 0) {
        const cols = Array.from(new Set(alive.map((a) => a.c)));
        const c = cols[Math.floor(Math.random() * cols.length)];
        const shooter = alive.filter((a) => a.c === c).sort((a, b) => b.r - a.r)[0];
        g.bombs.push({ x: ax(g, shooter) + AW / 2, y: ay(g, shooter) + AH });
        g.bombTimer = Math.max(0.35, 1.0 - g.wave * 0.08) * (0.5 + Math.random());
      }
      g.bombs.forEach((b) => (b.y += (220 + g.wave * 15) * dt));
      g.bombs = g.bombs.filter((b) => b.y < H + 20);

      // ufo
      g.ufoTimer -= dt;
      if (!g.ufo && g.ufoTimer <= 0) {
        const d: 1 | -1 = Math.random() < 0.5 ? 1 : -1;
        g.ufo = { x: d === 1 ? -30 : W + 30, dir: d };
        g.ufoTimer = 15 + Math.random() * 10;
      }
      if (g.ufo) {
        g.ufo.x += g.ufo.dir * 120 * dt;
        if (g.ufo.x < -40 || g.ufo.x > W + 40) g.ufo = null;
      }

      // player bullets hit things
      g.bullets = g.bullets.filter((b) => {
        const hit = alive.find(
          (a) =>
            a.alive &&
            b.x > ax(g, a) &&
            b.x < ax(g, a) + AW &&
            b.y < ay(g, a) + AH &&
            b.y + 14 > ay(g, a)
        );
        if (hit) {
          hit.alive = false;
          g.score += rowPoints(hit.r);
          setScore(g.score);
          explode(g, ax(g, hit) + AW / 2, ay(g, hit) + AH / 2, TYPE_COLOR[rowType(hit.r)]);
          return false;
        }
        if (g.ufo && Math.abs(b.x - g.ufo.x) < 26 && b.y < 56 && b.y + 14 > 30) {
          explode(g, g.ufo.x, 46, "#f43f5e", 20);
          g.ufo = null;
          g.score += 100;
          setScore(g.score);
          return false;
        }
        const blk = g.blocks.find(
          (q) => q.alive && b.x >= q.x && b.x <= q.x + BS && b.y <= q.y + BS && b.y + 14 >= q.y
        );
        if (blk) {
          blk.alive = false;
          return false;
        }
        return true;
      });

      // bombs hit bunkers and the player
      g.bombs = g.bombs.filter((b) => {
        const blk = g.blocks.find(
          (q) => q.alive && b.x >= q.x - 2 && b.x <= q.x + BS + 2 && b.y + 14 >= q.y && b.y <= q.y + BS
        );
        if (blk) {
          blk.alive = false;
          return false;
        }
        if (g.invuln <= 0 && Math.abs(b.x - g.px) < 24 && b.y + 14 > PY - 20 && b.y < PY + 12) {
          explode(g, g.px, PY, "#67e8f9", 24);
          g.lives -= 1;
          g.invuln = 1.5;
          return false;
        }
        return true;
      });

      // aliens crush bunkers and reach the ground
      const lowest = Math.max(...alive.filter((a) => a.alive).map((a) => ay(g, a) + AH));
      if (lowest > 450) {
        g.blocks.forEach((q) => {
          if (!q.alive) return;
          const crushed = alive.some(
            (a) =>
              a.alive &&
              q.x < ax(g, a) + AW &&
              q.x + BS > ax(g, a) &&
              q.y < ay(g, a) + AH &&
              q.y + BS > ay(g, a)
          );
          if (crushed) q.alive = false;
        });
      }
      if (lowest >= PY - 30) g.lives = 0;

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
        <span>Wave: {wave}</span>
      </div>

      <div className="relative">
        <canvas
          ref={canvasRef}
          width={W}
          height={H}
          onPointerMove={aim}
          onPointerDown={(e) => {
            aim(e);
            firing.current = true;
          }}
          onPointerUp={() => (firing.current = false)}
          onPointerLeave={() => (firing.current = false)}
          onPointerCancel={() => (firing.current = false)}
          className="h-auto w-auto max-h-[75vh] max-w-full touch-none rounded-xl border border-white/10"
        />
        {!running && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-xl bg-black/65">
            {gameOver && <p className="text-2xl font-semibold text-rose-400">Earth has fallen! Score: {score}</p>}
            <button onClick={start} className="rounded-lg bg-purple-600 px-6 py-2 text-lg hover:bg-purple-500">
              {gameOver ? "Defend again" : "Start"}
            </button>
            <p className="text-sm text-white/60">← → / mouse to move · Space / click to fire</p>
          </div>
        )}
      </div>
    </div>
  );
}