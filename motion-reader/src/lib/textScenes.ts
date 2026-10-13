import type { Mood, Scene, ScenePart, TextBook } from '../types';

/** Small keyword lexicon used to give every passage an emotional "colour". */
const LEXICON: Record<Exclude<Mood, 'calm'>, string[]> = {
  joy: ['laugh', 'smile', 'happy', 'joy', 'delight', 'cheer', 'bright', 'sun', 'celebrat', 'grin', 'glad', 'wonderful', 'warm', 'sparkl', 'festival', 'dance', 'giggl', 'hope'],
  sad: ['cry', 'tear', 'weep', 'sad', 'sorrow', 'grief', 'lonely', 'alone', 'loss', 'lost', 'mourn', 'rain', 'goodbye', 'funeral', 'empty', 'regret', 'sigh', 'broken', 'miss'],
  fear: ['fear', 'afraid', 'terror', 'scream', 'tremb', 'shiver', 'dread', 'horror', 'panic', 'ghost', 'monster', 'creep', 'shadow', 'nightmare', 'blood', 'dead', 'death'],
  anger: ['anger', 'angry', 'rage', 'fury', 'furious', 'hate', 'shout', 'yell', 'glare', 'clench', 'snarl', 'curse', 'burn', 'fire', 'flame', 'revenge'],
  mystery: ['mystery', 'secret', 'strange', 'whisper', 'fog', 'mist', 'hidden', 'ancient', 'riddle', 'unknown', 'night', 'moon', 'magic', 'spell', 'rune', 'door', 'key', 'silence'],
  action: ['run', 'ran', 'jump', 'leap', 'strike', 'punch', 'kick', 'slash', 'sword', 'fight', 'battle', 'explo', 'crash', 'chase', 'dash', 'charge', 'attack', 'blast', 'race', 'smash', 'fast'],
  romance: ['love', 'kiss', 'heart', 'embrace', 'blush', 'tender', 'gentle', 'beloved', 'darling', 'hold', 'hand', 'together', 'cheek', 'lips', 'soft'],
};

const SFX_WORDS = new Set([
  'boom', 'bang', 'crash', 'pow', 'wham', 'bam', 'kaboom', 'whoosh', 'swoosh', 'thud', 'crack',
  'smash', 'zap', 'slam', 'splash', 'roar', 'rumble', 'clang', 'snap', 'thump', 'woosh', 'kapow',
  'zoom', 'crunch', 'bzzt', 'ring', 'knock', 'pop', 'shatter', 'boom!', 'click',
]);

export function detectMood(text: string, fallback: Mood = 'calm'): Mood {
  const lower = text.toLowerCase();
  let best: Mood = fallback;
  let bestScore = 0;
  for (const [mood, words] of Object.entries(LEXICON) as [Mood, string[]][]) {
    let score = 0;
    for (const w of words) {
      let idx = lower.indexOf(w);
      while (idx !== -1) {
        // Count only matches that start a word.
        if (idx === 0 || !/[a-z]/.test(lower[idx - 1])) score++;
        idx = lower.indexOf(w, idx + w.length);
      }
    }
    if (mood === 'action') score += (text.match(/!/g)?.length ?? 0) * 0.5;
    if (score > bestScore) {
      bestScore = score;
      best = mood;
    }
  }
  return bestScore >= 1 ? best : fallback;
}

function findSfx(text: string): string[] {
  const out: string[] = [];
  for (const raw of text.split(/[\s,;:—–-]+/)) {
    const word = raw.replace(/^[^A-Za-z]+|[^A-Za-z!]+$/g, '');
    const bare = word.replace(/!+$/, '').toLowerCase();
    if (!bare) continue;
    const shouted = word.length >= 3 && word === word.toUpperCase() && /[A-Z]{3,}/.test(word);
    // Stretched onomatopoeia like "BOOOM" or "whooosh".
    const squashed = bare.replace(/(.)\1{2,}/g, '$1$1').replace(/(.)\1+/g, '$1');
    const stretched = /(.)\1{2,}/.test(bare);
    const isSfxWord = SFX_WORDS.has(bare) || SFX_WORDS.has(squashed);
    // Plain words like "ring" or "crack" only count when they are shouted or stretched.
    if (
      (isSfxWord && (word.endsWith('!') || shouted || stretched)) ||
      (shouted && word.endsWith('!'))
    ) {
      out.push(word.replace(/!+$/, '').toUpperCase() + '!');
    }
  }
  return [...new Set(out)].slice(0, 2);
}

const QUOTE_RE = /("[^"]+"|“[^”]+”|«[^»]+»|「[^」]+」|'[^']{2,}'(?=[\s,.!?;:]|$)|‘[^’]+’(?=[\s,.!?;:]|$))/g;

export function splitQuotes(text: string): ScenePart[] {
  const parts: ScenePart[] = [];
  let last = 0;
  for (const m of text.matchAll(QUOTE_RE)) {
    const idx = m.index ?? 0;
    if (idx > last) parts.push({ text: text.slice(last, idx).trim(), quoted: false });
    parts.push({ text: m[0].slice(1, -1).trim(), quoted: true });
    last = idx + m[0].length;
  }
  if (last < text.length) parts.push({ text: text.slice(last).trim(), quoted: false });
  return parts.filter((p) => p.text.length > 0);
}

/** Split long paragraphs into screen-sized chunks on sentence boundaries. */
function chunk(paragraph: string, max = 300): string[] {
  if (paragraph.length <= max) return [paragraph];
  const sentences = paragraph.match(/[^.!?…]+[.!?…]+["”’)\]]*\s*|[^.!?…]+$/g) ?? [paragraph];
  const out: string[] = [];
  let buf = '';
  for (const s of sentences) {
    if (buf && (buf + s).length > max) {
      out.push(buf.trim());
      buf = '';
    }
    buf += s;
  }
  if (buf.trim()) out.push(buf.trim());
  return out;
}

export function buildScenes(book: TextBook): Scene[] {
  const scenes: Scene[] = [];
  let mood: Mood = 'calm';
  book.chapters.forEach((ch, ci) => {
    const chapterTitle = ch.title || (book.chapters.length > 1 ? `Chapter ${ci + 1}` : book.title);
    scenes.push({
      id: `t${ci}`,
      chapterIndex: ci,
      chapterTitle,
      kind: 'title',
      text: chapterTitle,
      parts: [{ text: chapterTitle, quoted: false }],
      mood: detectMood(ch.paragraphs.slice(0, 4).join(' '), 'mystery'),
      sfx: [],
      words: chapterTitle.split(/\s+/).length,
    });

    // Merge very short paragraphs (e.g. one-line dialogue) so screens are not too sparse.
    const merged: string[] = [];
    for (const p of ch.paragraphs) {
      const prev = merged[merged.length - 1];
      if (prev && prev.length < 90 && p.length < 140) merged[merged.length - 1] = `${prev} ${p}`;
      else merged.push(p);
    }

    merged.forEach((p, pi) => {
      // Moods drift: keep the previous mood unless the passage clearly signals a new one.
      mood = detectMood(p, mood === 'action' || mood === 'anger' ? 'calm' : mood);
      chunk(p).forEach((text, k) => {
        scenes.push({
          id: `s${ci}-${pi}-${k}`,
          chapterIndex: ci,
          chapterTitle,
          kind: 'text',
          text,
          parts: splitQuotes(text),
          mood,
          sfx: findSfx(text),
          words: text.split(/\s+/).length,
        });
      });
    });
  });
  return scenes;
}

export interface MoodTheme {
  label: string;
  gradient: [string, string, string];
  accent: string;
  particles: 'motes' | 'sparkles' | 'rain' | 'embers' | 'fog' | 'streaks' | 'hearts' | 'snow';
  emoji: string;
}

export const MOOD_THEMES: Record<Mood, MoodTheme> = {
  calm: { label: 'Calm', gradient: ['#0f2027', '#203a43', '#2c5364'], accent: '#9be7ff', particles: 'motes', emoji: '🌙' },
  joy: { label: 'Joy', gradient: ['#ff9a44', '#fc6076', '#7b3fe4'], accent: '#ffe08a', particles: 'sparkles', emoji: '✨' },
  sad: { label: 'Sorrow', gradient: ['#1e2a3a', '#2f3e5c', '#465a7f'], accent: '#a8c0ff', particles: 'rain', emoji: '🌧️' },
  fear: { label: 'Fear', gradient: ['#050505', '#1a0a1f', '#3a0d1c'], accent: '#ff5470', particles: 'fog', emoji: '👁️' },
  anger: { label: 'Fury', gradient: ['#2b0000', '#7a0d0d', '#c2410c'], accent: '#ffb347', particles: 'embers', emoji: '🔥' },
  mystery: { label: 'Mystery', gradient: ['#0b0423', '#2a0f4d', '#145c6e'], accent: '#b794f6', particles: 'snow', emoji: '🔮' },
  action: { label: 'Action', gradient: ['#111827', '#7c2d12', '#ea580c'], accent: '#fde047', particles: 'streaks', emoji: '⚡' },
  romance: { label: 'Romance', gradient: ['#3b0a2a', '#9d174d', '#f472b6'], accent: '#ffd1e8', particles: 'hearts', emoji: '💗' },
};
