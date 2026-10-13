"use client";
import { useEffect, useState } from "react";

const SIZES = [3, 4, 5];

const solved = (n: number): number[] =>
  Array.from({ length: n * n }, (_, i) => (i === n * n - 1 ? 0 : i + 1));

function neighbors(empty: number, n: number): number[] {
  const r = Math.floor(empty / n);
  const c = empty % n;
  const out: number[] = [];
  if (r > 0) out.push(empty - n);
  if (r < n - 1) out.push(empty + n);
  if (c > 0) out.push(empty - 1);
  if (c < n - 1) out.push(empty + 1);
  return out;
}

// shuffle by making random legal moves, so the puzzle is always solvable
function shuffle(n: number): number[] {
  const b = solved(n);
  let empty = b.length - 1;
  let prev = -1;
  for (let i = 0; i < n * n * 40; i++) {
    const opts = neighbors(empty, n).filter((x) => x !== prev);
    const pick = opts[Math.floor(Math.random() * opts.length)];
    [b[empty], b[pick]] = [b[pick], b[empty]];
    prev = empty;
    empty = pick;
  }
  return b;
}

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

export default function SlidingPuzzle() {
  const [n, setN] = useState(3);
  const [board, setBoard] = useState<number[]>(() => shuffle(3));
  const [moves, setMoves] = useState(0);
  const [seconds, setSeconds] = useState(0);

  const won = moves > 0 && board.every((v, i) => v === (i === board.length - 1 ? 0 : i + 1));

  const newGame = (size: number) => {
    setN(size);
    setBoard(shuffle(size));
    setMoves(0);
    setSeconds(0);
  };

  const tap = (i: number) => {
    if (won) return;
    const empty = board.indexOf(0);
    if (!neighbors(empty, n).includes(i)) return;
    const next = [...board];
    [next[empty], next[i]] = [next[i], next[empty]];
    setBoard(next);
    setMoves((m) => m + 1);
  };

  // timer starts on the first move and stops when solved
  useEffect(() => {
    if (moves === 0 || won) return;
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [moves > 0, won]); // eslint-disable-line react-hooks/exhaustive-deps

  // arrow keys: the tile moves in the direction of the key
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const empty = board.indexOf(0);
      const r = Math.floor(empty / n);
      const c = empty % n;
      let target = -1;
      if (e.key === "ArrowUp" && r < n - 1) target = empty + n;
      else if (e.key === "ArrowDown" && r > 0) target = empty - n;
      else if (e.key === "ArrowLeft" && c < n - 1) target = empty + 1;
      else if (e.key === "ArrowRight" && c > 0) target = empty - 1;
      else if (!e.key.startsWith("Arrow")) return;
      e.preventDefault();
      if (target !== -1) tap(target);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const fontSize = n === 3 ? 48 : n === 4 ? 38 : 30;

  return (
    <div className="flex flex-col items-center gap-5">
      <div className="flex items-center gap-2">
        {SIZES.map((s) => (
          <button
            key={s}
            onClick={() => newGame(s)}
            className={`rounded-full px-4 py-1.5 text-sm transition ${
              n === s ? "bg-purple-600" : "bg-white/10 hover:bg-white/20"
            }`}
          >
            {s}×{s}
          </button>
        ))}
      </div>

      <div className="flex gap-6 text-lg text-white/80">
        <span>Moves: {moves}</span>
        <span>Time: {fmt(seconds)}</span>
      </div>

      <div className="relative aspect-square w-[min(90vw,520px)] rounded-2xl border border-white/10 bg-white/10">
        {board.map((v, i) =>
          v === 0 ? null : (
            <div
              key={v}
              onClick={() => tap(i)}
              style={{
                width: `${100 / n}%`,
                height: `${100 / n}%`,
                transform: `translate(${(i % n) * 100}%, ${Math.floor(i / n) * 100}%)`,
              }}
              className="absolute left-0 top-0 cursor-pointer p-1 transition-transform duration-150"
            >
              <div
                style={{ fontSize }}
                className="flex h-full w-full items-center justify-center rounded-xl bg-gradient-to-br from-purple-600 to-cyan-500 font-bold shadow-lg hover:brightness-110"
              >
                {v}
              </div>
            </div>
          )
        )}

        {won && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-2xl bg-black/70">
            <p className="text-2xl font-semibold">🎉 Solved!</p>
            <p className="text-white/70">
              {moves} moves in {fmt(seconds)}
            </p>
            <button onClick={() => newGame(n)} className="rounded-lg bg-purple-600 px-5 py-2 hover:bg-purple-500">
              Play again
            </button>
          </div>
        )}
      </div>

      <button onClick={() => newGame(n)} className="rounded-lg bg-white/10 px-4 py-2 hover:bg-white/20">
        Shuffle
      </button>
    </div>
  );
}