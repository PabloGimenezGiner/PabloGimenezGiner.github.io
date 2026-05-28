import { inicX, inicY, inicZ, inicVX, inicVY, 
inicVZ, inicTurboEnabled, inicAccFactor, inicScalFactr } from './constants';

//Algunas variables
export let scaleFactor = inicScalFactr;
//
export let camera = {
  x: inicX, y: inicY, z: inicZ, q: [0, 0, 0, 1],
  vx: inicVX, vy: inicVY, vz: inicVZ, speed: 0
};
export let keys = {};
export let turboEnabled = inicTurboEnabled;
export let accFactor = inicAccFactor;
export let chunks = {};
