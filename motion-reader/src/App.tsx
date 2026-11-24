import { AnimatePresence, motion } from 'motion/react';
import { BookOpen, Clapperboard, Play, ScrollText, X } from 'lucide-react';
import { useCallback, useState } from 'react';
import { ComicPlayer } from './components/ComicPlayer';
import { Landing, type DemoKind } from './components/Landing';
import { StoryPlayer } from './components/StoryPlayer';
import { WebtoonPlayer } from './components/WebtoonPlayer';
import { demoComic, demoStory, demoWebtoon } from './lib/demo';
import { useLatest, useSettings } from './lib/hooks';
import { loadFiles, releaseBook } from './lib/loaders';
import type { Book, ReadingMode } from './types';

type Stage =
  | { name: 'home' }
  | { name: 'loading'; label: string; progress: number }
  | { name: 'ready'; book: Book }
  | { name: 'reading'; book: Book; mode: ReadingMode };

const MODES: Array<{ value: ReadingMode; label: string; hint: string; icon: typeof BookOpen }> = [
  { value: 'comic', label: 'Comic', hint: 'Left → right', icon: Clapperboard },
  { value: 'manga', label: 'Manga', hint: 'Right → left', icon: BookOpen },
  { value: 'webtoon', label: 'Manhwa / Webtoon', hint: 'Vertical scroll', icon: ScrollText },
];

function ReadyCard({
  book,
  onStart,
  onClose,
}: {
  book: Book;
  onStart: (mode: ReadingMode) => void;
  onClose: () => void;
}) {
  const [mode, setMode] = useState<ReadingMode>(book.kind === 'visual' ? book.suggestedMode : 'comic');
  const words =
    book.kind === 'text'
      ? book.chapters.reduce((n, c) => n + c.paragraphs.join(' ').split(/\s+/).length, 0)
      : 0;
  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="glass relative w-full max-w-lg rounded-3xl p-6"
        initial={{ scale: 0.92, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.92, y: 20 }}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 rounded-full p-2 text-white/60 hover:bg-white/10 hover:text-white"
        >
          <X size={18} />
        </button>
        <div className="flex gap-5">
          {book.kind === 'visual' ? (
            <img
              src={book.pages[0].src}
              alt=""
              className="h-36 w-24 shrink-0 rounded-lg object-cover object-top shadow-xl"
            />
          ) : (
            <div className="grid h-36 w-24 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-accent to-accent-2 shadow-xl">
              <BookOpen size={34} />
            </div>
          )}
          <div className="min-w-0 pt-1">
            <div className="text-xs font-semibold uppercase tracking-wider text-accent">Ready to play</div>
            <h2 className="mt-1 line-clamp-2 text-2xl font-bold">{book.title}</h2>
            <p className="mt-2 text-sm text-white/60">
              {book.kind === 'visual'
                ? `${book.pages.length} page${book.pages.length === 1 ? '' : 's'} · panels are detected as you read`
                : `${book.chapters.length} chapter${book.chapters.length === 1 ? '' : 's'} · ${words.toLocaleString()} words`}
            </p>
          </div>
        </div>

        {book.kind === 'visual' ? (
          <div className="mt-6">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-white/45">Read as</div>
            <div className="grid grid-cols-3 gap-2">
              {MODES.map((m) => (
                <button
                  key={m.value}
                  type="button"
                  onClick={() => setMode(m.value)}
                  className={`rounded-2xl border p-3 text-left transition ${
                    mode === m.value ? 'border-accent bg-accent/15' : 'border-white/10 hover:bg-white/5'
                  }`}
                >
                  <m.icon size={18} className={mode === m.value ? 'text-accent' : 'text-white/60'} />
                  <div className="mt-2 text-sm font-semibold leading-tight">{m.label}</div>
                  <div className="text-[11px] text-white/50">{m.hint}</div>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <p className="mt-6 rounded-2xl bg-white/5 p-4 text-sm text-white/65">
            Your book will play as animated scenes with mood-based visuals, dialogue bubbles and optional read-aloud
            narration.
          </p>
        )}

        <button
          type="button"
          onClick={() => onStart(mode)}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-white py-3.5 font-semibold text-ink shadow-[0_10px_40px_rgba(255,77,109,0.35)] transition hover:scale-[1.02]"
        >
          <Play size={18} fill="currentColor" /> Start the show
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
  }, [stageRef]);

  const exit = useCallback(() => {
    if (document.fullscreenElement) void document.exitFullscreen();
    closeBook();
  }, [closeBook]);

  const setMode = useCallback(
    (mode: ReadingMode) => setStage((s) => (s.name === 'reading' ? { ...s, mode } : s)),
    [],
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
      <Landing onFiles={onFiles} onDemo={onDemo} />

      <AnimatePresence>
        {stage.name === 'loading' && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="w-72 text-center">
              <motion.div
                className="sfx-text mb-4 text-5xl text-yellow-300"
                animate={{ rotate: [-4, 4, -4], scale: [1, 1.08, 1] }}
                transition={{ duration: 1.2, repeat: Infinity }}
              >
                LOADING!
              </motion.div>
              <div className="h-1.5 overflow-hidden rounded-full bg-white/15">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-accent via-accent-2 to-accent-3"
                  animate={{ width: `${Math.max(6, stage.progress * 100)}%` }}
                />
              </div>
              <div className="mt-3 text-sm text-white/65">{stage.label}…</div>
            </div>
          </motion.div>
        )}
        {stage.name === 'ready' && (
          <ReadyCard
            key="ready"
            book={stage.book}
            onClose={closeBook}
            onStart={(mode) => setStage({ name: 'reading', book: stage.book, mode })}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {error && (
          <motion.div
            role="alert"
            className="fixed bottom-6 left-1/2 z-50 flex max-w-[calc(100vw-32px)] -translate-x-1/2 items-center gap-3 rounded-2xl border border-red-400/30 bg-red-950/90 px-4 py-3 text-sm shadow-xl"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
          >
            <span>{error}</span>
            <button type="button" onClick={() => setError('')} aria-label="Dismiss" className="text-white/60 hover:text-white">
              <X size={16} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
