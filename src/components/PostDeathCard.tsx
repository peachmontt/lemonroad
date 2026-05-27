import type { UnlockNotification } from '../game/progression';
import { getDeathTitleDefinition } from '../game/badges';
import type { PlayerProgress } from '../game/progression';

interface PostDeathUnlocksProps {
  unlocks: UnlockNotification[];
  progress: PlayerProgress | null;
}

export function PostDeathUnlocks({ unlocks, progress }: PostDeathUnlocksProps) {
  const unlock = unlocks[0];
  const selectedTitle =
    progress?.selectedDeathTitle != null
      ? getDeathTitleDefinition(progress.selectedDeathTitle)
      : null;

  return (
    <>
      {selectedTitle && (
        <p className="death-title-equipped">
          {selectedTitle.emoji} {selectedTitle.name}
        </p>
      )}
      {unlock && (
        <p className="death-unlock-toast">
          {unlock.kind === 'title'
            ? `Title unlocked: ${unlock.label} ${unlock.emoji}`
            : unlock.kind === 'skin'
              ? `Skin unlocked: ${unlock.label} ${unlock.emoji}`
              : `Badge unlocked: ${unlock.label} ${unlock.emoji}`}
        </p>
      )}
    </>
  );
}
