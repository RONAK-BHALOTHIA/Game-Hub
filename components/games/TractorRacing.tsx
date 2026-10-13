"use client";
import { useEffect, useRef, useState } from "react";

const W = 900;
const H = 520;
const FINISH = 7000;
const CAM_OFFSET = 220;

type Can = { x: number; taken: boolean };
type Bale = { x: number; hit: boolean; fly: number };
type GameState = {
  px: number;
  v: number;
  fuel: number;
  t: number;
  rx: number;
  cans: Can[];
  bales: Bale[];
  shake: number;
};
type Result = { kind: "win" | "lose" | "fuel"; time: number } | null;

const terrainY = (x: number) =>
  350 + Math.sin(x / 220) * 38 + Math.sin(x / 90) * 16 + Math.sin(x / 520) * 55;

function newGame(): GameState {
  const bales: Bale[] = [];
  for (let x = 650; x < FINISH - 300; x += 380 + Math.random() * 160) {
    bales.push({ x, hit: false, fly: 1 });
  }
  const cans: Can[] = [900, 2000, 3100, 4200, 5300, 6400].map((x) => ({ x, taken: false }));
  return { px: 0, v: 0, fuel: 100, t: 0, rx: 0, cans, bales, shake: 0 };
}

function drawWheel(ctx: CanvasRenderingContext2D, cx: number, cy: number, R: number, rot: number) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(rot);
  // lugs
  ctx.fillStyle = "#0b0f19";
  for (let i = 0; i < 10; i++) {
    ctx.save();
    ctx.rotate((i * Math.PI * 2) / 10);
    ctx.fillRect(R - 3, -3.5, 6, 7);
    ctx.restore();
  }
  // tire and rim
  ctx.fillStyle = "#111827";
  ctx.beginPath();
  ctx.arc(0, 0, R, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#facc15";
  ctx.beginPath();
  ctx.arc(0, 0, R * 0.55, 0, Math.PI * 2);
  ctx.fill();
  // spokes
  ctx.strokeStyle = "#a16207";
  ctx.lineWidth = 2;
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(a) * R * 0.55, Math.sin(a) * R * 0.55);
    ctx.stroke();
  }
  ctx.fillStyle = "#475569";
  ctx.beginPath();
  ctx.arc(0, 0, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawTractor(
  ctx: CanvasRenderingContext2D,
  sx: number,
  wx: number,
  body: string,
  cab: string,
  t: number
) {
  const y = terrainY(wx);
  const ang = Math.atan2(terrainY(wx + 20) - terrainY(wx - 20), 40);

  ctx.save();
  ctx.translate(sx, y);
  ctx.rotate(ang);

  // exhaust smoke
  for (let i = 0; i < 3; i++) {
    const k = (t * 1.5 + i / 3) % 1;
    ctx.globalAlpha = (1 - k) * 0.4;
    ctx.fillStyle = "#cbd5e1";
    ctx.beginPath();
    ctx.arc(32 - k * 45, -84 - k * 35, 4 + k * 9, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // chassis
  ctx.fillStyle = "#1f2937";
  ctx.fillRect(-40, -32, 92, 8);

  // exhaust pipe
  ctx.fillStyle = "#475569";
  ctx.fillRect(30, -82, 5, 28);

  // hood and grille
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.roundRect(-6, -58, 58, 30, 6);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.25)";
  ctx.fillRect(2, -54, 40, 4);
  ctx.fillStyle = "#111827";
  ctx.fillRect(48, -54, 4, 22);
  ctx.fillStyle = "#fde047";
  ctx.beginPath();
  ctx.arc(53, -46, 3, 0, Math.PI * 2);
  ctx.fill();

  // cab
  ctx.fillStyle = cab;
  ctx.beginPath();
  ctx.roundRect(-48, -90, 46, 62, 6);
  ctx.fill();
  ctx.fillStyle = "#bae6fd";
  ctx.beginPath();
  ctx.roundRect(-42, -84, 34, 36, 4);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.4)";
  ctx.beginPath();
  ctx.moveTo(-38, -50);
  ctx.lineTo(-30, -82);
  ctx.lineTo(-24, -82);
  ctx.lineTo(-32, -50);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = cab;
  ctx.beginPath();
  ctx.roundRect(-52, -94, 54, 8, 3);
  ctx.fill();

  // wheels (rear is big, front is small)
  drawWheel(ctx, -28, -27, 27, wx / 27);
  drawWheel(ctx, 38, -16, 16, wx / 16);

  ctx.restore();
}

function drawScene(
  ctx: CanvasRenderingContext2D,
  g: GameState,
  rivalSx: number | null
) {
  const cam = g.px - CAM_OFFSET;

  ctx.save();
  if (g.shake > 0) ctx.translate((Math.random() - 0.5) * 8, (Math.random() - 0.5) * 8);

  // sky
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, "#1e1b4b");
  sky.addColorStop(0.55, "#9d174d");
  sky.addColorStop(1, "#fb923c");
  ctx.fillStyle = sky;
  ctx.fillRect(-10, -10, W + 20, H + 20);

  // sun
  ctx.fillStyle = "#fde68a";
  ctx.beginPath();
  ctx.arc(700, 190, 46, 0, Math.PI * 2);
  ctx.fill();

  // parallax hills
  [
    { color: "rgba(88,28,135,0.55)", base: 300, amp: 50, freq: 160, speed: 0.15 },
    { color: "rgba(30,27,75,0.75)", base: 340, amp: 35, freq: 110, speed: 0.35 },
  ].forEach((l) => {
    ctx.fillStyle = l.color;
    ctx.beginPath();
    ctx.moveTo(0, H);
    for (let sx = 0; sx <= W; sx += 10) {
      ctx.lineTo(sx, l.base - l.amp * Math.sin((sx + cam * l.speed) / l.freq));
    }
    ctx.lineTo(W, H);
    ctx.closePath();
    ctx.fill();
  });

  // ground
  const ground = ctx.createLinearGradient(0, 240, 0, H);
  ground.addColorStop(0, "#4d7c0f");
  ground.addColorStop(1, "#14532d");
  ctx.fillStyle = ground;
  ctx.beginPath();
  ctx.moveTo(0, H);
  for (let sx = 0; sx <= W; sx += 6) ctx.lineTo(sx, terrainY(cam + sx));
  ctx.lineTo(W, H);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = "#a3e635";
  ctx.lineWidth = 4;
  ctx.beginPath();
  for (let sx = 0; sx <= W; sx += 6) {
    const y = terrainY(cam + sx);
    if (sx === 0) ctx.moveTo(sx, y);
    else ctx.lineTo(sx, y);
  }
  ctx.stroke();

  // fence
  const startFence = Math.floor(cam / 140) * 140;
  for (let wx = startFence; wx < cam + W + 140; wx += 140) {
    const sx = wx - cam;
    const y = terrainY(wx);
    ctx.strokeStyle = "#a16207";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(sx, y - 26);
    ctx.lineTo(sx + 140, terrainY(wx + 140) - 26);
    ctx.stroke();
    ctx.fillStyle = "#78350f";
    ctx.fillRect(sx - 2, y - 34, 5, 34);
  }

  // finish flag
  const fx = FINISH - cam;
  if (fx > -50 && fx < W + 50) {
    const fy = terrainY(FINISH);
    ctx.fillStyle = "#e2e8f0";
    ctx.fillRect(fx - 2, fy - 150, 5, 150);
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 6; c++) {
        ctx.fillStyle = (r + c) % 2 === 0 ? "#fff" : "#0f172a";
        ctx.fillRect(fx + 3 + c * 12, fy - 150 + r * 12, 12, 12);
      }
    }
    ctx.fillStyle = "rgba(255,255,255,0.8)";
    ctx.fillRect(fx - 3, fy - 3, 6, 6);
  }

  // fuel cans
  ctx.font = "30px sans-serif";
  ctx.textAlign = "center";
  g.cans.forEach((c) => {
    if (c.taken) return;
    const sx = c.x - cam;
    if (sx < -40 || sx > W + 40) return;
    ctx.fillText("⛽", sx, terrainY(c.x) - 40 + Math.sin(g.t * 4 + c.x) * 4);
  });

  // hay bales
  g.bales.forEach((b) => {
    const sx = b.x - cam;
    if (sx < -80 || sx > W + 80) return;
    const k = b.hit ? 1 - Math.max(0, b.fly) : 0;
    const y = terrainY(b.x) - 34 - k * 70;
    ctx.save();
    ctx.globalAlpha = b.hit ? Math.max(0, b.fly) : 1;
    ctx.translate(sx + k * 90 + 22, y + 17);
    ctx.rotate(k * 3);
    ctx.fillStyle = "#facc15";
    ctx.beginPath();
    ctx.roundRect(-22, -17, 44, 34, 8);
    ctx.fill();
    ctx.strokeStyle = "#a16207";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-8, -17); ctx.lineTo(-8, 17);
    ctx.moveTo(8, -17); ctx.lineTo(8, 17);
    ctx.stroke();
    ctx.restore();
  });

  // tractors (rival first so the player is on top)
  if (rivalSx !== null) drawTractor(ctx, rivalSx, g.rx, "#dc2626", "#7f1d1d", g.t + 0.3);
  drawTractor(ctx, CAM_OFFSET, g.px, "#16a34a", "#14532d", g.t);

  ctx.restore();

  // HUD: progress bar
  const bx = W / 2 - 200;
  ctx.fillStyle = "rgba(0,0,0,0.45)";
  ctx.beginPath();
  ctx.roundRect(bx, 18, 400, 12, 6);
  ctx.fill();
  ctx.fillStyle = "#e2e8f0";
  ctx.fillRect(bx + 398, 14, 4, 20);
  const dot = (x: number, color: string) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(bx + Math.min(1, x / FINISH) * 400, 24, 8, 0, Math.PI * 2);
    ctx.fill();
  };
  dot(g.rx, "#f43f5e");
  dot(g.px, "#22d3ee");

  // HUD: fuel bar
  ctx.textAlign = "left";
  ctx.font = "bold 16px sans-serif";
  ctx.fillStyle = "#fff";
  ctx.fillText("FUEL", 20, H - 44);
  ctx.fillStyle = "rgba(0,0,0,0.45)";
  ctx.fillRect(20, H - 34, 180, 14);
  ctx.fillStyle = g.fuel < 25 ? "#f43f5e" : "#facc15";
  ctx.fillRect(20, H - 34, 180 * (g.fuel / 100), 14);

  // HUD: speed
  ctx.textAlign = "right";
  ctx.font = "bold 22px sans-serif";
  ctx.fillStyle = "#fff";
  ctx.fillText(`${Math.round(g.v / 5)} km/h`, W - 20, H - 24);
}

export default function TractorRacing() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const game = useRef<GameState>(newGame());
  const keys = useRef<Set<string>>(new Set());
  const touchGas = useRef(false);
  const touchBrake = useRef(false);
  const [time, setTime] = useState(0);
  const [best, setBest] = useState<number | null>(null);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<Result>(null);

  const start = () => {
    game.current = newGame();
    setTime(0);
    setResult(null);
    setRunning(true);
  };

  // keyboard + idle frame
  useEffect(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (ctx) drawScene(ctx, game.current, CAM_OFFSET - 40);

    const down = (e: KeyboardEvent) => {
      if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", " "].includes(e.key)) e.preventDefault();
      keys.current.add(e.key.toLowerCase());
    };
    const up = (e: KeyboardEvent) => keys.current.delete(e.key.toLowerCase());
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  // game loop
  useEffect(() => {
    if (!running) return;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let last = performance.now();
    let lastTenth = 0;

    const frame = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      const g = game.current;
      const k = keys.current;
      g.t += dt;
      g.shake = Math.max(0, g.shake - dt);

      const gas =
        touchGas.current ||
        ["arrowright", "d", "arrowup", "w", " "].some((x) => k.has(x));
      const brake =
        touchBrake.current || ["arrowleft", "a", "arrowdown", "s"].some((x) => k.has(x));

      // physics: hills slow you down uphill and speed you up downhill
      const slope = (terrainY(g.px + 6) - terrainY(g.px - 6)) / 12;
      let acc = slope * 320 - g.v * 0.5;
      if (gas && g.fuel > 0) {
        acc += 200;
        g.fuel = Math.max(0, g.fuel - 10 * dt);
      }
      if (brake) acc -= 320;
      g.v = Math.max(0, Math.min(560, g.v + acc * dt));
      g.px += g.v * dt;

      // rival tractor (steady speed with small changes)
      g.rx += (255 + 35 * Math.sin(g.t * 0.6)) * dt;

      // fuel cans
      g.cans.forEach((c) => {
        if (!c.taken && Math.abs(c.x - g.px) < 40) {
          c.taken = true;
          g.fuel = Math.min(100, g.fuel + 25);
        }
      });

      // hay bales
      g.bales.forEach((b) => {
        if (b.hit) {
          b.fly -= dt * 1.6;
        } else if (Math.abs(b.x - g.px) < 38) {
          b.hit = true;
          g.v *= 0.35;
          g.shake = 0.3;
        }
      });

      const rivalSx = g.rx - (g.px - CAM_OFFSET);
      drawScene(ctx, g, rivalSx > -150 && rivalSx < W + 150 ? rivalSx : null);

      const tenth = Math.floor(g.t * 10);
      if (tenth !== lastTenth) {
        lastTenth = tenth;
        setTime(tenth / 10);
      }

      const finish = (r: Result) => {
        setResult(r);
        setRunning(false);
      };

      if (g.px >= FINISH) {
        const t = Math.round(g.t * 10) / 10;
        setBest((b) => (b === null ? t : Math.min(b, t)));
        finish({ kind: "win", time: t });
        return;
      }
      if (g.rx >= FINISH) {
        finish({ kind: "lose", time: g.t });
        return;
      }
      if (g.fuel <= 0 && g.v < 5) {
        finish({ kind: "fuel", time: g.t });
        return;
      }
      raf = requestAnimationFrame(frame);
    };

    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [running]);

  const hold = (ref: { current: boolean }) => ({
    onPointerDown: () => (ref.current = true),
    onPointerUp: () => (ref.current = false),
    onPointerLeave: () => (ref.current = false),
    onPointerCancel: () => (ref.current = false),
  });

  return (
    <div className="flex w-full flex-col items-center gap-4">
      <div className="flex gap-8 text-xl text-white/80">
        <span>⏱ {time.toFixed(1)}s</span>
        <span>Best: {best === null ? "-" : `${best.toFixed(1)}s`}</span>
      </div>

      <div className="relative w-full max-w-5xl">
        <canvas
          ref={canvasRef}
          width={W}
          height={H}
          className="h-auto w-full rounded-xl border border-white/10"
        />
        {!running && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-xl bg-black/65">
            {result?.kind === "win" && (
              <p className="text-3xl font-semibold text-green-400">🏆 You won in {result.time.toFixed(1)}s!</p>
            )}
            {result?.kind === "lose" && (
              <p className="text-3xl font-semibold text-rose-400">The red tractor won!</p>
            )}
            {result?.kind === "fuel" && (
              <p className="text-3xl font-semibold text-amber-300">⛽ Out of fuel!</p>
            )}
            <button onClick={start} className="rounded-lg bg-purple-600 px-6 py-2 text-lg hover:bg-purple-500">
              {result ? "Race again" : "Start"}
            </button>
            <p className="text-sm text-white/60">Hold → / D for gas · ← / A to brake · grab ⛽ · avoid hay bales</p>
          </div>
        )}
      </div>

      {/* on-screen controls for phones */}
      <div className="flex gap-4 md:hidden">
        <button {...hold(touchBrake)} className="h-16 w-32 touch-none select-none rounded-xl bg-white/10 text-lg active:bg-white/20">
          BRAKE
        </button>
        <button {...hold(touchGas)} className="h-16 w-32 touch-none select-none rounded-xl bg-green-600/70 text-lg active:bg-green-500">
          GAS
        </button>
      </div>
    </div>
  );
}