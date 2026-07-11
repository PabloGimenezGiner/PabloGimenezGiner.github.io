// render/path/pathRenderer.js
import { project3D } from '../../camera/cameraPhysics.js';
import pathManager from './pathManager.js';

export function renderPath(ctx, camera) {
  const renderData = pathManager.getRenderPoints();
  if (!renderData || renderData.length < 6) return;

  const points = renderData;
  const total = points.length / 3;

  const lodMaxSubdivs = pathManager.lodMaxSubdivs ?? 20;
  const lodMinSubdivs = pathManager.lodMinSubdivs ?? 2;
  const lodMaxDist   = pathManager.lodMaxDist   ?? 5000;

  const baseColor = pathManager.persistent ? '0, 255, 255' : '0, 200, 255';
  const lineWidth = pathManager.persistent ? 3.5 : 2.5;

  for (let i = 1; i < total; i++) {
    const idxA = (i - 1) * 3;
    const idxB = i * 3;
    const ax = points[idxA], ay = points[idxA+1], az = points[idxA+2];
    const bx = points[idxB], by = points[idxB+1], bz = points[idxB+2];

    const mx = (ax + bx) / 2;
    const my = (ay + by) / 2;
    const mz = (az + bz) / 2;
    const distCam = Math.hypot(mx - camera.x, my - camera.y, mz - camera.z);

    let subdivs = lodMaxSubdivs;
    if (distCam > 0) {
      const t = Math.min(1, distCam / lodMaxDist);
      subdivs = Math.round(lodMaxSubdivs - t * (lodMaxSubdivs - lodMinSubdivs));
      subdivs = Math.max(lodMinSubdivs, Math.min(lodMaxSubdivs, subdivs));
    }

    const projA = project3D(ax, ay, az);
    if (i === 1 && !projA.visible) continue;

    let currentProj = projA;

    for (let s = 1; s <= subdivs; s++) {
      const t = s / subdivs;
      const px = ax + (bx - ax) * t;
      const py = ay + (by - ay) * t;
      const pz = az + (bz - az) * t;
      const proj = project3D(px, py, pz);

      let alpha;
      if (!pathManager.persistent) {
        const rel = (i - 1 + t) / total;
        alpha = 0.2 + 0.8 * rel;
      } else {
        alpha = 0.8;
      }

      if (currentProj.visible && proj.visible) {
        ctx.beginPath();
        ctx.moveTo(currentProj.x, currentProj.y);
        ctx.lineTo(proj.x, proj.y);
        ctx.strokeStyle = `rgba(${baseColor}, ${alpha})`;
        ctx.lineWidth = lineWidth;
        ctx.stroke();
      }

      currentProj = proj;
    }
  }

  // Primer punto
  const firstIdx = 0;
  const fx = points[firstIdx], fy = points[firstIdx+1], fz = points[firstIdx+2];
  const firstProj = project3D(fx, fy, fz);
  if (firstProj.visible) {
    ctx.beginPath();
    ctx.arc(firstProj.x, firstProj.y, 3, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(0, 200, 255, ${pathManager.persistent ? 0.8 : 0.2})`;
    ctx.fill();
  }

  // Último punto
  const lastIdx = (total - 1) * 3;
  const lx = points[lastIdx], ly = points[lastIdx+1], lz = points[lastIdx+2];
  const lastProj = project3D(lx, ly, lz);
  if (lastProj.visible) {
    ctx.beginPath();
    ctx.arc(lastProj.x, lastProj.y, 3, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255, 200, 50, ${pathManager.persistent ? 0.8 : 1.0})`;
    ctx.fill();
  }
}