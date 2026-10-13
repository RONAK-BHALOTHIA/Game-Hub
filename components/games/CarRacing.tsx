"use client";
import { useEffect, useRef, useState } from "react";

const W = 450;
const H = 700;
const LANES = 3;
const LANE_W = W / LANES;
const CAR_W = 60;
const CAR_H = 110;
const PLAYER_Y = H - CAR_H - 30;
const COLORS = ["#f43f5e", "#facc15", "#22c55e", "#f97316", "#e879f9"];

type Enemy = { lane: number; y: number; color: string };
type GameState = {
  lane: number;
  x: number;
  enemies: Enemy[];
  distance: number;
  speed: number;
  offset: number;
  spawn: number;
  score: number;
};

const laneX = (lane: number) => lane * LANE_W + LANE_W / 2;

const newGame = (): GameState => ({
  lane: 1,
  x: laneX(1),
  enemies: [],
  distance: 0,
  speed: 300,
  offset: 0,
  spawn: 0.8,
  score: 0,
});

function drawCar(ctx: CanvasRenderingContext2D, cx: number, y: number, color: string) {
  const x = cx - CAR_W / 2;
  const fill = (c: string, draw: () => void) => {
    ctx.fillStyle = c;
    ctx.beginPath();
    draw();
    ctx.fill();
  };

  // ground shadow
  fill("rgba(0,0,0,0.35)", () => ctx.roundRect(x + 4, y + 7, CAR_W, CAR_H, 16));

  // wheels (drawn first so they peek out from the body)
  [[x - 5, y + 16], [x + CAR_W - 5, y + 16], [x - 5, y + 74], [x + CAR_W - 5, y + 74]].forEach(
    ([wx, wy]) => fill("#0a0a0a", () => ctx.roundRect(wx, wy, 10, 24, 3))
  );

  // side mirrors
  fill(color, () => ctx.roundRect(x - 6, y + 40, 8, 9, 3));
  fill(color, () => ctx.roundRect(x + CAR_W - 2, y + 40, 8, 9, 3));

  // body
  fill(color, () => ctx.roundRect(x, y, CAR_W, CAR_H, 16));

  // body shading (light on the left, dark on the right)
  const shade = ctx.createLinearGradient(x, 0, x + CAR_W, 0);
  shade.addColorStop(0, "rgba(255,255,255,0.35)");
  shade.addColorStop(0.5, "rgba(255,255,255,0)");
  shade.addColorStop(1, "rgba(0,0,0,0.35)");
  fill(shade as unknown as string, () => ctx.roundRect(x, y, CAR_W, CAR_H, 16));

  // hood and trunk lines
  fill("rgba(255,255,255,0.12)", () => ctx.roundRect(x + 8, y + 8, CAR_W - 16, 24, 8));
  fill("rgba(0,0,0,0.15)", () => ctx.roundRect(x + 8, y + 94, CAR_W - 16, 10, 5));

  // windshield
  fill("#0f172a", () => {
    ctx.moveTo(x + 9, y + 55);
    ctx.lineTo(x + 14, y + 34);
    ctx.lineTo(x + CAR_W - 14, y + 34);
    ctx.lineTo(x + CAR_W - 9, y + 55);
    ctx.closePath();
  });
  // windshield reflection
  fill("rgba(125,211,252,0.35)", () => {
    ctx.moveTo(x + 14, y + 52);
    ctx.lineTo(x + 18, y + 38);
    ctx.lineTo(x + 26, y + 38);
    ctx.lineTo(x + 20, y + 52);
    ctx.closePath();
  });

  // roof
  fill("rgba(0,0,0,0.22)", () => ctx.roundRect(x + 10, y + 55, CAR_W - 20, 22, 5));

  // rear window
  fill("#0f172a", () => {
    ctx.moveTo(x + 11, y + 77);
    ctx.lineTo(x + CAR_W - 11, y + 77);
    ctx.lineTo(x + CAR_W - 15, y + 92);
    ctx.lineTo(x + 15, y + 92);
    ctx.closePath();
  });

  // headlights
  fill("#fef08a", () => ctx.roundRect(x + 5, y + 3, 14, 7, 3));
  fill("#fef08a", () => ctx.roundRect(x + CAR_W - 19, y + 3, 14, 7, 3));

  // taillights
  fill("#ef4444", () => ctx.roundRect(x + 5, y + CAR_H - 9, 14, 6, 2));
  fill("#ef4444", () => ctx.roundRect(x + CAR_W - 19, y + CAR_H - 9, 14, 6, 2));
}
function drawScene(ctx: CanvasRenderingContext2D, g: GameState) {
  ctx.fillStyle = "#14162b";
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = "#e2e8f0";
  ctx.fillRect(0, 0, 6, H);
  ctx.fillRect(W - 6, 0, 6, H);

  ctx.fillStyle = "rgba(255,255,255,0.5)";
  for (let i = 1; i < LANES; i++) {
    for (let y = -80 + (g.offset % 80); y < H; y += 80) {
      ctx.fillRect(i * LANE_W - 3, y, 6, 40);
    }
  }

  g.enemies.forEach((e) => drawCar(ctx, laneX(e.lane), e.y, e.color));
  drawCar(ctx, g.x, PLAYER_Y, "#22d3ee");
}

export default function CarRacing() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const game = useRef<GameState>(newGame());
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const [running, setRunning] = useState(false);
  const [gameOver, setGameOver] = useState(false);

  const steer = (dir: -1 | 1) => {
    game.current.lane = Math.max(0, Math.min(LANES - 1, game.current.lane + dir));
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
      if (e.key === "ArrowLeft" || e.key === "a") {
        e.preventDefault();
        steer(-1);
      } else if (e.key === "ArrowRight" || e.key === "d") {
        e.preventDefault();
        steer(1);
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

      g.distance += g.speed * dt;
      g.speed = Math.min(800, 300 + g.distance * 0.02);
      g.offset += g.speed * dt;
      g.x += (laneX(g.lane) - g.x) * Math.min(1, dt * 12);

      g.spawn -= dt;
      if (g.spawn <= 0) {
        g.enemies.push({
          lane: Math.floor(Math.random() * LANES),
          y: -CAR_H,
          color: COLORS[Math.floor(Math.random() * COLORS.length)],
        });
        g.spawn = Math.max(0.45, 1.1 - g.speed / 1500);
      }

      g.enemies.forEach((e) => (e.y += g.speed * dt));
      g.enemies = g.enemies.filter((e) => e.y < H + CAR_H);

      const hit = g.enemies.some(
        (e) =>
          Math.abs(laneX(e.lane) - g.x) < CAR_W - 10 &&
          e.y + CAR_H - 10 > PLAYER_Y &&
          e.y + 10 < PLAYER_Y + CAR_H
      );

      const s = Math.floor(g.distance / 100);
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
          className="h-auto w-auto max-h-[75vh] max-w-full rounded-xl border border-white/10"
        />
        {!running && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-xl bg-black/60">
            {gameOver && <p className="text-2xl font-semibold text-rose-400">Crash! Score: {score}</p>}
            <button onClick={start} className="rounded-lg bg-purple-600 px-6 py-2 text-lg hover:bg-purple-500">
              {gameOver ? "Race again" : "Start"}
            </button>
            <p className="text-sm text-white/60">← → or A / D to steer</p>
          </div>
        )}
      </div>

      {/* on-screen controls for phones */}
      <div className="flex gap-4 md:hidden">
        <button onClick={() => steer(-1)} className="h-16 w-24 rounded-xl bg-white/10 text-2xl active:bg-white/20">
          ←
        </button>
        <button onClick={() => steer(1)} className="h-16 w-24 rounded-xl bg-white/10 text-2xl active:bg-white/20">
          →
        </button>
      </div>
    </div>
  );
}