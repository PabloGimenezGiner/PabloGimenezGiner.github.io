
//Inic ial Parameters
//Escala inicial//
export const inicScalFactr = 2;
//Posicion inicial
export const inicX = 0;
export const inicY = 0;
export const inicZ = -5000;
//Velocidad inicial
export const inicVX = 0;
export const inicVY = 0;
export const inicVZ = 64;
//inicial constants
export const inicAccFactor = 64;
export const inicTurboEnabled = false;


//Chunks and Stars
export const chunkSize = 4096;
export const starsPerChunk = 256;

//Movement things
export const normAccMin = 8;
export const mouseWheelStep = normAccMin;
export const normAccMax     = normAccMin * 8;
//Turbo
export const turbAccMin     = normAccMin * 8;
export const turbAccMax     = normAccMax * 8;
//Deceleration
export const normBaseDecel  = normAccMax * 4;

//Constantes de los Cuaterniones
//1
export const axis = [0, 1, 0];
export const angle = Math.PI / 2;
//2
export const v = [1, 0, 0];

