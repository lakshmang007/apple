/** MotionReader mark: three comic panels in a square, as in the favicon. */
export function Logo({ size = 40, inverted = false }: { size?: number; inverted?: boolean }) {
  const bg = inverted ? '#ffffff' : '#0f172a';
  const fg = inverted ? '#0f172a' : '#ffffff';
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden className="shrink-0">
      <rect width="32" height="32" fill={bg} />
      <g fill={fg}>
        <rect x="7" y="7" width="8" height="18" />
        <rect x="17" y="7" width="8" height="8" />
        <rect x="17" y="17" width="8" height="8" />
      </g>
    </svg>
  );
}
