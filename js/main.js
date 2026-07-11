// js/main.js
import { ctx } from './canvas.js';
import {
  camera, settings, chunks, movementAutoBrake, rotationAutoDamp,
  frustumCullingEnabled, showInfoHud, runInBackground,
  setFrustumCulling, setShowInfoHud, setMovementAutoBrake, setRotationAutoDamp,
} from './core/gameState.js';
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
import { constants } from './constants.js';
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

// ===== SEPARAR UPDATE Y RENDER =====
function update(dt) {
  // ---- Consumir toggles e inputs ----
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

  // ---- Física y mundo ----
  updateCamera(dt);
  updateChunks(camera.x, camera.y, camera.z);

  // ---- Ruta ----
  const speed = Math.hypot(camera.vx, camera.vy, camera.vz);
  pathManager.addPoint(camera.x, camera.y, camera.z, speed);
}

function render() {
  ctx.fillStyle = 'black';
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

  const renderedStars = renderStars(ctx, camera);
  renderCelestials(ctx, camera);
  renderPath(ctx, camera);

  const chunkCount = Object.keys(chunks).length;
  drawAllHuds(ctx, camera, inputManager, settings, currentFps, renderedStars, chunkCount);
}

// ===== VARIABLES DE BUCLE =====
let rafId = null;
let backgroundWorker = null;
let isBackgroundMode = false;
let last = performance.now();
let frameCount = 0;
let lastFpsUpdate = performance.now();
let currentFps = 60;

// ===== BUCLE PRINCIPAL (rAF) =====
function rafLoop(now) {
  const dt = Math.min(0.033, (now - last) / 1000);
  last = now;

  if (!gamePaused && !isBackgroundMode) {
    update(dt);
  }

  render();
  rafId = requestAnimationFrame(rafLoop);
}

// ===== FUNCIONES PARA EL WORKER =====
function startBackgroundLoop() {
  if (backgroundWorker) return;

  backgroundWorker = new Worker('js/background-worker.js');

  backgroundWorker.addEventListener('message', (e) => {
    if (!isBackgroundMode || gamePaused) return;
    let remaining = e.data;
    const STEP = 0.016;
    while (remaining > STEP) {
      update(STEP);
      remaining -= STEP;
    }
    if (remaining > 0) {
      update(remaining);
    }
  });

  backgroundWorker.postMessage('start');

  // ===== INICIAR ANIMACIÓN DEL TÍTULO =====
  // Ahora elige entre TODOS los modos de texto disponibles
  const modes = [
    'rotate', 'typewriter', 'scroll',
    'wipe', 'replace', 'fade', 'counter', 'none'
  ];
  const randomMode = modes[Math.floor(Math.random() * modes.length)];
  startRandomTitleAnimation(null, randomMode);
  console.log(`🧵 Worker de background iniciado (título animado, modo: ${randomMode})`);
}

function stopBackgroundLoop() {
  if (backgroundWorker) {
    backgroundWorker.postMessage('stop');
    backgroundWorker.terminate();
    backgroundWorker = null;
    stopTitleAnimation(true);
    console.log('🧵 Worker de background detenido (título restaurado)');
  }
}

// ===== DETECTAR CAMBIO DE VISIBILIDAD =====
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    if (runInBackground) {
      isBackgroundMode = true;
      if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
      startBackgroundLoop();
      console.log('🌙 Modo background activado');
    } else {
      isBackgroundMode = true;
      if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
      stopBackgroundLoop();
      console.log('⏸️ Pestaña oculta, simulación pausada');
    }
  } else {
    isBackgroundMode = false;
    stopBackgroundLoop();
    if (!rafId) {
      last = performance.now();
      rafLoop(last);
      console.log('☀️ Pestaña visible, reanudando rAF');
    }
  }
});

// ===== ARRANCAR EL JUEGO =====
last = performance.now();
rafLoop(last);

window.camera = camera;
window.chunks = chunks;
window.uiManager = uiManager;
console.log('🚀 Simulación iniciada');