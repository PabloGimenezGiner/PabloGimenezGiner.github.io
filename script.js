const canvas = document.getElementById("spaceCanvas");
const ctx = canvas.getContext("2d");

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

window.addEventListener("resize", () => {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
});

// Chunk-based star generation
const chunkSize = 4096;
const starsPerChunk = 256;
let chunks = {}; // {'cx,cy,cz': [{x,y,z}, ...]}

function chunkKey(cx, cy, cz) {
  return `${cx},${cy},${cz}`;
}

function generateChunk(cx, cy, cz) {
  const key = chunkKey(cx, cy, cz);
  const starArray = [];
  for (let i = 0; i < starsPerChunk; i++) {
    const x = cx * chunkSize + Math.random() * chunkSize;
    const y = cy * chunkSize + Math.random() * chunkSize;
    const z = cz * chunkSize + Math.random() * chunkSize;
    starArray.push({ x, y, z });
  }
  chunks[key] = starArray;
}

function unloadDistantChunks(camCx, camCy, camCz) {
  for (const key in chunks) {
    const [cx, cy, cz] = key.split(',').map(Number);
    if (Math.abs(cx - camCx) > 1 || Math.abs(cy - camCy) > 1 || Math.abs(cz - camCz) > 1) {
      delete chunks[key];
    }
  }
}

function updateChunks() {
  const camCx = Math.floor(camera.x / chunkSize);
  const camCy = Math.floor(camera.y / chunkSize);
  const camCz = Math.floor(camera.z / chunkSize);
  for (let dx = -1; dx <= 1; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
      for (let dz = -1; dz <= 1; dz++) {
        const nx = camCx + dx;
        const ny = camCy + dy;
        const nz = camCz + dz;
        const key = chunkKey(nx, ny, nz);
        if (!chunks[key]) {
          generateChunk(nx, ny, nz);
        }
      }
    }
  }
  unloadDistantChunks(camCx, camCy, camCz);
}

const planets = [
  { x: 0, y: 0, z: 300, r: 10, color: "#0cf", name: "Azulon" },
  { x: 100, y: 20, z: 600, r: 20, color: "#f80", name: "Fulgor" },
];

let camera = {
  x: 0,
  y: 0,
  z: 0,
  yaw: 0,
  pitch: 0,
  roll: 0,
  vx: 0,
  vy: 0,
  vz: 0,
  speed: 0
};

const keys = {};
document.addEventListener("keydown", e => keys[e.code] = true);
document.addEventListener("keyup", e => keys[e.code] = false);

canvas.addEventListener("click", () => canvas.requestPointerLock());

document.addEventListener("pointerlockchange", () => {
  if (document.pointerLockElement === canvas) {
    document.addEventListener("mousemove", mouseMove);
  } else {
    document.removeEventListener("mousemove", mouseMove);
  }
});

function mouseMove(e) {
  const sensitivity = 0.004;
  camera.yaw -= e.movementX * sensitivity;
  camera.pitch -= e.movementY * sensitivity;
  camera.pitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, camera.pitch));
}

function updateCamera() {
  const speed = 10;
  const rotationSpeed = 0.03;

  // Calcular vector forward a partir de yaw/pitch
  const cosY = Math.cos(camera.yaw);
  const sinY = Math.sin(camera.yaw);
  const cosP = Math.cos(camera.pitch);
  const sinP = Math.sin(camera.pitch);

  let dirX = cosP * -sinY;
  let dirY = -sinP;
  let dirZ = cosP * cosY;
  // Normalizar forward
  const dirLen = Math.hypot(dirX, dirY, dirZ);
  dirX /= dirLen; dirY /= dirLen; dirZ /= dirLen;

  // Calcular right base ignorando el roll: cross(worldUp, forward)
  let baseRightX = dirZ;
  let baseRightY = 0;
  let baseRightZ = -dirX;
  const baseLen = Math.hypot(baseRightX, baseRightY, baseRightZ);
  baseRightX /= baseLen; baseRightY /= baseLen; baseRightZ /= baseLen;

  // Rotar baseRight alrededor de forward por roll (fórmula de Rodrigues)
  const cosR = Math.cos(camera.roll);
  const sinR = Math.sin(camera.roll);
  const dotUV = dirX * baseRightX + dirY * baseRightY + dirZ * baseRightZ;
  const crossUVx = dirY * baseRightZ - dirZ * baseRightY;
  const crossUVy = dirZ * baseRightX - dirX * baseRightZ;
  const crossUVz = dirX * baseRightY - dirY * baseRightX;
  const rightX = baseRightX * cosR + crossUVx * sinR + dirX * dotUV * (1 - cosR);
  const rightY = baseRightY * cosR + crossUVy * sinR + dirY * dotUV * (1 - cosR);
  const rightZ = baseRightZ * cosR + crossUVz * sinR + dirZ * dotUV * (1 - cosR);

  camera.vx = 0;
  camera.vy = 0;
  camera.vz = 0;

  if (keys["KeyW"]) {
    camera.vx += dirX * speed;
    camera.vy += dirY * speed;
    camera.vz += dirZ * speed;
  }
  if (keys["KeyS"]) {
    camera.vx -= dirX * speed;
    camera.vy -= dirY * speed;
    camera.vz -= dirZ * speed;
  }
  if (keys["KeyA"]) {
    camera.vx -= rightX * speed;
    camera.vy -= rightY * speed;
    camera.vz -= rightZ * speed;
  }
  if (keys["KeyD"]) {
    camera.vx += rightX * speed;
    camera.vy += rightY * speed;
    camera.vz += rightZ * speed;
  }
  if (keys["KeyQ"]) {
    camera.roll -= rotationSpeed;
  }
  if (keys["KeyE"]) {
    camera.roll += rotationSpeed;
  }

  camera.x += camera.vx;
  camera.y += camera.vy;
  camera.z += camera.vz;

  camera.speed = Math.hypot(camera.vx, camera.vy, camera.vz);
}

function project3D(x, y, z) {
  // Trasladar coordenadas al espacio relativo a la cámara
  let dx = x - camera.x;
  let dy = y - camera.y;
  let dz = z - camera.z;

  // Rotar yaw
  const cosY = Math.cos(-camera.yaw);
  const sinY = Math.sin(-camera.yaw);
  let tx = dx * cosY - dz * sinY;
  let tz = dx * sinY + dz * cosY;
  let ty = dy;

  // Rotar pitch
  const cosP = Math.cos(-camera.pitch);
  const sinP = Math.sin(-camera.pitch);
  let ty2 = ty * cosP - tz * sinP;
  tz = ty * sinP + tz * cosP;

  // Rotar roll
  const cosR2 = Math.cos(-camera.roll);
  const sinR2 = Math.sin(-camera.roll);
  let tx2 = tx * cosR2 - ty2 * sinR2;
  let ty3 = tx * sinR2 + ty2 * cosR2;

  // Proyección en perspectiva
  const fov = 500;
  const scale = fov / (tz || 1);
  return {
    x: canvas.width / 2 + tx2 * scale,
    y: canvas.height / 2 + ty3 * scale,
    visible: tz > 1,
    scale
  };
}

function loop() {
  updateCamera();
  updateChunks();

  ctx.fillStyle = "rgba(0,0,0,0.4)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Dibujar estrellas de todos los chunks activos
  for (const key in chunks) {
    for (const s of chunks[key]) {
      const p = project3D(s.x, s.y, s.z);
      if (p.visible) {
        const sizeStars = 2;
        const brightness = Math.min(1, p.scale * 2 + camera.speed * 0.02);
        ctx.fillStyle = `rgba(255,255,255,${brightness})`;
        const dx2 = s.x - camera.x;
        const dy2 = s.y - camera.y;
        const dz2 = s.z - camera.z;
        const dist = Math.hypot(dx2, dy2, dz2);
        if (dist < 300) {
          ctx.beginPath();
          ctx.arc(
            p.x + (sizeStars / 2) * p.scale,
            p.y + (sizeStars / 2) * p.scale,
            (sizeStars / 2) * p.scale,
            0,
            Math.PI * 2
          );
          ctx.fill();
        } else {
          ctx.fillRect(p.x, p.y, sizeStars * p.scale, sizeStars * p.scale);
        }
      }
    }
  }

  // Dibujar planetas
  for (const planet of planets) {
    const p = project3D(planet.x, planet.y, planet.z);
    if (p.visible) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, planet.r * p.scale, 0, Math.PI * 2);
      ctx.fillStyle = planet.color;
      ctx.fill();

      const dxp = planet.x - camera.x;
      const dyp = planet.y - camera.y;
      const dzp = planet.z - camera.z;
      const distPlanet = Math.hypot(dxp, dyp, dzp);
      if (distPlanet < 30) {
        ctx.fillStyle = "white";
        ctx.font = "20px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(planet.name, canvas.width / 2, canvas.height * 0.2);
      }
    }
  }

  // Mostrar coordenadas en esquina superior derecha
  ctx.fillStyle = "white";
  ctx.font = "14px monospace";
  ctx.textAlign = "right";
  const coordText =
    "X: " + camera.x.toFixed(1) +
    " Y: " + camera.y.toFixed(1) +
    " Z: " + camera.z.toFixed(1);
  ctx.fillText(coordText, canvas.width - 10, 20);

  requestAnimationFrame(loop);
}

// Inicializar primer chunk y comenzar bucle
initStars = () => {};
const initialCx = Math.floor(camera.x / chunkSize);
const initialCy = Math.floor(camera.y / chunkSize);
const initialCz = Math.floor(camera.z / chunkSize);
generateChunk(initialCx, initialCy, initialCz);
loop();
