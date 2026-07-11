// js/titleAnimator.js
// Gestor de animación del título de la pestaña

let animationInterval = null;
let originalTitle = document.title || 'Pginn';
let fadeState = null; // Estado global para el modo fade

// ===== ANIMACIONES DE SÍMBOLOS =====
const animations = {
  spinner:    { frames: ['|', '/', '-', '\\'], interval: 1000 },
  loading:    { frames: [',..', '.,.', '..,', '...'], interval: 1000 },
  moon:       { frames: ['🌑','🌒','🌓','🌔','🌕','🌖','🌗','🌘'], interval: 1000 },
  progress:   { frames: (() => { let r=[]; for(let i=0;i<=3;i++) r.push(`[${'='.repeat(i)}${'-'.repeat(3-i)}]`); return r; })(), interval: 1000 },
  trigram:    { frames: ['☰','☱','☳','☷','☶','☴'], interval: 1000 },
  clock:      { frames: ['◴','◷','◶','◵'], interval: 1000 },
  bar:        { frames: ['▁','▂','▃','▄','▅','▆','▇','█','▇','▆','▅','▄','▃','▂'], interval: 1000 },
  background: { frames: ['⠋','⠙','⠹','⠸','⠼','⠴','⠦','⠧','⠇','⠏'], interval: 1000 },
  globe:      { frames: ['🌍','🌎','🌏'], interval: 1000 },
  dots:       { frames: ['·','•','◦','◌',"'"], interval: 1000 },
  arrows:     { frames: ['↖','↑','↗','→','↘','↓','↙','←'], interval: 1000 },
  clock_emoji:{ frames: ['🕐','🕑','🕒','🕓','🕔','🕕','🕖','🕗','🕘','🕙','🕚','🕛'], interval: 1000 },
  bounce:     { frames: ['⣾','⣽','⣻','⢿','⡿','⣟','⣯','⣷'], interval: 1000 },
  dots_spinner:{ frames: [',','·',"'",'·'], interval: 1000 }
};

const animationTypes = Object.keys(animations);

// ===== SUFIJOS =====
const suffixes = [
  'Pginn en 2º plano', '"Volando"', 'Simulando el cosmos',
  'Explorando estrellas', 'Navegando interestelar', 'Sonda espacial activa',
  'En órbita profunda', 'Viaje sin fin', 'Astronave en curso',
  'Modo sigiloso', 'Exploración profunda', 'Velocidad de crucero',
  'Deriva interestelar'
];

// ===== MODOS DE TEXTO CON SUS PROPIOS INTERVALOS =====
const textModeDefaults = {
  rotate:     { interval: 1000, changeInterval: 5000 },
  typewriter: { interval: 150,  pauseBeforeRestart: 2000 },
  scroll:     { interval: 200,  windowSize: 10, speed: 0.3 },
  wipe:       { interval: 300,  speed: 0.05, blockChar: '█' },
  replace:    { interval: 1000, changeInterval: 3000 },
  fade:       { interval: 1000 },
  counter:    { interval: 500,  speed: 0.5 },
  none:       { interval: 1000 }
};

const textModes = Object.keys(textModeDefaults);

// ===== ANCHO FIJO (se calcula automáticamente) =====
const FIXED_TEXT_WIDTH = Math.max(...suffixes.map(s => s.length));

// ===== FUNCIONES AUXILIARES =====
function getRandom(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

// Aplica el ancho fijo usando espacios de no separación (\u00A0)
function applyFixedWidth(text) {
  return text.padEnd(FIXED_TEXT_WIDTH, '\u00A0');
}

// ===== FUNCIONES PÚBLICAS =====

/**
 * Inicia animación aleatoria
 * @param {string|null} suffix - Sufijo fijo (opcional)
 * @param {string|null} textMode - Modo de texto (opcional)
 * @param {number|null} customTextInterval - Intervalo personalizado (opcional)
 * @param {object|null} customParams - Parámetros extra (opcional)
 */
export function startRandomTitleAnimation(suffix = null, textMode = null, customTextInterval = null, customParams = null) {
  const type1 = getRandom(animationTypes);
  const type2 = getRandom(animationTypes);
  const finalSuffix = (suffix !== null) ? suffix : getRandom(suffixes);
  const finalMode = (textMode !== null) ? textMode : getRandom(textModes);
  startTitleAnimation(type1, type2, finalSuffix, finalMode, customTextInterval, customParams);
}

/**
 * Inicia la animación con control total
 * @param {string|null} type1 - Símbolo izquierdo
 * @param {string|null} type2 - Símbolo derecho
 * @param {string|null} suffix - Sufijo
 * @param {string} textMode - Modo de texto
 * @param {number|null} customTextInterval - Intervalo personalizado
 * @param {object|null} customParams - Parámetros extra
 */
export function startTitleAnimation(type1 = null, type2 = null, suffix = null, textMode = 'rotate', customTextInterval = null, customParams = null) {
  if (!type1) type1 = getRandom(animationTypes);
  if (!type2) type2 = getRandom(animationTypes);
  if (suffix === null) suffix = getRandom(suffixes);

  // Detener animación anterior y limpiar estado fade
  stopTitleAnimation(false);
  fadeState = null; // Reinicio explícito

  const anim1 = animations[type1];
  const anim2 = animations[type2];
  if (!anim1 || !anim2) {
    console.warn('Animación no encontrada, usando spinner.');
    return startTitleAnimation('spinner', 'spinner', suffix, textMode, customTextInterval, customParams);
  }

  // Intervalo de iconos (el menor)
  const iconInterval = Math.min(anim1.interval, anim2.interval);

  // Configuración del modo de texto
  const defaultConfig = textModeDefaults[textMode] || textModeDefaults.none;
  const textInterval = (customTextInterval !== null) ? customTextInterval : defaultConfig.interval;
  const params = { ...defaultConfig, ...(customParams || {}) };

  let idx1 = 0, idx2 = 0;
  const { frames: f1 } = anim1;
  const { frames: f2 } = anim2;

  // Estado del texto
  let textIndex = 0;
  let currentSuffix = suffix;
  let textTimer = 0;
  let wipeState = 0, wipeProgress = 0;
  let replaceIdx = 0;
  let counterVal = 0;
  let textAccum = 0;

  // ===== FUNCIÓN QUE GENERA EL TÍTULO COMPLETO =====
  function buildTitle(rawText) {
    const frame1 = f1[idx1 % f1.length];
    const frame2 = f2[idx2 % f2.length];
    const fixedText = applyFixedWidth(rawText);
    return `${frame1} ${fixedText} ${frame2}`;
  }

  animationInterval = setInterval(() => {
    // ===== AVANZAR ICONOS (siempre) =====
    idx1++;
    idx2++;

    // ===== ACTUALIZAR TEXTO (según su intervalo) =====
    textAccum += iconInterval;
    let updateText = (textAccum >= textInterval);
    if (updateText) textAccum = 0;

    let rawText = currentSuffix;

    if (updateText) {
      switch (textMode) {
        case 'rotate':
          textTimer += textInterval;
          if (textTimer >= (params.changeInterval || 5000)) {
            currentSuffix = getRandom(suffixes);
            textTimer = 0;
          }
          rawText = currentSuffix;
          break;

        case 'typewriter': {
          const full = suffix;
          const pause = params.pauseBeforeRestart || 2000;
          if (textIndex < full.length) {
            textTimer += textInterval;
            if (textTimer >= (params.speed || 150)) {
              textTimer = 0;
              textIndex++;
            }
            rawText = full.substring(0, textIndex);
          } else {
            textTimer += textInterval;
            if (textTimer >= pause) {
              textIndex = 0;
              textTimer = 0;
            }
            rawText = full;
          }
          break;
        }

        case 'scroll': {
          const pad = ' '.repeat(10);
          const txt = pad + suffix + pad;
          const maxOff = txt.length - (params.windowSize || 10);
          const off = Math.floor(textIndex % (maxOff + 1));
          rawText = txt.substring(off, off + (params.windowSize || 10));
          textIndex += (params.speed || 0.3);
          break;
        }

        case 'wipe': {
          const len = suffix.length;
          const block = params.blockChar || '█';
          const speed = params.speed || 0.05;
          if (wipeState === 0) {
            wipeProgress += speed;
            if (wipeProgress >= 1) { wipeProgress = 0; wipeState = 1; currentSuffix = getRandom(suffixes); }
            const reveal = Math.floor(wipeProgress * len);
            rawText = block.repeat(reveal) + suffix.substring(reveal);
          } else {
            wipeProgress += speed;
            if (wipeProgress >= 1) { wipeProgress = 0; wipeState = 0; }
            const reveal = Math.floor((1 - wipeProgress) * len);
            rawText = block.repeat(reveal) + currentSuffix.substring(reveal);
          }
          break;
        }

        case 'replace':
          textTimer += textInterval;
          if (textTimer >= (params.changeInterval || 3000)) {
            replaceIdx = (replaceIdx + 1) % suffixes.length;
            currentSuffix = suffixes[replaceIdx];
            textTimer = 0;
          }
          rawText = currentSuffix;
          break;

        // ===== MODO FADE MEJORADO (MÚLTIPLES SÍMBOLOS POR NIVEL) =====
        case 'fade': {
          // Inicializar fadeState si es null (o si cambió el sufijo)
          if (!fadeState || fadeState.originalText !== suffix) {
            const originalText = suffix;
            const chars = originalText.split('');
            fadeState = {
              originalText: originalText,
              originalChars: chars,
              levels: chars.map(() => 0),
              maxLevel: 5,
              phase: 'wait',
              waitCounter: 5,
              holdCounter: 0,
              step: 0,
              symbols: [
                ['#', '%', '&'],
                [';', ':', ','],
                ['·', '•', '◦'],
                ['.', '_', ' '],
                ['\u00A0']
              ]
            };
          }

          const fs = fadeState;
          const totalChars = fs.originalChars.length;
          let newChars = [];
          const allMax = fs.levels.every(l => l === fs.maxLevel);

          // Lógica de fases
          if (fs.phase === 'wait') {
            newChars = [...fs.originalChars];
            fs.waitCounter--;
            if (fs.waitCounter <= 0) {
              fs.phase = 'fading';
              fs.levels = fs.originalChars.map(() => 0);
              fs.step = 0;
            }
          } else if (fs.phase === 'fading') {
            if (allMax) {
              fs.phase = 'hold';
              fs.holdCounter = 3;
            } else {
              // Seleccionar un tercio de las letras que aún no están en nivel máximo
              const indices = [];
              for (let i = 0; i < totalChars; i++) {
                if (fs.levels[i] < fs.maxLevel) indices.push(i);
              }
              const shuffled = indices.sort(() => Math.random() - 0.5);
              const toChange = Math.max(1, Math.floor(shuffled.length * 0.33));
              for (let i = 0; i < Math.min(toChange, shuffled.length); i++) {
                const idx = shuffled[i];
                fs.levels[idx] = Math.min(fs.levels[idx] + 1, fs.maxLevel);
              }
              fs.step++;
            }
            // Construir el texto con selección aleatoria de símbolos por nivel
            newChars = fs.originalChars.map((ch, i) => {
              const lvl = fs.levels[i];
              if (lvl === 0) return ch;
              const possibleSymbols = fs.symbols[lvl - 1] || ['?'];
              return possibleSymbols[Math.floor(Math.random() * possibleSymbols.length)];
            });
          } else if (fs.phase === 'hold') {
            newChars = fs.originalChars.map(() => '\u00A0');
            fs.holdCounter--;
            if (fs.holdCounter <= 0) {
              fs.phase = 'wait';
              fs.waitCounter = 5;
              fs.levels = fs.originalChars.map(() => 0);
            }
          }

          rawText = newChars.join('');
          break;
        }

        case 'counter':
          counterVal += (params.speed || 0.5);
          rawText = `${Math.floor(counterVal)} ${suffix}`;
          break;

        default: // 'none'
          rawText = suffix;
      }
    }

    // ===== APLICAR ANCHO FIJO Y ACTUALIZAR TÍTULO =====
    const title = buildTitle(rawText);
    document.title = title;

  }, iconInterval);

  // Primera actualización inmediata
  document.title = buildTitle(suffix);
}

export function stopTitleAnimation(restore = true) {
  if (animationInterval) {
    clearInterval(animationInterval);
    animationInterval = null;
  }
  fadeState = null; // Limpiar estado al detener
  if (restore) document.title = originalTitle;
}

export function setOriginalTitle(title) { originalTitle = title; }