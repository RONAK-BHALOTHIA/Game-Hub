"use client";
import { useEffect, useRef, useState } from "react";

const W = 900;
const H = 420;
const GROUND = 340;
const R = 20; // wheel radius
const BX = 170; // bike x position
const GRAVITY = 2200;
const JUMP = 830;

type Obstacle = { x: number; w: number; h: number; type: 0 | 1 };
type GameState = {
  y: number;
  vy: number;
  dist: number;
  speed: number;
  wheel: number;
  obstacles: Obstacle[];
  gap: number;
  score: number;
};

const newGame = (): GameState => ({
  y: 0, vy: 0, dist: 0, speed: 380, wheel: 0, obstacles: [], gap: 500, score: 0,
});

function drawBike(ctx: CanvasRenderingContext2D, g: GameState) {
  ctx.save();
  ctx.translate(BX, GROUND - R - g.y);
  ctx.rotate(Math.max(-0.45, Math.min(0.45, -g.vy * 0.0005)));
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  // wheels with spinning spokes
  [-36, 36].forEach((wx) => {
    ctx.strokeStyle = "#0a0a0a";
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.arc(wx, 0, R - 3, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = "#94a3b8";
    ctx.lineWidth = 2;
    for (let i = 0; i < 4; i++) {
      const a = g.wheel + (i * Math.PI) / 2;
      ctx.beginPath();
      ctx.moveTo(wx, 0);
      ctx.lineTo(wx + Math.cos(a) * (R - 5), Math.sin(a) * (R - 5));
      ctx.stroke();
    }
  });

  // swingarm, fork, handlebar
  ctx.strokeStyle = "#cbd5e1";
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(-36, 0); ctx.lineTo(-8, -10);
  ctx.moveTo(36, 0); ctx.lineTo(24, -36);
  ctx.moveTo(24, -36); ctx.lineTo(14, -40);
  ctx.stroke();

  // body, tank and seat
  ctx.fillStyle = "#22d3ee";
  ctx.beginPath();
  ctx.roundRect(-16, -26, 36, 18, 6);
  ctx.fill();
  ctx.fillStyle = "#0e7490";
  ctx.beginPath();
  ctx.roundRect(-34, -30, 24, 7, 3);
  ctx.fill();

  // exhaust
  ctx.strokeStyle = "#64748b";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(-6, -8); ctx.lineTo(-34, -6);
  ctx.stroke();

  // rider
  ctx.strokeStyle = "#f472b6";
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.moveTo(-16, -32); ctx.lineTo(0, -60);
  ctx.stroke();
  ctx.strokeStyle = "#e2e8f0";
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(0, -56); ctx.lineTo(14, -42); ctx.lineTo(14, -40); // arm
  ctx.moveTo(-14, -30); ctx.lineTo(4, -20); ctx.lineTo(2, -8); // leg
  ctx.stroke();
  ctx.fillStyle = "#fff"; // helmet
  ctx.beginPath();
  ctx.arc(4, -70, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#0f172a"; // visor
  ctx.fillRect(6, -74, 8, 7);

  ctx.restore();
}

function drawObstacle(ctx: CanvasRenderingContext2D, o: Obstacle) {
  const top = GROUND - o.h;
  if (o.type === 0) {
    // rock
    ctx.fillStyle = "#64748b";
    ctx.beginPath();
    ctx.moveTo(o.x, GROUND);
    ctx.lineTo(o.x + o.w * 0.2, top + o.h * 0.3);
    ctx.lineTo(o.x + o.w * 0.5, top);
    ctx.lineTo(o.x + o.w * 0.85, top + o.h * 0.35);
    ctx.lineTo(o.x + o.w, GROUND);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.18)";
    ctx.beginPath();
    ctx.moveTo(o.x + o.w * 0.5, top);
    ctx.lineTo(o.x + o.w * 0.2, top + o.h * 0.3);
    ctx.lineTo(o.x + o.w * 0.45, GROUND);
    ctx.closePath();
    ctx.fill();
  } else {
    // crate
    ctx.fillStyle = "#f97316";
    ctx.fillRect(o.x, top, o.w, o.h);
    ctx.strokeStyle = "#7c2d12";
    ctx.lineWidth = 4;
    ctx.strokeRect(o.x + 2, top + 2, o.w - 4, o.h - 4);
    ctx.beginPath();
    ctx.moveTo(o.x + 2, top + 2); ctx.lineTo(o.x + o.w - 2, GROUND - 2);
    ctx.moveTo(o.x + o.w - 2, top + 2); ctx.lineTo(o.x + 2, GROUND - 2);
    ctx.stroke();
  }
}

function drawScene(ctx: CanvasRenderingContext2D, g: GameState) {
  // sky
  const sky = ctx.createLinearGradient(0, 0, 0, GROUND);
  sky.addColorStop(0, "#0b0d1f");
  sky.addColorStop(1, "#312e81");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);

  // moon
  ctx.fillStyle = "#e0e7ff";
  ctx.beginPath();
  ctx.arc(760, 70, 28, 0, Math.PI * 2);
  ctx.fill();

  // parallax hills
  [
    { color: "rgba(76,29,149,0.55)", base: 270, amp: 45, freq: 140, speed: 0.1 },
    { color: "rgba(30,27,75,0.9)", base: 300, amp: 30, freq: 90, speed: 0.25 },
  ].forEach((l) => {
    ctx.fillStyle = l.color;
    ctx.beginPath();
    ctx.moveTo(0, GROUND);
    for (let x = 0; x <= W; x += 10) {
      ctx.lineTo(x, l.base - l.amp * Math.sin((x + g.dist * l.speed) / l.freq));
    }
    ctx.lineTo(W, GROUND);
    ctx.closePath();
    ctx.fill();
  });

  // ground
  ctx.fillStyle = "#14162b";
  ctx.fillRect(0, GROUND, W, H - GROUND);
  ctx.fillStyle = "#22d3ee";
  ctx.fillRect(0, GROUND, W, 3);
  ctx.fillStyle = "rgba(255,255,255,0.25)";
  for (let x = -((g.dist % 120)); x < W; x += 120) {
    ctx.fillRect(x, GROUND + 28, 60, 4);
  }

  g.obstacles.forEach((o) => drawObstacle(ctx, o));
  drawBike(ctx, g);
}

export default function BikeRunner() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const game = useRef<GameState>(newGame());
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const [running, setRunning] = useState(false);
  const [gameOver, setGameOver] = useState(false);

  const jump = () => {
    if (game.current.y <= 0) game.current.vy = JUMP;
  };

  const start = () => {
    game.current = newGame();
    setScore(0);
    setGameOver(false);
    setRunning(true);
  };

  // keyboard + idle frame
  useEffect(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (ctx) drawScene(ctx, game.current);

    const onKey = (e: KeyboardEvent) => {
      if (e.key === " " || e.key === "ArrowUp" || e.key === "w") {
        e.preventDefault();
        jump();
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

      g.speed = Math.min(850, 380 + g.dist * 0.015);
      g.dist += g.speed * dt;
      g.wheel += (g.speed * dt) / R;

      g.vy -= GRAVITY * dt;
      g.y += g.vy * dt;
      if (g.y <= 0) {
        g.y = 0;
        g.vy = 0;
      }

      g.obstacles.forEach((o) => (o.x -= g.speed * dt));
      g.obstacles = g.obstacles.filter((o) => o.x + o.w > -20);

      const lastO = g.obstacles[g.obstacles.length - 1];
      if (!lastO || lastO.x < W - g.gap) {
        g.obstacles.push({
          x: W + 20,
          w: 36 + Math.random() * 30,
          h: 34 + Math.random() * 34,
          type: Math.random() < 0.5 ? 0 : 1,
        });
        g.gap = 400 + Math.random() * 350 + g.speed * 0.3;
      }

      const hit = g.obstacles.some(
        (o) => o.x < BX + 32 && o.x + o.w > BX - 32 && g.y < o.h - 8
      );

      const s = Math.floor(g.dist / 50);
      if (s !== g.score) {
        g.score = s;
        setScore(s);
      }

      drawScene(ctx, g);

      if (hit) {
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
    <div className="flex w-full flex-col items-center gap-4">
      <div className="flex gap-6 text-lg text-white/80">
        <span>Score: {score}</span>
        <span>Best: {best}</span>
      </div>

      <div className="relative w-full max-w-5xl">
        <canvas
          ref={canvasRef}
          width={W}
          height={H}
          onPointerDown={jump}
          className="h-auto w-full touch-none rounded-xl border border-white/10"
        />
        {!running && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-xl bg-black/60">
            {gameOver && <p className="text-2xl font-semibold text-rose-400">Crashed! Score: {score}</p>}
            <button onClick={start} className="rounded-lg bg-purple-600 px-6 py-2 text-lg hover:bg-purple-500">
              {gameOver ? "Ride again" : "Start"}
            </button>
            <p className="text-sm text-white/60">Space / ↑ / W or tap to jump</p>
          </div>
        )}
      </div>

      {/* on-screen jump button for phones */}
      <button
        onClick={jump}
        className="h-16 w-48 rounded-xl bg-white/10 text-xl active:bg-white/20 md:hidden"
      >
        JUMP
      </button>
    </div>
  );
}