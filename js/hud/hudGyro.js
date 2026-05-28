import { rotateVectorByQuat } from '../quaternion.js';

export function drawHudGyro(ctx, camera) {
    // ── Giroscopio visual híbrido con símbolos separados uniformemente ──
  const gyroSize = 96;
  const gyroCX   = canvas.width / 2;
  const gyroCY   = 96;
  const axisLen  = gyroSize / 2;
  const gapFrac  = 0.64;
  const gapoo    = axisLen * gapFrac;
  const arrowOff = 8;
  const arrowSz  = 6;
  const minAlpha = 0.16;
  const symbolThreshold = 0.9;
  const symbolOff = arrowOff + arrowSz + 4;  // separación extra para símbolos

  ctx.save();
  ctx.translate(gyroCX, gyroCY);

  // cuaternión inverso y ejes del mundo
  const invQ = [-camera.q[0], -camera.q[1], -camera.q[2], camera.q[3]];
  const xA   = rotateVectorByQuat([1, 0, 0], invQ);
  const yA   = rotateVectorByQuat([0, 1, 0], invQ);
  const zA   = rotateVectorByQuat([0, 0, 1], invQ);

  // mapea dz=>alpha
  function depthAlpha(dz) {
    const t = (dz + 1) / 2;
    return minAlpha + (1 - minAlpha) * t;
  }

  // ── Galaxia estática generada en la primera pasada del loop ──
  if (!window._galaxyStars) {
    // Parámetros (igual que antes)
    const GALAXY = {
      arms: 2,
      turns: 1.6,
      starCount: 256,
      innerRadius: -0.8,
      expansion: 0.8,
      starSpread: 1.2,
      scale: 0.12,
      starSize: 1.2
    };

    const maxAngle = GALAXY.turns * Math.PI * 2;
    window._galaxyStars = [];

    for (let arm = 0; arm < GALAXY.arms; arm++) {
      const baseAngle = (arm / GALAXY.arms) * Math.PI * 2;
      for (let i = 0; i < GALAXY.starCount; i++) {
        const t     = Math.random() * maxAngle;
        const tNorm = t / maxAngle;
        const rBase = GALAXY.innerRadius + GALAXY.expansion * t;
        const spread = GALAXY.starSpread * (1 - tNorm);
        const r     = rBase + (Math.random() * 2 - 1) * spread;
        const angle = t + baseAngle;
        const xw    = Math.cos(angle) * r;
        const zw    = Math.sin(angle) * r;
        window._galaxyStars.push([ xw, zw ]);
      }
    }

    // Guardamos también la configuración para dibujar
    window._GALAXY = GALAXY;
  }

  // Y ahora, en cada frame, dibujamos siempre el mismo conjunto:
  const { arms, turns, starCount, innerRadius, expansion, starSpread, scale, starSize } = window._GALAXY;
  ctx.fillStyle = 'rgba(196, 196, 196, 0.04)';
  for (const [xw, zw] of window._galaxyStars) {
    const [dx, dy] = rotateVectorByQuat([xw, 0, zw], invQ);
    const px       = dx * axisLen * scale;
    const py       = -dy * axisLen * scale;
    ctx.beginPath();
    ctx.arc(px, py, starSize, 0, Math.PI * 2);
    ctx.fill();
  }

  // dibuja “+”
  function drawPlus(x, y, color) {
    ctx.strokeStyle = color;
    ctx.beginPath();
    ctx.moveTo(x - 5, y);
    ctx.lineTo(x + 5, y);
    ctx.moveTo(x,     y - 5);
    ctx.lineTo(x,     y + 5);
    ctx.stroke();
  }
  // dibuja “−”
  function drawMinus(x, y, color) {
    ctx.strokeStyle = color;
    ctx.beginPath();
    ctx.moveTo(x - 5, y);
    ctx.lineTo(x + 5, y);
    ctx.stroke();
  }
  // flecha “V” positiva
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
    ctx.lineTo(tipX,  tipY);
    ctx.lineTo(rightX, rightY);
    ctx.stroke();
  }
  // palito “−” negativo
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

  // eje mixto con símbolo separado uniformemente
  function drawFullAxis(dir, color) {
    const dx = dir[0], dy = -dir[1], dz = dir[2];
    const len = axisLen;
    const xPos = dx * len,  yPos = dy * len;
    const xNeg = -xPos,      yNeg = -yPos;
    const xGap = dx * gapoo, yGap = dy * gapoo;
    const aPos = depthAlpha(dz);
    const aNeg = depthAlpha(-dz);

    ctx.lineWidth = 3.2;
    ctx.lineCap   = 'round';

    // segmento negativo
    ctx.globalAlpha = aNeg;
    ctx.strokeStyle = color;
    ctx.beginPath();
    ctx.moveTo(-xGap, -yGap);
    ctx.lineTo(xNeg,  yNeg);
    ctx.stroke();

    // segmento positivo
    ctx.globalAlpha = aPos;
    ctx.beginPath();
    ctx.moveTo(xGap,  yGap);
    ctx.lineTo(xPos,  yPos);
    ctx.stroke();

    // extremo positivo: símbolo “+” situado a symbolOff
    if (dz > symbolThreshold) {
      ctx.globalAlpha = 1;
      drawPlus(xPos + dx * symbolOff, yPos + dy * symbolOff, color);
    } else {
      drawArrowhead(xPos, yPos, dx, dy, aPos, color);
    }

    // extremo negativo: símbolo “−” o palito
    if (-dz > symbolThreshold) {
      ctx.globalAlpha = 1;
      drawMinus(xNeg - dx * symbolOff, yNeg - dy * symbolOff, color);
    } else {
      drawNegativeBar(xNeg, yNeg, dx, dy, aNeg, color);
    }
  }

  // Ejes rotados con sus colores
  const axes = [
    { vec: rotateVectorByQuat([1, 0, 0], invQ), color: '#f55' }, // X
    { vec: rotateVectorByQuat([0, 1, 0], invQ), color: '#5f5' }, // Y
    { vec: rotateVectorByQuat([0, 0, 1], invQ), color: '#55f' }  // Z
  ];

  // Ordenar de menor a mayor profundidad (más al fondo primero)
  axes.sort((a, b) => a.vec[2] - b.vec[2]);

  // Dibujar en ese orden
  for (const { vec, color } of axes) {
    drawFullAxis(vec, color);
  }


  ctx.restore();
}
