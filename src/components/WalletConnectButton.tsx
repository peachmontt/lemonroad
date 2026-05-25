import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useAccount, useConnect, useDisconnect } from 'wagmi';
import type { Connector } from 'wagmi';
import { EVM_CHAIN_ID, EVM_CHAIN_NAME } from '../config/evm';

export type WalletChannel = 'solana' | 'evm';

interface WalletConnectButtonProps {
  activeChannel: WalletChannel;
  onActiveChannelChange: (channel: WalletChannel) => void;
}

function shortAddress(addr: string): string {
  return `${addr.slice(0, 4)}…${addr.slice(-4)}`;
}

function pickEvmConnector(connectors: readonly Connector[]): Connector | undefined {
  const preferredIds = ['metaMaskSDK', 'metaMask', 'io.metamask'];
  for (const id of preferredIds) {
    const match = connectors.find((c) => c.id === id);
    if (match) return match;
  }
  return connectors.find((c) => c.type === 'injected') ?? connectors[0];
}

function formatEvmConnectError(message: string): string {
  if (/provider not found/i.test(message)) {
    return 'MetaMask not detected. Install the extension or open this page in the MetaMask app browser.';
  }
  return message;
}

export function WalletConnectButton({
  activeChannel,
  onActiveChannelChange,
}: WalletConnectButtonProps) {
  const { publicKey, disconnect: disconnectSolana, connecting: solanaConnecting } = useWallet();
  const { setVisible: openSolanaModal } = useWalletModal();
  const { address: evmAddress } = useAccount();
  const { connect, connectors, isPending: evmConnecting, error: evmConnectError } = useConnect();
  const { disconnect: disconnectEvm } = useDisconnect();

  const [menuOpen, setMenuOpen] = useState(false);
  const [evmLocalError, setEvmLocalError] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const evmConnector = pickEvmConnector(connectors);
  const evmChainLabel = EVM_CHAIN_NAME[EVM_CHAIN_ID] ?? `chain ${EVM_CHAIN_ID}`;

  const handleEvmConnect = useCallback(() => {
    setEvmLocalError(null);
    if (!evmConnector) {
      setEvmLocalError('No EVM wallet found. Install MetaMask.');
      return;
    }
    if (typeof window !== 'undefined' && !window.ethereum) {
      setEvmLocalError(
        'MetaMask not detected. Install the extension or open lemonroad.xyz in the MetaMask app browser.',
      );
      return;
    }
    onActiveChannelChange('evm');
    connect({ connector: evmConnector, chainId: EVM_CHAIN_ID });
  }, [connect, evmConnector, onActiveChannelChange]);

  useEffect(() => {
    if (publicKey) onActiveChannelChange('solana');
  }, [publicKey, onActiveChannelChange]);

  useEffect(() => {
    if (evmAddress) onActiveChannelChange('evm');
  }, [evmAddress, onActiveChannelChange]);

  useEffect(() => {
    setMenuOpen(false);
  }, [activeChannel, publicKey, evmAddress]);

  useEffect(() => {
    const close = (event: MouseEvent | TouchEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('touchstart', close);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('touchstart', close);
    };
  }, []);

  const solanaConnected = !!publicKey;
  const evmConnected = !!evmAddress;
  const evmErrorMessage =
    evmLocalError ??
    (evmConnectError ? formatEvmConnectError(evmConnectError.message) : null);

  const openSolana = () => {
    setMenuOpen(false);
    setEvmLocalError(null);
    onActiveChannelChange('solana');
    openSolanaModal(true);
  };

  const switchToEvm = () => {
    setMenuOpen(false);
    if (publicKey) void disconnectSolana();
    handleEvmConnect();
  };

  const switchToSolana = () => {
    setMenuOpen(false);
    if (evmAddress) disconnectEvm();
    onActiveChannelChange('solana');
    openSolanaModal(true);
  };

  if (activeChannel === 'solana' && solanaConnected) {
    const addr = publicKey!.toBase58();
    return (
      <div className="wallet-connect-wrap" ref={menuRef}>
        <button
          type="button"
          className="btn wallet-btn wallet-btn-connected"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((open) => !open)}
        >
          {shortAddress(addr)}
        </button>
        {menuOpen && (
          <ul className="wallet-connect-menu" role="menu">
            <li role="none">
              <button type="button" role="menuitem" className="wallet-connect-menu-item" onClick={openSolana}>
                Change wallet
              </button>
            </li>
            <li role="none">
              <button
                type="button"
                role="menuitem"
                className="wallet-connect-menu-item"
                onClick={switchToEvm}
              >
                Use EVM wallet
              </button>
            </li>
            <li role="none">
              <button
                type="button"
                role="menuitem"
                className="wallet-connect-menu-item"
                onClick={() => {
                  setMenuOpen(false);
                  void disconnectSolana();
                }}
              >
                Disconnect
              </button>
            </li>
          </ul>
        )}
      </div>
    );
  }

  if (activeChannel === 'evm' && evmConnected) {
    return (
      <div className="wallet-connect-wrap" ref={menuRef}>
        <button
          type="button"
          className="btn wallet-btn wallet-btn-connected"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((open) => !open)}
        >
          {shortAddress(evmAddress!)}
        </button>
        {menuOpen && (
          <ul className="wallet-connect-menu" role="menu">
            <li role="none">
              <button
                type="button"
                role="menuitem"
                className="wallet-connect-menu-item"
                onClick={switchToSolana}
              >
                Use Solana wallet
              </button>
            </li>
            <li role="none">
              <button
                type="button"
                role="menuitem"
                className="wallet-connect-menu-item"
                onClick={() => {
                  setMenuOpen(false);
                  disconnectEvm();
                }}
              >
                Disconnect
              </button>
            </li>
          </ul>
        )}
      </div>
    );
  }

  return (
    <div className="wallet-connect-wrap" ref={menuRef}>
      <button
        type="button"
        className="btn wallet-btn"
        disabled={solanaConnecting || evmConnecting}
        aria-expanded={menuOpen}
        onClick={() => setMenuOpen((open) => !open)}
      >
        {solanaConnecting || evmConnecting ? 'Connecting…' : 'Connect'}
      </button>
      {menuOpen && (
        <ul className="wallet-connect-menu" role="menu">
          <li role="none">
            <button type="button" role="menuitem" className="wallet-connect-menu-item" onClick={openSolana}>
              Solana (devnet)
            </button>
          </li>
          <li role="none">
            <button
              type="button"
              role="menuitem"
              className="wallet-connect-menu-item"
              disabled={evmConnecting}
              onClick={() => {
                setMenuOpen(false);
                handleEvmConnect();
              }}
            >
              EVM ({evmChainLabel})
            </button>
          </li>
        </ul>
      )}
      {evmErrorMessage && (
        <p className="wallet-connect-error" role="alert">
          {evmErrorMessage}
        </p>
      )}
    </div>
  );
}
