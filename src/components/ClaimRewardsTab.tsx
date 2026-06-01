import { ClaimRewardCard } from './ClaimRewardCard';

interface ClaimRewardsTabProps {
  playerWalletPubkey: string | null;
}

export function ClaimRewardsTab({ playerWalletPubkey }: ClaimRewardsTabProps) {
  return <ClaimRewardCard playerWalletPubkey={playerWalletPubkey} />;
}
