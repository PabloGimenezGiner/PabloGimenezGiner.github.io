// hud/hudGyro.js
import { rotateVectorByQuat } from '../quaternion.js';

// ============================================================
//  GENERACIÓN DE LA GALAXIA (cacheada en el módulo)
//  Se genera una sola vez y se reutiliza en cada frame.
// ============================================================

let galaxyStars = null;
let galaxyConfig = null;

function generateGalaxy() {
  if (galaxyStars !== null) return { stars: galaxyStars, config: galaxyConfig };

  const config = {
    arms: 2,
    turns: 1.6,
    starCount: 256,
    innerRadius: -0.8,
    expansion: 0.8,
    starSpread: 1.2,
    scale: 0.12,
    starSize: 1.2
  };

  const maxAngle = config.turns * Math.PI * 2;
  const stars = [];

  for (let arm = 0; arm < config.arms; arm++) {
    const baseAngle = (arm / config.arms) * Math.PI * 2;
    for (let i = 0; i < config.starCount; i++) {
      const t = Math.random() * maxAngle;
      const tNorm = t / maxAngle;
      const rBase = config.innerRadius + config.expansion * t;
      const spread = config.starSpread * (1 - tNorm);
      const r = rBase + (Math.random() * 2 - 1) * spread;
      const angle = t + baseAngle;
      const xw = Math.cos(angle) * r;
      const zw = Math.sin(angle) * r;
      stars.push([xw, zw]);
    }
  }

  galaxyStars = stars;
  galaxyConfig = config;
  return { stars, config };
}

// ============================================================
//  FUNCIÓN PRINCIPAL DE DIBUJO
// ============================================================

export function drawHudGyro(ctx, camera) {
  const gyroSize = 96;
  const gyroCX = ctx.canvas.width / 2;
  const gyroCY = 96;
  const axisLen = gyroSize / 2;
  const gapFrac = 0.64;
  const gapoo = axisLen * gapFrac;
  const arrowOff = 8;
  const arrowSz = 6;
  const minAlpha = 0.16;
  const symbolThreshold = 0.9;
  const symbolOff = arrowOff + arrowSz + 4;

  ctx.save();
  ctx.translate(gyroCX, gyroCY);

  const invQ = [-camera.q[0], -camera.q[1], -camera.q[2], camera.q[3]];

  function depthAlpha(dz) {
    const t = (dz + 1) / 2;
    return minAlpha + (1 - minAlpha) * t;
  }

  // ---- Dibujar la galaxia (usando la caché del módulo) ----
  const { stars, config } = generateGalaxy();
  const { scale, starSize } = config;
  ctx.fillStyle = 'rgba(196, 196, 196, 0.04)';
  for (const [xw, zw] of stars) {
    const [dx, dy] = rotateVectorByQuat([xw, 0, zw], invQ);
    const px = dx * axisLen * scale;
    const py = -dy * axisLen * scale;
    ctx.beginPath();
    ctx.arc(px, py, starSize, 0, Math.PI * 2);
    ctx.fill();
  }

  // ---- Funciones auxiliares de dibujo ----
  function drawPlus(x, y, color) {
    ctx.strokeStyle = color;
    ctx.beginPath();
    ctx.moveTo(x - 5, y);
    ctx.lineTo(x + 5, y);
    ctx.moveTo(x, y - 5);
    ctx.lineTo(x, y + 5);
    ctx.stroke();
  }

  function drawMinus(x, y, color) {
    ctx.strokeStyle = color;
    ctx.beginPath();
    ctx.moveTo(x - 5, y);
    ctx.lineTo(x + 5, y);
    ctx.stroke();
  }

  function drawArrowhead(x, y, dx, dy, alpha, color) {
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = color;
    const px = x + dx * arrowOff, py = y + dy * arrowOff;
    const perpX = -dy, perpY = dx;
    const tipX = px + dx * arrowSz, tipY = py + dy * arrowSz;
    const leftX = px + perpX * arrowSz, leftY = py + perpY * arrowSz;
    const rightX = px - perpX * arrowSz, rightY = py - perpY * arrowSz;
    ctx.beginPath();
    ctx.moveTo(leftX, leftY);
    ctx.lineTo(tipX, tipY);
    ctx.lineTo(rightX, rightY);
    ctx.stroke();
  }

  function drawNegativeBar(x, y, dx, dy, alpha, color) {
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = color;
    const px = x - dx * arrowOff, py = y - dy * arrowOff;
    const perpX = -dy, perpY = dx;
    const half = 4;
    ctx.beginPath();
    ctx.moveTo(px + perpX * half, py + perpY * half);
    ctx.lineTo(px - perpX * half, py - perpY * half);
    ctx.stroke();
  }

  function drawFullAxis(dir, color) {
    const dx = dir[0], dy = -dir[1], dz = dir[2];
    const len = axisLen;
    const xPos = dx * len, yPos = dy * len;
    const xNeg = -xPos, yNeg = -yPos;
    const xGap = dx * gapoo, yGap = dy * gapoo;
    const aPos = depthAlpha(dz);
    const aNeg = depthAlpha(-dz);

    ctx.lineWidth = 3.2;
    ctx.lineCap = 'round';

    // segmento negativo
    ctx.globalAlpha = aNeg;
    ctx.strokeStyle = color;
    ctx.beginPath();
    ctx.moveTo(-xGap, -yGap);
    ctx.lineTo(xNeg, yNeg);
    ctx.stroke();

    // segmento positivo
    ctx.globalAlpha = aPos;
    ctx.beginPath();
    ctx.moveTo(xGap, yGap);
    ctx.lineTo(xPos, yPos);
    ctx.stroke();

    // extremo positivo
    if (dz > symbolThreshold) {
      ctx.globalAlpha = 1;
      drawPlus(xPos + dx * symbolOff, yPos + dy * symbolOff, color);
    } else {
      drawArrowhead(xPos, yPos, dx, dy, aPos, color);
    }

    // extremo negativo
    if (-dz > symbolThreshold) {
      ctx.globalAlpha = 1;
      drawMinus(xNeg - dx * symbolOff, yNeg - dy * symbolOff, color);
    } else {
      drawNegativeBar(xNeg, yNeg, dx, dy, aNeg, color);
    }
  }

  // ---- Ejes ordenados por profundidad ----
  const axes = [
    { vec: rotateVectorByQuat([1, 0, 0], invQ), color: '#f55' },
    { vec: rotateVectorByQuat([0, 1, 0], invQ), color: '#5f5' },
    { vec: rotateVectorByQuat([0, 0, 1], invQ), color: '#55f' }
  ];
  axes.sort((a, b) => a.vec[2] - b.vec[2]);

  for (const { vec, color } of axes) {
    drawFullAxis(vec, color);
  }

  ctx.restore();
}