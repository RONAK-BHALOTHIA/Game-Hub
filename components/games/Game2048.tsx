"use client";
import { useCallback, useEffect, useRef, useState } from "react";

type Board = number[][];
const N = 4;

const emptyBoard = (): Board => Array.from({ length: N }, () => Array(N).fill(0));

function addTile(b: Board): Board {
  const cells: [number, number][] = [];
  b.forEach((row, r) => row.forEach((v, c) => v === 0 && cells.push([r, c])));
  if (!cells.length) return b;
  const [r, c] = cells[Math.floor(Math.random() * cells.length)];
  const nb = b.map((row) => [...row]);
  nb[r][c] = Math.random() < 0.9 ? 2 : 4;
  return nb;
}

function slideRow(row: number[]) {
  const nums = row.filter(Boolean);
  const out: number[] = [];
  let gained = 0;
  for (let i = 0; i < nums.length; i++) {
    if (nums[i] === nums[i + 1]) {
      out.push(nums[i] * 2);
      gained += nums[i] * 2;
      i++;
    } else {
      out.push(nums[i]);
    }
  }
  while (out.length < N) out.push(0);
  return { row: out, gained };
}

// rotate clockwise
const rotate = (b: Board): Board => b[0].map((_, c) => b.map((row) => row[c]).reverse());

const TURNS = { left: 0, down: 1, right: 2, up: 3 } as const;
type Dir = keyof typeof TURNS;

function move(b: Board, d: Dir) {
  let g = b;
  for (let i = 0; i < TURNS[d]; i++) g = rotate(g);
  let gained = 0;
  g = g.map((row) => {
    const r = slideRow(row);
    gained += r.gained;
    return r.row;
  });
  for (let i = 0; i < (4 - TURNS[d]) % 4; i++) g = rotate(g);
  const moved = g.some((row, r) => row.some((v, c) => v !== b[r][c]));
  return { board: g, gained, moved };
}

const canMove = (b: Board) =>
  (["left", "right", "up", "down"] as Dir[]).some((d) => move(b, d).moved);

const TILE: Record<number, string> = {
  0: "bg-white/5",
  2: "bg-slate-200 text-slate-800",
  4: "bg-amber-100 text-slate-800",
  8: "bg-orange-400 text-white",
  16: "bg-orange-500 text-white",
  32: "bg-red-500 text-white",
  64: "bg-red-600 text-white",
  128: "bg-yellow-400 text-white text-3xl",
  256: "bg-yellow-500 text-white text-3xl",
  512: "bg-lime-500 text-white text-3xl",
  1024: "bg-cyan-500 text-white text-2xl",
  2048: "bg-purple-600 text-white text-2xl",
};

export default function Game2048() {
  const [board, setBoard] = useState<Board>(() => addTile(addTile(emptyBoard())));
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const touch = useRef<{ x: number; y: number } | null>(null);

  const over = !canMove(board);
  const won = board.some((row) => row.includes(2048));

  const play = useCallback(
    (d: Dir) => {
      if (over) return;
      const res = move(board, d);
      if (!res.moved) return;
      const n = score + res.gained;
      setBoard(addTile(res.board));
      setScore(n);
      setBest((b) => Math.max(b, n));
    },
    [board, score, over]
  );

  useEffect(() => {
    const map: Record<string, Dir> = {
      ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right",
      w: "up", s: "down", a: "left", d: "right",
    };
    const onKey = (e: KeyboardEvent) => {
      const d = map[e.key];
      if (!d) return;
      e.preventDefault();
      play(d);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [play]);

  const onTouchStart = (e: React.TouchEvent) => {
    touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (!touch.current) return;
    const dx = e.changedTouches[0].clientX - touch.current.x;
    const dy = e.changedTouches[0].clientY - touch.current.y;
    touch.current = null;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 30) return;
    if (Math.abs(dx) > Math.abs(dy)) play(dx > 0 ? "right" : "left");
    else play(dy > 0 ? "down" : "up");
  };

  const restart = () => {
    setBoard(addTile(addTile(emptyBoard())));
    setScore(0);
  };

  return (
    <div className="flex flex-col items-center gap-5">
      <div className="flex items-center gap-6 text-lg text-white/80">
        <span>Score: {score}</span>
        <span>Best: {best}</span>
        <button onClick={restart} className="rounded-lg bg-white/10 px-4 py-1.5 hover:bg-white/20">
          New game
        </button>
      </div>

      <div
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        className="relative touch-none rounded-2xl border border-white/10 bg-white/10 p-3"
      >
        <div className="grid grid-cols-4 gap-3">
          {board.flat().map((v, i) => (
            <div
              key={i}
              className={`flex h-16 w-16 items-center justify-center rounded-xl text-4xl font-bold transition sm:h-24 sm:w-24 ${
                TILE[v] ?? "bg-purple-800 text-white text-xl"
              }`}
            >
              {v || ""}
            </div>
          ))}
        </div>

        {(over || won) && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-2xl bg-black/70">
            <p className="text-2xl font-semibold">{won ? "🎉 You reached 2048!" : "Game over!"}</p>
            <button onClick={restart} className="rounded-lg bg-purple-600 px-5 py-2 hover:bg-purple-500">
              Play again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}