import { useState } from 'react';
import { usePushNotifications } from '../../hooks/usePushNotifications';
import { dismissNotificationNudge } from '../../lib/pwa/preferences';
import { isIOS, isStandalone } from '../../lib/pwa/platform';

interface NotificationNudgeCardProps {
  onDismiss: () => void;
}

export function NotificationNudgeCard({ onDismiss }: NotificationNudgeCardProps) {
  const { permission, subscribed, requestAndSubscribe } = usePushNotifications();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ios = isIOS();
  const standalone = isStandalone();

  const handleEnable = async () => {
    setLoading(true);
    setError(null);
    try {
      const ok = await requestAndSubscribe();
      if (!ok && Notification.permission === 'denied') {
        setError('Notifications are blocked. Enable them in your browser settings.');
      }
    } catch {
      setError('Something went wrong. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDismiss = () => {
    dismissNotificationNudge();
    onDismiss();
  };

  if (permission === 'granted' || subscribed) {
    return (
      <div className="pwa-nudge-card pwa-nudge-card--notif" role="status">
        <div className="pwa-nudge-icon" aria-hidden="true">🔔</div>
        <div className="pwa-nudge-body">
          <p className="pwa-nudge-title">Notifications enabled</p>
          <p className="pwa-nudge-sub">We&apos;ll remind you about daily prizes.</p>
        </div>
      </div>
    );
  }

  if (permission === 'denied') {
    return (
      <div className="pwa-nudge-card pwa-nudge-card--notif" role="alert">
        <div className="pwa-nudge-icon" aria-hidden="true">🔕</div>
        <div className="pwa-nudge-body">
          <p className="pwa-nudge-title">Notifications are blocked</p>
          <p className="pwa-nudge-sub">Enable them in your browser or phone settings to get daily prize reminders.</p>
        </div>
        <div className="pwa-nudge-actions">
          <button type="button" className="btn btn-ghost pwa-btn" onClick={handleDismiss}>Dismiss</button>
        </div>
      </div>
    );
  }

  if (permission === 'unsupported') {
    return (
      <div className="pwa-nudge-card pwa-nudge-card--notif" role="note">
        <div className="pwa-nudge-icon" aria-hidden="true">🍋</div>
        <div className="pwa-nudge-body">
          <p className="pwa-nudge-title">Notifications not supported</p>
          <p className="pwa-nudge-sub">Try installing Lemon Road from Safari or Chrome for daily prize reminders.</p>
        </div>
        <div className="pwa-nudge-actions">
          <a href="/install" className="btn btn-secondary pwa-btn">Install guide</a>
          <button type="button" className="btn btn-ghost pwa-btn" onClick={handleDismiss}>Dismiss</button>
        </div>
      </div>
    );
  }

  if (ios && !standalone) {
    return (
      <div className="pwa-nudge-card pwa-nudge-card--notif">
        <div className="pwa-nudge-icon" aria-hidden="true">🍋</div>
        <div className="pwa-nudge-body">
          <p className="pwa-nudge-title">Install first to enable notifications on iPhone</p>
          <p className="pwa-nudge-sub">Add Lemon Road to your home screen via Safari, then you can enable prize reminders.</p>
        </div>
        <div className="pwa-nudge-actions">
          <a href="/install/iphone" className="btn btn-primary pwa-btn">Install on iPhone</a>
          <button type="button" className="btn btn-ghost pwa-btn" onClick={handleDismiss}>Not now</button>
        </div>
      </div>
    );
  }

  return (
    <div className="pwa-nudge-card pwa-nudge-card--notif" role="complementary" aria-label="Enable notifications">
      <div className="pwa-nudge-icon" aria-hidden="true">🔔</div>
      <div className="pwa-nudge-body">
        <p className="pwa-nudge-title">Don&apos;t miss the daily squeeze</p>
        <p className="pwa-nudge-sub">Enable reminders and we&apos;ll ping you when it&apos;s prize time.</p>
        {error && <p className="pwa-nudge-error">{error}</p>}
      </div>
      <div className="pwa-nudge-actions">
        <button
          type="button"
          className="btn btn-primary pwa-btn"
          onClick={handleEnable}
          disabled={loading}
        >
          {loading ? 'Enabling...' : 'Enable reminders'}
        </button>
        <button type="button" className="btn btn-ghost pwa-btn" onClick={handleDismiss}>
          No spam. Only game and prize reminders.
        </button>
      </div>
    </div>
  );
}
