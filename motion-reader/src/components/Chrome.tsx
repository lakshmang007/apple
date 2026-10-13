import { AnimatePresence, motion } from 'motion/react';
import { X } from 'lucide-react';
import type { ReactNode } from 'react';
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
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={`flex shrink-0 items-center justify-center rounded-full transition-all active:scale-90 disabled:opacity-30 ${
        big
          ? 'h-14 w-14 bg-white text-ink shadow-[0_0_30px_rgba(255,77,109,0.45)] hover:scale-105'
          : `h-10 w-10 hover:bg-white/15 ${active ? 'bg-white/20 text-white' : 'text-white/80'}`
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
              ? 'top-0 bg-gradient-to-b from-black/75 to-transparent pb-10 pt-3'
              : 'bottom-0 bg-gradient-to-t from-black/85 to-transparent pb-4 pt-12'
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
      <div className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 overflow-hidden rounded-full bg-white/15 transition-all group-hover:h-1.5">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-accent via-accent-2 to-accent-3"
          animate={{ width: `${value * 100}%` }}
          transition={{ type: 'spring', stiffness: 120, damping: 24 }}
        />
      </div>
      {marks.map((m, i) => (
        <div
          key={i}
          className="absolute top-1/2 h-2.5 w-0.5 -translate-y-1/2 rounded bg-white/35"
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
      className="h-9 min-w-12 rounded-full px-2.5 text-sm font-semibold text-white/85 tabular-nums hover:bg-white/15"
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
    <div className="flex rounded-xl bg-white/8 p-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`flex-1 rounded-lg px-2 py-1.5 text-xs font-semibold transition ${
            value === o.value ? 'bg-white text-ink shadow' : 'text-white/70 hover:text-white'
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
        <span className="block text-sm text-white/90">{label}</span>
        {hint && <span className="block text-xs text-white/45">{hint}</span>}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 shrink-0 rounded-full transition ${checked ? 'bg-accent' : 'bg-white/20'}`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${checked ? 'left-[22px]' : 'left-0.5'}`}
        />
      </button>
    </label>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-white/45">{title}</div>
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
            className="absolute inset-0 z-40 bg-black/30"
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
            className="glass absolute bottom-3 right-3 top-3 z-50 w-[min(340px,calc(100vw-24px))] space-y-5 overflow-y-auto rounded-3xl p-5 no-scrollbar"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">Reader settings</h2>
              <IconButton label="Close settings" onClick={onClose}>
                <X size={18} />
              </IconButton>
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
                  <div className="mb-1 flex justify-between text-xs text-white/55">
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
                      className="w-full rounded-xl border border-white/10 bg-white/8 px-3 py-2 text-sm"
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
              <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-white/60">
                <span><kbd className="font-semibold text-white/85">Space</kbd> play / pause</span>
                <span><kbd className="font-semibold text-white/85">← →</kbd> previous / next</span>
                <span><kbd className="font-semibold text-white/85">F</kbd> fullscreen</span>
                <span><kbd className="font-semibold text-white/85">Esc</kbd> close</span>
              </div>
            </Section>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
