import { Analytics } from '@vercel/analytics/react';
import { GameCanvas } from './components/GameCanvas';
import { WalletProvider } from './components/WalletProvider';
import type { ModalTab } from './components/FakeModal';
import { AdminPage } from './pages/AdminPage';
import { DailyLeaderboardProvider } from './context/DailyLeaderboardContext';
import { useState } from 'react';

const isAdmin = window.location.pathname.startsWith('/admin');

export default function App() {
  const [modalTab, setModalTab] = useState<ModalTab | null>(null);

  if (isAdmin) {
    return (
      <>
        <WalletProvider>
          <AdminPage />
        </WalletProvider>
        <Analytics />
      </>
    );
  }

  return (
    <WalletProvider>
      <DailyLeaderboardProvider>
        <GameCanvas
          modalTab={modalTab}
          onOpenModal={setModalTab}
          onCloseModal={() => setModalTab(null)}
        />
      </DailyLeaderboardProvider>
      <Analytics />
    </WalletProvider>
  );
}
