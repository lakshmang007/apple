import { AnimatePresence, motion } from 'motion/react';
import { BookOpen, Check, Clapperboard, Link2, Play, ScrollText, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { copyText } from './components/Chrome';
import { ComicPlayer } from './components/ComicPlayer';
import { Landing, type DemoKind } from './components/Landing';
import { StoryPlayer } from './components/StoryPlayer';
import { WebtoonPlayer } from './components/WebtoonPlayer';
import { demoComic, demoStory, demoWebtoon } from './lib/demo';
import { useLatest, useSettings } from './lib/hooks';
import { loadFiles, releaseBook } from './lib/loaders';
import { linkFromAddress, loadFromUrl, setAddress, shareLinkFor } from './lib/remote';
import type { Book, ReadingMode } from './types';

type Stage =
  | { name: 'home' }
  | { name: 'loading'; label: string; progress: number }
  | { name: 'ready'; book: Book; mode?: ReadingMode }
  | { name: 'reading'; book: Book; mode: ReadingMode };

const MODES: Array<{ value: ReadingMode; label: string; hint: string; icon: typeof BookOpen }> = [
  { value: 'comic', label: 'Comic', hint: 'Left → right', icon: Clapperboard },
  { value: 'manga', label: 'Manga', hint: 'Right → left', icon: BookOpen },
  { value: 'webtoon', label: 'Manhwa / Webtoon', hint: 'Vertical scroll', icon: ScrollText },
];

function ShareBox({ link }: { link: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="mt-6">
      <div className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">Share link</div>
      <div className="flex">
        <input
          id="share-link"
          readOnly
          value={link}
          onFocus={(e) => e.currentTarget.select()}
          aria-label="Share link"
          className="min-w-0 flex-1 border border-r-0 border-slate-200 bg-slate-50 px-3 py-2 font-mono text-xs text-slate-600"
        />
        <button
          type="button"
          onClick={() => void copyText(link).then(setCopied)}
          className="flex shrink-0 cursor-pointer items-center gap-1.5 border border-slate-900 px-3 text-[11px] font-bold uppercase tracking-widest text-slate-900 transition-colors hover:bg-slate-900 hover:text-white"
        >
          {copied ? <Check size={14} /> : <Link2 size={14} />} {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <p className="mt-1.5 text-xs text-slate-500">Anyone with this link opens the same book. Nothing is uploaded.</p>
    </div>
  );
}

function ReadyCard({
  book,
  initialMode,
  onStart,
  onClose,
}: {
  book: Book;
  initialMode?: ReadingMode;
  onStart: (mode: ReadingMode) => void;
  onClose: () => void;
}) {
  const [mode, setMode] = useState<ReadingMode>(
    initialMode ?? (book.kind === 'visual' ? book.suggestedMode : 'comic'),
  );
  const words =
    book.kind === 'text'
      ? book.chapters.reduce((n, c) => n + c.paragraphs.join(' ').split(/\s+/).length, 0)
      : 0;
  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 p-4 backdrop-blur-xs"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="relative w-full max-w-lg border border-slate-200 bg-white p-6 text-slate-800 sm:p-8"
        initial={{ scale: 0.92, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.92, y: 20 }}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-3 top-3 cursor-pointer p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-900"
        >
          <X size={18} />
        </button>
        <div className="flex gap-5">
          {book.kind === 'visual' ? (
            <img
              src={book.pages[0].src}
              alt=""
              className="h-36 w-24 shrink-0 border border-slate-200 object-cover object-top"
            />
          ) : (
            <div className="grid h-36 w-24 shrink-0 place-items-center bg-slate-900 text-white">
              <BookOpen size={34} />
            </div>
          )}
          <div className="min-w-0 pt-1">
            <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Ready to play</div>
            <h2 className="mt-1 line-clamp-2 font-display text-2xl font-bold text-slate-900">{book.title}</h2>
            <p className="mt-2 text-sm text-slate-500">
              {book.kind === 'visual'
                ? `${book.pages.length} page${book.pages.length === 1 ? '' : 's'} · panels are detected as you read`
                : `${book.chapters.length} chapter${book.chapters.length === 1 ? '' : 's'} · ${words.toLocaleString()} words`}
            </p>
          </div>
        </div>

        {book.kind === 'visual' ? (
          <div className="mt-6">
            <div className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">Read as</div>
            <div className="grid grid-cols-3 gap-2">
              {MODES.map((m) => (
                <button
                  key={m.value}
                  type="button"
                  onClick={() => setMode(m.value)}
                  className={`cursor-pointer border p-3 text-left transition-colors ${
                    mode === m.value ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 hover:border-slate-900'
                  }`}
                >
                  <m.icon size={18} className={mode === m.value ? 'text-white' : 'text-slate-500'} />
                  <div className="mt-2 text-sm font-semibold leading-tight">{m.label}</div>
                  <div className={`text-[11px] ${mode === m.value ? 'text-slate-300' : 'text-slate-500'}`}>{m.hint}</div>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <p className="mt-6 border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
            Your book will play as animated scenes with mood-based visuals, dialogue bubbles and optional read-aloud
            narration.
          </p>
        )}

        {book.sourceUrl && (
          <ShareBox link={shareLinkFor(book.sourceUrl, book.kind === 'visual' ? mode : undefined)} />
        )}

        <button
          type="button"
          onClick={() => onStart(mode)}
          className="mt-6 flex w-full cursor-pointer items-center justify-center gap-2 bg-slate-900 py-3.5 text-xs font-bold uppercase tracking-widest text-white transition-colors hover:bg-slate-800"
        >
          <Play size={15} fill="currentColor" /> Start reading
        </button>
      </motion.div>
    </motion.div>
  );
}

export default function App() {
  const [stage, setStage] = useState<Stage>({ name: 'home' });
  const [error, setError] = useState('');
  const [settings, updateSettings] = useSettings();

  const onFiles = useCallback(async (files: File[]) => {
    setError('');
    setStage({ name: 'loading', label: 'Opening', progress: 0 });
    try {
      const book = await loadFiles(files, (label, progress) =>
        setStage({ name: 'loading', label, progress }),
      );
      setStage({ name: 'ready', book });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not open this file');
      setStage({ name: 'home' });
    }
  }, []);

  const onLink = useCallback(async (link: string, mode?: ReadingMode) => {
    setError('');
    setStage({ name: 'loading', label: 'Opening link', progress: 0 });
    try {
      const book = await loadFromUrl(link, (label, progress) =>
        setStage({ name: 'loading', label, progress }),
      );
      setStage({ name: 'ready', book, mode });
      if (book.sourceUrl) setAddress(book.sourceUrl, mode);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not open this link');
      setStage({ name: 'home' });
      setAddress(null);
    }
  }, []);

  // A shared address (?open=<link>&mode=manga) opens that book straight away.
  const openedFromAddress = useRef(false);
  useEffect(() => {
    if (openedFromAddress.current) return;
    openedFromAddress.current = true;
    const shared = linkFromAddress();
    if (shared) void onLink(shared.url, shared.mode);
  }, [onLink]);

  const onDemo = useCallback(async (kind: DemoKind) => {
    setError('');
    if (kind === 'story') {
      setStage({ name: 'reading', book: demoStory(), mode: 'comic' });
      return;
    }
    setStage({ name: 'loading', label: 'Drawing demo', progress: 0.5 });
    try {
      const book = kind === 'webtoon' ? await demoWebtoon() : await demoComic();
      setStage({ name: 'reading', book, mode: kind });
    } catch {
      setError('Could not render the demo in this browser');
      setStage({ name: 'home' });
    }
  }, []);

  // Leaving a book frees its page images; the same file can simply be opened again.
  const stageRef = useLatest(stage);
  const closeBook = useCallback(() => {
    const cur = stageRef.current;
    if (cur.name === 'ready' || cur.name === 'reading') releaseBook(cur.book);
    setStage({ name: 'home' });
    setAddress(null);
  }, [stageRef]);

  const exit = useCallback(() => {
    if (document.fullscreenElement) void document.exitFullscreen();
    closeBook();
  }, [closeBook]);

  const setMode = useCallback(
    (mode: ReadingMode) => {
      const cur = stageRef.current;
      if (cur.name !== 'reading') return;
      setStage({ ...cur, mode });
      if (cur.book.sourceUrl) setAddress(cur.book.sourceUrl, mode);
    },
    [stageRef],
  );

  if (stage.name === 'reading') {
    const { book, mode } = stage;
    if (book.kind === 'text') {
      return <StoryPlayer key="story" book={book} settings={settings} onSettings={updateSettings} onExit={exit} />;
    }
    if (mode === 'webtoon') {
      return (
        <WebtoonPlayer
          key="webtoon"
          book={book}
          settings={settings}
          onSettings={updateSettings}
          onMode={setMode}
          onExit={exit}
        />
      );
    }
    return (
      <ComicPlayer
        key="comic"
        book={book}
        mode={mode}
        settings={settings}
        onSettings={updateSettings}
        onMode={setMode}
        onExit={exit}
      />
    );
  }

  return (
    <>
      <Landing onFiles={onFiles} onLink={onLink} onDemo={onDemo} />

      <AnimatePresence>
        {stage.name === 'loading' && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 p-4 backdrop-blur-xs"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="w-80 max-w-full border border-slate-200 bg-white p-6">
              <div className="flex items-baseline justify-between">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Opening</span>
                <span className="font-mono text-xs tabular-nums text-slate-500">{Math.round(stage.progress * 100)}%</span>
              </div>
              <div className="mt-1 text-sm font-semibold text-slate-900">{stage.label}…</div>
              <div className="mt-4 h-1 overflow-hidden bg-slate-100">
                <motion.div
                  className="h-full bg-slate-900"
                  animate={{ width: `${Math.max(4, stage.progress * 100)}%` }}
                />
              </div>
            </div>
          </motion.div>
        )}
        {stage.name === 'ready' && (
          <ReadyCard
            key="ready"
            book={stage.book}
            initialMode={stage.mode}
            onClose={closeBook}
            onStart={(mode) => {
              setStage({ name: 'reading', book: stage.book, mode });
              if (stage.book.sourceUrl) setAddress(stage.book.sourceUrl, stage.book.kind === 'visual' ? mode : undefined);
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {error && (
          <motion.div
            role="alert"
            className="fixed bottom-6 left-1/2 z-50 flex max-w-[calc(100vw-32px)] -translate-x-1/2 items-center gap-3 border border-red-200 border-l-4 border-l-red-600 bg-white px-4 py-3 text-sm text-slate-800"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
          >
            <span>{error}</span>
            <button type="button" onClick={() => setError('')} aria-label="Dismiss" className="cursor-pointer text-slate-400 hover:text-slate-900">
              <X size={16} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
