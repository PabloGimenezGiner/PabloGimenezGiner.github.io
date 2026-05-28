export function drawHudReticle(ctx) {
  const cx        = ctx.canvas.width  / 2;
  const cy        = ctx.canvas.height / 2;
  const radio     = 24;
  const segments  = 3;
  const gapo      = 0.64;
  const lineWidth = 4.8;
  const total     = 2 * Math.PI;
  const offset    = Math.PI / 2;
  const innerGap  = 12;

  ctx.save();
  ctx.lineWidth   = lineWidth;
  ctx.strokeStyle = 'rgba(127, 127, 127, 0.48)';
  ctx.lineCap     = 'round';

  for (let i = 0; i < segments; i++) {
    const start    = offset + i * (total/segments) + gapo/2;
    const end      = offset + (i+1) * (total/segments) - gapo/2;
    const midAngle = offset + (i+0.5)*(total/segments);

    const xOuter = cx + Math.cos(midAngle)*radio;
    const yOuter = cy + Math.sin(midAngle)*radio;
    const xInner = cx + Math.cos(midAngle)*(radio - innerGap);
    const yInner = cy + Math.sin(midAngle)*(radio - innerGap);

    ctx.beginPath();
    ctx.arc(cx, cy, radio, start, end);
    ctx.moveTo(xOuter, yOuter);
    ctx.lineTo(xInner, yInner);
    ctx.stroke();
  }

  ctx.restore();
}
