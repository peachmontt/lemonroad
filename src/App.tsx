import { Analytics } from '@vercel/analytics/react';
import { GameCanvas } from './components/GameCanvas';
import { WalletProvider } from './components/WalletProvider';
import type { ModalTab } from './components/FakeModal';
import { useState } from 'react';

export default function App() {
  const [modalTab, setModalTab] = useState<ModalTab | null>(null);

  return (
    <WalletProvider>
      <GameCanvas
        modalTab={modalTab}
        onOpenModal={setModalTab}
        onCloseModal={() => setModalTab(null)}
      />
      <Analytics />
    </WalletProvider>
  );
}
