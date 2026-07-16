// hud/hudInfo.js
import { gameState } from '../core/state.js';
import { CONFIG } from '../constants.js';

export function drawHudInfo(ctx, fps, starCount, chunkCount, globalSeed) {
  const { flags } = gameState;
  if (!flags.showInfoHud) return;

  const padding = 10;
  const lineHeight = 20;
  let y = padding;
  const x = padding;
  
  ctx.save();
  ctx.font = '14px monospace';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillStyle = 'rgba(0,0,0,0.7)';
  ctx.fillRect(x - 5, y - 5, 260, lineHeight * 6 + 10);
  ctx.fillStyle = '#0f0';
  ctx.fillText(`FPS: ${fps.toFixed(1)}`, x, y); y += lineHeight;
  ctx.fillText(`Estrellas: ${starCount}`, x, y); y += lineHeight;
  ctx.fillText(`Chunks activos: ${chunkCount}`, x, y); y += lineHeight;
  ctx.fillText(`Radio chunks: ${CONFIG.rendering.renderDistanceChunks}`, x, y); y += lineHeight;
  ctx.fillText(`Estrellas/chunk: ${CONFIG.rendering.starsPerChunk}`, x, y); y += lineHeight;
  ctx.fillText(`Semilla global: ${globalSeed}`, x, y);
  ctx.restore();
}