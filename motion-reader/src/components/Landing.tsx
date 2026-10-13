import { animate, motion, useMotionValue } from 'motion/react';
import {
  BookOpen,
  Clapperboard,
  FileUp,
  Lock,
  Mic,
  MousePointerClick,
  ScanSearch,
  ScrollText,
  Sparkles,
  Upload,
  Wand2,
  Zap,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { demoComic } from '../lib/demo';
import { useElementSize } from '../lib/hooks';
import { ACCEPT } from '../lib/loaders';
import { getPanels } from '../lib/panelDetect';
import type { PageImage, Panel } from '../types';

export type DemoKind = 'comic' | 'manga' | 'webtoon' | 'story';

function HeroPreview() {
  const [frameRef, size] = useElementSize<HTMLDivElement>();
  const [page, setPage] = useState<PageImage | null>(null);
  const [panels, setPanels] = useState<Panel[]>([]);
  const [i, setI] = useState(0);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const s = useMotionValue(1);

  useEffect(() => {
    let alive = true;
    demoComic()
      .then(async (b) => {
        const p = b.pages[0];
        const found = await getPanels(p.src, { mode: 'comic', sensitivity: 0.5 });
        if (!alive) return;
        setPage(p);
        setPanels(found);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!page || !panels.length) return;
    const t = window.setInterval(() => setI((k) => (k + 1) % (panels.length + 1)), 2600);
    return () => window.clearInterval(t);
  }, [page, panels.length]);

  const W = size.width;
  const H = size.height;
  const base = page ? Math.min(W / page.width, H / page.height) * 0.94 : 1;
  const pw = page ? page.width * base : 0;
  const ph = page ? page.height * base : 0;
  const rect = useMemo(
    () => (i === 0 || !panels[i - 1] ? { x: 0, y: 0, w: 1, h: 1 } : panels[i - 1]),
    [i, panels],
  );

  useEffect(() => {
    if (!page || !W) return;
    const rw = rect.w * pw;
    const rh = rect.h * ph;
    const sc = Math.min((W * 0.9) / rw, (H * 0.9) / rh);
    const cx = (rect.x + rect.w / 2) * pw;
    const cy = (rect.y + rect.h / 2) * ph;
    const opts = { duration: 1.1, ease: [0.65, 0, 0.35, 1] as const };
    // The image is laid out at native size and scaled down, so zooms stay crisp.
    const c = [
      animate(x, W / 2 - cx * sc, opts),
      animate(y, H / 2 - cy * sc, opts),
      animate(s, (sc * pw) / page.width, opts),
    ];
    return () => c.forEach((a) => a.stop());
  }, [rect, page, W, H, pw, ph, x, y, s]);

  return (
    <div className="relative">
      <div className="absolute -inset-6 rounded-[40px] bg-gradient-to-tr from-accent/40 via-accent-2/30 to-accent-3/30 blur-3xl" />
      <div
        ref={frameRef}
        className="relative aspect-[4/3] overflow-hidden rounded-3xl border border-white/10 bg-black shadow-2xl"
      >
        {page && W > 0 && (
          <motion.div className="absolute left-0 top-0" style={{ x, y, scale: s, originX: 0, originY: 0, width: page.width, height: page.height }}>
            <img src={page.src} alt="Demo comic page" className="h-full w-full" draggable={false} />
            <motion.div
              className="absolute rounded-sm"
              animate={{
                left: `${rect.x * 100}%`,
                top: `${rect.y * 100}%`,
                width: `${rect.w * 100}%`,
                height: `${rect.h * 100}%`,
                opacity: i === 0 ? 0 : 1,
              }}
              transition={{ duration: 1.1, ease: [0.65, 0, 0.35, 1] }}
              style={{ boxShadow: '0 0 0 9000px rgba(6,6,12,0.8)' }}
            />
          </motion.div>
        )}
        {!page && (
          <div className="flex h-full items-center justify-center text-sm text-white/40">Rendering preview…</div>
        )}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_55%,rgba(0,0,0,0.6)_100%)]" />
        <div className="absolute bottom-3 left-3 flex items-center gap-2 rounded-full bg-black/60 px-3 py-1 text-[11px] font-semibold text-white/85 backdrop-blur">
          <span className="h-2 w-2 animate-pulse rounded-full bg-accent" />
          {i === 0 ? 'Page overview' : `Panel ${i} of ${panels.length}`}
        </div>
      </div>
    </div>
  );
}

const FEATURES = [
  { icon: ScanSearch, title: 'Automatic panel detection', text: 'Finds every panel on the page and orders it the way you read — left-to-right for comics, right-to-left for manga.' },
  { icon: Clapperboard, title: 'Cinematic camera', text: 'Smooth zooms, pans across wide shots, spotlight focus and page transitions turn static pages into motion.' },
  { icon: Zap, title: 'Action that hits', text: 'Busy, high-energy panels get speed lines, impact flashes, screen shake and sound effects.' },
  { icon: ScrollText, title: 'Manhwa & webtoon mode', text: 'Long strips are split into beats that glide in with parallax, focus dimming and hands-free auto-scroll.' },
  { icon: Wand2, title: 'Living novels', text: 'Text books become kinetic scenes: mood-based colour & weather, dialogue bubbles and SFX that slam on screen.' },
  { icon: Mic, title: 'Read-aloud narration', text: 'Built-in text-to-speech reads your book with word-by-word highlighting, and turns the page for you.' },
];

const FORMATS = ['JPG / PNG / WEBP', 'CBZ / ZIP', 'PDF', 'EPUB', 'TXT / MD'];

export function Landing({
  onFiles,
  onDemo,
}: {
  onFiles: (files: File[]) => void;
  onDemo: (kind: DemoKind) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);

  useEffect(() => {
    let depth = 0;
    const enter = (e: DragEvent) => {
      if (!e.dataTransfer?.types.includes('Files')) return;
      depth++;
      setDrag(true);
    };
    const leave = () => {
      depth = Math.max(0, depth - 1);
      if (depth === 0) setDrag(false);
    };
    const over = (e: DragEvent) => e.preventDefault();
    const drop = (e: DragEvent) => {
      e.preventDefault();
      depth = 0;
      setDrag(false);
      const files = Array.from(e.dataTransfer?.files ?? []);
      if (files.length) onFiles(files);
    };
    window.addEventListener('dragenter', enter);
    window.addEventListener('dragleave', leave);
    window.addEventListener('dragover', over);
    window.addEventListener('drop', drop);
    return () => {
      window.removeEventListener('dragenter', enter);
      window.removeEventListener('dragleave', leave);
      window.removeEventListener('dragover', over);
      window.removeEventListener('drop', drop);
    };
  }, [onFiles]);

  const pick = () => inputRef.current?.click();

  return (
    <div className="relative min-h-full overflow-x-hidden">
      <div className="halftone pointer-events-none absolute inset-0 opacity-50" />
      <div className="pointer-events-none absolute -left-40 -top-40 h-[520px] w-[520px] rounded-full bg-accent/25 blur-[120px]" />
      <div className="pointer-events-none absolute -right-40 top-40 h-[520px] w-[520px] rounded-full bg-accent-2/25 blur-[120px]" />

      <input
        ref={inputRef}
        type="file"
        multiple
        accept={ACCEPT}
        className="hidden"
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []);
          e.target.value = '';
          if (files.length) onFiles(files);
        }}
      />

      <nav className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
        <div className="flex items-center gap-2.5">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-accent to-accent-2 shadow-lg shadow-accent/30">
            <Sparkles size={18} />
          </div>
          <span className="font-comic text-2xl tracking-wider">MotionReader</span>
        </div>
        <div className="flex items-center gap-1 text-sm text-white/70">
          <a href="#how" className="rounded-full px-3 py-1.5 hover:bg-white/10 hover:text-white">How it works</a>
          <a href="#features" className="hidden rounded-full px-3 py-1.5 hover:bg-white/10 hover:text-white sm:block">Features</a>
        </div>
      </nav>

      <header className="relative z-10 mx-auto grid max-w-6xl items-center gap-12 px-5 pb-16 pt-6 lg:grid-cols-[1.05fr_1fr] lg:pt-14">
        <div>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-white/75"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-accent-3" /> Comics · Manga · Manhwa · Novels
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="text-[clamp(40px,6.4vw,76px)] font-extrabold leading-[1.02] tracking-tight"
          >
            Don't just read it.
            <br />
            <span className="text-gradient">Watch it move.</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12 }}
            className="mt-5 max-w-xl text-lg leading-relaxed text-white/65"
          >
            MotionReader turns any comic, manga, manhwa or book into an animated, cinematic experience — a camera that
            glides panel to panel, action that shakes the screen, and stories that change colour with their mood.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mt-8 flex flex-wrap gap-3"
          >
            <button
              type="button"
              onClick={pick}
              className="flex items-center gap-2 rounded-full bg-white px-6 py-3 font-semibold text-ink shadow-[0_10px_40px_rgba(255,77,109,0.35)] transition hover:scale-[1.03]"
            >
              <Upload size={18} /> Open a file
            </button>
            <button
              type="button"
              onClick={() => onDemo('comic')}
              className="flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-6 py-3 font-semibold transition hover:bg-white/10"
            >
              <Sparkles size={18} /> Watch the demo
            </button>
          </motion.div>
          <div className="mt-6 flex items-center gap-2 text-xs text-white/45">
            <Lock size={13} /> Runs 100% in your browser — files never leave your device.
          </div>
        </div>
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.15, duration: 0.6 }}>
          <HeroPreview />
        </motion.div>
      </header>

      <section className="relative z-10 mx-auto max-w-6xl px-5 pb-16">
        <button
          type="button"
          onClick={pick}
          className={`group flex w-full flex-col items-center justify-center gap-4 rounded-3xl border-2 border-dashed px-6 py-14 text-center transition ${
            drag ? 'border-accent bg-accent/10' : 'border-white/15 bg-white/[0.03] hover:border-white/30 hover:bg-white/[0.05]'
          }`}
        >
          <motion.div
            animate={drag ? { scale: 1.15, rotate: -6 } : { scale: 1, rotate: 0 }}
            className="grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-accent to-accent-2 shadow-lg shadow-accent/30"
          >
            <FileUp size={28} />
          </motion.div>
          <div>
            <div className="text-xl font-bold">{drag ? 'Drop it!' : 'Drop your comic, manga, manhwa or book here'}</div>
            <div className="mt-1 text-sm text-white/55">
              or click to browse — select several images at once to read them as pages
            </div>
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            {FORMATS.map((f) => (
              <span key={f} className="rounded-full bg-white/8 px-3 py-1 text-xs font-medium text-white/70">
                {f}
              </span>
            ))}
          </div>
        </button>
      </section>

      <section className="relative z-10 mx-auto max-w-6xl px-5 pb-20">
        <h2 className="mb-2 text-2xl font-bold">Try it instantly</h2>
        <p className="mb-6 text-white/55">No file handy? Pick a built-in demo.</p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {(
            [
              { kind: 'comic', icon: Clapperboard, title: 'Comic', text: 'Panel-by-panel camera with action effects.', grad: 'from-rose-500 to-orange-400' },
              { kind: 'manga', icon: BookOpen, title: 'Manga mode', text: 'Same pages, read right-to-left.', grad: 'from-fuchsia-500 to-violet-500' },
              { kind: 'webtoon', icon: ScrollText, title: 'Webtoon / Manhwa', text: 'Vertical strip with parallax & auto-scroll.', grad: 'from-sky-500 to-cyan-400' },
              { kind: 'story', icon: Wand2, title: 'Novel', text: 'Kinetic text, moods, SFX and narration.', grad: 'from-amber-400 to-pink-500' },
            ] as const
          ).map((d, k) => (
            <motion.button
              key={d.kind}
              type="button"
              onClick={() => onDemo(d.kind)}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: k * 0.06 }}
              whileHover={{ y: -6 }}
              className="group relative overflow-hidden rounded-3xl border border-white/10 bg-panel p-5 text-left"
            >
              <div className={`absolute -right-10 -top-10 h-32 w-32 rounded-full bg-gradient-to-br ${d.grad} opacity-30 blur-2xl transition group-hover:opacity-60`} />
              <div className={`mb-4 grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br ${d.grad}`}>
                <d.icon size={20} />
              </div>
              <div className="font-semibold">{d.title}</div>
              <div className="mt-1 text-sm text-white/55">{d.text}</div>
              <div className="mt-4 flex items-center gap-1.5 text-xs font-semibold text-white/80">
                <MousePointerClick size={14} /> Play demo
              </div>
            </motion.button>
          ))}
        </div>
      </section>

      <section id="features" className="relative z-10 mx-auto max-w-6xl px-5 pb-20">
        <h2 className="mb-8 text-center text-3xl font-bold">
          Reading, <span className="text-gradient">animated</span>
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f, k) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ delay: (k % 3) * 0.08 }}
              className="rounded-3xl border border-white/10 bg-white/[0.03] p-6"
            >
              <f.icon className="mb-4 text-accent" size={24} />
              <div className="mb-1.5 font-semibold">{f.title}</div>
              <p className="text-sm leading-relaxed text-white/55">{f.text}</p>
            </motion.div>
          ))}
        </div>
      </section>

      <section id="how" className="relative z-10 mx-auto max-w-6xl px-5 pb-24">
        <h2 className="mb-8 text-center text-3xl font-bold">How it works</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {[
            ['1', 'Open anything', 'Drop page images, a CBZ/ZIP archive, a PDF, an EPUB or a plain-text book.'],
            ['2', 'We analyse it', 'Panels and gutters are detected on-device; text is split into scenes and tagged with a mood.'],
            ['3', 'Press play', 'Sit back while the camera, effects and narration bring it to life — or step through at your own pace.'],
          ].map(([n, t, d]) => (
            <div key={n} className="relative rounded-3xl border border-white/10 bg-panel p-6">
              <div className="sfx-text mb-3 text-5xl text-yellow-300">{n}</div>
              <div className="mb-1 font-semibold">{t}</div>
              <p className="text-sm text-white/55">{d}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="relative z-10 border-t border-white/10 py-8 text-center text-xs text-white/40">
        MotionReader · Everything runs locally in your browser. Only open content you have the right to read.
      </footer>
    </div>
  );
}
