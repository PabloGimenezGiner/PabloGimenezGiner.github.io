/**
 * @fileoverview Gestor de la ruta del jugador: almacenamiento circular,
 * filtrado de puntos, simplificación Douglas-Peucker y persistencia.
 */

class PathManager {
  constructor() {
    // Buffer circular de puntos
    this.maxPoints = 2000;
    this._data = new Float32Array(this.maxPoints * 3);
    this._count = 0;
    this._head = 0;
    this._tail = 0;
    this.totalDistance = 0;

    // Filtro de aceptación
    this.baseDist = 5;
    this.speedFactor = 0.5;
    this.angleThreshold = 0.95;
    this.minTimeBetweenPoints = 50;

    // Nivel de detalle para renderizado
    this.lodMaxSubdivs = 20;
    this.lodMinSubdivs = 2;
    this.lodMaxDist = 5000;

    // Simplificación (Douglas-Peucker)
    this.simplifyEnabled = false;
    this.simplifyTolerance = 1.0;
    this.simplifyWindow = 100; // Ya no se usa, se mantiene por compatibilidad

    // Estado interno
    this._lastTimestamp = 0;
    this._lastAccepted = null;
    this._prevAccepted = null;
    this._dirty = true;
    this._simplifiedCache = null;
    this._cachedCount = 0;

    // Visibilidad y persistencia
    this.visible = true;
    this.enabled = true;
    this.persistent = false;

    this.ABSOLUTE_MAX = 200000;

    // Valores por defecto para reset
    this._defaults = {
      baseDist: 5,
      speedFactor: 0.5,
      angleThreshold: 0.95,
      minTimeBetweenPoints: 50,
      lodMaxSubdivs: 20,
      lodMinSubdivs: 2,
      lodMaxDist: 5000,
      simplifyEnabled: false,
      simplifyTolerance: 1.0,
      simplifyWindow: 100,
      maxPoints: 2000,
      persistent: false,
      visible: true,
      enabled: true
    };
  }

  // ========== SETTERS ==========

  /** @param {boolean} v */
  setEnabled(v) { this.enabled = v; }
  /** @param {boolean} v */
  setVisible(v) { this.visible = v; }
  /** @param {boolean} v */
  setPersistent(v) { this.persistent = v; }

  /**
   * Establece el número máximo de puntos en el buffer.
   * @param {number} v - Nuevo máximo (entre 10 y ABSOLUTE_MAX).
   */
  setMaxPoints(v) {
    const newMax = Math.max(10, Math.min(this.ABSOLUTE_MAX, v));
    if (newMax === this.maxPoints) return;
    const oldData = this._getOrderedPoints();
    const oldCount = oldData ? oldData.length / 3 : 0;
    this.maxPoints = newMax;
    this._data = new Float32Array(this.maxPoints * 3);
    this._count = 0;
    this._head = 0;
    this._tail = 0;
    this.totalDistance = 0;
    if (oldData && oldCount > 0) {
      const start = Math.max(0, oldCount - this.maxPoints);
      for (let i = start; i < oldCount; i++) {
        const idx = i * 3;
        this._writePointInternal(oldData[idx], oldData[idx+1], oldData[idx+2]);
      }
    }
    this._recalcTotalDistance();
    this._dirty = true;
  }

  /** @param {number} v - Distancia base (>= 0.1) */
  setBaseDist(v) { this.baseDist = Math.max(0.1, v); }
  /** @param {number} v - Factor velocidad (0..1) */
  setSpeedFactor(v) { this.speedFactor = Math.max(0, Math.min(1, v)); }
  /** @param {number} v - Umbral ángulo (0.5..1) */
  setAngleThreshold(v) { this.angleThreshold = Math.max(0.5, Math.min(1, v)); }
  /** @param {number} v - Tiempo mínimo entre puntos (>= 10 ms) */
  setMinTimeBetweenPoints(v) { this.minTimeBetweenPoints = Math.max(10, v); }
  /** @param {number} v - Subdivisiones máximas (>= 1) */
  setLodMaxSubdivs(v) { this.lodMaxSubdivs = Math.max(1, v); }
  /** @param {number} v - Subdivisiones mínimas (>= 1, <= lodMaxSubdivs) */
  setLodMinSubdivs(v) { this.lodMinSubdivs = Math.max(1, Math.min(this.lodMaxSubdivs, v)); }
  /** @param {number} v - Distancia máxima para LOD (>= 10) */
  setLodMaxDist(v) { this.lodMaxDist = Math.max(10, v); }
  /** @param {boolean} v */
  setSimplifyEnabled(v) { this.simplifyEnabled = v; this._dirty = true; }
  /** @param {number} v - Tolerancia (>= 0) */
  setSimplifyTolerance(v) { this.simplifyTolerance = Math.max(0, v); this._dirty = true; }
  /**
   * @deprecated Ya no se usa; la simplificación se aplica a toda la ruta.
   * @param {number} v - Ventana de puntos (se ignora).
   */
  setSimplifyWindow(v) {
    this.simplifyWindow = Math.max(0, v);
    console.warn('simplifyWindow ya no se usa; la simplificación se aplica siempre a toda la ruta.');
  }

  // ========== RESET A VALORES POR DEFECTO ==========

  /** Restaura todos los parámetros a sus valores por defecto y limpia la ruta. */
  resetToDefaults() {
    this.baseDist = this._defaults.baseDist;
    this.speedFactor = this._defaults.speedFactor;
    this.angleThreshold = this._defaults.angleThreshold;
    this.minTimeBetweenPoints = this._defaults.minTimeBetweenPoints;
    this.lodMaxSubdivs = this._defaults.lodMaxSubdivs;
    this.lodMinSubdivs = this._defaults.lodMinSubdivs;
    this.lodMaxDist = this._defaults.lodMaxDist;
    this.simplifyEnabled = this._defaults.simplifyEnabled;
    this.simplifyTolerance = this._defaults.simplifyTolerance;
    this.simplifyWindow = this._defaults.simplifyWindow;
    this.maxPoints = this._defaults.maxPoints;
    this.persistent = this._defaults.persistent;
    this.visible = this._defaults.visible;
    this.enabled = this._defaults.enabled;
    this._data = new Float32Array(this.maxPoints * 3);
    this._count = 0;
    this._head = 0;
    this._tail = 0;
    this.totalDistance = 0;
    this._lastAccepted = null;
    this._prevAccepted = null;
    this._dirty = true;
    this._simplifiedCache = null;
    this._cachedCount = 0;
    this._lastTimestamp = 0;
    console.log('🔄 Parámetros de ruta restaurados a valores por defecto');
  }

  // ========== RECALCULAR DISTANCIA TOTAL ==========

  /** @private */
  _recalcTotalDistance() {
    if (this._count < 2) {
      this.totalDistance = 0;
      return;
    }
    let sum = 0;
    for (let i = 1; i < this._count; i++) {
      const idxA = ((this._tail + i - 1) % this.maxPoints) * 3;
      const idxB = ((this._tail + i) % this.maxPoints) * 3;
      const dx = this._data[idxB] - this._data[idxA];
      const dy = this._data[idxB + 1] - this._data[idxA + 1];
      const dz = this._data[idxB + 2] - this._data[idxA + 2];
      sum += Math.hypot(dx, dy, dz);
    }
    this.totalDistance = sum;
  }

  // ========== ESCRITURA DE PUNTO (CON CORRECCIÓN DE DISTANCIA) ==========

  /**
   * Escribe un punto en el buffer circular, actualizando la distancia total.
   * @param {number} x - Coordenada X.
   * @param {number} y - Coordenada Y.
   * @param {number} z - Coordenada Z.
   * @private
   */
  _writePointInternal(x, y, z) {
    const idx = this._head * 3;
    if (this._count === this.maxPoints) {
      const tailIdx = this._tail * 3;
      const nextIdx = ((this._tail + 1) % this.maxPoints) * 3;
      const dx = this._data[nextIdx] - this._data[tailIdx];
      const dy = this._data[nextIdx + 1] - this._data[tailIdx + 1];
      const dz = this._data[nextIdx + 2] - this._data[tailIdx + 2];
      const distLost = Math.hypot(dx, dy, dz);
      this.totalDistance = Math.max(0, this.totalDistance - distLost);
    }

    this._data[idx] = x;
    this._data[idx + 1] = y;
    this._data[idx + 2] = z;

    if (this._count < this.maxPoints) {
      this._count++;
    } else {
      this._tail = (this._tail + 1) % this.maxPoints;
    }
    this._head = (this._head + 1) % this.maxPoints;

    if (this._count >= 2) {
      const prevIdx = ((this._head - 2 + this.maxPoints) % this.maxPoints) * 3;
      const px = this._data[prevIdx];
      const py = this._data[prevIdx + 1];
      const pz = this._data[prevIdx + 2];
      const d = Math.hypot(x - px, y - py, z - pz);
      this.totalDistance += d;
    }
  }

  // ========== MÉTODO PRINCIPAL ==========

  /**
   * Añade un punto a la ruta si cumple los criterios de distancia, ángulo y tiempo.
   * @param {number} x - Coordenada X.
   * @param {number} y - Coordenada Y.
   * @param {number} z - Coordenada Z.
   * @param {number} speed - Velocidad actual (se usa para ajustar la distancia mínima).
   * @returns {boolean} true si el punto fue aceptado y añadido.
   */
  addPoint(x, y, z, speed) {
    if (!this.enabled) return false;

    const now = Date.now();
    if (now - this._lastTimestamp < this.minTimeBetweenPoints) return false;

    if (this._count === 0) {
      this._writePointInternal(x, y, z);
      this._lastAccepted = { x, y, z };
      this._prevAccepted = null;
      this._lastTimestamp = now;
      this._dirty = true;
      return true;
    }

    const dx = x - this._lastAccepted.x;
    const dy = y - this._lastAccepted.y;
    const dz = z - this._lastAccepted.z;
    const dist = Math.hypot(dx, dy, dz);

    const minDist = this.baseDist + this.speedFactor * speed;
    let accept = false;

    if (dist >= minDist) {
      accept = true;
    } else {
      if (this._prevAccepted && this.angleThreshold < 1) {
        const pdx = this._lastAccepted.x - this._prevAccepted.x;
        const pdy = this._lastAccepted.y - this._prevAccepted.y;
        const pdz = this._lastAccepted.z - this._prevAccepted.z;
        const prevLen = Math.hypot(pdx, pdy, pdz);
        if (prevLen > 0.01 && dist > 0.01) {
          const dot = (pdx * dx + pdy * dy + pdz * dz) / (prevLen * dist);
          if (dot < this.angleThreshold) {
            accept = true;
          }
        }
      }
    }

    if (accept) {
      this._writePointInternal(x, y, z);
      this._prevAccepted = this._lastAccepted;
      this._lastAccepted = { x, y, z };
      this._lastTimestamp = now;
      this._dirty = true;
      return true;
    }

    return false;
  }

  // ========== OBTENER PUNTOS PARA RENDERIZAR ==========

  /**
   * Devuelve los puntos listos para renderizar, aplicando simplificación si está activada.
   * @returns {Float32Array|null} Array plano [x,y,z, x,y,z, ...] o null si no hay puntos.
   */
  getRenderPoints() {
    if (!this.visible || this._count < 2) return null;

    if (this.simplifyEnabled && this._dirty) {
      this._simplifiedCache = this._computeSimplified();
      this._cachedCount = this._simplifiedCache ? this._simplifiedCache.length / 3 : 0;
      this._dirty = false;
    }

    if (this.simplifyEnabled && this._simplifiedCache) {
      return this._simplifiedCache;
    }

    return this._getOrderedPoints();
  }

  /**
   * @returns {Float32Array|null} Puntos en orden desde el más antiguo al más nuevo.
   * @private
   */
  _getOrderedPoints() {
    if (this._count === 0) return null;
    const result = new Float32Array(this._count * 3);
    let write = 0;
    for (let i = 0; i < this._count; i++) {
      const idx = ((this._tail + i) % this.maxPoints) * 3;
      result[write++] = this._data[idx];
      result[write++] = this._data[idx + 1];
      result[write++] = this._data[idx + 2];
    }
    return result;
  }

  // ===== SIMPLIFICACIÓN DOUGLAS-PEUCKER (CORREGIDA) =====

  /**
   * Aplica el algoritmo Douglas-Peucker a toda la ruta.
   * @returns {Float32Array} Array con los puntos simplificados.
   * @private
   */
  _computeSimplified() {
    const full = this._getOrderedPoints();
    if (!full || full.length < 6) return full;

    let data = full;
    let count = full.length / 3;

    if (this.simplifyTolerance <= 0 || count <= 2) {
      return data;
    }

    return this._simplifyDP(data, count, this.simplifyTolerance);
  }

  /**
   * Implementación recursiva iterativa de Douglas-Peucker.
   * @param {Float32Array} data - Puntos [x,y,z, ...].
   * @param {number} count - Número de puntos.
   * @param {number} tolerance - Tolerancia de simplificación.
   * @returns {Float32Array} Puntos simplificados.
   * @private
   */
  _simplifyDP(data, count, tolerance) {
    const stack = [];
    const keep = new Uint8Array(count);
    keep[0] = 1;
    keep[count - 1] = 1;

    stack.push(0, count - 1);

    while (stack.length > 0) {
      const end = stack.pop();
      const start = stack.pop();
      if (end - start <= 1) continue;

      let maxDist = 0;
      let maxIdx = start;
      const sx = data[start * 3];
      const sy = data[start * 3 + 1];
      const sz = data[start * 3 + 2];
      const ex = data[end * 3];
      const ey = data[end * 3 + 1];
      const ez = data[end * 3 + 2];
      const dx = ex - sx;
      const dy = ey - sy;
      const dz = ez - sz;
      const lenSq = dx * dx + dy * dy + dz * dz;

      for (let i = start + 1; i < end; i++) {
        const px = data[i * 3];
        const py = data[i * 3 + 1];
        const pz = data[i * 3 + 2];
        let dist;
        if (lenSq === 0) {
          dist = Math.hypot(px - sx, py - sy, pz - sz);
        } else {
          const qx = px - sx;
          const qy = py - sy;
          const qz = pz - sz;
          const crossX = dy * qz - dz * qy;
          const crossY = dz * qx - dx * qz;
          const crossZ = dx * qy - dy * qx;
          const crossLenSq = crossX * crossX + crossY * crossY + crossZ * crossZ;
          dist = Math.sqrt(crossLenSq / lenSq);
        }
        if (dist > maxDist) {
          maxDist = dist;
          maxIdx = i;
        }
      }

      if (maxDist > tolerance) {
        keep[maxIdx] = 1;
        stack.push(start, maxIdx);
        stack.push(maxIdx, end);
      }
    }

    const newCount = keep.reduce((a, b) => a + b, 0);
    const result = new Float32Array(newCount * 3);
    let write = 0;
    for (let i = 0; i < count; i++) {
      if (keep[i]) {
        const idx = i * 3;
        result[write++] = data[idx];
        result[write++] = data[idx + 1];
        result[write++] = data[idx + 2];
      }
    }
    return result;
  }

  // ========== LIMPIEZA Y ESTADÍSTICAS ==========

  /** Elimina todos los puntos de la ruta. */
  clear() {
    this._data.fill(0);
    this._count = 0;
    this._head = 0;
    this._tail = 0;
    this.totalDistance = 0;
    this._lastAccepted = null;
    this._prevAccepted = null;
    this._dirty = true;
    this._simplifiedCache = null;
    this._cachedCount = 0;
    this._lastTimestamp = 0;
  }

  /**
   * Obtiene estadísticas de la ruta.
   * @returns {{totalDistance: number, points: number, maxPoints: number, persistent: boolean}}
   */
  getStats() {
    return {
      totalDistance: this.totalDistance,
      points: this._count,
      maxPoints: this.maxPoints,
      persistent: this.persistent
    };
  }

  // ========== PERSISTENCIA ==========

  /**
   * Serializa el estado de la ruta para persistencia.
   * @returns {Object} Objeto con todos los datos necesarios para restaurar la ruta.
   */
  getData() {
    const ordered = this._getOrderedPoints();
    const arr = ordered ? Array.from(ordered) : [];
    return {
      points: arr,
      totalDistance: this.totalDistance,
      maxPoints: this.maxPoints,
      persistent: this.persistent,
      baseDist: this.baseDist,
      speedFactor: this.speedFactor,
      angleThreshold: this.angleThreshold,
      minTimeBetweenPoints: this.minTimeBetweenPoints,
      lodMaxSubdivs: this.lodMaxSubdivs,
      lodMinSubdivs: this.lodMinSubdivs,
      lodMaxDist: this.lodMaxDist,
      simplifyEnabled: this.simplifyEnabled,
      simplifyTolerance: this.simplifyTolerance,
      simplifyWindow: this.simplifyWindow,
      visible: this.visible,
      enabled: this.enabled
    };
  }

  /**
   * Restaura la ruta desde un objeto de datos (cargado de localStorage).
   * @param {Object} data - Datos previamente serializados con getData().
   */
  restoreData(data) {
    if (data.points && Array.isArray(data.points)) {
      const arr = data.points;
      const count = arr.length / 3;
      if (count > 0) {
        this.maxPoints = data.maxPoints || this.maxPoints;
        this._data = new Float32Array(this.maxPoints * 3);
        this._count = 0;
        this._head = 0;
        this._tail = 0;
        this.totalDistance = 0;
        for (let i = 0; i < count; i++) {
          const idx = i * 3;
          this._writePointInternal(arr[idx], arr[idx + 1], arr[idx + 2]);
        }
        this._recalcTotalDistance();
      } else {
        this.clear();
      }
    } else {
      this.clear();
    }

    if (data.baseDist !== undefined) this.baseDist = data.baseDist;
    if (data.speedFactor !== undefined) this.speedFactor = data.speedFactor;
    if (data.angleThreshold !== undefined) this.angleThreshold = data.angleThreshold;
    if (data.minTimeBetweenPoints !== undefined) this.minTimeBetweenPoints = data.minTimeBetweenPoints;
    if (data.lodMaxSubdivs !== undefined) this.lodMaxSubdivs = data.lodMaxSubdivs;
    if (data.lodMinSubdivs !== undefined) this.lodMinSubdivs = data.lodMinSubdivs;
    if (data.lodMaxDist !== undefined) this.lodMaxDist = data.lodMaxDist;
    if (data.simplifyEnabled !== undefined) this.simplifyEnabled = data.simplifyEnabled;
    if (data.simplifyTolerance !== undefined) this.simplifyTolerance = data.simplifyTolerance;
    if (data.simplifyWindow !== undefined) this.simplifyWindow = data.simplifyWindow;
    if (data.visible !== undefined) this.visible = data.visible;
    if (data.enabled !== undefined) this.enabled = data.enabled;
    if (data.persistent !== undefined) this.persistent = data.persistent;

    this._dirty = true;
    this._simplifiedCache = null;
    this._cachedCount = 0;
    this._lastAccepted = null;
    this._prevAccepted = null;
    if (this._count > 0) {
      const lastIdx = ((this._head - 1 + this.maxPoints) % this.maxPoints) * 3;
      this._lastAccepted = {
        x: this._data[lastIdx],
        y: this._data[lastIdx + 1],
        z: this._data[lastIdx + 2]
      };
      if (this._count >= 2) {
        const prevIdx = ((this._head - 2 + this.maxPoints) % this.maxPoints) * 3;
        this._prevAccepted = {
          x: this._data[prevIdx],
          y: this._data[prevIdx + 1],
          z: this._data[prevIdx + 2]
        };
      }
    }
    this._lastTimestamp = Date.now();
  }
}

export default new PathManager();