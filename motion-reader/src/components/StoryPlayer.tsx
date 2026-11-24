import { AnimatePresence, animate, motion, useMotionValue } from 'motion/react';
import {
  ArrowLeft,
  Maximize,
  Mic,
  MicOff,
  Pause,
  Play,
  Settings2,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toggleFullscreen, useIdleChrome, useLatest } from '../lib/hooks';
import { impact, whoosh } from '../lib/sound';
import { buildScenes, MOOD_THEMES } from '../lib/textScenes';
import type { Scene, Settings, TextBook } from '../types';
import { ChromeBar, IconButton, ProgressBar, SettingsSheet, SpeedButton } from './Chrome';
import { Particles, SfxBurst, Vignette } from './Effects';
import { EndCard } from './EndCard';

const canSpeak = typeof window !== 'undefined' && 'speechSynthesis' in window;

function useVoices() {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  useEffect(() => {
    if (!canSpeak) return;
    const load = () => setVoices(speechSynthesis.getVoices());
    load();
    speechSynthesis.addEventListener('voiceschanged', load);
    return () => speechSynthesis.removeEventListener('voiceschanged', load);
  }, []);
  return voices;
}

/** Words of a scene, in display order, with their offsets in the spoken string. */
function sceneWords(scene: Scene) {
  const spoken = scene.parts.map((p) => p.text).join(' ');
  const words: Array<{ text: string; start: number; part: number }> = [];
  let offset = 0;
  scene.parts.forEach((p, pi) => {
    for (const m of p.text.matchAll(/\S+/g)) {
      words.push({ text: m[0], start: offset + (m.index ?? 0), part: pi });
    }
    offset += p.text.length + 1;
  });
  return { spoken, words };
}

function splitChapterTitle(title: string) {
  const m = title.match(/^((?:chapter|part|book|act)\s+[\w.]+)\s*[:.\-—–]\s*(.+)$/i);
  return m ? { label: m[1], title: m[2] } : { label: '', title };
}

function isEmphasis(word: string) {
  const bare = word.replace(/[^A-Za-z]/g, '');
  return word.includes('!') || (bare.length >= 3 && bare === bare.toUpperCase());
}

function TitleCard({ scene, fx }: { scene: Scene; fx: boolean }) {
  const { label, title } = splitChapterTitle(scene.text);
  const theme = MOOD_THEMES[scene.mood];
  return (
    <div className="px-6 text-center">
      {label && (
        <motion.div
          initial={{ opacity: 0, letterSpacing: '0.8em' }}
          animate={{ opacity: 0.75, letterSpacing: '0.35em' }}
          transition={{ duration: 1.2 }}
          className="mb-4 text-xs font-semibold uppercase sm:text-sm"
          style={{ color: theme.accent }}
        >
          {label}
        </motion.div>
      )}
      <h1 className="text-balance font-display text-[clamp(36px,6.5vw,84px)] font-bold leading-[1.02] tracking-tight text-white">
        {[...title].map((ch, i) => (
          <motion.span
            key={i}
            className="inline-block whitespace-pre"
            initial={fx ? { opacity: 0, y: 60, rotate: (i % 2 ? 1 : -1) * 18, scale: 0.4 } : false}
            animate={{ opacity: 1, y: 0, rotate: 0, scale: 1 }}
            transition={{ delay: 0.25 + i * 0.035, type: 'spring', stiffness: 260, damping: 16 }}
          >
            {ch}
          </motion.span>
        ))}
      </h1>
      <motion.div
        className="mx-auto mt-6 h-px w-24"
        style={{ background: theme.accent }}
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ delay: 0.6, duration: 0.8 }}
      />
    </div>
  );
}

function TextCard({
  scene,
  fx,
  perWord,
  spokenWord,
  fontScale,
}: {
  scene: Scene;
  fx: boolean;
  perWord: number;
  spokenWord: number;
  fontScale: number;
}) {
  const { words } = useMemo(() => sceneWords(scene), [scene]);
  const theme = MOOD_THEMES[scene.mood];
  let quoteCount = 0;
  return (
    <div className="mx-auto w-full max-w-3xl space-y-5 px-5 sm:px-8" style={{ fontSize: `${fontScale}em` }}>
      {scene.parts.map((part, pi) => {
        const partWords = words.map((w, i) => ({ ...w, i })).filter((w) => w.part === pi);
        const spans = partWords.map((w) => {
          const emph = isEmphasis(w.text);
          const active = w.i === spokenWord;
          return (
            <Fragment key={w.i}>
              <motion.span
                className={`inline-block rounded-md transition-colors duration-200 ${emph ? 'font-bold' : ''}`}
                style={{
                  color: emph && !part.quoted ? theme.accent : undefined,
                  background: active ? `${theme.accent}55` : 'transparent',
                }}
                initial={fx ? { opacity: 0, y: '0.45em', filter: 'blur(8px)', scale: emph ? 1.6 : 1 } : false}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)', scale: 1 }}
                transition={{ delay: w.i * perWord, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
              >
                {w.text}
              </motion.span>{' '}
            </Fragment>
          );
        });
        if (part.quoted) {
          const right = quoteCount++ % 2 === 1;
          return (
            <motion.div
              key={pi}
              className={`flex ${right ? 'justify-end' : 'justify-start'}`}
              initial={fx ? { opacity: 0, scale: 0.6, rotate: right ? 4 : -4 } : false}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              transition={{ delay: (partWords[0]?.i ?? 0) * perWord, type: 'spring', stiffness: 260, damping: 18 }}
            >
              <div
                className={`relative max-w-[88%] rounded-[28px] bg-white px-6 py-4 text-[clamp(17px,2.3vw,26px)] font-semibold leading-snug text-ink shadow-[6px_6px_0_rgba(0,0,0,0.45)] ${
                  right ? 'rounded-br-md' : 'rounded-bl-md'
                }`}
              >
                {spans}
                <span
                  className={`absolute -bottom-3 h-6 w-6 rotate-45 bg-white ${right ? 'right-6' : 'left-6'}`}
                  style={{ clipPath: 'polygon(100% 0, 100% 100%, 0 100%)' }}
                />
              </div>
            </motion.div>
          );
        }
        return (
          <p
            key={pi}
            className="font-serif text-[clamp(20px,2.7vw,34px)] leading-[1.55] text-white [text-shadow:0_2px_18px_rgba(0,0,0,0.55)]"
          >
            {spans}
          </p>
        );
      })}
    </div>
  );
}

interface Props {
  book: TextBook;
  settings: Settings;
  onSettings: (p: Partial<Settings>) => void;
  onExit: () => void;
}

export function StoryPlayer({ book, settings, onSettings, onExit }: Props) {
  const scenes = useMemo(() => buildScenes(book), [book]);
  const [idx, setIdx] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [finished, setFinished] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [spokenWord, setSpokenWord] = useState(-1);
  const [sfx, setSfx] = useState({ text: '', n: 0 });
  const [chromeVisible, pokeChrome] = useIdleChrome(playing && !settingsOpen);
  const voices = useVoices();
  // Read through a ref so a late 'voiceschanged' doesn't restart the current utterance.
  const voicesRef = useLatest(voices);
  const shakeX = useMotionValue(0);

  const scene = scenes[idx];
  const theme = MOOD_THEMES[scene.mood];
  const fx = settings.effects !== 'off';
  const fullFx = settings.effects === 'full';
  const narrating = settings.narration && canSpeak;
  const speed = settings.speed;
  const perWord = fx ? Math.min(0.07, 2.4 / Math.max(1, scene.words)) / speed : 0;

  const live = useLatest({ idx, sound: settings.sound });
  const go = useCallback(
    (to: number) => {
      const target = Math.max(0, Math.min(scenes.length - 1, to));
      if (target === live.current.idx) return;
      setSpokenWord(-1);
      setFinished(false);
      setIdx(target);
      if (live.current.sound) whoosh(0.3);
    },
    [scenes.length, live],
  );
  const next = useCallback(() => {
    if (live.current.idx >= scenes.length - 1) {
      setFinished(true);
      setPlaying(false);
    } else go(live.current.idx + 1);
  }, [go, live, scenes.length]);
  const prev = useCallback(() => go(live.current.idx - 1), [go, live]);

  // Timed auto-advance (when not narrating).
  useEffect(() => {
    if (!playing || narrating || finished) return;
    const reveal = scene.words * perWord;
    const dwell =
      scene.kind === 'title' ? 3 / speed : reveal + 1.2 + scene.words / ((230 * speed) / 60);
    const t = window.setTimeout(next, dwell * 1000);
    return () => window.clearTimeout(t);
  }, [scene, playing, narrating, finished, perWord, speed, next]);

  // Narration with word-by-word highlighting.
  useEffect(() => {
    if (!canSpeak) return;
    if (!narrating || !playing || finished) {
      speechSynthesis.cancel();
      return;
    }
    const { spoken, words } = sceneWords(scene);
    const u = new SpeechSynthesisUtterance(spoken);
    const voice = voicesRef.current.find((v) => v.voiceURI === settings.voiceURI);
    if (voice) u.voice = voice;
    u.rate = Math.max(0.6, Math.min(1.8, speed));
    u.pitch = scene.mood === 'fear' || scene.mood === 'sad' ? 0.9 : scene.mood === 'joy' ? 1.1 : 1;
    let cancelled = false;
    let advanced = false;
    const advance = () => {
      if (cancelled || advanced) return;
      advanced = true;
      setSpokenWord(-1);
      window.setTimeout(() => !cancelled && next(), 450);
    };
    u.onboundary = (e) => {
      if (e.name && e.name !== 'word') return;
      let wi = 0;
      while (wi + 1 < words.length && words[wi + 1].start <= e.charIndex) wi++;
      setSpokenWord(wi);
    };
    u.onend = advance;
    // A failed voice must not freeze the story; cancel/interrupt come from our own cleanup.
    u.onerror = (e) => {
      if (e.error !== 'canceled' && e.error !== 'interrupted') advance();
    };
    // Small delay so the text animation leads the voice.
    const delay = scene.kind === 'title' ? 500 : 250;
    const t = window.setTimeout(() => {
      speechSynthesis.cancel();
      speechSynthesis.speak(u);
    }, delay);
    // Fallback if no end/error event ever arrives (e.g. Chrome's long-utterance cutoff).
    const fallback = window.setTimeout(advance, delay + 3000 + ((words.length / (2.5 * u.rate)) * 2000));
    return () => {
      cancelled = true;
      window.clearTimeout(t);
      window.clearTimeout(fallback);
      speechSynthesis.cancel();
    };
  }, [scene, narrating, playing, finished, voicesRef, settings.voiceURI, speed, next]);

  useEffect(() => () => {
    if (canSpeak) speechSynthesis.cancel();
  }, []);

  // Sound-effect words slam onto the screen.
  useEffect(() => {
    if (!fx || scene.sfx.length === 0) return;
    const t = window.setTimeout(() => {
      setSfx((s) => ({ text: scene.sfx[0], n: s.n + 1 }));
      if (settings.sound) impact();
      if (fullFx) animate(shakeX, [0, -18, 14, -9, 5, 0], { duration: 0.45 });
    }, Math.max(300, scene.words * perWord * 500));
    return () => window.clearTimeout(t);
  }, [scene, fx, fullFx, perWord, settings.sound, shakeX]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return;
      // Space on a focused button belongs to that button, not to play/pause.
      if (e.key === ' ' && e.target instanceof HTMLButtonElement) return;
      if (e.key === ' ' || e.key === 'k') {
        e.preventDefault();
        setPlaying((p) => !p);
      } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === 'PageDown') {
        e.preventDefault();
        next();
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp' || e.key === 'PageUp') {
        e.preventDefault();
        prev();
      } else if (e.key === 'f') toggleFullscreen();
      else if (e.key === 'n') onSettings({ narration: !settings.narration });
      else if (e.key === 'Escape' && !document.fullscreenElement) {
        if (settingsOpen) setSettingsOpen(false);
        else onExit();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [next, prev, onExit, onSettings, settings.narration, settingsOpen]);

  const chapterStarts = useMemo(
    () => scenes.map((s, i) => (s.kind === 'title' ? i : -1)).filter((i) => i >= 0),
    [scenes],
  );

  const down = useRef<{ x: number; y: number } | null>(null);
  const dwellGuess =
    scene.kind === 'title' ? 3 / speed : scene.words * perWord + 1.2 + scene.words / ((230 * speed) / 60);

  return (
    <div
      className="fixed inset-0 select-none overflow-hidden bg-ink text-white"
      onPointerDown={(e) => (down.current = { x: e.clientX, y: e.clientY })}
      onPointerUp={(e) => {
        const d = down.current;
        down.current = null;
        if (!d || settingsOpen || (e.target as HTMLElement).closest('[data-chrome]')) return;
        const dx = e.clientX - d.x;
        if (Math.abs(dx) > 50) return dx < 0 ? next() : prev();
        if (Math.abs(dx) > 10 || Math.abs(e.clientY - d.y) > 10) return;
        const fxr = e.clientX / window.innerWidth;
        if (fxr < 0.25) prev();
        else if (fxr > 0.75) next();
        else {
          pokeChrome();
          setPlaying((p) => !p);
        }
      }}
    >
      {/* Mood background */}
      <AnimatePresence initial={false}>
        <motion.div
          key={scene.mood}
          className="animated-gradient absolute inset-0"
          style={{
            backgroundImage: `linear-gradient(135deg, ${theme.gradient[0]}, ${theme.gradient[1]}, ${theme.gradient[2]}, ${theme.gradient[0]})`,
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.6 }}
        />
      </AnimatePresence>
      <div className="halftone pointer-events-none absolute inset-0 opacity-60" />
      {fx && <Particles variant={theme.particles} color={theme.accent} density={fullFx ? 1 : 0.45} />}
      <Vignette strength={0.55} />

      <motion.div className="absolute inset-0 flex items-center justify-center" style={{ x: shakeX }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={scene.id}
            className="flex max-h-full w-full items-center justify-center overflow-y-auto py-24 no-scrollbar"
            initial={fx ? { opacity: 0, y: 40, filter: 'blur(10px)' } : { opacity: 0 }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            exit={fx ? { opacity: 0, y: -40, filter: 'blur(10px)' } : { opacity: 0 }}
            transition={{ duration: 0.55 }}
          >
            <motion.div
              className="w-full"
              initial={{ scale: 1 }}
              animate={{ scale: fullFx ? 1.04 : 1 }}
              transition={{ duration: dwellGuess, ease: 'linear' }}
            >
              {scene.kind === 'title' ? (
                <TitleCard scene={scene} fx={fx} />
              ) : (
                <TextCard
                  scene={scene}
                  fx={fx}
                  perWord={perWord}
                  spokenWord={narrating ? spokenWord : -1}
                  fontScale={settings.fontScale}
                />
              )}
            </motion.div>
          </motion.div>
        </AnimatePresence>
      </motion.div>

      {fx && <SfxBurst text={sfx.text} trigger={sfx.n} color={theme.accent} />}

      <ChromeBar visible={chromeVisible} position="top">
        <div className="flex items-center gap-3">
          <IconButton label="Back to home" onClick={onExit}>
            <ArrowLeft size={20} />
          </IconButton>
          <div className="min-w-0 flex-1">
            <div className="truncate font-semibold">{book.title}</div>
            <select
              aria-label="Chapter"
              value={scene.chapterIndex}
              onChange={(e) => {
                const ci = Number(e.target.value);
                go(scenes.findIndex((s) => s.chapterIndex === ci));
              }}
              className="max-w-full truncate bg-transparent text-xs text-white/65 outline-none"
            >
              {book.chapters.map((c, i) => (
                <option key={i} value={i} className="bg-ink">
                  {c.title || `Chapter ${i + 1}`}
                </option>
              ))}
            </select>
          </div>
          <motion.span
            key={scene.mood}
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="hidden border border-white/20 px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-wider sm:inline"
            style={{ color: theme.accent }}
            title="Detected mood"
          >
            {theme.label}
          </motion.span>
          {canSpeak && (
            <IconButton
              label={settings.narration ? 'Stop narration' : 'Read aloud'}
              active={settings.narration}
              onClick={() => onSettings({ narration: !settings.narration })}
            >
              {settings.narration ? <Mic size={18} /> : <MicOff size={18} />}
            </IconButton>
          )}
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
            value={(idx + 1) / scenes.length}
            marks={chapterStarts.slice(1).map((i) => i / scenes.length)}
            onSeek={(f) => go(Math.floor(f * scenes.length))}
          />
          <div className="flex items-center justify-between">
            <div className="w-24 text-xs tabular-nums text-white/70">
              {idx + 1} / {scenes.length}
            </div>
            <div className="flex items-center gap-2">
              <IconButton label="Previous" onClick={prev}>
                <SkipBack size={20} />
              </IconButton>
              <IconButton big label={playing ? 'Pause' : 'Play'} onClick={() => setPlaying((p) => !p)}>
                {playing ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" className="ml-0.5" />}
              </IconButton>
              <IconButton label="Next" onClick={next}>
                <SkipForward size={20} />
              </IconButton>
            </div>
            <div className="flex w-24 justify-end">
              <SpeedButton speed={speed} onChange={(s) => onSettings({ speed: s })} />
            </div>
          </div>
        </div>
      </ChromeBar>

      <SettingsSheet
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        settings={settings}
        onSettings={onSettings}
        kind="text"
        voices={voices}
      />

      <EndCard
        show={finished}
        title={book.title}
        onRestart={() => {
          setFinished(false);
          setIdx(0);
          setPlaying(true);
        }}
        onExit={onExit}
      />
    </div>
  );
}
