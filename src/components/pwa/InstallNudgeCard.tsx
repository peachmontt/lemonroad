import { useState } from 'react';
import { usePwaInstall } from '../../hooks/usePwaInstall';
import { dismissInstallNudge } from '../../lib/pwa/preferences';

interface InstallNudgeCardProps {
  onDismiss: () => void;
}

export function InstallNudgeCard({ onDismiss }: InstallNudgeCardProps) {
  const { canNativeInstall, platform, isInApp, promptInstall } = usePwaInstall();

  const handleInstall = async () => {
    if (canNativeInstall) {
      await promptInstall();
    } else if (platform === 'ios') {
      window.location.href = '/install/iphone';
    } else {
      window.location.href = '/install/android';
    }
  };

  const handleDismiss = () => {
    dismissInstallNudge();
    onDismiss();
  };

  if (isInApp) return <InAppBrowserNotice onDismiss={onDismiss} />;

  const ctaCopy =
    platform === 'ios'
      ? 'iPhone players: tap Share → Add to Home Screen'
      : canNativeInstall
      ? 'One tap install — no app store needed'
      : 'Add to your home screen for faster access';

  return (
    <div className="pwa-nudge-card pwa-nudge-card--install" role="complementary" aria-label="Install Lemon Road">
      <div className="pwa-nudge-icon" aria-hidden="true">🍋</div>
      <div className="pwa-nudge-body">
        <p className="pwa-nudge-title">Put Lemon Road on your home screen</p>
        <p className="pwa-nudge-sub">{ctaCopy}. Daily prize reminders included.</p>
      </div>
      <div className="pwa-nudge-actions">
        <button type="button" className="btn btn-primary pwa-btn" onClick={handleInstall}>
          Install Lemon Road
        </button>
        <button type="button" className="btn btn-ghost pwa-btn" onClick={handleDismiss}>
          Not now
        </button>
      </div>
    </div>
  );
}

function InAppBrowserNotice({ onDismiss }: { onDismiss: () => void }) {
  const { copySiteLink } = usePwaInstall();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const ok = await copySiteLink();
    if (ok) setCopied(true);
  };

  return (
    <div className="pwa-nudge-card pwa-nudge-card--inapp" role="complementary">
      <div className="pwa-nudge-icon" aria-hidden="true">🍋</div>
      <div className="pwa-nudge-body">
        <p className="pwa-nudge-title">Open in Safari or Chrome to install</p>
        <p className="pwa-nudge-sub">This browser doesn&apos;t support home screen install. Copy the link and open it in Safari (iPhone) or Chrome (Android).</p>
      </div>
      <div className="pwa-nudge-actions">
        <button type="button" className="btn btn-primary pwa-btn" onClick={handleCopy}>
          {copied ? 'Copied!' : 'Copy link'}
        </button>
        <button type="button" className="btn btn-ghost pwa-btn" onClick={onDismiss}>
          Dismiss
        </button>
      </div>
    </div>
  );
}
