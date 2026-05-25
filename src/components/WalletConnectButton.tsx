import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { useEffect, useRef, useState } from 'react';
import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { EVM_CHAIN_ID } from '../config/evm';

export type WalletChannel = 'solana' | 'evm';

interface WalletConnectButtonProps {
  channel: WalletChannel;
}

function shortAddress(addr: string): string {
  return `${addr.slice(0, 4)}…${addr.slice(-4)}`;
}

export function WalletConnectButton({ channel }: WalletConnectButtonProps) {
  const { publicKey, disconnect: disconnectSolana, connecting: solanaConnecting } = useWallet();
  const { setVisible: openSolanaModal } = useWalletModal();
  const { address: evmAddress } = useAccount();
  const { connect, connectors, isPending: evmConnecting, error: evmConnectError } = useConnect();
  const { disconnect: disconnectEvm } = useDisconnect();

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMenuOpen(false);
  }, [channel]);

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

  if (channel === 'solana') {
    if (publicKey) {
      const addr = publicKey.toBase58();
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
                <button
                  type="button"
                  role="menuitem"
                  className="wallet-connect-menu-item"
                  onClick={() => {
                    setMenuOpen(false);
                    openSolanaModal(true);
                  }}
                >
                  Change wallet
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

    return (
      <button
        type="button"
        className="btn wallet-btn"
        disabled={solanaConnecting}
        onClick={() => openSolanaModal(true)}
      >
        {solanaConnecting ? 'Connecting…' : 'Connect'}
      </button>
    );
  }

  const metaMaskConnector =
    connectors.find((c) => c.id === 'metaMask') ?? connectors[0];

  const handleEvmConnect = () => {
    if (!metaMaskConnector) return;
    connect({ connector: metaMaskConnector, chainId: EVM_CHAIN_ID });
  };

  if (evmAddress) {
    return (
      <div className="wallet-connect-wrap" ref={menuRef}>
        <button
          type="button"
          className="btn wallet-btn wallet-btn-connected"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((open) => !open)}
        >
          {shortAddress(evmAddress)}
        </button>
        {menuOpen && (
          <ul className="wallet-connect-menu" role="menu">
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
    <div className="wallet-connect-wrap">
      <button
        type="button"
        className="btn wallet-btn"
        disabled={evmConnecting || !metaMaskConnector}
        onClick={handleEvmConnect}
      >
        {evmConnecting ? 'Connecting…' : 'Connect MetaMask'}
      </button>
      {evmConnectError && (
        <p className="wallet-connect-error" role="alert">
          {evmConnectError.message}
        </p>
      )}
    </div>
  );
}
