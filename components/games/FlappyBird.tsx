"use client";
import { useEffect, useRef, useState } from "react";

const W = 480;
const H = 720;
const GROUND = H - 80;
const BX = 130; // bird x
const R = 18; // bird radius
const GRAVITY = 1500;
const FLAP = 460;
const PIPE_W = 76;
const GAP = 180;
const SPACING = 270;

type Pipe = { x: number; gapY: number; passed: boolean };
type GameState = {
  y: number;
  vy: number;
  pipes: Pipe[];
  offset: number;
  score: number;
};

const newGame = (): GameState => ({ y: H / 2 - 40, vy: 0, pipes: [], offset: 0, score: 0 });

function drawPipe(ctx: CanvasRenderingContext2D, p: Pipe) {
  const topH = p.gapY - GAP / 2;
  const botY = p.gapY + GAP / 2;

  const body = ctx.createLinearGradient(p.x, 0, p.x + PIPE_W, 0);
  body.addColorStop(0, "#15803d");
  body.addColorStop(0.4, "#4ade80");
  body.addColorStop(1, "#166534");

  ctx.fillStyle = body;
  ctx.fillRect(p.x + 6, 0, PIPE_W - 12, topH);
  ctx.fillRect(p.x + 6, botY, PIPE_W - 12, GROUND - botY);

  // caps
  ctx.beginPath();
  ctx.roundRect(p.x, topH - 30, PIPE_W, 30, 6);
  ctx.fill();
  ctx.beginPath();
  ctx.roundRect(p.x, botY, PIPE_W, 30, 6);
  ctx.fill();
}

function drawBird(ctx: CanvasRenderingContext2D, g: GameState, flapPhase: number) {
  ctx.save();
  ctx.translate(BX, g.y);
  ctx.rotate(Math.max(-0.5, Math.min(1.1, g.vy / 700)));

  // body
  ctx.fillStyle = "#facc15";
  ctx.beginPath();
  ctx.arc(0, 0, R, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.35)";
  ctx.beginPath();
  ctx.ellipse(-3, 5, 11, 7, 0, 0, Math.PI * 2);
  ctx.fill();

  // wing
  ctx.fillStyle = "#f59e0b";
  ctx.beginPath();
  ctx.ellipse(-6, 4 + Math.sin(flapPhase) * 4, 10, 6, -0.3, 0, Math.PI * 2);
  ctx.fill();

  // beak
  ctx.fillStyle = "#f97316";
  ctx.beginPath();
  ctx.moveTo(R - 2, -3);
  ctx.lineTo(R + 12, 2);
  ctx.lineTo(R - 2, 8);
  ctx.closePath();
  ctx.fill();

  // eye
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.arc(8, -7, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#0f172a";
  ctx.beginPath();
  ctx.arc(10, -7, 3, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawScene(ctx: CanvasRenderingContext2D, g: GameState, flapPhase: number) {
  // sky
  const sky = ctx.createLinearGradient(0, 0, 0, GROUND);
  sky.addColorStop(0, "#0b0d1f");
  sky.addColorStop(1, "#4c1d95");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);

  // stars
  ctx.fillStyle = "rgba(255,255,255,0.6)";
  for (let i = 0; i < 30; i++) {
    const sx = (i * 97 + 31) % W;
    const sy = (i * 53 + 17) % (GROUND - 150);
    ctx.fillRect(sx, sy, 2, 2);
  }

  g.pipes.forEach((p) => drawPipe(ctx, p));

  // ground
  ctx.fillStyle = "#14162b";
  ctx.fillRect(0, GROUND, W, H - GROUND);
  ctx.fillStyle = "#22d3ee";
  ctx.fillRect(0, GROUND, W, 4);
  ctx.fillStyle = "rgba(255,255,255,0.2)";
  for (let x = -(g.offset % 60); x < W; x += 60) {
    ctx.fillRect(x, GROUND + 30, 30, 4);
  }

  drawBird(ctx, g, flapPhase);

  // score
  ctx.fillStyle = "#fff";
  ctx.font = "bold 56px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(String(g.score), W / 2, 90);
}

export default function FlappyBird() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const game = useRef<GameState>(newGame());
  const [best, setBest] = useState(0);
  const [score, setScore] = useState(0);
  const [running, setRunning] = useState(false);
  const [gameOver, setGameOver] = useState(false);

  const flap = () => {
    game.current.vy = -FLAP;
  };

  const start = () => {
    game.current = newGame();
    game.current.vy = -FLAP;
    setScore(0);
    setGameOver(false);
    setRunning(true);
  };

  // keyboard + idle frame
  useEffect(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (ctx) drawScene(ctx, game.current, 0);

    const onKey = (e: KeyboardEvent) => {
      if (e.key === " " || e.key === "ArrowUp" || e.key === "w") {
        e.preventDefault();
        flap();
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
      const speed = Math.min(300, 190 + g.score * 4);

      g.vy += GRAVITY * dt;
      g.y += g.vy * dt;
      g.offset += speed * dt;

      g.pipes.forEach((p) => (p.x -= speed * dt));
      g.pipes = g.pipes.filter((p) => p.x + PIPE_W > -10);

      const lastP = g.pipes[g.pipes.length - 1];
      if (!lastP || lastP.x < W - SPACING) {
        g.pipes.push({
          x: W + 20,
          gapY: 170 + Math.random() * (GROUND - 340),
          passed: false,
        });
      }

      g.pipes.forEach((p) => {
        if (!p.passed && p.x + PIPE_W < BX - R) {
          p.passed = true;
          g.score += 1;
          setScore(g.score);
        }
      });

      const hitPipe = g.pipes.some(
        (p) =>
          BX + R - 4 > p.x &&
          BX - R + 4 < p.x + PIPE_W &&
          (g.y - R + 4 < p.gapY - GAP / 2 || g.y + R - 4 > p.gapY + GAP / 2)
      );
      const hitBounds = g.y + R > GROUND || g.y - R < 0;

      drawScene(ctx, g, now / 60);

      if (hitPipe || hitBounds) {
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
          onPointerDown={flap}
          className="h-auto w-auto max-h-[75vh] max-w-full touch-none rounded-xl border border-white/10"
        />
        {!running && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-xl bg-black/60">
            {gameOver && <p className="text-2xl font-semibold text-rose-400">Game over! Score: {score}</p>}
            <button onClick={start} className="rounded-lg bg-purple-600 px-6 py-2 text-lg hover:bg-purple-500">
              {gameOver ? "Try again" : "Start"}
            </button>
            <p className="text-sm text-white/60">Space / ↑ / W or tap to flap</p>
          </div>
        )}
      </div>

      {/* on-screen flap button for phones */}
      <button
        onClick={flap}
        className="h-16 w-48 rounded-xl bg-white/10 text-xl active:bg-white/20 md:hidden"
      >
        FLAP
      </button>
    </div>
  );
}