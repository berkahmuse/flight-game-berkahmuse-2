// Canyon Courier — the courier plane: physics, crash checks and the
// chase-view drawing of the aircraft itself.

import { clamp } from './random.js';
import { PHYSICS } from './config.js';

export class Plane {
  constructor() {
    this.reset(0);
  }

  reset(startX) {
    this.x = startX; // lateral position across the canyon
    this.y = 12; // altitude above the canyon floor
    this.z = 0; // distance flown, world units
    this.speed = 0; // knots
    this.throttle = 0.55;
    this.bank = 0; // visual roll, radians
    this.pitch = 0; // visual pitch, radians
    this.vx = 0;
    this.alive = true;
    this.crashReason = '';
    this.propAngle = 0;
  }

  // One fixed 1/60s step. Input: {steer, pitch, throttleUp, throttleDown, boost}
  // Wind: deterministic lateral push (mission 2 crosswind gusts).
  step(input, course, mission, time) {
    if (!this.alive) return;
    const dt = 1 / 60;

    if (input.throttleUp) this.throttle = clamp(this.throttle + dt * 0.9, 0, 1);
    if (input.throttleDown) this.throttle = clamp(this.throttle - dt * 0.9, 0, 1);
    const target = PHYSICS.minSpeed + this.throttle * (PHYSICS.maxSpeed - PHYSICS.minSpeed);
    this.speed += (target - this.speed) * Math.min(1, dt * 0.9);
    if (input.boost && this.throttle > 0.9) this.speed = Math.min(this.speed + dt * 26, PHYSICS.maxSpeed + 34);

    // Steering: full deflection at low speed is weaker, strong at cruise.
    const steerAuthority = clamp(this.speed / PHYSICS.cruiseSpeed, 0.35, 1.15);
    const steer = input.steer * steerAuthority;
    this.vx = steer * PHYSICS.steerRate;
    const wind = mission.wind * Math.sin(time * 0.55) * Math.sin(time * 0.13 + 1.7);
    this.x += (this.vx + wind) * dt;

    // Pitch: climb and descend, with a stall sink when too slow.
    const climb = input.pitch * PHYSICS.climbRate;
    this.y += climb * dt;
    if (this.speed < PHYSICS.minSpeed + 6) this.y -= dt * 3.2; // stall sink
    this.y = clamp(this.y, 0, PHYSICS.maxAltitude);

    this.z += (this.speed * 0.62) * dt; // knots -> world units per second
    this.propAngle += dt * (6 + this.speed * 0.35);

    // Smooth visual bank and pitch toward the inputs.
    this.bank += ((steer * PHYSICS.bankMax) - this.bank) * Math.min(1, dt * 6);
    this.pitch += ((input.pitch * -0.22) - this.pitch) * Math.min(1, dt * 5);

    // Crash checks against the canyon at the plane's segment.
    const seg = Math.floor(this.z / PHYSICS.segmentLength);
    const half = course.halfWidthAt(seg);
    const centre = course.centreAt(seg);
    if (this.y <= PHYSICS.groundClearance && this.speed > 4) {
      this.crash('clipped the canyon floor');
    } else if (Math.abs(this.x - centre) > half - 1.5) {
      this.crash('slammed into the canyon wall');
    }
  }

  crash(reason) {
    if (!this.alive) return;
    this.alive = false;
    this.crashReason = reason;
  }

  get segment() {
    return Math.floor(this.z / PHYSICS.segmentLength);
  }

  get headingDeg() {
    // Heading wanders with the canyon centre line and the bank.
    return ((270 + this.bank * 28 + this.vx * 0.4) % 360 + 360) % 360;
  }
}

// Draw the plane from chase view: tail, wings, fuselage and canopy,
// banked with the turn, nav lights blinking on game time.
export function drawPlane(ctx, cx, cy, scale, bank, pitch, time, palette) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(bank);
  ctx.scale(scale, scale * (1 - pitch * 0.25));
  ctx.lineJoin = 'round';

  const body = '#d8433a';
  const bodyDark = '#8f231d';
  const cream = '#f6ead2';
  const metal = '#c8ccd2';

  // Shadow on the canyon floor is drawn by the renderer; here is the plane.
  // Main wings (wide, slightly swept back).
  ctx.fillStyle = cream;
  ctx.beginPath();
  ctx.moveTo(-118, 6); ctx.lineTo(-14, -8); ctx.lineTo(14, -8); ctx.lineTo(118, 6);
  ctx.lineTo(108, 16); ctx.lineTo(0, 8); ctx.lineTo(-108, 16);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = bodyDark; ctx.lineWidth = 2; ctx.stroke();

  // Wing tip stripes.
  ctx.fillStyle = body;
  ctx.fillRect(-118, 6, 16, 7);
  ctx.fillRect(102, 6, 16, 7);

  // Tailplane.
  ctx.fillStyle = metal;
  ctx.beginPath();
  ctx.moveTo(-46, -34); ctx.lineTo(-8, -40); ctx.lineTo(8, -40); ctx.lineTo(46, -34);
  ctx.lineTo(40, -26); ctx.lineTo(0, -30); ctx.lineTo(-40, -26);
  ctx.closePath(); ctx.fill();

  // Vertical fin.
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.moveTo(-10, -38); ctx.lineTo(0, -66); ctx.lineTo(10, -38);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = cream;
  ctx.beginPath();
  ctx.moveTo(-4, -44); ctx.lineTo(0, -58); ctx.lineTo(4, -44);
  ctx.closePath(); ctx.fill();

  // Fuselage: tapered body from tail to nose.
  const grad = ctx.createLinearGradient(0, -40, 0, 62);
  grad.addColorStop(0, '#e85a4a');
  grad.addColorStop(0.55, body);
  grad.addColorStop(1, bodyDark);
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(-9, -40);
  ctx.quadraticCurveTo(-16, 0, -12, 46);
  ctx.quadraticCurveTo(-7, 62, 0, 62);
  ctx.quadraticCurveTo(7, 62, 12, 46);
  ctx.quadraticCurveTo(16, 0, 9, -40);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 1.5; ctx.stroke();

  // Canopy (the pilot's bubble, lit from the sky).
  ctx.fillStyle = '#bfe3ff';
  ctx.beginPath();
  ctx.ellipse(0, 6, 8.5, 15, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.beginPath();
  ctx.ellipse(-2.5, 0, 3, 7, -0.3, 0, Math.PI * 2);
  ctx.fill();

  // Parcel pod under the fuselage — the courier's cargo.
  ctx.fillStyle = '#7a4a21';
  ctx.beginPath();
  ctx.roundRect(-9, 34, 18, 14, 3);
  ctx.fill();
  ctx.strokeStyle = '#4a2c12'; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(0, 34); ctx.lineTo(0, 48);
  ctx.moveTo(-9, 41); ctx.lineTo(9, 41);
  ctx.stroke();

  // Spinning propeller disc at the nose (rear view: a faint blur ring).
  ctx.save();
  ctx.translate(0, 58);
  ctx.rotate(0);
  ctx.fillStyle = 'rgba(200, 210, 220, 0.28)';
  ctx.beginPath();
  ctx.ellipse(0, 0, 13, 4.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Nav lights: red port, green starboard, blinking with game time.
  const blink = Math.sin(time * 6) > -0.2;
  if (blink) {
    ctx.fillStyle = '#ff2e2e';
    ctx.beginPath(); ctx.arc(-116, 10, 3.4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#2eff6a';
    ctx.beginPath(); ctx.arc(116, 10, 3.4, 0, Math.PI * 2); ctx.fill();
  }

  ctx.restore();
}
