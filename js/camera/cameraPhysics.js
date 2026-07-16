/**
 * @fileoverview Física de la cámara: rotación, movimiento lineal e integración.
 * Todas las funciones auxiliares son puras (sin efectos secundarios) o mutan
 * directamente el estado de la cámara y la velocidad angular.
 */

import { quatFromAxisAngle, quatMultiply, quatNormalize, rotateVectorByQuat } from '../quaternion.js';
import { gameState } from '../core/state.js';
import { CONFIG } from '../constants.js';
import { ctx } from '../canvas.js';

let inputManager;

/**
 * Asigna el gestor de entrada para que la física pueda leer el estado del teclado/ratón.
 * @param {InputManager} im - Instancia del gestor de entrada.
 */
export function setInputManager(im) {
  inputManager = im;
}

// ============================================================
//  FUNCIONES AUXILIARES (rotación)
// ============================================================

/**
 * Aplica la rotación por ratón (deltaYaw, deltaPitch) a la cámara.
 * @param {Object} camera - Objeto cámara con posición y cuaternión.
 * @param {number} deltaYaw - Variación de guiñada en radianes.
 * @param {number} deltaPitch - Variación de cabeceo en radianes.
 */
function applyMouseRotation(camera, deltaYaw, deltaPitch) {
  if (deltaYaw === 0 && deltaPitch === 0) return;
  const up = rotateVectorByQuat([0, 1, 0], camera.q);
  const right = rotateVectorByQuat([1, 0, 0], camera.q);
  const yawQ = quatFromAxisAngle(up, deltaYaw);
  const pitchQ = quatFromAxisAngle(right, deltaPitch);
  camera.q = quatNormalize(quatMultiply(pitchQ, quatMultiply(yawQ, camera.q)));
}

/**
 * Actualiza la velocidad angular a partir de la entrada del teclado.
 * @param {InputManager} input - Gestor de entrada.
 * @param {number} dt - Delta de tiempo en segundos.
 * @param {Object} angularVel - Objeto con {yaw, pitch, roll}.
 * @param {Object} config - Configuración de física (CONFIG.physics).
 */
function updateAngularVelocity(input, dt, angularVel, config) {
  const yawInput = input.getYawDirection();
  const pitchInput = input.getPitchDirection();
  const rollInput = input.getRollDirection();
  const rotBraking = input.isRotBraking();
  const { rotationAcceleration, rotationDamping, rotationBrakeForce, maxAngularSpeed } = config;

  if (!rotBraking) {
    angularVel.yaw += yawInput * rotationAcceleration * dt;
    angularVel.pitch += pitchInput * rotationAcceleration * dt;
    angularVel.roll += rollInput * rotationAcceleration * dt;
  } else {
    const brake = rotationBrakeForce * dt;
    if (angularVel.yaw > 0) angularVel.yaw = Math.max(0, angularVel.yaw - brake);
    else if (angularVel.yaw < 0) angularVel.yaw = Math.min(0, angularVel.yaw + brake);
    if (angularVel.pitch > 0) angularVel.pitch = Math.max(0, angularVel.pitch - brake);
    else if (angularVel.pitch < 0) angularVel.pitch = Math.min(0, angularVel.pitch + brake);
    if (angularVel.roll > 0) angularVel.roll = Math.max(0, angularVel.roll - brake);
    else if (angularVel.roll < 0) angularVel.roll = Math.min(0, angularVel.roll + brake);
  }

  if (!rotBraking && gameState.flags.rotationAutoDamp) {
    if (yawInput === 0) angularVel.yaw *= rotationDamping;
    if (pitchInput === 0) angularVel.pitch *= rotationDamping;
    if (rollInput === 0) angularVel.roll *= rotationDamping;
  }

  angularVel.yaw = Math.min(maxAngularSpeed, Math.max(-maxAngularSpeed, angularVel.yaw));
  angularVel.pitch = Math.min(maxAngularSpeed, Math.max(-maxAngularSpeed, angularVel.pitch));
  angularVel.roll = Math.min(maxAngularSpeed, Math.max(-maxAngularSpeed, angularVel.roll));
}

/**
 * Aplica la velocidad angular a la orientación de la cámara.
 * @param {Object} camera - Objeto cámara.
 * @param {Object} angularVel - Velocidad angular {yaw, pitch, roll}.
 * @param {number} dt - Delta de tiempo en segundos.
 */
function applyAngularVelocity(camera, angularVel, dt) {
  if (angularVel.yaw !== 0) {
    const up = rotateVectorByQuat([0, 1, 0], camera.q);
    camera.q = quatNormalize(quatMultiply(quatFromAxisAngle(up, angularVel.yaw * dt), camera.q));
  }
  if (angularVel.pitch !== 0) {
    const right = rotateVectorByQuat([1, 0, 0], camera.q);
    camera.q = quatNormalize(quatMultiply(quatFromAxisAngle(right, angularVel.pitch * dt), camera.q));
  }
  if (angularVel.roll !== 0) {
    const forward = rotateVectorByQuat([0, 0, -1], camera.q);
    camera.q = quatNormalize(quatMultiply(quatFromAxisAngle(forward, angularVel.roll * dt), camera.q));
  }
}

// ============================================================
//  FUNCIONES AUXILIARES (movimiento lineal)
// ============================================================

/**
 * Procesa la aceleración lineal a partir de las teclas de movimiento.
 * @param {InputManager} input - Gestor de entrada.
 * @param {Object} camera - Objeto cámara.
 * @param {Object} settings - Ajustes (turboEnabled, accFactor).
 * @param {number} dt - Delta de tiempo en segundos.
 */
function processLinearAcceleration(input, camera, settings, dt) {
  const move = input.getMoveDirection();
  if (move.x === 0 && move.y === 0 && move.z === 0) return;
  const acc = settings.accFactor;
  const worldAcc = rotateVectorByQuat([move.x, move.y, move.z], camera.q).map(v => v * acc * dt);
  camera.vx += worldAcc[0];
  camera.vy += worldAcc[1];
  camera.vz += worldAcc[2];
}

/**
 * Aplica el frenado automático si no hay entrada de movimiento y está activado.
 * @param {InputManager} input - Gestor de entrada.
 * @param {Object} camera - Objeto cámara.
 * @param {Object} settings - Ajustes (turboEnabled).
 * @param {number} dt - Delta de tiempo en segundos.
 */
function applyAutoBrake(input, camera, settings, dt) {
  if (!gameState.flags.movementAutoBrake) return;
  const move = input.getMoveDirection();
  if (move.x !== 0 || move.y !== 0 || move.z !== 0) return;
  if (input.isBraking()) return;

  const autoDecel = CONFIG.physics.baseDeceleration * (settings.turboEnabled ? 8 : 1);
  const sp = Math.hypot(camera.vx, camera.vy, camera.vz);
  if (sp <= 0) return;

  const decelMag = autoDecel * dt;
  const newSp = Math.max(0, sp - decelMag);
  if (newSp === 0) {
    camera.vx = camera.vy = camera.vz = 0;
  } else {
    const factor = newSp / sp;
    camera.vx *= factor;
    camera.vy *= factor;
    camera.vz *= factor;
  }
}

/**
 * Limita la velocidad lineal a la máxima permitida según el modo turbo.
 * @param {Object} camera - Objeto cámara.
 * @param {number} maxSpeed - Velocidad máxima (2048 en turbo, 512 normal).
 */
function clampLinearSpeed(camera, maxSpeed) {
  const sp = Math.hypot(camera.vx, camera.vy, camera.vz);
  if (sp > maxSpeed) {
    const factor = maxSpeed / sp;
    camera.vx *= factor;
    camera.vy *= factor;
    camera.vz *= factor;
  }
}

/**
 * Aplica el frenado manual (tecla X) reduciendo la velocidad lineal.
 * @param {InputManager} input - Gestor de entrada.
 * @param {Object} camera - Objeto cámara.
 * @param {Object} settings - Ajustes (turboEnabled).
 * @param {number} dt - Delta de tiempo en segundos.
 */
function applyManualBrake(input, camera, settings, dt) {
  if (!input.isBraking()) return;
  const decel = CONFIG.physics.baseDeceleration * (settings.turboEnabled ? 8 : 1);
  const sv = [camera.vx, camera.vy, camera.vz];
  const sp = Math.hypot(...sv);
  if (sp === 0) return;

  const dv = sv.map(v => -v / sp * decel * dt);
  const newV = [camera.vx + dv[0], camera.vy + dv[1], camera.vz + dv[2]];
  const newSp = Math.hypot(...newV);
  if (newSp > sp) {
    camera.vx = camera.vy = camera.vz = 0;
  } else {
    camera.vx = newV[0];
    camera.vy = newV[1];
    camera.vz = newV[2];
  }
}

/**
 * Integra la posición a partir de la velocidad y actualiza la velocidad (módulo).
 * @param {Object} camera - Objeto cámara.
 * @param {number} dt - Delta de tiempo en segundos.
 */
function integratePosition(camera, dt) {
  camera.x += camera.vx * dt;
  camera.y += camera.vy * dt;
  camera.z += camera.vz * dt;
  camera.speed = Math.hypot(camera.vx, camera.vy, camera.vz);
}

// ============================================================
//  FUNCIÓN PRINCIPAL
// ============================================================

/**
 * Actualiza la física de la cámara (rotación y movimiento) para un paso de tiempo dado.
 * Lee el estado global (gameState) y el inputManager.
 * @param {number} dt - Delta de tiempo en segundos (normalmente 0.016 para 60 FPS).
 */
export function updateCamera(dt) {
  const { camera, settings, angularVel } = gameState;
  const config = CONFIG.physics;
  const maxSpd = settings.turboEnabled ? 2048 : 512;

  const rot = inputManager.getRotationDelta();
  applyMouseRotation(camera, rot.yaw, rot.pitch);

  updateAngularVelocity(inputManager, dt, angularVel, config);
  applyAngularVelocity(camera, angularVel, dt);

  processLinearAcceleration(inputManager, camera, settings, dt);
  applyAutoBrake(inputManager, camera, settings, dt);
  applyManualBrake(inputManager, camera, settings, dt);
  clampLinearSpeed(camera, maxSpd);
  integratePosition(camera, dt);
}

// ============================================================
//  PROYECCIÓN 3D
// ============================================================

/**
 * Proyecta un punto 3D del mundo a coordenadas de pantalla utilizando la cámara actual.
 * @param {number} x - Coordenada X del punto.
 * @param {number} y - Coordenada Y del punto.
 * @param {number} z - Coordenada Z del punto.
 * @returns {Object} Objeto con propiedades:
 *   - x: coordenada X en píxeles (centro de pantalla = 0)
 *   - y: coordenada Y en píxeles (centro de pantalla = 0)
 *   - visible: booleano, true si está delante de la cámara (z > 1)
 *   - scale: factor de escala (relacionado con la distancia)
 */
export function project3D(x, y, z) {
  const { camera } = gameState;
  let dx = x - camera.x, dy = y - camera.y, dz = z - camera.z;
  const invQ = [-camera.q[0], -camera.q[1], -camera.q[2], camera.q[3]];
  [dx, dy, dz] = rotateVectorByQuat([dx, dy, dz], invQ);
  const scale = CONFIG.rendering.fov / (dz || 0.0001);
  return {
    x: ctx.canvas.width / 2 + dx * scale,
    y: ctx.canvas.height / 2 - dy * scale,
    visible: dz > 1,
    scale: scale
  };
}