// Canyon Courier — the scene renderer: sky, ridges, canyon walls and
// floor, rings, runway and the plane's shadow, all projected from the
// chase camera behind the courier plane.

import { clamp, lerp } from './random.js';
import { PHYSICS, VIEW } from './config.js';
import { drawRing } from './rings.js';
import { drawPlane } from './plane.js';

const SEG = PHYSICS.segmentLength;

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
  }

  // Project a world point (x, y, z) to screen space from the camera.
  // Returns null when the point is behind the camera.
  project(x, y, z, cam) {
    const rel = z - cam.z;
    if (rel < 2) return null;
    const scale = cam.focal / rel;
    return {
      x: cam.cx + (x - cam.x) * scale,
      y: cam.horizon - (y - cam.y) * scale,
      scale,
    };
  }

  draw(game, course, plane, time) {
    const { ctx } = this;
    const W = VIEW.width;
    const H = VIEW.height;
    const palette = game.palette;
    const cam = {
      x: plane.x,
      y: plane.y + 5,
      z: plane.z - 14,
      cx: W / 2,
      horizon: H * 0.42,
      focal: 300,
    };

    // Base fills first: sky above the horizon, rocky ground below it, so
    // no part of the frame is ever empty canvas behind the canyon.
    const sky = ctx.createLinearGradient(0, 0, 0, cam.horizon);
    sky.addColorStop(0, palette.skyTop);
    sky.addColorStop(0.7, palette.skyMid);
    sky.addColorStop(1, palette.skyLow);
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, cam.horizon + 1);
    const ground = ctx.createLinearGradient(0, cam.horizon, 0, H);
    ground.addColorStop(0, palette.floorB);
    ground.addColorStop(1, '#241a12');
    ctx.fillStyle = ground;
    ctx.fillRect(0, cam.horizon, W, H - cam.horizon);

    // Scrub rocks on the open ground, parallaxed against the camera.
    for (const s of course.scrub) {
      const sx = (((s.x - plane.x * 0.004) % 1) + 1) % 1 * W;
      const sy = s.y * H;
      const fade = (sy / H - 0.42) / 0.58; // nearer rocks are bigger and darker
      ctx.fillStyle = `rgba(40, 26, 14, ${0.25 + fade * 0.35})`;
      ctx.beginPath();
      ctx.ellipse(sx, sy, 16 * s.s * fade + 3, 5 * s.s * fade + 1.5, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    this.drawSky(ctx, W, H, palette, course, plane, cam, time);
    this.drawCanyon(ctx, W, H, palette, course, plane, cam, game, time);
    this.drawPlaneShadow(ctx, palette, plane, cam);
    // Chase-view plane, low and centred, banking with the turn.
    drawPlane(ctx, W / 2 + plane.bank * 60, H * 0.85, 0.82, plane.bank, plane.pitch, time, palette);
  }

  drawSky(ctx, W, H, palette, course, plane, cam, time) {
    // Sun (or the night moon) with a soft glow.
    const sunX = W * 0.78 - plane.x * 2;
    const sunY = H * 0.16;
    ctx.save();
    ctx.fillStyle = palette.sunGlow;
    ctx.beginPath(); ctx.arc(sunX, sunY, 46, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = palette.sun;
    ctx.beginPath(); ctx.arc(sunX, sunY, 22, 0, Math.PI * 2); ctx.fill();
    ctx.restore();

    // Drifting clouds, seeded per mission, parallaxed by the camera.
    ctx.fillStyle = palette.cloud;
    for (const c of course.clouds) {
      const cx = (((c.x + time * c.v - plane.x * 0.001) % 1) + 1) % 1 * W;
      const cy = c.y * H;
      const s = c.s;
      ctx.beginPath();
      ctx.ellipse(cx, cy, 46 * s, 12 * s, 0, 0, Math.PI * 2);
      ctx.ellipse(cx + 30 * s, cy + 4 * s, 30 * s, 9 * s, 0, 0, Math.PI * 2);
      ctx.ellipse(cx - 32 * s, cy + 5 * s, 26 * s, 8 * s, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // Two far ridge layers, parallaxed against the heading: one smooth
    // polyline each, drifting slowly with the camera's lateral position.
    course.ridges.forEach((peaks, layer) => {
      const baseY = H * (0.42 - layer * 0.045);
      const amp = H * (layer === 0 ? 0.16 : 0.24);
      const shift = -plane.x * (layer === 0 ? 5 : 9);
      ctx.fillStyle = layer === 0 ? palette.far : palette.mid;
      ctx.beginPath();
      ctx.moveTo(-8, baseY + 4);
      for (let i = 0; i <= 24; i++) {
        const px = (i / 24) * (W + 16) - 8 + shift;
        ctx.lineTo(px, baseY - peaks[i] * amp);
      }
      ctx.lineTo(W + 8, baseY + 4);
      ctx.closePath();
      ctx.fill();
    });
  }

  drawCanyon(ctx, W, H, palette, course, plane, cam, game, time) {
    const baseSeg = Math.floor(cam.z / SEG);
    const drawN = PHYSICS.drawDistance;

    // Far to near so near walls paint over far ones. The two nearest
    // segments are skipped: their wall quads would fill the frame with
    // flat colour, and the ground base fill covers that space instead.
    for (let i = drawN - 1; i >= 2; i--) {
      const seg = baseSeg + i;
      if (seg < 0 || seg > course.totalSegments) continue;
      const z0 = seg * SEG;
      const z1 = z0 + SEG;
      const c0 = course.centreAt(seg);
      const c1 = course.centreAt(seg + 1);
      const w0 = course.halfWidthAt(seg);
      const w1 = course.halfWidthAt(seg + 1);
      const h0 = course.wallHeightAt(seg);
      const h1 = course.wallHeightAt(seg + 1);
      const depthShade = 1 - (i / drawN) * 0.55; // far segments darker

      const p = (x, y, z) => this.project(x, y, z, cam);
      const l0b = p(c0 - w0, 0, z0);
      const l0t = p(c0 - w0, h0, z0);
      const l1b = p(c1 - w1, 0, z1);
      const l1t = p(c1 - w1, h1, z1);
      const r0b = p(c0 + w0, 0, z0);
      const r0t = p(c0 + w0, h0, z0);
      const r1b = p(c1 + w1, 0, z1);
      const r1t = p(c1 + w1, h1, z1);
      if (!l0b || !l1b || !r0b || !r1b) continue;

      // Canyon floor strip.
      ctx.fillStyle = shade(seg % 2 === 0 ? palette.floorA : palette.floorB, depthShade);
      ctx.beginPath();
      ctx.moveTo(l0b.x, l0b.y); ctx.lineTo(r0b.x, r0b.y);
      ctx.lineTo(r1b.x, r1b.y); ctx.lineTo(l1b.x, l1b.y);
      ctx.closePath(); ctx.fill();

      // Centre dashes on the floor, like a desert track.
      if (seg % 4 < 2) {
        const m0 = p(c0, 0.05, z0);
        const m1 = p(c1, 0.05, z1);
        if (m0 && m1) {
          const hw0 = Math.min(2.2, 1.5 * m0.scale);
          const hw1 = Math.min(2.2, 1.5 * m1.scale);
          ctx.fillStyle = shade('rgba(255, 244, 214, 0.85)', depthShade);
          ctx.beginPath();
          ctx.moveTo(m0.x - hw0, m0.y); ctx.lineTo(m0.x + hw0, m0.y);
          ctx.lineTo(m1.x + hw1, m1.y); ctx.lineTo(m1.x - hw1, m1.y);
          ctx.closePath(); ctx.fill();
        }
      }

      // Left wall: a vertical gradient (lit rim at the top, dark rock at
      // the base) plus two strata lines, so the rock reads as rock.
      // Alternate segments shade slightly differently for a rocky rhythm.
      const wallShadeL = depthShade * (seg % 2 === 0 ? 1 : 0.86);
      if (l0t && l1t) {
        const wallGrad = ctx.createLinearGradient(0, Math.min(l0t.y, l1t.y), 0, Math.max(l0b.y, l1b.y));
        wallGrad.addColorStop(0, shade(palette.wallTop, wallShadeL));
        wallGrad.addColorStop(0.35, shade(palette.wallA, wallShadeL));
        wallGrad.addColorStop(1, shade(palette.wallB, wallShadeL * 0.9));
        ctx.fillStyle = wallGrad;
        ctx.beginPath();
        ctx.moveTo(l0b.x, l0b.y); ctx.lineTo(l0t.x, l0t.y);
        ctx.lineTo(l1t.x, l1t.y); ctx.lineTo(l1b.x, l1b.y);
        ctx.closePath(); ctx.fill();
        for (const f of [0.35, 0.68]) {
          const s0 = p(c0 - w0, h0 * f, z0);
          const s1 = p(c1 - w1, h1 * f, z1);
          if (s0 && s1) {
            ctx.strokeStyle = shade(palette.wallB, depthShade);
            ctx.lineWidth = Math.max(1, Math.min(3, 1.2 * s0.scale));
            ctx.beginPath(); ctx.moveTo(s0.x, s0.y); ctx.lineTo(s1.x, s1.y); ctx.stroke();
          }
        }
        ctx.strokeStyle = shade(palette.wallTop, depthShade);
        ctx.lineWidth = Math.max(1, Math.min(5, 2.5 * l0t.scale));
        ctx.beginPath(); ctx.moveTo(l0t.x, l0t.y); ctx.lineTo(l1t.x, l1t.y); ctx.stroke();
      }
      // Right wall, a touch darker for depth.
      const wallShadeR = depthShade * palette.wallShade + 0.12;
      if (r0t && r1t) {
        const wallGradR = ctx.createLinearGradient(0, Math.min(r0t.y, r1t.y), 0, Math.max(r0b.y, r1b.y));
        wallGradR.addColorStop(0, shade(palette.wallTop, wallShadeR));
        wallGradR.addColorStop(0.35, shade(palette.wallB, wallShadeR));
        wallGradR.addColorStop(1, shade(palette.wallB, wallShadeR * 0.8));
        ctx.fillStyle = wallGradR;
        ctx.beginPath();
        ctx.moveTo(r0b.x, r0b.y); ctx.lineTo(r0t.x, r0t.y);
        ctx.lineTo(r1t.x, r1t.y); ctx.lineTo(r1b.x, r1b.y);
        ctx.closePath(); ctx.fill();
        for (const f of [0.35, 0.68]) {
          const s0 = p(c0 + w0, h0 * f, z0);
          const s1 = p(c1 + w1, h1 * f, z1);
          if (s0 && s1) {
            ctx.strokeStyle = shade(palette.wallA, depthShade * 0.85);
            ctx.lineWidth = Math.max(1, Math.min(3, 1.2 * s0.scale));
            ctx.beginPath(); ctx.moveTo(s0.x, s0.y); ctx.lineTo(s1.x, s1.y); ctx.stroke();
          }
        }
        ctx.strokeStyle = shade(palette.wallTop, depthShade);
        ctx.lineWidth = Math.max(1, Math.min(5, 2.5 * r0t.scale));
        ctx.beginPath(); ctx.moveTo(r0t.x, r0t.y); ctx.lineTo(r1t.x, r1t.y); ctx.stroke();
      }

      // Runway: pale strip with dashes and threshold bars at the course end.
      const rw = course.runway;
      if (seg >= rw.seg && seg < rw.seg + rw.length) {
        const rx0 = rw.x - rw.width / 2;
        const rx1 = rw.x + rw.width / 2;
        const a = p(rx0, 0.08, z0);
        const b = p(rx1, 0.08, z0);
        const c = p(rx1, 0.08, z1);
        const d = p(rx0, 0.08, z1);
        if (a && b && c && d) {
          ctx.fillStyle = shade(palette.runway, depthShade);
          ctx.beginPath();
          ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.lineTo(c.x, c.y); ctx.lineTo(d.x, d.y);
          ctx.closePath(); ctx.fill();
          if (seg % 3 === 0) {
            const m0 = p(rw.x, 0.12, z0 + SEG * 0.3);
            const m1 = p(rw.x, 0.12, z0 + SEG * 0.7);
            if (m0 && m1) {
              const hw0 = Math.min(2.5, 1.2 * m0.scale);
              const hw1 = Math.min(2.5, 1.2 * m1.scale);
              ctx.fillStyle = shade(palette.runwayMark, depthShade);
              ctx.beginPath();
              ctx.moveTo(m0.x - hw0, m0.y); ctx.lineTo(m0.x + hw0, m0.y);
              ctx.lineTo(m1.x + hw1, m1.y); ctx.lineTo(m1.x - hw1, m1.y);
              ctx.closePath(); ctx.fill();
            }
          }
          // Runway edge lights for the night mission.
          if (game.mission.palette === 'night') {
            ctx.fillStyle = '#ffb02e';
            for (const [ex] of [[rx0], [rx1]]) {
              const e = p(ex, 0.4, z0);
              if (e) { ctx.beginPath(); ctx.arc(e.x, e.y, Math.min(4, Math.max(1.5, 2.4 * e.scale)), 0, Math.PI * 2); ctx.fill(); }
            }
          }
        }
      }
    }

    // Rings, far to near, so the nearest ring paints last.
    const ringList = course.rings;
    for (let i = ringList.length - 1; i >= 0; i--) {
      const ring = ringList[i];
      const z = ring.seg * SEG;
      const rel = z - cam.z;
      if (rel < 4 || rel > drawN * SEG) continue;
      const pt = this.project(ring.x, ring.y, z, cam);
      if (!pt) continue;
      const state = ring.passed
        ? (ring.missed ? 'missed' : ring.perfect ? 'perfect' : 'passed')
        : (ring === game.nextRing ? 'next' : 'later');
      drawRing(ctx, pt.x, pt.y, Math.min(220, ring.r * pt.scale), state, time, palette);
    }
  }

  drawPlaneShadow(ctx, palette, plane, cam) {
    const pt = this.project(plane.x, 0.15, plane.z + 6, cam);
    if (!pt) return;
    const fade = clamp(1 - plane.y / 60, 0.15, 0.85);
    const s = Math.min(pt.scale, 2.5);
    ctx.save();
    ctx.globalAlpha = 0.32 * fade;
    ctx.fillStyle = '#1a120a';
    ctx.beginPath();
    ctx.ellipse(pt.x, pt.y, 26 * s * 2.4, 5 * s * 2.4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

// Multiply a hex colour toward black by f (0..1); rgba strings pass through.
function shade(color, f) {
  if (color.startsWith('rgba')) return color;
  const n = parseInt(color.slice(1), 16);
  const r = Math.round(((n >> 16) & 255) * f);
  const g = Math.round(((n >> 8) & 255) * f);
  const b = Math.round((n & 255) * f);
  return `rgb(${r},${g},${b})`;
}

export { lerp };
