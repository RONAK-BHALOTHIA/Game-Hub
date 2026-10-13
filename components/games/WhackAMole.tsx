"use client";
import { useEffect, useRef, useState } from "react";

const HOLES = 9;
const DURATION = 30;

type Kind = "mole" | "gold" | "bomb";
type Hole = { id: number; kind: Kind; hit: boolean } | null;

const EMOJI: Record<Kind, string> = { mole: "🐹", gold: "🌟", bomb: "💣" };
const POINTS: Record<Kind, number> = { mole: 1, gold: 3, bomb: -2 };

export default function WhackAMole() {
  const [holes, setHoles] = useState<Hole[]>(Array(HOLES).fill(null));
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const [timeLeft, setTimeLeft] = useState(DURATION);
  const [running, setRunning] = useState(false);
  const [finished, setFinished] = useState(false);

  const scoreRef = useRef(0);
  const timeRef = useRef(DURATION);
  const idRef = useRef(0);

  const hide = (idx: number, id: number) =>
    setHoles((h) => h.map((x, i) => (i === idx && x?.id === id ? null : x)));

  const start = () => {
    scoreRef.current = 0;
    timeRef.current = DURATION;
    setScore(0);
    setTimeLeft(DURATION);
    setHoles(Array(HOLES).fill(null));
    setFinished(false);
    setRunning(true);
  };

  // countdown
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      timeRef.current -= 1;
      setTimeLeft(timeRef.current);
      if (timeRef.current <= 0) {
        setRunning(false);
        setFinished(true);
        setHoles(Array(HOLES).fill(null));
        setBest((b) => Math.max(b, scoreRef.current));
      }
    }, 1000);
    return () => clearInterval(id);
  }, [running]);

  // spawn moles
  useEffect(() => {
    if (!running) return;
    let timeout: ReturnType<typeof setTimeout>;

    const spawn = () => {
      const progress = 1 - timeRef.current / DURATION; // 0 → 1
      const stay = 950 - progress * 450;
      const idx = Math.floor(Math.random() * HOLES);
      const r = Math.random();
      const kind: Kind = r < 0.15 ? "bomb" : r < 0.27 ? "gold" : "mole";
      const id = ++idRef.current;

      setHoles((h) => (h[idx] ? h : h.map((x, i) => (i === idx ? { id, kind, hit: false } : x))));
      setTimeout(() => hide(idx, id), stay);

      timeout = setTimeout(spawn, 750 - progress * 350 + Math.random() * 200);
    };

    spawn();
    return () => clearTimeout(timeout);
  }, [running]);

  const whack = (i: number) => {
    const h = holes[i];
    if (!running || !h || h.hit) return;
    scoreRef.current = Math.max(0, scoreRef.current + POINTS[h.kind]);
    setScore(scoreRef.current);
    setHoles((hs) => hs.map((x, j) => (j === i && x ? { ...x, hit: true } : x)));
    setTimeout(() => hide(i, h.id), 250);
  };

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="flex gap-8 text-xl text-white/80">
        <span>Score: {score}</span>
        <span>Best: {best}</span>
        <span className={timeLeft <= 5 && running ? "text-rose-400" : ""}>⏱ {timeLeft}s</span>
      </div>

      <div className="relative">
        <div className="grid grid-cols-3 gap-5 rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur">
          {holes.map((h, i) => (
            <button
              key={i}
              onPointerDown={() => whack(i)}
              className="relative h-[min(26vw,150px)] w-[min(26vw,150px)] cursor-pointer touch-manipulation select-none overflow-hidden rounded-full bg-[#0b0d1f] shadow-[inset_0_-12px_20px_rgba(0,0,0,0.8)]"
            >
              <span
                className={`absolute inset-x-0 bottom-0 flex h-full items-center justify-center text-6xl transition-transform duration-150 sm:text-7xl ${
                  h ? "translate-y-2" : "translate-y-full"
                } ${h?.kind === "gold" ? "drop-shadow-[0_0_14px_#facc15]" : ""}`}
              >
                {h ? (h.hit ? "💥" : EMOJI[h.kind]) : ""}
              </span>
              {/* front rim of the hole */}
              <span className="pointer-events-none absolute inset-x-0 bottom-0 h-1/4 rounded-b-full bg-gradient-to-t from-[#1e1b4b] to-transparent" />
            </button>
          ))}
        </div>

        {!running && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-3xl bg-black/70">
            {finished && <p className="text-3xl font-semibold text-cyan-300">Time&apos;s up! Score: {score}</p>}
            <button onClick={start} className="rounded-lg bg-purple-600 px-6 py-2 text-lg hover:bg-purple-500">
              {finished ? "Play again" : "Start"}
            </button>
            <p className="text-sm text-white/60">🐹 +1 &nbsp; 🌟 +3 &nbsp; 💣 −2</p>
          </div>
        )}
      </div>
    </div>
  );
}