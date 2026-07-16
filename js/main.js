// js/main.js
import { ctx } from './canvas.js';
import { gameState, resetGameState, setFrustumCulling, setShowInfoHud, setMovementAutoBrake, setRotationAutoDamp } from './core/state.js';
import { loadGame, loadConstants, startAutoSave } from './core/persistence.js';
import { updateCamera, setInputManager } from './camera/cameraPhysics.js';
import { updateChunks, generateChunk } from './world/chunkManager.js';
import { renderStars } from './render/starRenderer.js';
import { renderCelestials } from './render/celestialRenderer.js';
import { renderPath } from './render/path/pathRenderer.js';
import pathManager from './render/path/pathManager.js';
import { drawAllHuds } from './hud/hudManager.js';
import InputManager from './input/inputManager.js';
import UIManager from './ui/uiManager.js';
import { CONFIG } from './constants.js';
import { GameLoop } from './core/gameLoop.js';
import { startRandomTitleAnimation, stopTitleAnimation } from './titleAnimator.js';

// ===== INICIALIZACIÓN =====
const inputManager = new InputManager(ctx.canvas);
setInputManager(inputManager);

const uiManager = new UIManager(ctx.canvas, inputManager);
inputManager.keyboard.setUIManager(uiManager);

let gamePaused = false;

function pauseGame() {
  gamePaused = true;
  inputManager.setPaused(true);
  if (gameLoop) gameLoop.pause();
  console.log("⏸️ Juego pausado");
}

function resumeGame() {
  gamePaused = false;
  inputManager.setPaused(false);
  if (gameLoop) gameLoop.resume();
  console.log("▶️ Juego reanudado");
}

uiManager.setPauseHandlers(pauseGame, resumeGame);

// Cargar partida y constantes
loadGame();
loadConstants();

// Generar chunks iniciales
const { camera, chunks } = gameState;
const startX = Math.floor(camera.x / CONFIG.rendering.chunkSize);
const startY = Math.floor(camera.y / CONFIG.rendering.chunkSize);
const startZ = Math.floor(camera.z / CONFIG.rendering.chunkSize);
const limit = CONFIG.rendering.renderDistanceChunks;
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

// ===== FUNCIONES DE ACTUALIZACIÓN Y RENDERIZADO =====
function update(dt) {
  const { camera, settings, flags, angularVel, world } = gameState;
  const { frustumCullingEnabled, showInfoHud, movementAutoBrake, rotationAutoDamp } = flags;
  const { chunks } = world;

  // ---- Consumir toggles e inputs ----
  if (inputManager.consumeTurboToggle()) {
    settings.turboEnabled = !settings.turboEnabled;
    if (settings.turboEnabled) {
      settings.accFactor = Math.min(CONFIG.physics.turboAccelerationRange.max, settings.accFactor * 8);
    } else {
      settings.accFactor = Math.max(CONFIG.physics.normalAccelerationRange.min, settings.accFactor / 8);
    }
  }

  const powerDelta = inputManager.consumePowerDelta();
  if (powerDelta !== 0) {
    const step = CONFIG.physics.mouseWheelStep * (settings.turboEnabled ? 8 : 1);
    settings.accFactor += powerDelta * step;
    const min = settings.turboEnabled ? CONFIG.physics.turboAccelerationRange.min : CONFIG.physics.normalAccelerationRange.min;
    const max = settings.turboEnabled ? CONFIG.physics.turboAccelerationRange.max : CONFIG.physics.normalAccelerationRange.max;
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

  // ---- Física y mundo ----
  updateCamera(dt);
  updateChunks(camera.x, camera.y, camera.z);

  // ---- Ruta ----
  const speed = Math.hypot(camera.vx, camera.vy, camera.vz);
  pathManager.addPoint(camera.x, camera.y, camera.z, speed);
}

function render() {
  const { camera, flags, world } = gameState;
  const { showInfoHud } = flags;
  const { chunks } = world;

  ctx.fillStyle = 'black';
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

  const renderedStars = renderStars(ctx, camera);
  renderCelestials(ctx, camera);
  renderPath(ctx, camera);

  const chunkCount = Object.keys(chunks).length;
  // Pasamos currentFps desde el gameLoop
  const fps = gameLoop ? gameLoop.currentFps : 60;
  drawAllHuds(ctx, camera, inputManager, gameState.settings, fps, renderedStars, chunkCount);
}

// ===== CREAR Y CONFIGURAR EL BUCLE =====
let gameLoop = new GameLoop(update, render, {
  fixedStep: 0.016,
  maxDelta: 0.033
});

// ===== MANEJAR CAMBIO DE VISIBILIDAD (con runInBackground) =====
document.addEventListener('visibilitychange', () => {
  if (!gameLoop.isRunning()) return;
  if (document.hidden) {
    if (gameState.flags.runInBackground) {
      gameLoop.enableBackground();
      // Iniciar animación del título (background)
      const modes = ['rotate', 'typewriter', 'scroll', 'wipe', 'replace', 'fade', 'counter', 'none'];
      const randomMode = modes[Math.floor(Math.random() * modes.length)];
      startRandomTitleAnimation(null, randomMode);
      console.log(`🧵 Worker de background iniciado (título animado, modo: ${randomMode})`);
    } else {
      // Pausar el bucle en lugar de usar worker
      gameLoop.pause();
      // También detener cualquier worker que pudiera estar activo (por si acaso)
      if (gameLoop.isBackground()) {
        gameLoop.disableBackground();
      }
      console.log('⏸️ Pestaña oculta, simulación pausada');
    }
  } else {
    // Pestaña visible
    if (gameLoop.isBackground()) {
      gameLoop.disableBackground();
      stopTitleAnimation(true);
      console.log('☀️ Pestaña visible, reanudando rAF (título restaurado)');
    } else {
      // Si estaba pausado, reanudar
      if (gameLoop.isPaused()) {
        gameLoop.resume();
        console.log('☀️ Pestaña visible, reanudando simulación');
      }
    }
  }
});

// ===== ARRANCAR EL JUEGO =====
gameLoop.start();

// Exponer para depuración
window.gameState = gameState;
window.uiManager = uiManager;
window.gameLoop = gameLoop;
console.log('🚀 Simulación iniciada');