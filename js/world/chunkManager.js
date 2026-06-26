// world/chunkManager.js
import { chunks, globalSeed, seededRandom } from '../core/gameState.js';
import { constants } from '../constants.js';

function chunkKey(cx, cy, cz) { return `${cx},${cy},${cz}`; }

export function generateChunk(cx, cy, cz) {
  const stars = [];
  let chunkSeed = (globalSeed * 31 + cx) * 31 + cy;
  chunkSeed = (chunkSeed * 31 + cz) & 0x7fffffff;
  const rng = seededRandom(chunkSeed);
  for (let i = 0; i < constants.starsPerChunk; i++) {
    stars.push({
      x: cx * constants.chunkSize + rng() * constants.chunkSize,
      y: cy * constants.chunkSize + rng() * constants.chunkSize,
      z: cz * constants.chunkSize + rng() * constants.chunkSize
    });
  }
  chunks[chunkKey(cx, cy, cz)] = stars;
}

function unloadDistantChunks(cx, cy, cz) {
  const limit = constants.renderDistanceChunks;
  const limitSq = limit * limit;
  for (const key in chunks) {
    const [x,y,z] = key.split(",").map(Number);
    const dx = x - cx, dy = y - cy, dz = z - cz;
    if (dx*dx + dy*dy + dz*dz > limitSq) delete chunks[key];
  }
}

export function updateChunks(cameraX, cameraY, cameraZ) {
  const cx = Math.floor(cameraX / constants.chunkSize);
  const cy = Math.floor(cameraY / constants.chunkSize);
  const cz = Math.floor(cameraZ / constants.chunkSize);
  const limit = constants.renderDistanceChunks;
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