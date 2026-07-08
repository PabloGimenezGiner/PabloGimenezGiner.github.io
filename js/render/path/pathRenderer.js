// render/path/pathRenderer.js
import { project3D } from '../../camera/cameraPhysics.js';
import pathManager from './pathManager.js';

export function renderPath(ctx, camera) {
  const renderData = pathManager.getRenderPoints();
  if (!renderData || renderData.length < 6) return; // mínimo 2 puntos (6 floats)

  // Determinar si es Float32Array o no
  const isFlat = renderData instanceof Float32Array;
  let points;
  let count;
  if (isFlat) {
    points = renderData;
    count = points.length / 3;
  } else {
    // Fallback: si es array de objetos (compatibilidad)
    points = renderData;
    count = points.length;
  }

  const total = count;
  const constantAlpha = 0.8;
  const PIXEL_SUBDIV_THRESHOLD = 20;

  const lineWidth = pathManager.persistent ? 3.5 : 2.5;
  const baseColor = pathManager.persistent ? '0, 255, 255' : '0, 200, 255';

  for (let i = 1; i < total; i++) {
    let pAx, pAy, pAz, pBx, pBy, pBz;
    if (isFlat) {
      const idxA = (i - 1) * 3;
      const idxB = i * 3;
      pAx = points[idxA]; pAy = points[idxA + 1]; pAz = points[idxA + 2];
      pBx = points[idxB]; pBy = points[idxB + 1]; pBz = points[idxB + 2];
    } else {
      pAx = points[i - 1].x; pAy = points[i - 1].y; pAz = points[i - 1].z;
      pBx = points[i].x;     pBy = points[i].y;     pBz = points[i].z;
    }

    const projA = project3D(pAx, pAy, pAz);
    const projB = project3D(pBx, pBy, pBz);

    // Si ambos no son visibles, saltar
    if (!projA.visible && !projB.visible) continue;

    let alphaA, alphaB;
    if (pathManager.persistent) {
      alphaA = alphaB = constantAlpha;
    } else {
      const tA = (i - 1) / total;
      const tB = i / total;
      alphaA = 0.2 + 0.8 * tA;
      alphaB = 0.2 + 0.8 * tB;
    }

    // Subdivisión basada en píxeles
    const pixelDist = Math.hypot(projB.x - projA.x, projB.y - projA.y);
    let subdivs = Math.max(1, Math.ceil(pixelDist / PIXEL_SUBDIV_THRESHOLD));
    subdivs = Math.min(20, subdivs);

    let prevProj = projA;
    let prevAlpha = alphaA;

    // Si ambos extremos son visibles, usar interpolación en pantalla para ahorrar proyecciones
    if (projA.visible && projB.visible) {
      for (let s = 1; s <= subdivs; s++) {
        const t = s / subdivs;
        // Interpolar en coordenadas de pantalla
        const x = projA.x + (projB.x - projA.x) * t;
        const y = projA.y + (projB.y - projA.y) * t;
        const alpha = alphaA + (alphaB - alphaA) * t;
        // La visibilidad es true porque ambos extremos son visibles
        const proj = { x, y, visible: true };

        ctx.beginPath();
        ctx.moveTo(prevProj.x, prevProj.y);
        ctx.lineTo(proj.x, proj.y);
        ctx.strokeStyle = `rgba(${baseColor}, ${alpha})`;
        ctx.lineWidth = lineWidth;
        ctx.stroke();

        prevProj = proj;
        prevAlpha = alpha;
      }
    } else {
      // Si alguno no es visible, proyectar cada punto intermedio para manejar clipping correctamente
      for (let s = 1; s <= subdivs; s++) {
        const t = s / subdivs;
        const x = pAx + (pBx - pAx) * t;
        const y = pAy + (pBy - pAy) * t;
        const z = pAz + (pBz - pAz) * t;
        const proj = project3D(x, y, z);
        const alpha = alphaA + (alphaB - alphaA) * t;

        if (prevProj.visible && proj.visible) {
          ctx.beginPath();
          ctx.moveTo(prevProj.x, prevProj.y);
          ctx.lineTo(proj.x, proj.y);
          ctx.strokeStyle = `rgba(${baseColor}, ${alpha})`;
          ctx.lineWidth = lineWidth;
          ctx.stroke();
        }

        prevProj = proj;
        prevAlpha = alpha;
      }
    }
  }

  // Círculo en primer punto
  let firstX, firstY, firstZ;
  if (isFlat) {
    firstX = points[0]; firstY = points[1]; firstZ = points[2];
  } else {
    firstX = points[0].x; firstY = points[0].y; firstZ = points[0].z;
  }
  const firstProj = project3D(firstX, firstY, firstZ);
  if (firstProj.visible) {
    ctx.beginPath();
    ctx.arc(firstProj.x, firstProj.y, 2, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(0, 200, 255, ${pathManager.persistent ? 0.8 : 0.2})`;
    ctx.fill();
  }

  // Círculo en último punto
  let lastX, lastY, lastZ;
  if (isFlat) {
    const idx = (total - 1) * 3;
    lastX = points[idx]; lastY = points[idx + 1]; lastZ = points[idx + 2];
  } else {
    lastX = points[total - 1].x; lastY = points[total - 1].y; lastZ = points[total - 1].z;
  }
  const lastProj = project3D(lastX, lastY, lastZ);
  if (lastProj.visible) {
    ctx.beginPath();
    ctx.arc(lastProj.x, lastProj.y, 2, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255, 200, 50, ${pathManager.persistent ? 0.8 : 1.0})`;
    ctx.fill();
  }
}