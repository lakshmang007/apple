import {
  animate,
  motion,
  useInView,
  useMotionValue,
  useScroll,
  useTransform,
  type MotionValue,
} from 'motion/react';
import { ArrowLeft, House, Maximize, Pause, Play, RotateCcw, Settings2, Volume2, VolumeX } from 'lucide-react';
import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import { toggleFullscreen, useIdleChrome, useLatest } from '../lib/hooks';
import { getPanels } from '../lib/panelDetect';
import { impact } from '../lib/sound';
import type { PageImage, Panel, ReadingMode, Settings, VisualBook } from '../types';
import { ChromeBar, IconButton, ProgressBar, SettingsSheet, SpeedButton } from './Chrome';
import { Flash, Particles, SpeedLines } from './Effects';

const INTENSE = 0.5;

function shade(color: string, k: number) {
  const m = color.match(/\d+/g);
  if (!m) return color;
  const [r, g, b] = m.map(Number);
  return `rgb(${Math.round(r * k)}, ${Math.round(g * k)}, ${Math.round(b * k)})`;
}

interface SegmentProps {
  page: PageImage;
  panel: Panel;
  id: string;
  pageIndex: number;
  scrollRef: RefObject<HTMLDivElement | null>;
  settings: Settings;
  onEnter: (id: string, panel: Panel, pageIndex: number) => void;
}

function Segment({ page, panel, id, pageIndex, scrollRef, settings, onEnter }: SegmentProps) {
  const ref = useRef<HTMLDivElement>(null);
  const fx = settings.effects;
  const { scrollYProgress } = useScroll({
    target: ref,
    container: scrollRef,
    offset: ['start end', 'end start'],
  });
  const range = fx === 'full' ? 5 : fx === 'subtle' ? 2.5 : 0;
  const parallax = useTransform(scrollYProgress, [0, 1], [`${-range}%`, `${range}%`]);
  const focus = useTransform(scrollYProgress, [0, 0.22, 0.78, 1], fx === 'off' ? [1, 1, 1, 1] : [0.3, 1, 1, 0.3]);
  // "Entered" = crosses the middle of the screen, so segments taller than the viewport count too.
  const inView = useInView(ref, { root: scrollRef, margin: '-45% 0px -45% 0px' });
  const enter = useLatest(onEnter);

  useEffect(() => {
    if (inView) enter.current(id, panel, pageIndex);
  }, [inView, id, panel, pageIndex, enter]);

  const aspect = (panel.w * page.width) / (panel.h * page.height);

  return (
    <motion.div ref={ref} style={{ opacity: focus }} className="relative">
      <motion.div
        initial={fx === 'off' ? false : { opacity: 0, y: 70, scale: 0.94, rotate: fx === 'full' ? (pageIndex % 2 ? 1 : -1) : 0 }}
        whileInView={{ opacity: 1, y: 0, scale: 1, rotate: 0 }}
        viewport={{ root: scrollRef, amount: 0.12 }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        className="relative w-full overflow-hidden"
        style={{ aspectRatio: aspect }}
      >
        <motion.div className="absolute inset-0" style={{ y: parallax, scale: range ? 1 + range / 50 : 1 }}>
          <img
            src={page.src}
            alt=""
            draggable={false}
            className="absolute max-w-none select-none"
            style={{
              width: `${100 / panel.w}%`,
              height: `${100 / panel.h}%`,
              left: `${(-panel.x / panel.w) * 100}%`,
              top: `${(-panel.y / panel.h) * 100}%`,
            }}
          />
        </motion.div>
        {settings.showPanels && (
          <div className="pointer-events-none absolute inset-0 border-2 border-amber-400">
            <span className="absolute left-0 top-0 bg-black/80 px-1.5 text-[10px] font-bold">
              {id} {panel.intensity > INTENSE ? '⚡' : ''}
            </span>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

function Shaker({ x, y, children }: { x: MotionValue<number>; y: MotionValue<number>; children: React.ReactNode }) {
  return (
    <motion.div className="absolute inset-0" style={{ x, y }}>
      {children}
    </motion.div>
  );
}

interface Props {
  book: VisualBook;
  settings: Settings;
  onSettings: (p: Partial<Settings>) => void;
  onMode: (m: ReadingMode) => void;
  onExit: () => void;
}

export function WebtoonPlayer({ book, settings, onSettings, onMode, onExit }: Props) {
  const { pages } = book;
  const scrollRef = useRef<HTMLDivElement>(null);
  const [panelMap, setPanelMap] = useState<Record<string, Panel[]>>({});
  const [playing, setPlaying] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [progress, setProgress] = useState(0);
  const [pageIdx, setPageIdx] = useState(0);
  const [ambient, setAmbient] = useState('rgb(40, 30, 70)');
  const [intense, setIntense] = useState(false);
  const [flash, setFlash] = useState(0);
  const [chromeVisible] = useIdleChrome(playing && !settingsOpen);
  const holdUntil = useRef(0);
  const lastImpact = useRef('');
  const shakeX = useMotionValue(0);
  const shakeY = useMotionValue(0);

  const detectKey = `webtoon|${settings.sensitivity}`;

  // Detect segments for every page progressively, in order.
  useEffect(() => {
    let alive = true;
    (async () => {
      for (const pg of pages) {
        const key = `${detectKey}|${pg.id}`;
        let p: Panel[];
        try {
          p = await getPanels(pg.src, { mode: 'webtoon', sensitivity: settings.sensitivity });
        } catch {
          p = [{ x: 0, y: 0, w: 1, h: 1, intensity: 0, ink: 1, color: 'rgb(40,40,60)' }];
        }
        if (!alive) return;
        setPanelMap((m) => (m[key] ? m : { ...m, [key]: p }));
      }
    })();
    return () => {
      alive = false;
    };
  }, [pages, detectKey, settings.sensitivity]);

  const live = useLatest({ settings });
  const onEnter = useCallback(
    (id: string, panel: Panel, pi: number) => {
      const { settings: st } = live.current;
      setAmbient(panel.color);
      setPageIdx(pi);
      const hot = panel.intensity > INTENSE && st.effects !== 'off';
      setIntense(hot);
      if (hot && lastImpact.current !== id) {
        lastImpact.current = id;
        setFlash((f) => f + 1);
        if (st.sound) impact();
        if (st.effects === 'full') {
          animate(shakeX, [0, -12, 10, -7, 4, 0], { duration: 0.45 });
          animate(shakeY, [0, 7, -8, 5, -2, 0], { duration: 0.45 });
        }
      }
    },
    [live, shakeX, shakeY],
  );

  // Auto-scroll.
  useEffect(() => {
    const el = scrollRef.current;
    if (!playing || !el) return;
    let raf = 0;
    let last = performance.now();
    let acc = 0;
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (now > holdUntil.current) {
        acc += 85 * settings.speed * (el.clientHeight / 900) * dt;
        if (acc >= 1) {
          const step = Math.floor(acc);
          el.scrollTop += step;
          acc -= step;
        }
        if (el.scrollTop + el.clientHeight >= el.scrollHeight - 2) {
          setPlaying(false);
          return;
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, settings.speed]);

  const hold = () => {
    holdUntil.current = performance.now() + 1400;
  };

  const scrollByScreen = useCallback((dir: number) => {
    const el = scrollRef.current;
    if (!el) return;
    hold();
    el.scrollBy({ top: dir * el.clientHeight * 0.8, behavior: 'smooth' });
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return;
      // Space on a focused button belongs to that button, not to play/pause.
      if (e.key === ' ' && e.target instanceof HTMLButtonElement) return;
      if (e.key === ' ' || e.key === 'k') {
        e.preventDefault();
        setPlaying((p) => !p);
      } else if (e.key === 'ArrowDown' || e.key === 'PageDown' || e.key === 'ArrowRight') {
        e.preventDefault();
        scrollByScreen(1);
      } else if (e.key === 'ArrowUp' || e.key === 'PageUp' || e.key === 'ArrowLeft') {
        e.preventDefault();
        scrollByScreen(-1);
      } else if (e.key === 'f') toggleFullscreen();
      else if (e.key === 'Escape' && !document.fullscreenElement) {
        if (settingsOpen) setSettingsOpen(false);
        else onExit();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [scrollByScreen, onExit, settingsOpen]);

  const fx = settings.effects;
  const restart = () => {
    scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    setTimeout(() => setPlaying(true), 900);
  };

  return (
    <div className="fixed inset-0 overflow-hidden bg-ink text-white">
      <motion.div
        className="pointer-events-none absolute inset-0"
        animate={{
          background: `radial-gradient(ellipse at 50% 40%, ${shade(ambient, 0.55)} 0%, ${shade(ambient, 0.12)} 55%, rgb(11, 11, 18) 100%)`,
        }}
        transition={{ duration: 1.4 }}
      />
      {fx !== 'off' && (
        <Particles variant={intense ? 'streaks' : 'motes'} color={intense ? '#fff' : '#ffe8c2'} density={fx === 'full' ? 1 : 0.4} />
      )}

      <Shaker x={shakeX} y={shakeY}>
        <div
          ref={scrollRef}
          className="absolute inset-0 overflow-y-auto overflow-x-hidden no-scrollbar"
          onWheel={hold}
          onTouchStart={hold}
          onTouchMove={hold}
          onTouchEnd={hold}
          onScroll={(e) => {
            const el = e.currentTarget;
            setProgress(el.scrollTop / Math.max(1, el.scrollHeight - el.clientHeight));
          }}
        >
          <div className="mx-auto w-full max-w-[760px] px-2 pb-8 sm:px-4">
            <header className="flex min-h-[70vh] flex-col items-center justify-center text-center">
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.9 }}
                className="text-[10px] font-bold uppercase tracking-widest text-slate-400"
              >
                Webtoon mode
              </motion.div>
              <motion.h1
                initial={{ opacity: 0, scale: 0.8, filter: 'blur(12px)' }}
                animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                transition={{ duration: 1.1, delay: 0.2 }}
                className="mt-3 max-w-xl text-balance font-display text-4xl font-bold tracking-tight text-white sm:text-5xl"
              >
                {book.title}
              </motion.h1>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1 }}
                className="mt-4 text-sm text-slate-400"
              >
                {playing ? 'Auto-scrolling… scroll anytime to take over' : 'Scroll down or press play'}
              </motion.p>
              <motion.div
                className="mt-8 h-12 w-7 border border-white/30"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.2 }}
              >
                <motion.div
                  className="mx-auto mt-2 h-2.5 w-px bg-white/70"
                  animate={{ y: [0, 16, 0] }}
                  transition={{ duration: 1.6, repeat: Infinity }}
                />
              </motion.div>
            </header>

            <div className="space-y-[6vh]">
              {pages.map((pg, pi) => {
                const segs = panelMap[`${detectKey}|${pg.id}`];
                if (!segs) {
                  return (
                    <div
                      key={pg.id}
                      className="w-full animate-pulse bg-white/5"
                      style={{ aspectRatio: pg.width / pg.height }}
                    />
                  );
                }
                return segs.map((panel, si) => (
                  <Segment
                    key={`${pg.id}-${si}`}
                    id={`${pi + 1}.${si + 1}`}
                    page={pg}
                    panel={panel}
                    pageIndex={pi}
                    scrollRef={scrollRef}
                    settings={settings}
                    onEnter={onEnter}
                  />
                ));
              })}
            </div>

            <footer className="flex min-h-[60vh] flex-col items-center justify-center gap-6 text-center">
              <motion.div
                initial={{ y: 16, opacity: 0 }}
                whileInView={{ y: 0, opacity: 1 }}
                viewport={{ root: scrollRef, amount: 0.6 }}
                transition={{ duration: 0.4 }}
                className="font-display text-4xl font-bold tracking-tight text-white"
              >
                The end
              </motion.div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={restart}
                  className="flex cursor-pointer items-center gap-2 bg-white px-5 py-2.5 text-xs font-bold uppercase tracking-widest text-slate-900 transition-colors hover:bg-slate-200"
                >
                  <RotateCcw size={16} /> Read again
                </button>
                <button
                  type="button"
                  onClick={onExit}
                  className="flex cursor-pointer items-center gap-2 border border-white/30 px-5 py-2.5 text-xs font-bold uppercase tracking-widest text-white transition-colors hover:border-white"
                >
                  <House size={16} /> Home
                </button>
              </div>
            </footer>
          </div>
        </div>
      </Shaker>

      {fx !== 'off' && <SpeedLines show={intense} opacity={fx === 'full' ? 0.28 : 0.14} />}
      {fx !== 'off' && <Flash trigger={flash} />}

      <ChromeBar visible={chromeVisible} position="top">
        <div className="flex items-center gap-3">
          <IconButton label="Back to home" onClick={onExit}>
            <ArrowLeft size={20} />
          </IconButton>
          <div className="min-w-0 flex-1">
            <div className="truncate font-semibold">{book.title}</div>
            <div className="text-xs text-white/60">
              Webtoon · {pages.length > 1 ? `image ${pageIdx + 1}/${pages.length}` : 'vertical scroll'}
            </div>
          </div>
          <IconButton label={settings.sound ? 'Mute' : 'Unmute'} onClick={() => onSettings({ sound: !settings.sound })}>
            {settings.sound ? <Volume2 size={19} /> : <VolumeX size={19} />}
          </IconButton>
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
            onSeek={(f) => {
              const el = scrollRef.current;
              if (!el) return;
              hold();
              el.scrollTo({ top: f * (el.scrollHeight - el.clientHeight), behavior: 'smooth' });
            }}
          />
          <div className="flex items-center justify-between">
            <div className="w-24 text-xs tabular-nums text-white/70">{Math.round(progress * 100)}%</div>
            <IconButton big label={playing ? 'Pause auto-scroll' : 'Auto-scroll'} onClick={() => setPlaying((p) => !p)}>
              {playing ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" className="ml-0.5" />}
            </IconButton>
            <div className="flex w-24 justify-end">
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
        mode="webtoon"
        onMode={onMode}
      />
    </div>
  );
}
