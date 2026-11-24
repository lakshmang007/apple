import {
  AnimatePresence,
  animate,
  motion,
  useIsPresent,
  useMotionValue,
  useSpring,
  useTransform,
  type AnimationPlaybackControls,
  type Variants,
} from 'motion/react';
import {
  ArrowLeft,
  Maximize,
  Pause,
  Play,
  Settings2,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toggleFullscreen, useElementSize, useIdleChrome, useLatest } from '../lib/hooks';
import { getPanels } from '../lib/panelDetect';
import { impact, pageTurn, whoosh } from '../lib/sound';
import type { PageImage, Panel, ReadingMode, Rect, Settings, VisualBook } from '../types';
import { ChromeBar, IconButton, ProgressBar, SettingsSheet, ShareButton, SpeedButton } from './Chrome';
import { shareLinkFor } from '../lib/remote';
import { Flash, Particles, SpeedLines, Vignette } from './Effects';
import { EndCard } from './EndCard';

const FULL: Rect = { x: 0, y: 0, w: 1, h: 1 };
const LAST = 1_000_000;
const INTENSE = 0.5;
const EASE_CAMERA: [number, number, number, number] = [0.65, 0, 0.35, 1];

interface Cam {
  x: number;
  y: number;
  s: number;
}

interface Shot {
  from: Cam;
  to: Cam;
  pan: boolean;
}

interface Layout {
  W: number;
  H: number;
  pw: number;
  ph: number;
  maxScale: number;
}

function layoutFor(page: PageImage, W: number, H: number): Layout {
  const base = Math.min((W * 0.96) / page.width, (H * 0.96) / page.height);
  const pw = page.width * base;
  const ph = page.height * base;
  // Never upscale far beyond the source resolution (keeps art crisp).
  const maxScale = Math.max(1, Math.min(6, (2.2 * page.width) / pw));
  return { W, H, pw, ph, maxScale };
}

const camAt = (L: Layout, cx: number, cy: number, s: number): Cam => ({
  x: L.W / 2 - cx * s,
  y: L.H / 2 - cy * s,
  s,
});

function computeShot(rect: Rect, L: Layout, rtl: boolean, overview: boolean): Shot {
  const { W, H, pw, ph, maxScale } = L;
  const rw = rect.w * pw;
  const rh = rect.h * ph;
  const ccx = (rect.x + rect.w / 2) * pw;
  const ccy = (rect.y + rect.h / 2) * ph;
  const pad = overview ? 0.96 : 0.86;
  const sContain = Math.min((W * pad) / rw, (H * pad) / rh);

  if (overview) {
    return { from: camAt(L, ccx, ccy, sContain), to: camAt(L, ccx, ccy, sContain * 1.03), pan: false };
  }

  const sCover = Math.max(W / rw, H / rh);
  const ratio = sCover / sContain;
  if (ratio > 1.6 && sContain < maxScale) {
    // Panel shape differs a lot from the screen: zoom in closer and pan across it.
    const s = Math.min(maxScale, sContain * Math.min(ratio * 0.85, 1.9));
    const halfW = W / s / 2;
    const halfH = H / s / 2;
    if (rw * s > W * 1.02) {
      let a = rect.x * pw + halfW * 0.92;
      let b = (rect.x + rect.w) * pw - halfW * 0.92;
      if (rtl) [a, b] = [b, a];
      return { from: camAt(L, a, ccy, s), to: camAt(L, b, ccy, s), pan: true };
    }
    if (rh * s > H * 1.02) {
      const a = rect.y * ph + halfH * 0.92;
      const b = (rect.y + rect.h) * ph - halfH * 0.92;
      return { from: camAt(L, ccx, a, s), to: camAt(L, ccx, b, s), pan: true };
    }
  }
  const s = Math.min(sContain, maxScale);
  const drift = (rtl ? -1 : 1) * rw * 0.012;
  return {
    from: camAt(L, ccx - drift, ccy, s),
    to: camAt(L, ccx + drift, ccy, s * 1.06),
    pan: false,
  };
}

function dwellFor(rect: Rect, pan: boolean, overview: boolean, speed: number) {
  if (overview) return 1.5 / speed;
  return (1.5 + 3.8 * Math.sqrt(rect.w * rect.h) + (pan ? 1.1 : 0)) / speed;
}

/* ------------------------------------------------------------------ */

interface CameraProps {
  page: PageImage;
  panels: Panel[] | undefined;
  cur: number;
  W: number;
  H: number;
  settings: Settings;
  rtl: boolean;
  onMove: (panel: Panel | null) => void;
  onArrive: (panel: Panel | null) => void;
  onShotDone: () => void;
}

function PageCamera({ page, panels, cur, W, H, settings, rtl, onMove, onArrive, onShotDone }: CameraProps) {
  const L = useMemo(() => layoutFor(page, W, H), [page, W, H]);
  const start = useMemo(() => computeShot(FULL, L, rtl, true).from, [L, rtl]);
  const x = useMotionValue(start.x);
  const y = useMotionValue(start.y);
  const s = useMotionValue(start.s);
  // The page is laid out near its native resolution and the camera scales it
  // *down*, so zoomed-in panels stay crisp instead of being upscaled bitmaps.
  const k = Math.min(1, 2400 / Math.max(page.width, page.height));
  const layoutW = page.width * k;
  const layoutH = page.height * k;
  const ratio = useRef(L.pw / layoutW);
  ratio.current = L.pw / layoutW;
  const renderScale = useTransform(s, (v) => v * ratio.current);
  const isPresent = useIsPresent();
  const present = useLatest(isPresent);
  const cbs = useLatest({ onMove, onArrive, onShotDone });
  const first = useRef(true);

  const overview = cur === -1 || !panels;
  const panel = !overview && panels ? panels[cur] : null;
  const rect = panel ?? FULL;
  const { speed } = settings;

  useEffect(() => {
    if (!present.current) return;
    const shot = computeShot(rect, L, rtl, overview);
    const dwell = dwellFor(rect, shot.pan, overview, speed);
    let cancelled = false;
    let running: AnimationPlaybackControls[] = [];
    const go = (to: Cam, opts: { duration: number; ease: typeof EASE_CAMERA | 'linear' | 'easeInOut' }) => {
      running = [animate(x, to.x, opts), animate(y, to.y, opts), animate(s, to.s, opts)];
      return Promise.all(running);
    };
    (async () => {
      if (panels) cbs.current.onMove(panel);
      const moveDur = first.current ? 0.5 : 0.95 / Math.sqrt(speed);
      first.current = false;
      await go(shot.from, { duration: moveDur, ease: EASE_CAMERA });
      if (cancelled || !present.current) return;
      if (panels) cbs.current.onArrive(panel);
      await go(shot.to, { duration: dwell, ease: shot.pan ? 'easeInOut' : 'linear' });
      if (cancelled || !present.current || !panels) return;
      cbs.current.onShotDone();
    })();
    return () => {
      cancelled = true;
      running.forEach((r) => r.stop());
    };
    // Only a new shot (or a new layout / speed) restarts the camera.
  }, [cur, panels, L, rtl, speed]);

  const spot = !overview && settings.spotlight && (panels?.length ?? 0) > 1;

  return (
    <motion.div
      className="absolute left-0 top-0 will-change-transform"
      style={{ x, y, scale: renderScale, originX: 0, originY: 0, width: layoutW, height: layoutH }}
    >
      <img
        src={page.src}
        alt={page.name}
        draggable={false}
        className="block h-full w-full select-none shadow-[0_30px_80px_rgba(0,0,0,0.6)]"
      />
      <motion.div
        className="pointer-events-none absolute"
        initial={false}
        animate={{
          left: `${rect.x * 100}%`,
          top: `${rect.y * 100}%`,
          width: `${rect.w * 100}%`,
          height: `${rect.h * 100}%`,
          opacity: spot ? 1 : 0,
        }}
        transition={{ duration: 0.95 / Math.sqrt(speed), ease: EASE_CAMERA }}
        style={{
          boxShadow: '0 0 0 9000px rgba(6,6,12,0.82), 0 0 40px 8px rgba(255,255,255,0.18)',
        }}
      />
      {settings.showPanels &&
        panels?.map((p, i) => (
          <div
            key={i}
            className={`pointer-events-none absolute border-4 ${i === cur ? 'border-amber-400' : 'border-white/70'}`}
            style={{ left: `${p.x * 100}%`, top: `${p.y * 100}%`, width: `${p.w * 100}%`, height: `${p.h * 100}%` }}
          >
            <span className="absolute left-0 top-0 rounded-br bg-black/80 px-2.5 py-0.5 text-2xl font-bold text-white">
              {i + 1}
              {p.intensity > INTENSE ? ' ⚡' : ''}
            </span>
          </div>
        ))}
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */

function pageVariants(style: Settings['transition']): Variants {
  switch (style) {
    case 'zoom':
      return {
        enter: { scale: 1.3, opacity: 0, filter: 'blur(12px)' },
        center: { scale: 1, opacity: 1, filter: 'blur(0px)' },
        exit: { scale: 0.75, opacity: 0, filter: 'blur(8px)' },
      };
    case 'flip':
      return {
        enter: (d: number) => ({ rotateY: d * 75, opacity: 0, transformPerspective: 1800 }),
        center: { rotateY: 0, opacity: 1, transformPerspective: 1800 },
        exit: (d: number) => ({ rotateY: d * -75, opacity: 0, transformPerspective: 1800 }),
      };
    case 'fade':
      return { enter: { opacity: 0 }, center: { opacity: 1 }, exit: { opacity: 0 } };
    default:
      return {
        enter: (d: number) => ({ x: `${d * 100}%`, opacity: 0.4 }),
        center: { x: '0%', opacity: 1 },
        exit: (d: number) => ({ x: `${d * -100}%`, opacity: 0.4 }),
      };
  }
}

interface Props {
  book: VisualBook;
  mode: Exclude<ReadingMode, 'webtoon'>;
  settings: Settings;
  onSettings: (p: Partial<Settings>) => void;
  onMode: (m: ReadingMode) => void;
  onExit: () => void;
}

export function ComicPlayer({ book, mode, settings, onSettings, onMode, onExit }: Props) {
  const { pages } = book;
  const rtl = mode === 'manga';
  const [stageRef, size] = useElementSize<HTMLDivElement>();
  const [pageIdx, setPageIdx] = useState(0);
  const [panelIdx, setPanelIdx] = useState(-1);
  const [dir, setDir] = useState(1);
  const [playing, setPlaying] = useState(true);
  const [finished, setFinished] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [panelMap, setPanelMap] = useState<Record<string, Panel[]>>({});
  const [activePanel, setActivePanel] = useState<Panel | null>(null);
  const [intense, setIntense] = useState(false);
  const [flash, setFlash] = useState(0);
  const [chromeVisible, pokeChrome] = useIdleChrome(playing && !settingsOpen);

  const detectKey = `${mode}|${settings.sensitivity}`;
  const page = pages[pageIdx];
  const panels = panelMap[`${detectKey}|${page.id}`];
  const hasOverview = !!panels && settings.overview && panels.length > 1;
  const minIdx = hasOverview ? -1 : 0;
  const cur = panels ? Math.max(minIdx, Math.min(panelIdx, panels.length - 1)) : -1;

  // Detect panels for the current page and its neighbours.
  useEffect(() => {
    let alive = true;
    for (const i of [pageIdx, pageIdx + 1, pageIdx - 1, pageIdx + 2]) {
      const pg = pages[i];
      if (!pg) continue;
      const key = `${detectKey}|${pg.id}`;
      getPanels(pg.src, { mode, sensitivity: settings.sensitivity })
        .then((p) => {
          if (alive) setPanelMap((m) => (m[key] ? m : { ...m, [key]: p }));
        })
        .catch(() => {
          if (alive) setPanelMap((m) => ({ ...m, [key]: [{ ...FULL, intensity: 0, ink: 1, color: 'rgb(40,40,60)' }] }));
        });
    }
    return () => {
      alive = false;
    };
  }, [pageIdx, pages, detectKey, mode, settings.sensitivity]);

  const live = useLatest({ pageIdx, cur, count: panels?.length, minIdx, playing, finished });

  const next = useCallback(() => {
    const st = live.current;
    if (st.count === undefined) return;
    if (st.cur < st.count - 1) {
      setPanelIdx(st.cur + 1);
    } else if (st.pageIdx < pages.length - 1) {
      setDir(1);
      setPageIdx(st.pageIdx + 1);
      setPanelIdx(-1);
      if (settings.sound) pageTurn();
    } else {
      setFinished(true);
      setPlaying(false);
    }
  }, [live, pages.length, settings.sound]);

  const prev = useCallback(() => {
    const st = live.current;
    setFinished(false);
    if (st.count !== undefined && st.cur > st.minIdx) {
      setPanelIdx(st.cur - 1);
    } else if (st.pageIdx > 0) {
      setDir(-1);
      setPageIdx(st.pageIdx - 1);
      setPanelIdx(LAST);
      if (settings.sound) pageTurn();
    }
  }, [live, settings.sound]);

  const jumpToPage = useCallback(
    (i: number) => {
      const target = Math.max(0, Math.min(pages.length - 1, i));
      setFinished(false);
      setDir(target >= live.current.pageIdx ? 1 : -1);
      setPageIdx(target);
      setPanelIdx(-1);
    },
    [live, pages.length],
  );

  // Auto-advance: a finished shot moves on only while playing; resuming after a
  // completed shot advances immediately.
  const shotDone = useRef(false);
  const onShotDone = useCallback(() => {
    shotDone.current = true;
    if (live.current.playing) next();
  }, [live, next]);
  useEffect(() => {
    if (playing && shotDone.current) next();
  }, [playing, next]);

  const effectsOn = settings.effects !== 'off';
  const fullFx = settings.effects === 'full';

  // Screen shake + pointer tilt.
  const shakeX = useMotionValue(0);
  const shakeY = useMotionValue(0);
  const tiltX = useSpring(0, { stiffness: 60, damping: 18 });
  const tiltY = useSpring(0, { stiffness: 60, damping: 18 });

  const onMove = useCallback(
    (p: Panel | null) => {
      shotDone.current = false;
      setIntense(false);
      if (settings.sound && p) whoosh(0.4);
    },
    [settings.sound],
  );

  const onArrive = useCallback(
    (p: Panel | null) => {
      setActivePanel(p);
      if (!p || !effectsOn || p.intensity <= INTENSE) return;
      setIntense(true);
      setFlash((f) => f + 1);
      if (settings.sound) impact();
      if (fullFx) {
        animate(shakeX, [0, -16, 13, -9, 6, -2, 0], { duration: 0.5 });
        animate(shakeY, [0, 9, -11, 7, -4, 1, 0], { duration: 0.5 });
      }
    },
    [effectsOn, fullFx, settings.sound, shakeX, shakeY],
  );

  // Keyboard controls.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return;
      // Space on a focused button belongs to that button, not to play/pause.
      if (e.key === ' ' && e.target instanceof HTMLButtonElement) return;
      const fwd = rtl ? 'ArrowLeft' : 'ArrowRight';
      const back = rtl ? 'ArrowRight' : 'ArrowLeft';
      if (e.key === ' ' || e.key === 'k') {
        e.preventDefault();
        setPlaying((p) => !p);
      } else if (e.key === fwd || e.key === 'ArrowDown' || e.key === 'PageDown') {
        e.preventDefault();
        next();
      } else if (e.key === back || e.key === 'ArrowUp' || e.key === 'PageUp') {
        e.preventDefault();
        prev();
      } else if (e.key === 'f') toggleFullscreen();
      else if (e.key === 'Escape' && !document.fullscreenElement) {
        if (settingsOpen) setSettingsOpen(false);
        else onExit();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [next, prev, rtl, onExit, settingsOpen]);

  // Tap / swipe navigation.
  const down = useRef<{ x: number; y: number; t: number } | null>(null);
  const onPointerDown = (e: React.PointerEvent) => {
    down.current = { x: e.clientX, y: e.clientY, t: Date.now() };
  };
  const onPointerUp = (e: React.PointerEvent) => {
    const d = down.current;
    down.current = null;
    if (!d || settingsOpen || (e.target as HTMLElement).closest('[data-chrome]')) return;
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) {
      const forward = dx < 0 !== rtl;
      if (forward) next();
      else prev();
      return;
    }
    if (Math.abs(dx) > 10 || Math.abs(dy) > 10) return;
    const r = e.currentTarget.getBoundingClientRect();
    const fx = (e.clientX - r.left) / r.width;
    if (fx < 0.28) (rtl ? next : prev)();
    else if (fx > 0.72) (rtl ? prev : next)();
    else {
      pokeChrome();
      setPlaying((p) => !p);
    }
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!fullFx || e.pointerType !== 'mouse') return;
    const r = e.currentTarget.getBoundingClientRect();
    tiltY.set(((e.clientX - r.left) / r.width - 0.5) * 4);
    tiltX.set(-((e.clientY - r.top) / r.height - 0.5) * 3);
  };

  const variants = useMemo(() => pageVariants(settings.transition), [settings.transition]);
  const visualDir = rtl ? -dir : dir;
  const glow = activePanel?.color ?? 'rgb(90,70,140)';
  const progress = (pageIdx + (panels ? (cur + 1) / (panels.length + (hasOverview ? 1 : 0)) : 0)) / pages.length;

  return (
    <div
      ref={stageRef}
      className="fixed inset-0 select-none overflow-hidden bg-ink text-white"
      style={{ perspective: 1400, touchAction: 'pan-y' }}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerMove={onPointerMove}
    >
      {/* Ambient backdrop: blurred page + glow tinted by the active panel */}
      <AnimatePresence initial={false}>
        <motion.img
          key={page.id}
          src={page.src}
          alt=""
          aria-hidden
          className="pointer-events-none absolute inset-0 h-full w-full scale-125 object-cover"
          style={{ filter: 'blur(48px) saturate(1.5)' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: effectsOn ? 0.35 : 0.15 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.2 }}
        />
      </AnimatePresence>
      <motion.div
        className="pointer-events-none absolute inset-0"
        animate={{ background: `radial-gradient(circle at 50% 50%, ${glow.replace('rgb', 'rgba').replace(')', ', 0.45)')} 0%, rgba(11,11,18,0) 70%)` }}
        transition={{ duration: 1.2 }}
      />
      {effectsOn && (
        <Particles
          variant={intense ? 'streaks' : 'motes'}
          color={intense ? '#ffffff' : '#ffe8c2'}
          density={fullFx ? 1 : 0.45}
        />
      )}

      <motion.div
        className="absolute inset-0"
        style={{ x: shakeX, y: shakeY, rotateX: tiltX, rotateY: tiltY }}
      >
        {size.width > 0 && (
          <AnimatePresence initial={false} custom={visualDir}>
            <motion.div
              key={page.id}
              className="absolute inset-0"
              custom={visualDir}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.75, ease: [0.4, 0, 0.2, 1] }}
            >
              <PageCamera
                page={page}
                panels={panels}
                cur={cur}
                W={size.width}
                H={size.height}
                settings={settings}
                rtl={rtl}
                onMove={onMove}
                onArrive={onArrive}
                onShotDone={onShotDone}
              />
            </motion.div>
          </AnimatePresence>
        )}
      </motion.div>

      {effectsOn && <SpeedLines show={intense} opacity={fullFx ? 0.35 : 0.18} />}
      {effectsOn && <Flash trigger={flash} />}
      {effectsOn && <Vignette strength={fullFx ? 0.7 : 0.5} />}

      {!panels && (
        <div className="pointer-events-none absolute left-1/2 top-20 -translate-x-1/2 bg-white px-3 py-1.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-slate-900">
          Detecting panels…
        </div>
      )}

      <ChromeBar visible={chromeVisible} position="top">
        <div className="flex items-center gap-3">
          <IconButton label="Back to home" onClick={onExit}>
            <ArrowLeft size={20} />
          </IconButton>
          <div className="min-w-0 flex-1">
            <div className="truncate font-semibold">{book.title}</div>
            <div className="text-xs text-white/60">
              {rtl ? 'Manga · right to left' : 'Comic · left to right'}
            </div>
          </div>
          <IconButton label={settings.sound ? 'Mute' : 'Unmute'} onClick={() => onSettings({ sound: !settings.sound })}>
            {settings.sound ? <Volume2 size={19} /> : <VolumeX size={19} />}
          </IconButton>
          {book.sourceUrl && <ShareButton link={shareLinkFor(book.sourceUrl, mode)} />}
          <IconButton label="Fullscreen" onClick={toggleFullscreen}>
            <Maximize size={18} />
          </IconButton>
          <IconButton label="Settings" active={settingsOpen} onClick={() => setSettingsOpen((o) => !o)}>
            <Settings2 size={19} />
          </IconButton>
        </div>
      </ChromeBar>

      <ChromeBar visible={chromeVisible} position="bottom">
        <div className="mx-auto max-w-3xl space-y-2">
          <ProgressBar
            value={progress}
            marks={pages.length <= 60 ? pages.map((_, i) => i / pages.length).slice(1) : []}
            onSeek={(f) => jumpToPage(Math.floor(f * pages.length))}
          />
          <div className="flex items-center justify-between gap-2">
            <div className="w-28 text-xs tabular-nums text-white/70 sm:w-40">
              Page {pageIdx + 1}/{pages.length}
              {panels && cur >= 0 && (
                <span className="hidden sm:inline">
                  {' '}
                  · Panel {cur + 1}/{panels.length}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <IconButton label={rtl ? 'Next' : 'Previous'} onClick={rtl ? next : prev}>
                <SkipBack size={20} />
              </IconButton>
              <IconButton big label={playing ? 'Pause' : 'Play'} onClick={() => setPlaying((p) => !p)}>
                {playing ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" className="ml-0.5" />}
              </IconButton>
              <IconButton label={rtl ? 'Previous' : 'Next'} onClick={rtl ? prev : next}>
                <SkipForward size={20} />
              </IconButton>
            </div>
            <div className="flex w-28 justify-end sm:w-40">
              <SpeedButton speed={settings.speed} onChange={(speed) => onSettings({ speed })} />
            </div>
          </div>
        </div>
      </ChromeBar>

      <SettingsSheet
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        settings={settings}
        onSettings={onSettings}
        kind="visual"
        mode={mode}
        onMode={onMode}
      />

      <EndCard
        show={finished}
        title={book.title}
        onRestart={() => {
          jumpToPage(0);
          setPlaying(true);
        }}
        onExit={onExit}
      />
    </div>
  );
}
