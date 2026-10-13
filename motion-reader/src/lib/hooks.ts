import { useCallback, useEffect, useRef, useState } from 'react';
import { DEFAULT_SETTINGS, type Settings } from '../types';

const SETTINGS_KEY = 'motion-reader:settings';

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(() => {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw), showPanels: false };
    } catch {
      /* storage unavailable */
    }
    return DEFAULT_SETTINGS;
  });
  useEffect(() => {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch {
      /* storage unavailable */
    }
  }, [settings]);
  const update = useCallback(
    (patch: Partial<Settings>) => setSettings((s) => ({ ...s, ...patch })),
    [],
  );
  return [settings, update] as const;
}

export function useElementSize<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setSize((s) =>
        Math.abs(s.width - width) < 1 && Math.abs(s.height - height) < 1 ? s : { width, height },
      );
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, size] as const;
}

/** Visible while the pointer moves; hides after `delay` ms of inactivity when `autoHide`. */
export function useIdleChrome(autoHide: boolean, delay = 2600) {
  const [visible, setVisible] = useState(true);
  const timer = useRef<number | undefined>(undefined);
  const poke = useCallback(() => {
    setVisible(true);
    window.clearTimeout(timer.current);
    if (autoHide) timer.current = window.setTimeout(() => setVisible(false), delay);
  }, [autoHide, delay]);
  useEffect(() => {
    poke();
    window.addEventListener('pointermove', poke);
    window.addEventListener('keydown', poke);
    return () => {
      window.removeEventListener('pointermove', poke);
      window.removeEventListener('keydown', poke);
      window.clearTimeout(timer.current);
    };
  }, [poke]);
  return [visible || !autoHide, poke] as const;
}

export function useReducedMotion() {
  const [reduced, setReduced] = useState(
    () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches,
  );
  useEffect(() => {
    const mq = matchMedia('(prefers-reduced-motion: reduce)');
    const on = () => setReduced(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return reduced;
}

export function toggleFullscreen() {
  if (document.fullscreenElement) void document.exitFullscreen();
  else void document.documentElement.requestFullscreen?.().catch(() => undefined);
}

/** Keeps the latest value of a callback without re-triggering effects. */
export function useLatest<T>(value: T) {
  const ref = useRef(value);
  ref.current = value;
  return ref;
}
