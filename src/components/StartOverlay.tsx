import { useWallet } from '@solana/wallet-adapter-react';
import { useAccount } from 'wagmi';
import { BUY_URL, CHART_URL, X_URL } from '../config/links';
import type { GameMode } from '../types/game';
import type { ModalTab } from './FakeModal';
import { InfoPanelsAccordion } from './InfoPanelsAccordion';
import { ProfileBar } from './ProfileBar';
import type { PlayerResponse, RunRecord } from '../lib/api';
import type { WalletChannel } from './WalletConnectButton';

interface StartOverlayProps {
  gameMode: GameMode;
  onGameModeChange: (mode: GameMode) => void;
  walletChannel: WalletChannel;
  onWalletChannelChange: (channel: WalletChannel) => void;
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
  walletChannel,
  onWalletChannelChange,
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
  const { address: evmAddress } = useAccount();

  const isReadyToPay =
    walletChannel === 'evm' ? !!evmAddress : !!publicKey;

  const handlePrimary = () => {
    if (gameMode === 'paid') {
      onStartPaid();
    } else {
      onStart();
    }
  };

  return (
    <div className="overlay start-overlay">
      <ProfileBar
        player={player}
        onSaveName={onSaveName}
        walletChannel={walletChannel}
        onWalletChannelChange={onWalletChannelChange}
      />

      <h1 className="title-shake">LEMON ROAD</h1>
      <p className="tagline">the future of citrus transportation</p>
      <p className="sub-tagline">No utility. Only road.</p>

      <div className="reward-banner">
        FREE TRIES &middot; UP TO $600/MONTH IN USDT REWARDS
      </div>

      <p className="controls-hint">mouse / arrows · touch · tilt on mobile</p>

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

      {gameMode === 'free' && (
        <p className="free-hint">
          Free run · Daily rewards pool
          <br />
          $20 daily rewards for free players
          <br />
          <span className="free-hint-prizes">$10 / $6 / $4 for top 3</span>
          <br />
          Play free runs and compete for daily rewards
        </p>
      )}

      {gameMode === 'paid' && (
        <p className="paid-hint">
          Game mode · Pay 1 USDT to play
          {hasPaidDeposit && ' · deposit ready'}
        </p>
      )}

      {paidError && <p className="tilt-msg">{paidError}</p>}

      <button
        type="button"
        className="btn btn-primary"
        onClick={handlePrimary}
        disabled={gameMode === 'paid' && (!isReadyToPay || paidPending)}
      >
        {paidPending
          ? 'PROCESSING PAYMENT...'
          : gameMode === 'paid'
            ? hasPaidDeposit
              ? 'START PAID RUN'
              : 'PAY 1 USDT & PLAY'
            : 'START FREE RUN'}
      </button>

      {needsTilt && (
        <p className="tilt-hint">(will ask for tilt on iphone. scary.)</p>
      )}
      {tiltMsg && <p className="tilt-msg">{tiltMsg}</p>}

      <InfoPanelsAccordion runs={runs} />

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

      <nav className="footer footer-links" aria-label="Footer">
        <button type="button" className="footer-link" onClick={() => onOpenModal('tokenomics')}>
          Tokenomics
        </button>
        <a href="/terms" className="footer-link">
          Terms
        </a>
        <a href="/privacy" className="footer-link">
          Privacy
        </a>
        <a href="/press" className="footer-link">
          Contact
        </a>
      </nav>
    </div>
  );
}
