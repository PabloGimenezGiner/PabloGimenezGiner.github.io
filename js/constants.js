// constants.js
export const constants = {
  // Posición inicial
  inicX: 0,
  inicY: 0,
  inicZ: -5000,
  inicVX: 0,
  inicVY: 0,
  inicVZ: 64,
  inicAccFactor: 64,
  inicTurboEnabled: false,

  // Movimiento
  normAccMin: 8,
  mouseWheelStep: 8,
  normAccMax: 64,
  turbAccMin: 64,
  turbAccMax: 512,
  normBaseDecel: 256,

  // Proyección
  FOV: 500,

  // Chunks
  renderDistanceChunks: 8,
  chunkSize: 8192,
  starsPerChunk: 2,

  // LOD
  LOD_NEAR_DIST: 3072,
  LOD_MID_DIST: 4096,

  // Brillos
  nearStarBrightnessBoost: 1.8,
  midStarBrightnessBoost: 1.8,
  farStarBrightnessBoost: 2,

  // Direccional
  directionalSpeedFactor: 0.1,
  directionalMinBright: 0,
  directionalMaxBright: 8,

  // Tamaños
  STAR_SIZE_NEAR: 9.0,
  STAR_SIZE_MID: 16.0,
  STAR_SIZE_FAR: 1.0,
  STAR_SIZE_FAR_MIN: 2.0,
};

// Función para restaurar valores por defecto (opcional)
export function resetConstantsToDefaults() {
  // No es necesario porque los valores están en el objeto, pero si quieres
  // puedes reasignar cada propiedad a su valor inicial.
  // Como es un objeto, podemos guardar una copia de los valores iniciales.
}