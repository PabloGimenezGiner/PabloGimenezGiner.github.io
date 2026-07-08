// render/path/pathManager.js
import { BQS } from './BQS.js';

class PathManager {
  constructor() {
    // Almacenamiento plano: [x0, y0, z0, x1, y1, z1, ...]
    this._data = new Float32Array(0);
    this._count = 0;
    this.totalDistance = 0;
    this._lastX = 0;
    this._lastY = 0;
    this._lastZ = 0;
    this._hasLast = false;
    
    this.enabled = true;
    this.visible = true;
    this.persistent = false;
    this.maxPoints = 200;
    this.minDistance = 10;
    this.angleThreshold = 0.15;
    this.speedFactor = 0.5;
    this.simplifyTolerance = 1.0;

    this.bqsEpsilonBase = 8;
    this.bqsSpeedFactor = 0.4;
    this.minTimeBetweenPoints = 83;
    this.forceOnAngleChange = true;

    this._simplifiedCache = null; // Float32Array o null
    this._dirty = true;
    this.ABSOLUTE_MAX = 200000;

    this.bqs = new BQS(this.bqsEpsilonBase, this.bqsSpeedFactor);
    this._lastTimestamp = 0;
    this._cosAngleThreshold = Math.cos(this.angleThreshold);
  }

  // ========== GETTERS ==========
  get points() {
    // Para compatibilidad con código antiguo (si se usa)
    const result = [];
    for (let i = 0; i < this._count; i++) {
      const idx = i * 3;
      result.push({ x: this._data[idx], y: this._data[idx+1], z: this._data[idx+2] });
    }
    return result;
  }

  get count() { return this._count; }

  // ========== SETTERS ==========
  setEnabled(v) { this.enabled = v; this._dirty = true; }
  setVisible(v) { this.visible = v; }
  setPersistent(v) { this.persistent = v; this._dirty = true; }
  setMaxPoints(v) { this.maxPoints = Math.max(10, v); this._dirty = true; }
  setMinDistance(v) { this.minDistance = Math.max(0.5, v); }
  setAngleThreshold(v) {
    this.angleThreshold = Math.max(0.01, v);
    this._cosAngleThreshold = Math.cos(this.angleThreshold);
  }
  setSpeedFactor(v) { this.speedFactor = Math.max(0, Math.min(1, v)); }
  setSimplifyTolerance(v) { this.simplifyTolerance = Math.max(0, v); this._dirty = true; }
  setBqsEpsilonBase(v) { this.bqsEpsilonBase = Math.max(0.1, v); this.bqs.setEpsilonBase(this.bqsEpsilonBase); }
  setBqsSpeedFactor(v) { this.bqsSpeedFactor = Math.max(0, Math.min(1, v)); this.bqs.setSpeedFactor(this.bqsSpeedFactor); }
  setMinTimeBetweenPoints(v) { this.minTimeBetweenPoints = Math.max(10, v); }
  setForceOnAngleChange(v) { this.forceOnAngleChange = v; }

  // ========== MÉTODO PRINCIPAL ==========
  addPoint(x, y, z, speed) {
    if (!this.enabled) return false;

    const now = Date.now();
    const timeSinceLast = now - this._lastTimestamp;
    let shouldAdd = false;

    if (this._count === 0) {
      shouldAdd = true;
    } else {
      const lastIdx = (this._count - 1) * 3;
      const lx = this._data[lastIdx];
      const ly = this._data[lastIdx+1];
      const lz = this._data[lastIdx+2];
      const dx = x - lx;
      const dy = y - ly;
      const dz = z - lz;
      const currLen = Math.hypot(dx, dy, dz);
      let angleChanged = false;

      if (this._count >= 2 && currLen > 0.01) {
        const prevIdx = (this._count - 2) * 3;
        const px = this._data[prevIdx];
        const py = this._data[prevIdx+1];
        const pz = this._data[prevIdx+2];
        const pdx = lx - px;
        const pdy = ly - py;
        const pdz = lz - pz;
        const prevLen = Math.hypot(pdx, pdy, pdz);
        if (prevLen > 0.01) {
          const dot = (pdx*dx + pdy*dy + pdz*dz) / (prevLen * currLen);
          const speedFactor = 1 - (speed / 1000) * this.speedFactor;
          const adaptiveFactor = Math.max(0.2, Math.min(1, speedFactor));
          const cosThreshold = 1 - (1 - this._cosAngleThreshold) * adaptiveFactor;
          if (dot < cosThreshold) {
            angleChanged = true;
          }
        }
      }

      if (this.forceOnAngleChange && angleChanged) {
        shouldAdd = true;
      } else {
        if (timeSinceLast >= this.minTimeBetweenPoints) {
          if (this.bqs.accept(x, y, z, speed)) {
            shouldAdd = true;
          }
        }
      }
    }

    if (shouldAdd) {
      this._addPointInternal(x, y, z);
      if (this._count > 1) {
        const prevIdx = (this._count - 2) * 3;
        const px = this._data[prevIdx];
        const py = this._data[prevIdx+1];
        const pz = this._data[prevIdx+2];
        const d = Math.hypot(x - px, y - py, z - pz);
        this.totalDistance += d;
      }
      this._dirty = true;
      this._lastTimestamp = now;

      if (this._count > this.ABSOLUTE_MAX) {
        this._trim(this.ABSOLUTE_MAX);
        this.bqs.reset();
        console.warn('Path trimmed to absolute limit');
      }
      return true;
    }
    return false;
  }

  _addPointInternal(x, y, z) {
    const newLen = (this._count + 1) * 3;
    const newData = new Float32Array(newLen);
    newData.set(this._data);
    newData[this._count * 3] = x;
    newData[this._count * 3 + 1] = y;
    newData[this._count * 3 + 2] = z;
    this._data = newData;
    this._count++;
    this._hasLast = true;
    this._lastX = x;
    this._lastY = y;
    this._lastZ = z;
  }

  _trim(maxCount) {
    if (this._count <= maxCount) return;
    const startIdx = (this._count - maxCount) * 3;
    const newLen = maxCount * 3;
    const newData = new Float32Array(newLen);
    for (let i = 0; i < newLen; i++) {
      newData[i] = this._data[startIdx + i];
    }
    this._data = newData;
    this._count = maxCount;
    this._recalcTotalDistance();
  }

  _recalcTotalDistance() {
    let sum = 0;
    for (let i = 1; i < this._count; i++) {
      const idxA = (i-1)*3;
      const idxB = i*3;
      const dx = this._data[idxB] - this._data[idxA];
      const dy = this._data[idxB+1] - this._data[idxA+1];
      const dz = this._data[idxB+2] - this._data[idxA+2];
      sum += Math.hypot(dx, dy, dz);
    }
    this.totalDistance = sum;
  }

  // ========== OBTENER PUNTOS PARA RENDERIZAR ==========
  getRenderPoints() {
    if (!this.visible || this._count < 2) return [];

    // ── MODO PERSISTENTE: límite a 5x maxPoints ──
    if (this.persistent) {
      const maxPersistentPoints = this.maxPoints * 5;
      if (this._count > maxPersistentPoints) {
        // Submuestreo uniforme para reducir a maxPersistentPoints
        const step = Math.ceil(this._count / maxPersistentPoints);
        const newCount = Math.ceil(this._count / step);
        const result = new Float32Array(newCount * 3);
        let writeIdx = 0;
        for (let i = 0; i < this._count; i += step) {
          const srcIdx = i * 3;
          result[writeIdx++] = this._data[srcIdx];
          result[writeIdx++] = this._data[srcIdx+1];
          result[writeIdx++] = this._data[srcIdx+2];
        }
        return result;
      }
      // Si no excede, devolver todos
      return this._data;
    }

    // ── MODO NO PERSISTENTE ──
    let data = this._data;
    let count = this._count;
    if (this._count > this.maxPoints) {
      const startIdx = (this._count - this.maxPoints) * 3;
      const newLen = this.maxPoints * 3;
      const sliced = new Float32Array(newLen);
      for (let i = 0; i < newLen; i++) {
        sliced[i] = this._data[startIdx + i];
      }
      data = sliced;
      count = this.maxPoints;
    }

    // Simplificación opcional (Douglas-Peucker)
    if (this.simplifyTolerance > 0 && count > 10) {
      if (this._dirty || !this._simplifiedCache) {
        this._simplifiedCache = this._simplify(data, count, this.simplifyTolerance);
        this._dirty = false;
      }
      return this._simplifiedCache;
    }
    return data;
  }

  // ========== DOUGLAS-PEUCKER (sobre Float32Array) ==========
  _simplify(data, count, tolerance) {
    if (count <= 2) return data;
    const firstIdx = 0;
    const lastIdx = (count - 1) * 3;
    let maxDist = 0;
    let maxIndex = 0;
    for (let i = 1; i < count - 1; i++) {
      const idx = i * 3;
      const dist = this._perpDistanceFlat(data, idx, firstIdx, lastIdx);
      if (dist > maxDist) {
        maxDist = dist;
        maxIndex = i;
      }
    }
    if (maxDist > tolerance) {
      const left = this._simplify(data.slice(0, (maxIndex+1)*3), maxIndex+1, tolerance);
      const right = this._simplify(data.slice(maxIndex*3), count - maxIndex, tolerance);
      const combined = new Float32Array(left.length + right.length - 3);
      combined.set(left);
      combined.set(right.slice(3), left.length);
      return combined;
    } else {
      const result = new Float32Array(6);
      result[0] = data[0];
      result[1] = data[1];
      result[2] = data[2];
      result[3] = data[lastIdx];
      result[4] = data[lastIdx+1];
      result[5] = data[lastIdx+2];
      return result;
    }
  }

  _perpDistanceFlat(data, pointIdx, lineStartIdx, lineEndIdx) {
    const dx = data[lineEndIdx] - data[lineStartIdx];
    const dy = data[lineEndIdx+1] - data[lineStartIdx+1];
    const dz = data[lineEndIdx+2] - data[lineStartIdx+2];
    const lenSq = dx*dx + dy*dy + dz*dz;
    if (lenSq === 0) return 0;
    const t = ((data[pointIdx] - data[lineStartIdx])*dx +
               (data[pointIdx+1] - data[lineStartIdx+1])*dy +
               (data[pointIdx+2] - data[lineStartIdx+2])*dz) / lenSq;
    const projX = data[lineStartIdx] + t * dx;
    const projY = data[lineStartIdx+1] + t * dy;
    const projZ = data[lineStartIdx+2] + t * dz;
    return Math.hypot(data[pointIdx] - projX, data[pointIdx+1] - projY, data[pointIdx+2] - projZ);
  }

  // ========== LIMPIEZA Y ESTADÍSTICAS ==========
  clear() {
    this._data = new Float32Array(0);
    this._count = 0;
    this.totalDistance = 0;
    this._hasLast = false;
    this._dirty = true;
    this._simplifiedCache = null;
    this.bqs.reset();
    this._lastTimestamp = 0;
  }

  getStats() {
    return {
      totalDistance: this.totalDistance,
      points: this._count,
      maxPoints: this.maxPoints,
      persistent: this.persistent,
    };
  }

  // ========== PERSISTENCIA ==========
  getData() {
    const arr = Array.from(this._data);
    return {
      points: arr,
      totalDistance: this.totalDistance,
    };
  }

  restoreData(data) {
    if (data.points && Array.isArray(data.points)) {
      this._data = new Float32Array(data.points);
      this._count = this._data.length / 3;
    } else {
      this._data = new Float32Array(0);
      this._count = 0;
    }
    this.totalDistance = data.totalDistance || 0;
    this._hasLast = this._count > 0;
    if (this._hasLast) {
      const idx = (this._count - 1) * 3;
      this._lastX = this._data[idx];
      this._lastY = this._data[idx+1];
      this._lastZ = this._data[idx+2];
    }
    this._dirty = true;
    this._simplifiedCache = null;
    this.bqs.reset();
    this._lastTimestamp = Date.now();
  }
}

export default new PathManager();