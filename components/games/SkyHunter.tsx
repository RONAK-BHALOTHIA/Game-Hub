"use client";
import { useEffect, useRef, useState } from "react";

const W = 900;
const H = 540;
const GROUND = H - 70;
const ROUNDS = 10;
const SHELLS = 3;

type Kind = 0 | 1 | 2;
type BirdState = "fly" | "stun" | "fall" | "escape";
type Bird = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  kind: Kind;
  state: BirdState;
  t: number;
  turn: number;
  speed: number;
  flap: number;
};
type Pop = { x: number; y: number; text: string; t: number; color: string };
type GameState = {
  birds: Bird[];
  pops: Pop[];
  round: number;
  shells: number;
  banner: number;
  mx: number;
  my: number;
  score: number;
  hits: number;
  roundHits: number;
  flash: number;
  t: number;
};

const KINDS = [
  { color: "#b45309", belly: "#fcd34d", wing: "#fbbf24", r: 30, pts: 100 },
  { color: "#2563eb", belly: "#bfdbfe", wing: "#93c5fd", r: 24, pts: 200 },
  { color: "#ca8a04", belly: "#fef9c3", wing: "#fef08a", r: 26, pts: 500 },
];

const newGame = (): GameState => ({
  birds: [],
  pops: [],
  round: 1,
  shells: SHELLS,
  banner: 1.6,
  mx: W / 2,
  my: H / 2,
  score: 0,
  hits: 0,
  roundHits: 0,
  flash: 0,
  t: 0,
});

function spawnRound(g: GameState) {
  g.shells = SHELLS;
  g.roundHits = 0;
  for (let i = 0; i < 2; i++) {
    const r = Math.random();
    const kind: Kind = r < 0.1 ? 2 : r < 0.35 ? 1 : 0;
    const speed = (140 + g.round * 16) * (kind === 1 ? 1.35 : 1);
    const dir = Math.random() < 0.5 ? -1 : 1;
    g.birds.push({
      x: 120 + Math.random() * (W - 240),
      y: GROUND - 20,
      vx: dir * speed * (0.6 + Math.random() * 0.4),
      vy: -speed * 0.6,
      kind,
      state: "fly",
      t: kind === 2 ? 4.5 : 6.5,
      turn: 0.5 + Math.random(),
      speed,
      flap: Math.random() * 6,
    });
  }
}

function drawBird(ctx: CanvasRenderingContext2D, b: Bird, time: number) {
  const k = KINDS[b.kind];
  const dir = b.vx >= 0 ? 1 : -1;
  const dead = b.state === "stun" || b.state === "fall";

  ctx.save();
  ctx.translate(b.x, b.y);
  if (b.state === "fall") ctx.rotate(1.2 * dir);
  ctx.scale(dir, 1);
  if (b.kind === 2) {
    ctx.shadowColor = "#facc15";
    ctx.shadowBlur = 16;
  }

  // tail
  ctx.fillStyle = k.color;
  ctx.beginPath();
  ctx.moveTo(-22, -3);
  ctx.lineTo(-42, -10);
  ctx.lineTo(-40, 4);
  ctx.closePath();
  ctx.fill();

  // body and belly
  ctx.beginPath();
  ctx.ellipse(0, 0, 26, 15, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = k.belly;
  ctx.beginPath();
  ctx.ellipse(2, 6, 18, 8, 0, 0, Math.PI * 2);
  ctx.fill();

  // head and beak
  ctx.fillStyle = k.color;
  ctx.beginPath();
  ctx.arc(22, -8, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#f97316";
  ctx.beginPath();
  ctx.moveTo(30, -10);
  ctx.lineTo(43, -6);
  ctx.lineTo(30, -3);
  ctx.closePath();
  ctx.fill();

  // eye
  if (dead) {
    ctx.strokeStyle = "#0f172a";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(22, -14); ctx.lineTo(28, -8);
    ctx.moveTo(28, -14); ctx.lineTo(22, -8);
    ctx.stroke();
  } else {
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(25, -10, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#0f172a";
    ctx.beginPath();
    ctx.arc(26, -10, 1.8, 0, Math.PI * 2);
    ctx.fill();
  }

  // wing (flaps while flying)
  const flapAngle = dead ? 0.3 : Math.sin(time * 18 + b.flap) * 0.9;
  ctx.save();
  ctx.translate(-2, -6);
  ctx.rotate(-0.4 - flapAngle);
  ctx.fillStyle = k.wing;
  ctx.beginPath();
  ctx.ellipse(-4, -12, 9, 20, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.restore();
}

function drawBush(ctx: CanvasRenderingContext2D, x: number, s: number) {
  ctx.fillStyle = "#166534";
  [[0, 0, 34], [-30, 8, 26], [30, 8, 28], [14, -14, 24]].forEach(([dx, dy, r]) => {
    ctx.beginPath();
    ctx.arc(x + dx * s, GROUND + 6 + dy * s, r * s, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.fillStyle = "#15803d";
  ctx.beginPath();
  ctx.arc(x - 8 * s, GROUND - 6 * s, 14 * s, 0, Math.PI * 2);
  ctx.fill();
}

function drawScene(ctx: CanvasRenderingContext2D, g: GameState) {
  // sunset sky
  const sky = ctx.createLinearGradient(0, 0, 0, GROUND);
  sky.addColorStop(0, "#1e1b4b");
  sky.addColorStop(0.55, "#9d174d");
  sky.addColorStop(1, "#fb923c");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = "#fde68a";
  ctx.beginPath();
  ctx.arc(650, GROUND - 110, 52, 0, Math.PI * 2);
  ctx.fill();

  // hills
  [
    { color: "rgba(88,28,135,0.6)", base: GROUND - 60, amp: 40, freq: 150 },
    { color: "rgba(30,27,75,0.85)", base: GROUND - 20, amp: 26, freq: 100 },
  ].forEach((l) => {
    ctx.fillStyle = l.color;
    ctx.beginPath();
    ctx.moveTo(0, GROUND);
    for (let x = 0; x <= W; x += 10) ctx.lineTo(x, l.base - l.amp * Math.sin(x / l.freq + l.amp));
    ctx.lineTo(W, GROUND);
    ctx.closePath();
    ctx.fill();
  });

  // ground
  ctx.fillStyle = "#14532d";
  ctx.fillRect(0, GROUND, W, H - GROUND);
  ctx.fillStyle = "#4d7c0f";
  ctx.fillRect(0, GROUND, W, 6);

  // birds (behind the bushes)
  g.birds.forEach((b) => drawBird(ctx, b, g.t));

  // bushes
  [80, 230, 400, 560, 730, 850].forEach((x, i) => drawBush(ctx, x, 0.9 + (i % 3) * 0.2));

  // pop-ups
  ctx.textAlign = "center";
  ctx.font = "bold 28px sans-serif";
  g.pops.forEach((p) => {
    ctx.globalAlpha = Math.max(0, p.t * 2);
    ctx.fillStyle = p.color;
    ctx.fillText(p.text, p.x, p.y);
  });
  ctx.globalAlpha = 1;

  // muzzle flash
  if (g.flash > 0) {
    ctx.fillStyle = `rgba(255,255,255,${g.flash * 4})`;
    ctx.fillRect(0, 0, W, H);
  }

  // round banner
  if (g.banner > 0) {
    ctx.fillStyle = "rgba(0,0,0,0.45)";
    ctx.fillRect(0, H / 2 - 70, W, 120);
    ctx.fillStyle = "#fff";
    ctx.font = "bold 52px sans-serif";
    ctx.fillText(`Round ${g.round}`, W / 2, H / 2 - 10);
    ctx.font = "22px sans-serif";
    ctx.fillStyle = "#fde68a";
    ctx.fillText("Get ready!", W / 2, H / 2 + 28);
  }

  // shells
  for (let i = 0; i < SHELLS; i++) {
    ctx.fillStyle = i < g.shells ? "#facc15" : "rgba(255,255,255,0.15)";
    ctx.beginPath();
    ctx.roundRect(24 + i * 22, H - 50, 12, 30, 3);
    ctx.fill();
  }
  ctx.textAlign = "right";
  ctx.font = "bold 20px sans-serif";
  ctx.fillStyle = "#fff";
  ctx.fillText(`Hits ${g.hits}/${ROUNDS * 2}`, W - 24, H - 28);

  // crosshair
  ctx.strokeStyle = "#f43f5e";
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(g.mx, g.my, 18, 0, Math.PI * 2);
  ctx.moveTo(g.mx - 30, g.my); ctx.lineTo(g.mx - 8, g.my);
  ctx.moveTo(g.mx + 8, g.my); ctx.lineTo(g.mx + 30, g.my);
  ctx.moveTo(g.mx, g.my - 30); ctx.lineTo(g.mx, g.my - 8);
  ctx.moveTo(g.mx, g.my + 8); ctx.lineTo(g.mx, g.my + 30);
  ctx.stroke();
  ctx.fillStyle = "#f43f5e";
  ctx.beginPath();
  ctx.arc(g.mx, g.my, 2, 0, Math.PI * 2);
  ctx.fill();
}

export default function SkyHunter() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const game = useRef<GameState>(newGame());
  const runningRef = useRef(false);
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const [round, setRound] = useState(1);
  const [hits, setHits] = useState(0);
  const [running, setRunning] = useState(false);
  const [finished, setFinished] = useState(false);

  const point = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    game.current.mx = ((e.clientX - rect.left) / rect.width) * W;
    game.current.my = ((e.clientY - rect.top) / rect.height) * H;
  };

  const fire = () => {
    const g = game.current;
    if (!runningRef.current || g.banner > 0 || g.shells <= 0) return;
    g.shells -= 1;
    g.flash = 0.06;

    for (let i = g.birds.length - 1; i >= 0; i--) {
      const b = g.birds[i];
      if (b.state !== "fly") continue;
      if (Math.hypot(g.mx - b.x, g.my - b.y) > KINDS[b.kind].r + 8) continue;
      const pts = KINDS[b.kind].pts;
      b.state = "stun";
      b.t = 0.3;
      b.vx = b.vx >= 0 ? 1 : -1; // keep facing direction
      b.vy = 0;
      g.score += pts;
      g.hits += 1;
      g.roundHits += 1;
      g.pops.push({ x: b.x, y: b.y - 30, text: `+${pts}`, t: 0.9, color: b.kind === 2 ? "#facc15" : "#67e8f9" });
      setScore(g.score);
      break;
    }

    // out of shells: the remaining birds fly away
    if (g.shells === 0) {
      g.birds.forEach((b) => {
        if (b.state === "fly") b.t = Math.min(b.t, 0.5);
      });
    }
  };

  const start = () => {
    game.current = newGame();
    runningRef.current = true;
    setScore(0);
    setRound(1);
    setHits(0);
    setFinished(false);
    setRunning(true);
  };

  // idle frame
  useEffect(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (ctx) drawScene(ctx, game.current);
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
      g.t += dt;
      g.flash = Math.max(0, g.flash - dt);

      if (g.banner > 0) {
        g.banner -= dt;
        if (g.banner <= 0) spawnRound(g);
      } else if (g.birds.length === 0) {
        // round finished
        if (g.roundHits === 2) {
          g.score += 50;
          setScore(g.score);
          g.pops.push({ x: W / 2, y: H / 2, text: "PERFECT +50", t: 1.2, color: "#4ade80" });
        }
        setHits(g.hits);
        if (g.round >= ROUNDS) {
          drawScene(ctx, g);
          runningRef.current = false;
          setBest((b) => Math.max(b, g.score));
          setRunning(false);
          setFinished(true);
          return;
        }
        g.round += 1;
        setRound(g.round);
        g.banner = 1.6;
      }

      // update birds
      g.birds.forEach((b) => {
        if (b.state === "fly") {
          b.t -= dt;
          b.turn -= dt;
          if (b.turn <= 0) {
            b.vy = (Math.random() - 0.5) * b.speed * 1.3;
            b.turn = 0.5 + Math.random() * 0.9;
          }
          b.x += b.vx * dt;
          b.y += b.vy * dt;
          if (b.x < 40) { b.x = 40; b.vx = Math.abs(b.vx); }
          if (b.x > W - 40) { b.x = W - 40; b.vx = -Math.abs(b.vx); }
          if (b.y < 70) { b.y = 70; b.vy = Math.abs(b.vy); }
          if (b.y > GROUND - 120 && b.vy > 0) b.vy = -b.vy;
          if (b.t <= 0) b.state = "escape";
        } else if (b.state === "escape") {
          b.y -= 330 * dt;
          b.x += b.vx * dt;
        } else if (b.state === "stun") {
          b.t -= dt;
          if (b.t <= 0) {
            b.state = "fall";
            b.vy = 0;
          }
        } else {
          b.vy += 900 * dt;
          b.y += b.vy * dt;
        }
      });
      g.birds = g.birds.filter((b) => (b.state === "escape" ? b.y > -60 : b.y < GROUND + 10));

      // pop-ups
      g.pops.forEach((p) => {
        p.t -= dt;
        p.y -= 40 * dt;
      });
      g.pops = g.pops.filter((p) => p.t > 0);

      drawScene(ctx, g);
      raf = requestAnimationFrame(frame);
    };

    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [running]);

  const rating =
    hits >= 16 ? "🏆 Sharpshooter!" : hits >= 10 ? "🎯 Good hunter!" : "🌱 Keep practicing!";

  return (
    <div className="flex w-full flex-col items-center gap-4">
      <div className="flex gap-8 text-xl text-white/80">
        <span>Score: {score}</span>
        <span>Best: {best}</span>
        <span>
          Round: {round}/{ROUNDS}
        </span>
      </div>

      <div className="relative w-full max-w-5xl">
        <canvas
          ref={canvasRef}
          width={W}
          height={H}
          onPointerMove={point}
          onPointerDown={(e) => {
            point(e);
            fire();
          }}
          className="h-auto w-full cursor-none touch-none rounded-xl border border-white/10"
        />
        {!running && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-xl bg-black/70">
            {finished && (
              <>
                <p className="text-3xl font-semibold text-cyan-300">{rating}</p>
                <p className="text-white/70">
                  Score: {score} · Birds hit: {hits}/{ROUNDS * 2}
                </p>
              </>
            )}
            <button onClick={start} className="rounded-lg bg-purple-600 px-6 py-2 text-lg hover:bg-purple-500">
              {finished ? "Hunt again" : "Start"}
            </button>
            <p className="text-sm text-white/60">3 shots per round · 🟤 100 · 🔵 200 · 🟡 500</p>
          </div>
        )}
      </div>
    </div>
  );
}