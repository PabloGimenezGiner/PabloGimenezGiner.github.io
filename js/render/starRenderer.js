// render/starRenderer.js
import { rotateVectorByQuat } from '../quaternion.js';
import { chunks, frustumCullingEnabled, showInfoHud } from '../core/gameState.js';
import {
  FOV, LOD_NEAR_DIST, LOD_MID_DIST, renderDistanceChunks, chunkSize,
  directionalSpeedFactor, directionalMinBright, directionalMaxBright,
  farStarBrightnessBoost, midStarBrightnessBoost, nearStarBrightnessBoost,
  STAR_SIZE_NEAR, STAR_SIZE_MID, STAR_SIZE_FAR, STAR_SIZE_FAR_MIN
} from '../constants.js';

export function renderStars(ctx, camera) {
  const maxFadeDist = renderDistanceChunks * chunkSize;
  let renderedStars = 0;

  const velX = camera.vx, velY = camera.vy, velZ = camera.vz;
  const speedTotal = Math.hypot(velX, velY, velZ);
  const invQ = [-camera.q[0], -camera.q[1], -camera.q[2], camera.q[3]];

  for (const key in chunks) {
    const stars = chunks[key];
    for (const s of stars) {
      const dx = s.x - camera.x;
      const dy = s.y - camera.y;
      const dz = s.z - camera.z;
      const dist = Math.hypot(dx, dy, dz);

      let distanceFade = 1;
      if (dist >= LOD_MID_DIST) {
        const t = Math.min(1, dist / maxFadeDist);
        distanceFade = 1 - t * t;
        if (distanceFade <= 0) continue;
      }

      const [rx, ry, rz] = rotateVectorByQuat([dx, dy, dz], invQ);
      if (rz <= 1) continue;

      if (frustumCullingEnabled) {
        const halfW = ctx.canvas.width / 2;
        const halfH = ctx.canvas.height / 2;
        const limitX = halfW * rz / FOV;
        const limitY = halfH * rz / FOV;
        if (Math.abs(rx) > limitX || Math.abs(ry) > limitY) continue;
      }

      const scale = FOV / rz;
      const px = ctx.canvas.width / 2 + rx * scale;
      const py = ctx.canvas.height / 2 - ry * scale;

      let baseBrightness = Math.min(1, scale * 2.0 + 0.15);
      let directionalFactor = 1.0;
      if (speedTotal > 0.01) {
        const invDist = 1 / dist;
        const dirX = dx * invDist;
        const dirY = dy * invDist;
        const dirZ = dz * invDist;
        const dot = (velX * dirX + velY * dirY + velZ * dirZ) / speedTotal;
        let raw = 1 + directionalSpeedFactor * dot;
        directionalFactor = Math.min(directionalMaxBright, Math.max(directionalMinBright, raw));
      }

      let brightness = baseBrightness * distanceFade * directionalFactor;
      if (dist < LOD_NEAR_DIST) brightness *= nearStarBrightnessBoost;
      else if (dist < LOD_MID_DIST) brightness *= midStarBrightnessBoost;
      if (dist >= LOD_MID_DIST) brightness *= farStarBrightnessBoost;
      brightness = Math.min(1, Math.max(0, brightness));
      if (brightness <= 0.02) continue;

      let fillColor;
      if (showInfoHud) {
        if (dist < LOD_NEAR_DIST) fillColor = `rgba(255, 255, 0, ${brightness})`;
        else if (dist < LOD_MID_DIST) fillColor = `rgba(0, 255, 0, ${brightness})`;
        else fillColor = `rgba(255, 255, 255, ${brightness})`;
      } else {
        fillColor = `rgba(255, 255, 255, ${brightness})`;
      }

      if (dist < LOD_NEAR_DIST) {
        ctx.beginPath();
        ctx.arc(px, py, scale * STAR_SIZE_NEAR, 0, Math.PI * 2);
        ctx.fillStyle = fillColor;
        ctx.fill();
      } else if (dist < LOD_MID_DIST) {
        const size = scale * STAR_SIZE_MID;
        ctx.fillStyle = fillColor;
        ctx.fillRect(px - size/2, py - size/2, size, size);
      } else {
        const size = Math.max(STAR_SIZE_FAR_MIN, scale * STAR_SIZE_FAR);
        ctx.fillStyle = fillColor;
        ctx.fillRect(px - size/2, py - size/2, size, size);
      }
      renderedStars++;
    }
  }
  return renderedStars;
}