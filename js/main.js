// js/main.js
import { ctx } from './canvas.js';
import {
  camera, settings, chunks, movementAutoBrake, rotationAutoDamp,
  frustumCullingEnabled, showInfoHud,
  setFrustumCulling, setShowInfoHud, setMovementAutoBrake, setRotationAutoDamp,
  pathPoints, pathTrackingEnabled, maxPathPoints, pathPersistent,
  pathMinDistance, pathAngleThreshold, pathSpeedFactor, pathSimplifyTolerance,
  addDistance
} from './core/gameState.js';
import { loadGame, loadConstants, startAutoSave } from './core/persistence.js';
import { updateCamera, setInputManager } from './camera/cameraPhysics.js';
import { updateChunks, generateChunk } from './world/chunkManager.js';
import { renderStars } from './render/starRenderer.js';
import { renderCelestials } from './render/celestialRenderer.js';
import { renderPath } from './render/pathRenderer.js';
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

    // ===== PATH TRACKING OPTIMIZADO (con distancia) =====
    if (pathTrackingEnabled) {
      const lastPoint = pathPoints.length > 0 ? pathPoints[pathPoints.length - 1] : null;
      const currentSpeed = Math.hypot(camera.vx, camera.vy, camera.vz);
      
      if (!lastPoint) {
        pathPoints.push({ x: camera.x, y: camera.y, z: camera.z });
      } else {
        const dist = Math.hypot(camera.x - lastPoint.x, camera.y - lastPoint.y, camera.z - lastPoint.z);
        let shouldRecord = false;
        
        // Detección de cambio de dirección
        if (pathPoints.length >= 2) {
          const prevPoint = pathPoints[pathPoints.length - 2];
          const prevDx = lastPoint.x - prevPoint.x;
          const prevDy = lastPoint.y - prevPoint.y;
          const prevDz = lastPoint.z - prevPoint.z;
          const prevLen = Math.hypot(prevDx, prevDy, prevDz);
          
          const currDx = camera.x - lastPoint.x;
          const currDy = camera.y - lastPoint.y;
          const currDz = camera.z - lastPoint.z;
          const currLen = Math.hypot(currDx, currDy, currDz);
          
          if (prevLen > 0.01 && currLen > 0.01) {
            const dot = (prevDx*currDx + prevDy*currDy + prevDz*currDz) / (prevLen * currLen);
            const angle = Math.acos(Math.max(-1, Math.min(1, dot)));
            const speedFactor = 1 - (currentSpeed / 1000) * pathSpeedFactor;
            const adaptiveThreshold = pathAngleThreshold * Math.max(0.2, Math.min(1, speedFactor));
            if (angle > adaptiveThreshold) {
              shouldRecord = true;
            }
          }
        }
        
        const minDist = pathMinDistance * (1 + (currentSpeed / 500) * 0.5);
        if (dist > minDist) {
          shouldRecord = true;
        }
        
        if (shouldRecord) {
          // Sumar distancia recorrida
          addDistance(dist);
          pathPoints.push({ x: camera.x, y: camera.y, z: camera.z });
          if (!pathPersistent && pathPoints.length > maxPathPoints) {
            if (pathPoints.length > maxPathPoints * 1.5) {
              const simplified = douglasPeucker(pathPoints, pathSimplifyTolerance * 2);
              pathPoints.length = 0;
              if (simplified.length > maxPathPoints) {
                pathPoints.push(...simplified.slice(simplified.length - maxPathPoints));
              } else {
                pathPoints.push(...simplified);
              }
            } else {
              pathPoints.splice(0, pathPoints.length - maxPathPoints);
            }
          }
        }
      }
    }
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
  renderPath(ctx, camera);

  const chunkCount = Object.keys(chunks).length;
  drawAllHuds(ctx, camera, inputManager, settings, currentFps, renderedStars, chunkCount);

  requestAnimationFrame(loop);
}

// ===== Funciones de simplificación (Douglas-Peucker) =====
function douglasPeucker(points, tolerance) {
    if (points.length <= 2) return points;
    const first = points[0];
    const last = points[points.length - 1];
    let maxDist = 0, maxIndex = 0;
    for (let i = 1; i < points.length - 1; i++) {
        const dist = perpendicularDistance(points[i], first, last);
        if (dist > maxDist) {
            maxDist = dist;
            maxIndex = i;
        }
    }
    if (maxDist > tolerance) {
        const left = douglasPeucker(points.slice(0, maxIndex + 1), tolerance);
        const right = douglasPeucker(points.slice(maxIndex), tolerance);
        return left.slice(0, -1).concat(right);
    } else {
        return [first, last];
    }
}

function perpendicularDistance(point, lineStart, lineEnd) {
    const dx = lineEnd.x - lineStart.x;
    const dy = lineEnd.y - lineStart.y;
    const dz = lineEnd.z - lineStart.z;
    const lenSq = dx*dx + dy*dy + dz*dz;
    if (lenSq === 0) return 0;
    const t = ((point.x - lineStart.x)*dx + (point.y - lineStart.y)*dy + (point.z - lineStart.z)*dz) / lenSq;
    const projX = lineStart.x + t * dx;
    const projY = lineStart.y + t * dy;
    const projZ = lineStart.z + t * dz;
    return Math.hypot(point.x - projX, point.y - projY, point.z - projZ);
}

requestAnimationFrame(loop);

window.camera = camera;
window.chunks = chunks;
window.uiManager = uiManager;