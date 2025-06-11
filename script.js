// === Space Camera System ===
// Author: Tú
// Descripción: Explorador 3D con cámara libre en canvas, rotaciones con cuaterniones y chunk dinámico de estrellas

// === 1. Setup del Canvas ===
const canvas = document.getElementById("spaceCanvas");
const ctx = canvas.getContext("2d");
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
window.addEventListener("resize", () => {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
});

// === 2. Utilidades de Cuaterniones ===
function quatFromAxisAngle(axis, angle) {
  const half = angle / 2;
  const s = Math.sin(half);
  return [axis[0] * s, axis[1] * s, axis[2] * s, Math.cos(half)];
}
function quatMultiply(a, b) {
  const [ax, ay, az, aw] = a;
  const [bx, by, bz, bw] = b;
  return [
    aw * bx + ax * bw + ay * bz - az * by,
    aw * by - ax * bz + ay * bw + az * bx,
    aw * bz + ax * by - ay * bx + az * bw,
    aw * bw - ax * bx - ay * by - az * bz
  ];
}
function quatNormalize(q) {
  const [x, y, z, w] = q;
  const len = Math.hypot(x, y, z, w) || 1;
  return [x / len, y / len, z / len, w / len];
}
function rotateVectorByQuat(v, q) {
  const [qx, qy, qz, qw] = q;
  const [vx, vy, vz] = v;
  const tx = 2 * (qy * vz - qz * vy);
  const ty = 2 * (qz * vx - qx * vz);
  const tz = 2 * (qx * vy - qy * vx);
  return [
    vx + qw * tx + (qy * tz - qz * ty),
    vy + qw * ty + (qz * tx - qx * tz),
    vz + qw * tz + (qx * ty - qy * tx)
  ];
}

// === 3. Estado de la Cámara ===
let camera = { x:0, y:0, z:0, q:[0,0,0,1], vx:0, vy:0, vz:0, speed:0 };
const keys = {};
document.addEventListener("keydown", e => keys[e.code] = true);
document.addEventListener("keyup", e => keys[e.code] = false);
canvas.addEventListener("click", () => canvas.requestPointerLock());
document.addEventListener("pointerlockchange", () => {
  if (document.pointerLockElement === canvas)
    document.addEventListener("mousemove", mouseMove);
  else
    document.removeEventListener("mousemove", mouseMove);
});

// === 4. Control de Ratón (rotación con yaw, pitch y roll) ===
function mouseMove(e) {
  const sens = 0.002;
  const localUp = rotateVectorByQuat([0,1,0], camera.q);
  const localRight = rotateVectorByQuat([1,0,0], camera.q);
  const yawQ   = quatFromAxisAngle(localUp,    e.movementX * sens);
  const pitchQ = quatFromAxisAngle(localRight, e.movementY * sens);
  camera.q = quatNormalize(quatMultiply(pitchQ, quatMultiply(yawQ, camera.q)));
}

// === 5. Movimiento de la Cámara ===
function updateCamera(dt) {
  const speed = 200 * dt;
  let move = [0,0,0];
  if(keys["KeyW"]) move[2] += 1;
  if(keys["KeyS"]) move[2] -= 1;
  if(keys["KeyA"]) move[0] -= 1;
  if(keys["KeyD"]) move[0] += 1;
  if(keys["KeyR"]) move[1] += 1; // subir
  if(keys["KeyF"]) move[1] -= 1; // bajar

  const worldMove = rotateVectorByQuat(move, camera.q);
  camera.vx = worldMove[0]*speed;
  camera.vy = worldMove[1]*speed;
  camera.vz = worldMove[2]*speed;

  const forward = rotateVectorByQuat([0,0,-1], camera.q);
  if(keys["KeyQ"]) {
    const rollQ = quatFromAxisAngle(forward,  0.03);
    camera.q = quatNormalize(quatMultiply(rollQ, camera.q));
  }
  if(keys["KeyE"]) {
    const rollQ = quatFromAxisAngle(forward, -0.03);
    camera.q = quatNormalize(quatMultiply(rollQ, camera.q));
  }

  camera.x += camera.vx;
  camera.y += camera.vy;
  camera.z += camera.vz;
  camera.speed = Math.hypot(camera.vx,camera.vy,camera.vz);
}

// === 6. Proyección 3D a 2D ===
function project3D(x,y,z) {
  let dx=x-camera.x, dy=y-camera.y, dz=z-camera.z;
  const invQ = [-camera.q[0],-camera.q[1],-camera.q[2],camera.q[3]];
  [dx,dy,dz] = rotateVectorByQuat([dx,dy,dz], invQ);
  const fov=500, scale=fov/(dz||0.0001);
  return { x:canvas.width/2+dx*scale, y:canvas.height/2-dy*scale, visible:dz>1, scale };
}

// === 7. Sistema de Estrellas (Chunks) ===
const chunkSize = 4096, starsPerChunk = 256;
let chunks = {};
function chunkKey(cx, cy, cz) { return `${cx},${cy},${cz}`; }
function generateChunk(cx, cy, cz) {
  const key = chunkKey(cx, cy, cz), stars = [];
  for (let i = 0; i < starsPerChunk; i++)
    stars.push({ x: cx*chunkSize+Math.random()*chunkSize, y: cy*chunkSize+Math.random()*chunkSize, z: cz*chunkSize+Math.random()*chunkSize });
  chunks[key] = stars;
}
function unloadDistantChunks(cx, cy, cz) {
  for (const key in chunks) {
    const [x, y, z] = key.split(",").map(Number);
    if (Math.abs(x - cx) > 1 || Math.abs(y - cy) > 1 || Math.abs(z - cz) > 1)
      delete chunks[key];
  }
}
function updateChunks() {
  const cx = Math.floor(camera.x / chunkSize);
  const cy = Math.floor(camera.y / chunkSize);
  const cz = Math.floor(camera.z / chunkSize);
  for (let dx = -1; dx <= 1; dx++)
    for (let dy = -1; dy <= 1; dy++)
      for (let dz = -1; dz <= 1; dz++) {
        const key = chunkKey(cx+dx, cy+dy, cz+dz);
        if (!chunks[key]) generateChunk(cx+dx, cy+dy, cz+dz);
      }
  unloadDistantChunks(cx, cy, cz);
}

// === 8. Planetas Fijos ===
const planets = [
  { x: 0, y: 0, z: 300, r: 10, color: '#0cf', name: 'Azulon' },
  { x: 100, y: 20, z: 600, r: 20, color: '#f80', name: 'Fulgor' }
];

// === 9. Bucle Principal de Render ===
let last = performance.now();
function loop(now) {
  const dt = (now - last) / 1000; last = now;
  updateCamera(dt);
  updateChunks();
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Dibujar estrellas
  for (const key in chunks) for (const s of chunks[key]) {
    const p = project3D(s.x, s.y, s.z);
    if (!p.visible) continue;
    const size = 2;
    const bright = Math.min(1, p.scale * 2 + camera.speed * 0.02);
    ctx.fillStyle = `rgba(255,255,255,${bright})`;
    const dist = Math.hypot(s.x - camera.x, s.y - camera.y, s.z - camera.z);
    if (dist < 300) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, (size/2) * p.scale, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillRect(p.x, p.y, size * p.scale, size * p.scale);
    }
  }

  // Dibujar planetas
  for (const pl of planets) {
    const p = project3D(pl.x, pl.y, pl.z);
    if (!p.visible) continue;
    ctx.beginPath();
    ctx.arc(p.x, p.y, pl.r * p.scale, 0, Math.PI * 2);
    ctx.fillStyle = pl.color;
    ctx.fill();
    const dist = Math.hypot(pl.x - camera.x, pl.y - camera.y, pl.z - camera.z);
    if (dist < pl.r * 2) {
      ctx.fillStyle = 'white';
      ctx.font = '20px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(pl.name, canvas.width / 2, canvas.height * 0.2);
    }
  }

  // Coordenadas en pantalla
  ctx.fillStyle = 'white';
  ctx.font = '14px monospace';
  ctx.textAlign = 'right';
  ctx.fillText(`X:${camera.x.toFixed(1)} Y:${camera.y.toFixed(1)} Z:${camera.z.toFixed(1)}`, canvas.width - 10, 20);
  requestAnimationFrame(loop);
}

// === 10. Inicialización ===
const icx = Math.floor(camera.x / chunkSize);
const icy = Math.floor(camera.y / chunkSize);
const icz = Math.floor(camera.z / chunkSize);
generateChunk(icx, icy, icz);
requestAnimationFrame(loop);
