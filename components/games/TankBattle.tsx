"use client";
import { useEffect, useRef, useState } from "react";

const W = 800;
const H = 600;
const TR = 20; // tank radius
const MAX_HP = 5;

type Wall = { x: number; y: number; w: number; h: number; hp: number; steel: boolean };
type Tank = { x: number; y: number; body: number; turret: number };
type Enemy = Tank & {
  hp: number;
  maxHp: number;
  kind: 0 | 1;
  fire: number;
  wander: number;
  wdir: 1 | -1;
  speed: number;
};
type Bullet = { x: number; y: number; vx: number; vy: number; mine: boolean; life: number };
type Particle = { x: number; y: number; vx: number; vy: number; life: number; color: string };
type GameState = {
  p: Tank;
  hp: number;
  invuln: number;
  fire: number;
  mx: number;
  my: number;
  enemies: Enemy[];
  bullets: Bullet[];
  walls: Wall[];
  particles: Particle[];
  wave: number;
  toSpawn: number;
  spawnT: number;
  banner: number;
  score: number;
  shake: number;
  t: number;
};

const normAngle = (a: number) => {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
};
const turnToward = (cur: number, target: number, step: number) => {
  const d = normAngle(target - cur);
  return Math.abs(d) <= step ? target : cur + Math.sign(d) * step;
};

function makeWalls(): Wall[] {
  const brick = (x: number, y: number, w: number, h: number): Wall => ({ x, y, w, h, hp: 3, steel: false });
  return [
    { x: 360, y: 250, w: 80, h: 100, hp: 999, steel: true },
    brick(140, 140, 100, 30),
    brick(560, 140, 100, 30),
    brick(140, 430, 100, 30),
    brick(560, 430, 100, 30),
    brick(200, 260, 30, 90),
    brick(570, 260, 30, 90),
  ];
}

function collideWalls(o: { x: number; y: number }, r: number, walls: Wall[]) {
  for (const w of walls) {
    const cx = Math.max(w.x, Math.min(o.x, w.x + w.w));
    const cy = Math.max(w.y, Math.min(o.y, w.y + w.h));
    const dx = o.x - cx;
    const dy = o.y - cy;
    const d = Math.hypot(dx, dy);
    if (d >= r) continue;
    if (d === 0) {
      const l = o.x - w.x;
      const rr = w.x + w.w - o.x;
      const t = o.y - w.y;
      const b = w.y + w.h - o.y;
      const m = Math.min(l, rr, t, b);
      if (m === l) o.x = w.x - r;
      else if (m === rr) o.x = w.x + w.w + r;
      else if (m === t) o.y = w.y - r;
      else o.y = w.y + w.h + r;
    } else {
      o.x = cx + (dx / d) * r;
      o.y = cy + (dy / d) * r;
    }
  }
  o.x = Math.max(r, Math.min(W - r, o.x));
  o.y = Math.max(r, Math.min(H - r, o.y));
}

function explode(g: GameState, x: number, y: number, color: string, count = 14) {
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    const sp = 40 + Math.random() * 200;
    g.particles.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0.3 + Math.random() * 0.5, color });
  }
}

function newGame(): GameState {
  return {
    p: { x: W / 2, y: H - 80, body: -Math.PI / 2, turret: -Math.PI / 2 },
    hp: MAX_HP,
    invuln: 0,
    fire: 0,
    mx: W / 2,
    my: H / 2,
    enemies: [],
    bullets: [],
    walls: makeWalls(),
    particles: [],
    wave: 1,
    toSpawn: 5,
    spawnT: 0.5,
    banner: 1.5,
    score: 0,
    shake: 0,
    t: 0,
  };
}

function spawnEnemy(g: GameState) {
  let x = 40;
  let y = 40;
  for (let i = 0; i < 20; i++) {
    const edge = Math.floor(Math.random() * 3);
    if (edge === 0) { x = 40 + Math.random() * (W - 80); y = 40; }
    else if (edge === 1) { x = 40; y = 40 + Math.random() * 200; }
    else { x = W - 40; y = 40 + Math.random() * 200; }
    if (Math.hypot(x - g.p.x, y - g.p.y) > 260) break;
  }
  const heavy = g.wave >= 3 && Math.random() < 0.3;
  g.enemies.push({
    x,
    y,
    body: Math.PI / 2,
    turret: Math.PI / 2,
    hp: heavy ? 3 : 1,
    maxHp: heavy ? 3 : 1,
    kind: heavy ? 1 : 0,
    fire: 1 + Math.random() * 1.5,
    wander: 1,
    wdir: Math.random() < 0.5 ? 1 : -1,
    speed: heavy ? 70 : Math.min(140, 90 + g.wave * 5),
  });
  g.toSpawn -= 1;
}

function drawTank(ctx: CanvasRenderingContext2D, t: Tank, hull: string, top: string) {
  ctx.save();
  ctx.translate(t.x, t.y);
  ctx.rotate(t.body);
  // tracks
  ctx.fillStyle = "#1f2937";
  ctx.fillRect(-24, -21, 48, 9);
  ctx.fillRect(-24, 12, 48, 9);
  ctx.fillStyle = "#374151";
  for (let i = -20; i < 24; i += 8) {
    ctx.fillRect(i, -21, 3, 9);
    ctx.fillRect(i, 12, 3, 9);
  }
  // hull
  ctx.fillStyle = hull;
  ctx.beginPath();
  ctx.roundRect(-21, -14, 42, 28, 6);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.2)";
  ctx.fillRect(-17, -11, 34, 4);
  ctx.restore();

  // turret
  ctx.save();
  ctx.translate(t.x, t.y);
  ctx.rotate(t.turret);
  ctx.fillStyle = "#334155";
  ctx.fillRect(0, -3.5, 32, 7);
  ctx.fillStyle = "#0f172a";
  ctx.fillRect(28, -4.5, 6, 9);
  ctx.fillStyle = top;
  ctx.beginPath();
  ctx.arc(0, 0, 12, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.3)";
  ctx.beginPath();
  ctx.arc(-3, -3, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawScene(ctx: CanvasRenderingContext2D, g: GameState) {
  ctx.save();
  if (g.shake > 0) ctx.translate((Math.random() - 0.5) * 8, (Math.random() - 0.5) * 8);

  // floor and grid
  ctx.fillStyle = "#0b0d1f";
  ctx.fillRect(-10, -10, W + 20, H + 20);
  ctx.strokeStyle = "rgba(255,255,255,0.05)";
  ctx.lineWidth = 1;
  for (let x = 0; x <= W; x += 40) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, H);
    ctx.stroke();
  }
  for (let y = 0; y <= H; y += 40) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  }

  // walls
  g.walls.forEach((w) => {
    if (w.steel) {
      ctx.fillStyle = "#64748b";
      ctx.fillRect(w.x, w.y, w.w, w.h);
      ctx.strokeStyle = "#cbd5e1";
      ctx.lineWidth = 2;
      ctx.strokeRect(w.x + 2, w.y + 2, w.w - 4, w.h - 4);
      ctx.fillStyle = "#e2e8f0";
      [[8, 8], [w.w - 8, 8], [8, w.h - 8], [w.w - 8, w.h - 8]].forEach(([rx, ry]) => {
        ctx.beginPath();
        ctx.arc(w.x + rx, w.y + ry, 2.5, 0, Math.PI * 2);
        ctx.fill();
      });
    } else {
      ctx.fillStyle = w.hp === 3 ? "#c2410c" : w.hp === 2 ? "#9a3412" : "#7c2d12";
      ctx.fillRect(w.x, w.y, w.w, w.h);
      ctx.strokeStyle = "rgba(0,0,0,0.35)";
      ctx.lineWidth = 2;
      ctx.strokeRect(w.x, w.y, w.w, w.h);
      ctx.beginPath();
      if (w.w >= w.h) {
        for (let x = w.x + 25; x < w.x + w.w; x += 25) {
          ctx.moveTo(x, w.y);
          ctx.lineTo(x, w.y + w.h);
        }
        ctx.moveTo(w.x, w.y + w.h / 2);
        ctx.lineTo(w.x + w.w, w.y + w.h / 2);
      } else {
        for (let y = w.y + 25; y < w.y + w.h; y += 25) {
          ctx.moveTo(w.x, y);
          ctx.lineTo(w.x + w.w, y);
        }
        ctx.moveTo(w.x + w.w / 2, w.y);
        ctx.lineTo(w.x + w.w / 2, w.y + w.h);
      }
      ctx.stroke();
    }
  });

  // enemies
  g.enemies.forEach((e) => {
    drawTank(ctx, e, e.kind ? "#7c3aed" : "#dc2626", e.kind ? "#c4b5fd" : "#fca5a5");
    if (e.maxHp > 1) {
      for (let i = 0; i < e.maxHp; i++) {
        ctx.fillStyle = i < e.hp ? "#4ade80" : "rgba(255,255,255,0.2)";
        ctx.fillRect(e.x - 18 + i * 13, e.y - 34, 10, 4);
      }
    }
  });

  // player (blinks when hit)
  if (!(g.invuln > 0 && Math.floor(g.invuln * 12) % 2 === 0)) {
    drawTank(ctx, g.p, "#0891b2", "#67e8f9");
  }

  // bullets
  g.bullets.forEach((b) => {
    ctx.fillStyle = b.mine ? "#fde047" : "#fb7185";
    ctx.beginPath();
    ctx.arc(b.x, b.y, 4.5, 0, Math.PI * 2);
    ctx.fill();
  });

  // particles
  g.particles.forEach((p) => {
    ctx.globalAlpha = Math.max(0, p.life * 2);
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x - 2, p.y - 2, 4, 4);
  });
  ctx.globalAlpha = 1;

  ctx.restore();

  // arena border
  ctx.strokeStyle = "#7c3aed";
  ctx.lineWidth = 4;
  ctx.strokeRect(2, 2, W - 4, H - 4);

  // HUD: health
  ctx.font = "26px sans-serif";
  ctx.textAlign = "left";
  for (let i = 0; i < MAX_HP; i++) {
    ctx.fillStyle = i < g.hp ? "#f43f5e" : "rgba(255,255,255,0.18)";
    ctx.fillText("♥", 16 + i * 28, 38);
  }
  ctx.textAlign = "right";
  ctx.font = "22px sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.8)";
  ctx.fillText(`Wave ${g.wave}`, W - 18, 36);

  // banner
  if (g.banner > 0) {
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.fillRect(0, H / 2 - 60, W, 100);
    ctx.textAlign = "center";
    ctx.fillStyle = "#fff";
    ctx.font = "bold 48px sans-serif";
    ctx.fillText(`Wave ${g.wave}`, W / 2, H / 2 + 10);
  }

  // crosshair
  ctx.strokeStyle = "#f43f5e";
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(g.mx, g.my, 14, 0, Math.PI * 2);
  ctx.moveTo(g.mx - 24, g.my); ctx.lineTo(g.mx - 8, g.my);
  ctx.moveTo(g.mx + 8, g.my); ctx.lineTo(g.mx + 24, g.my);
  ctx.moveTo(g.mx, g.my - 24); ctx.lineTo(g.mx, g.my - 8);
  ctx.moveTo(g.mx, g.my + 8); ctx.lineTo(g.mx, g.my + 24);
  ctx.stroke();
}

export default function TankBattle() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const game = useRef<GameState>(newGame());
  const keys = useRef<Set<string>>(new Set());
  const firing = useRef(false);
  const tUp = useRef(false);
  const tDown = useRef(false);
  const tLeft = useRef(false);
  const tRight = useRef(false);
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const [wave, setWave] = useState(1);
  const [running, setRunning] = useState(false);
  const [gameOver, setGameOver] = useState(false);

  const point = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    game.current.mx = ((e.clientX - rect.left) / rect.width) * W;
    game.current.my = ((e.clientY - rect.top) / rect.height) * H;
  };

  const start = () => {
    game.current = newGame();
    setScore(0);
    setWave(1);
    setGameOver(false);
    setRunning(true);
  };

  // keyboard + idle frame
  useEffect(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (ctx) drawScene(ctx, game.current);

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

    const frame = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      const g = game.current;
      const k = keys.current;
      g.t += dt;
      g.invuln = Math.max(0, g.invuln - dt);
      g.shake = Math.max(0, g.shake - dt);

      // wave banner and spawning
      if (g.banner > 0) {
        g.banner -= dt;
      } else if (g.toSpawn > 0 && g.enemies.length < Math.min(5, 2 + g.wave)) {
        g.spawnT -= dt;
        if (g.spawnT <= 0) {
          spawnEnemy(g);
          g.spawnT = 1.2;
        }
      }

      // move player
      let ix = (k.has("d") || k.has("arrowright") || tRight.current ? 1 : 0) - (k.has("a") || k.has("arrowleft") || tLeft.current ? 1 : 0);
      let iy = (k.has("s") || k.has("arrowdown") || tDown.current ? 1 : 0) - (k.has("w") || k.has("arrowup") || tUp.current ? 1 : 0);
      const len = Math.hypot(ix, iy);
      if (len > 0) {
        ix /= len;
        iy /= len;
        g.p.x += ix * 190 * dt;
        g.p.y += iy * 190 * dt;
        g.p.body = turnToward(g.p.body, Math.atan2(iy, ix), 8 * dt);
        collideWalls(g.p, TR, g.walls);
      }
      g.p.turret = Math.atan2(g.my - g.p.y, g.mx - g.p.x);

      // player fire
      g.fire -= dt;
      if ((firing.current || k.has(" ")) && g.fire <= 0 && g.banner <= 0) {
        g.bullets.push({
          x: g.p.x + Math.cos(g.p.turret) * 34,
          y: g.p.y + Math.sin(g.p.turret) * 34,
          vx: Math.cos(g.p.turret) * 520,
          vy: Math.sin(g.p.turret) * 520,
          mine: true,
          life: 1.6,
        });
        g.fire = 0.35;
      }

      // enemy AI
      g.enemies.forEach((e, i) => {
        const dx = g.p.x - e.x;
        const dy = g.p.y - e.y;
        const dist = Math.hypot(dx, dy) || 1;
        const ux = dx / dist;
        const uy = dy / dist;

        e.wander -= dt;
        if (e.wander <= 0) {
          e.wdir = Math.random() < 0.5 ? 1 : -1;
          e.wander = 1 + Math.random() * 1.5;
        }
        let mvx: number;
        let mvy: number;
        if (dist > 280) {
          mvx = ux;
          mvy = uy;
        } else if (dist < 170) {
          mvx = -ux;
          mvy = -uy;
        } else {
          mvx = -uy * e.wdir;
          mvy = ux * e.wdir;
        }
        e.x += mvx * e.speed * dt;
        e.y += mvy * e.speed * dt;
        e.body = turnToward(e.body, Math.atan2(mvy, mvx), 6 * dt);

        // keep away from other tanks
        g.enemies.forEach((o, j) => {
          if (i === j) return;
          const ox = e.x - o.x;
          const oy = e.y - o.y;
          const od = Math.hypot(ox, oy);
          if (od > 0 && od < TR * 2) {
            const push = (TR * 2 - od) / 2;
            e.x += (ox / od) * push;
            e.y += (oy / od) * push;
          }
        });
        const pd = Math.hypot(e.x - g.p.x, e.y - g.p.y);
        if (pd > 0 && pd < TR * 2) {
          e.x = g.p.x + ((e.x - g.p.x) / pd) * TR * 2;
          e.y = g.p.y + ((e.y - g.p.y) / pd) * TR * 2;
        }
        collideWalls(e, TR, g.walls);

        // aim and shoot
        const want = Math.atan2(dy, dx);
        e.turret = turnToward(e.turret, want, (e.kind ? 1.8 : 2.6) * dt);
        e.fire -= dt;
        if (g.banner <= 0 && e.fire <= 0 && Math.abs(normAngle(want - e.turret)) < 0.12 && dist < 520) {
          g.bullets.push({
            x: e.x + Math.cos(e.turret) * 34,
            y: e.y + Math.sin(e.turret) * 34,
            vx: Math.cos(e.turret) * 300,
            vy: Math.sin(e.turret) * 300,
            mine: false,
            life: 2.5,
          });
          e.fire = Math.max(0.9, 1.5 - g.wave * 0.05) + Math.random() * 1.1;
        }
      });

      // bullets
      g.bullets.forEach((b) => {
        b.x += b.vx * dt;
        b.y += b.vy * dt;
        b.life -= dt;
      });
      g.bullets = g.bullets.filter((b) => {
        if (b.life <= 0 || b.x < 0 || b.x > W || b.y < 0 || b.y > H) return false;

        // walls
        const wall = g.walls.find((w) => b.x > w.x && b.x < w.x + w.w && b.y > w.y && b.y < w.y + w.h);
        if (wall) {
          explode(g, b.x, b.y, wall.steel ? "#e2e8f0" : "#fb923c", 5);
          if (!wall.steel) wall.hp -= 1;
          return false;
        }

        if (b.mine) {
          const hit = g.enemies.find((e) => Math.hypot(e.x - b.x, e.y - b.y) < TR + 4);
          if (hit) {
            hit.hp -= 1;
            explode(g, b.x, b.y, "#fde047", 5);
            if (hit.hp <= 0) {
              explode(g, hit.x, hit.y, hit.kind ? "#c4b5fd" : "#f87171", 26);
              g.score += hit.kind ? 250 : 100;
              setScore(g.score);
            }
            return false;
          }
        } else if (g.invuln <= 0 && Math.hypot(g.p.x - b.x, g.p.y - b.y) < TR + 2) {
          g.hp -= 1;
          g.invuln = 0.7;
          g.shake = 0.25;
          explode(g, g.p.x, g.p.y, "#67e8f9", 16);
          return false;
        }
        return true;
      });
      g.walls = g.walls.filter((w) => w.hp > 0);
      g.enemies = g.enemies.filter((e) => e.hp > 0);

      // wave cleared
      if (g.banner <= 0 && g.toSpawn === 0 && g.enemies.length === 0) {
        g.wave += 1;
        setWave(g.wave);
        g.toSpawn = Math.min(14, 4 + g.wave);
        g.spawnT = 0.5;
        g.banner = 1.6;
        g.walls = makeWalls();
        g.bullets = [];
        g.hp = Math.min(MAX_HP, g.hp + 1);
      }

      // particles
      g.particles.forEach((p) => {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.life -= dt;
      });
      g.particles = g.particles.filter((p) => p.life > 0);

      drawScene(ctx, g);

      if (g.hp <= 0) {
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

  const hold = (ref: { current: boolean }) => ({
    onPointerDown: () => (ref.current = true),
    onPointerUp: () => (ref.current = false),
    onPointerLeave: () => (ref.current = false),
    onPointerCancel: () => (ref.current = false),
  });
  const btn = "h-14 w-14 touch-none select-none rounded-xl bg-white/10 text-xl active:bg-white/25";

  return (
    <div className="flex w-full flex-col items-center gap-4">
      <div className="flex gap-6 text-lg text-white/80">
        <span>Score: {score}</span>
        <span>Best: {best}</span>
        <span>Wave: {wave}</span>
      </div>

      <div className="relative w-full max-w-4xl">
        <canvas
          ref={canvasRef}
          width={W}
          height={H}
          onPointerMove={point}
          onPointerDown={(e) => {
            point(e);
            firing.current = true;
          }}
          onPointerUp={() => (firing.current = false)}
          onPointerLeave={() => (firing.current = false)}
          onPointerCancel={() => (firing.current = false)}
          className="h-auto w-full cursor-none touch-none rounded-xl border border-white/10"
        />
        {!running && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-xl bg-black/70">
            {gameOver && <p className="text-3xl font-semibold text-rose-400">Tank destroyed! Score: {score}</p>}
            <button onClick={start} className="rounded-lg bg-purple-600 px-6 py-2 text-lg hover:bg-purple-500">
              {gameOver ? "Fight again" : "Start"}
            </button>
            <p className="text-sm text-white/60">WASD / arrows move · mouse aims · click or Space fires</p>
          </div>
        )}
      </div>

      {/* on-screen D-pad for phones (tap the screen to aim and shoot) */}
      <div className="grid grid-cols-3 gap-2 md:hidden">
        <span />
        <button {...hold(tUp)} className={btn}>▲</button>
        <span />
        <button {...hold(tLeft)} className={btn}>◀</button>
        <button {...hold(tDown)} className={btn}>▼</button>
        <button {...hold(tRight)} className={btn}>▶</button>
      </div>
    </div>
  );
}