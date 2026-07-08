// js/main.js
import { ctx } from './canvas.js';
import {
  camera, settings, chunks, movementAutoBrake, rotationAutoDamp,
  frustumCullingEnabled, showInfoHud,
  setFrustumCulling, setShowInfoHud, setMovementAutoBrake, setRotationAutoDamp,
} from './core/gameState.js';
import { loadGame, loadConstants, startAutoSave } from './core/persistence.js';
import { updateCamera, setInputManager } from './camera/cameraPhysics.js';
import { updateChunks, generateChunk } from './world/chunkManager.js';
import { renderStars } from './render/starRenderer.js';
import { renderCelestials } from './render/celestialRenderer.js';
import { renderPath } from './render/path/pathRenderer.js';   // <-- NUEVO
import pathManager from './render/path/pathManager.js';       // <-- NUEVO
import { drawAllHuds } from './hud/hudManager.js';
import InputManager from './input/inputManager.js';
import UIManager from './ui/uiManager.js';
import { constants } from './constants.js';

const inputManager = new InputManager(ctx.canvas);
setInputManager(inputManager);

const uiManager = new UIManager(ctx.canvas, inputManager);
inputManager.keyboard.setUIManager(uiManager);

let gamePaused = false;

function pauseGame() {
    gamePaused = true;
    inputManager.setPaused(true);
    console.log("⏸️ Juego pausado");
}

function resumeGame() {
    gamePaused = false;
    inputManager.setPaused(false);
    console.log("▶️ Juego reanudado");
}

uiManager.setPauseHandlers(pauseGame, resumeGame);

// Cargar partida y constantes
loadGame();
loadConstants();

const startX = Math.floor(camera.x / constants.chunkSize);
const startY = Math.floor(camera.y / constants.chunkSize);
const startZ = Math.floor(camera.z / constants.chunkSize);
const limit = constants.renderDistanceChunks;
const limitSq = limit * limit;

for (let dx = -limit; dx <= limit; dx++) {
  for (let dy = -limit; dy <= limit; dy++) {
    for (let dz = -limit; dz <= limit; dz++) {
      if (dx * dx + dy * dy + dz * dz <= limitSq) {
        generateChunk(startX + dx, startY + dy, startZ + dz);
      }
    }
  }
}

startAutoSave();

let last = performance.now();
let frameCount = 0;
let lastFpsUpdate = performance.now();
let currentFps = 60;

function loop(now) {
  const dt = Math.min(0.033, (now - last) / 1000);
  last = now;

  if (!gamePaused) {
    if (inputManager.consumeTurboToggle()) {
      settings.turboEnabled = !settings.turboEnabled;
      if (settings.turboEnabled) {
        settings.accFactor = Math.min(constants.turbAccMax, settings.accFactor * 8);
      } else {
        settings.accFactor = Math.max(constants.normAccMin, settings.accFactor / 8);
      }
    }

    const powerDelta = inputManager.consumePowerDelta();
    if (powerDelta !== 0) {
      const step = constants.mouseWheelStep * (settings.turboEnabled ? 8 : 1);
      settings.accFactor += powerDelta * step;
      const min = settings.turboEnabled ? constants.turbAccMin : constants.normAccMin;
      const max = settings.turboEnabled ? constants.turbAccMax : constants.normAccMax;
      settings.accFactor = Math.max(min, Math.min(max, settings.accFactor));
    }

    if (inputManager.consumeFrustumToggle()) {
      setFrustumCulling(!frustumCullingEnabled);
      console.log("Frustum culling:", frustumCullingEnabled ? "ON" : "OFF");
    }

    if (inputManager.consumeInfoHudToggle()) {
      setShowInfoHud(!showInfoHud);
    }

    if (inputManager.consumeMovementAutoBrakeToggle()) {
      setMovementAutoBrake(!movementAutoBrake);
      console.log("Modo movimiento - frenado automático:", movementAutoBrake ? "ON" : "OFF");
    }

    if (inputManager.consumeRotationAutoDampToggle()) {
      setRotationAutoDamp(!rotationAutoDamp);
      console.log("Modo rotación - damping automático:", rotationAutoDamp ? "ON" : "OFF");
    }

    updateCamera(dt);
    updateChunks(camera.x, camera.y, camera.z);

    // ===== PATH TRACKING (AHORA CON PATH MANAGER) =====
    const speed = Math.hypot(camera.vx, camera.vy, camera.vz);
    pathManager.addPoint(camera.x, camera.y, camera.z, speed);
  }

  frameCount++;
  const nowSec = performance.now();
  if (nowSec - lastFpsUpdate >= 1000) {
    currentFps = frameCount * 1000 / (nowSec - lastFpsUpdate);
    frameCount = 0;
    lastFpsUpdate = nowSec;
  }

  ctx.fillStyle = 'black';
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

  const renderedStars = renderStars(ctx, camera);
  renderCelestials(ctx, camera);
  renderPath(ctx, camera);   // <-- NUEVO

  const chunkCount = Object.keys(chunks).length;
  drawAllHuds(ctx, camera, inputManager, settings, currentFps, renderedStars, chunkCount);

  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);

window.camera = camera;
window.chunks = chunks;
window.uiManager = uiManager;