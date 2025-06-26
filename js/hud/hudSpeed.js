export function drawHudSpeed(ctx, camera, keys, accFactor, turboEnabled) {

  // ——— HUD central inferior – Velocidad y Potencia ———
  const centerX = ctx.canvas.width / 2;
  const speedFontSize = 96;
  const speedY = ctx.canvas.height - 72;

  // Velocidad
  ctx.fillStyle = keys["ShiftLeft"] ? '#f55' : 'white';
  ctx.font = `${speedFontSize}px monospace`;
  ctx.textAlign = 'center';
  ctx.fillText(camera.speed.toFixed(0), centerX, speedY);

  // Frenado (rectángulos laterales)
  if (keys["ShiftLeft"]) {
    const rectH = speedFontSize * 0.8;
    const rectW = rectH / 2;
    const rectY = speedY - speedFontSize * 0.7;
    const radius = 8;
    const offsetX = 192;

    [centerX - offsetX - rectW, centerX + offsetX].forEach(x => {
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

  // Barra de potencia
  const barWidthMax = 512;
  const barHeight   = 32;
  const gap         = 8;
  const radius      = 4;
  const x0 = (ctx.canvas.width - barWidthMax) / 2;
  const y0 = ctx.canvas.height - 16 - barHeight;

  const NORMAL_ACC_MIN = 8;
  const NORMAL_ACC_MAX = NORMAL_ACC_MIN * 8;
  const TURBO_ACC_MIN  = NORMAL_ACC_MIN * 8;
  const TURBO_ACC_MAX  = NORMAL_ACC_MAX * 8;
  const WHEEL_STEP     = NORMAL_ACC_MIN;

  const minAcc = turboEnabled ? TURBO_ACC_MIN : NORMAL_ACC_MIN;
  const maxAcc = turboEnabled ? TURBO_ACC_MAX : NORMAL_ACC_MAX;
  const step   = turboEnabled ? WHEEL_STEP * 8 : WHEEL_STEP;
  const totalSegments  = Math.floor((maxAcc - minAcc) / step);
  const currentSegment = Math.floor((accFactor - minAcc) / step);
  const segW = (barWidthMax - gap * (totalSegments - 1)) / totalSegments;

  ctx.fillStyle = turboEnabled ? '#f90' : '#09f';
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
  // Marcadores de mínimo
  if (currentSegment === 0) {
    const markerW = barHeight / 4;
    const markerH = barHeight;
    [x0, x0 + barWidthMax - markerW].forEach(xi => {
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
    });
  }
}