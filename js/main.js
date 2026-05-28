import { canvas, ctx } from './canvas.js';
import { quatFromAxisAngle, quatMulti, quatNorma, rotetVectByQuat } from './quaternion.js';
import { normAccMin, chunkSize, starsPerChunk, mouseWheelStep, normAccMax, turbAccMin, turbAccMax, normBaseDecel, inicAccFactor, inicTurboEnabled, inicX, inicY, inicZ, inicVX, inicVY, inicVZ, angle, axis, v} 
from './constants.js';
import { CelestBody } from './CelestBody.js';
import { drawHudSpeed } from './hud/hudSpeed.js';
import { drawHudCoords } from './hud/hudCoords.js';
import { drawHudReticle } from './hud/hudReticle.js';

//Algunas variables
let camera = {
  x:inicX, y:inicY, z:inicZ, q:[0,0,0,1], 
  vx:inicVX, vy:inicVY, vz:inicVZ, speed:0 
};
let keys = {};
let turboEnabled = inicTurboEnabled;
let accFactor = inicAccFactor;
let chunks = {};

// === 2. Cuaterniones ===
//1
let q = quatFromAxisAngle(axis, angle);
q = quatNorma(q);
//2
const rotated = rotetVectByQuat(v, q);

console.log(rotated);

// === 3.1. Manejo de entradas ===
// teclas
document.addEventListener("keydown", e => { keys[e.code] = true; });
document.addEventListener("keyup",   e => { keys[e.code] = false; });

// click para lock pointer
canvas.addEventListener("click", () => canvas.requestPointerLock());

// toggle turbo con botón central
canvas.addEventListener("mousedown", e => {
  if (e.button === 1) {
    turboEnabled = !turboEnabled;
    // al cambiar de modo, ajustamos accFactor ×8 ó ÷8
    accFactor = turboEnabled
      ? Math.min(turbAccMax, accFactor * 8)
      : Math.max(normAccMin, accFactor / 8);
  }
});

// rueda del ratón para ajustar accFactor
canvas.addEventListener("wheel", e => {
  e.preventDefault();
  const delta = -Math.sign(e.deltaY);
  // en turbo, cada paso = mouseWheelStep * 8
  const step = turboEnabled ? mouseWheelStep * 8 : mouseWheelStep;
  accFactor += delta * step;
  // imponemos límites según modo
  const min = turboEnabled ? turbAccMin : normAccMin;
  const max = turboEnabled ? turbAccMax : normAccMax;
  accFactor = Math.max(min, Math.min(max, accFactor));
}, { passive: false });

// pointer lock & ratón
document.addEventListener("pointerlockchange", () => {
  if (document.pointerLockElement === canvas)
    document.addEventListener("mousemove", mouseMove);
  else
    document.removeEventListener("mousemove", mouseMove);
});

// control de Ratón (yaw, pitch)
function mouseMove(e) {
  const sens = 0.002;
  const up    = rotetVectByQuat([0,1,0], camera.q);
  const right = rotetVectByQuat([1,0,0], camera.q);
  const yawQ   = quatFromAxisAngle(up,    e.movementX * sens);
  const pitchQ = quatFromAxisAngle(right, e.movementY * sens);
  camera.q = quatNorma(quatMulti(pitchQ, quatMulti(yawQ, camera.q)));
}

// === 5. Movimiento de la Cámara ===
function updateCamera(dt) {
  const acc    = accFactor;
  const maxSpd = turboEnabled ? 2048 : 512;
  const decel  = normBaseDecel * (turboEnabled ? 8 : 1);

  // dirección de movimiento local
  let move = [0,0,0];
  if (keys["KeyW"]) move[2] += 1;
  if (keys["KeyS"]) move[2] -= 1;
  if (keys["KeyA"]) move[0] -= 1;
  if (keys["KeyD"]) move[0] += 1;
  if (keys["KeyR"]) move[1] += 1;
  if (keys["KeyF"]) move[1] -= 1;
  const len = Math.hypot(...move);
  if (len>0) move = move.map(m=>m/len);

  // aceleración en coordenadas globales
  const worldAcc = rotetVectByQuat(move, camera.q).map(v=>v * acc * dt);

  // —–– Frenado mejorado: evita rebote —––
  if (keys["ShiftLeft"]) {
    const sv = [camera.vx, camera.vy, camera.vz];
    const sp = Math.hypot(...sv);
    if (sp > 0) {
      // vector de desaceleración
      const dv = sv.map(v => -v/sp * decel * dt);
      // calcula velocidad candidata
      const newV = [
        camera.vx + dv[0],
        camera.vy + dv[1],
        camera.vz + dv[2]
      ];
      const newSp = Math.hypot(...newV);
      // si sobrepasa la velocidad actual (rebote), para en seco
      if (newSp > sp) {
        camera.vx = camera.vy = camera.vz = 0;
      } else {
        camera.vx = newV[0];
        camera.vy = newV[1];
        camera.vz = newV[2];
      }
    }
  } else {
    // aceleración normal
    camera.vx += worldAcc[0];
    camera.vy += worldAcc[1];
    camera.vz += worldAcc[2];
    // limitamos velocidad
    const sp = Math.hypot(camera.vx, camera.vy, camera.vz);
    if (sp > maxSpd) {
      const s = maxSpd / sp;
      camera.vx *= s; camera.vy *= s; camera.vz *= s;
    }
  }

  // roll (Q/E)
  const forward = rotetVectByQuat([0,0,-1], camera.q);
  if (keys["KeyQ"]) {
    const rQ = quatFromAxisAngle(forward,  0.03);
    camera.q = quatNorma(quatMulti(rQ, camera.q));
  }
  if (keys["KeyE"]) {
    const rQ = quatFromAxisAngle(forward, -0.03);
    camera.q = quatNorma(quatMulti(rQ, camera.q));
  }

  // aplicamos posición
  camera.x += camera.vx * dt;
  camera.y += camera.vy * dt;
  camera.z += camera.vz * dt;
  camera.speed = Math.hypot(camera.vx, camera.vy, camera.vz);
}


// === 6. Proyección 3D a 2D ===
function project3D(x,y,z) {
  let dx = x - camera.x, dy = y - camera.y, dz = z - camera.z;
  const invQ = [-camera.q[0],-camera.q[1],-camera.q[2],camera.q[3]];
  [dx,dy,dz] = rotetVectByQuat([dx,dy,dz], invQ);
  //VARIABLE/CONSTANT
  const fov = 500, scale = fov/(dz||0.0001);
  return { x: canvas.width/2 + dx*scale,
           y: canvas.height/2 - dy*scale,
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


// ====================================
// === 9. Bucle Principal de Render ===
// ====================================

let last = performance.now();
function loop(now) {
  const dt = (now - last) / 1000; last = now;
  updateCamera(dt);
  updateChunks();
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.fillRect(0,0,canvas.width,canvas.height);

  // Dibujar estrellas
  for (const key in chunks) for (const s of chunks[key]) {
    const p = project3D(s.x, s.y, s.z);
    if (!p.visible) continue;
    //VARIABLE/CONSTANT
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

  // Dibujar Cuerpos Celestiales
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
      ctx.fillText(cb.name, canvas.width/2, canvas.height*0.2);
    }
  }

  
  // == HUDS ==
  drawHudReticle(ctx);
  drawHudCoords(ctx, camera);
  drawHudSpeed(ctx, camera, keys, accFactor, turboEnabled);
  //drawHudGyro(ctx, camera);

  // ── Giroscopio visual híbrido con símbolos separados uniformemente ──
  //VARIABLE/CONSTANT
  const gyroSize = 96;
  const gyroCX   = canvas.width / 2;
  const gyroCY   = 96;
  const axisLen  = gyroSize / 2;
  const gapFrac  = 0.64;
  const gapoo    = axisLen * gapFrac;
  const arrowOff = 8;
  const arrowSz  = 6;
  const minAlpha = 0.16;
  const symbolThreshold = 0.9;
  const symbolOff = arrowOff + arrowSz + 4;  // separación extra para símbolos

  ctx.save();
  ctx.translate(gyroCX, gyroCY);

  // cuaternión inverso y ejes del mundo
  const invQ = [-camera.q[0], -camera.q[1], -camera.q[2], camera.q[3]];
  const xA   = rotetVectByQuat([1, 0, 0], invQ);
  const yA   = rotetVectByQuat([0, 1, 0], invQ);
  const zA   = rotetVectByQuat([0, 0, 1], invQ);

  // mapea dz=>alpha
  function depthAlpha(dz) {
    const t = (dz + 1) / 2;
    return minAlpha + (1 - minAlpha) * t;
  }

  // ── Galaxia estática generada en la primera pasada del loop ──
  if (!window._galaxyStars) {
    // Parámetros (igual que antes)
    const GALAXY = {
      arms: 2,
      turns: 1.6,
      starCount: 256,
      innerRadius: -0.8,
      expansion: 0.8,
      starSpread: 1.2,
      scale: 0.12,
      starSize: 1.2
    };

    const maxAngle = GALAXY.turns * Math.PI * 2;
    window._galaxyStars = [];

    for (let arm = 0; arm < GALAXY.arms; arm++) {
      const baseAngle = (arm / GALAXY.arms) * Math.PI * 2;
      for (let i = 0; i < GALAXY.starCount; i++) {
        const t     = Math.random() * maxAngle;
        const tNorm = t / maxAngle;
        const rBase = GALAXY.innerRadius + GALAXY.expansion * t;
        const spread = GALAXY.starSpread * (1 - tNorm);
        const r     = rBase + (Math.random() * 2 - 1) * spread;
        const angle = t + baseAngle;
        const xw    = Math.cos(angle) * r;
        const zw    = Math.sin(angle) * r;
        window._galaxyStars.push([ xw, zw ]);
      }
    }

    // Guardamos también la configuración para dibujar
    window._GALAXY = GALAXY;
  }

  // Y ahora, en cada frame, dibujamos siempre el mismo conjunto:
  const { arms, turns, starCount, innerRadius, expansion, starSpread, scale, starSize } = window._GALAXY;
  ctx.fillStyle = 'rgba(196, 196, 196, 0.04)';
  for (const [xw, zw] of window._galaxyStars) {
    const [dx, dy] = rotetVectByQuat([xw, 0, zw], invQ);
    const px       = dx * axisLen * scale;
    const py       = -dy * axisLen * scale;
    ctx.beginPath();
    ctx.arc(px, py, starSize, 0, Math.PI * 2);
    ctx.fill();
  }

  // dibuja “+”
  function drawPlus(x, y, color) {
    ctx.strokeStyle = color;
    ctx.beginPath();
    ctx.moveTo(x - 5, y);
    ctx.lineTo(x + 5, y);
    ctx.moveTo(x,     y - 5);
    ctx.lineTo(x,     y + 5);
    ctx.stroke();
  }
  // dibuja “−”
  function drawMinus(x, y, color) {
    ctx.strokeStyle = color;
    ctx.beginPath();
    ctx.moveTo(x - 5, y);
    ctx.lineTo(x + 5, y);
    ctx.stroke();
  }
  // flecha “V” positiva
  function drawArrowhead(x, y, dx, dy, alpha, color) {
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = color;
    const px = x + dx * arrowOff, py = y + dy * arrowOff;
    const perpX = -dy, perpY = dx;
    const tipX = px + dx * arrowSz, tipY = py + dy * arrowSz;
    const leftX = px + perpX * arrowSz, leftY = py + perpY * arrowSz;
    const rightX = px - perpX * arrowSz, rightY = py - perpY * arrowSz;
    ctx.beginPath();
    ctx.moveTo(leftX, leftY);
    ctx.lineTo(tipX,  tipY);
    ctx.lineTo(rightX, rightY);
    ctx.stroke();
  }
  // palito “−” negativo
  function drawNegativeBar(x, y, dx, dy, alpha, color) {
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = color;
    const px = x - dx * arrowOff, py = y - dy * arrowOff;
    const perpX = -dy, perpY = dx;
    const half = 4;
    ctx.beginPath();
    ctx.moveTo(px + perpX * half, py + perpY * half);
    ctx.lineTo(px - perpX * half, py - perpY * half);
    ctx.stroke();
  }

  // eje mixto con símbolo separado uniformemente
  function drawFullAxis(dir, color) {
    const dx = dir[0], dy = -dir[1], dz = dir[2];
    const len = axisLen;
    const xPos = dx * len,  yPos = dy * len;
    const xNeg = -xPos,      yNeg = -yPos;
    const xGap = dx * gapoo, yGap = dy * gapoo;
    const aPos = depthAlpha(dz);
    const aNeg = depthAlpha(-dz);

    ctx.lineWidth = 3.2;
    ctx.lineCap   = 'round';

    // segmento negativo
    ctx.globalAlpha = aNeg;
    ctx.strokeStyle = color;
    ctx.beginPath();
    ctx.moveTo(-xGap, -yGap);
    ctx.lineTo(xNeg,  yNeg);
    ctx.stroke();

    // segmento positivo
    ctx.globalAlpha = aPos;
    ctx.beginPath();
    ctx.moveTo(xGap,  yGap);
    ctx.lineTo(xPos,  yPos);
    ctx.stroke();

    // extremo positivo: símbolo “+” situado a symbolOff
    if (dz > symbolThreshold) {
      ctx.globalAlpha = 1;
      drawPlus(xPos + dx * symbolOff, yPos + dy * symbolOff, color);
    } else {
      drawArrowhead(xPos, yPos, dx, dy, aPos, color);
    }

    // extremo negativo: símbolo “−” o palito
    if (-dz > symbolThreshold) {
      ctx.globalAlpha = 1;
      drawMinus(xNeg - dx * symbolOff, yNeg - dy * symbolOff, color);
    } else {
      drawNegativeBar(xNeg, yNeg, dx, dy, aNeg, color);
    }
  }

  // Ejes rotados con sus colores
  const axes = [
    { vec: rotetVectByQuat([1, 0, 0], invQ), color: '#f55' }, // X
    { vec: rotetVectByQuat([0, 1, 0], invQ), color: '#5f5' }, // Y
    { vec: rotetVectByQuat([0, 0, 1], invQ), color: '#55f' }  // Z
  ];

  // Ordenar de menor a mayor profundidad (más al fondo primero)
  axes.sort((a, b) => a.vec[2] - b.vec[2]);

  // Dibujar en ese orden
  for (const { vec, color } of axes) {
    drawFullAxis(vec, color);
  }


  ctx.restore();

  requestAnimationFrame(loop);
}

// === 10. Inicialización ===
const icx = Math.floor(camera.x/chunkSize),
      icy = Math.floor(camera.y/chunkSize),
      icz = Math.floor(camera.z/chunkSize);
generateChunk(icx, icy, icz);
requestAnimationFrame(loop);
