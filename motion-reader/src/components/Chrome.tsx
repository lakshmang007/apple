import { AnimatePresence, motion } from 'motion/react';
import { Check, Link2, X } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import type { EffectsLevel, ReadingMode, Settings, TransitionStyle } from '../types';

export function IconButton({
  label,
  onClick,
  active,
  children,
  big,
  disabled,
}: {
  label: string;
  onClick: () => void;
  active?: boolean;
  children: ReactNode;
  big?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled}
      // Don't take focus on mouse clicks, so a later Space press goes to the play/pause shortcut.
      onMouseDown={(e) => e.preventDefault()}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={`flex shrink-0 cursor-pointer items-center justify-center transition-colors disabled:opacity-30 ${
        big
          ? 'h-12 w-12 bg-white text-slate-900 hover:bg-slate-200'
          : `h-10 w-10 hover:bg-white/10 ${active ? 'bg-white/15 text-white' : 'text-slate-300 hover:text-white'}`
      }`}
    >
      {children}
    </button>
  );
}

export function ChromeBar({
  visible,
  position,
  children,
}: {
  visible: boolean;
  position: 'top' | 'bottom';
  children: ReactNode;
}) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: position === 'top' ? -20 : 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: position === 'top' ? -20 : 20 }}
          transition={{ duration: 0.25 }}
          data-chrome
          onClick={(e) => e.stopPropagation()}
          className={`absolute inset-x-0 z-30 px-3 sm:px-5 ${
            position === 'top'
              ? 'top-0 border-b border-white/10 bg-slate-950/90 py-2.5 backdrop-blur-sm'
              : 'bottom-0 border-t border-white/10 bg-slate-950/90 pb-4 pt-3 backdrop-blur-sm'
          }`}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function ProgressBar({
  value,
  marks = [],
  onSeek,
}: {
  value: number;
  marks?: number[];
  onSeek: (fraction: number) => void;
}) {
  return (
    <div
      role="slider"
      aria-label="Progress"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(value * 100)}
      tabIndex={0}
      className="group relative h-5 cursor-pointer"
      onClick={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        onSeek(Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)));
      }}
    >
      <div className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 overflow-hidden bg-white/15 transition-all group-hover:h-1.5">
        <motion.div
          className="h-full bg-white"
          animate={{ width: `${value * 100}%` }}
          transition={{ type: 'spring', stiffness: 120, damping: 24 }}
        />
      </div>
      {marks.map((m, i) => (
        <div
          key={i}
          className="absolute top-1/2 h-2.5 w-px -translate-y-1/2 bg-white/40"
          style={{ left: `${m * 100}%` }}
        />
      ))}
    </div>
  );
}

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];

export function SpeedButton({ speed, onChange }: { speed: number; onChange: (s: number) => void }) {
  return (
    <button
      type="button"
      title="Playback speed"
      onClick={(e) => {
        e.stopPropagation();
        const i = SPEEDS.findIndex((s) => s >= speed - 0.01);
        onChange(SPEEDS[(i + 1) % SPEEDS.length]);
      }}
      onMouseDown={(e) => e.preventDefault()}
      className="h-9 min-w-12 cursor-pointer px-2.5 font-mono text-xs font-semibold tabular-nums text-slate-300 hover:bg-white/10 hover:text-white"
    >
      {speed}×
    </button>
  );
}

function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: Array<{ value: T; label: string }>;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex border border-slate-200 bg-slate-100 p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`flex-1 cursor-pointer px-2 py-1.5 text-[11px] font-bold uppercase tracking-wider transition-colors ${
            value === o.value ? 'bg-slate-900 text-white' : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Toggle({ label, hint, checked, onChange }: { label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 py-1.5">
      <span>
        <span className="block text-sm font-medium text-slate-800">{label}</span>
        {hint && <span className="block text-xs text-slate-500">{hint}</span>}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 shrink-0 cursor-pointer transition-colors ${checked ? 'bg-slate-900' : 'bg-slate-300'}`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 bg-white transition-all ${checked ? 'left-[22px]' : 'left-0.5'}`}
        />
      </button>
    </label>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{title}</div>
      {children}
    </div>
  );
}

export function SettingsSheet({
  open,
  onClose,
  settings,
  onSettings,
  kind,
  mode,
  onMode,
  voices = [],
}: {
  open: boolean;
  onClose: () => void;
  settings: Settings;
  onSettings: (p: Partial<Settings>) => void;
  kind: 'visual' | 'text';
  mode?: ReadingMode;
  onMode?: (m: ReadingMode) => void;
  voices?: SpeechSynthesisVoice[];
}) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            data-chrome
            className="absolute inset-0 z-40 bg-slate-950/50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
          />
          <motion.aside
            data-chrome
            onClick={(e) => e.stopPropagation()}
            initial={{ x: 40, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 40, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="absolute bottom-0 right-0 top-0 z-50 w-[min(360px,100vw)] space-y-6 overflow-y-auto border-l border-slate-200 bg-white p-6 text-slate-900 no-scrollbar"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold uppercase tracking-widest">Reader settings</h2>
              <button
                type="button"
                aria-label="Close settings"
                onClick={onClose}
                className="-mr-2 cursor-pointer p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
              >
                <X size={18} />
              </button>
            </div>

            {kind === 'visual' && mode && onMode && (
              <Section title="Reading mode">
                <Segmented<ReadingMode>
                  value={mode}
                  onChange={onMode}
                  options={[
                    { value: 'comic', label: 'Comic →' },
                    { value: 'manga', label: '← Manga' },
                    { value: 'webtoon', label: 'Webtoon ↓' },
                  ]}
                />
              </Section>
            )}

            <Section title="Motion effects">
              <Segmented<EffectsLevel>
                value={settings.effects}
                onChange={(effects) => onSettings({ effects })}
                options={[
                  { value: 'off', label: 'Off' },
                  { value: 'subtle', label: 'Subtle' },
                  { value: 'full', label: 'Full' },
                ]}
              />
            </Section>

            {kind === 'visual' && mode !== 'webtoon' && (
              <>
                <Section title="Page transition">
                  <Segmented<TransitionStyle>
                    value={settings.transition}
                    onChange={(transition) => onSettings({ transition })}
                    options={[
                      { value: 'slide', label: 'Slide' },
                      { value: 'zoom', label: 'Zoom' },
                      { value: 'flip', label: 'Flip' },
                      { value: 'fade', label: 'Fade' },
                    ]}
                  />
                </Section>
                <Section title="Camera">
                  <Toggle
                    label="Spotlight focus"
                    hint="Dim everything except the active panel"
                    checked={settings.spotlight}
                    onChange={(spotlight) => onSettings({ spotlight })}
                  />
                  <Toggle
                    label="Page overview first"
                    hint="Show the whole page before zooming in"
                    checked={settings.overview}
                    onChange={(overview) => onSettings({ overview })}
                  />
                </Section>
              </>
            )}

            {kind === 'visual' && (
              <Section title="Panel detection">
                <Toggle
                  label="Show detected panels"
                  checked={settings.showPanels}
                  onChange={(showPanels) => onSettings({ showPanels })}
                />
                <div className="pt-1">
                  <div className="mb-1 flex justify-between text-xs text-slate-500">
                    <span>Fewer, larger</span>
                    <span>More, smaller</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={settings.sensitivity}
                    onChange={(e) => onSettings({ sensitivity: Number(e.target.value) })}
                    className="w-full"
                    aria-label="Detection sensitivity"
                  />
                </div>
              </Section>
            )}

            {kind === 'text' && (
              <>
                <Section title="Narration">
                  <Toggle
                    label="Read aloud"
                    hint="Uses your device's text-to-speech"
                    checked={settings.narration}
                    onChange={(narration) => onSettings({ narration })}
                  />
                  {voices.length > 0 && (
                    <select
                      value={settings.voiceURI}
                      onChange={(e) => onSettings({ voiceURI: e.target.value })}
                      className="w-full border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800"
                      aria-label="Voice"
                    >
                      <option value="">Default voice</option>
                      {voices.map((v) => (
                        <option key={v.voiceURI} value={v.voiceURI}>
                          {v.name} ({v.lang})
                        </option>
                      ))}
                    </select>
                  )}
                </Section>
                <Section title="Text size">
                  <input
                    type="range"
                    min={0.8}
                    max={1.5}
                    step={0.05}
                    value={settings.fontScale}
                    onChange={(e) => onSettings({ fontScale: Number(e.target.value) })}
                    className="w-full"
                    aria-label="Text size"
                  />
                </Section>
              </>
            )}

            <Section title="Sound">
              <Toggle
                label="Sound effects"
                hint="Whooshes, impacts & page turns"
                checked={settings.sound}
                onChange={(sound) => onSettings({ sound })}
              />
            </Section>

            <Section title="Shortcuts">
              <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs text-slate-500">
                <span><kbd className="font-mono font-semibold text-slate-900">Space</kbd> play / pause</span>
                <span><kbd className="font-mono font-semibold text-slate-900">← →</kbd> previous / next</span>
                <span><kbd className="font-mono font-semibold text-slate-900">F</kbd> fullscreen</span>
                <span><kbd className="font-mono font-semibold text-slate-900">Esc</kbd> close</span>
              </div>
            </Section>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

/** Copies text to the clipboard, falling back to a hidden textarea where the async API is refused. */
export async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    let ok = false;
    try {
      ok = document.execCommand('copy');
    } catch {
      ok = false;
    }
    ta.remove();
    return ok;
  }
}

/** Player top-bar button that copies a link which reopens this book. */
export function ShareButton({ link }: { link: string }) {
  const [copied, setCopied] = useState<'idle' | 'copied' | 'failed'>('idle');
  useEffect(() => {
    if (copied === 'idle') return;
    const t = window.setTimeout(() => setCopied('idle'), 1800);
    return () => window.clearTimeout(t);
  }, [copied]);
  return (
    <div className="relative">
      <IconButton
        label={copied === 'copied' ? 'Link copied' : 'Copy share link'}
        active={copied === 'copied'}
        onClick={() => {
          void copyText(link).then((ok) => setCopied(ok ? 'copied' : 'failed'));
        }}
      >
        {copied === 'copied' ? <Check size={18} /> : <Link2 size={18} />}
      </IconButton>
      {copied !== 'idle' && (
        <div className="absolute right-0 top-12 z-40 whitespace-nowrap bg-white px-3 py-1.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-slate-900">
          {copied === 'copied' ? 'Share link copied' : 'Copy failed — use the address bar'}
        </div>
      )}
    </div>
  );
}
