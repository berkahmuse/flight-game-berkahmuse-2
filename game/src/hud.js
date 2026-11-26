// Canyon Courier — the HUD and the menu screens: altitude, speed,
// heading compass, fuel, mission progress, and the title / briefing /
// landed / crashed panels. Everything is drawn on the canvas so the
// screenshots show the instruments lit, exactly as the player sees them.

import { clamp } from './random.js';
import { VIEW, PHYSICS } from './config.js';

const W = VIEW.width;
const H = VIEW.height;

function panel(ctx, x, y, w, h, alpha) {
  ctx.save();
  ctx.fillStyle = `rgba(8, 16, 28, ${alpha ?? 0.55})`;
  ctx.strokeStyle = 'rgba(190, 220, 245, 0.35)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 8);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function text(ctx, str, x, y, size, color, align, weight) {
  ctx.save();
  ctx.font = `${weight || 700} ${size}px "Segoe UI", system-ui, sans-serif`;
  ctx.fillStyle = color;
  ctx.textAlign = align || 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(str, x, y);
  ctx.restore();
}

function fmt(n, digits) {
  return n.toFixed(digits ?? 0);
}

// The in-flight instrument cluster.
export function drawHUD(ctx, game, plane, course, time) {
  const p = game.palette;
  const mission = game.mission;

  // Top-left cluster: ALT / SPD / HDG.
  panel(ctx, 12, 10, 250, 74, 0.55);
  text(ctx, 'ALT', 24, 26, 11, p.hudDim);
  text(ctx, `${fmt(plane.y * 120)} FT`, 24, 46, 20, p.hud);
  text(ctx, 'SPD', 104, 26, 11, p.hudDim);
  text(ctx, `${fmt(plane.speed)} KT`, 104, 46, 20, p.hud);
  text(ctx, 'HDG', 196, 26, 11, p.hudDim);
  text(ctx, `${fmt(plane.headingDeg, 0).padStart(3, '0')}°`, 196, 46, 20, p.hud);
  // Compass strip under the readouts.
  const hdg = plane.headingDeg;
  ctx.save();
  ctx.beginPath(); ctx.rect(24, 62, 226, 14); ctx.clip();
  for (let d = -45; d <= 45; d += 15) {
    const deg = ((Math.round(hdg / 15) * 15 + d) % 360 + 360) % 360;
    const x = 137 + d * 1.9;
    if (d % 30 !== 0) continue;
    const label = deg === 0 ? 'N' : deg === 90 ? 'E' : deg === 180 ? 'S' : deg === 270 ? 'W' : `${deg}`;
    text(ctx, label, x, 69, deg % 90 === 0 ? 11 : 9, deg % 90 === 0 ? p.hud : p.hudDim, 'center');
  }
  ctx.restore();
  ctx.fillStyle = p.hudWarn;
  ctx.beginPath(); ctx.moveTo(137, 60); ctx.lineTo(133, 54); ctx.lineTo(141, 54); ctx.closePath(); ctx.fill();

  // Top-right cluster: mission, rings, score, fuel.
  panel(ctx, W - 272, 10, 260, 74, 0.55);
  text(ctx, mission.name, W - 260, 26, 12, p.hud, 'left', 800);
  text(ctx, `RINGS ${game.ringsHit}/${course.rings.length}`, W - 260, 46, 15, p.hud);
  text(ctx, `SCORE ${game.score}`, W - 24, 46, 15, p.hud, 'right');
  // Fuel bar.
  const fuelW = 236;
  const fuelX = W - 260;
  const fuelY = 64;
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  ctx.fillRect(fuelX, fuelY, fuelW, 9);
  const fuelFrac = clamp(game.fuel / PHYSICS.fuelCapacity, 0, 1);
  ctx.fillStyle = fuelFrac < 0.25 ? p.hudWarn : fuelFrac < 0.5 ? '#ffb02e' : p.hudGood;
  ctx.fillRect(fuelX, fuelY, fuelW * fuelFrac, 9);
  text(ctx, 'FUEL', fuelX, fuelY - 8, 9, p.hudDim);
  if (fuelFrac < 0.25 && Math.sin(time * 8) > 0) {
    text(ctx, 'LOW FUEL', W - 24, 26, 12, p.hudWarn, 'right', 800);
  }

  // Artificial horizon: attitude indicator, bottom-left.
  const ax = 62;
  const ay = H - 62;
  const ar = 42;
  ctx.save();
  ctx.beginPath(); ctx.arc(ax, ay, ar, 0, Math.PI * 2); ctx.clip();
  ctx.fillStyle = '#3a6ea8';
  ctx.fillRect(ax - ar, ay - ar, ar * 2, ar * 2);
  ctx.save();
  ctx.translate(ax, ay);
  ctx.rotate(plane.bank);
  ctx.translate(0, clamp(plane.pitch * 90, -26, 26));
  ctx.fillStyle = '#7a5230';
  ctx.fillRect(-ar, 0, ar * 2, ar);
  ctx.fillStyle = '#e8f4ff';
  ctx.fillRect(-ar, -2, ar * 2, 4);
  ctx.restore();
  ctx.strokeStyle = 'rgba(230, 240, 250, 0.8)';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(ax, ay, ar - 1, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = '#ffe27a';
  ctx.beginPath(); ctx.moveTo(ax - 14, ay); ctx.lineTo(ax - 4, ay); ctx.moveTo(ax + 4, ay); ctx.lineTo(ax + 14, ay); ctx.stroke();
  ctx.restore();
  text(ctx, 'ATTITUDE', ax, ay + ar + 12, 10, p.hudDim, 'center');

  // Throttle bar, bottom-right.
  const tx = W - 170;
  const ty = H - 88;
  panel(ctx, tx, ty, 158, 62, 0.5);
  text(ctx, 'THROTTLE', tx + 12, ty + 12, 10, p.hudDim);
  const thrW = 134;
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  ctx.fillRect(tx + 12, ty + 26, thrW, 10);
  ctx.fillStyle = '#ffb02e';
  ctx.fillRect(tx + 12, ty + 26, thrW * plane.throttle, 10);
  text(ctx, `${fmt(plane.throttle * 100)}%`, tx + 12, ty + 50, 11, p.hud);
  text(ctx, 'SHIFT ▲  CTRL ▼', tx + 146, ty + 50, 10, p.hudDim, 'right');

  // Ring flash + toast messages.
  if (game.ringFlash > 0) {
    ctx.save();
    ctx.globalAlpha = game.ringFlash * 0.25;
    ctx.strokeStyle = '#ffd94a';
    ctx.lineWidth = 10;
    ctx.strokeRect(5, 5, W - 10, H - 10);
    ctx.restore();
  }
  if (game.toastText) {
    ctx.save();
    ctx.globalAlpha = clamp(game.toastTime / 0.4, 0, 1);
    text(ctx, game.toastText, W / 2, 104, 22, '#ffe27a', 'center', 800);
    ctx.restore();
  }

  // Next-ring distance readout under the toast.
  const next = game.nextRing;
  if (next) {
    const dist = Math.max(0, (next.seg * 40 - plane.z) | 0);
    text(ctx, `NEXT RING ${dist}m — ${next.y > plane.y ? 'CLIMB' : next.y < plane.y - 4 ? 'DESCEND' : 'LEVEL'}`, W / 2, 140, 12, p.hudDim, 'center');
  } else {
    text(ctx, 'ALL RINGS DONE — LAND ON THE RUNWAY', W / 2, 140, 13, p.hudGood, 'center', 800);
  }

  // Controls hint, faint, bottom centre.
  text(ctx, 'A/D steer · W/S climb & descend · SHIFT throttle up · CTRL throttle down · SPACE boost · P pause', W / 2, H - 14, 11, p.hudDim, 'center');
}

// Big centred title panel used by the menu states.
export function drawTitle(ctx, game, course, time) {
  const p = game.palette;
  ctx.fillStyle = 'rgba(6, 12, 22, 0.45)';
  ctx.fillRect(0, 0, W, H);
  text(ctx, 'CANYON COURIER', W / 2, 108, 56, '#ffe9b0', 'center', 900);
  text(ctx, 'a mountain-canyon parcel run', W / 2, 146, 17, p.hud, 'center');
  text(ctx, 'Fly the rings. Mind the walls. Land the parcel.', W / 2, 172, 15, p.hudDim, 'center');

  const missions = game.missionList;
  missions.forEach((m, i) => {
    const y = 214 + i * 52;
    const selected = m.id === game.mission.id;
    const hover = game.hoverMission === m.id;
    panel(ctx, W / 2 - 260, y, 520, 44, selected || hover ? 0.78 : 0.5);
    if (selected) {
      ctx.strokeStyle = '#ffd94a';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.roundRect(W / 2 - 260, y, 520, 44, 8); ctx.stroke();
    }
    text(ctx, `${m.id}. ${m.name}`, W / 2 - 244, y + 14, 16, p.hud, 'left', 800);
    text(ctx, m.subtitle, W / 2 - 244, y + 32, 12, p.hudDim);
    text(ctx, `${m.rings} rings`, W / 2 + 244, y + 22, 13, p.hud, 'right');
  });
  text(ctx, 'Click a mission, or press 1 / 2 / 3, then ENTER to fly', W / 2, 388, 14, p.hud, 'center');
  text(ctx, 'A/D steer · W/S climb & descend · SHIFT/CTRL throttle · SPACE boost · P pause · R restart', W / 2, 414, 12, p.hudDim, 'center');
  text(ctx, 'Best courier score this session: ' + game.bestScore, W / 2, 442, 12, p.hudDim, 'center');
}

export function drawBrief(ctx, game, time) {
  const p = game.palette;
  const m = game.mission;
  ctx.fillStyle = 'rgba(6, 12, 22, 0.55)';
  ctx.fillRect(0, 0, W, H);
  text(ctx, `MISSION ${m.id} — ${m.name}`, W / 2, 150, 34, '#ffe9b0', 'center', 900);
  text(ctx, m.subtitle, W / 2, 188, 17, p.hud, 'center');
  text(ctx, `${m.rings} delivery rings · par time ${m.parTime}s · canyon width ${m.canyonWidth}m`, W / 2, 218, 14, p.hudDim, 'center');
  text(ctx, 'Through every ring: +100 (dead centre +150) and +4 fuel.', W / 2, 252, 14, p.hud, 'center');
  text(ctx, 'Land on the runway at the end for +500 and a time bonus.', W / 2, 276, 14, p.hud, 'center');
  const pulse = 0.6 + 0.4 * Math.sin(time * 4);
  ctx.save();
  ctx.globalAlpha = pulse;
  text(ctx, 'PRESS ENTER OR CLICK TO TAKE OFF', W / 2, 340, 18, '#ffd94a', 'center', 800);
  ctx.restore();
}

export function drawEnd(ctx, game, lines, title, titleColor) {
  const p = game.palette;
  ctx.fillStyle = 'rgba(6, 12, 22, 0.6)';
  ctx.fillRect(0, 0, W, H);
  text(ctx, title, W / 2, 130, 40, titleColor, 'center', 900);
  lines.forEach((line, i) => {
    text(ctx, line, W / 2, 190 + i * 30, 17, p.hud, 'center');
  });
  text(ctx, 'R — fly again · 1/2/3 — change mission · T — title screen', W / 2, 190 + lines.length * 30 + 26, 14, p.hudDim, 'center');
}
