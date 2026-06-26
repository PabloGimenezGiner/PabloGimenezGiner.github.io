// core/gameState.js
import { constants } from '../constants.js';

// Estado de la cámara
export let camera = {
  x: constants.inicX,
  y: constants.inicY,
  z: constants.inicZ,
  q: [0,0,0,1],
  vx: constants.inicVX,
  vy: constants.inicVY,
  vz: constants.inicVZ,
  speed: 0
};

// Configuración del juego
export let settings = {
  turboEnabled: constants.inicTurboEnabled,
  accFactor: constants.inicAccFactor
};

// Chunks de estrellas
export let chunks = {};

// Semilla global
export let globalSeed = Math.floor(Math.random() * 1000000);

export function seededRandom(seed) {
  let s = seed >>> 0;
  return function() {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

export let movementAutoBrake = false;
export let rotationAutoDamp = true;
export let frustumCullingEnabled = true;
export let showInfoHud = false;
export let pauseGameOnMenu = true;

export let angularVel = { yaw: 0, pitch: 0, roll: 0 };
export const ROT_ACC = 4.0;
export const ROT_DAMP = 0.96;
export const ROT_BRAKE_FORCE = 8.0;
export const MAX_ANGULAR_SPEED = 6.0;

// ===== PATH TRACKING OPTIMIZADO =====
export let pathPoints = [];
export let pathTrackingEnabled = true;
export let pathVisible = true;
export let pathPersistent = false;
export let maxPathPoints = 200;
export let pathMinDistance = 10;
export let pathAngleThreshold = 0.15;
export let pathSpeedFactor = 0.5;
export let pathSimplifyTolerance = 1.0;
export let totalDistance = 0;

export function setPathTrackingEnabled(value) { pathTrackingEnabled = value; }
export function setPathVisible(value) { pathVisible = value; }
export function setPathPersistent(value) { pathPersistent = value; }
export function setMaxPathPoints(value) { maxPathPoints = Math.max(10, Math.floor(value)); }
export function setPathMinDistance(value) { pathMinDistance = Math.max(0.5, value); }
export function setPathAngleThreshold(value) { pathAngleThreshold = Math.max(0.01, value); }
export function setPathSpeedFactor(value) { pathSpeedFactor = Math.max(0, Math.min(1, value)); }
export function setPathSimplifyTolerance(value) { pathSimplifyTolerance = Math.max(0.01, value); }
export function clearPath() { pathPoints.length = 0; totalDistance = 0; }
export function addDistance(dist) { if (dist > 0) totalDistance += dist; }
export function resetTotalDistance() { totalDistance = 0; }
export function setTotalDistance(value) { totalDistance = value; }  // <-- setter para carga

// ===== FUNCIONES SETTER =====
export function setMovementAutoBrake(value) { movementAutoBrake = value; }
export function setRotationAutoDamp(value) { rotationAutoDamp = value; }
export function setFrustumCulling(value) { frustumCullingEnabled = value; }
export function setShowInfoHud(value) { showInfoHud = value; }
export function setGlobalSeed(value) { globalSeed = value; }
export function setPauseGameOnMenu(value) { pauseGameOnMenu = value; }
export function setAngularVel(yaw, pitch, roll) {
  angularVel.yaw = yaw;
  angularVel.pitch = pitch;
  angularVel.roll = roll;
}

export function resetGameState() {
  camera.x = constants.inicX;
  camera.y = constants.inicY;
  camera.z = constants.inicZ;
  camera.q = [0, 0, 0, 1];
  camera.vx = constants.inicVX;
  camera.vy = constants.inicVY;
  camera.vz = constants.inicVZ;
  camera.speed = 0;
  
  angularVel.yaw = 0;
  angularVel.pitch = 0;
  angularVel.roll = 0;
  
  for (const key in chunks) {
    delete chunks[key];
  }
  
  clearPath(); // resetea puntos y distancia
  
  console.log("🔄 Posición y chunks reiniciados (ajustes intactos)");
}