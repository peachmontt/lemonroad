import { createPortal } from 'react-dom';

interface LemonClubFabProps {
  onClick: () => void;
  claimableCount?: number;
}

export function LemonClubFab({ onClick, claimableCount = 0 }: LemonClubFabProps) {
  return createPortal(
    <button type="button" className="lemon-club-fab" onClick={onClick} aria-label="Open Lemon Club">
      <span className="lemon-club-fab-label lemon-club-fab-label--full">Lemon Club 🍋</span>
      <span className="lemon-club-fab-label lemon-club-fab-label--compact">Club 🍋</span>
      {claimableCount > 0 && (
        <span className="lemon-club-fab-badge" aria-label={`${claimableCount} claimable rewards`}>
          {claimableCount > 9 ? '9+' : claimableCount}
        </span>
      )}
    </button>,
    document.body,
  );
}
