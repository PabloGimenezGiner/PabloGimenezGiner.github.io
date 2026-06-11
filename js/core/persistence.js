// core/persistence.js
import {
  camera, settings, globalSeed, movementAutoBrake, rotationAutoDamp,
  frustumCullingEnabled, showInfoHud, setMovementAutoBrake, setRotationAutoDamp,
  setFrustumCulling, setShowInfoHud, setGlobalSeed
} from './gameState.js';
import { inicX, inicY, inicZ, inicVX, inicVY, inicVZ, inicTurboEnabled, inicAccFactor } from '../constants.js';

const SAVE_KEY = 'spaceGameSave';
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
    globalSeed: globalSeed
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
    camera.x = data.x ?? inicX;
    camera.y = data.y ?? inicY;
    camera.z = data.z ?? inicZ;
    camera.vx = data.vx ?? inicVX;
    camera.vy = data.vy ?? inicVY;
    camera.vz = data.vz ?? inicVZ;
    if (data.q && Array.isArray(data.q) && data.q.length === 4) camera.q = data.q;
    else camera.q = [0,0,0,1];
    settings.turboEnabled = data.turboEnabled ?? inicTurboEnabled;
    settings.accFactor = data.accFactor ?? inicAccFactor;
    setMovementAutoBrake(data.movementAutoBrake ?? false);
    setRotationAutoDamp(data.rotationAutoDamp ?? true);
    setFrustumCulling(data.frustumCullingEnabled ?? true);
    setShowInfoHud(data.showInfoHud ?? false);
    setGlobalSeed(data.globalSeed ?? Math.floor(Math.random() * 1000000));
    console.log("Partida cargada correctamente");
    return true;
  } catch (e) {
    console.error("Error al cargar la partida:", e);
    return false;
  }
}

export function startAutoSave() {
  if (saveInterval) clearInterval(saveInterval);
  saveInterval = setInterval(() => saveGame(), 5000);
}

window.addEventListener('beforeunload', () => saveGame());