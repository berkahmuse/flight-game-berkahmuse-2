// Canyon Courier — tuning constants, mission definitions and palettes.
// One file holds every number a designer would tweak, so the rest of the
// code never hard-codes a magic value twice.

export const VIEW = { width: 1280, height: 480 };

export const PHYSICS = {
  segmentLength: 40, // world units per canyon segment
  drawDistance: 46, // segments drawn ahead of the plane
  cameraDepth: 0.84, // perspective focal factor
  maxSpeed: 210, // knots at full throttle
  minSpeed: 55, // knots, below this the plane stalls toward the ground
  cruiseSpeed: 120,
  accel: 46, // knots per second at full throttle
  drag: 12,
  steerRate: 26, // lateral units per second at full deflection
  climbRate: 9, // altitude units per second at full pitch
  maxAltitude: 46,
  groundClearance: 2.2,
  bankMax: 0.62, // radians of visual bank
  fuelCapacity: 100,
  fuelBurn: 1.15, // per second at cruise throttle
  fuelBurnBoost: 2.4,
  ringFuelBonus: 4,
  ringScore: 100,
  centerBonus: 50,
  landingScore: 500,
};

export const MISSIONS = [
  {
    id: 1,
    name: 'PINE POST RUN',
    subtitle: 'Deliver the parcel to Pine Post runway',
    seed: 0xc0ffee1,
    rings: 12,
    canyonWidth: 44,
    wallBase: 26,
    wallVar: 10,
    wind: 0,
    palette: 'day',
    parTime: 150,
  },
  {
    id: 2,
    name: 'STORM GAP',
    subtitle: 'Thread the narrow gap in a crosswind',
    seed: 0x57a11,
    rings: 16,
    canyonWidth: 30,
    wallBase: 26,
    wallVar: 14,
    wind: 7,
    palette: 'dusk',
    parTime: 190,
  },
  {
    id: 3,
    name: 'LANTERN FIELD',
    subtitle: 'Night courier — land by lantern light',
    seed: 0x9a97,
    rings: 14,
    canyonWidth: 36,
    wallBase: 28,
    wallVar: 12,
    wind: 3,
    palette: 'night',
    parTime: 170,
  },
];

export const PALETTES = {
  day: {
    skyTop: '#2f6fd0', skyMid: '#7fb2e8', skyLow: '#cfe8f7',
    sun: '#fff3c4', sunGlow: 'rgba(255, 240, 180, 0.55)',
    far: '#8fa8c8', mid: '#6d8aa8', near: '#546e88',
    floorA: '#b98d5f', floorB: '#a87c50',
    wallA: '#8a5f3d', wallB: '#6f4a2e', wallTop: '#c98f5a',
    wallShade: 0.72, ring: '#ffb02e', ringNext: '#ffd94a',
    runway: '#3a3f46', runwayMark: '#f2f2e8',
    hud: '#eaf6ff', hudDim: '#9fc6e8', hudWarn: '#ff5a4e', hudGood: '#7dff8a',
    cloud: 'rgba(255,255,255,0.85)',
  },
  dusk: {
    skyTop: '#3a2a5e', skyMid: '#c65a3c', skyLow: '#f2a35e',
    sun: '#ffcf8a', sunGlow: 'rgba(255, 160, 80, 0.5)',
    far: '#6b4a6e', mid: '#54384f', near: '#3e2a3c',
    floorA: '#8a5a44', floorB: '#77503c',
    wallA: '#5e3a2c', wallB: '#472a20', wallTop: '#a05a38',
    wallShade: 0.66, ring: '#ff8a2e', ringNext: '#ffc94a',
    runway: '#2c2f36', runwayMark: '#ffe9b0',
    hud: '#ffe9c9', hudDim: '#d8a878', hudWarn: '#ff6a5e', hudGood: '#8aff9a',
    cloud: 'rgba(255, 190, 150, 0.55)',
  },
  night: {
    skyTop: '#050914', skyMid: '#0d1c38', skyLow: '#1d3355',
    sun: '#e8ecff', sunGlow: 'rgba(180, 200, 255, 0.35)',
    far: '#2a3a58', mid: '#1e2c46', near: '#16223a',
    floorA: '#4a4038', floorB: '#3e352e',
    wallA: '#2e2a33', wallB: '#211d28', wallTop: '#4a4258',
    wallShade: 0.6, ring: '#39c6ff', ringNext: '#8fe6ff',
    runway: '#23262e', runwayMark: '#ffe9a8',
    hud: '#d8ecff', hudDim: '#7fa8d8', hudWarn: '#ff6a5e', hudGood: '#8aff9a',
    cloud: 'rgba(160, 180, 220, 0.28)',
  },
};
