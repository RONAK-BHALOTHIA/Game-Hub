"use client";
import { useEffect, useState } from "react";

type Grid = number[][]; // 0 = empty

const LEVELS = { Easy: 36, Medium: 30, Hard: 26 } as const;
type Level = keyof typeof LEVELS;

const shuffleArr = <T,>(a: T[]): T[] => [...a].sort(() => Math.random() - 0.5);
const emptyGrid = (): Grid => Array.from({ length: 9 }, () => Array(9).fill(0));
const copy = (g: Grid): Grid => g.map((r) => [...r]);

function candidates(g: Grid, r: number, c: number): number[] {
  const used = new Set<number>();
  for (let i = 0; i < 9; i++) {
    used.add(g[r][i]);
    used.add(g[i][c]);
  }
  const br = r - (r % 3);
  const bc = c - (c % 3);
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) used.add(g[br + i][bc + j]);
  return [1, 2, 3, 4, 5, 6, 7, 8, 9].filter((n) => !used.has(n));
}

// fills an empty grid with a random complete solution
function fill(g: Grid): boolean {
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (g[r][c] !== 0) continue;
      for (const n of shuffleArr(candidates(g, r, c))) {
        g[r][c] = n;
        if (fill(g)) return true;
      }
      g[r][c] = 0;
      return false;
    }
  }
  return true;
}

// counts solutions, stopping at 2 (enough to know if it is unique)
function countSolutions(g: Grid): number {
  let best: number[] | null = null;
  let br = -1;
  let bc = -1;
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (g[r][c] !== 0) continue;
      const cand = candidates(g, r, c);
      if (cand.length === 0) return 0;
      if (!best || cand.length < best.length) {
        best = cand;
        br = r;
        bc = c;
      }
    }
  }
  if (!best) return 1;
  let count = 0;
  for (const n of best) {
    g[br][bc] = n;
    count += countSolutions(g);
    g[br][bc] = 0;
    if (count >= 2) break;
  }
  return count;
}

function makePuzzle(level: Level) {
  const solution = emptyGrid();
  fill(solution);
  const puzzle = copy(solution);
  let givens = 81;
  for (const i of shuffleArr(Array.from({ length: 81 }, (_, k) => k))) {
    if (givens <= LEVELS[level]) break;
    const r = Math.floor(i / 9);
    const c = i % 9;
    const keep = puzzle[r][c];
    puzzle[r][c] = 0;
    if (countSolutions(copy(puzzle)) !== 1) puzzle[r][c] = keep;
    else givens--;
  }
  return { puzzle, solution, grid: copy(puzzle) };
}

// marks every cell that repeats a number in its row, column or box
function findConflicts(g: Grid): boolean[][] {
  const bad = Array.from({ length: 9 }, () => Array(9).fill(false) as boolean[]);
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      const v = g[r][c];
      if (!v) continue;
      for (let i = 0; i < 9; i++) {
        if (i !== c && g[r][i] === v) bad[r][c] = true;
        if (i !== r && g[i][c] === v) bad[r][c] = true;
      }
      const br = r - (r % 3);
      const bc = c - (c % 3);
      for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
          if ((br + i !== r || bc + j !== c) && g[br + i][bc + j] === v) bad[r][c] = true;
        }
      }
    }
  }
  return bad;
}

const sameUnit = (r: number, c: number, sr: number, sc: number) =>
  r === sr ||
  c === sc ||
  (Math.floor(r / 3) === Math.floor(sr / 3) && Math.floor(c / 3) === Math.floor(sc / 3));

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

export default function Sudoku() {
  const [level, setLevel] = useState<Level>("Easy");
  const [game, setGame] = useState(() => makePuzzle("Easy"));
  const [sel, setSel] = useState<[number, number] | null>(null);
  const [seconds, setSeconds] = useState(0);
  const [hints, setHints] = useState(0);

  const bad = findConflicts(game.grid);
  const won = game.grid.every((row) => row.every((v) => v !== 0)) && bad.every((row) => row.every((b) => !b));

  const newGame = (l: Level) => {
    setLevel(l);
    setGame(makePuzzle(l));
    setSel(null);
    setSeconds(0);
    setHints(0);
  };

  const put = (n: number) => {
    if (!sel || won) return;
    const [r, c] = sel;
    if (game.puzzle[r][c] !== 0) return;
    setGame((gm) => ({
      ...gm,
      grid: gm.grid.map((row, i) => (i === r ? row.map((v, j) => (j === c ? n : v)) : row)),
    }));
  };

  const hint = () => {
    if (!sel || won) return;
    const [r, c] = sel;
    if (game.puzzle[r][c] !== 0 || game.grid[r][c] === game.solution[r][c]) return;
    put(game.solution[r][c]);
    setHints((h) => h + 1);
  };

  // timer
  useEffect(() => {
    if (won) return;
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [won]);

  // keyboard
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key >= "1" && e.key <= "9") {
        put(Number(e.key));
      } else if (e.key === "Backspace" || e.key === "Delete" || e.key === "0") {
        put(0);
      } else if (e.key.startsWith("Arrow")) {
        e.preventDefault();
        setSel((s) => {
          const [r, c] = s ?? [4, 4];
          if (e.key === "ArrowUp") return [Math.max(0, r - 1), c];
          if (e.key === "ArrowDown") return [Math.min(8, r + 1), c];
          if (e.key === "ArrowLeft") return [r, Math.max(0, c - 1)];
          return [r, Math.min(8, c + 1)];
        });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const selVal = sel ? game.grid[sel[0]][sel[1]] : 0;

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex items-center gap-2">
        {(Object.keys(LEVELS) as Level[]).map((l) => (
          <button
            key={l}
            onClick={() => newGame(l)}
            className={`rounded-full px-4 py-1.5 text-sm transition ${
              level === l ? "bg-purple-600" : "bg-white/10 hover:bg-white/20"
            }`}
          >
            {l}
          </button>
        ))}
      </div>

      <div className="flex gap-6 text-lg text-white/80">
        <span>⏱ {fmt(seconds)}</span>
        <span>Hints: {hints}</span>
      </div>

      <div className="relative">
        <div className="grid w-[min(92vw,540px)] grid-cols-9 overflow-hidden rounded-xl border-2 border-purple-400/70 bg-[#0b0d1f]/70 backdrop-blur">
          {game.grid.map((row, r) =>
            row.map((v, c) => {
              const isSel = sel?.[0] === r && sel?.[1] === c;
              const given = game.puzzle[r][c] !== 0;
              const related = sel ? sameUnit(r, c, sel[0], sel[1]) : false;
              const sameVal = selVal !== 0 && v === selVal;
              const cls = [
                "flex aspect-square items-center justify-center border border-white/10 text-xl transition-colors sm:text-3xl",
                c % 3 === 2 && c !== 8 ? "border-r-2 border-r-purple-400/70" : "",
                r % 3 === 2 && r !== 8 ? "border-b-2 border-b-purple-400/70" : "",
                isSel ? "bg-purple-600/60" : sameVal ? "bg-cyan-500/25" : related ? "bg-white/10" : "bg-white/[0.03]",
                given ? "font-bold text-white" : bad[r][c] ? "font-semibold text-rose-400" : "text-cyan-300",
              ].join(" ");
              return (
                <button key={`${r}-${c}`} onClick={() => setSel([r, c])} className={cls}>
                  {v || ""}
                </button>
              );
            })
          )}
        </div>

        {won && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-xl bg-black/75">
            <p className="text-3xl font-semibold">🎉 Solved!</p>
            <p className="text-white/70">
              {level} in {fmt(seconds)} with {hints} hint{hints === 1 ? "" : "s"}
            </p>
            <button onClick={() => newGame(level)} className="rounded-lg bg-purple-600 px-5 py-2 hover:bg-purple-500">
              New puzzle
            </button>
          </div>
        )}
      </div>

      {/* number pad */}
      <div className="grid w-[min(92vw,540px)] grid-cols-5 gap-2 sm:grid-cols-10">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
          <button
            key={n}
            onClick={() => put(n)}
            className="h-12 rounded-lg bg-white/10 text-xl hover:bg-white/20 active:bg-white/30"
          >
            {n}
          </button>
        ))}
        <button onClick={() => put(0)} className="h-12 rounded-lg bg-white/10 text-xl hover:bg-white/20 active:bg-white/30">
          ⌫
        </button>
      </div>

      <div className="flex gap-3">
        <button onClick={hint} className="rounded-lg bg-white/10 px-4 py-2 hover:bg-white/20">
          💡 Hint
        </button>
        <button onClick={() => newGame(level)} className="rounded-lg bg-white/10 px-4 py-2 hover:bg-white/20">
          New puzzle
        </button>
      </div>
    </div>
  );
}   