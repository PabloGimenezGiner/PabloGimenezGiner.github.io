// world/chunkManager.js
import { gameState } from '../core/state.js';
import { CONFIG } from '../constants.js';

function chunkKey(cx, cy, cz) { return `${cx},${cy},${cz}`; }

export function generateChunk(cx, cy, cz) {
  const { world } = gameState;
  const { chunks, globalSeed } = world;
  const stars = [];
  let chunkSeed = (globalSeed * 31 + cx) * 31 + cy;
  chunkSeed = (chunkSeed * 31 + cz) & 0x7fffffff;
  const rng = seededRandom(chunkSeed);
  for (let i = 0; i < CONFIG.rendering.starsPerChunk; i++) {
    stars.push({
      x: cx * CONFIG.rendering.chunkSize + rng() * CONFIG.rendering.chunkSize,
      y: cy * CONFIG.rendering.chunkSize + rng() * CONFIG.rendering.chunkSize,
      z: cz * CONFIG.rendering.chunkSize + rng() * CONFIG.rendering.chunkSize
    });
  }
  chunks[chunkKey(cx, cy, cz)] = stars;
}

function seededRandom(seed) {
  let s = seed >>> 0;
  return function() {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

function unloadDistantChunks(cx, cy, cz) {
  const { world } = gameState;
  const { chunks } = world;
  const limit = CONFIG.rendering.renderDistanceChunks;
  const limitSq = limit * limit;
  for (const key in chunks) {
    const [x,y,z] = key.split(",").map(Number);
    const dx = x - cx, dy = y - cy, dz = z - cz;
    if (dx*dx + dy*dy + dz*dz > limitSq) delete chunks[key];
  }
}

export function updateChunks(cameraX, cameraY, cameraZ) {
  const { world } = gameState;
  const { chunks } = world;
  const cx = Math.floor(cameraX / CONFIG.rendering.chunkSize);
  const cy = Math.floor(cameraY / CONFIG.rendering.chunkSize);
  const cz = Math.floor(cameraZ / CONFIG.rendering.chunkSize);
  const limit = CONFIG.rendering.renderDistanceChunks;
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