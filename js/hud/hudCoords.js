export function drawHudCoords(ctx, camera) {
  ctx.save();
  ctx.font = '14px monospace';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'top';
  ctx.fillStyle = '#f55';
  ctx.fillText(`${camera.x.toFixed(1)} :X `, ctx.canvas.width - 10, 10);
  ctx.fillStyle = '#5f5';
  ctx.fillText(`${camera.y.toFixed(1)} :Y `, ctx.canvas.width - 10, 30);
  ctx.fillStyle = '#55f';
  ctx.fillText(`${camera.z.toFixed(1)} :Z `, ctx.canvas.width - 10, 50);
  ctx.restore();
}