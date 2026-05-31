/** Lemon Club badge / skin emoji lookup — shared by client and API. */

export const DEFAULT_LEMON_EMOJI = '🍋';

export const BADGE_EMOJI: Record<string, string> = {
  first_rug: '🪤',
  '500m_club': '🛣️',
  '1000m_degen': '🏁',
  powell_proof: '🎤',
  whale_dodger: '🐋',
  daily_grinder: '☕',
  weekly_cup_participant: '🏆',
  top_50_candidate: '🎯',
  daily_squeezer: '🔥',
};

export const SKIN_EMOJI: Record<string, string> = {
  default: DEFAULT_LEMON_EMOJI,
  golden: '✨',
  burnt: '🔥',
  diamond_hands: '💎',
  rugged: '🩹',
  whale_bait: '🐋',
};

export type EquippedVisualKind = 'badge' | 'skin' | 'default';

export interface EquippedVisual {
  equippedEmoji: string;
  equippedKind: EquippedVisualKind;
}

export function isValidBadgeId(id: string | null | undefined): id is string {
  return !!id && id in BADGE_EMOJI;
}

export function isValidSkinId(id: string | null | undefined): id is string {
  return !!id && id in SKIN_EMOJI;
}

/** Badge beats skin; default lemon when nothing equipped. */
export function resolveEquippedVisual(
  selectedBadge: string | null | undefined,
  selectedSkin: string | null | undefined,
): EquippedVisual {
  if (isValidBadgeId(selectedBadge)) {
    return { equippedEmoji: BADGE_EMOJI[selectedBadge], equippedKind: 'badge' };
  }
  if (isValidSkinId(selectedSkin) && selectedSkin !== 'default') {
    return { equippedEmoji: SKIN_EMOJI[selectedSkin], equippedKind: 'skin' };
  }
  return { equippedEmoji: DEFAULT_LEMON_EMOJI, equippedKind: 'default' };
}

export function sanitizeEquippedSelection(
  selectedBadge: string | null | undefined,
  selectedSkin: string | null | undefined,
): { selectedBadge: string | null; selectedSkin: string | null } {
  return {
    selectedBadge: isValidBadgeId(selectedBadge) ? selectedBadge : null,
    selectedSkin: isValidSkinId(selectedSkin) ? selectedSkin : null,
  };
}
