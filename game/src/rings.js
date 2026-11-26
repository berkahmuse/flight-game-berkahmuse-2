// Canyon Courier — delivery rings: pass detection, scoring and drawing.
// A ring counts when the plane crosses its segment inside the circle;
// dead-centre passes pay a bonus and top the fuel up a little.

import { PHYSICS } from './config.js';

export function checkRings(course, plane, game) {
  const seg = plane.segment;
  for (const ring of course.rings) {
    if (ring.passed || ring.seg > seg) continue;
    if (ring.seg < seg - 1) {
      // Flown past without entering: a miss costs time, not the run.
      ring.passed = true;
      ring.missed = true;
      game.missed += 1;
      game.toast(`MISSED RING ${game.ringsHit + game.missed} — keep flying!`, 1.6);
      continue;
    }
    const dx = plane.x - ring.x;
    const dy = plane.y - ring.y;
    const dist = Math.hypot(dx, dy);
    if (dist <= ring.r) {
      ring.passed = true;
      const centre = dist <= ring.r * 0.45;
      ring.perfect = centre;
      game.ringsHit += 1;
      game.score += PHYSICS.ringScore + (centre ? PHYSICS.centerBonus : 0);
      game.fuel = Math.min(PHYSICS.fuelCapacity, game.fuel + PHYSICS.ringFuelBonus);
      game.toast(
        centre ? `PERFECT CENTRE! +${PHYSICS.ringScore + PHYSICS.centerBonus}` : `RING ${game.ringsHit}/${course.rings.length}  +${PHYSICS.ringScore}`,
        1.4,
      );
      game.ringFlash = 1;
    }
  }
}

export function nextRing(course) {
  return course.rings.find((r) => !r.passed) ?? null;
}

// Draw one ring as a glowing circle in screen space. The renderer hands
// us the projected centre and radius; we only decide the look.
export function drawRing(ctx, sx, sy, radius, state, time, palette) {
  // state: 'next' | 'later' | 'passed' | 'perfect' | 'missed'
  if (radius < 2) return;
  ctx.save();
  ctx.lineWidth = Math.max(2, radius * 0.09);
  if (state === 'passed') {
    ctx.strokeStyle = palette.hudGood;
    ctx.globalAlpha = 0.55;
  } else if (state === 'perfect') {
    ctx.strokeStyle = '#ffe27a';
    ctx.globalAlpha = 0.8;
  } else if (state === 'missed') {
    ctx.strokeStyle = '#8a8a8a';
    ctx.globalAlpha = 0.4;
  } else if (state === 'next') {
    const pulse = 0.75 + 0.25 * Math.sin(time * 5);
    ctx.globalAlpha = pulse;
    ctx.strokeStyle = palette.ringNext;
    ctx.shadowColor = palette.ringNext;
    ctx.shadowBlur = 18;
  } else {
    ctx.strokeStyle = palette.ring;
    ctx.globalAlpha = 0.85;
  }
  ctx.beginPath();
  ctx.arc(sx, sy, radius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.shadowBlur = 0;
  // Inner chevrons point the pilot through the middle.
  if (state === 'next' || state === 'later') {
    ctx.globalAlpha = state === 'next' ? 0.9 : 0.5;
    ctx.strokeStyle = state === 'next' ? palette.ringNext : palette.ring;
    ctx.lineWidth = Math.max(1.5, radius * 0.05);
    const c = radius * 0.45;
    ctx.beginPath();
    ctx.moveTo(sx - c, sy - c * 0.4); ctx.lineTo(sx, sy + c * 0.2); ctx.lineTo(sx + c, sy - c * 0.4);
    ctx.stroke();
  }
  ctx.restore();
}
