import { quatFromAxisAngle, quatMultiply, quatNormalize, rotateVectorByQuat } from './main.js';

ctx.save();
  ctx.font = '14px monospace';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'top';
  ctx.fillStyle = '#f55';
  ctx.fillText(`${camera.x.toFixed(1)} :X `, canvas.width - 10, 10);
  ctx.fillStyle = '#5f5';
  ctx.fillText(`${camera.y.toFixed(1)} :Y `, canvas.width - 10, 30);
  ctx.fillStyle = '#55f';
  ctx.fillText(`${camera.z.toFixed(1)} :Z `, canvas.width - 10, 50);
  ctx.restore();
        
  // HUD central inferior - Velocidad y Potencia
  ctx.textAlign = 'center';

  // Velocidad actual en grande
  const speedFontSize = 96;
  const speedY = canvas.height - 72;
  const centerX = canvas.width / 2;
  ctx.fillStyle = keys["ShiftLeft"] ? '#f55' : 'white';
  ctx.font = `${speedFontSize}px monospace`;
  ctx.fillText(camera.speed.toFixed(0), centerX, speedY);
  
export class renderHUD {
// == HUDS ==

  // HUD textos – Coordenadas arriba derecha (coloreadas)
    // Si se está frenando: dibujar rectángulos fijos a los lados
  if (keys["ShiftLeft"]) {
    const rectH = speedFontSize *0.8;
    const rectW = rectH / 2;
    const rectY = speedY - speedFontSize * 0.7;
    const radius = 8;

    // Posiciones fijas respecto al centro
    const offsetX = 192;
    const leftX = centerX - offsetX - rectW;
    const rightX = centerX + offsetX;

    [leftX, rightX].forEach(x => {
      ctx.beginPath();
      ctx.moveTo(x + radius, rectY);
      ctx.lineTo(x + rectW - radius, rectY);
      ctx.quadraticCurveTo(x + rectW, rectY, x + rectW, rectY + radius);
      ctx.lineTo(x + rectW, rectY + rectH - radius);
      ctx.quadraticCurveTo(x + rectW, rectY + rectH, x + rectW - radius, rectY + rectH);
      ctx.lineTo(x + radius, rectY + rectH);
      ctx.quadraticCurveTo(x, rectY + rectH, x, rectY + rectH - radius);
      ctx.lineTo(x, rectY + radius);
      ctx.quadraticCurveTo(x, rectY, x + radius, rectY);
      ctx.closePath();
      ctx.fillStyle = '#f55';
      ctx.fill();
    });
  }


  // HUD central inferior – Barra de potencia segmentada sin fondo
  const barWidthMax = 512;
  const barHeight   = 32;
  const gap         = 8;
  const radius      = 4;
  const x0 = (canvas.width - barWidthMax) / 2;
  const y0 = canvas.height - 16 - barHeight;

  const minAcc = turboEnabled ? TURBO_ACC_MIN : NORMAL_ACC_MIN;
  const maxAcc = turboEnabled ? TURBO_ACC_MAX : NORMAL_ACC_MAX;
  const step   = turboEnabled ? WHEEL_STEP * 8 : WHEEL_STEP;
  const totalSegments  = Math.floor((maxAcc - minAcc) / step);
  const currentSegment = Math.floor((accFactor - minAcc) / step);

  const segW = (barWidthMax - gap * (totalSegments - 1)) / totalSegments;

  // Color según modo
  ctx.fillStyle = turboEnabled ? '#f90' : '#09f';

  // Dibujar segmentos activos
  for (let i = 0; i < currentSegment; i++) {
    const xi = x0 + i * (segW + gap);
    ctx.beginPath();
    ctx.moveTo(xi + radius, y0);
    ctx.lineTo(xi + segW - radius, y0);
    ctx.quadraticCurveTo(xi + segW, y0, xi + segW, y0 + radius);
    ctx.lineTo(xi + segW, y0 + barHeight - radius);
    ctx.quadraticCurveTo(xi + segW, y0 + barHeight, xi + segW - radius, y0 + barHeight);
    ctx.lineTo(xi + radius, y0 + barHeight);
    ctx.quadraticCurveTo(xi, y0 + barHeight, xi, y0 + barHeight - radius);
    ctx.lineTo(xi, y0 + radius);
    ctx.quadraticCurveTo(xi, y0, xi + radius, y0);
    ctx.closePath();
    ctx.fill();
  }

  // Si está al mínimo: dibujar dos marcadores finos con esquinas redondeadas
  if (currentSegment === 0) {
    const markerW = barHeight / 4;
    const markerH = barHeight;
    const positions = [x0, x0 + barWidthMax - markerW];

    for (const xi of positions) {
      ctx.beginPath();
      ctx.moveTo(xi + radius, y0);
      ctx.lineTo(xi + markerW - radius, y0);
      ctx.quadraticCurveTo(xi + markerW, y0, xi + markerW, y0 + radius);
      ctx.lineTo(xi + markerW, y0 + markerH - radius);
      ctx.quadraticCurveTo(xi + markerW, y0 + markerH, xi + markerW - radius, y0 + markerH);
      ctx.lineTo(xi + radius, y0 + markerH);
      ctx.quadraticCurveTo(xi, y0 + markerH, xi, y0 + markerH - radius);
      ctx.lineTo(xi, y0 + radius);
      ctx.quadraticCurveTo(xi, y0, xi + radius, y0);
      ctx.closePath();
      ctx.fill();
    }
  }

  // ── Retículo central semitransparente con palitos integrados ──
  const cx = canvas.width  / 2;
  const cy = canvas.height / 2;
  const radio = 24;                   // radio = n diámetro / 2
  const segments = 3;                 // n partes
  const gapo = 0.64;                   // espacio angular entre segmentos (radianes)
  const lineWidth = 4.8;
  const total = 2 * Math.PI;
  const angleOffset = Math.PI / 2;    // empieza desde abajo
  const radioToCenter = 12;

  ctx.save();
  ctx.lineWidth = lineWidth;
  ctx.strokeStyle = 'rgba(127, 127, 127, 0.48)';
  ctx.lineCap = 'round';

  for (let i = 0; i < segments; i++) {
    // ángulos de inicio y fin del segmento
    const start    = angleOffset + i * (total / segments) + gapo / 2;
    const end      = angleOffset + (i + 1) * (total / segments) - gapo / 2;
    // ángulo medio para el palito
    const midAngle = angleOffset + (i + 0.5) * (total / segments);

    // coordenadas del palito
    const xOuter = cx + Math.cos(midAngle) * radio;
    const yOuter = cy + Math.sin(midAngle) * radio;
    const xInner = cx + Math.cos(midAngle) * (radio - radioToCenter);
    const yInner = cy + Math.sin(midAngle) * (radio - radioToCenter);

    ctx.beginPath();
    // arco del segmento
    ctx.arc(cx, cy, radio, start, end);
    // palito hacia el centro
    ctx.moveTo(xOuter, yOuter);
    ctx.lineTo(xInner, yInner);
    ctx.stroke();
  }

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