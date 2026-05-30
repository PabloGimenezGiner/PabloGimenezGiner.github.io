// Initial Parameters
// Escala inicial//
export const inicScalFactr = 2;
// Posicion inicial
export const inicX = 0;
export const inicY = 0;
export const inicZ = -5000;
// Velocidad inicial
export const inicVX = 0;
export const inicVY = 0;
export const inicVZ = 64;
// inicial constants
export const inicAccFactor = 64;
export const inicTurboEnabled = false;

// Chunks and Stars
export const chunkSize = 8192;
export const starsPerChunk = 2;

// Movement things
export const normAccMin = 8;
export const mouseWheelStep = normAccMin;
export const normAccMax     = normAccMin * 8;
// Turbo
export const turbAccMin     = normAccMin * 8;
export const turbAccMax     = normAccMax * 8;
// Deceleration
export const normBaseDecel  = normAccMax * 4;

// Constantes de los Cuaterniones
//1
export const axis = [0, 1, 0];
export const angle = Math.PI / 2;
//2
export const v = [1, 0, 0];

// Distancia de renderizado de chunks (radio en número de chunks desde la cámara)
export const renderDistanceChunks = 8;

// Distancias para los niveles de detalle (LOD) de estrellas
export const LOD_NEAR_DIST = 200;
export const LOD_MID_DIST  = 800;

// Factor de brillo direccional por velocidad
export const directionalSpeedFactor = 0.16;
export const directionalMinBright = 0;
export const directionalMaxBright = 8;

// Multiplicador de brillo extra para estrellas lejanas (≥ LOD_MID_DIST)
export const farStarBrightnessBoost = 1.2;

// Proyección
export const FOV = 500;