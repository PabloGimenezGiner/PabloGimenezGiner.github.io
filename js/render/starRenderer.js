// render/starRenderer.js
import { rotateVectorByQuat } from '../quaternion.js';
import { gameState } from '../core/state.js';
import { CONFIG } from '../constants.js';

export function renderStars(ctx, camera) {
  const { flags, world } = gameState;
  const { frustumCullingEnabled, showInfoHud } = flags;
  const { chunks } = world;

  const maxFadeDist = CONFIG.rendering.renderDistanceChunks * CONFIG.rendering.chunkSize;
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
      if (dist >= CONFIG.rendering.lodMidDistance) {
        const t = Math.min(1, dist / maxFadeDist);
        distanceFade = 1 - t * t;
        if (distanceFade <= 0) continue;
      }

      const [rx, ry, rz] = rotateVectorByQuat([dx, dy, dz], invQ);
      if (rz <= 1) continue;

      if (frustumCullingEnabled) {
        const halfW = ctx.canvas.width / 2;
        const halfH = ctx.canvas.height / 2;
        const limitX = halfW * rz / CONFIG.rendering.fov;
        const limitY = halfH * rz / CONFIG.rendering.fov;
        if (Math.abs(rx) > limitX || Math.abs(ry) > limitY) continue;
      }

      const scale = CONFIG.rendering.fov / rz;
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
        let raw = 1 + CONFIG.directional.speedFactor * dot;
        directionalFactor = Math.min(CONFIG.directional.maxBrightness, Math.max(CONFIG.directional.minBrightness, raw));
      }

      let brightness = baseBrightness * distanceFade * directionalFactor;
      if (dist < CONFIG.rendering.lodNearDistance) brightness *= CONFIG.stars.brightnessNearBoost;
      else if (dist < CONFIG.rendering.lodMidDistance) brightness *= CONFIG.stars.brightnessMidBoost;
      if (dist >= CONFIG.rendering.lodMidDistance) brightness *= CONFIG.stars.brightnessFarBoost;
      brightness = Math.min(1, Math.max(0, brightness));
      if (brightness <= 0.02) continue;

      let fillColor;
      if (showInfoHud) {
        if (dist < CONFIG.rendering.lodNearDistance) fillColor = `rgba(255, 255, 0, ${brightness})`;
        else if (dist < CONFIG.rendering.lodMidDistance) fillColor = `rgba(0, 255, 0, ${brightness})`;
        else fillColor = `rgba(255, 255, 255, ${brightness})`;
      } else {
        fillColor = `rgba(255, 255, 255, ${brightness})`;
      }

      if (dist < CONFIG.rendering.lodNearDistance) {
        ctx.beginPath();
        ctx.arc(px, py, scale * CONFIG.stars.sizeNear, 0, Math.PI * 2);
        ctx.fillStyle = fillColor;
        ctx.fill();
      } else if (dist < CONFIG.rendering.lodMidDistance) {
        const size = scale * CONFIG.stars.sizeMid;
        ctx.fillStyle = fillColor;
        ctx.fillRect(px - size/2, py - size/2, size, size);
      } else {
        const size = Math.max(CONFIG.stars.sizeFarMin, scale * CONFIG.stars.sizeFar);
        ctx.fillStyle = fillColor;
        ctx.fillRect(px - size/2, py - size/2, size, size);
      }
      renderedStars++;
    }
  }
  return renderedStars;
}