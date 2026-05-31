import type { EquippedVisualKind } from '../../shared/lemonVisual';

interface EquippedLemonVisualProps {
  emoji?: string | null;
  kind?: EquippedVisualKind;
  /** Reserved-size placeholder while leaderboard visuals load. */
  loading?: boolean;
  className?: string;
}

export function EquippedLemonVisual({
  emoji,
  kind = 'default',
  loading = false,
  className = '',
}: EquippedLemonVisualProps) {
  const glow = kind === 'badge' || kind === 'skin';
  const classes = [
    'lemon-equip-visual',
    glow ? 'lemon-equip-visual--glow' : '',
    loading ? 'lemon-equip-visual--loading' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <span className={classes} aria-hidden="true">
      {loading ? '' : (emoji ?? '🍋')}
    </span>
  );
}
