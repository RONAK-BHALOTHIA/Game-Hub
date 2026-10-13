"use client";
import { useEffect, useState } from "react";

type Cell = "X" | "O" | null;

const LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
];

function getWinner(b: Cell[]): Cell {
  for (const [a, c, d] of LINES) {
    if (b[a] && b[a] === b[c] && b[a] === b[d]) return b[a];
  }
  return null;
}

// finds a cell that completes (or blocks) a line of two
function findMove(b: Cell[], player: "X" | "O"): number {
  for (const line of LINES) {
    const vals = line.map((i) => b[i]);
    if (vals.filter((v) => v === player).length === 2 && vals.includes(null)) {
      return line[vals.indexOf(null)];
    }
  }
  return -1;
}

function computerMove(b: Cell[]): number {
  let m = findMove(b, "O"); // win
  if (m !== -1) return m;
  m = findMove(b, "X"); // block
  if (m !== -1) return m;
  if (b[4] === null) return 4; // center
  const empty = b.map((v, i) => (v === null ? i : -1)).filter((i) => i !== -1);
  return empty[Math.floor(Math.random() * empty.length)];
}

export default function TicTacToe() {
  const [board, setBoard] = useState<Cell[]>(Array(9).fill(null));
  const [playerTurn, setPlayerTurn] = useState(true);

  const winner = getWinner(board);
  const draw = !winner && board.every(Boolean);

  useEffect(() => {
    if (playerTurn || winner || draw) return;
    const t = setTimeout(() => {
      setBoard((b) => {
        const next = [...b];
        next[computerMove(b)] = "O";
        return next;
      });
      setPlayerTurn(true);
    }, 500);
    return () => clearTimeout(t);
  }, [playerTurn, winner, draw]);

  const play = (i: number) => {
    if (!playerTurn || board[i] || winner) return;
    const next = [...board];
    next[i] = "X";
    setBoard(next);
    setPlayerTurn(false);
  };

  const restart = () => {
    setBoard(Array(9).fill(null));
    setPlayerTurn(true);
  };

  const status = winner
    ? winner === "X" ? "🎉 You win!" : "🤖 Computer wins!"
    : draw ? "It's a draw!" : playerTurn ? "Your turn (X)" : "Computer is thinking...";

  return (
    <div className="flex flex-col items-center gap-4">
      <p className="text-lg text-white/80">{status}</p>
      <div className="grid grid-cols-3 gap-3">
        {board.map((cell, i) => (
          <button
            key={i}
            onClick={() => play(i)}
            className={`h-32 w-32 rounded-2xl bg-white/10 text75xl font-bold transition hover:bg-white/20 ${
              cell === "X" ? "text-cyan-400" : "text-fuchsia-400"
            }`}
          >
            {cell}
          </button>
        ))}
      </div>  
      <button onClick={restart} className="rounded-lg bg-white/10 px-4 py-2 hover:bg-white/20">
        Restart
      </button>
    </div>
  );
}