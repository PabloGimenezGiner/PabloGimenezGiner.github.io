import { ctx } from './canvas.js';
import { quatFromAxisAngle, quatMultiply, quatNormalize, rotateVectorByQuat } from './quaternion.js';
import {
  normAccMin, chunkSize, starsPerChunk, mouseWheelStep,
  normAccMax, turbAccMin, turbAccMax, normBaseDecel,
  inicAccFactor, inicTurboEnabled, inicX, inicY, inicZ,
  inicVX, inicVY, inicVZ, renderDistanceChunks,
  LOD_NEAR_DIST, LOD_MID_DIST,
  directionalSpeedFactor, directionalMinBright, directionalMaxBright,
  farStarBrightnessBoost, midStarBrightnessBoost, nearStarBrightnessBoost,
  FOV,
  STAR_SIZE_NEAR, STAR_SIZE_MID, STAR_SIZE_FAR, STAR_SIZE_FAR_MIN
} from './constants.js';
import { CelestBody } from './CelestBody.js';
import { drawHudSpeed } from './hud/hudSpeed.js';
import { drawHudCoords } from './hud/hudCoords.js';
import { drawHudReticle } from './hud/hudReticle.js';
import { drawHudGyro } from './hud/hudGyro.js';
import { drawHudInfo } from './hud/hudInfo.js';
import { camera, settings, chunks } from './variable.js';
import InputManager from './input/inputManager.js';

// ========== SEMILLA GLOBAL DETERMINISTA ==========
export let globalSeed = Math.floor(Math.random() * 1000000);

function seededRandom(seed) {
  let s = seed >>> 0;
  return function() {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}
// =================================================

// --- Control del HUD de información (F4) ---
window.showInfoHud = false;

// ========== FRUSTUM CULLING (F2) ==========
let frustumCullingEnabled = true;

// ========== INPUT MANAGER ==========
const inputManager = new InputManager(ctx.canvas);

// ========== ESTADÍSTICAS FPS ==========
let frameCount = 0;
let lastFpsUpdate = performance.now();
let currentFps = 60;

// ========== PARÁMETROS DE FÍSICA DE ROTACIÓN ==========
let angularVel = { yaw: 0, pitch: 0, roll: 0 };
const ROT_ACC = 4.0;
const ROT_DAMP = 0.96;
const ROT_BRAKE_FORCE = 8.0;
const MAX_ANGULAR_SPEED = 6.0;

// ========== MODOS DE CONDUCCIÓN ==========
let movementAutoBrake = false;      // frenado automático al soltar teclas (R)
let rotationAutoDamp = true;       // damping automático al soltar giros (U)

// ========== PERSISTENCIA ==========
const SAVE_KEY = 'spaceGameSave';
let saveInterval = null;

function saveGame() {
  const saveData = {
    // Cámara
    x: camera.x,
    y: camera.y,
    z: camera.z,
    vx: camera.vx,
    vy: camera.vy,
    vz: camera.vz,
    q: [...camera.q],        // copia del cuaternión
    // Settings
    turboEnabled: settings.turboEnabled,
    accFactor: settings.accFactor,
    // Modos
    movementAutoBrake: movementAutoBrake,
    rotationAutoDamp: rotationAutoDamp,
    frustumCullingEnabled: frustumCullingEnabled,
    showInfoHud: window.showInfoHud,
    // Semilla
    globalSeed: globalSeed
  };
  localStorage.setItem(SAVE_KEY, JSON.stringify(saveData));
  console.log("Juego guardado automáticamente");
}

function loadGame() {
  const raw = localStorage.getItem(SAVE_KEY);
  if (!raw) {
    console.log("No hay partida guardada. Iniciando nueva.");
    return false;
  }
  try {
    const data = JSON.parse(raw);
    // Restaurar cámara
    camera.x = data.x ?? inicX;
    camera.y = data.y ?? inicY;
    camera.z = data.z ?? inicZ;
    camera.vx = data.vx ?? inicVX;
    camera.vy = data.vy ?? inicVY;
    camera.vz = data.vz ?? inicVZ;
    if (data.q && Array.isArray(data.q) && data.q.length === 4) {
      camera.q = data.q;
    } else {
      camera.q = [0,0,0,1];
    }
    // Restaurar settings
    settings.turboEnabled = data.turboEnabled ?? inicTurboEnabled;
    settings.accFactor = data.accFactor ?? inicAccFactor;
    // Restaurar modos
    movementAutoBrake = data.movementAutoBrake ?? false;
    rotationAutoDamp = data.rotationAutoDamp ?? true;
    frustumCullingEnabled = data.frustumCullingEnabled ?? true;
    window.showInfoHud = data.showInfoHud ?? false;
    // Restaurar semilla
    globalSeed = data.globalSeed ?? Math.floor(Math.random() * 1000000);
    
    console.log("Partida cargada correctamente");
    return true;
  } catch (e) {
    console.error("Error al cargar la partida:", e);
    return false;
  }
}

function startAutoSave() {
  if (saveInterval) clearInterval(saveInterval);
  saveInterval = setInterval(() => saveGame(), 5000); // cada 5 segundos
}

window.addEventListener('beforeunload', () => {
  saveGame();
});

// =================================================

// ========== FUNCIONES DE CÁMARA ==========
function updateCamera(dt) {
  const acc = settings.accFactor;
  const maxSpd = settings.turboEnabled ? 2048 : 512;
  const decel = normBaseDecel * (settings.turboEnabled ? 8 : 1);

  // ---- 1. Rotación desde el ratón (yaw/pitch) ----
  const rot = inputManager.getRotationDelta();
  if (rot.yaw !== 0 || rot.pitch !== 0) {
    const up = rotateVectorByQuat([0, 1, 0], camera.q);
    const right = rotateVectorByQuat([1, 0, 0], camera.q);
    const yawQ = quatFromAxisAngle(up, rot.yaw);
    const pitchQ = quatFromAxisAngle(right, rot.pitch);
    camera.q = quatNormalize(quatMultiply(pitchQ, quatMultiply(yawQ, camera.q)));
  }

  // ---- 2. Rotaciones desde el teclado CON INERCIA Y ACELERACIÓN ----
  const yawInput = inputManager.getYawDirection();
  const pitchInput = inputManager.getPitchDirection();
  const rollInput = inputManager.getRollDirection();
  const rotBraking = inputManager.isRotBraking();

  // Aceleración / frenado rotacional
  if (!rotBraking) {
    angularVel.yaw += yawInput * ROT_ACC * dt;
    angularVel.pitch += pitchInput * ROT_ACC * dt;
    angularVel.roll += rollInput * ROT_ACC * dt;
  } else {
    const brake = ROT_BRAKE_FORCE * dt;
    if (angularVel.yaw > 0) angularVel.yaw = Math.max(0, angularVel.yaw - brake);
    else if (angularVel.yaw < 0) angularVel.yaw = Math.min(0, angularVel.yaw + brake);
    if (angularVel.pitch > 0) angularVel.pitch = Math.max(0, angularVel.pitch - brake);
    else if (angularVel.pitch < 0) angularVel.pitch = Math.min(0, angularVel.pitch + brake);
    if (angularVel.roll > 0) angularVel.roll = Math.max(0, angularVel.roll - brake);
    else if (angularVel.roll < 0) angularVel.roll = Math.min(0, angularVel.roll + brake);
  }

  // Damping automático (solo si activado y no se está frenando)
  if (!rotBraking) {
    if (rotationAutoDamp) {
      if (yawInput === 0) angularVel.yaw *= ROT_DAMP;
      if (pitchInput === 0) angularVel.pitch *= ROT_DAMP;
      if (rollInput === 0) angularVel.roll *= ROT_DAMP;
    }
  }

  // Limitar velocidades máximas
  angularVel.yaw = Math.min(MAX_ANGULAR_SPEED, Math.max(-MAX_ANGULAR_SPEED, angularVel.yaw));
  angularVel.pitch = Math.min(MAX_ANGULAR_SPEED, Math.max(-MAX_ANGULAR_SPEED, angularVel.pitch));
  angularVel.roll = Math.min(MAX_ANGULAR_SPEED, Math.max(-MAX_ANGULAR_SPEED, angularVel.roll));

  // Aplicar rotaciones
  if (angularVel.yaw !== 0) {
    const yawAngle = angularVel.yaw * dt;
    const up = rotateVectorByQuat([0, 1, 0], camera.q);
    const yawQ = quatFromAxisAngle(up, yawAngle);
    camera.q = quatNormalize(quatMultiply(yawQ, camera.q));
  }
  if (angularVel.pitch !== 0) {
    const pitchAngle = angularVel.pitch * dt;
    const right = rotateVectorByQuat([1, 0, 0], camera.q);
    const pitchQ = quatFromAxisAngle(right, pitchAngle);
    camera.q = quatNormalize(quatMultiply(pitchQ, camera.q));
  }
  if (angularVel.roll !== 0) {
    const rollAngle = angularVel.roll * dt;
    const forward = rotateVectorByQuat([0, 0, -1], camera.q);
    const rollQ = quatFromAxisAngle(forward, rollAngle);
    camera.q = quatNormalize(quatMultiply(rollQ, camera.q));
  }

  // ---- 3. Movimiento (aceleración) ----
  const move = inputManager.getMoveDirection();
  if (move.x !== 0 || move.y !== 0 || move.z !== 0) {
    const worldAcc = rotateVectorByQuat([move.x, move.y, move.z], camera.q).map(v => v * acc * dt);
    camera.vx += worldAcc[0];
    camera.vy += worldAcc[1];
    camera.vz += worldAcc[2];
  }

  // Frenado automático (si activado, sin input y sin frenado manual)
  if (movementAutoBrake && move.x === 0 && move.y === 0 && move.z === 0 && !inputManager.isBraking()) {
    const autoDecel = normBaseDecel * (settings.turboEnabled ? 8 : 1);
    const sp = Math.hypot(camera.vx, camera.vy, camera.vz);
    if (sp > 0) {
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
  }

  // Límite de velocidad máxima
  const sp = Math.hypot(camera.vx, camera.vy, camera.vz);
  if (sp > maxSpd) {
    const s = maxSpd / sp;
    camera.vx *= s; camera.vy *= s; camera.vz *= s;
  }

  // ---- 4. Frenado manual (X) ----
  if (inputManager.isBraking()) {
    const sv = [camera.vx, camera.vy, camera.vz];
    const sp = Math.hypot(...sv);
    if (sp > 0) {
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
  }

  // ---- 5. Actualizar posición ----
  camera.x += camera.vx * dt;
  camera.y += camera.vy * dt;
  camera.z += camera.vz * dt;
  camera.speed = Math.hypot(camera.vx, camera.vy, camera.vz);
}

// ========== PROYECCIÓN 3D ==========
function project3D(x, y, z) {
  let dx = x - camera.x, dy = y - camera.y, dz = z - camera.z;
  const invQ = [-camera.q[0], -camera.q[1], -camera.q[2], camera.q[3]];
  [dx, dy, dz] = rotateVectorByQuat([dx, dy, dz], invQ);
  const scale = FOV / (dz || 0.0001);
  return {
    x: ctx.canvas.width / 2 + dx * scale,
    y: ctx.canvas.height / 2 - dy * scale,
    visible: dz > 1,
    scale: scale
  };
}

// ========== CHUNKS ==========
function chunkKey(cx, cy, cz) { return `${cx},${cy},${cz}`; }

function generateChunk(cx, cy, cz) {
  const stars = [];
  let chunkSeed = (globalSeed * 31 + cx) * 31 + cy;
  chunkSeed = (chunkSeed * 31 + cz) & 0x7fffffff;
  const rng = seededRandom(chunkSeed);
  for (let i = 0; i < starsPerChunk; i++) {
    stars.push({
      x: cx * chunkSize + rng() * chunkSize,
      y: cy * chunkSize + rng() * chunkSize,
      z: cz * chunkSize + rng() * chunkSize
    });
  }
  chunks[chunkKey(cx, cy, cz)] = stars;
}

function unloadDistantChunks(cx, cy, cz) {
  const limit = renderDistanceChunks;
  const limitSq = limit * limit;
  for (const key in chunks) {
    const [x, y, z] = key.split(",").map(Number);
    const dx = x - cx, dy = y - cy, dz = z - cz;
    if (dx * dx + dy * dy + dz * dz > limitSq) delete chunks[key];
  }
}

function updateChunks() {
  const cx = Math.floor(camera.x / chunkSize);
  const cy = Math.floor(camera.y / chunkSize);
  const cz = Math.floor(camera.z / chunkSize);
  const limit = renderDistanceChunks;
  const limitSq = limit * limit;

  for (let dx = -limit; dx <= limit; dx++) {
    for (let dy = -limit; dy <= limit; dy++) {
      for (let dz = -limit; dz <= limit; dz++) {
        if (dx * dx + dy * dy + dz * dz > limitSq) continue;
        const key = chunkKey(cx + dx, cy + dy, cz + dz);
        if (!chunks[key]) generateChunk(cx + dx, cy + dy, cz + dz);
      }
    }
  }
  unloadDistantChunks(cx, cy, cz);
}

// ========== BUCLE PRINCIPAL ==========
let last = performance.now();

function loop(now) {
  const dt = Math.min(0.033, (now - last) / 1000);
  last = now;

  // Procesar comandos de InputManager (toggles, potencia)
  if (inputManager.consumeTurboToggle()) {
    settings.turboEnabled = !settings.turboEnabled;
    if (settings.turboEnabled) {
      settings.accFactor = Math.min(turbAccMax, settings.accFactor * 8);
    } else {
      settings.accFactor = Math.max(normAccMin, settings.accFactor / 8);
    }
  }

  // Potencia manual con rueda del ratón y teclas F / V
  const powerDelta = inputManager.consumePowerDelta();
  if (powerDelta !== 0) {
    const step = mouseWheelStep * (settings.turboEnabled ? 8 : 1);
    settings.accFactor += powerDelta * step;
    const min = settings.turboEnabled ? turbAccMin : normAccMin;
    const max = settings.turboEnabled ? turbAccMax : normAccMax;
    settings.accFactor = Math.max(min, Math.min(max, settings.accFactor));
  }

  if (inputManager.consumeFrustumToggle()) {
    frustumCullingEnabled = !frustumCullingEnabled;
    console.log("Frustum culling:", frustumCullingEnabled ? "ON" : "OFF");
  }

  if (inputManager.consumeInfoHudToggle()) {
    window.showInfoHud = !window.showInfoHud;
  }

  // ========== Toggles de modo (R y U) ==========
  if (inputManager.consumeMovementAutoBrakeToggle()) {
    movementAutoBrake = !movementAutoBrake;
    console.log("Modo movimiento - frenado automático:", movementAutoBrake ? "ON" : "OFF");
  }
  if (inputManager.consumeRotationAutoDampToggle()) {
    rotationAutoDamp = !rotationAutoDamp;
    console.log("Modo rotación - damping automático:", rotationAutoDamp ? "ON" : "OFF");
  }

  updateCamera(dt);
  updateChunks();

  // FPS
  frameCount++;
  const nowSec = performance.now();
  if (nowSec - lastFpsUpdate >= 1000) {
    currentFps = frameCount * 1000 / (nowSec - lastFpsUpdate);
    frameCount = 0;
    lastFpsUpdate = nowSec;
  }

  // Render
  ctx.fillStyle = 'black';
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

  const maxFadeDist = renderDistanceChunks * chunkSize;
  let renderedStars = 0;
  let chunkCount = 0;

  const velX = camera.vx, velY = camera.vy, velZ = camera.vz;
  const speedTotal = Math.hypot(velX, velY, velZ);
  const invQ = [-camera.q[0], -camera.q[1], -camera.q[2], camera.q[3]];

  for (const key in chunks) {
    chunkCount++;
    const stars = chunks[key];
    for (const s of stars) {
      const dx = s.x - camera.x;
      const dy = s.y - camera.y;
      const dz = s.z - camera.z;
      const dist = Math.hypot(dx, dy, dz);

      let distanceFade = 1;
      if (dist >= LOD_MID_DIST) {
        const t = Math.min(1, dist / maxFadeDist);
        distanceFade = 1 - t * t;
        if (distanceFade <= 0) continue;
      }

      const [rx, ry, rz] = rotateVectorByQuat([dx, dy, dz], invQ);
      if (rz <= 1) continue;

      if (frustumCullingEnabled) {
        const halfW = ctx.canvas.width / 2;
        const halfH = ctx.canvas.height / 2;
        const limitX = halfW * rz / FOV;
        const limitY = halfH * rz / FOV;
        if (Math.abs(rx) > limitX || Math.abs(ry) > limitY) continue;
      }

      const scale = FOV / rz;
      const px = ctx.canvas.width / 2 + rx * scale;
      const py = ctx.canvas.height / 2 - ry * scale;

      let baseBrightness = Math.min(1, scale * 2.0 + 0.15);
      let directionalFactor = 1.0;
      if (speedTotal > 0.01) {
        const invDist = 1 / dist;
        const dirX = dx * invDist;
        const dirY = dy * invDist;
        const dirZ = dz * invDist;
        const dot = (velX * dirX + velY * dirY + velZ * dirZ) / speedTotal;
        let raw = 1 + directionalSpeedFactor * dot;
        directionalFactor = Math.min(directionalMaxBright, Math.max(directionalMinBright, raw));
      }

      let brightness = baseBrightness * distanceFade * directionalFactor;
      if (dist < LOD_NEAR_DIST) brightness *= nearStarBrightnessBoost;
      else if (dist < LOD_MID_DIST) brightness *= midStarBrightnessBoost;
      if (dist >= LOD_MID_DIST) brightness *= farStarBrightnessBoost;

      brightness = Math.min(1, Math.max(0, brightness));
      if (brightness <= 0.02) continue;

      let fillColor;
      if (window.showInfoHud) {
        if (dist < LOD_NEAR_DIST) fillColor = `rgba(255, 255, 0, ${brightness})`;
        else if (dist < LOD_MID_DIST) fillColor = `rgba(0, 255, 0, ${brightness})`;
        else fillColor = `rgba(255, 255, 255, ${brightness})`;
      } else {
        fillColor = `rgba(255, 255, 255, ${brightness})`;
      }

      if (dist < LOD_NEAR_DIST) {
        ctx.beginPath();
        ctx.arc(px, py, scale * STAR_SIZE_NEAR, 0, Math.PI * 2);
        ctx.fillStyle = fillColor;
        ctx.fill();
      } else if (dist < LOD_MID_DIST) {
        const size = scale * STAR_SIZE_MID;
        ctx.fillStyle = fillColor;
        ctx.fillRect(px - size/2, py - size/2, size, size);
      } else {
        const size = Math.max(STAR_SIZE_FAR_MIN, scale * STAR_SIZE_FAR);
        ctx.fillStyle = fillColor;
        ctx.fillRect(px - size/2, py - size/2, size, size);
      }
      renderedStars++;
    }
  }

  // Cuerpos celestes
  for (const cb of CelestBody) {
    const p = project3D(cb.x, cb.y, cb.z);
    if (!p.visible) continue;
    ctx.beginPath();
    ctx.arc(p.x, p.y, cb.r * p.scale, 0, Math.PI * 2);
    ctx.fillStyle = cb.color;
    ctx.fill();
    const dist = Math.hypot(cb.x - camera.x, cb.y - camera.y, cb.z - camera.z);
    if (dist < cb.r * 2) {
      ctx.fillStyle = 'white';
      ctx.font = '20px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(cb.name, ctx.canvas.width / 2, ctx.canvas.height * 0.2);
    }
  }

  // HUDs
  drawHudReticle(ctx);
  drawHudCoords(ctx, camera);
  drawHudSpeed(ctx, camera, inputManager.isBraking(), settings.accFactor, settings.turboEnabled);
  drawHudGyro(ctx, camera);

  if (window.showInfoHud) {
    drawHudInfo(ctx, currentFps, renderedStars, chunkCount, renderDistanceChunks, starsPerChunk, globalSeed);
  }

  requestAnimationFrame(loop);
}

// ========== INICIALIZACIÓN CON PERSISTENCIA ==========
// Cargar partida guardada ANTES de generar chunks
const loaded = loadGame();

// Si no se cargó una partida, aseguramos valores por defecto
if (!loaded) {
  // Los valores ya están inicializados, pero forzamos consistencia
  camera.x = inicX; camera.y = inicY; camera.z = inicZ;
  camera.vx = inicVX; camera.vy = inicVY; camera.vz = inicVZ;
  camera.q = [0,0,0,1];
  settings.turboEnabled = inicTurboEnabled;
  settings.accFactor = inicAccFactor;
  movementAutoBrake = false;
  rotationAutoDamp = true;
  frustumCullingEnabled = true;
  window.showInfoHud = false;
  // globalSeed ya tiene valor aleatorio
}

// Inicializar chunks después de cargar la cámara
const startX = Math.floor(camera.x / chunkSize);
const startY = Math.floor(camera.y / chunkSize);
const startZ = Math.floor(camera.z / chunkSize);
const limit = renderDistanceChunks;
const limitSq = limit * limit;
for (let dx = -limit; dx <= limit; dx++) {
  for (let dy = -limit; dy <= limit; dy++) {
    for (let dz = -limit; dz <= limit; dz++) {
      if (dx * dx + dy * dy + dz * dz <= limitSq) {
        generateChunk(startX + dx, startY + dy, startZ + dz);
      }
    }
  }
}

// Iniciar guardado automático
startAutoSave();

requestAnimationFrame(loop);