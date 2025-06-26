import { NORMAL_ACC_MIN, WHEEL_STEP, NORMAL_ACC_MAX, TURBO_ACC_MIN, 
TURBO_ACC_MAX, BASE_DECEL, camera, keys, turboEnabled, accFactor} from './variables.js';

export function setupInputs(canvas) {
  document.addEventListener("keydown", e => { keys[e.code] = true; });
  document.addEventListener("keyup", e => { keys[e.code] = false; });

  canvas.addEventListener("click", () => canvas.requestPointerLock());

  canvas.addEventListener("mousedown", e => {
    if (e.button === 1) {
      turboEnabled = !turboEnabled;
      accFactor = turboEnabled
        ? Math.min(TURBO_ACC_MAX, accFactor * 8)
        : Math.max(NORMAL_ACC_MIN, accFactor / 8);
    }
  });

  canvas.addEventListener("wheel", e => {
  e.preventDefault();
  const delta = -Math.sign(e.deltaY);
  const step = turboEnabled ? WHEEL_STEP * 8 : WHEEL_STEP;
  accFactor += delta * step;
  const min = turboEnabled ? TURBO_ACC_MIN : NORMAL_ACC_MIN;
  const max = turboEnabled ? TURBO_ACC_MAX : NORMAL_ACC_MAX;
  accFactor = Math.max(min, Math.min(max, accFactor));
  }, { passive: false });

  document.addEventListener("pointerlockchange", () => {
    if (document.pointerLockElement === canvas) {
      document.addEventListener("mousemove", onMouseMove);
    } else {
      document.removeEventListener("mousemove", onMouseMove);
    }
  });

  
}

let onMouseMove;
export function setMouseMoveHandler(handler) {
  onMouseMove = handler;
}

export function mouseMove(e) {
  const sens = 0.002;
  const up    = rotateVectorByQuat([0,1,0], camera.q);
  const right = rotateVectorByQuat([1,0,0], camera.q);
  const yawQ   = quatFromAxisAngle(up,    e.movementX * sens);
  const pitchQ = quatFromAxisAngle(right, e.movementY * sens);
  camera.q = quatNormalize(quatMultiply(pitchQ, quatMultiply(yawQ, camera.q)));
  }