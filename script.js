const canvas = document.getElementById("spaceCanvas");
const ctx = canvas.getContext("2d");

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

window.addEventListener("resize", () => {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
});

// Chunk-based star generation
const chunkSize = 2048;
const starsPerChunk = 256;
let chunks = {}; // {'cx,cy,cz': [{x,y,z}, ...]}

function chunkKey(cx, cy, cz) {
  return `${cx},${cy},${cz}`;
}

function generateChunk(cx, cy, cz) {
  const key = chunkKey(cx, cy, cz);
  const starArray = [];
  // Generate stars uniformly in the cube [cx*chunkSize, (cx+1)*chunkSize)
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
    // Unload if more than 1 chunk away in any direction
    if (Math.abs(cx - camCx) > 1 || Math.abs(cy - camCy) > 1 || Math.abs(cz - camCz) > 1) {
      delete chunks[key];
    }
  }
}

function updateChunks() {
  const camCx = Math.floor(camera.x / chunkSize);
  const camCy = Math.floor(camera.y / chunkSize);
  const camCz = Math.floor(camera.z / chunkSize);
  // Ensure 3x3x3 neighborhood
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
  const sensitivity = 0.002;
  camera.yaw -= e.movementX * sensitivity;
  camera.pitch -= e.movementY * sensitivity;
  camera.pitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, camera.pitch));
}

function updateCamera() {
  const speed = 10;
  const cosY = Math.cos(camera.yaw);
  const sinY = Math.sin(camera.yaw);
  const cosP = Math.cos(camera.pitch);
  const sinP = Math.sin(camera.pitch);

  const dirX = cosP * -sinY;
  const dirY = -sinP;
  const dirZ = cosP * cosY;

  const rightX = Math.cos(camera.yaw);
  const rightZ = Math.sin(camera.yaw);

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
    camera.vz -= rightZ * speed;
  }
  if (keys["KeyD"]) {
    camera.vx += rightX * speed;
    camera.vz += rightZ * speed;
  }

  camera.x += camera.vx;
  camera.y += camera.vy;
  camera.z += camera.vz;

  camera.speed = Math.sqrt(
    camera.vx * camera.vx +
    camera.vy * camera.vy +
    camera.vz * camera.vz
  );
}

function project3D(x, y, z) {
  const dx = x - camera.x;
  const dy = y - camera.y;
  const dz = z - camera.z;

  const cosY = Math.cos(-camera.yaw);
  const sinY = Math.sin(-camera.yaw);
  const cosP = Math.cos(-camera.pitch);
  const sinP = Math.sin(-camera.pitch);

  let tx = dx * cosY - dz * sinY;
  let tz = dx * sinY + dz * cosY;
  let ty = dy * cosP - tz * sinP;
  tz = dy * sinP + tz * cosP;

  const fov = 500;
  const scale = fov / (tz || 1);
  return {
    x: canvas.width / 2 + tx * scale,
    y: canvas.height / 2 + ty * scale,
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
        const sizeStars = 1.5;
        const brightness = Math.min(1, p.scale * 2 + camera.speed * 0.02);
        ctx.fillStyle = `rgba(255,255,255,${brightness})`;
        const dx = s.x - camera.x;
        const dy = s.y - camera.y;
        const dz = s.z - camera.z;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (dist < 300) {
          ctx.beginPath();
          ctx.arc(p.x + sizeStars/2 * p.scale, p.y + sizeStars/2 * p.scale, sizeStars/2 * p.scale, 0, Math.PI * sizeStars*2);
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

      const dx = planet.x - camera.x;
      const dy = planet.y - camera.y;
      const dz = planet.z - camera.z;
      const distPlanet = Math.sqrt(dx * dx + dy * dy + dz * dz);
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

// Inicializar primer chunk y empezar bucle
initStars = () => {};
const initialCx = Math.floor(camera.x / chunkSize);
const initialCy = Math.floor(camera.y / chunkSize);
const initialCz = Math.floor(camera.z / chunkSize);
generateChunk(initialCx, initialCy, initialCz);
loop();
