import { animate, motion, useMotionValue } from 'motion/react';
import {
  BookOpen,
  Clapperboard,
  FileUp,
  Link2,
  Mic,
  Play,
  ScanSearch,
  ScrollText,
  Type,
  Upload,
  Zap,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { demoComic } from '../lib/demo';
import { useElementSize } from '../lib/hooks';
import { ACCEPT } from '../lib/loaders';
import { getPanels } from '../lib/panelDetect';
import { FreeComics } from './FreeComics';
import { Logo } from './Logo';
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
    <div ref={frameRef} className="relative aspect-[4/3] w-full overflow-hidden bg-slate-950">
      {page && W > 0 && (
        <motion.div
          className="absolute left-0 top-0"
          style={{ x, y, scale: s, originX: 0, originY: 0, width: page.width, height: page.height }}
        >
          <img src={page.src} alt="Demo comic page being animated panel by panel" className="h-full w-full" draggable={false} />
          <motion.div
            className="absolute"
            animate={{
              left: `${rect.x * 100}%`,
              top: `${rect.y * 100}%`,
              width: `${rect.w * 100}%`,
              height: `${rect.h * 100}%`,
              opacity: i === 0 ? 0 : 1,
            }}
            transition={{ duration: 1.1, ease: [0.65, 0, 0.35, 1] }}
            style={{ boxShadow: '0 0 0 9000px rgba(2,6,23,0.78)' }}
          />
        </motion.div>
      )}
      {!page && (
        <div className="flex h-full items-center justify-center font-mono text-xs uppercase tracking-wider text-slate-500">
          Rendering preview…
        </div>
      )}
      <div className="absolute bottom-0 left-0 bg-white px-3 py-1.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-slate-900">
        {page ? (i === 0 ? 'Page overview' : `Panel ${i} / ${panels.length}`) : '—'}
      </div>
    </div>
  );
}

const FEATURES = [
  { icon: ScanSearch, title: 'Automatic panel detection', text: 'Finds every panel on the page and orders it the way you read — left-to-right for comics, right-to-left for manga.' },
  { icon: Clapperboard, title: 'Cinematic camera', text: 'Smooth zooms, pans across wide shots, spotlight focus and page transitions turn static pages into motion.' },
  { icon: Zap, title: 'Action that hits', text: 'Busy, high-energy panels get speed lines, impact flashes, screen shake and sound effects.' },
  { icon: ScrollText, title: 'Manhwa & webtoon mode', text: 'Long strips are split into beats that glide in with parallax, focus dimming and hands-free auto-scroll.' },
  { icon: BookOpen, title: 'Living novels', text: 'Text books become kinetic scenes: mood-based colour & weather, dialogue bubbles and SFX that slam on screen.' },
  { icon: Mic, title: 'Read-aloud narration', text: 'Built-in text-to-speech reads your book with word-by-word highlighting, and turns the page for you.' },
];

const FORMATS = ['JPG / PNG / WEBP', 'CBZ / ZIP', 'PDF', 'EPUB', 'TXT / MD'];

export function Landing({
  onFiles,
  onLink,
  onDemo,
}: {
  onFiles: (files: File[]) => void;
  onLink: (url: string) => void;
  onDemo: (kind: DemoKind) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const [link, setLink] = useState('');

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

  const nav = [
    { href: '#open', label: 'Open a file or link' },
    { href: '#demos', label: 'Demos' },
    { href: '#free', label: 'Find free comics' },
    { href: '#features', label: 'Features' },
    { href: '#how', label: 'How it works' },
  ];

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-slate-50 text-slate-800 lg:flex-row">
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

      <aside className="hidden w-72 shrink-0 flex-col bg-slate-950 text-white lg:flex">
        <div className="border-b border-slate-800 p-8">
          <div className="mb-4">
            <Logo inverted />
          </div>
          <div className="text-xs font-bold uppercase tracking-widest opacity-60">MotionReader</div>
          <div className="text-lg font-light text-slate-200">Animated reader</div>
        </div>
        <nav className="flex-1 space-y-1 px-4 py-8">
          {nav.map((n) => (
            <a
              key={n.href}
              href={n.href}
              className="block px-4 py-2.5 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-900 hover:text-white"
            >
              {n.label}
            </a>
          ))}
        </nav>
        <div className="border-t border-slate-800 p-8 font-mono text-[10px] uppercase tracking-wider text-slate-500">
          Runs in your browser.
          <br />
          Files stay on this device.
        </div>
      </aside>

      <div className="flex h-full flex-1 flex-col overflow-hidden">
        <header className="flex h-20 shrink-0 items-center justify-between gap-4 border-b border-slate-200 bg-white px-4 md:px-10">
          <div className="flex items-center gap-3">
            <div className="lg:hidden">
              <Logo size={32} />
            </div>
            <span className="text-sm font-bold uppercase tracking-widest text-slate-900 sm:text-base">
              Read in motion
            </span>
          </div>
          <div className="flex items-center gap-6">
            <div className="hidden text-right sm:block">
              <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Formats</div>
              <div className="text-xs font-semibold text-slate-700">Images · CBZ · PDF · EPUB · TXT</div>
            </div>
            <button
              type="button"
              onClick={pick}
              className="cursor-pointer whitespace-nowrap bg-slate-900 px-4 py-2.5 text-xs font-bold uppercase tracking-widest text-white transition-colors hover:bg-slate-800 sm:px-6"
            >
              Open a file
            </button>
          </div>
        </header>

        <main className="relative flex-1 overflow-y-auto bg-slate-50 p-4 sm:p-6 lg:p-10">
          <div aria-hidden className="halftone-drift pointer-events-none absolute inset-0 opacity-70" />
          <div className="relative mx-auto max-w-6xl space-y-6">
            <section className="grid gap-6 lg:grid-cols-[1fr_1.15fr]">
              <div className="flex min-w-0 flex-col border border-slate-200 bg-white p-6 sm:p-8">
                <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  Comics · Manga · Manhwa · Books
                </div>
                <h1 className="mt-3 font-display text-4xl font-bold tracking-tight text-balance text-slate-900 sm:text-5xl">
                  Every page, animated panel by panel.
                </h1>
                <p className="mt-4 max-w-prose text-slate-600">
                  Open a comic, manga, manhwa or book. MotionReader finds the panels, moves a camera through them in
                  reading order, and adds motion to the action. Novels play as scenes with read-aloud narration.
                </p>
                <dl className="mt-6 divide-y divide-slate-100 border-y border-slate-100 text-sm">
                  {[
                    ['Panel detection', 'On this device'],
                    ['Reading order', 'Left → right · Right → left · Vertical'],
                    ['Narration', 'Built-in text-to-speech'],
                  ].map(([k, v]) => (
                    <div key={k} className="flex flex-wrap justify-between gap-x-4 gap-y-1 py-2.5">
                      <dt className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{k}</dt>
                      <dd className="font-medium text-slate-700">{v}</dd>
                    </div>
                  ))}
                </dl>
                <div className="mt-6 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={pick}
                    className="flex cursor-pointer items-center gap-2 bg-slate-900 px-6 py-3 text-xs font-bold uppercase tracking-widest text-white transition-colors hover:bg-slate-800"
                  >
                    <Upload size={15} /> Open a file
                  </button>
                  <button
                    type="button"
                    onClick={() => onDemo('comic')}
                    className="flex cursor-pointer items-center gap-2 border border-slate-900 px-6 py-3 text-xs font-bold uppercase tracking-widest text-slate-900 transition-colors hover:bg-slate-900 hover:text-white"
                  >
                    <Play size={15} /> Watch the demo
                  </button>
                </div>
              </div>
              <div className="flex min-w-0 flex-col border border-slate-200 bg-white">
                <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Live preview</span>
                  <span className="font-mono text-[10px] uppercase tracking-wider text-slate-500">Demo comic · page 1</span>
                </div>
                <div className="flex flex-1 items-center p-4">
                  <HeroPreview />
                </div>
              </div>
            </section>

            <section id="open" className="space-y-4">
              <button
                type="button"
                onClick={pick}
                className={`flex w-full cursor-pointer flex-col items-center justify-center gap-4 border-2 border-dashed px-6 py-12 text-center transition-colors ${
                  drag ? 'border-slate-900 bg-slate-100' : 'border-slate-300 bg-white hover:border-slate-900'
                }`}
              >
                <div className="flex h-12 w-12 items-center justify-center bg-slate-900 text-white">
                  <FileUp size={22} />
                </div>
                <div>
                  <div className="text-sm font-bold uppercase tracking-widest text-slate-900">
                    {drag ? 'Drop to open' : 'Drop a comic, manga, manhwa or book'}
                  </div>
                  <div className="mt-1 text-sm text-slate-500">
                    or click to browse. Select several images at once to read them as pages.
                  </div>
                </div>
                <div className="flex flex-wrap justify-center gap-2">
                  {FORMATS.map((f) => (
                    <span key={f} className="border border-slate-200 px-2.5 py-1 font-mono text-[11px] text-slate-600">
                      {f}
                    </span>
                  ))}
                </div>
              </button>

              <form
                className="border border-slate-200 bg-white p-5 sm:p-6"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (link.trim()) onLink(link.trim());
                }}
              >
                <label htmlFor="link-input" className="text-sm font-bold uppercase tracking-widest text-slate-900">
                  Or open from a link
                </label>
                <p className="mt-1 text-sm text-slate-500">
                  Paste a link to a PDF, CBZ, EPUB, image or TXT file, or to a web page that shows the comic pages. It
                  opens without downloading anything yourself, as long as the other site allows it.
                </p>
                <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                  <input
                    id="link-input"
                    type="url"
                    inputMode="url"
                    required
                    value={link}
                    onChange={(e) => setLink(e.target.value)}
                    placeholder="https://example.com/my-comic.cbz"
                    className="min-w-0 flex-1 border border-slate-300 bg-white px-3 py-2.5 font-mono text-sm text-slate-800 placeholder:text-slate-400 focus:border-slate-900 focus:outline-none"
                  />
                  <button
                    type="submit"
                    className="flex shrink-0 cursor-pointer items-center justify-center gap-2 bg-slate-900 px-6 py-2.5 text-xs font-bold uppercase tracking-widest text-white transition-colors hover:bg-slate-800"
                  >
                    <Link2 size={15} /> Open link
                  </button>
                </div>
                <p className="mt-3 font-mono text-[11px] text-slate-400">
                  GitHub, Dropbox and Google Drive share links are converted to direct downloads automatically.
                </p>
              </form>
            </section>

            <section id="demos" className="space-y-3 pt-4">
              <div className="flex items-baseline justify-between">
                <h2 className="text-sm font-bold uppercase tracking-widest text-slate-900">Demos</h2>
                <span className="text-xs text-slate-500">No file needed</span>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {(
                  [
                    { kind: 'comic', icon: Clapperboard, title: 'Comic', text: 'Camera moves panel by panel, with action effects.' },
                    { kind: 'manga', icon: BookOpen, title: 'Manga', text: 'The same pages, read right to left.' },
                    { kind: 'webtoon', icon: ScrollText, title: 'Webtoon / Manhwa', text: 'A vertical strip with parallax and auto-scroll.' },
                    { kind: 'story', icon: Type, title: 'Novel', text: 'Text scenes with moods, dialogue and narration.' },
                  ] as const
                ).map((d) => (
                  <button
                    key={d.kind}
                    type="button"
                    onClick={() => onDemo(d.kind)}
                    className="group flex cursor-pointer flex-col border border-slate-200 bg-white p-5 text-left transition-colors hover:border-slate-900"
                  >
                    <div className="mb-4 flex h-10 w-10 items-center justify-center bg-slate-100 text-slate-900 transition-colors group-hover:bg-slate-900 group-hover:text-white">
                      <d.icon size={18} />
                    </div>
                    <div className="text-sm font-bold uppercase tracking-wider text-slate-900">{d.title}</div>
                    <div className="mt-1 flex-1 text-sm text-slate-500">{d.text}</div>
                    <div className="mt-4 font-mono text-[11px] font-semibold uppercase tracking-wider text-slate-900">
                      Play demo →
                    </div>
                  </button>
                ))}
              </div>
            </section>

            <FreeComics />

            <section id="features" className="space-y-3 pt-4">
              <h2 className="text-sm font-bold uppercase tracking-widest text-slate-900">Features</h2>
              <div className="grid gap-px border border-slate-200 bg-slate-200 sm:grid-cols-2 lg:grid-cols-3">
                {FEATURES.map((f) => (
                  <div key={f.title} className="min-w-0 bg-white p-6">
                    <f.icon className="mb-4 text-slate-900" size={20} />
                    <div className="mb-1.5 font-semibold text-slate-900">{f.title}</div>
                    <p className="text-sm leading-relaxed text-slate-500">{f.text}</p>
                  </div>
                ))}
              </div>
            </section>

            <section id="how" className="space-y-3 pt-4">
              <h2 className="text-sm font-bold uppercase tracking-widest text-slate-900">How it works</h2>
              <div className="grid gap-px border border-slate-200 bg-slate-200 md:grid-cols-3">
                {[
                  ['Open a file', 'Page images, a CBZ or ZIP archive, a PDF, an EPUB or a plain-text book.'],
                  ['It gets analysed', 'Panels and gutters are found on your device; text is split into scenes and given a mood.'],
                  ['Press play', 'The camera, effects and narration run on their own, or step through at your own pace.'],
                ].map(([t, d], k) => (
                  <div key={t} className="min-w-0 bg-white p-6">
                    <div className="mb-3 font-mono text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                      Step {k + 1}
                    </div>
                    <div className="mb-1 font-semibold text-slate-900">{t}</div>
                    <p className="text-sm text-slate-500">{d}</p>
                  </div>
                ))}
              </div>
            </section>

            <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 pt-6 font-mono text-[10px] uppercase tracking-wider text-slate-400">
              <span>MotionReader</span>
              <span>Only open content you have the right to read</span>
            </footer>
          </div>
        </main>
      </div>
    </div>
  );
}
