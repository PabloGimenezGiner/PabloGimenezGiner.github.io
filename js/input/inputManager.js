/**
 * @fileoverview Gestor de entrada unificado que combina teclado, ratón y futuros dispositivos táctiles.
 * Acumula los eventos y los expone a través de métodos getter.
 */

import KeyboardHandler from './keyboardHandler.js';
import MouseHandler from './mouseHandler.js';

/**
 * Clase principal que orquesta la entrada del usuario.
 */
export default class InputManager {
  /**
   * @param {HTMLCanvasElement} canvas - El canvas sobre el que se capturan los eventos.
   */
  constructor(canvas) {
    this.canvas = canvas;

    /** @private {Object} Dirección de movimiento acumulada (normalizada). */
    this.moveDirection = { x: 0, y: 0, z: 0 };

    /** @private {boolean} Indica si se está frenando (tecla X). */
    this.braking = false;

    /** @private {boolean} Indica si se está frenando la rotación (tecla Coma). */
    this.rotBraking = false;

    /** @private {Object} Acumulador de rotación por ratón. */
    this.rotationDelta = { yaw: 0, pitch: 0 };

    /** @private {number} Dirección de alabeo (-1, 0, 1). */
    this.rollDirection = 0;

    /** @private {number} Dirección de cabeceo (-1, 0, 1). */
    this.pitchDirection = 0;

    /** @private {number} Dirección de guiñada (-1, 0, 1). */
    this.yawDirection = 0;

    /** @private {number} Acumulador de cambios de potencia (rueda del ratón). */
    this.powerDelta = 0;

    /** @private {boolean} Solicitud de toggle turbo. */
    this.turboToggleRequest = false;

    /** @private {boolean} Solicitud de toggle frustum culling. */
    this.frustumToggleRequest = false;

    /** @private {boolean} Solicitud de toggle HUD de información. */
    this.infoHudToggleRequest = false;

    /** @private {boolean} Solicitud de toggle frenado automático. */
    this.movementAutoBrakeToggleRequest = false;

    /** @private {boolean} Solicitud de toggle damping automático de rotación. */
    this.rotationAutoDampToggleRequest = false;

    /** @private {boolean} Solicitud de toggle de la GUI (menú). */
    this.guiToggleRequest = false;

    /** @private {number} Entrada de movimiento hacia adelante desde el ratón (botón derecho). */
    this._mouseForward = 0;

    /** @private {number} Entrada de movimiento hacia atrás desde el ratón (botón izquierdo). */
    this._mouseBackward = 0;

    /** @private {boolean} Estado de pausa (ignora el ratón cuando está pausado). */
    this.paused = false;

    /** @type {KeyboardHandler} Manejador de teclado. */
    this.keyboard = new KeyboardHandler(this);

    /** @type {MouseHandler} Manejador de ratón. */
    this.mouse = new MouseHandler(canvas, this);
  }

  /**
   * Pausa o reanuda la captura de entrada del ratón.
   * @param {boolean} paused - true para pausar, false para reanudar.
   */
  setPaused(paused) {
    this.paused = paused;
    if (paused) {
      this.rotationDelta.yaw = 0;
      this.rotationDelta.pitch = 0;
    }
  }

  /**
   * Actualiza la dirección de movimiento, frenado y frenado de rotación desde el teclado.
   * @param {number} x - Componente X normalizada.
   * @param {number} y - Componente Y normalizada.
   * @param {number} z - Componente Z normalizada.
   * @param {boolean} braking - true si se está frenando.
   * @param {boolean} rotBraking - true si se está frenando la rotación.
   */
  onKeyMove(x, y, z, braking, rotBraking) {
    this.moveDirection.x = x;
    this.moveDirection.y = y;
    this.moveDirection.z = z;
    this.braking = braking;
    this.rotBraking = rotBraking;
  }

  /**
   * Establece la dirección de alabeo desde el teclado.
   * @param {number} direction - -1, 0 o 1.
   */
  onRollDirection(direction) {
    this.rollDirection = direction;
  }

  /**
   * Establece la dirección de cabeceo desde el teclado.
   * @param {number} direction - -1, 0 o 1.
   */
  onPitchDirection(direction) {
    this.pitchDirection = direction;
  }

  /**
   * Establece la dirección de guiñada desde el teclado.
   * @param {number} direction - -1, 0 o 1.
   */
  onYawDirection(direction) {
    this.yawDirection = direction;
  }

  /** Solicita alternar el culling de frústum. */
  onFrustumToggle() {
    this.frustumToggleRequest = true;
  }

  /** Solicita alternar el HUD de información. */
  onInfoHudToggle() {
    this.infoHudToggleRequest = true;
  }

  /** Solicita alternar el frenado automático de movimiento. */
  onMovementAutoBrakeToggle() {
    this.movementAutoBrakeToggleRequest = true;
  }

  /** Solicita alternar el damping automático de rotación. */
  onRotationAutoDampToggle() {
    this.rotationAutoDampToggleRequest = true;
  }

  /** Solicita alternar la GUI (menú). */
  onGuiToggle() {
    this.guiToggleRequest = true;
  }

  /**
   * Acumula el movimiento del ratón (deltaYaw, deltaPitch) si no está pausado.
   * @param {number} deltaYaw - Variación de guiñada.
   * @param {number} deltaPitch - Variación de cabeceo.
   */
  onMouseMove(deltaYaw, deltaPitch) {
    if (this.paused) return;
    this.rotationDelta.yaw += deltaYaw;
    this.rotationDelta.pitch += deltaPitch;
  }

  /**
   * Acumula el cambio de potencia desde la rueda del ratón.
   * @param {number} delta - +1 o -1.
   */
  onMouseWheel(delta) {
    this.powerDelta += delta;
  }

  /** Solicita alternar el modo turbo. */
  onTurboToggle() {
    this.turboToggleRequest = true;
  }

  /**
   * Actualiza el estado de los botones del ratón para movimiento.
   * @param {number} forward - 1 si botón derecho presionado, 0 si no.
   * @param {number} backward - 1 si botón izquierdo presionado, 0 si no.
   */
  onMouseMoveButtons(forward, backward) {
    this._mouseForward = forward;
    this._mouseBackward = backward;
  }

  /**
   * Devuelve la dirección de movimiento combinando teclado y ratón.
   * @returns {{x: number, y: number, z: number}} Vector normalizado (máximo 1).
   */
  getMoveDirection() {
    let z = this.moveDirection.z;
    if (this._mouseForward) z += 1;
    if (this._mouseBackward) z -= 1;
    z = Math.max(-1, Math.min(1, z));
    return {
      x: this.moveDirection.x,
      y: this.moveDirection.y,
      z: z
    };
  }

  /**
   * Devuelve el delta de rotación acumulado y lo resetea.
   * @returns {{yaw: number, pitch: number}}
   */
  getRotationDelta() {
    const delta = { ...this.rotationDelta };
    this.rotationDelta.yaw = 0;
    this.rotationDelta.pitch = 0;
    return delta;
  }

  /** @returns {number} Dirección de alabeo (-1, 0, 1). */
  getRollDirection() { return this.rollDirection; }

  /** @returns {number} Dirección de cabeceo (-1, 0, 1). */
  getPitchDirection() { return this.pitchDirection; }

  /** @returns {number} Dirección de guiñada (-1, 0, 1). */
  getYawDirection() { return this.yawDirection; }

  /** @returns {boolean} true si se está frenando (tecla X). */
  isBraking() { return this.braking; }

  /** @returns {boolean} true si se está frenando la rotación (tecla Coma). */
  isRotBraking() { return this.rotBraking; }

  /**
   * Consume el delta de potencia acumulado (rueda del ratón).
   * @returns {number} delta acumulado (se resetea a 0).
   */
  consumePowerDelta() {
    const delta = this.powerDelta;
    this.powerDelta = 0;
    return delta;
  }

  /**
   * Consume la solicitud de toggle turbo.
   * @returns {boolean} true si se solicitó.
   */
  consumeTurboToggle() {
    if (this.turboToggleRequest) {
      this.turboToggleRequest = false;
      return true;
    }
    return false;
  }

  /**
   * Consume la solicitud de toggle frustum culling.
   * @returns {boolean} true si se solicitó.
   */
  consumeFrustumToggle() {
    if (this.frustumToggleRequest) {
      this.frustumToggleRequest = false;
      return true;
    }
    return false;
  }

  /**
   * Consume la solicitud de toggle HUD de información.
   * @returns {boolean} true si se solicitó.
   */
  consumeInfoHudToggle() {
    if (this.infoHudToggleRequest) {
      this.infoHudToggleRequest = false;
      return true;
    }
    return false;
  }

  /**
   * Consume la solicitud de toggle frenado automático.
   * @returns {boolean} true si se solicitó.
   */
  consumeMovementAutoBrakeToggle() {
    if (this.movementAutoBrakeToggleRequest) {
      this.movementAutoBrakeToggleRequest = false;
      return true;
    }
    return false;
  }

  /**
   * Consume la solicitud de toggle damping automático de rotación.
   * @returns {boolean} true si se solicitó.
   */
  consumeRotationAutoDampToggle() {
    if (this.rotationAutoDampToggleRequest) {
      this.rotationAutoDampToggleRequest = false;
      return true;
    }
    return false;
  }

  /**
   * Consume la solicitud de toggle GUI (menú).
   * @returns {boolean} true si se solicitó.
   */
  consumeGuiToggle() {
    if (this.guiToggleRequest) {
      this.guiToggleRequest = false;
      return true;
    }
    return false;
  }

  /**
   * Resetea el delta de rotación acumulado (útil al perder el pointer lock).
   */
  resetMouseDelta() {
    this.rotationDelta.yaw = 0;
    this.rotationDelta.pitch = 0;
  }
}