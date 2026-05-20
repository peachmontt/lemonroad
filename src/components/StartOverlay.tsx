import { useWallet } from '@solana/wallet-adapter-react';
import { BUY_URL, CHART_URL, X_URL } from '../config/links';
import type { GameMode } from '../types/game';
import type { ModalTab } from './FakeModal';
import { LeaderboardPanel } from './LeaderboardPanel';
import { ProfileBar } from './ProfileBar';
import { RunHistoryPanel } from './RunHistoryPanel';
import type { PlayerResponse, RunRecord } from '../lib/api';

interface StartOverlayProps {
  gameMode: GameMode;
  onGameModeChange: (mode: GameMode) => void;
  onStart: () => void;
  onStartPaid: () => void;
  onOpenModal: (tab: ModalTab) => void;
  tiltMsg: string | null;
  needsTilt: boolean;
  player: PlayerResponse | null;
  runs: RunRecord[];
  onSaveName: (name: string, wallet?: string) => Promise<unknown>;
  paidPending: boolean;
  paidError: string | null;
  hasPaidDeposit: boolean;
}

export function StartOverlay({
  gameMode,
  onGameModeChange,
  onStart,
  onStartPaid,
  onOpenModal,
  tiltMsg,
  needsTilt,
  player,
  runs,
  onSaveName,
  paidPending,
  paidError,
  hasPaidDeposit,
}: StartOverlayProps) {
  const { publicKey } = useWallet();

  const handlePrimary = () => {
    if (gameMode === 'paid') {
      onStartPaid();
    } else {
      onStart();
    }
  };

  return (
    <div className="overlay start-overlay">
      <ProfileBar player={player} onSaveName={onSaveName} />

      <h1 className="title-shake">LEMON ROAD</h1>
      <p className="tagline">the future of citrus transportation</p>
      <p className="sub-tagline">No utility. Only road.</p>

      <div className="mode-picker">
        <button
          type="button"
          className={`mode-btn ${gameMode === 'free' ? 'active' : ''}`}
          onClick={() => onGameModeChange('free')}
        >
          FREE FUN TRY
        </button>
        <button
          type="button"
          className={`mode-btn ${gameMode === 'paid' ? 'active' : ''}`}
          onClick={() => onGameModeChange('paid')}
        >
          GAME MODE (1 USDT)
        </button>
      </div>

      {gameMode === 'paid' && (
        <p className="paid-hint">
          connect wallet · pay 1 USDT to pool · hourly 60/30/10 prizes
          {hasPaidDeposit && ' · deposit ready'}
        </p>
      )}
      {paidError && <p className="tilt-msg">{paidError}</p>}

      <button
        type="button"
        className="btn btn-primary"
        onClick={handlePrimary}
        disabled={gameMode === 'paid' && (!publicKey || paidPending)}
      >
        {paidPending
          ? 'PROCESSING PAYMENT...'
          : gameMode === 'paid'
            ? hasPaidDeposit
              ? 'START PAID RUN'
              : 'PAY 1 USDT & PLAY'
            : 'START SQUEEZING'}
      </button>

      {needsTilt && (
        <p className="tilt-hint">(will ask for tilt on iphone. scary.)</p>
      )}
      {tiltMsg && <p className="tilt-msg">{tiltMsg}</p>}

      <RunHistoryPanel runs={runs} />
      <LeaderboardPanel compact />

      <div className="cta-row">
        <a href={BUY_URL} className="btn btn-secondary" target="_blank" rel="noreferrer">
          BUY $LEMON
        </a>
        <a href={CHART_URL} className="btn btn-secondary" target="_blank" rel="noreferrer">
          CHART
        </a>
        <a href={X_URL} className="btn btn-secondary" target="_blank" rel="noreferrer">
          X
        </a>
      </div>

      <div className="footer-links">
        <button type="button" className="link-btn" onClick={() => onOpenModal('roadmap')}>
          ROADMAP
        </button>
        <span> | </span>
        <button type="button" className="link-btn" onClick={() => onOpenModal('tokenomics')}>
          TOKENOMICS
        </button>
      </div>
    </div>
  );
}
