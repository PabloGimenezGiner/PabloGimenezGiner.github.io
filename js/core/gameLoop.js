/**
 * @fileoverview Bucle principal del juego con soporte para requestAnimationFrame,
 * worker en segundo plano, pausa y gestión de visibilidad de la pestaña.
 */

/**
 * Clase que gestiona el ciclo de vida del juego: iniciar, pausar, reanudar,
 * cambiar entre foreground (rAF) y background (Worker).
 */
export class GameLoop {
  /**
   * @param {Function} updateFn - Función de actualización (recibe dt en segundos).
   * @param {Function} renderFn - Función de renderizado (no recibe parámetros).
   * @param {Object} options - Opciones adicionales.
   * @param {number} options.fixedStep - Paso fijo para el worker (por defecto 0.016).
   * @param {number} options.maxDelta - Delta máximo permitido en rAF (por defecto 0.033).
   */
  constructor(updateFn, renderFn, options = {}) {
    this._update = updateFn;
    this._render = renderFn;
    this._fixedStep = options.fixedStep || 0.016;
    this._maxDelta = options.maxDelta || 0.033;

    /** @private {number|null} ID de requestAnimationFrame. */
    this._rafId = null;

    /** @private {Worker|null} Worker de background. */
    this._worker = null;

    /** @private {boolean} Indica si el bucle está corriendo. */
    this._isRunning = false;

    /** @private {boolean} Indica si las actualizaciones están pausadas. */
    this._isPaused = false;

    /** @private {boolean} Indica si el juego está en modo background (worker). */
    this._isBackground = false;

    /** @private {number} Timestamp del último frame (para rAF). */
    this._lastTimestamp = 0;

    /** @private {number} Contador de FPS (para estadísticas). */
    this._frameCount = 0;

    /** @private {number} Última actualización de FPS. */
    this._lastFpsUpdate = 0;

    /** @private {number} FPS actual (para mostrar en HUD). */
    this.currentFps = 60;

    // Bind de métodos para eventos
    this._onVisibilityChange = this._onVisibilityChange.bind(this);
    this._onWorkerMessage = this._onWorkerMessage.bind(this);
  }

  // ========== MÉTODOS PÚBLICOS ==========

  /**
   * Inicia el bucle principal (en foreground con rAF).
   */
  start() {
    if (this._isRunning) return;
    this._isRunning = true;
    this._isPaused = false;
    this._isBackground = false;
    this._lastTimestamp = performance.now();
    this._lastFpsUpdate = this._lastTimestamp;
    this._frameCount = 0;
    this._rafLoop(this._lastTimestamp);
    document.addEventListener('visibilitychange', this._onVisibilityChange);
    console.log('🎮 GameLoop iniciado (rAF)');
  }

  /**
   * Detiene el bucle por completo (tanto rAF como worker).
   */
  stop() {
    if (!this._isRunning) return;
    this._isRunning = false;
    this._stopRaf();
    this._stopWorker();
    document.removeEventListener('visibilitychange', this._onVisibilityChange);
    console.log('⏹️ GameLoop detenido');
  }

  /**
   * Pausa las actualizaciones (el render sigue ejecutándose).
   */
  pause() {
    if (!this._isRunning || this._isPaused) return;
    this._isPaused = true;
    console.log('⏸️ GameLoop pausado');
  }

  /**
   * Reanuda las actualizaciones.
   */
  resume() {
    if (!this._isRunning || !this._isPaused) return;
    this._isPaused = false;
    this._lastTimestamp = performance.now(); // Evita saltos
    console.log('▶️ GameLoop reanudado');
  }

  /**
   * Cambia al modo background (worker) si la pestaña está oculta.
   * Solo debe llamarse cuando document.hidden === true.
   */
  enableBackground() {
    if (this._isBackground || !this._isRunning) return;
    if (!document.hidden) {
      console.warn('enableBackground() solo debe llamarse cuando la pestaña está oculta');
      return;
    }
    this._isBackground = true;
    this._stopRaf();
    this._startWorker();
    console.log('🌙 GameLoop cambiado a background (worker)');
  }

  /**
   * Vuelve al modo foreground (rAF).
   */
  disableBackground() {
    if (!this._isBackground || !this._isRunning) return;
    this._isBackground = false;
    this._stopWorker();
    this._lastTimestamp = performance.now();
    this._rafLoop(this._lastTimestamp);
    console.log('☀️ GameLoop cambiado a foreground (rAF)');
  }

  /**
   * Indica si el bucle está en modo background.
   * @returns {boolean}
   */
  isBackground() {
    return this._isBackground;
  }

  /**
   * Indica si el bucle está pausado.
   * @returns {boolean}
   */
  isPaused() {
    return this._isPaused;
  }

  /**
   * Indica si el bucle está corriendo.
   * @returns {boolean}
   */
  isRunning() {
    return this._isRunning;
  }

  // ========== MÉTODOS PRIVADOS ==========

  /** @private Bucle principal con requestAnimationFrame. */
  _rafLoop(timestamp) {
    if (!this._isRunning || this._isBackground) return;

    const dt = Math.min(this._maxDelta, (timestamp - this._lastTimestamp) / 1000);
    this._lastTimestamp = timestamp;

    // Actualizar FPS
    this._frameCount++;
    if (timestamp - this._lastFpsUpdate >= 1000) {
      this.currentFps = this._frameCount / ((timestamp - this._lastFpsUpdate) / 1000);
      this._frameCount = 0;
      this._lastFpsUpdate = timestamp;
    }

    // Actualizar y renderizar
    if (!this._isPaused) {
      this._update(dt);
    }
    this._render();

    this._rafId = requestAnimationFrame(this._rafLoop.bind(this));
  }

  /** @private Detiene el bucle rAF. */
  _stopRaf() {
    if (this._rafId) {
      cancelAnimationFrame(this._rafId);
      this._rafId = null;
    }
  }

  /** @private Inicia el worker de background. */
  _startWorker() {
    if (this._worker) return;
    this._worker = new Worker('js/background-worker.js');
    this._worker.addEventListener('message', this._onWorkerMessage);
    this._worker.postMessage('start');
  }

  /** @private Detiene el worker. */
  _stopWorker() {
    if (this._worker) {
      this._worker.postMessage('stop');
      this._worker.terminate();
      this._worker = null;
    }
  }

  /** @private Manejador de mensajes del worker. */
  _onWorkerMessage(event) {
    if (!this._isRunning || !this._isBackground || this._isPaused) return;
    let remaining = event.data;
    const step = this._fixedStep;
    while (remaining > step) {
      this._update(step);
      remaining -= step;
    }
    if (remaining > 0) {
      this._update(remaining);
    }
    // El render no se ejecuta en el worker (solo actualización)
  }

  /** @private Manejador de cambio de visibilidad de la pestaña. */
  _onVisibilityChange() {
    if (!this._isRunning) return;
    if (document.hidden) {
      // La pestaña se oculta: cambiar a background si está permitido
      // Nota: la decisión de si usar background o pausar se toma en main.js,
      // pero podemos dejar que main.js llame a enableBackground/disableBackground
      // según su propia lógica (runInBackground). Por tanto, este evento solo
      // notifica, pero no actúa directamente.
      // Para mantener el control en main.js, despachamos un evento personalizado
      // o simplemente main.js escucha visibilitychange y llama a los métodos.
      // Lo dejamos así: main.js se encarga de llamar a enableBackground/disableBackground.
      // Este método solo se usa para detener el worker si la pestaña se vuelve visible
      // (aunque main.js también lo hará).
    }
  }
}