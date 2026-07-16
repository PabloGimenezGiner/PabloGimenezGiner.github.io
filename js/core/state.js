/**
 * @fileoverview Estado central del juego.
 * Todas las variables mutables se agrupan en un solo objeto.
 * Los setters permiten actualizar el estado de forma controlada.
 */

import { CONFIG } from '../constants.js';

/**
 * Objeto principal que contiene todo el estado mutable del juego.
 * @type {Object}
 * @property {Object} camera - Estado de la cámara.
 * @property {number} camera.x - Posición X.
 * @property {number} camera.y - Posición Y.
 * @property {number} camera.z - Posición Z.
 * @property {number[]} camera.q - Cuaternión de orientación [x,y,z,w].
 * @property {number} camera.vx - Velocidad en X.
 * @property {number} camera.vy - Velocidad en Y.
 * @property {number} camera.vz - Velocidad en Z.
 * @property {number} camera.speed - Módulo de velocidad (actualizado automáticamente).
 * @property {Object} settings - Ajustes del juego.
 * @property {boolean} settings.turboEnabled - Modo turbo activado.
 * @property {number} settings.accFactor - Factor de aceleración actual.
 * @property {Object} flags - Interruptores booleanos.
 * @property {boolean} flags.movementAutoBrake - Frenado automático al soltar teclas.
 * @property {boolean} flags.rotationAutoDamp - Amortiguación de rotación.
 * @property {boolean} flags.frustumCullingEnabled - Culling de frústum activado.
 * @property {boolean} flags.showInfoHud - Mostrar HUD de información.
 * @property {boolean} flags.pauseGameOnMenu - Pausar al abrir el menú.
 * @property {boolean} flags.runInBackground - Ejecutar en segundo plano.
 * @property {Object} world - Estado del mundo.
 * @property {Object} world.chunks - Diccionario de chunks {key: star[]}.
 * @property {number} world.globalSeed - Semilla global para generación procedural.
 * @property {Object} angularVel - Velocidad angular en cada eje.
 * @property {number} angularVel.yaw - Velocidad de guiñada.
 * @property {number} angularVel.pitch - Velocidad de cabeceo.
 * @property {number} angularVel.roll - Velocidad de alabeo.
 */
export const gameState = {
  camera: {
    x: CONFIG.physics.initialPosition.x,
    y: CONFIG.physics.initialPosition.y,
    z: CONFIG.physics.initialPosition.z,
    q: [0, 0, 0, 1],
    vx: CONFIG.physics.initialVelocity.x,
    vy: CONFIG.physics.initialVelocity.y,
    vz: CONFIG.physics.initialVelocity.z,
    speed: 0,
  },
  settings: {
    turboEnabled: CONFIG.physics.initialTurboEnabled,
    accFactor: CONFIG.physics.initialAccelerationFactor,
  },
  flags: {
    movementAutoBrake: false,
    rotationAutoDamp: true,
    frustumCullingEnabled: true,
    showInfoHud: false,
    pauseGameOnMenu: true,
    runInBackground: false,
  },
  world: {
    chunks: {},
    globalSeed: Math.floor(Math.random() * 1000000),
  },
  angularVel: {
    yaw: 0,
    pitch: 0,
    roll: 0,
  },
};

/**
 * Activa o desactiva el frenado automático de movimiento.
 * @param {boolean} value - Nuevo estado.
 */
export function setMovementAutoBrake(value) {
  gameState.flags.movementAutoBrake = value;
}

/**
 * Activa o desactiva el amortiguamiento automático de rotación.
 * @param {boolean} value - Nuevo estado.
 */
export function setRotationAutoDamp(value) {
  gameState.flags.rotationAutoDamp = value;
}

/**
 * Activa o desactiva el culling de frústum.
 * @param {boolean} value - Nuevo estado.
 */
export function setFrustumCulling(value) {
  gameState.flags.frustumCullingEnabled = value;
}

/**
 * Muestra u oculta el HUD de información (FPS, estrellas, etc.).
 * @param {boolean} value - Nuevo estado.
 */
export function setShowInfoHud(value) {
  gameState.flags.showInfoHud = value;
}

/**
 * Cambia la semilla global del mundo.
 * @param {number} value - Nueva semilla.
 */
export function setGlobalSeed(value) {
  gameState.world.globalSeed = value;
}

/**
 * Activa o desactiva la pausa al abrir el menú.
 * @param {boolean} value - Nuevo estado.
 */
export function setPauseGameOnMenu(value) {
  gameState.flags.pauseGameOnMenu = value;
}

/**
 * Activa o desactiva la ejecución en segundo plano (background).
 * @param {boolean} value - Nuevo estado.
 */
export function setRunInBackground(value) {
  gameState.flags.runInBackground = value;
}

/**
 * Establece la velocidad angular en los tres ejes.
 * @param {number} yaw - Velocidad de guiñada.
 * @param {number} pitch - Velocidad de cabeceo.
 * @param {number} roll - Velocidad de alabeo.
 */
export function setAngularVel(yaw, pitch, roll) {
  gameState.angularVel.yaw = yaw;
  gameState.angularVel.pitch = pitch;
  gameState.angularVel.roll = roll;
}

/**
 * Restaura la posición de la cámara y los chunks a los valores iniciales.
 * Los ajustes (turbo, accFactor, flags) NO se modifican.
 */
export function resetGameState() {
  const c = gameState.camera;
  c.x = CONFIG.physics.initialPosition.x;
  c.y = CONFIG.physics.initialPosition.y;
  c.z = CONFIG.physics.initialPosition.z;
  c.q = [0, 0, 0, 1];
  c.vx = CONFIG.physics.initialVelocity.x;
  c.vy = CONFIG.physics.initialVelocity.y;
  c.vz = CONFIG.physics.initialVelocity.z;
  c.speed = 0;

  gameState.angularVel.yaw = 0;
  gameState.angularVel.pitch = 0;
  gameState.angularVel.roll = 0;

  const chunks = gameState.world.chunks;
  for (const key in chunks) {
    delete chunks[key];
  }

  console.log("🔄 Posición y chunks reiniciados (ajustes intactos)");
}

// ============================================================
//  RE‑EXPORTAR PROPIEDADES PARA COMPATIBILIDAD
// ============================================================

/** @type {Object} Referencia a gameState.camera para compatibilidad */
export const camera = gameState.camera;

/** @type {Object} Referencia a gameState.settings para compatibilidad */
export const settings = gameState.settings;

/** @type {boolean} Referencia a gameState.flags.movementAutoBrake */
export const movementAutoBrake = gameState.flags.movementAutoBrake;

/** @type {boolean} Referencia a gameState.flags.rotationAutoDamp */
export const rotationAutoDamp = gameState.flags.rotationAutoDamp;

/** @type {boolean} Referencia a gameState.flags.frustumCullingEnabled */
export const frustumCullingEnabled = gameState.flags.frustumCullingEnabled;

/** @type {boolean} Referencia a gameState.flags.showInfoHud */
export const showInfoHud = gameState.flags.showInfoHud;

/** @type {boolean} Referencia a gameState.flags.pauseGameOnMenu */
export const pauseGameOnMenu = gameState.flags.pauseGameOnMenu;

/** @type {boolean} Referencia a gameState.flags.runInBackground */
export const runInBackground = gameState.flags.runInBackground;

/** @type {Object} Referencia a gameState.world.chunks */
export const chunks = gameState.world.chunks;

/** @type {number} Referencia a gameState.world.globalSeed */
export const globalSeed = gameState.world.globalSeed;

/** @type {Object} Referencia a gameState.angularVel */
export const angularVel = gameState.angularVel;