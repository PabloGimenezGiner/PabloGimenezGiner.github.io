import { ctx } from './canvas.js';
import { quatFromAxisAngle, quatMultiply, quatNormalize, rotateVectorByQuat } from './quaternion.js';
import { normAccMin, chunkSize, starsPerChunk, mouseWheelStep, normAccMax, turbAccMin, turbAccMax, normBaseDecel, inicAccFactor, inicTurboEnabled, inicX, inicY, inicZ, inicVX, inicVY, inicVZ} 
from './constants.js';
import { CelestBody } from './CelestBody.js';
import { drawHudSpeed } from './hud/hudSpeed.js';
import { drawHudCoords } from './hud/hudCoords.js';
import { drawHudReticle } from './hud/hudReticle.js';
import { drawHudGyro } from './hud/hudGyro.js';

// ✅ Ruta corregida: variable.js (sin 's')
import { camera, keys, settings, chunks } from './variable.js';

// === 3.1. Manejo de entradas ===
document.addEventListener("keydown", e => { keys[e.code] = true; });
document.addEventListener("keyup",   e => { keys[e.code] = false; });

ctx.canvas.addEventListener("click", () => ctx.canvas.requestPointerLock());

ctx.canvas.addEventListener("mousedown", e => {
  if (e.button === 1) {
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

// === 5. Movimiento de la Cámara ===
function updateCamera(dt) {
  // ✅ Acceso correcto a settings
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
  const len = Math.hypot(...move);
  if (len>0) move = move.map(m=>m/len);

  const worldAcc = rotateVectorByQuat(move, camera.q).map(v=>v * acc * dt);

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

// === 6. Proyección 3D a 2D ===
function project3D(x,y,z) {
  let dx = x - camera.x, dy = y - camera.y, dz = z - camera.z;
  const invQ = [-camera.q[0],-camera.q[1],-camera.q[2],camera.q[3]];
  [dx,dy,dz] = rotateVectorByQuat([dx,dy,dz], invQ);
  const fov = 500, scale = fov/(dz||0.0001);
  return { x: ctx.canvas.width/2 + dx*scale,
           y: ctx.canvas.height/2 - dy*scale,
           visible: dz>1, scale };
}

// === 7. Sistema de Estrellas (Chunks) ===
function chunkKey(cx,cy,cz){ return `${cx},${cy},${cz}`; }
function generateChunk(cx,cy,cz){
  const key = chunkKey(cx,cy,cz), stars = [];
  for(let i=0;i<starsPerChunk;i++){
    stars.push({
      x: cx*chunkSize + Math.random()*chunkSize,
      y: cy*chunkSize + Math.random()*chunkSize,
      z: cz*chunkSize + Math.random()*chunkSize
    });
  }
  chunks[key] = stars;
}
function unloadDistantChunks(cx,cy,cz){
  for(const key in chunks){
    const [x,y,z] = key.split(",").map(Number);
    if(Math.abs(x-cx)>1||Math.abs(y-cy)>1||Math.abs(z-cz)>1)
      delete chunks[key];
  }
}
function updateChunks(){
  const cx = Math.floor(camera.x/chunkSize),
        cy = Math.floor(camera.y/chunkSize),
        cz = Math.floor(camera.z/chunkSize);
  for(let dx=-1; dx<=1; dx++)
    for(let dy=-1; dy<=1; dy++)
      for(let dz=-1; dz<=1; dz++){
        const key = chunkKey(cx+dx, cy+dy, cz+dz);
        if(!chunks[key]) generateChunk(cx+dx, cy+dy, cz+dz);
      }
  unloadDistantChunks(cx,cy,cz);
}

// === 9. Bucle Principal de Render ===
let last = performance.now();
function loop(now) {
  const dt = (now - last) / 1000; last = now;
  updateCamera(dt);
  updateChunks();
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.fillRect(0,0,ctx.canvas.width,ctx.canvas.height);

  // Estrellas
  for (const key in chunks) for (const s of chunks[key]) {
    const p = project3D(s.x, s.y, s.z);
    if (!p.visible) continue;
    const size = 2;
    const starLargRendSize = size * 0.9;
    const bright = Math.min(1, p.scale * 2 + camera.speed * 0.002);
    ctx.fillStyle = `rgba(255,255,255,${bright})`;
    const dist = Math.hypot(s.x - camera.x, s.y - camera.y, s.z - camera.z);
    if (dist < (size*200)) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.scale, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillRect(p.x - (starLargRendSize/2) * p.scale, p.y - (starLargRendSize/2) * p.scale, (starLargRendSize) * p.scale, (starLargRendSize) * p.scale);
    }
  }

  // Cuerpos Celestiales
  for(const cb of CelestBody){
    const p = project3D(cb.x,cb.y,cb.z);
    if(!p.visible) continue;
    ctx.beginPath();
    ctx.arc(p.x,p.y,cb.r*p.scale,0,Math.PI*2);
    ctx.fillStyle = cb.color; ctx.fill();
    const dist = Math.hypot(cb.x-camera.x, cb.y-camera.y, cb.z-camera.z);
    if(dist < cb.r*2){
      ctx.fillStyle='white';
      ctx.font='20px sans-serif';
      ctx.textAlign='center';
      ctx.fillText(cb.name, ctx.canvas.width/2, ctx.canvas.height*0.2);
    }
  }

  // HUDS
  drawHudReticle(ctx);
  drawHudCoords(ctx, camera);
  drawHudSpeed(ctx, camera, keys, settings.accFactor, settings.turboEnabled);
  drawHudGyro(ctx, camera);

  requestAnimationFrame(loop);
}

// === 10. Inicialización ===
const icx = Math.floor(camera.x/chunkSize),
      icy = Math.floor(camera.y/chunkSize),
      icz = Math.floor(camera.z/chunkSize);
generateChunk(icx, icy, icz);
requestAnimationFrame(loop);