export function quatFromAxisAngle(axis, angle) {
  const half = angle / 2;
  const s = Math.sin(half);
  return [axis[0] * s, axis[1] * s, axis[2] * s, Math.cos(half)];
}
//Multiply
export function quatMulti(a, b) {
  const [ax, ay, az, aw] = a;
  const [bx, by, bz, bw] = b;
  return [
    aw*bx + ax*bw + ay*bz - az*by,
    aw*by - ax*bz + ay*bw + az*bx,
    aw*bz + ax*by - ay*bx + az*bw,
    aw*bw - ax*bx - ay*by - az*bz
  ];
}
//Normalize
export function quatNorma(q) {
  const [x,y,z,w] = q;
  const len = Math.hypot(x,y,z,w) || 1;
  return [x/len, y/len, z/len, w/len];
}
//RotateVector
export function rotetVectByQuat(v, q) {
  const [qx,qy,qz,qw] = q;
  const [vx,vy,vz] = v;
  const tx = 2*(qy*vz - qz*vy);
  const ty = 2*(qz*vx - qx*vz);
  const tz = 2*(qx*vy - qy*vx);
  return [
    vx + qw*tx + (qy*tz - qz*ty),
    vy + qw*ty + (qz*tx - qx*tz),
    vz + qw*tz + (qx*ty - qy*tx)
  ];
}