import { useState } from 'react';
import type { RunRecord } from '../lib/api';
import { GlobalLeaderboardPanel } from './GlobalLeaderboardPanel';
import { LeaderboardPanel } from './LeaderboardPanel';
import { RunHistoryPanel } from './RunHistoryPanel';

export type InfoPanelId = 'history' | 'global' | 'pool';

interface InfoPanelsAccordionProps {
  runs: RunRecord[];
  runsLoading?: boolean;
}

export function InfoPanelsAccordion({ runs, runsLoading = false }: InfoPanelsAccordionProps) {
  const [openId, setOpenId] = useState<InfoPanelId | null>(null);

  const toggle = (id: InfoPanelId) => {
    setOpenId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="info-panels-accordion">
      <RunHistoryPanel
        runs={runs}
        loading={runsLoading}
        open={openId === 'history'}
        onToggle={() => toggle('history')}
      />
      <GlobalLeaderboardPanel
        compact
        open={openId === 'global'}
        onToggle={() => toggle('global')}
      />
      <LeaderboardPanel
        compact
        open={openId === 'pool'}
        onToggle={() => toggle('pool')}
      />
    </div>
  );
}
