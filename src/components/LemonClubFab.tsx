import { createPortal } from 'react-dom';

interface LemonClubFabProps {
  onClick: () => void;
}

export function LemonClubFab({ onClick }: LemonClubFabProps) {
  return createPortal(
    <button type="button" className="lemon-club-fab" onClick={onClick} aria-label="Open Lemon Club">
      <span className="lemon-club-fab-label lemon-club-fab-label--full">Lemon Club 🍋</span>
      <span className="lemon-club-fab-label lemon-club-fab-label--compact">Club 🍋</span>
    </button>,
    document.body,
  );
}
