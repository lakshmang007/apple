import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useMemo, useRef } from 'react';
import { useReducedMotion } from '../lib/hooks';

export type ParticleVariant =
  | 'motes'
  | 'sparkles'
  | 'rain'
  | 'embers'
  | 'fog'
  | 'streaks'
  | 'hearts'
  | 'snow';

interface P {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  life: number;
  max: number;
  phase: number;
  variant: ParticleVariant;
}

const BASE_COUNT: Record<ParticleVariant, number> = {
  motes: 60,
  sparkles: 45,
  rain: 160,
  embers: 70,
  fog: 14,
  streaks: 40,
  hearts: 22,
  snow: 90,
};

function spawn(v: ParticleVariant, w: number, h: number, initial: boolean): P {
  const r = Math.random;
  const p: P = { x: r() * w, y: r() * h, vx: 0, vy: 0, size: 1, life: 0, max: 4 + r() * 6, phase: r() * 10, variant: v };
  switch (v) {
    case 'motes':
      p.vx = (r() - 0.5) * 12;
      p.vy = -6 - r() * 14;
      p.size = 0.8 + r() * 2.2;
      break;
    case 'sparkles':
      p.vx = (r() - 0.5) * 10;
      p.vy = -4 - r() * 10;
      p.size = 2 + r() * 5;
      p.max = 2 + r() * 3;
      break;
    case 'rain':
      p.vx = -80 - r() * 40;
      p.vy = 700 + r() * 400;
      p.size = 10 + r() * 16;
      if (!initial) p.y = -30;
      p.max = 3;
      break;
    case 'embers':
      p.vx = (r() - 0.5) * 30;
      p.vy = -40 - r() * 70;
      p.size = 1.2 + r() * 2.8;
      if (!initial) p.y = h + 10;
      break;
    case 'fog':
      p.vx = 6 + r() * 14;
      p.vy = (r() - 0.5) * 4;
      p.size = 120 + r() * 220;
      p.max = 14 + r() * 10;
      break;
    case 'streaks':
      p.vx = -900 - r() * 900;
      p.vy = 0;
      p.size = 60 + r() * 200;
      if (!initial) p.x = w + p.size;
      p.max = 2;
      break;
    case 'hearts':
      p.vx = (r() - 0.5) * 14;
      p.vy = -18 - r() * 24;
      p.size = 6 + r() * 10;
      if (!initial) p.y = h + 20;
      p.max = 8 + r() * 6;
      break;
    case 'snow':
      p.vx = (r() - 0.5) * 10;
      p.vy = 18 + r() * 30;
      p.size = 1 + r() * 2.6;
      if (!initial) p.y = -10;
      p.max = 12;
      break;
  }
  if (initial) p.life = r() * p.max;
  return p;
}

function drawHeart(ctx: CanvasRenderingContext2D, x: number, y: number, s: number) {
  ctx.beginPath();
  ctx.moveTo(x, y + s * 0.3);
  ctx.bezierCurveTo(x, y, x - s * 0.5, y, x - s * 0.5, y + s * 0.3);
  ctx.bezierCurveTo(x - s * 0.5, y + s * 0.6, x, y + s * 0.8, x, y + s);
  ctx.bezierCurveTo(x, y + s * 0.8, x + s * 0.5, y + s * 0.6, x + s * 0.5, y + s * 0.3);
  ctx.bezierCurveTo(x + s * 0.5, y, x, y, x, y + s * 0.3);
  ctx.fill();
}

/** Ambient particle field rendered on a canvas. */
export function Particles({
  variant,
  color,
  density = 1,
  className = '',
}: {
  variant: ParticleVariant;
  color: string;
  density?: number;
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cfg = useRef({ variant, color, density });
  cfg.current = { variant, color, density };
  const reduced = useReducedMotion();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || reduced) return;
    const ctx = canvas.getContext('2d')!;
    let w = 0;
    let h = 0;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const resize = () => {
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    let parts: P[] = [];
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const { variant: v, color: c, density: d } = cfg.current;
      const target = Math.round(BASE_COUNT[v] * d * Math.min(1.6, (w * h) / 900_000 + 0.4));
      // Grow toward target; particles of an old variant are replaced as they die.
      while (parts.length < target) parts.push(spawn(v, w, h, parts.length === 0 || Math.random() < 0.3));
      if (parts.length > target) parts.length = target;

      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = c;
      ctx.strokeStyle = c;
      for (let i = 0; i < parts.length; i++) {
        let p = parts[i];
        p.life += dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        if (p.variant === 'embers' || p.variant === 'snow' || p.variant === 'hearts') {
          p.x += Math.sin(now / 700 + p.phase) * 0.4;
        }
        const out = p.x < -300 || p.x > w + 300 || p.y < -60 || p.y > h + 60;
        if (p.life > p.max || out || p.variant !== v) {
          p = parts[i] = spawn(v, w, h, false);
        }
        const t = p.life / p.max;
        const fade = Math.min(1, t * 4, (1 - t) * 4);
        switch (p.variant) {
          case 'motes':
          case 'snow':
            ctx.globalAlpha = fade * 0.75;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
            break;
          case 'embers':
            ctx.globalAlpha = fade * (0.6 + 0.4 * Math.sin(now / 90 + p.phase));
            ctx.shadowBlur = 10;
            ctx.shadowColor = c;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
            break;
          case 'sparkles': {
            const s = p.size * (0.5 + 0.5 * Math.sin(now / 200 + p.phase));
            ctx.globalAlpha = fade;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y - s);
            ctx.quadraticCurveTo(p.x, p.y, p.x + s, p.y);
            ctx.quadraticCurveTo(p.x, p.y, p.x, p.y + s);
            ctx.quadraticCurveTo(p.x, p.y, p.x - s, p.y);
            ctx.quadraticCurveTo(p.x, p.y, p.x, p.y - s);
            ctx.fill();
            break;
          }
          case 'rain':
            ctx.globalAlpha = 0.35;
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p.x + p.vx * 0.02, p.y + p.size);
            ctx.stroke();
            break;
          case 'streaks':
            ctx.globalAlpha = 0.35 * fade;
            ctx.fillRect(p.x, p.y, p.size, 2);
            break;
          case 'fog': {
            const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
            g.addColorStop(0, c);
            g.addColorStop(1, 'transparent');
            ctx.globalAlpha = fade * 0.12;
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = c;
            break;
          }
          case 'hearts':
            ctx.globalAlpha = fade * 0.7;
            drawHeart(ctx, p.x, p.y, p.size);
            break;
        }
      }
      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      parts = [];
    };
  }, [reduced]);

  return <canvas ref={canvasRef} className={`pointer-events-none absolute inset-0 h-full w-full ${className}`} />;
}

/** Manga-style radial speed lines. */
export function SpeedLines({ show, color = '#fff', opacity = 0.5 }: { show: boolean; color?: string; opacity?: number }) {
  const lines = useMemo(() => {
    const out: string[] = [];
    for (let i = 0; i < 90; i++) {
      const a = (i / 90) * Math.PI * 2 + Math.random() * 0.05;
      const spread = 0.004 + Math.random() * 0.012;
      const inner = 34 + Math.random() * 14;
      const p = (ang: number, r: number) => `${50 + Math.cos(ang) * r},${50 + Math.sin(ang) * r}`;
      out.push(`${p(a, inner)} ${p(a - spread, 90)} ${p(a + spread, 90)}`);
    }
    return out;
  }, []);
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="pointer-events-none absolute inset-0 overflow-hidden"
          initial={{ opacity: 0, scale: 1.25 }}
          animate={{ opacity, scale: 1 }}
          exit={{ opacity: 0, scale: 1.1 }}
          transition={{ duration: 0.35 }}
        >
          <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice" className="speedlines h-full w-full">
            {lines.map((pts, i) => (
              <polygon key={i} points={pts} fill={color} />
            ))}
          </svg>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** One-shot white flash; re-triggers whenever `trigger` changes (and is > 0). */
export function Flash({ trigger, color = '#fff' }: { trigger: number; color?: string }) {
  return (
    <AnimatePresence>
      {trigger > 0 && (
        <motion.div
          key={trigger}
          className="pointer-events-none absolute inset-0"
          style={{ background: color, mixBlendMode: 'screen' }}
          initial={{ opacity: 0.55 }}
          animate={{ opacity: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
      )}
    </AnimatePresence>
  );
}

export function Vignette({ strength = 0.65 }: { strength?: number }) {
  return (
    <div
      className="pointer-events-none absolute inset-0"
      style={{
        background: `radial-gradient(ellipse at center, transparent 45%, rgba(0,0,0,${strength}) 100%)`,
      }}
    />
  );
}

/** Big comic sound-effect lettering that slams onto the screen. */
export function SfxBurst({ text, trigger, color = '#fde047' }: { text: string; trigger: number; color?: string }) {
  // A fresh random tilt for every burst.
  const rot = useMemo(() => (trigger ? (Math.random() - 0.5) * 18 : 0), [trigger]);
  return (
    <AnimatePresence>
      {trigger > 0 && text && (
        <motion.div
          key={trigger}
          className="pointer-events-none absolute inset-0 flex items-center justify-center"
          initial={{ opacity: 1 }}
          animate={{ opacity: [1, 1, 0] }}
          transition={{ duration: 1.8, times: [0, 0.75, 1] }}
        >
          <motion.span
            className="sfx-text select-none text-[clamp(64px,14vw,190px)] leading-none"
            style={{ color, rotate: rot }}
            initial={{ scale: 3.5, opacity: 0 }}
            animate={{ scale: [3.5, 0.9, 1.05, 1], opacity: 1 }}
            transition={{ duration: 0.55, ease: 'easeOut' }}
          >
            {text}
          </motion.span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
