// camera/cameraPhysics.js
import { quatFromAxisAngle, quatMultiply, quatNormalize, rotateVectorByQuat } from '../quaternion.js';
import { camera, settings, movementAutoBrake, rotationAutoDamp, angularVel,
         ROT_ACC, ROT_DAMP, ROT_BRAKE_FORCE, MAX_ANGULAR_SPEED } from '../core/gameState.js';
import { constants } from '../constants.js';
import { ctx } from '../canvas.js';

let inputManager;
export function setInputManager(im) { inputManager = im; }

export function updateCamera(dt) {
  const acc = settings.accFactor;
  const maxSpd = settings.turboEnabled ? 2048 : 512;
  const decel = constants.normBaseDecel * (settings.turboEnabled ? 8 : 1);

  const rot = inputManager.getRotationDelta();
  if (rot.yaw !== 0 || rot.pitch !== 0) {
    const up = rotateVectorByQuat([0, 1, 0], camera.q);
    const right = rotateVectorByQuat([1, 0, 0], camera.q);
    const yawQ = quatFromAxisAngle(up, rot.yaw);
    const pitchQ = quatFromAxisAngle(right, rot.pitch);
    camera.q = quatNormalize(quatMultiply(pitchQ, quatMultiply(yawQ, camera.q)));
  }

  const yawInput = inputManager.getYawDirection();
  const pitchInput = inputManager.getPitchDirection();
  const rollInput = inputManager.getRollDirection();
  const rotBraking = inputManager.isRotBraking();

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

  if (!rotBraking && rotationAutoDamp) {
    if (yawInput === 0) angularVel.yaw *= ROT_DAMP;
    if (pitchInput === 0) angularVel.pitch *= ROT_DAMP;
    if (rollInput === 0) angularVel.roll *= ROT_DAMP;
  }

  angularVel.yaw = Math.min(MAX_ANGULAR_SPEED, Math.max(-MAX_ANGULAR_SPEED, angularVel.yaw));
  angularVel.pitch = Math.min(MAX_ANGULAR_SPEED, Math.max(-MAX_ANGULAR_SPEED, angularVel.pitch));
  angularVel.roll = Math.min(MAX_ANGULAR_SPEED, Math.max(-MAX_ANGULAR_SPEED, angularVel.roll));

  if (angularVel.yaw !== 0) {
    const up = rotateVectorByQuat([0, 1, 0], camera.q);
    camera.q = quatNormalize(quatMultiply(quatFromAxisAngle(up, angularVel.yaw * dt), camera.q));
  }
  if (angularVel.pitch !== 0) {
    const right = rotateVectorByQuat([1, 0, 0], camera.q);
    camera.q = quatNormalize(quatMultiply(quatFromAxisAngle(right, angularVel.pitch * dt), camera.q));
  }
  if (angularVel.roll !== 0) {
    const forward = rotateVectorByQuat([0, 0, -1], camera.q);
    camera.q = quatNormalize(quatMultiply(quatFromAxisAngle(forward, angularVel.roll * dt), camera.q));
  }

  const move = inputManager.getMoveDirection();
  if (move.x !== 0 || move.y !== 0 || move.z !== 0) {
    const worldAcc = rotateVectorByQuat([move.x, move.y, move.z], camera.q).map(v => v * acc * dt);
    camera.vx += worldAcc[0];
    camera.vy += worldAcc[1];
    camera.vz += worldAcc[2];
  }

  if (movementAutoBrake && move.x === 0 && move.y === 0 && move.z === 0 && !inputManager.isBraking()) {
    const autoDecel = constants.normBaseDecel * (settings.turboEnabled ? 8 : 1);
    const sp = Math.hypot(camera.vx, camera.vy, camera.vz);
    if (sp > 0) {
      const decelMag = autoDecel * dt;
      const newSp = Math.max(0, sp - decelMag);
      if (newSp === 0) camera.vx = camera.vy = camera.vz = 0;
      else {
        const factor = newSp / sp;
        camera.vx *= factor; camera.vy *= factor; camera.vz *= factor;
      }
    }
  }

  const sp = Math.hypot(camera.vx, camera.vy, camera.vz);
  if (sp > maxSpd) {
    const s = maxSpd / sp;
    camera.vx *= s; camera.vy *= s; camera.vz *= s;
  }

  if (inputManager.isBraking()) {
    const sv = [camera.vx, camera.vy, camera.vz];
    const sp = Math.hypot(...sv);
    if (sp > 0) {
      const dv = sv.map(v => -v / sp * decel * dt);
      const newV = [camera.vx + dv[0], camera.vy + dv[1], camera.vz + dv[2]];
      const newSp = Math.hypot(...newV);
      if (newSp > sp) camera.vx = camera.vy = camera.vz = 0;
      else { camera.vx = newV[0]; camera.vy = newV[1]; camera.vz = newV[2]; }
    }
  }

  camera.x += camera.vx * dt;
  camera.y += camera.vy * dt;
  camera.z += camera.vz * dt;
  camera.speed = Math.hypot(camera.vx, camera.vy, camera.vz);
}

export function project3D(x, y, z) {
  let dx = x - camera.x, dy = y - camera.y, dz = z - camera.z;
  const invQ = [-camera.q[0], -camera.q[1], -camera.q[2], camera.q[3]];
  [dx, dy, dz] = rotateVectorByQuat([dx, dy, dz], invQ);
  const scale = constants.FOV / (dz || 0.0001);
  return {
    x: ctx.canvas.width / 2 + dx * scale,
    y: ctx.canvas.height / 2 - dy * scale,
    visible: dz > 1,
    scale: scale
  };
}