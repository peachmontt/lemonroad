interface FreeRewardTrustCopyProps {
  className?: string;
}

export function FreeRewardTrustCopy({
  className = 'free-reward-trust',
}: FreeRewardTrustCopyProps) {
  return (
    <p className={className}>
      Free rewards are paid to daily Top 3 players.
      <br />
      Winners are finalized at daily reset.
      <br />
      No payment needed for free runs.
    </p>
  );
}
