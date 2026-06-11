// core/gameState.js
import { inicX, inicY, inicZ, inicVX, inicVY, inicVZ, inicTurboEnabled, inicAccFactor } from '../constants.js';

// Estado de la cámara
export let camera = {
  x: inicX, y: inicY, z: inicZ,
  q: [0,0,0,1],
  vx: inicVX, vy: inicVY, vz: inicVZ,
  speed: 0
};

// Configuración del juego
export let settings = {
  turboEnabled: inicTurboEnabled,
  accFactor: inicAccFactor
};

// Chunks de estrellas
export let chunks = {};

// Semilla global (se reasignará desde persistencia)
export let globalSeed = Math.floor(Math.random() * 1000000);

// Función de random determinista (se mantiene aquí)
export function seededRandom(seed) {
  let s = seed >>> 0;
  return function() {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

// Modos de conducción
export let movementAutoBrake = false;
export let rotationAutoDamp = true;

// Opciones de renderizado
export let frustumCullingEnabled = true;
export let showInfoHud = false;

// Velocidades angulares y constantes de rotación
export let angularVel = { yaw: 0, pitch: 0, roll: 0 };
export const ROT_ACC = 4.0;
export const ROT_DAMP = 0.96;
export const ROT_BRAKE_FORCE = 8.0;
export const MAX_ANGULAR_SPEED = 6.0;

// Funciones para modificar el estado (útiles desde otros módulos)
export function setMovementAutoBrake(value) { movementAutoBrake = value; }
export function setRotationAutoDamp(value) { rotationAutoDamp = value; }
export function setFrustumCulling(value) { frustumCullingEnabled = value; }
export function setShowInfoHud(value) { showInfoHud = value; }
export function setGlobalSeed(value) { globalSeed = value; }
export function setAngularVel(yaw, pitch, roll) {
  angularVel.yaw = yaw;
  angularVel.pitch = pitch;
  angularVel.roll = roll;
}