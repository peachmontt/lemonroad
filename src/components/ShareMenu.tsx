import { useState } from 'react';
import { copyCaption, downloadPng, getSiteUrl, openTwitterShare } from '../utils/share';

interface ShareMenuProps {
  dataUrl: string;
  file: File;
  caption: string;
  onClose: () => void;
}

/** Web Share API with image — works automatically on mobile */
async function nativeShareWithImage(
  file: File,
  caption: string,
  siteUrl: string,
): Promise<boolean> {
  if (!navigator.share) return false;
  const withFiles = { title: 'LEMON ROAD', text: caption, url: siteUrl, files: [file] };
  if (navigator.canShare && !navigator.canShare(withFiles)) {
    const textOnly = { title: 'LEMON ROAD', text: caption, url: siteUrl };
    if (navigator.canShare && !navigator.canShare(textOnly)) return false;
    try { await navigator.share(textOnly); return true; } catch { return false; }
  }
  try { await navigator.share(withFiles); return true; } catch { return false; }
}

type Step = { label: string; done: boolean };

interface ActiveFlowProps {
  platform: string;
  steps: Step[];
  manualStep: string | null;
  onDone: () => void;
}

function ActiveFlow({ platform, steps, manualStep, onDone }: ActiveFlowProps) {
  return (
    <div className="share-flow">
      <p className="share-flow-title">Posting to {platform}…</p>
      <ul className="share-flow-steps">
        {steps.map((s, i) => (
          <li key={i} className={s.done ? 'done' : 'pending'}>
            <span className="share-flow-icon">{s.done ? '✅' : '⏳'}</span>
            {s.label}
          </li>
        ))}
        {manualStep && (
          <li className="manual">
            <span className="share-flow-icon">👆</span>
            <strong>{manualStep}</strong>
          </li>
        )}
      </ul>
      <button type="button" className="share-option share-done-btn" onClick={onDone}>
        DONE
      </button>
    </div>
  );
}

type FlowState =
  | { kind: 'idle' }
  | { kind: 'running'; platform: string; steps: Step[]; manualStep: string | null };

export function ShareMenu({ dataUrl, file, caption, onClose }: ShareMenuProps) {
  const siteUrl = getSiteUrl();
  const [flow, setFlow] = useState<FlowState>({ kind: 'idle' });

  const canNativeShare =
    typeof navigator !== 'undefined' &&
    !!navigator.share &&
    !!navigator.canShare?.({ files: [file] });

  const startFlow = (platform: string, steps: Step[], manualStep: string | null) => {
    setFlow({ kind: 'running', platform, steps, manualStep });
  };

  const handleX = async () => {
    if (canNativeShare) {
      await nativeShareWithImage(file, caption, siteUrl);
      return;
    }
    const steps: Step[] = [
      { label: 'Saving image to Downloads…', done: false },
      { label: 'Copying caption + link…', done: false },
      { label: 'Opening X composer…', done: false },
    ];
    startFlow('X / Twitter', steps, 'Attach the saved image in X, then post!');
    await downloadPng(dataUrl);
    steps[0].done = true;
    setFlow({ kind: 'running', platform: 'X / Twitter', steps: [...steps], manualStep: 'Attach the saved image in X, then post!' });
    await copyCaption(caption);
    steps[1].done = true;
    setFlow({ kind: 'running', platform: 'X / Twitter', steps: [...steps], manualStep: 'Attach the saved image in X, then post!' });
    openTwitterShare(caption, siteUrl);
    steps[2].done = true;
    setFlow({ kind: 'running', platform: 'X / Twitter', steps: [...steps], manualStep: 'Attach the saved image in X, then post!' });
  };

  const handleTikTok = async () => {
    if (canNativeShare) {
      await nativeShareWithImage(file, caption, siteUrl);
      return;
    }
    const steps: Step[] = [
      { label: 'Saving image to Downloads…', done: false },
      { label: 'Copying caption + link…', done: false },
      { label: 'Opening TikTok upload…', done: false },
    ];
    startFlow('TikTok', steps, 'Drag the saved image into TikTok, then paste caption!');
    await downloadPng(dataUrl);
    steps[0].done = true;
    setFlow({ kind: 'running', platform: 'TikTok', steps: [...steps], manualStep: 'Drag the saved image into TikTok, then paste caption!' });
    await copyCaption(caption);
    steps[1].done = true;
    setFlow({ kind: 'running', platform: 'TikTok', steps: [...steps], manualStep: 'Drag the saved image into TikTok, then paste caption!' });
    window.open('https://www.tiktok.com/upload', '_blank', 'noopener,noreferrer');
    steps[2].done = true;
    setFlow({ kind: 'running', platform: 'TikTok', steps: [...steps], manualStep: 'Drag the saved image into TikTok, then paste caption!' });
  };

  const handleInstagram = async () => {
    if (canNativeShare) {
      await nativeShareWithImage(file, caption, siteUrl);
      return;
    }
    const steps: Step[] = [
      { label: 'Saving image to Downloads…', done: false },
      { label: 'Copying caption + link…', done: false },
      { label: 'Opening Instagram…', done: false },
    ];
    startFlow('Instagram', steps, 'Upload the saved image on Instagram, then paste caption!');
    await downloadPng(dataUrl);
    steps[0].done = true;
    setFlow({ kind: 'running', platform: 'Instagram', steps: [...steps], manualStep: 'Upload the saved image on Instagram, then paste caption!' });
    await copyCaption(caption);
    steps[1].done = true;
    setFlow({ kind: 'running', platform: 'Instagram', steps: [...steps], manualStep: 'Upload the saved image on Instagram, then paste caption!' });
    window.open('https://www.instagram.com/', '_blank', 'noopener,noreferrer');
    steps[2].done = true;
    setFlow({ kind: 'running', platform: 'Instagram', steps: [...steps], manualStep: 'Upload the saved image on Instagram, then paste caption!' });
  };

  const handleCopy = async () => {
    await copyCaption(caption);
    startFlow('Clipboard', [
      { label: 'Caption + link copied!', done: true },
    ], 'Paste it anywhere you want to share.');
  };

  if (flow.kind === 'running') {
    return (
      <div className="share-menu-backdrop" role="presentation">
        <div className="share-menu" role="dialog" aria-label="Share progress">
          <ActiveFlow
            platform={flow.platform}
            steps={flow.steps}
            manualStep={flow.manualStep}
            onDone={onClose}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="share-menu-backdrop" onClick={onClose} role="presentation">
      <div
        className="share-menu"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Share your failure"
      >
        <h3>SQUEEZE IT TO THE TIMELINE</h3>
        <p className="share-menu-hint">
          {canNativeShare
            ? '📎 image attaches automatically on your phone'
            : 'image saves + caption copies automatically — one step left to post'}
        </p>

        <button type="button" className="share-option share-x" onClick={handleX}>
          POST ON X / TWITTER
        </button>
        <button type="button" className="share-option share-tt" onClick={handleTikTok}>
          TIKTOK
        </button>
        <button type="button" className="share-option share-ig" onClick={handleInstagram}>
          INSTAGRAM
        </button>
        <button type="button" className="share-option" onClick={() => { void downloadPng(dataUrl); }}>
          ⬇ DOWNLOAD PNG
        </button>
        <button type="button" className="share-option share-copy" onClick={handleCopy}>
          📋 COPY CAPTION + LINK
        </button>
        <button type="button" className="share-option share-close" onClick={onClose}>
          NAH
        </button>
      </div>
    </div>
  );
}
