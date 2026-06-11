// world/chunkManager.js
import { chunks, globalSeed, seededRandom } from '../core/gameState.js';
import { chunkSize, starsPerChunk, renderDistanceChunks } from '../constants.js';

function chunkKey(cx, cy, cz) { return `${cx},${cy},${cz}`; }

export function generateChunk(cx, cy, cz) {
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
    const [x,y,z] = key.split(",").map(Number);
    const dx = x - cx, dy = y - cy, dz = z - cz;
    if (dx*dx + dy*dy + dz*dz > limitSq) delete chunks[key];
  }
}

export function updateChunks(cameraX, cameraY, cameraZ) {
  const cx = Math.floor(cameraX / chunkSize);
  const cy = Math.floor(cameraY / chunkSize);
  const cz = Math.floor(cameraZ / chunkSize);
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