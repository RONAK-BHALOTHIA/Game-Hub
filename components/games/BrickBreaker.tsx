"use client";
import { useEffect, useRef, useState } from "react";

const W = 480;
const H = 640;
const COLS = 8;
const ROWS = 6;
const BW = W / COLS;
const BH = 26;
const TOP = 70;
const PW = 100;
const PH = 14;
const PY = H - 50;
const BR = 8;
const COLORS = ["#f43f5e", "#f97316", "#facc15", "#22c55e", "#22d3ee", "#a855f7"];

type GameState = {
  px: number;
  targetX: number | null;
  bx: number;
  by: number;
  vx: number;
  vy: number;
  launched: boolean;
  bricks: boolean[][];
  score: number;
  lives: number;
  level: number;
};

const makeBricks = () => Array.from({ length: ROWS }, () => Array(COLS).fill(true) as boolean[]);
const baseSpeed = (level: number) => 380 + (level - 1) * 45;

const newGame = (): GameState => ({
  px: W / 2,
  targetX: null,
  bx: W / 2,
  by: PY - BR - 1,
  vx: 0,
  vy: 0,
  launched: false,
  bricks: makeBricks(),
  score: 0,
  lives: 3,
  level: 1,
});

function drawScene(ctx: CanvasRenderingContext2D, g: GameState) {
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, "#05060f");
  bg.addColorStop(1, "#1e1b4b");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // bricks
  g.bricks.forEach((row, r) =>
    row.forEach((alive, c) => {
      if (!alive) return;
      const x = c * BW + 2;
      const y = TOP + r * BH + 2;
      ctx.fillStyle = COLORS[r];
      ctx.beginPath();
      ctx.roundRect(x, y, BW - 4, BH - 4, 6);
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.25)";
      ctx.beginPath();
      ctx.roundRect(x + 3, y + 3, BW - 10, 5, 3);
      ctx.fill();
    })
  );

  // paddle
  const pad = ctx.createLinearGradient(0, PY, 0, PY + PH);
  pad.addColorStop(0, "#67e8f9");
  pad.addColorStop(1, "#7c3aed");
  ctx.fillStyle = pad;
  ctx.beginPath();
  ctx.roundRect(g.px - PW / 2, PY, PW, PH, 7);
  ctx.fill();

  // ball with glow
  ctx.save();
  ctx.shadowColor = "#67e8f9";
  ctx.shadowBlur = 16;
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.arc(g.bx, g.by, BR, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // HUD
  ctx.font = "22px sans-serif";
  ctx.textAlign = "left";
  ctx.fillStyle = "#f43f5e";
  ctx.fillText("♥".repeat(Math.max(0, g.lives)), 14, 34);
  ctx.textAlign = "right";
  ctx.fillStyle = "rgba(255,255,255,0.8)";
  ctx.fillText(`Level ${g.level}`, W - 14, 34);

  if (!g.launched) {
    ctx.textAlign = "center";
    ctx.font = "16px sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.6)";
    ctx.fillText("Click, tap or press Space to launch", W / 2, PY - 40);
  }
}

export default function BrickBreaker() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const game = useRef<GameState>(newGame());
  const keys = useRef<Set<string>>(new Set());
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const [level, setLevel] = useState(1);
  const [running, setRunning] = useState(false);
  const [gameOver, setGameOver] = useState(false);

  const launch = () => {
    const g = game.current;
    if (g.launched) return;
    const a = (Math.random() - 0.5) * 0.9;
    const s = baseSpeed(g.level);
    g.vx = s * Math.sin(a);
    g.vy = -s * Math.cos(a);
    g.launched = true;
  };

  const aim = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    game.current.targetX = ((e.clientX - rect.left) / rect.width) * W;
  };

  const start = () => {
    game.current = newGame();
    setScore(0);
    setLevel(1);
    setGameOver(false);
    setRunning(true);
  };

  // keyboard + idle frame
  useEffect(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (ctx) drawScene(ctx, game.current);

    const down = (e: KeyboardEvent) => {
      if (["ArrowLeft", "ArrowRight", " "].includes(e.key)) e.preventDefault();
      if (e.key === " ") launch();
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
      const dt = Math.min((now - last) / 1000, 0.03);
      last = now;
      const g = game.current;

      // paddle movement
      const k = keys.current;
      const dir = (k.has("arrowright") || k.has("d") ? 1 : 0) - (k.has("arrowleft") || k.has("a") ? 1 : 0);
      if (dir !== 0) {
        g.targetX = null;
        g.px += dir * 520 * dt;
      } else if (g.targetX !== null) {
        g.px += (g.targetX - g.px) * Math.min(1, dt * 20);
      }
      g.px = Math.max(PW / 2, Math.min(W - PW / 2, g.px));

      if (!g.launched) {
        g.bx = g.px;
        g.by = PY - BR - 1;
      } else {
        g.bx += g.vx * dt;
        g.by += g.vy * dt;

        // walls
        if (g.bx - BR < 0) {
          g.bx = BR;
          g.vx = Math.abs(g.vx);
        } else if (g.bx + BR > W) {
          g.bx = W - BR;
          g.vx = -Math.abs(g.vx);
        }
        if (g.by - BR < 0) {
          g.by = BR;
          g.vy = Math.abs(g.vy);
        }

        // paddle
        if (
          g.vy > 0 &&
          g.by + BR >= PY &&
          g.by - BR <= PY + PH &&
          g.bx >= g.px - PW / 2 - BR &&
          g.bx <= g.px + PW / 2 + BR
        ) {
          const hit = Math.max(-1, Math.min(1, (g.bx - g.px) / (PW / 2)));
          const angle = hit * 1.05;
          const s = Math.hypot(g.vx, g.vy);
          g.vx = s * Math.sin(angle);
          g.vy = -s * Math.cos(angle);
          g.by = PY - BR;
        }

        // bricks (one hit per frame)
        outer: for (let r = 0; r < ROWS; r++) {
          for (let c = 0; c < COLS; c++) {
            if (!g.bricks[r][c]) continue;
            const x = c * BW;
            const y = TOP + r * BH;
            const cx = Math.max(x, Math.min(g.bx, x + BW));
            const cy = Math.max(y, Math.min(g.by, y + BH));
            if (Math.hypot(g.bx - cx, g.by - cy) < BR) {
              g.bricks[r][c] = false;
              const dx = (g.bx - (x + BW / 2)) / BW;
              const dy = (g.by - (y + BH / 2)) / BH;
              if (Math.abs(dx) > Math.abs(dy)) g.vx = Math.abs(g.vx) * (dx >= 0 ? 1 : -1);
              else g.vy = Math.abs(g.vy) * (dy >= 0 ? 1 : -1);
              g.score += 10;
              setScore(g.score);
              break outer;
            }
          }
        }

        // level cleared
        if (g.bricks.every((row) => row.every((b) => !b))) {
          g.level += 1;
          setLevel(g.level);
          g.bricks = makeBricks();
          g.launched = false;
        }

        // ball lost
        if (g.by - BR > H) {
          g.lives -= 1;
          g.launched = false;
        }
      }

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
        <span>Level: {level}</span>
      </div>

      <div className="relative">
        <canvas
          ref={canvasRef}
          width={W}
          height={H}
          onPointerMove={aim}
          onPointerDown={(e) => {
            aim(e);
            launch();
          }}
          className="h-auto w-auto max-h-[75vh] max-w-full touch-none rounded-xl border border-white/10"
        />
        {!running && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-xl bg-black/60">
            {gameOver && <p className="text-2xl font-semibold text-rose-400">Game over! Score: {score}</p>}
            <button onClick={start} className="rounded-lg bg-purple-600 px-6 py-2 text-lg hover:bg-purple-500">
              {gameOver ? "Play again" : "Start"}
            </button>
            <p className="text-sm text-white/60">Mouse / drag / ← → to move. Click or Space to launch.</p>
          </div>
        )}
      </div>
    </div>
  );
}