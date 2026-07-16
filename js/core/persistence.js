// core/persistence.js
import { gameState, setMovementAutoBrake, setRotationAutoDamp, setFrustumCulling, setShowInfoHud, setGlobalSeed, setPauseGameOnMenu, setRunInBackground } from './state.js';
import { CONFIG, resetConstantsToDefaults } from '../constants.js';
import pathManager from '../render/path/pathManager.js';

const SAVE_KEY = 'spaceGameSave';
const CONSTANTS_KEY = 'spaceGameConstants';
let saveInterval = null;

export function saveGame() {
  const { camera, settings, flags, world, angularVel } = gameState;
  const saveData = {
    x: camera.x, y: camera.y, z: camera.z,
    vx: camera.vx, vy: camera.vy, vz: camera.vz,
    q: [...camera.q],
    turboEnabled: settings.turboEnabled,
    accFactor: settings.accFactor,
    movementAutoBrake: flags.movementAutoBrake,
    rotationAutoDamp: flags.rotationAutoDamp,
    frustumCullingEnabled: flags.frustumCullingEnabled,
    showInfoHud: flags.showInfoHud,
    pauseGameOnMenu: flags.pauseGameOnMenu,
    runInBackground: flags.runInBackground,
    globalSeed: world.globalSeed,
    angularVel: { ...angularVel },
    pathData: pathManager.getData(),
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
    const { camera, settings, flags, world, angularVel } = gameState;
    camera.x = data.x ?? CONFIG.physics.initialPosition.x;
    camera.y = data.y ?? CONFIG.physics.initialPosition.y;
    camera.z = data.z ?? CONFIG.physics.initialPosition.z;
    camera.vx = data.vx ?? CONFIG.physics.initialVelocity.x;
    camera.vy = data.vy ?? CONFIG.physics.initialVelocity.y;
    camera.vz = data.vz ?? CONFIG.physics.initialVelocity.z;
    if (data.q && Array.isArray(data.q) && data.q.length === 4) camera.q = data.q;
    else camera.q = [0,0,0,1];
    settings.turboEnabled = data.turboEnabled ?? CONFIG.physics.initialTurboEnabled;
    settings.accFactor = data.accFactor ?? CONFIG.physics.initialAccelerationFactor;
    setMovementAutoBrake(data.movementAutoBrake ?? false);
    setRotationAutoDamp(data.rotationAutoDamp ?? true);
    setFrustumCulling(data.frustumCullingEnabled ?? true);
    setShowInfoHud(data.showInfoHud ?? false);
    setPauseGameOnMenu(data.pauseGameOnMenu ?? true);
    setRunInBackground(data.runInBackground ?? false);
    setGlobalSeed(data.globalSeed ?? Math.floor(Math.random() * 1000000));
    if (data.angularVel) {
      angularVel.yaw = data.angularVel.yaw ?? 0;
      angularVel.pitch = data.angularVel.pitch ?? 0;
      angularVel.roll = data.angularVel.roll ?? 0;
    }
    if (data.pathData) {
      pathManager.restoreData(data.pathData);
    } else {
      pathManager.clear();
    }
    console.log("Partida cargada correctamente");
    return true;
  } catch (e) {
    console.error("Error al cargar la partida:", e);
    return false;
  }
}

export function saveConstants() {
  const data = {
    physics: { ...CONFIG.physics },
    rendering: { ...CONFIG.rendering },
    stars: { ...CONFIG.stars },
    directional: { ...CONFIG.directional },
  };
  localStorage.setItem(CONSTANTS_KEY, JSON.stringify(data));
  console.log("Constantes guardadas");
}

export function loadConstants() {
  const raw = localStorage.getItem(CONSTANTS_KEY);
  if (raw) {
    try {
      const data = JSON.parse(raw);
      Object.assign(CONFIG.physics, data.physics);
      Object.assign(CONFIG.rendering, data.rendering);
      Object.assign(CONFIG.stars, data.stars);
      Object.assign(CONFIG.directional, data.directional);
      console.log("Constantes cargadas desde localStorage");
    } catch (e) {
      console.error("Error al cargar constantes:", e);
    }
  } else {
    console.log("No hay constantes guardadas, usando valores por defecto");
  }
}

export { resetConstantsToDefaults };

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