// render/path/BQS.js
export class BQS {
  /**
   * @param {number} epsilonBase - Umbral de error base (unidades)
   * @param {number} speedFactor - Factor de ajuste por velocidad (0-1)
   */
  constructor(epsilonBase = 10, speedFactor = 0.5) {
    this.epsilonBase = epsilonBase;
    this.speedFactor = speedFactor;
    this.anchor = null;      // último punto aceptado
    this.epsilon = epsilonBase;
  }

  /**
   * Decide si un nuevo punto debe ser aceptado.
   * @param {number} x, y, z
   * @param {number} speed - velocidad actual (unidades/seg)
   * @returns {boolean} true si se debe registrar
   */
  accept(x, y, z, speed) {
    // Ajustar epsilon según velocidad
    const speedFactor = Math.min(1, speed / 1000); // velocidad máxima de referencia
    this.epsilon = this.epsilonBase * (1 + this.speedFactor * speedFactor);

    if (!this.anchor) {
      this.anchor = { x, y, z };
      return true;
    }

    const dx = x - this.anchor.x;
    const dy = y - this.anchor.y;
    const dz = z - this.anchor.z;
    const dist = Math.hypot(dx, dy, dz);

    if (dist >= this.epsilon) {
      // Actualizar anclaje al nuevo punto
      this.anchor = { x, y, z };
      return true;
    }
    return false;
  }

  // Resetear el filtro (por ejemplo, al borrar la ruta)
  reset() {
    this.anchor = null;
    this.epsilon = this.epsilonBase;
  }

  // Cambiar parámetros en caliente
  setEpsilonBase(val) { this.epsilonBase = val; }
  setSpeedFactor(val) { this.speedFactor = Math.max(0, Math.min(1, val)); }
}