interface LemonLoaderProps {
  label?: string;
}

export function LemonLoader({ label = 'loading…' }: LemonLoaderProps) {
  return (
    <div className="lemon-loader">
      <span className="lemon-loader-ring" aria-hidden>
        <span className="lemon-loader-icon">🍋</span>
      </span>
      <span className="lemon-loader-label">{label}</span>
    </div>
  );
}
