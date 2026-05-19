import { useState } from 'react';
import { GameCanvas } from './components/GameCanvas';
import type { ModalTab } from './components/FakeModal';

export default function App() {
  const [modalTab, setModalTab] = useState<ModalTab | null>(null);

  return (
    <GameCanvas
      modalTab={modalTab}
      onOpenModal={setModalTab}
      onCloseModal={() => setModalTab(null)}
    />
  );
}
