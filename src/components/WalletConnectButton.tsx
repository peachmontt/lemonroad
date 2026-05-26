import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useAccount, useConnect, useDisconnect } from 'wagmi';
import type { Connector } from 'wagmi';
import { EVM_CHAIN_ID, EVM_CHAIN_NAME } from '../config/evm';
import { solanaClusterLabel } from '../config/explorer';
import {
  connectEvmFromUserAction,
  connectSolanaFromUserAction,
  formatWalletConnectError,
} from '../lib/walletConnection';
import {
  readRememberedWallet,
  saveRememberedWallet,
  type RememberedWallet,
} from '../lib/walletPreferences';

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
    return 'Could not open MetaMask. Install the app or try again from MetaMask’s in-app browser.';
  }
  if (/dependency "@metamask\/connect-evm" not found/i.test(message)) {
    return 'MetaMask SDK is unavailable. Please try again later.';
  }
  return message;
}

function shouldConnectAfterModalSelection(
  currentName: string | null,
  previousName: string | null,
): boolean {
  if (!currentName) return false;
  if (previousName === null) return true;
  return currentName !== previousName;
}

export function WalletConnectButton({
  activeChannel,
  onActiveChannelChange,
}: WalletConnectButtonProps) {
  const {
    publicKey,
    wallet,
    connect: connectSolana,
    disconnect: disconnectSolana,
    connecting: solanaConnecting,
  } = useWallet();
  const { setVisible: openSolanaModal, visible: solanaModalVisible } = useWalletModal();
  const { address: evmAddress } = useAccount();
  const { connect, connectors, isPending: evmConnecting, error: evmConnectError } = useConnect();
  const { disconnect: disconnectEvm } = useDisconnect();

  const [menuOpen, setMenuOpen] = useState(false);
  const [evmLocalError, setEvmLocalError] = useState<string | null>(null);
  const [solanaLocalError, setSolanaLocalError] = useState<string | null>(null);
  const [rememberedWallet, setRememberedWallet] = useState<RememberedWallet | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const solanaModalSessionRef = useRef<{ open: boolean; walletName: string | null }>({
    open: false,
    walletName: null,
  });

  const evmConnector = pickEvmConnector(connectors);
  const evmChainLabel = EVM_CHAIN_NAME[EVM_CHAIN_ID] ?? `chain ${EVM_CHAIN_ID}`;

  // Read saved wallet for display only — never triggers connect on page load.
  useEffect(() => {
    setRememberedWallet(readRememberedWallet());
  }, []);

  useEffect(() => {
    if (publicKey) {
      saveRememberedWallet(wallet?.adapter.name ?? 'solana', publicKey.toBase58());
      setRememberedWallet(readRememberedWallet());
    }
  }, [publicKey, wallet?.adapter.name]);

  useEffect(() => {
    if (evmAddress) {
      saveRememberedWallet('metamask', evmAddress);
      setRememberedWallet(readRememberedWallet());
    }
  }, [evmAddress]);

  const runSolanaConnect = useCallback(async () => {
    setSolanaLocalError(null);
    try {
      await connectSolanaFromUserAction(connectSolana, wallet?.adapter ?? null);
    } catch (error) {
      setSolanaLocalError(formatWalletConnectError(error));
    }
  }, [connectSolana, wallet?.adapter]);

  const handleEvmConnect = useCallback(() => {
    setEvmLocalError(null);
    try {
      onActiveChannelChange('evm');
      connectEvmFromUserAction(connect, evmConnector, EVM_CHAIN_ID);
    } catch (error) {
      setEvmLocalError(formatWalletConnectError(error));
    }
  }, [connect, evmConnector, onActiveChannelChange]);

  // Connect Solana only after the user picks a wallet in the modal (never on page load).
  useEffect(() => {
    const session = solanaModalSessionRef.current;
    if (!session.open || solanaModalVisible) return;

    session.open = false;
    const previousName = session.walletName;
    const currentName = wallet?.adapter.name ?? null;

    if (!currentName || !shouldConnectAfterModalSelection(currentName, previousName)) return;
    void runSolanaConnect();
  }, [solanaModalVisible, wallet?.adapter.name, runSolanaConnect]);

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

  const beginSolanaConnectFlow = () => {
    setMenuOpen(false);
    setEvmLocalError(null);
    setSolanaLocalError(null);
    onActiveChannelChange('solana');

    if (wallet && !publicKey) {
      void runSolanaConnect();
      return;
    }

    solanaModalSessionRef.current = {
      open: true,
      walletName: wallet?.adapter.name ?? null,
    };
    openSolanaModal(true);
  };

  const openSolana = beginSolanaConnectFlow;

  const switchToEvm = () => {
    setMenuOpen(false);
    if (publicKey) void disconnectSolana();
    handleEvmConnect();
  };

  const switchToSolana = () => {
    setMenuOpen(false);
    if (evmAddress) disconnectEvm();
    beginSolanaConnectFlow();
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
              Solana ({solanaClusterLabel()})
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
      {rememberedWallet && !solanaConnected && !evmConnected && !solanaLocalError && !evmErrorMessage && (
        <p className="wallet-connect-remembered">
          Previously used: {rememberedWallet.provider}
          {rememberedWallet.address ? ` (${shortAddress(rememberedWallet.address)})` : ''}
        </p>
      )}
      {(solanaLocalError || evmErrorMessage) && (
        <p className="wallet-connect-error" role="alert">
          {solanaLocalError ?? evmErrorMessage}
        </p>
      )}
    </div>
  );
}
