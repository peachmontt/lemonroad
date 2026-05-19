import { BUY_URL, CHART_URL, X_URL } from '../config/links';
import type { ModalTab } from './FakeModal';

interface StartOverlayProps {
  onStart: () => void;
  onOpenModal: (tab: ModalTab) => void;
  tiltMsg: string | null;
  needsTilt: boolean;
}

export function StartOverlay({ onStart, onOpenModal, tiltMsg, needsTilt }: StartOverlayProps) {
  return (
    <div className="overlay start-overlay">
      <h1 className="title-shake">LEMON ROAD</h1>
      <p className="tagline">the future of citrus transportation</p>
      <p className="sub-tagline">No utility. Only road.</p>

      <button type="button" className="btn btn-primary" onClick={onStart}>
        START SQUEEZING
      </button>
      {needsTilt && (
        <p className="tilt-hint">(will ask for tilt on iphone. scary.)</p>
      )}
      {tiltMsg && <p className="tilt-msg">{tiltMsg}</p>}

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

