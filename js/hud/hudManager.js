// hud/hudManager.js
import { drawHudReticle } from '../hud/hudReticle.js';
import { drawHudCoords } from '../hud/hudCoords.js';
import { drawHudSpeed } from '../hud/hudSpeed.js';
import { drawHudGyro } from '../hud/hudGyro.js';
import { drawHudInfo } from '../hud/hudInfo.js';
import { showInfoHud, globalSeed } from '../core/gameState.js';
import { renderDistanceChunks, starsPerChunk } from '../constants.js';

export function drawAllHuds(ctx, camera, inputManager, settings, currentFps, renderedStars, chunkCount) {
  drawHudReticle(ctx);
  drawHudCoords(ctx, camera);
  drawHudSpeed(ctx, camera, inputManager.isBraking(), settings.accFactor, settings.turboEnabled);
  drawHudGyro(ctx, camera);
  if (showInfoHud) {
    drawHudInfo(ctx, currentFps, renderedStars, chunkCount, renderDistanceChunks, starsPerChunk, globalSeed);
  }
}