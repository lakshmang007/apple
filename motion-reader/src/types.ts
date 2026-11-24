export type ReadingMode = 'comic' | 'manga' | 'webtoon';

/** Rectangle in normalized page coordinates (0..1). */
export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Panel extends Rect {
  /** 0..1 — how "busy" the art is (edge density). High values trigger action effects. */
  intensity: number;
  /** 0..1 — share of non-background pixels. */
  ink: number;
  /** Average colour of the panel, as an rgb() string. */
  color: string;
}

export interface PageImage {
  id: string;
  name: string;
  src: string;
  width: number;
  height: number;
}

export interface VisualBook {
  kind: 'visual';
  title: string;
  pages: PageImage[];
  suggestedMode: ReadingMode;
  /** The web link the book was opened from, if any (used for share links). */
  sourceUrl?: string;
}

export interface Chapter {
  title: string;
  paragraphs: string[];
}

export interface TextBook {
  kind: 'text';
  title: string;
  chapters: Chapter[];
  /** The web link the book was opened from, if any (used for share links). */
  sourceUrl?: string;
}

export type Book = VisualBook | TextBook;

export type Mood =
  | 'calm'
  | 'joy'
  | 'sad'
  | 'fear'
  | 'anger'
  | 'mystery'
  | 'action'
  | 'romance';

export interface ScenePart {
  text: string;
  quoted: boolean;
}

export interface Scene {
  id: string;
  chapterIndex: number;
  chapterTitle: string;
  kind: 'title' | 'text';
  text: string;
  parts: ScenePart[];
  mood: Mood;
  sfx: string[];
  words: number;
}

export type EffectsLevel = 'off' | 'subtle' | 'full';
export type TransitionStyle = 'slide' | 'zoom' | 'flip' | 'fade';

export interface Settings {
  speed: number;
  effects: EffectsLevel;
  transition: TransitionStyle;
  spotlight: boolean;
  overview: boolean;
  showPanels: boolean;
  sensitivity: number;
  sound: boolean;
  narration: boolean;
  voiceURI: string;
  fontScale: number;
}

export const DEFAULT_SETTINGS: Settings = {
  speed: 1,
  effects: 'full',
  transition: 'slide',
  spotlight: true,
  overview: true,
  showPanels: false,
  sensitivity: 0.5,
  sound: false,
  narration: false,
  voiceURI: '',
  fontScale: 1,
};
