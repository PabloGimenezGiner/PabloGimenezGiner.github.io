// hud/hudManager.js
import { drawHudReticle } from '../hud/hudReticle.js';
import { drawHudCoords } from '../hud/hudCoords.js';
import { drawHudSpeed } from '../hud/hudSpeed.js';
import { drawHudGyro } from '../hud/hudGyro.js';
import { drawHudInfo } from '../hud/hudInfo.js';
import { gameState } from '../core/state.js';

export function drawAllHuds(ctx, camera, inputManager, settings, currentFps, renderedStars, chunkCount) {
  drawHudReticle(ctx);
  drawHudCoords(ctx, camera);
  drawHudSpeed(ctx, camera, inputManager.isBraking(), settings.accFactor, settings.turboEnabled);
  drawHudGyro(ctx, camera);
  drawHudInfo(ctx, currentFps, renderedStars, chunkCount, gameState.world.globalSeed);
}