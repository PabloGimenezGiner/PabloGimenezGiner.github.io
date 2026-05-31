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

// Movement things
export const normAccMin = 8;
export const mouseWheelStep = normAccMin;
export const normAccMax     = normAccMin * 8;
// Turbo
export const turbAccMin     = normAccMin * 8;
export const turbAccMax     = normAccMax * 8;
// Deceleration
export const normBaseDecel  = normAccMax * 4;

// Proyección
export const FOV = 500;

// Chunks/stars
export const renderDistanceChunks = 8;
export const chunkSize = 8192;
export const starsPerChunk = 2;

// Constantes de los Cuaterniones
export const axis = [0, 1, 0];
export const angle = Math.PI / 2;
export const v = [1, 0, 0];

// Distancias para los niveles de detalle (LOD) de estrellas
export const LOD_NEAR_DIST = 3072;
export const LOD_MID_DIST  = 4096;

// Boost de brillo para estrellas cercanas (dist < LOD_NEAR_DIST)
export const nearStarBrightnessBoost = 1.8;
// Boost de brillo para estrellas de distancia media (entre LOD_NEAR_DIST y LOD_MID_DIST)
export const midStarBrightnessBoost = 1.8;
// Multiplicador de brillo extra para estrellas lejanas (≥ LOD_MID_DIST)
export const farStarBrightnessBoost = 2;

// Factor de brillo direccional por velocidad
export const directionalSpeedFactor = 0.1;
export const directionalMinBright = 0;
export const directionalMaxBright = 8;

// ========== NUEVAS CONSTANTES: TAMAÑOS DE PARTÍCULAS (ESTRELLAS) ==========
export const STAR_SIZE_NEAR = 9.0;      // radio del círculo para estrellas cercanas
export const STAR_SIZE_MID  = 16.0;      // lado del cuadrado para estrellas de distancia media
export const STAR_SIZE_FAR  = 1.0;      // factor base para estrellas lejanas
export const STAR_SIZE_FAR_MIN = 2.0;   // tamaño mínimo en píxeles para estrellas lejanas