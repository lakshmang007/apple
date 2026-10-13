import type { PageImage, TextBook, VisualBook } from '../types';
import { parsePlainText } from './loaders';

/**
 * Procedurally drawn demo content, so the reader can be tried without
 * uploading anything. Pages are rasterised to real images so they go through
 * exactly the same panel-detection pipeline as user files.
 */

type Ctx = CanvasRenderingContext2D;
interface R {
  x: number;
  y: number;
  w: number;
  h: number;
}

const INK = '#111';
const FONT = '"Comic Sans MS", "Comic Neue", "Chalkboard SE", "Marker Felt", system-ui, sans-serif';
const SFX_FONT = 'Impact, "Arial Black", "Haettenschweiler", system-ui, sans-serif';

function rng(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function panel(ctx: Ctx, r: R, draw: () => void) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(r.x, r.y, r.w, r.h);
  ctx.clip();
  draw();
  ctx.restore();
  ctx.lineWidth = 7;
  ctx.strokeStyle = INK;
  ctx.strokeRect(r.x, r.y, r.w, r.h);
}

function sky(ctx: Ctx, r: R, stops: string[]) {
  const g = ctx.createLinearGradient(0, r.y, 0, r.y + r.h);
  stops.forEach((c, i) => g.addColorStop(i / (stops.length - 1), c));
  ctx.fillStyle = g;
  ctx.fillRect(r.x, r.y, r.w, r.h);
}

function stars(ctx: Ctx, r: R, n: number, seed: number) {
  const rand = rng(seed);
  for (let i = 0; i < n; i++) {
    ctx.fillStyle = `rgba(255,255,255,${0.4 + rand() * 0.6})`;
    const s = rand() * 2.6 + 0.8;
    ctx.fillRect(r.x + rand() * r.w, r.y + rand() * r.h * 0.7, s, s);
  }
}

function glow(ctx: Ctx, x: number, y: number, rad: number, color: string) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
  g.addColorStop(0, color);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, rad, 0, Math.PI * 2);
  ctx.fill();
}

function moon(ctx: Ctx, x: number, y: number, rad: number) {
  glow(ctx, x, y, rad * 2.6, 'rgba(255,240,200,0.35)');
  ctx.fillStyle = '#fff6d8';
  ctx.beginPath();
  ctx.arc(x, y, rad, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(200,190,160,0.35)';
  ctx.beginPath();
  ctx.arc(x - rad * 0.3, y - rad * 0.2, rad * 0.18, 0, Math.PI * 2);
  ctx.arc(x + rad * 0.25, y + rad * 0.3, rad * 0.12, 0, Math.PI * 2);
  ctx.fill();
}

function skyline(ctx: Ctx, r: R, base: number, color: string, seed: number, windows = true) {
  const rand = rng(seed);
  let x = r.x - 20;
  while (x < r.x + r.w) {
    const bw = 50 + rand() * 110;
    const bh = (0.18 + rand() * 0.5) * r.h;
    ctx.fillStyle = color;
    ctx.fillRect(x, base - bh, bw, bh + r.h);
    if (rand() > 0.6) ctx.fillRect(x + bw * 0.4, base - bh - 40, 6, 40);
    if (windows) {
      for (let wy = base - bh + 14; wy < base - 10; wy += 26) {
        for (let wx = x + 10; wx < x + bw - 14; wx += 22) {
          if (rand() > 0.55) {
            ctx.fillStyle = rand() > 0.3 ? 'rgba(255,214,120,0.9)' : 'rgba(120,220,255,0.85)';
            ctx.fillRect(wx, wy, 9, 13);
          }
        }
      }
    }
    x += bw + 6;
  }
}

function speedLines(ctx: Ctx, r: R, cx: number, cy: number, n: number, color: string, seed: number) {
  const rand = rng(seed);
  const R = Math.hypot(r.w, r.h);
  ctx.fillStyle = color;
  for (let i = 0; i < n; i++) {
    const a = rand() * Math.PI * 2;
    const spread = 0.008 + rand() * 0.02;
    const inner = R * (0.18 + rand() * 0.22);
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * inner, cy + Math.sin(a) * inner);
    ctx.lineTo(cx + Math.cos(a - spread) * R, cy + Math.sin(a - spread) * R);
    ctx.lineTo(cx + Math.cos(a + spread) * R, cy + Math.sin(a + spread) * R);
    ctx.closePath();
    ctx.fill();
  }
}

function horizontalLines(ctx: Ctx, r: R, n: number, color: string, seed: number) {
  const rand = rng(seed);
  ctx.fillStyle = color;
  for (let i = 0; i < n; i++) {
    const y = r.y + rand() * r.h;
    const len = r.w * (0.3 + rand() * 0.6);
    const x = r.x + r.w - len * (0.3 + rand());
    ctx.fillRect(x, y, len, 2 + rand() * 4);
  }
}

function burst(ctx: Ctx, cx: number, cy: number, outer: number, inner: number, spikes: number, fill: string, seed: number) {
  const rand = rng(seed);
  ctx.beginPath();
  for (let i = 0; i < spikes * 2; i++) {
    const a = (i / (spikes * 2)) * Math.PI * 2;
    const rad = i % 2 === 0 ? outer * (0.8 + rand() * 0.35) : inner;
    const px = cx + Math.cos(a) * rad;
    const py = cy + Math.sin(a) * rad;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.lineWidth = 6;
  ctx.strokeStyle = INK;
  ctx.stroke();
}

function wrap(ctx: Ctx, text: string, maxW: number) {
  const words = text.split(' ');
  const lines: string[] = [];
  let line = '';
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxW && line) {
      lines.push(line);
      line = w;
    } else line = test;
  }
  if (line) lines.push(line);
  return lines;
}

function bubble(ctx: Ctx, x: number, y: number, w: number, text: string, tail: [number, number], size = 30, shout = false) {
  ctx.font = `bold ${size}px ${FONT}`;
  const lines = wrap(ctx, text, w - size * 1.6);
  const lh = size * 1.18;
  const h = lines.length * lh + size * 1.4;
  const cx = x + w / 2;
  const cy = y + h / 2;
  ctx.fillStyle = '#fff';
  ctx.strokeStyle = INK;
  ctx.lineWidth = 5;
  // Tail
  ctx.beginPath();
  ctx.moveTo(cx - w * 0.08, cy + h * 0.2);
  ctx.lineTo(tail[0], tail[1]);
  ctx.lineTo(cx + w * 0.08, cy + h * 0.2);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // Body
  ctx.beginPath();
  if (shout) {
    const spikes = 18;
    for (let i = 0; i < spikes * 2; i++) {
      const a = (i / (spikes * 2)) * Math.PI * 2;
      const k = i % 2 === 0 ? 1.12 : 0.92;
      const px = cx + Math.cos(a) * (w / 2) * k;
      const py = cy + Math.sin(a) * (h / 2) * k;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
  } else {
    ctx.ellipse(cx, cy, w / 2, h / 2 + 6, 0, 0, Math.PI * 2);
  }
  ctx.fill();
  ctx.stroke();
  // Cover the tail joint
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.ellipse(cx, cy, w / 2 - 5, h / 2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = INK;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  lines.forEach((l, i) => ctx.fillText(l, cx, cy - ((lines.length - 1) * lh) / 2 + i * lh));
}

function caption(ctx: Ctx, x: number, y: number, w: number, text: string, size = 26) {
  ctx.font = `italic bold ${size}px ${FONT}`;
  const lines = wrap(ctx, text, w - 36);
  const h = lines.length * size * 1.2 + 28;
  ctx.fillStyle = '#ffe66d';
  ctx.fillRect(x, y, w, h);
  ctx.lineWidth = 4;
  ctx.strokeStyle = INK;
  ctx.strokeRect(x, y, w, h);
  ctx.fillStyle = INK;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  lines.forEach((l, i) => ctx.fillText(l, x + 18, y + 14 + i * size * 1.2));
}

function sfx(ctx: Ctx, text: string, x: number, y: number, size: number, rot: number, fill: string) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.transform(1, 0, -0.18, 1, 0, 0);
  ctx.font = `900 ${size}px ${SFX_FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.lineWidth = size * 0.22;
  ctx.strokeStyle = INK;
  ctx.strokeText(text, 0, 0);
  ctx.fillStyle = fill;
  ctx.fillText(text, 0, 0);
  ctx.lineWidth = size * 0.05;
  ctx.strokeStyle = '#fff';
  ctx.strokeText(text, 0, 0);
  ctx.restore();
}

type Pose = 'look' | 'run' | 'grin' | 'jump';

function mira(ctx: Ctx, x: number, y: number, s: number, pose: Pose, facing = 1) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s * facing, s);
  ctx.lineWidth = 4 / s;
  ctx.strokeStyle = INK;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Legs
  ctx.lineWidth = 16;
  ctx.strokeStyle = '#1f2937';
  ctx.beginPath();
  if (pose === 'run' || pose === 'jump') {
    ctx.moveTo(-8, 120); ctx.lineTo(-50, 175); ctx.lineTo(-80, 165);
    ctx.moveTo(8, 120); ctx.lineTo(40, 165); ctx.lineTo(30, 215);
  } else {
    ctx.moveTo(-14, 120); ctx.lineTo(-18, 215);
    ctx.moveTo(14, 120); ctx.lineTo(18, 215);
  }
  ctx.stroke();

  // Body (red hoodie)
  ctx.fillStyle = '#e11d48';
  ctx.strokeStyle = INK;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(-38, 30);
  ctx.quadraticCurveTo(0, 15, 38, 30);
  ctx.lineTo(32, 128);
  ctx.lineTo(-32, 128);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Arms
  ctx.lineWidth = 14;
  ctx.strokeStyle = '#be123c';
  ctx.beginPath();
  if (pose === 'run' || pose === 'jump') {
    ctx.moveTo(30, 45); ctx.lineTo(75, 70); ctx.lineTo(95, 40);
    ctx.moveTo(-30, 45); ctx.lineTo(-70, 85);
  } else if (pose === 'grin') {
    ctx.moveTo(30, 45); ctx.lineTo(60, 10); ctx.lineTo(55, -30);
    ctx.moveTo(-30, 45); ctx.lineTo(-42, 110);
  } else {
    ctx.moveTo(30, 45); ctx.lineTo(42, 110);
    ctx.moveTo(-30, 45); ctx.lineTo(-42, 110);
  }
  ctx.stroke();

  // Head
  ctx.fillStyle = '#ffd7b5';
  ctx.strokeStyle = INK;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.ellipse(0, -20, 42, 48, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Hair
  ctx.fillStyle = '#3b1d6e';
  ctx.beginPath();
  ctx.moveTo(-46, -10);
  ctx.lineTo(-58, -40); ctx.lineTo(-40, -45);
  ctx.lineTo(-48, -75); ctx.lineTo(-18, -62);
  ctx.lineTo(-10, -90); ctx.lineTo(12, -64);
  ctx.lineTo(36, -84); ctx.lineTo(36, -56);
  ctx.lineTo(62, -50); ctx.lineTo(44, -26);
  ctx.quadraticCurveTo(20, -50, -20, -40);
  ctx.quadraticCurveTo(-36, -30, -46, -10);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Face
  const eyeY = pose === 'look' ? -26 : -18;
  ctx.fillStyle = INK;
  ctx.beginPath();
  ctx.ellipse(10, eyeY, 6, pose === 'grin' ? 3 : 9, 0, 0, Math.PI * 2);
  ctx.ellipse(32, eyeY, 5, pose === 'grin' ? 3 : 8, 0, 0, Math.PI * 2);
  ctx.fill();
  if (pose !== 'grin') {
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(12, eyeY - 3, 2.4, 0, Math.PI * 2);
    ctx.arc(33, eyeY - 3, 2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  if (pose === 'grin' || pose === 'jump') {
    ctx.arc(22, 2, 12, 0.1, Math.PI - 0.1);
  } else if (pose === 'run') {
    ctx.ellipse(22, 6, 6, 8, 0, 0, Math.PI * 2);
  } else {
    ctx.moveTo(15, 8); ctx.lineTo(28, 8);
  }
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,120,140,0.5)';
  ctx.beginPath();
  ctx.ellipse(-2, -2, 8, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function lantern(ctx: Ctx, x: number, y: number, s: number, mood: 'happy' | 'scared' | 'wink' = 'happy') {
  glow(ctx, x, y, 170 * s, 'rgba(255,170,60,0.55)');
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.lineWidth = 4;
  ctx.strokeStyle = INK;
  const g = ctx.createRadialGradient(-10, -10, 5, 0, 0, 70);
  g.addColorStop(0, '#fff3b0');
  g.addColorStop(0.5, '#ffb347');
  g.addColorStop(1, '#f2542d');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(0, 0, 60, 70, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = 'rgba(120,40,0,0.45)';
  ctx.lineWidth = 2.5;
  for (const k of [-30, 0, 30]) {
    ctx.beginPath();
    ctx.ellipse(0, 0, Math.abs(k) * 1.6 + 6, 70, 0, -Math.PI / 2, Math.PI / 2, k < 0);
    ctx.stroke();
  }
  ctx.fillStyle = '#7c2d12';
  ctx.strokeStyle = INK;
  ctx.lineWidth = 4;
  ctx.fillRect(-28, -82, 56, 16);
  ctx.strokeRect(-28, -82, 56, 16);
  ctx.fillRect(-28, 66, 56, 16);
  ctx.strokeRect(-28, 66, 56, 16);
  ctx.fillStyle = '#e11d48';
  ctx.fillRect(-3, 82, 6, 34);
  // Face
  ctx.fillStyle = INK;
  if (mood === 'wink') {
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(-28, -8); ctx.lineTo(-12, -4);
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.ellipse(-20, -6, 7, mood === 'scared' ? 11 : 9, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.beginPath();
  ctx.ellipse(20, -6, 7, mood === 'scared' ? 11 : 9, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.beginPath();
  if (mood === 'scared') ctx.ellipse(0, 22, 9, 12, 0, 0, Math.PI * 2);
  else ctx.arc(0, 14, 13, 0.15, Math.PI - 0.15);
  ctx.stroke();
  ctx.restore();
}

function drone(ctx: Ctx, x: number, y: number, s: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 5;
  ctx.fillStyle = '#4b5563';
  ctx.beginPath();
  ctx.moveTo(-90, -20); ctx.lineTo(90, -20);
  ctx.stroke();
  for (const px of [-95, 95]) {
    ctx.fillStyle = 'rgba(200,210,220,0.5)';
    ctx.beginPath();
    ctx.ellipse(px, -28, 46, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  ctx.fillStyle = '#374151';
  ctx.beginPath();
  ctx.ellipse(0, 0, 60, 38, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  glow(ctx, 0, 6, 50, 'rgba(255,40,60,0.7)');
  ctx.fillStyle = '#ff2d55';
  ctx.beginPath();
  ctx.arc(0, 6, 15, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(-4, 2, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function sparkles(ctx: Ctx, r: R, n: number, seed: number, color = '#fff6c2') {
  const rand = rng(seed);
  ctx.fillStyle = color;
  for (let i = 0; i < n; i++) {
    const x = r.x + rand() * r.w;
    const y = r.y + rand() * r.h;
    const s = 4 + rand() * 12;
    ctx.beginPath();
    ctx.moveTo(x, y - s);
    ctx.quadraticCurveTo(x, y, x + s, y);
    ctx.quadraticCurveTo(x, y, x, y + s);
    ctx.quadraticCurveTo(x, y, x - s, y);
    ctx.quadraticCurveTo(x, y, x, y - s);
    ctx.fill();
  }
}

function roof(ctx: Ctx, r: R, top: number, color = '#1e1b4b') {
  ctx.fillStyle = color;
  ctx.fillRect(r.x, top, r.w, r.y + r.h - top);
  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  ctx.fillRect(r.x, top, r.w, 6);
}

/* ------------------------------------------------------------------ */

const NIGHT = ['#0b1026', '#1e1b4b', '#4c1d95'];
const DUSK = ['#1e1b4b', '#7c3aed', '#f472b6'];
const DAWN = ['#fde68a', '#fb923c', '#f472b6', '#7c3aed'];

function page1(ctx: Ctx) {
  const p1 = { x: 50, y: 50, w: 1100, h: 520 };
  panel(ctx, p1, () => {
    sky(ctx, p1, NIGHT);
    stars(ctx, p1, 140, 1);
    moon(ctx, 930, 170, 70);
    skyline(ctx, p1, p1.y + p1.h, '#0f0a2a', 3);
    lantern(ctx, 560, 230, 0.35);
    caption(ctx, 80, 80, 520, 'Neo-Kyoto, 2087. Lanterns were banned years ago...');
  });
  const p2 = { x: 50, y: 598, w: 536, h: 560 };
  panel(ctx, p2, () => {
    sky(ctx, p2, DUSK);
    stars(ctx, p2, 30, 4);
    roof(ctx, p2, 1060);
    mira(ctx, 300, 900, 1.15, 'look');
    bubble(ctx, 80, 630, 430, 'Is that... a lantern? A real one?', [280, 790]);
  });
  const p3 = { x: 614, y: 598, w: 536, h: 560 };
  panel(ctx, p3, () => {
    sky(ctx, p3, ['#1e1b4b', '#3b0764']);
    sparkles(ctx, p3, 26, 5);
    lantern(ctx, 880, 930, 1.3, 'scared');
    bubble(ctx, 650, 625, 300, 'Psst! Hide me!', [820, 800], 34);
  });
  const p4 = { x: 50, y: 1186, w: 1100, h: 564 };
  panel(ctx, p4, () => {
    ctx.fillStyle = '#fff7ed';
    ctx.fillRect(p4.x, p4.y, p4.w, p4.h);
    speedLines(ctx, p4, 600, 1470, 120, '#111', 6);
    drone(ctx, 330, 1420, 1.0);
    drone(ctx, 560, 1560, 0.75);
    drone(ctx, 860, 1400, 1.2);
    sfx(ctx, 'WHOOOSH!', 600, 1660, 120, -0.06, '#38bdf8');
  });
}

function page2(ctx: Ctx) {
  const p1 = { x: 50, y: 50, w: 700, h: 640 };
  panel(ctx, p1, () => {
    ctx.fillStyle = '#fef3c7';
    ctx.fillRect(p1.x, p1.y, p1.w, p1.h);
    horizontalLines(ctx, p1, 70, 'rgba(17,17,17,0.85)', 7);
    mira(ctx, 400, 360, 1.25, 'run');
    lantern(ctx, 560, 310, 0.45, 'wink');
    sfx(ctx, 'DASH!', 200, 170, 110, -0.15, '#facc15');
  });
  const p2 = { x: 778, y: 50, w: 372, h: 640 };
  panel(ctx, p2, () => {
    sky(ctx, p2, ['#111827', '#450a0a']);
    drone(ctx, 965, 420, 1.35);
    bubble(ctx, 800, 90, 320, 'TARGET ACQUIRED.', [940, 330], 30, true);
  });
  const p3 = { x: 50, y: 718, w: 1100, h: 420 };
  panel(ctx, p3, () => {
    sky(ctx, p3, DUSK);
    moon(ctx, 620, 880, 120);
    skyline(ctx, p3, p3.y + p3.h, '#0f0a2a', 9, false);
    ctx.save();
    ctx.globalAlpha = 0.92;
    mira(ctx, 610, 860, 0.7, 'jump');
    ctx.restore();
    caption(ctx, 80, 745, 470, 'Three rooftops. Two drones. One very bad idea.');
  });
  const p4 = { x: 50, y: 1166, w: 536, h: 584 };
  panel(ctx, p4, () => {
    ctx.fillStyle = '#fff';
    ctx.fillRect(p4.x, p4.y, p4.w, p4.h);
    speedLines(ctx, p4, 318, 1458, 90, '#111', 11);
    burst(ctx, 318, 1458, 250, 140, 16, '#f97316', 12);
    burst(ctx, 318, 1458, 160, 90, 12, '#facc15', 13);
    sfx(ctx, 'BOOM!', 318, 1460, 130, -0.1, '#ef4444');
  });
  const p5 = { x: 614, y: 1166, w: 536, h: 584 };
  panel(ctx, p5, () => {
    sky(ctx, p5, ['#312e81', '#9d174d']);
    sparkles(ctx, p5, 30, 14);
    roof(ctx, p5, 1640);
    mira(ctx, 840, 1420, 1.0, 'grin');
    lantern(ctx, 1010, 1300, 0.55, 'happy');
    bubble(ctx, 650, 1190, 400, "Okay... now I'm curious.", [790, 1330], 30);
  });
}

function page3(ctx: Ctx) {
  const p1 = { x: 50, y: 50, w: 1100, h: 700 };
  panel(ctx, p1, () => {
    sky(ctx, p1, DAWN);
    glow(ctx, 600, 560, 500, 'rgba(255,240,180,0.8)');
    skyline(ctx, p1, p1.y + p1.h, '#3b0764', 21);
    sparkles(ctx, p1, 60, 22, '#fff');
    lantern(ctx, 600, 330, 1.0, 'happy');
    caption(ctx, 80, 80, 600, 'At dawn, for the first time in twenty years, the city glowed.');
  });
  const beats: Array<[R, () => void]> = [
    [{ x: 50, y: 778, w: 350, h: 480 }, () => {
      sky(ctx, { x: 50, y: 778, w: 350, h: 480 }, ['#fed7aa', '#fb7185']);
      lantern(ctx, 225, 1110, 0.9, 'wink');
      bubble(ctx, 70, 800, 310, 'My name is Hikari.', [220, 980], 28);
    }],
    [{ x: 425, y: 778, w: 350, h: 480 }, () => {
      sky(ctx, { x: 425, y: 778, w: 350, h: 480 }, ['#c4b5fd', '#f9a8d4']);
      mira(ctx, 600, 1080, 0.85, 'look');
      bubble(ctx, 450, 800, 300, 'Mira.', [600, 960], 34);
    }],
    [{ x: 800, y: 778, w: 350, h: 480 }, () => {
      const r = { x: 800, y: 778, w: 350, h: 480 };
      ctx.fillStyle = '#fffbeb';
      ctx.fillRect(r.x, r.y, r.w, r.h);
      speedLines(ctx, r, 975, 1080, 60, 'rgba(245,158,11,0.9)', 23);
      mira(ctx, 930, 1110, 0.7, 'grin');
      lantern(ctx, 1060, 1020, 0.5, 'happy');
      bubble(ctx, 820, 795, 310, "Let's light them ALL up!", [960, 960], 28, true);
    }],
  ];
  for (const [r, draw] of beats) panel(ctx, r, draw);
  const p5 = { x: 50, y: 1286, w: 1100, h: 464 };
  panel(ctx, p5, () => {
    sky(ctx, p5, ['#0b1026', '#312e81']);
    stars(ctx, p5, 80, 30);
    sparkles(ctx, p5, 40, 31, '#fde68a');
    for (let i = 0; i < 9; i++) lantern(ctx, 130 + i * 120, 1420 + Math.sin(i) * 40, 0.3, 'happy');
    sfx(ctx, 'TO BE CONTINUED...', 600, 1640, 84, -0.03, '#fde047');
  });
}

function webtoonStrip(ctx: Ctx, W: number) {
  const gap = 140;
  let y = 60;
  const seg = (h: number, draw: (r: R) => void) => {
    const r = { x: 0, y, w: W, h };
    ctx.save();
    ctx.beginPath();
    ctx.rect(r.x, r.y, r.w, r.h);
    ctx.clip();
    draw(r);
    ctx.restore();
    y += h + gap;
  };
  seg(1100, (r) => {
    sky(ctx, r, ['#020617', '#0b1026', '#1e1b4b']);
    stars(ctx, r, 260, 40);
    moon(ctx, W * 0.7, r.y + 300, 90);
    caption(ctx, 60, r.y + 760, W - 120, 'Chapter 1 — The Last Lantern', 38);
  });
  seg(900, (r) => {
    sky(ctx, r, NIGHT);
    skyline(ctx, r, r.y + r.h, '#0f0a2a', 41);
    lantern(ctx, W * 0.55, r.y + 260, 0.6, 'scared');
    bubble(ctx, 60, r.y + 60, 360, 'Somebody... help!', [W * 0.5, r.y + 240], 32);
  });
  seg(1000, (r) => {
    sky(ctx, r, DUSK);
    roof(ctx, r, r.y + r.h - 140);
    mira(ctx, W * 0.45, r.y + 600, 1.6, 'look');
    bubble(ctx, W - 440, r.y + 60, 400, 'Hold on, little light. I got you.', [W * 0.55, r.y + 300], 32);
  });
  // Webtoon segments touch the page edge, so avoid near-white fills (they'd read as gutter).
  seg(1300, (r) => {
    ctx.fillStyle = '#fcd34d';
    ctx.fillRect(r.x, r.y, r.w, r.h);
    speedLines(ctx, r, W / 2, r.y + r.h / 2, 150, '#111', 42);
    drone(ctx, W * 0.3, r.y + 380, 1.1);
    drone(ctx, W * 0.72, r.y + 620, 1.4);
    drone(ctx, W * 0.4, r.y + 920, 0.9);
    sfx(ctx, 'WHOOOSH!', W / 2, r.y + 1160, 130, -0.08, '#38bdf8');
  });
  seg(900, (r) => {
    ctx.fillStyle = '#fdba74';
    ctx.fillRect(r.x, r.y, r.w, r.h);
    speedLines(ctx, r, W / 2, r.y + r.h / 2, 110, '#111', 43);
    burst(ctx, W / 2, r.y + r.h / 2, 380, 210, 18, '#f97316', 44);
    burst(ctx, W / 2, r.y + r.h / 2, 240, 130, 14, '#facc15', 45);
    sfx(ctx, 'KA-BOOM!', W / 2, r.y + r.h / 2, 150, -0.08, '#ef4444');
  });
  seg(1100, (r) => {
    sky(ctx, r, ['#fb923c', '#f472b6', '#7c3aed']);
    glow(ctx, W / 2, r.y + 700, 520, 'rgba(255,240,180,0.85)');
    skyline(ctx, r, r.y + r.h, '#3b0764', 46);
    sparkles(ctx, r, 70, 47, '#fff');
    mira(ctx, W * 0.35, r.y + 520, 1.1, 'grin');
    lantern(ctx, W * 0.68, r.y + 380, 0.8, 'happy');
    sfx(ctx, 'TO BE CONTINUED...', W / 2, r.y + 950, 74, -0.04, '#fde047');
  });
  return y - gap + 60;
}

function canvasToPage(canvas: HTMLCanvasElement, name: string): Promise<PageImage> {
  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => {
      if (!blob) return reject(new Error('Could not render demo'));
      resolve({
        id: `demo-${name}`,
        name,
        src: URL.createObjectURL(blob),
        width: canvas.width,
        height: canvas.height,
      });
    }, 'image/png'),
  );
}

let comicCache: Promise<VisualBook> | null = null;
let webtoonCache: Promise<VisualBook> | null = null;

export function demoComic(): Promise<VisualBook> {
  comicCache ??= (async () => {
    const pages: PageImage[] = [];
    for (const [i, draw] of [page1, page2, page3].entries()) {
      const c = document.createElement('canvas');
      c.width = 1200;
      c.height = 1800;
      const ctx = c.getContext('2d')!;
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, c.width, c.height);
      draw(ctx);
      ctx.fillStyle = '#9ca3af';
      ctx.font = `16px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.fillText(String(i + 1), 600, 1785);
      pages.push(await canvasToPage(c, `page-${i + 1}`));
    }
    return { kind: 'visual', title: 'The Last Lantern', pages, suggestedMode: 'comic' };
  })();
  return comicCache;
}

export function demoWebtoon(): Promise<VisualBook> {
  webtoonCache ??= (async () => {
    const W = 900;
    // Measure first by drawing on a scratch canvas big enough for the whole strip.
    const c = document.createElement('canvas');
    c.width = W;
    c.height = 7400;
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, W, c.height);
    const used = webtoonStrip(ctx, W);
    const out = document.createElement('canvas');
    out.width = W;
    out.height = used;
    out.getContext('2d')!.drawImage(c, 0, 0);
    const page = await canvasToPage(out, 'episode-1');
    return { kind: 'visual', title: 'The Last Lantern — Webtoon', pages: [page], suggestedMode: 'webtoon' };
  })();
  return webtoonCache;
}

const STORY = `# Chapter 1: The Lantern Under the Bridge

Rain had been falling on Neo-Kyoto for nine days, and Mira had stopped noticing it. She walked home along the canal with her hood up and her hands in her pockets, counting the drones that drifted overhead like slow grey fish.

Under the old stone bridge, something glowed.

It was small and round and warm, the colour of a candle seen through honey. Mira had only ever seen pictures of paper lanterns in history books — they had been banned twenty years ago, along with fireworks, festivals and anything else the city council called "unregulated light."

"Hello?" she whispered. "Is someone there?"

The lantern blinked. Two tiny eyes opened in its paper skin, and a voice like a wind chime said, "Please don't scream. Everyone always screams."

Mira did not scream. She laughed instead, a bright surprised laugh that echoed off the wet stones, and the lantern's glow flickered pink with what might have been embarrassment.

# Chapter 2: The Chase

The drones found them before midnight.

A red light swept across the bridge. Then another. Then a dozen, humming in a tight, hungry circle. "UNREGULATED LIGHT SOURCE DETECTED," boomed a flat mechanical voice. "SURRENDER THE OBJECT."

"Run!" squeaked the lantern.

Mira grabbed it and ran. She leapt the railing, dashed across the market roofs and slid down a rusted gutter pipe as the drones screamed after her. WHOOSH! One of them clipped her sleeve. CRASH! Another smashed into a billboard and exploded in a shower of sparks.

Her heart was pounding so hard she could feel it in her teeth. She had never been so terrified — or so alive.

# Chapter 3: Hikari

They hid in the bell tower of the abandoned shrine, where the fog rolled in thick and silver and the city sounded very far away.

"My name is Hikari," said the lantern softly. "I am the last one. When they banned the lights, the rest of us went to sleep. But I could not. Someone had to remember what the festivals felt like."

Mira was quiet for a long time. She thought about her grandmother, who used to hum festival songs while she cooked, and who had cried, just once, when the last summer fair was cancelled.

"Do you think you could wake them up?" Mira asked. "The others?"

Hikari's glow grew brighter, warm as a hand on her cheek. "Not alone," it said. "But maybe together."

# Chapter 4: Dawn

They climbed to the very top of the tower just as the sun began to rise. Hikari floated out over the city and began to sing — a strange, gentle, wonderful song with no words at all.

One by one, all across Neo-Kyoto, lights flickered on in forgotten attics and dusty storerooms. Paper lanterns. Hundreds of them. Thousands. They rose into the pink morning sky like a second sunrise, and down in the streets people stopped, and looked up, and smiled.

Mira laughed until she cried. "We did it," she said. "We actually did it!"

"No," said Hikari, settling warmly into her hands. "We started it."

To be continued...`;

export function demoStory(): TextBook {
  const book = parsePlainText(STORY, 'The Last Lantern');
  book.title = 'The Last Lantern';
  return book;
}
