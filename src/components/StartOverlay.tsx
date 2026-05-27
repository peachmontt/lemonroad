import { useWallet } from '@solana/wallet-adapter-react';
import { useAccount } from 'wagmi';
import { BUY_URL, CHART_URL, X_URL } from '../config/links';
import type { GameMode } from '../types/game';
import type { ModalTab } from './FakeModal';
import { InfoPanelsAccordion } from './InfoPanelsAccordion';
import { ProfileBar } from './ProfileBar';
import { useDailyLeaderboard } from '../context/DailyLeaderboardContext';
import type { PlayerResponse, RunRecord } from '../lib/api';
import type { WalletChannel } from './WalletConnectButton';
import { DailyResetCountdown } from './DailyResetCountdown';
import { FreeRewardTrustCopy } from './FreeRewardTrustCopy';

interface StartOverlayProps {
  gameMode: GameMode;
  onGameModeChange: (mode: GameMode) => void;
  walletChannel: WalletChannel;
  onWalletChannelChange: (channel: WalletChannel) => void;
  onStart: () => void;
  onStartPaid: () => void;
  onOpenModal: (tab: ModalTab) => void;
  streakDays: number;
  bestDistance: number;
  tiltMsg: string | null;
  player: PlayerResponse | null;
  runs: RunRecord[];
  runsLoading?: boolean;
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
  streakDays,
  bestDistance,
  tiltMsg,
  player,
  runs,
  runsLoading = false,
  onSaveName,
  paidPending,
  paidError,
  hasPaidDeposit,
}: StartOverlayProps) {
  const { publicKey } = useWallet();
  const { address: evmAddress } = useAccount();

  const isReadyToPay =
    walletChannel === 'evm' ? !!evmAddress : !!publicKey;
  const { nextResetAt } = useDailyLeaderboard();

  const handlePrimary = () => {
    if (gameMode === 'paid') {
      onStartPaid();
    } else {
      onStart();
    }
  };

  return (
    <div className="overlay start-overlay home-page">
      <header className="top-bar">
        <ProfileBar
          player={player}
          onSaveName={onSaveName}
          walletChannel={walletChannel}
          onWalletChannelChange={onWalletChannelChange}
        />
      </header>

      <section className="hero-section">
        <h1 className="title-shake">LEMON ROAD</h1>
        <p className="tagline">the future of citrus transportation</p>
        <p className="sub-tagline">No utility. Only road.</p>

        <div className="reward-banner">
          FREE TRIES - WIN UP TO $600/MONTH IN USDT REWARDS
        </div>

        {(streakDays > 0 || bestDistance > 0) && (
          <p className="lemon-club-teaser">
            {streakDays > 0 && <>Daily streak: {streakDays} days 🔥 · </>}
            {bestDistance > 0 && <>Best: {Math.floor(bestDistance)}m</>}
          </p>
        )}
      </section>

      <section className="mode-section">
        <div className="mode-tabs">
          <button
            type="button"
            className={`mode-btn ${gameMode === 'free' ? 'active' : ''}`}
            onClick={() => onGameModeChange('free')}
          >
            FREE RUN
          </button>
          <button
            type="button"
            className={`mode-btn ${gameMode === 'paid' ? 'active' : ''}`}
            onClick={() => onGameModeChange('paid')}
          >
            DEGEN MODE (1 USDT)
          </button>
        </div>

        <div className="mode-content">
          {gameMode === 'free' ? (
            <>
              <p className="free-hint">
                🏆 Daily Free Rewards
                <br />
                Top free players win from the $20 daily pool:
                <br />
                <span className="free-hint-prizes">1st $10 • 2nd $6 • 3rd $4</span>
              </p>
              <DailyResetCountdown nextResetAt={nextResetAt} />
              <FreeRewardTrustCopy />
            </>
          ) : (
            <p className="paid-hint">
              Game mode · Pay 1 USDT to play (Mainnet)
              {hasPaidDeposit && ' · deposit ready'}
            </p>
          )}

          {paidError && <p className="tilt-msg mode-error">{paidError}</p>}

          <button
            type="button"
            className="btn btn-primary start-primary-btn"
            onClick={handlePrimary}
            disabled={gameMode === 'paid' && (!isReadyToPay || paidPending)}
          >
            {paidPending
              ? 'PROCESSING PAYMENT...'
              : gameMode === 'paid'
                ? hasPaidDeposit
                  ? 'START PAID RUN'
                  : 'PAY 1 USDT & PLAY'
                : 'PLAY FREE FOR REWARDS'}
          </button>

          {tiltMsg && <p className="tilt-msg">{tiltMsg}</p>}
        </div>
      </section>

      <section className="accordion-section">
        <InfoPanelsAccordion
          runs={runs}
          runsLoading={runsLoading}
          currentPlayerId={player?.playerId}
        />
      </section>

      <section className="actions-section">
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
      </section>

      <footer className="site-footer">
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
      </footer>
    </div>
  );
}
