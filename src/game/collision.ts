import { COLLISION_MARGIN, LEMON_RADIUS, OFF_ROAD_DEATH_FRAMES } from './constants';
import type { LemonState, RoadSegment } from './types';
import { getSegmentAtY } from './road';

export function checkCollision(
  lemon: LemonState,
  lemonY: number,
  road: RoadSegment[],
  offRoadFrames: number,
): { hit: boolean; offRoadFrames: number } {
  const seg = getSegmentAtY(road, lemonY);
  if (!seg || !seg.hasRoad) {
    return {
      hit: offRoadFrames + 1 >= OFF_ROAD_DEATH_FRAMES,
      offRoadFrames: offRoadFrames + 1,
    };
  }

  const halfWidth = seg.width / 2 - LEMON_RADIUS - COLLISION_MARGIN;
  const dist = Math.abs(lemon.x - seg.centerX);

  if (dist > halfWidth) {
    const next = offRoadFrames + 1;
    return {
      hit: next >= OFF_ROAD_DEATH_FRAMES,
      offRoadFrames: next,
    };
  }

  return { hit: false, offRoadFrames: 0 };
}
