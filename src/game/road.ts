import {
  SEGMENT_SPACING,
  getRoadMinWidth,
  getRoadStartWidth,
} from './constants';
import type { RoadSegment } from './types';

let noiseSeed = Math.random() * 1000;

function noise1d(t: number): number {
  const x = Math.sin(t * 0.0017 + noiseSeed) * 43758.5453;
  return x - Math.floor(x);
}

export function initRoad(height: number, centerX: number, canvasWidth: number): RoadSegment[] {
  const segments: RoadSegment[] = [];
  const count = Math.ceil(height / SEGMENT_SPACING) + 20;
  let x = centerX;
  for (let i = 0; i < count; i++) {
    const y = height - i * SEGMENT_SPACING;
    segments.push({
      y,
      centerX: x,
      width: getRoadStartWidth(canvasWidth),
      hasRoad: true,
    });
  }
  return segments.sort((a, b) => a.y - b.y);
}

export function appendRoadSegment(
  segments: RoadSegment[],
  time: number,
  segmentIndex: number,
  difficulty: number,
  distance: number,
  canvasWidth: number,
  hasRoad = true,
): RoadSegment {
  const topY = segments.length > 0 ? Math.min(...segments.map((s) => s.y)) : 0;
  const newY = topY - SEGMENT_SPACING;

  const prev = segments.find((s) => s.y === topY + SEGMENT_SPACING) ?? segments[0];
  let roadX = prev?.centerX ?? canvasWidth / 2;

  // Gentle sinusoidal weave + smooth noise — no sudden snaps
  const amplitude = 1.5 + difficulty * 1.2;
  roadX += Math.sin(time * 0.002 + segmentIndex * 0.12) * amplitude;
  roadX += (noise1d(time + segmentIndex * 17) - 0.5) * (2 + difficulty * 1.4);

  const margin = 60;
  roadX = Math.max(margin, Math.min(canvasWidth - margin, roadX));

  const startW = getRoadStartWidth(canvasWidth);
  const width = Math.max(getRoadMinWidth(canvasWidth), startW - distance * 0.018);

  return {
    y: newY,
    centerX: roadX,
    width,
    hasRoad,
  };
}

export function trimRoad(segments: RoadSegment[], maxY: number): RoadSegment[] {
  return segments.filter((s) => s.y <= maxY + SEGMENT_SPACING * 2);
}

export function getSegmentAtY(segments: RoadSegment[], y: number): RoadSegment | null {
  if (segments.length === 0) return null;
  let closest = segments[0];
  let minDist = Math.abs(segments[0].y - y);
  for (const seg of segments) {
    const d = Math.abs(seg.y - y);
    if (d < minDist) {
      minDist = d;
      closest = seg;
    }
  }
  return closest;
}

/** Road segment nearest the leading (top) edge — for spawning hazards on asphalt */
export function getLeadingRoadSegment(segments: RoadSegment[]): RoadSegment | null {
  if (segments.length === 0) return null;
  return segments.reduce((best, s) => (s.y < best.y ? s : best), segments[0]);
}

export function randomXOnRoad(
  segments: RoadSegment[],
  y: number,
  canvasWidth: number,
): number {
  const seg = getSegmentAtY(segments, y) ?? getLeadingRoadSegment(segments);
  if (!seg) return canvasWidth / 2;
  const half = seg.width * 0.38;
  const x = seg.centerX + (Math.random() - 0.5) * half * 2;
  return Math.max(seg.centerX - half, Math.min(seg.centerX + half, x));
}
