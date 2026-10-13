"use client";
import { useEffect, useState } from "react";

const EMOJIS = ["🚗", "🏍️", "🧩", "🎲", "🚀", "👾", "🏆", "🎯"];
type Card = { emoji: string; matched: boolean };

const shuffle = (): Card[] =>
  [...EMOJIS, ...EMOJIS]
    .sort(() => Math.random() - 0.5)
    .map((emoji) => ({ emoji, matched: false }));

export default function MemoryMatch() {
  const [cards, setCards] = useState<Card[]>(shuffle);
  const [flipped, setFlipped] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);

  useEffect(() => {
    if (flipped.length !== 2) return;
    setMoves((m) => m + 1);
    const [a, b] = flipped;
    if (cards[a].emoji === cards[b].emoji) {
      setCards((cs) => cs.map((c, i) => (i === a || i === b ? { ...c, matched: true } : c)));
      setFlipped([]);
    } else {
      const t = setTimeout(() => setFlipped([]), 800);
      return () => clearTimeout(t);
    }
  }, [flipped, cards]);

  const flip = (i: number) => {
    if (flipped.length === 2 || flipped.includes(i) || cards[i].matched) return;
    setFlipped((f) => [...f, i]);
  };

  const restart = () => {
    setCards(shuffle());
    setFlipped([]);
    setMoves(0);
  };

  const won = cards.every((c) => c.matched);

  return (
    <div className="flex flex-col items-center gap-4">
      <p className="text-white/70">Moves: {moves}</p>
      <div className="grid grid-cols-4 gap-3">
        {cards.map((c, i) => {
          const show = c.matched || flipped.includes(i);
          return (
            <button
              key={i}
              onClick={() => flip(i)}
              className={`aspect-square w-[18vw] max-w-28 rounded-2xl text-3xl sm:text-6xl transition ${
                show ? "bg-purple-600" : "bg-white/10 hover:bg-white/20"
              }`}
            >
              {show ? c.emoji : ""}
            </button>
          );
        })}
      </div>
      {won && <p className="text-xl font-semibold text-green-400">🎉 You won in {moves} moves!</p>}
      <button onClick={restart} className="rounded-lg bg-white/10 px-4 py-2 hover:bg-white/20">
        Restart
      </button>
    </div>
  );
}