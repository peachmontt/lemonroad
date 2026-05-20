import { useWallet } from '@solana/wallet-adapter-react';
import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { BUY_URL, CHART_URL, X_URL } from '../config/links';
import { EVM_CHAIN_NAME, EVM_CHAIN_ID } from '../config/evm';
import type { GameMode } from '../types/game';
import type { ModalTab } from './FakeModal';
import { GlobalLeaderboardPanel } from './GlobalLeaderboardPanel';
import { LeaderboardPanel } from './LeaderboardPanel';
import { ProfileBar } from './ProfileBar';
import { RunHistoryPanel } from './RunHistoryPanel';
import type { PlayerResponse, RunRecord } from '../lib/api';

interface StartOverlayProps {
  gameMode: GameMode;
  onGameModeChange: (mode: GameMode) => void;
  paymentMethod: 'solana' | 'evm';
  onPaymentMethodChange: (method: 'solana' | 'evm') => void;
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
  paymentMethod,
  onPaymentMethodChange,
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
  const { address: wagmiAddress } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();

  const evmConnected = !!wagmiAddress;
  const chainName = EVM_CHAIN_NAME[EVM_CHAIN_ID] ?? 'EVM';

  const isReadyToPay =
    paymentMethod === 'evm' ? evmConnected : !!publicKey;

  const handlePrimary = () => {
    if (gameMode === 'paid') {
      onStartPaid();
    } else {
      onStart();
    }
  };

  const handleEvmConnect = () => {
    const injector = connectors.find((c) => c.id === 'metaMask') ?? connectors[0];
    if (injector) connect({ connector: injector });
  };

  return (
    <div className="overlay start-overlay">
      <ProfileBar player={player} onSaveName={onSaveName} />

      <h1 className="title-shake">LEMON ROAD</h1>
      <p className="tagline">the future of citrus transportation</p>
      <p className="sub-tagline">No utility. Only road.</p>
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

      {gameMode === 'paid' && (
        <>
          <p className="paid-hint">
            pay 1 USDT · hourly pool · 60/30/10 prizes
            {hasPaidDeposit && ' · deposit ready'}
          </p>

          <div className="payment-method-picker">
            <button
              type="button"
              className={`payment-btn ${paymentMethod === 'solana' ? 'active' : ''}`}
              onClick={() => onPaymentMethodChange('solana')}
            >
              Solana
            </button>
            <button
              type="button"
              className={`payment-btn ${paymentMethod === 'evm' ? 'active' : ''}`}
              onClick={() => onPaymentMethodChange('evm')}
            >
              MetaMask / EVM
            </button>
          </div>

          {paymentMethod === 'solana' && (
            <p className="wallet-hint">Phantom · Solflare · any Solana wallet</p>
          )}

          {paymentMethod === 'evm' && (
            <div className="evm-connect-row">
              <p className="wallet-hint">
                {chainName} USDT
                {wagmiAddress && ` · ${wagmiAddress.slice(0, 6)}…${wagmiAddress.slice(-4)}`}
              </p>
              {evmConnected ? (
                <button
                  type="button"
                  className="btn btn-ghost btn-xs"
                  onClick={() => disconnect()}
                >
                  disconnect
                </button>
              ) : (
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={handleEvmConnect}
                >
                  Connect MetaMask
                </button>
              )}
            </div>
          )}
        </>
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
            : 'START SQUEEZING'}
      </button>

      {needsTilt && (
        <p className="tilt-hint">(will ask for tilt on iphone. scary.)</p>
      )}
      {tiltMsg && <p className="tilt-msg">{tiltMsg}</p>}

      <RunHistoryPanel runs={runs} />
      <GlobalLeaderboardPanel compact />
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
