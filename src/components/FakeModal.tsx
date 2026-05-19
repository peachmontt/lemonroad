export type ModalTab = 'roadmap' | 'tokenomics';

interface FakeModalProps {
  tab: ModalTab;
  onClose: () => void;
}

export function FakeModal({ tab, onClose }: FakeModalProps) {
  return (
    <div className="modal-backdrop" onClick={onClose} role="presentation">
      <div
        className="modal-panel"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="modal-title"
      >
        <button type="button" className="modal-close" onClick={onClose}>
          X
        </button>

        {tab === 'roadmap' ? (
          <>
            <h2 id="modal-title">OFFICIAL CITRUS ROADMAP v0.1</h2>
            <p className="modal-disclaimer">roadmap pending FDA approval</p>
            <ul className="fake-list">
              <li>
                <strong>Q1</strong> — invent road
              </li>
              <li>
                <strong>Q2</strong> — more lemon
              </li>
              <li>
                <strong>Q3</strong> — FDA investigation
              </li>
              <li>
                <strong>Q4</strong> — global citrus dominance
              </li>
            </ul>
            <p className="modal-fine">citric infrastructure protocol · powered by juice</p>
          </>
        ) : (
          <>
            <h2 id="modal-title">$LEMON TOKENOMICS</h2>
            <p className="modal-disclaimer">simple. fair. juiced.</p>
            <ul className="fake-list">
              <li>100% — pumpfun</li>
              <li>0% — team</li>
              <li>0% — VCs</li>
              <li>0% — presale</li>
            </ul>
            <p className="modal-fine">all supply on pumpfun. no utility. only road.</p>
          </>
        )}
      </div>
    </div>
  );
}
