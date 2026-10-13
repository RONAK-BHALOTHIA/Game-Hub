"use client";
import { useCallback, useEffect, useRef, useState } from "react";

const SIZE = 20;
const CELL = 30;

type Point = { x: number; y: number };
type Dir = "UP" | "DOWN" | "LEFT" | "RIGHT";

const DELTA: Record<Dir, Point> = {
  UP: { x: 0, y: -1 },
  DOWN: { x: 0, y: 1 },
  LEFT: { x: -1, y: 0 },
  RIGHT: { x: 1, y: 0 },
};
const OPPOSITE: Record<Dir, Dir> = { UP: "DOWN", DOWN: "UP", LEFT: "RIGHT", RIGHT: "LEFT" };

function randomFood(snake: Point[]): Point {
  let p: Point;
  do {
    p = { x: Math.floor(Math.random() * SIZE), y: Math.floor(Math.random() * SIZE) };
  } while (snake.some((s) => s.x === p.x && s.y === p.y));
  return p;
}

export default function Snake() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const snake = useRef<Point[]>([{ x: 10, y: 10 }]);
  const dir = useRef<Dir>("RIGHT");
  const nextDir = useRef<Dir>("RIGHT");
  const food = useRef<Point>({ x: 5, y: 5 });

  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const [running, setRunning] = useState(false);
  const [gameOver, setGameOver] = useState(false);

  const draw = useCallback(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#0b0d1f";
    ctx.fillRect(0, 0, SIZE * CELL, SIZE * CELL);

    ctx.fillStyle = "#f43f5e";
    ctx.beginPath();
    ctx.arc(food.current.x * CELL + CELL / 2, food.current.y * CELL + CELL / 2, CELL / 2 - 2, 0, Math.PI * 2);
    ctx.fill();

    snake.current.forEach((s, i) => {
      ctx.fillStyle = i === 0 ? "#22d3ee" : "#a855f7";
      ctx.fillRect(s.x * CELL + 1, s.y * CELL + 1, CELL - 2, CELL - 2);
    });
  }, []);

  const turn = useCallback((d: Dir) => {
    if (OPPOSITE[d] !== dir.current) nextDir.current = d;
  }, []);

  const start = () => {
    snake.current = [{ x: 10, y: 10 }];
    dir.current = "RIGHT";
    nextDir.current = "RIGHT";
    food.current = randomFood(snake.current);
    setScore(0);
    setGameOver(false);
    setRunning(true);
    draw();
  };

  // game loop
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      dir.current = nextDir.current;
      const head = snake.current[0];
      const d = DELTA[dir.current];
      const newHead = { x: head.x + d.x, y: head.y + d.y };

      const ate = newHead.x === food.current.x && newHead.y === food.current.y;
      const body = ate ? snake.current : snake.current.slice(0, -1);
      const hitWall = newHead.x < 0 || newHead.y < 0 || newHead.x >= SIZE || newHead.y >= SIZE;
      const hitSelf = body.some((s) => s.x === newHead.x && s.y === newHead.y);

      if (hitWall || hitSelf) {
        setRunning(false);
        setGameOver(true);
        return;
      }

      snake.current = [newHead, ...snake.current];
      if (ate) {
        const n = snake.current.length - 1;
        setScore(n);
        setBest((b) => Math.max(b, n));
        food.current = randomFood(snake.current);
      } else {
        snake.current.pop();
      }
      draw();
    }, 120);
    return () => clearInterval(id);
  }, [running, draw]);

  // keyboard + first draw
  useEffect(() => {
    draw();
    const map: Record<string, Dir> = {
      ArrowUp: "UP", ArrowDown: "DOWN", ArrowLeft: "LEFT", ArrowRight: "RIGHT",
      w: "UP", s: "DOWN", a: "LEFT", d: "RIGHT",
    };
    const onKey = (e: KeyboardEvent) => {
      const d = map[e.key];
      if (!d) return;
      e.preventDefault();
      turn(d);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [draw, turn]);

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex gap-6 text-white/80">
        <span>Score: {score}</span>
        <span>Best: {best}</span>
      </div>

      <div className="h-auto max-w-full rounded-xl border border-white/10">
        <canvas
          ref={canvasRef}
          width={SIZE * CELL}
          height={SIZE * CELL}
          className="max-w-full rounded-xl border border-white/10"
        />
        {!running && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-xl bg-black/60">
            {gameOver && <p className="text-xl font-semibold text-rose-400">Game over! Score: {score}</p>}
            <button onClick={start} className="rounded-lg bg-purple-600 px-5 py-2 hover:bg-purple-500">
              {gameOver ? "Play again" : "Start"}
            </button>
          </div>
        )}
      </div>

      {/* on-screen controls for phones */}
      <div className="grid grid-cols-3 gap-2 md:hidden">
        <span />
        <button onClick={() => turn("UP")} className="h-12 w-12 rounded-lg bg-white/10">↑</button>
        <span />
        <button onClick={() => turn("LEFT")} className="h-12 w-12 rounded-lg bg-white/10">←</button>
        <button onClick={() => turn("DOWN")} className="h-12 w-12 rounded-lg bg-white/10">↓</button>
        <button onClick={() => turn("RIGHT")} className="h-12 w-12 rounded-lg bg-white/10">→</button>
      </div>
    </div>
  );
}