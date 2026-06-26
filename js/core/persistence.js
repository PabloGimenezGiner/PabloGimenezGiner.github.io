// core/persistence.js
import {
  camera, settings, globalSeed, movementAutoBrake, rotationAutoDamp,
  frustumCullingEnabled, showInfoHud, pauseGameOnMenu,
  setMovementAutoBrake, setRotationAutoDamp,
  setFrustumCulling, setShowInfoHud, setGlobalSeed, setPauseGameOnMenu,
  pathTrackingEnabled, maxPathPoints, pathMinDistance, pathAngleThreshold,
  pathSpeedFactor, pathSimplifyTolerance, pathPoints, pathVisible, pathPersistent,
  totalDistance,
  setPathTrackingEnabled, setMaxPathPoints, setPathMinDistance,
  setPathAngleThreshold, setPathSpeedFactor, setPathSimplifyTolerance,
  setPathVisible, setPathPersistent,
  setTotalDistance,  // <-- importar setter
  clearPath
} from './gameState.js';
import { constants } from '../constants.js';

const SAVE_KEY = 'spaceGameSave';
const CONSTANTS_KEY = 'spaceGameConstants';
let saveInterval = null;

export function saveGame() {
  const saveData = {
    x: camera.x, y: camera.y, z: camera.z,
    vx: camera.vx, vy: camera.vy, vz: camera.vz,
    q: [...camera.q],
    turboEnabled: settings.turboEnabled,
    accFactor: settings.accFactor,
    movementAutoBrake: movementAutoBrake,
    rotationAutoDamp: rotationAutoDamp,
    frustumCullingEnabled: frustumCullingEnabled,
    showInfoHud: showInfoHud,
    pauseGameOnMenu: pauseGameOnMenu,
    globalSeed: globalSeed,
    pathTrackingEnabled: pathTrackingEnabled,
    pathVisible: pathVisible,
    pathPersistent: pathPersistent,
    maxPathPoints: maxPathPoints,
    pathMinDistance: pathMinDistance,
    pathAngleThreshold: pathAngleThreshold,
    pathSpeedFactor: pathSpeedFactor,
    pathSimplifyTolerance: pathSimplifyTolerance,
    pathPoints: pathPoints,
    totalDistance: totalDistance
  };
  localStorage.setItem(SAVE_KEY, JSON.stringify(saveData));
  console.log("Juego guardado automáticamente");
}

export function loadGame() {
  const raw = localStorage.getItem(SAVE_KEY);
  if (!raw) {
    console.log("No hay partida guardada. Iniciando nueva.");
    return false;
  }
  try {
    const data = JSON.parse(raw);
    camera.x = data.x ?? constants.inicX;
    camera.y = data.y ?? constants.inicY;
    camera.z = data.z ?? constants.inicZ;
    camera.vx = data.vx ?? constants.inicVX;
    camera.vy = data.vy ?? constants.inicVY;
    camera.vz = data.vz ?? constants.inicVZ;
    if (data.q && Array.isArray(data.q) && data.q.length === 4) camera.q = data.q;
    else camera.q = [0,0,0,1];
    settings.turboEnabled = data.turboEnabled ?? constants.inicTurboEnabled;
    settings.accFactor = data.accFactor ?? constants.inicAccFactor;
    setMovementAutoBrake(data.movementAutoBrake ?? false);
    setRotationAutoDamp(data.rotationAutoDamp ?? true);
    setFrustumCulling(data.frustumCullingEnabled ?? true);
    setShowInfoHud(data.showInfoHud ?? false);
    setPauseGameOnMenu(data.pauseGameOnMenu ?? true);
    setGlobalSeed(data.globalSeed ?? Math.floor(Math.random() * 1000000));
    // PATH TRACKING
    setPathTrackingEnabled(data.pathTrackingEnabled ?? true);
    setPathVisible(data.pathVisible ?? true);
    setPathPersistent(data.pathPersistent ?? false);
    setMaxPathPoints(data.maxPathPoints ?? 200);
    setPathMinDistance(data.pathMinDistance ?? 10);
    setPathAngleThreshold(data.pathAngleThreshold ?? 0.15);
    setPathSpeedFactor(data.pathSpeedFactor ?? 0.5);
    setPathSimplifyTolerance(data.pathSimplifyTolerance ?? 1.0);
    // Restaurar puntos (mutando array)
    if (data.pathPoints && Array.isArray(data.pathPoints)) {
      const max = pathPersistent ? Infinity : maxPathPoints;
      let newPoints;
      if (data.pathPoints.length > max && max !== Infinity) {
        newPoints = data.pathPoints.slice(data.pathPoints.length - max);
      } else {
        newPoints = data.pathPoints;
      }
      pathPoints.length = 0;
      pathPoints.push(...newPoints);
    } else {
      clearPath();
    }
    // Restaurar distancia total usando el setter
    setTotalDistance(data.totalDistance ?? 0);
    console.log("Partida cargada correctamente");
    return true;
  } catch (e) {
    console.error("Error al cargar la partida:", e);
    return false;
  }
}

// ===== Funciones para constantes =====
export function saveConstants() {
  localStorage.setItem(CONSTANTS_KEY, JSON.stringify(constants));
  console.log("Constantes guardadas");
}

export function loadConstants() {
  const raw = localStorage.getItem(CONSTANTS_KEY);
  if (raw) {
    try {
      const data = JSON.parse(raw);
      Object.assign(constants, data);
      console.log("Constantes cargadas desde localStorage");
    } catch (e) {
      console.error("Error al cargar constantes:", e);
    }
  } else {
    console.log("No hay constantes guardadas, usando valores por defecto");
  }
}

export function resetConstantsToDefaults() {
  const defaultValues = {
    inicX: 0, inicY: 0, inicZ: -5000,
    inicVX: 0, inicVY: 0, inicVZ: 64,
    inicAccFactor: 64, inicTurboEnabled: false,
    normAccMin: 8, mouseWheelStep: 8, normAccMax: 64,
    turbAccMin: 64, turbAccMax: 512, normBaseDecel: 256,
    FOV: 500,
    renderDistanceChunks: 8, chunkSize: 8192, starsPerChunk: 2,
    LOD_NEAR_DIST: 3072, LOD_MID_DIST: 4096,
    nearStarBrightnessBoost: 1.8, midStarBrightnessBoost: 1.8, farStarBrightnessBoost: 2,
    directionalSpeedFactor: 0.1, directionalMinBright: 0, directionalMaxBright: 8,
    STAR_SIZE_NEAR: 9.0, STAR_SIZE_MID: 16.0, STAR_SIZE_FAR: 1.0, STAR_SIZE_FAR_MIN: 2.0
  };
  Object.assign(constants, defaultValues);
  saveConstants();
  console.log("Constantes restauradas a valores por defecto");
}

export function startAutoSave() {
  if (saveInterval) clearInterval(saveInterval);
  saveInterval = setInterval(() => {
    saveGame();
    saveConstants();
  }, 5000);
}

window.addEventListener('beforeunload', () => {
  saveGame();
  saveConstants();
});