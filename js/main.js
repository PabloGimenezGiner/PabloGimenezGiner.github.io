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
import { camera, keys, settings, chunks, mouseButtons } from './variable.js';

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

// --- Control del HUD de información y modo debug colores (F4) ---
window.showInfoHud = false;
document.addEventListener("keydown", (e) => {
  if (e.code === "F4") {
    e.preventDefault();
    window.showInfoHud = !window.showInfoHud;
  }
});

// ========== FRUSTUM CULLING (F2) ==========
let frustumCullingEnabled = true;  // Activado por defecto
document.addEventListener("keydown", (e) => {
  if (e.code === "F2") {
    e.preventDefault();
    frustumCullingEnabled = !frustumCullingEnabled;
    console.log("Frustum culling:", frustumCullingEnabled ? "ON" : "OFF");
  }
});
// ==========================================

let frameCount = 0;
let lastFpsUpdate = performance.now();
let currentFps = 60;

document.addEventListener("keydown", e => { keys[e.code] = true; });
document.addEventListener("keyup",   e => { keys[e.code] = false; });

ctx.canvas.addEventListener("click", () => ctx.canvas.requestPointerLock());

ctx.canvas.addEventListener("mousedown", e => {
  if (e.button === 1) {
    e.preventDefault();
    settings.turboEnabled = !settings.turboEnabled;
    if (settings.turboEnabled) {
      settings.accFactor = Math.min(turbAccMax, settings.accFactor * 8);
    } else {
      settings.accFactor = Math.max(normAccMin, settings.accFactor / 8);
    }
  }
});

ctx.canvas.addEventListener("wheel", e => {
  e.preventDefault();
  const delta = -Math.sign(e.deltaY);
  const step = settings.turboEnabled ? mouseWheelStep * 8 : mouseWheelStep;
  settings.accFactor += delta * step;
  const min = settings.turboEnabled ? turbAccMin : normAccMin;
  const max = settings.turboEnabled ? turbAccMax : normAccMax;
  settings.accFactor = Math.max(min, Math.min(max, settings.accFactor));
}, { passive: false });

ctx.canvas.addEventListener("contextmenu", (e) => e.preventDefault());

ctx.canvas.addEventListener("mousedown", (e) => {
  if (e.button === 0) mouseButtons.left = true;
  if (e.button === 2) mouseButtons.right = true;
});

ctx.canvas.addEventListener("mouseup", (e) => {
  if (e.button === 0) mouseButtons.left = false;
  if (e.button === 2) mouseButtons.right = false;
});

window.addEventListener("mouseup", (e) => {
  if (e.button === 0) mouseButtons.left = false;
  if (e.button === 2) mouseButtons.right = false;
});

document.addEventListener("pointerlockchange", () => {
  if (document.pointerLockElement === ctx.canvas)
    document.addEventListener("mousemove", mouseMove);
  else
    document.removeEventListener("mousemove", mouseMove);
});

function mouseMove(e) {
  const sens = 0.002;
  const up    = rotateVectorByQuat([0,1,0], camera.q);
  const right = rotateVectorByQuat([1,0,0], camera.q);
  const yawQ   = quatFromAxisAngle(up,    e.movementX * sens);
  const pitchQ = quatFromAxisAngle(right, e.movementY * sens);
  camera.q = quatNormalize(quatMultiply(pitchQ, quatMultiply(yawQ, camera.q)));
}

function updateCamera(dt) {
  const acc    = settings.accFactor;
  const maxSpd = settings.turboEnabled ? 2048 : 512;
  const decel  = normBaseDecel * (settings.turboEnabled ? 8 : 1);

  let move = [0,0,0];
  if (keys["KeyW"]) move[2] += 1;
  if (keys["KeyS"]) move[2] -= 1;
  if (keys["KeyA"]) move[0] -= 1;
  if (keys["KeyD"]) move[0] += 1;
  if (keys["KeyR"]) move[1] += 1;
  if (keys["KeyF"]) move[1] -= 1;

  if (mouseButtons.right) move[2] += 1;
  if (mouseButtons.left)  move[2] -= 1;

  const len = Math.hypot(...move);
  if (len > 0) move = move.map(m => m / len);

  const worldAcc = rotateVectorByQuat(move, camera.q).map(v => v * acc * dt);

  if (keys["ShiftLeft"]) {
    const sv = [camera.vx, camera.vy, camera.vz];
    const sp = Math.hypot(...sv);
    if (sp > 0) {
      const dv = sv.map(v => -v/sp * decel * dt);
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
  } else {
    camera.vx += worldAcc[0];
    camera.vy += worldAcc[1];
    camera.vz += worldAcc[2];
    const sp = Math.hypot(camera.vx, camera.vy, camera.vz);
    if (sp > maxSpd) {
      const s = maxSpd / sp;
      camera.vx *= s; camera.vy *= s; camera.vz *= s;
    }
  }

  const forward = rotateVectorByQuat([0,0,-1], camera.q);
  if (keys["KeyQ"]) {
    const rQ = quatFromAxisAngle(forward,  0.03);
    camera.q = quatNormalize(quatMultiply(rQ, camera.q));
  }
  if (keys["KeyE"]) {
    const rQ = quatFromAxisAngle(forward, -0.03);
    camera.q = quatNormalize(quatMultiply(rQ, camera.q));
  }

  camera.x += camera.vx * dt;
  camera.y += camera.vy * dt;
  camera.z += camera.vz * dt;
  camera.speed = Math.hypot(camera.vx, camera.vy, camera.vz);
}

function project3D(x,y,z) {
  let dx = x - camera.x, dy = y - camera.y, dz = z - camera.z;
  const invQ = [-camera.q[0],-camera.q[1],-camera.q[2],camera.q[3]];
  [dx,dy,dz] = rotateVectorByQuat([dx,dy,dz], invQ);
  const scale = FOV/(dz||0.0001);
  return {
    x: ctx.canvas.width/2 + dx*scale,
    y: ctx.canvas.height/2 - dy*scale,
    visible: dz > 1,
    scale: scale
  };
}

function chunkKey(cx,cy,cz) { return `${cx},${cy},${cz}`; }

function generateChunk(cx,cy,cz) {
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
  chunks[chunkKey(cx,cy,cz)] = stars;
}

function unloadDistantChunks(cx, cy, cz) {
  const limit = renderDistanceChunks;
  const limitSq = limit * limit;
  for (const key in chunks) {
    const [x,y,z] = key.split(",").map(Number);
    const dx = x - cx, dy = y - cy, dz = z - cz;
    if (dx*dx + dy*dy + dz*dz > limitSq) delete chunks[key];
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
        if (dx*dx + dy*dy + dz*dz > limitSq) continue;
        const key = chunkKey(cx+dx, cy+dy, cz+dz);
        if (!chunks[key]) generateChunk(cx+dx, cy+dy, cz+dz);
      }
    }
  }
  unloadDistantChunks(cx, cy, cz);
}

let last = performance.now();

function loop(now) {
  const dt = Math.min(0.033, (now - last) / 1000);
  last = now;
  updateCamera(dt);
  updateChunks();

  frameCount++;
  const nowSec = performance.now();
  if (nowSec - lastFpsUpdate >= 1000) {
    currentFps = frameCount * 1000 / (nowSec - lastFpsUpdate);
    frameCount = 0;
    lastFpsUpdate = nowSec;
  }

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

      // ========== FRUSTUM CULLING (F2) ==========
      if (frustumCullingEnabled) {
        const halfW = ctx.canvas.width / 2;
        const halfH = ctx.canvas.height / 2;
        const limitX = halfW * rz / FOV;
        const limitY = halfH * rz / FOV;
        if (Math.abs(rx) > limitX || Math.abs(ry) > limitY) {
          continue; // Fuera del campo de visión
        }
      }
      // =========================================

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

      if (dist < LOD_NEAR_DIST) {
        brightness *= nearStarBrightnessBoost;
      } else if (dist < LOD_MID_DIST) {
        brightness *= midStarBrightnessBoost;
      }
      if (dist >= LOD_MID_DIST) {
        brightness *= farStarBrightnessBoost;
      }

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

  drawHudReticle(ctx);
  drawHudCoords(ctx, camera);
  drawHudSpeed(ctx, camera, keys, settings.accFactor, settings.turboEnabled);
  drawHudGyro(ctx, camera);

  if (window.showInfoHud) {
    drawHudInfo(ctx, currentFps, renderedStars, chunkCount, renderDistanceChunks, starsPerChunk, globalSeed);
  }

  requestAnimationFrame(loop);
}

const startX = Math.floor(camera.x / chunkSize);
const startY = Math.floor(camera.y / chunkSize);
const startZ = Math.floor(camera.z / chunkSize);
const limit = renderDistanceChunks;
const limitSq = limit * limit;
for (let dx = -limit; dx <= limit; dx++) {
  for (let dy = -limit; dy <= limit; dy++) {
    for (let dz = -limit; dz <= limit; dz++) {
      if (dx*dx + dy*dy + dz*dz <= limitSq) {
        generateChunk(startX + dx, startY + dy, startZ + dz);
      }
    }
  }
}

requestAnimationFrame(loop);