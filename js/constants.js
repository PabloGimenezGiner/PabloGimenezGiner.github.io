// constants.js
// ============================================================
//  CONFIGURACIÓN CENTRAL DEL JUEGO
//  Todas las constantes están agrupadas por ámbito.
//  Las propiedades son mutables (se modifican desde el menú de Opciones).
// ============================================================

export const CONFIG = {

  // ---- FÍSICA Y MOVIMIENTO ----
  physics: {
    // Posición y velocidad iniciales
    initialPosition: { x: 0, y: 0, z: -5000 },
    initialVelocity: { x: 0, y: 0, z: 64 },
    initialAccelerationFactor: 64,
    initialTurboEnabled: false,

    // Rotación
    rotationAcceleration: 4.0,          // ROT_ACC
    rotationDamping: 0.96,              // ROT_DAMP
    rotationBrakeForce: 8.0,            // ROT_BRAKE_FORCE
    maxAngularSpeed: 6.0,               // MAX_ANGULAR_SPEED

    // Aceleración lineal (normal y turbo)
    normalAccelerationRange: { min: 8, max: 64 },
    turboAccelerationRange: { min: 64, max: 512 },
    mouseWheelStep: 8,

    // Desaceleración (frenado)
    baseDeceleration: 256,              // normBaseDecel
  },

  // ---- RENDERIZADO Y MUNDO ----
  rendering: {
    fov: 500,                           // FOV
    chunkSize: 8192,
    renderDistanceChunks: 8,
    starsPerChunk: 2,

    // Distancias de LOD
    lodNearDistance: 3072,              // LOD_NEAR_DIST
    lodMidDistance: 4096,               // LOD_MID_DIST
  },

  // ---- ESTRELLAS (tamaños y brillos) ----
  stars: {
    sizeNear: 9.0,
    sizeMid: 16.0,
    sizeFar: 1.0,
    sizeFarMin: 2.0,

    brightnessNearBoost: 1.8,
    brightnessMidBoost: 1.8,
    brightnessFarBoost: 2.0,
  },

  // ---- ILUMINACIÓN DIRECCIONAL (por velocidad) ----
  directional: {
    speedFactor: 0.1,                   // directionalSpeedFactor
    minBrightness: 0,                   // directionalMinBright
    maxBrightness: 8,                   // directionalMaxBright
  },
};

// ============================================================
//  COMPATIBILIDAD CON EL CÓDIGO ANTIGUO (migración gradual)
//  Mantenemos un objeto `constants` que redirige a CONFIG
//  para no tener que modificar todos los archivos de golpe.
// ============================================================

export const constants = {
  // Posición inicial
  get inicX() { return CONFIG.physics.initialPosition.x; },
  set inicX(v) { CONFIG.physics.initialPosition.x = v; },
  get inicY() { return CONFIG.physics.initialPosition.y; },
  set inicY(v) { CONFIG.physics.initialPosition.y = v; },
  get inicZ() { return CONFIG.physics.initialPosition.z; },
  set inicZ(v) { CONFIG.physics.initialPosition.z = v; },

  // Velocidad inicial
  get inicVX() { return CONFIG.physics.initialVelocity.x; },
  set inicVX(v) { CONFIG.physics.initialVelocity.x = v; },
  get inicVY() { return CONFIG.physics.initialVelocity.y; },
  set inicVY(v) { CONFIG.physics.initialVelocity.y = v; },
  get inicVZ() { return CONFIG.physics.initialVelocity.z; },
  set inicVZ(v) { CONFIG.physics.initialVelocity.z = v; },

  get inicAccFactor() { return CONFIG.physics.initialAccelerationFactor; },
  set inicAccFactor(v) { CONFIG.physics.initialAccelerationFactor = v; },

  get inicTurboEnabled() { return CONFIG.physics.initialTurboEnabled; },
  set inicTurboEnabled(v) { CONFIG.physics.initialTurboEnabled = v; },

  // Rango normal
  get normAccMin() { return CONFIG.physics.normalAccelerationRange.min; },
  set normAccMin(v) { CONFIG.physics.normalAccelerationRange.min = v; },
  get normAccMax() { return CONFIG.physics.normalAccelerationRange.max; },
  set normAccMax(v) { CONFIG.physics.normalAccelerationRange.max = v; },

  // Rango turbo
  get turbAccMin() { return CONFIG.physics.turboAccelerationRange.min; },
  set turbAccMin(v) { CONFIG.physics.turboAccelerationRange.min = v; },
  get turbAccMax() { return CONFIG.physics.turboAccelerationRange.max; },
  set turbAccMax(v) { CONFIG.physics.turboAccelerationRange.max = v; },

  get mouseWheelStep() { return CONFIG.physics.mouseWheelStep; },
  set mouseWheelStep(v) { CONFIG.physics.mouseWheelStep = v; },

  get normBaseDecel() { return CONFIG.physics.baseDeceleration; },
  set normBaseDecel(v) { CONFIG.physics.baseDeceleration = v; },

  // Renderizado
  get FOV() { return CONFIG.rendering.fov; },
  set FOV(v) { CONFIG.rendering.fov = v; },

  get chunkSize() { return CONFIG.rendering.chunkSize; },
  set chunkSize(v) { CONFIG.rendering.chunkSize = v; },

  get renderDistanceChunks() { return CONFIG.rendering.renderDistanceChunks; },
  set renderDistanceChunks(v) { CONFIG.rendering.renderDistanceChunks = v; },

  get starsPerChunk() { return CONFIG.rendering.starsPerChunk; },
  set starsPerChunk(v) { CONFIG.rendering.starsPerChunk = v; },

  get LOD_NEAR_DIST() { return CONFIG.rendering.lodNearDistance; },
  set LOD_NEAR_DIST(v) { CONFIG.rendering.lodNearDistance = v; },

  get LOD_MID_DIST() { return CONFIG.rendering.lodMidDistance; },
  set LOD_MID_DIST(v) { CONFIG.rendering.lodMidDistance = v; },

  // Tamaños de estrellas
  get STAR_SIZE_NEAR() { return CONFIG.stars.sizeNear; },
  set STAR_SIZE_NEAR(v) { CONFIG.stars.sizeNear = v; },
  get STAR_SIZE_MID() { return CONFIG.stars.sizeMid; },
  set STAR_SIZE_MID(v) { CONFIG.stars.sizeMid = v; },
  get STAR_SIZE_FAR() { return CONFIG.stars.sizeFar; },
  set STAR_SIZE_FAR(v) { CONFIG.stars.sizeFar = v; },
  get STAR_SIZE_FAR_MIN() { return CONFIG.stars.sizeFarMin; },
  set STAR_SIZE_FAR_MIN(v) { CONFIG.stars.sizeFarMin = v; },

  // Brillos
  get nearStarBrightnessBoost() { return CONFIG.stars.brightnessNearBoost; },
  set nearStarBrightnessBoost(v) { CONFIG.stars.brightnessNearBoost = v; },
  get midStarBrightnessBoost() { return CONFIG.stars.brightnessMidBoost; },
  set midStarBrightnessBoost(v) { CONFIG.stars.brightnessMidBoost = v; },
  get farStarBrightnessBoost() { return CONFIG.stars.brightnessFarBoost; },
  set farStarBrightnessBoost(v) { CONFIG.stars.brightnessFarBoost = v; },

  // Direccional
  get directionalSpeedFactor() { return CONFIG.directional.speedFactor; },
  set directionalSpeedFactor(v) { CONFIG.directional.speedFactor = v; },
  get directionalMinBright() { return CONFIG.directional.minBrightness; },
  set directionalMinBright(v) { CONFIG.directional.minBrightness = v; },
  get directionalMaxBright() { return CONFIG.directional.maxBrightness; },
  set directionalMaxBright(v) { CONFIG.directional.maxBrightness = v; },
};

// Función para restaurar valores por defecto (solo si es necesario)
export function resetConstantsToDefaults() {
  // Reescribimos CONFIG con los valores iniciales (se puede hacer un deep clone)
  // Pero como tenemos getters/setters, basta con reasignar las propiedades.
  // Para simplificar, volvemos a importar los valores iniciales de un objeto "default".
  // NOTA: Esto es un ejemplo, en la práctica podemos guardar un clon de los valores iniciales.
  const defaults = {
    physics: {
      initialPosition: { x: 0, y: 0, z: -5000 },
      initialVelocity: { x: 0, y: 0, z: 64 },
      initialAccelerationFactor: 64,
      initialTurboEnabled: false,
      rotationAcceleration: 4.0,
      rotationDamping: 0.96,
      rotationBrakeForce: 8.0,
      maxAngularSpeed: 6.0,
      normalAccelerationRange: { min: 8, max: 64 },
      turboAccelerationRange: { min: 64, max: 512 },
      mouseWheelStep: 8,
      baseDeceleration: 256,
    },
    rendering: {
      fov: 500,
      chunkSize: 8192,
      renderDistanceChunks: 8,
      starsPerChunk: 2,
      lodNearDistance: 3072,
      lodMidDistance: 4096,
    },
    stars: {
      sizeNear: 9.0,
      sizeMid: 16.0,
      sizeFar: 1.0,
      sizeFarMin: 2.0,
      brightnessNearBoost: 1.8,
      brightnessMidBoost: 1.8,
      brightnessFarBoost: 2.0,
    },
    directional: {
      speedFactor: 0.1,
      minBrightness: 0,
      maxBrightness: 8,
    },
  };

  // Asignar profundamente
  Object.assign(CONFIG.physics, defaults.physics);
  Object.assign(CONFIG.rendering, defaults.rendering);
  Object.assign(CONFIG.stars, defaults.stars);
  Object.assign(CONFIG.directional, defaults.directional);

  console.log('🔁 Constantes restauradas a valores por defecto');
}