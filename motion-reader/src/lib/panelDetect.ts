import type { Panel, ReadingMode, Rect } from '../types';

/**
 * Panel detection by recursive X/Y cutting along "gutters" — rows or columns
 * that are (almost) entirely page background. This works well for the vast
 * majority of comics, manga and webtoons which separate panels with white or
 * black gutters, and degrades gracefully (fewer, larger panels) otherwise.
 */

const TARGET_PIXELS = 650_000;

interface Raster {
  w: number;
  h: number;
  lum: Uint8Array;
  rgb: Uint8ClampedArray;
  bg: Uint8Array; // 1 = background pixel
}

const imageCache = new Map<string, Promise<HTMLImageElement>>();

export function loadImage(src: string): Promise<HTMLImageElement> {
  let p = imageCache.get(src);
  if (!p) {
    p = new Promise((resolve, reject) => {
      const img = new Image();
      img.decoding = 'async';
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Could not decode image'));
      img.src = src;
    });
    imageCache.set(src, p);
  }
  return p;
}

/**
 * Scores how likely `test` describes the gutter colour: separate runs of full
 * rows/columns (≥97% of pixels pass), plus a bonus for each page edge that is
 * entirely that colour. Gutters form many separate runs and frame the page,
 * while a large dark or white area of artwork forms a single run.
 */
function gutterScore(lum: Uint8Array, w: number, h: number, test: (l: number) => boolean) {
  let score = 0;
  const scan = (count: number, len: number, at: (i: number, j: number) => number) => {
    let inRun = false;
    for (let i = 0; i < count; i++) {
      let n = 0;
      for (let j = 0; j < len; j++) n += test(lum[at(i, j)]) ? 1 : 0;
      const full = n >= len * 0.97;
      if (full && !inRun) score++;
      if (full && (i === 0 || i === count - 1)) score += 4;
      inRun = full;
    }
  };
  scan(h, w, (y, x) => y * w + x);
  scan(w, h, (x, y) => y * w + x);
  return score;
}

/**
 * Gutters are almost always white or black; pick the more likely one (white
 * wins ties — it is far more common). Falls back to the median luminance of
 * the page border for anything else (e.g. coloured paper).
 */
function estimateBackground(lum: Uint8Array, w: number, h: number) {
  const white = gutterScore(lum, w, h, (l) => l >= 215);
  const black = gutterScore(lum, w, h, (l) => l <= 40);
  if (Math.max(white, black) >= 2) return white >= black ? 245 : 10;
  const border: number[] = [];
  const step = Math.max(1, Math.floor((w + h) / 400));
  for (let x = 0; x < w; x += step) border.push(lum[x], lum[(h - 1) * w + x]);
  for (let y = 0; y < h; y += step) border.push(lum[y * w], lum[y * w + w - 1]);
  border.sort((a, b) => a - b);
  return border[Math.floor(border.length / 2)] ?? 255;
}

function rasterize(img: HTMLImageElement): Raster {
  const iw = img.naturalWidth;
  const ih = img.naturalHeight;
  const scale = Math.min(1, Math.sqrt(TARGET_PIXELS / (iw * ih)));
  const w = Math.max(1, Math.round(iw * scale));
  const h = Math.max(1, Math.round(ih * scale));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(img, 0, 0, w, h);
  const rgb = ctx.getImageData(0, 0, w, h).data;
  const lum = new Uint8Array(w * h);
  for (let i = 0, j = 0; i < lum.length; i++, j += 4) {
    lum[i] = (rgb[j] * 299 + rgb[j + 1] * 587 + rgb[j + 2] * 114) / 1000;
  }

  const bgLum = estimateBackground(lum, w, h);

  // Background = background-coloured pixels connected to the page edge. Flood
  // filling (instead of a plain threshold) keeps white areas *inside* bordered
  // panels from being mistaken for gutters.
  const cand = new Uint8Array(w * h);
  for (let i = 0; i < cand.length; i++) {
    cand[i] = Math.abs(lum[i] - bgLum) < 38 ? 1 : 0;
  }
  const bg = new Uint8Array(w * h);
  const queue = new Int32Array(w * h);
  let head = 0;
  let tail = 0;
  const seed = (i: number) => {
    if (cand[i] && !bg[i]) {
      bg[i] = 1;
      queue[tail++] = i;
    }
  };
  for (let x = 0; x < w; x++) {
    seed(x);
    seed((h - 1) * w + x);
  }
  for (let y = 0; y < h; y++) {
    seed(y * w);
    seed(y * w + w - 1);
  }
  while (head < tail) {
    const i = queue[head++];
    const x = i % w;
    if (x > 0) seed(i - 1);
    if (x < w - 1) seed(i + 1);
    if (i >= w) seed(i - w);
    if (i < w * (h - 1)) seed(i + w);
  }
  return { w, h, lum, rgb, bg };
}

interface Box {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

/** Split [a0, a1) into content segments separated by gutters of at least minGap. */
function segments(
  profile: (i: number) => number,
  a0: number,
  a1: number,
  inkTol: number,
  minGap: number,
): Array<[number, number]> {
  const out: Array<[number, number]> = [];
  let segStart = -1;
  let gapRun = 0;
  let lastContent = -1;
  for (let i = a0; i < a1; i++) {
    const isGutter = profile(i) <= inkTol;
    if (isGutter) {
      gapRun++;
      if (segStart >= 0 && gapRun >= minGap) {
        out.push([segStart, lastContent + 1]);
        segStart = -1;
      }
    } else {
      if (segStart < 0) segStart = i;
      gapRun = 0;
      lastContent = i;
    }
  }
  if (segStart >= 0) out.push([segStart, lastContent + 1]);
  return out;
}

function rowInk(r: Raster, y: number, x0: number, x1: number) {
  let n = 0;
  const base = y * r.w;
  for (let x = x0; x < x1; x++) n += 1 - r.bg[base + x];
  return n / Math.max(1, x1 - x0);
}

function colInk(r: Raster, x: number, y0: number, y1: number) {
  let n = 0;
  for (let y = y0; y < y1; y++) n += 1 - r.bg[y * r.w + x];
  return n / Math.max(1, y1 - y0);
}

function cut(
  r: Raster,
  box: Box,
  depth: number,
  opts: { inkTol: number; minGap: number; rtl: boolean; rowsOnly: boolean },
  out: Box[],
) {
  const rows = segments(
    (y) => rowInk(r, y, box.x0, box.x1),
    box.y0,
    box.y1,
    opts.inkTol,
    opts.minGap,
  );
  if (rows.length === 0) return;
  if (rows.length > 1 && depth < 8) {
    for (const [y0, y1] of rows) {
      cut(r, { x0: box.x0, x1: box.x1, y0, y1 }, depth + 1, opts, out);
    }
    return;
  }
  // At the depth limit, keep every remaining row band in one box rather than dropping them.
  const y0 = rows[0][0];
  const y1 = rows[rows.length - 1][1];
  const cols = segments(
    (x) => colInk(r, x, y0, y1),
    box.x0,
    box.x1,
    opts.inkTol,
    opts.minGap,
  );
  if (cols.length === 0) return;
  if (cols.length > 1 && depth < 8 && !opts.rowsOnly) {
    const ordered = opts.rtl ? [...cols].reverse() : cols;
    for (const [x0, x1] of ordered) {
      cut(r, { x0, x1, y0, y1 }, depth + 1, opts, out);
    }
    return;
  }
  out.push({ x0: cols[0][0], x1: cols[cols.length - 1][1], y0, y1 });
}

function measure(r: Raster, b: Box): Omit<Panel, keyof Rect> {
  let ink = 0;
  let grad = 0;
  let n = 0;
  let cr = 0;
  let cg = 0;
  let cb = 0;
  const step = Math.max(1, Math.floor(Math.sqrt(((b.x1 - b.x0) * (b.y1 - b.y0)) / 20000)));
  for (let y = b.y0; y < b.y1 - 1; y += step) {
    for (let x = b.x0; x < b.x1 - 1; x += step) {
      const i = y * r.w + x;
      ink += 1 - r.bg[i];
      grad += Math.abs(r.lum[i] - r.lum[i + 1]) + Math.abs(r.lum[i] - r.lum[i + r.w]);
      cr += r.rgb[i * 4];
      cg += r.rgb[i * 4 + 1];
      cb += r.rgb[i * 4 + 2];
      n++;
    }
  }
  n = Math.max(1, n);
  return {
    ink: ink / n,
    // Raw mean gradient for now; normalised against the rest of the page later.
    intensity: grad / n / 255,
    color: `rgb(${Math.round(cr / n)}, ${Math.round(cg / n)}, ${Math.round(cb / n)})`,
  };
}

export interface DetectOptions {
  mode: ReadingMode;
  /** 0..1 — higher finds more (smaller) panels. */
  sensitivity: number;
}

export function detectPanelsFromImage(img: HTMLImageElement, opts: DetectOptions): Panel[] {
  const r = rasterize(img);
  const s = Math.max(0, Math.min(1, opts.sensitivity));
  const shortSide = Math.min(r.w, r.h);
  const inkTol = 0.004 + 0.028 * s;
  const minGap = Math.max(2, Math.round(shortSide * (0.014 - 0.009 * s)));
  const webtoon = opts.mode === 'webtoon';

  const boxes: Box[] = [];
  cut(
    r,
    { x0: 0, y0: 0, x1: r.w, y1: r.h },
    0,
    { inkTol, minGap, rtl: opts.mode === 'manga', rowsOnly: webtoon },
    boxes,
  );

  const pageArea = r.w * r.h;
  // For long webtoon strips, "small" is relative to the strip width, not its whole area.
  const minArea = webtoon ? r.w * r.w * 0.06 : pageArea * (0.014 - 0.008 * s);
  const minSide = (webtoon ? r.w * 0.06 : shortSide * 0.06);
  let kept = boxes.filter((b) => {
    const bw = b.x1 - b.x0;
    const bh = b.y1 - b.y0;
    return bw * bh >= minArea && bw >= minSide && bh >= minSide;
  });

  if (webtoon) {
    // Webtoon segments taller than ~1.6 screens get split so the camera keeps moving.
    const maxH = r.w * 2.2;
    kept = kept.flatMap((b) => {
      const bh = b.y1 - b.y0;
      if (bh <= maxH) return [b];
      const parts = Math.ceil(bh / maxH);
      const ph = bh / parts;
      return Array.from({ length: parts }, (_, k) => ({
        ...b,
        y0: Math.round(b.y0 + k * ph),
        y1: Math.round(b.y0 + (k + 1) * ph),
      }));
    });
  }

  if (kept.length === 0) kept = [{ x0: 0, y0: 0, x1: r.w, y1: r.h }];

  const pad = Math.max(1, Math.round(shortSide * 0.004));
  const panels = kept.map((b) => {
    const pb = {
      x0: Math.max(0, b.x0 - pad),
      y0: Math.max(0, b.y0 - pad),
      x1: Math.min(r.w, b.x1 + pad),
      y1: Math.min(r.h, b.y1 + pad),
    };
    return {
      x: pb.x0 / r.w,
      y: pb.y0 / r.h,
      w: (pb.x1 - pb.x0) / r.w,
      h: (pb.y1 - pb.y0) / r.h,
      ...measure(r, b),
    };
  });

  // "Action" score: busy line work (speed lines, impact bursts, SFX lettering)
  // that also stands out from the rest of the page. The relative test keeps
  // densely hatched art styles from making every panel an action panel.
  const raw = panels.map((p) => p.intensity).sort((a, b) => a - b);
  const median = Math.max(0.04, raw[Math.floor(raw.length / 2)]);
  for (const p of panels) {
    const absolute = Math.max(0, Math.min(1, (p.intensity - 0.03) / 0.1));
    const standsOut = panels.length > 1 && p.intensity >= median * 1.35;
    p.intensity = standsOut ? absolute : absolute * 0.45;
  }
  return panels;
}

const panelCache = new Map<string, Promise<Panel[]>>();

export function getPanels(src: string, opts: DetectOptions): Promise<Panel[]> {
  const key = `${src}|${opts.mode}|${opts.sensitivity.toFixed(2)}`;
  let p = panelCache.get(key);
  if (!p) {
    p = loadImage(src).then((img) => detectPanelsFromImage(img, opts));
    panelCache.set(key, p);
  }
  return p;
}

/** Drops cached decodes and detection results for an image that is no longer used. */
export function forgetImage(src: string) {
  imageCache.delete(src);
  for (const key of panelCache.keys()) {
    if (key.startsWith(`${src}|`)) panelCache.delete(key);
  }
}
