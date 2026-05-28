import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useAccount, useConnect, useDisconnect } from 'wagmi';
import type { Connector } from 'wagmi';
import { EVM_CHAIN_ID } from '../config/evm';
import {
  evmPaymentHint,
  evmWalletLabel,
  solanaPaymentHint,
  solanaWalletsLabel,
  type EvmWalletKind,
} from '../config/wallets';
import { formatEvmWalletError, getEvmConnector } from '../lib/evmConnectors';
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

function formatRememberedProvider(provider: string): string {
  const lower = provider.toLowerCase();
  if (lower.includes('phantom')) return 'Phantom';
  if (lower.includes('solflare')) return 'Solflare';
  if (lower.includes('okx')) return 'OKX Wallet';
  if (lower.includes('metamask')) return 'MetaMask';
  return provider;
}

function connectorToEvmKind(connector: Connector | undefined): EvmWalletKind {
  if (!connector) return 'metamask';
  if (connector.id === 'okxWallet' || /okx/i.test(connector.name)) return 'okx';
  return 'metamask';
}

function shouldConnectAfterModalSelection(
  currentName: string | null,
  previousName: string | null,
): boolean {
  if (!currentName) return false;
  if (previousName === null) return true;
  return currentName !== previousName;
}

function WalletMenuOption({
  title,
  subtitle,
  disabled,
  onClick,
}: {
  title: string;
  subtitle: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      className="wallet-connect-menu-item"
      disabled={disabled}
      onClick={onClick}
    >
      <span className="wallet-connect-menu-item-title">{title}</span>
      <span className="wallet-connect-menu-item-sub">{subtitle}</span>
    </button>
  );
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
  const { address: evmAddress, connector: activeEvmConnector } = useAccount();
  const { connect, connectors, isPending: evmConnecting, error: evmConnectError } = useConnect();
  const { disconnect: disconnectEvm } = useDisconnect();

  const [menuOpen, setMenuOpen] = useState(false);
  const [evmLocalError, setEvmLocalError] = useState<string | null>(null);
  const [evmErrorKind, setEvmErrorKind] = useState<EvmWalletKind>('metamask');
  const [solanaLocalError, setSolanaLocalError] = useState<string | null>(null);
  const [rememberedWallet, setRememberedWallet] = useState<RememberedWallet | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const solanaModalSessionRef = useRef<{ open: boolean; walletName: string | null }>({
    open: false,
    walletName: null,
  });

  const solanaTitle = solanaWalletsLabel();
  const solanaSub = solanaPaymentHint();
  const evmSub = evmPaymentHint();
  const activeEvmKind = connectorToEvmKind(activeEvmConnector);

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
      const kind = connectorToEvmKind(activeEvmConnector);
      saveRememberedWallet(kind === 'okx' ? 'okx' : 'metamask', evmAddress);
      setRememberedWallet(readRememberedWallet());
    }
  }, [evmAddress, activeEvmConnector]);

  const runSolanaConnect = useCallback(async () => {
    setSolanaLocalError(null);
    try {
      await connectSolanaFromUserAction(connectSolana, wallet?.adapter ?? null);
    } catch (error) {
      setSolanaLocalError(formatWalletConnectError(error));
    }
  }, [connectSolana, wallet?.adapter]);

  const handleEvmConnect = useCallback(
    (kind: EvmWalletKind) => {
      setEvmLocalError(null);
      setEvmErrorKind(kind);
      try {
        onActiveChannelChange('evm');
        const connector = getEvmConnector(connectors, kind);
        connectEvmFromUserAction(connect, connector, EVM_CHAIN_ID);
      } catch (error) {
        setEvmLocalError(formatWalletConnectError(error));
      }
    },
    [connect, connectors, onActiveChannelChange],
  );

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
    (evmConnectError ? formatEvmWalletError(evmConnectError.message, evmErrorKind) : null);
  const connecting = solanaConnecting || evmConnecting;

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

  const switchToEvm = (kind: EvmWalletKind) => {
    setMenuOpen(false);
    if (publicKey) void disconnectSolana();
    handleEvmConnect(kind);
  };

  const switchToSolana = () => {
    setMenuOpen(false);
    if (evmAddress) disconnectEvm();
    beginSolanaConnectFlow();
  };

  const otherEvmKind: EvmWalletKind = activeEvmKind === 'okx' ? 'metamask' : 'okx';

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
              <button
                type="button"
                role="menuitem"
                className="wallet-connect-menu-item"
                onClick={beginSolanaConnectFlow}
              >
                Change wallet
              </button>
            </li>
            <li role="none">
              <WalletMenuOption
                title={evmWalletLabel('metamask')}
                subtitle={evmSub}
                onClick={() => switchToEvm('metamask')}
              />
            </li>
            <li role="none">
              <WalletMenuOption
                title={evmWalletLabel('okx')}
                subtitle={evmSub}
                onClick={() => switchToEvm('okx')}
              />
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
          title={evmWalletLabel(activeEvmKind)}
        >
          {shortAddress(evmAddress!)}
        </button>
        {menuOpen && (
          <ul className="wallet-connect-menu" role="menu">
            <li role="none">
              <WalletMenuOption
                title={`Switch to ${solanaTitle}`}
                subtitle={solanaSub}
                onClick={switchToSolana}
              />
            </li>
            <li role="none">
              <WalletMenuOption
                title={`Switch to ${evmWalletLabel(otherEvmKind)}`}
                subtitle={evmSub}
                onClick={() => switchToEvm(otherEvmKind)}
              />
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
        disabled={connecting}
        aria-expanded={menuOpen}
        onClick={() => setMenuOpen((open) => !open)}
      >
        {connecting ? 'Connecting…' : 'Wallets'}
      </button>
      {menuOpen && (
        <ul className="wallet-connect-menu" role="menu" aria-label="Choose a wallet">
          <li role="none" className="wallet-connect-menu-heading">
            Choose a wallet
          </li>
          <li role="none">
            <WalletMenuOption
              title={solanaTitle}
              subtitle={solanaSub}
              onClick={beginSolanaConnectFlow}
            />
          </li>
          <li role="none">
            <WalletMenuOption
              title={evmWalletLabel('metamask')}
              subtitle={evmSub}
              disabled={evmConnecting}
              onClick={() => {
                setMenuOpen(false);
                handleEvmConnect('metamask');
              }}
            />
          </li>
          <li role="none">
            <WalletMenuOption
              title={evmWalletLabel('okx')}
              subtitle={evmSub}
              disabled={evmConnecting}
              onClick={() => {
                setMenuOpen(false);
                handleEvmConnect('okx');
              }}
            />
          </li>
        </ul>
      )}
      {rememberedWallet && !solanaConnected && !evmConnected && !solanaLocalError && !evmErrorMessage && (
        <p className="wallet-connect-remembered">
          Last used: {formatRememberedProvider(rememberedWallet.provider)}
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
