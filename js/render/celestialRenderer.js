// render/celestialRenderer.js
import { CelestBody } from '../CelestBody.js';
import { project3D } from '../camera/cameraPhysics.js';

export function renderCelestials(ctx, camera) {
  for (const cb of CelestBody) {
    const p = project3D(cb.x, cb.y, cb.z);
    if (!p.visible) continue;
    ctx.beginPath();
    ctx.arc(p.x, p.y, cb.r * p.scale, 0, Math.PI * 2);
    ctx.fillStyle = cb.color;
    ctx.fill();
    const dist = Math.hypot(cb.x - camera.x, cb.y - camera.y, cb.z - camera.z);
    if (dist < cb.r * 2) {
      ctx.fillStyle = 'white';
      ctx.font = '20px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(cb.name, ctx.canvas.width / 2, ctx.canvas.height * 0.2);
    }
  }
}