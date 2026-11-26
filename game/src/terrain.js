// Canyon Courier — the canyon itself: walls, floor, rings and runway.
// The whole course is generated once from the mission seed, so every run
// of a mission flies the same canyon, the same rings, the same landing.

import { mulberry32, range, clamp } from './random.js';
import { PHYSICS } from './config.js';

const SEG = PHYSICS.segmentLength;

export function buildCourse(mission) {
  const rng = mulberry32(mission.seed);
  const ringGap = 26; // segments between rings
  const firstRing = 30;
  const ringCount = mission.rings;
  const runwayAt = firstRing + ringCount * ringGap + 40; // segment index
  const totalSegments = runwayAt + 60;

  // Smooth wall profile: a few control heights, cosine-interpolated.
  const controls = [];
  const nControls = Math.ceil(totalSegments / 24) + 2;
  for (let i = 0; i < nControls; i++) {
    controls.push(range(rng, mission.wallBase - mission.wallVar, mission.wallBase + mission.wallVar));
  }
  // Gentle canyon sway: the centre line wanders so the course curves.
  const sway = [];
  const nSway = Math.ceil(totalSegments / 30) + 2;
  for (let i = 0; i < nSway; i++) sway.push(range(rng, -9, 9));

  function smooth(arr, x, step) {
    const i = Math.floor(x / step);
    const a = arr[clamp(i, 0, arr.length - 1)];
    const b = arr[clamp(i + 1, 0, arr.length - 1)];
    const t = (x / step - i) * Math.PI;
    return a + (b - a) * (0.5 - 0.5 * Math.cos(t));
  }

  const wallHeightAt = (seg) => smooth(controls, seg, 24);
  const centreAt = (seg) => smooth(sway, seg, 30);
  const halfWidthAt = (seg) => {
    // The canyon pinches slightly near the middle of each leg.
    const pinch = 1 - 0.16 * Math.sin((seg / totalSegments) * Math.PI * 2.0);
    return mission.canyonWidth * 0.5 * pinch;
  };

  // Rings: alternate sides and heights, always reachable, never inside a wall.
  const rings = [];
  const ringRng = mulberry32(mission.seed ^ 0x51ab);
  for (let i = 0; i < ringCount; i++) {
    const seg = firstRing + i * ringGap;
    const half = halfWidthAt(seg);
    const x = centreAt(seg) + range(ringRng, -half * 0.55, half * 0.55);
    const y = range(ringRng, 8, 26);
    const r = range(ringRng, 6.5, 8.5);
    rings.push({ seg, x, y, r, passed: false, perfect: false });
  }

  // Runway sits on the canyon floor at the end of the course.
  const runway = {
    seg: runwayAt,
    x: centreAt(runwayAt),
    length: 34, // segments
    width: 11,
  };

  return {
    mission,
    totalSegments,
    runwayAt,
    runway,
    rings,
    wallHeightAt,
    centreAt,
    halfWidthAt,
    // Deterministic clouds for the sky, seeded once per mission.
    clouds: Array.from({ length: 14 }, () => ({
      x: range(rng, 0, 1),
      y: range(rng, 0.04, 0.3),
      s: range(rng, 0.5, 1.4),
      v: range(rng, 0.002, 0.008),
    })),
    // Deterministic far-ridge peaks, two parallax layers.
    ridges: [0, 1].map((layer) => {
      const peaks = [];
      const prng = mulberry32(mission.seed ^ (0xbeef + layer * 77));
      for (let i = 0; i <= 24; i++) peaks.push(range(prng, 0.12, layer === 0 ? 0.42 : 0.62));
      return peaks;
    }),
    // Deterministic scrub rocks on the open ground outside the canyon.
    scrub: Array.from({ length: 26 }, () => ({
      x: range(rng, 0, 1),
      y: range(rng, 0.5, 0.96),
      s: range(rng, 0.5, 1.7),
    })),
  };
}

// World position of the plane at a segment, for the renderer.
export function segmentZ(seg) {
  return seg * SEG;
}

export { SEG };
