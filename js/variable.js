import { inicX, inicY, inicZ, inicVX, inicVY, inicVZ, inicTurboEnabled, inicAccFactor } from './constants.js';

export let camera = {
  x: inicX, y: inicY, z: inicZ, q: [0,0,0,1],
  vx: inicVX, vy: inicVY, vz: inicVZ, speed: 0
};

export const settings = {
  turboEnabled: inicTurboEnabled,
  accFactor: inicAccFactor
};

export let chunks = {};