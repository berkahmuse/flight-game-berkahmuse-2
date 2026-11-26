// Canyon Courier — the game itself: state machine, fixed-step loop,
// scoring, fuel, landing and the deterministic screenshot modes.
// The loop runs at a fixed 1/60s step, so the flight is identical on
// every machine and every replay of the same inputs.

import { MISSIONS, PALETTES, PHYSICS, VIEW } from './config.js';
import { buildCourse } from './terrain.js';
import { Plane } from './plane.js';
import { checkRings, nextRing } from './rings.js';
import { Renderer } from './render.js';
import { drawHUD, drawTitle, drawBrief, drawEnd } from './hud.js';
import { Input } from './input.js';
import { SoundBank } from './audio.js';
import { clamp } from './random.js';

const canvas = document.getElementById('game');
canvas.width = VIEW.width;
canvas.height = VIEW.height;
const ctx = canvas.getContext('2d');

const params = new URLSearchParams(location.search);
const shotMode = params.get('shot'); // start | play | end — deterministic screenshots
const shotSeed = Number(params.get('seed') || 1);

const input = new Input(canvas);
const sound = new SoundBank();
const renderer = new Renderer(canvas);

const game = {
  state: 'title', // title | brief | fly | paused | landed | crashed | outoffuel | win
  missionList: MISSIONS,
  mission: MISSIONS[0],
  palette: PALETTES.day,
  course: null,
  plane: new Plane(),
  score: 0,
  ringsHit: 0,
  missed: 0,
  fuel: PHYSICS.fuelCapacity,
  time: 0, // game time, seconds, advanced only by fixed steps
  flightTime: 0,
  toastText: '',
  toastTime: 0,
  ringFlash: 0,
  bestScore: 0,
  hoverMission: 0,
  landedBonus: 0,
  get nextRing() {
    return this.course ? nextRing(this.course) : null;
  },
  toast(text, dur) {
    this.toastText = text;
    this.toastTime = dur;
  },
};

function startMission(mission) {
  game.mission = mission;
  game.palette = PALETTES[mission.palette];
  game.course = buildCourse(mission);
  game.plane = new Plane();
  game.plane.reset(game.course.centreAt(0));
  game.score = 0;
  game.ringsHit = 0;
  game.missed = 0;
  game.fuel = PHYSICS.fuelCapacity;
  game.flightTime = 0;
  game.toastText = '';
  game.toastTime = 0;
  game.ringFlash = 0;
  game.landedBonus = 0;
  game.state = 'brief';
}

function beginFlight() {
  game.state = 'fly';
  sound.unlock();
}

function endFlight(kind) {
  game.bestScore = Math.max(game.bestScore, game.score);
  if (kind === 'landed') {
    const timeBonus = Math.max(0, Math.round((game.mission.parTime - game.flightTime) * 5));
    game.landedBonus = PHYSICS.landingScore + timeBonus;
    game.score += game.landedBonus;
    game.bestScore = Math.max(game.bestScore, game.score);
    sound.fanfare();
    const allDone = game.mission.id === 3;
    game.state = allDone ? 'win' : 'landed';
  } else if (kind === 'crashed') {
    sound.thud();
    game.state = 'crashed';
  } else if (kind === 'outoffuel') {
    sound.thud();
    game.state = 'outoffuel';
  }
}

// One fixed step of flight: physics, fuel, rings, landing.
function stepFlight() {
  const plane = game.plane;
  const course = game.course;
  const beforeRings = game.ringsHit;
  plane.step(input.flight(), course, game.mission, game.time);
  game.flightTime += 1 / 60;

  // Fuel burns with throttle; boost burns faster.
  const burn = PHYSICS.fuelBurn * (0.4 + plane.throttle) * (input.flight().boost ? PHYSICS.fuelBurnBoost : 1);
  game.fuel -= burn / 60;
  if (game.fuel <= 0) {
    game.fuel = 0;
    endFlight('outoffuel');
    return;
  }

  checkRings(course, plane, game);
  if (game.ringsHit > beforeRings) sound.ring(course.rings[game.ringsHit - 1]?.perfect);

  // Landing: past the runway threshold, slow and low over the strip.
  const rw = course.runway;
  const seg = plane.segment;
  if (seg >= rw.seg + 2 && seg < rw.seg + rw.length) {
    const overStrip = Math.abs(plane.x - rw.x) < rw.width / 2;
    if (overStrip && plane.y < 6 && plane.speed < 150) {
      plane.speed = Math.max(0, plane.speed - 2.2);
      if (plane.speed < 62 && plane.y < 3.4) {
        endFlight('landed');
        return;
      }
    }
  }
  // Flew past the runway without landing: the parcel is late.
  if (seg >= rw.seg + rw.length + 4) {
    game.toast('OVERSHOT THE RUNWAY — turn back is not an option', 2);
    endFlight('crashed');
    plane.crashReason = 'overshot the runway';
    return;
  }

  if (!plane.alive) endFlight('crashed');
  sound.setEngine(clamp(plane.speed / PHYSICS.maxSpeed, 0, 1), true);
}

function update(dt) {
  game.time += dt;
  if (game.toastTime > 0) game.toastTime -= dt;
  if (game.ringFlash > 0) game.ringFlash = Math.max(0, game.ringFlash - dt * 2.2);

  const click = input.consumeClick();
  const hover = input.mouse;

  if (game.state === 'title') {
    game.hoverMission = 0;
    game.missionList.forEach((m, i) => {
      const y = 214 + i * 52;
      if (hover.x > VIEW.width / 2 - 260 && hover.x < VIEW.width / 2 + 260 && hover.y > y && hover.y < y + 44) {
        game.hoverMission = m.id;
      }
    });
    if (click) {
      const hit = game.missionList.find((m, i) => {
        const y = 214 + i * 52;
        return click.x > VIEW.width / 2 - 260 && click.x < VIEW.width / 2 + 260 && click.y > y && click.y < y + 44;
      });
      if (hit) startMission(hit);
    }
    for (const m of game.missionList) {
      if (input.wasPressed(`Digit${m.id}`) || input.wasPressed(`Numpad${m.id}`)) startMission(m);
    }
    if (input.wasPressed('Enter')) beginFlight();
    return;
  }

  if (game.state === 'brief') {
    if (input.wasPressed('Enter') || click) beginFlight();
    if (input.wasPressed('Escape')) game.state = 'title';
    return;
  }

  if (game.state === 'fly') {
    if (input.wasPressed('KeyP') || input.wasPressed('Escape')) {
      game.state = 'paused';
      sound.setEngine(0, false);
      return;
    }
    stepFlight();
    return;
  }

  if (game.state === 'paused') {
    if (input.wasPressed('KeyP') || input.wasPressed('Escape') || input.wasPressed('Enter')) game.state = 'fly';
    if (input.wasPressed('KeyR')) startMission(game.mission);
    return;
  }

  // End states: restart, change mission, back to title.
  if (input.wasPressed('KeyR')) startMission(game.mission);
  if (input.wasPressed('KeyT')) game.state = 'title';
  for (const m of game.missionList) {
    if (input.wasPressed(`Digit${m.id}`) || input.wasPressed(`Numpad${m.id}`)) startMission(m);
  }
}

function render() {
  const plane = game.plane;
  const course = game.course;
  const time = game.time;
  if (!course) {
    // Title screen before any mission is picked: fly mission 1's canyon
    // behind the menu so the first screenshot already shows the world.
    game.course = buildCourse(MISSIONS[0]);
    game.palette = PALETTES.day;
  }
  renderer.draw(game, game.course, plane, time);

  if (game.state === 'title') drawTitle(ctx, game, game.course, time);
  else if (game.state === 'brief') { drawHUD(ctx, game, plane, game.course, time); drawBrief(ctx, game, time); }
  else if (game.state === 'fly' || game.state === 'paused') {
    drawHUD(ctx, game, plane, game.course, time);
    if (game.state === 'paused') {
      ctx.fillStyle = 'rgba(6, 12, 22, 0.55)';
      ctx.fillRect(0, 0, VIEW.width, VIEW.height);
      ctx.save();
      ctx.font = '900 40px "Segoe UI", system-ui, sans-serif';
      ctx.fillStyle = '#ffe9b0';
      ctx.textAlign = 'center';
      ctx.fillText('PAUSED', VIEW.width / 2, VIEW.height / 2 - 10);
      ctx.font = '700 15px "Segoe UI", system-ui, sans-serif';
      ctx.fillStyle = '#d8ecff';
      ctx.fillText('P / ESC resume · R restart mission', VIEW.width / 2, VIEW.height / 2 + 24);
      ctx.restore();
    }
  } else if (game.state === 'landed' || game.state === 'win') {
    drawHUD(ctx, game, plane, game.course, time);
    const lines = [
      `Parcel delivered to ${game.mission.name} runway — ${game.ringsHit}/${game.course.rings.length} rings flown`,
      `Flight time ${game.flightTime.toFixed(1)}s (par ${game.mission.parTime}s) · landing bonus +${game.landedBonus}`,
      `Fuel left ${game.fuel.toFixed(0)}% · final score ${game.score}`,
      game.state === 'win' ? 'All three courier routes complete — you are the Canyon Courier!' : 'Next route unlocked on the title screen.',
    ];
    drawEnd(ctx, game, lines, game.state === 'win' ? 'ROUTE COMPLETE!' : 'PARCEL DELIVERED!', '#7dff8a');
  } else if (game.state === 'crashed') {
    drawHUD(ctx, game, plane, game.course, time);
    drawEnd(ctx, game, [
      `Your courier ${plane.crashReason || 'crashed'} — the parcel is scattered down the canyon.`,
      `Rings flown ${game.ringsHit}/${game.course.rings.length} · score ${game.score}`,
      'The canyon keeps the parcel. Fly it again, slower through the turns.',
    ], 'CRASHED!', '#ff5a4e');
  } else if (game.state === 'outoffuel') {
    drawHUD(ctx, game, plane, game.course, time);
    drawEnd(ctx, game, [
      'Out of fuel over the canyon — the courier glides down to a dusty stop.',
      `Rings flown ${game.ringsHit}/${game.course.rings.length} · score ${game.score}`,
      'Rings top the tank up +4 fuel each. Fly through them, not past them.',
    ], 'OUT OF FUEL', '#ff5a4e');
  }
}

// Deterministic screenshot states: no input, no wall clock, fixed time.
function applyShot() {
  if (shotMode === 'start') {
    startMission(MISSIONS[0]);
    game.state = 'title';
    game.time = 12.5;
    game.plane.z = 480;
    game.plane.x = game.course.centreAt(12);
    game.plane.y = 14;
    game.plane.speed = 118;
    game.plane.bank = 0.08;
  } else if (shotMode === 'play') {
    startMission(MISSIONS[0]);
    game.state = 'fly';
    game.time = 24.0;
    // Park the plane mid-course, banked into a ring, for the action shot.
    const targetSeg = 30 + 4 * 26; // just before ring 5
    game.plane.z = targetSeg * 40 - 260;
    const ring = game.course.rings[4];
    game.plane.x = ring.x - 6;
    game.plane.y = ring.y + 1;
    game.plane.speed = 132;
    game.plane.throttle = 0.72;
    game.plane.bank = 0.22;
    game.ringsHit = 4;
    game.course.rings.slice(0, 4).forEach((r) => { r.passed = true; });
    game.score = 450;
    game.fuel = 82;
    game.flightTime = 61.4;
    game.toastText = 'RING 4/12  +100';
    game.toastTime = 1.2;
  } else if (shotMode === 'end') {
    startMission(MISSIONS[2]);
    game.state = 'landed';
    game.time = 40.0;
    const rw = game.course.runway;
    game.plane.z = (rw.seg + 6) * 40;
    game.plane.x = rw.x;
    game.plane.y = 2.6;
    game.plane.speed = 58;
    game.plane.throttle = 0.2;
    game.ringsHit = 14;
    game.course.rings.forEach((r) => { r.passed = true; r.perfect = false; });
    game.course.rings[2].perfect = true;
    game.score = 2150;
    game.landedBonus = 740;
    game.fuel = 31;
    game.flightTime = 148.2;
  }
}

// Fixed-step main loop: accumulate real time, step at 1/60s.
let last = performance.now();
let acc = 0;
function frame(now) {
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  if (!shotMode) {
    acc += dt;
    while (acc >= 1 / 60) {
      update(1 / 60);
      acc -= 1 / 60;
    }
  }
  render();
  input.endFrame();
  requestAnimationFrame(frame);
}

if (shotMode) {
  applyShot();
  render();
  // One settled frame is all a screenshot needs; keep the loop off so the
  // capture is byte-stable and never advances past the posed state.
} else {
  startMission(MISSIONS[0]);
  game.state = 'title';
  requestAnimationFrame(frame);
}
