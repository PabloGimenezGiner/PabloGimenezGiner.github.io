// ui/windows/settingsWindow.js
import { constants } from '../../constants.js';
import { saveConstants, resetConstantsToDefaults } from '../../core/persistence.js';
import pathManager from '../../render/path/pathManager.js';
import { runInBackground, setRunInBackground } from '../../core/gameState.js';

// ===== Generar campos de entrada para constantes =====
function generateInputs() {
  const sections = [
    {
      title: '🚀 Movimiento',
      keys: [
        'inicVZ', 'inicAccFactor', 'normAccMin', 'normAccMax',
        'turbAccMin', 'turbAccMax', 'normBaseDecel'
      ]
    },
    {
      title: '🎨 Renderizado',
      keys: ['FOV', 'renderDistanceChunks', 'chunkSize', 'starsPerChunk']
    },
    {
      title: '📏 LOD (Niveles de detalle)',
      keys: ['LOD_NEAR_DIST', 'LOD_MID_DIST']
    },
    {
      title: '☀️ Brillo de estrellas',
      keys: ['nearStarBrightnessBoost', 'midStarBrightnessBoost', 'farStarBrightnessBoost']
    },
    {
      title: '🧭 Brillo direccional',
      keys: ['directionalSpeedFactor', 'directionalMinBright', 'directionalMaxBright']
    },
    {
      title: '📐 Tamaño de estrellas',
      keys: ['STAR_SIZE_NEAR', 'STAR_SIZE_MID', 'STAR_SIZE_FAR', 'STAR_SIZE_FAR_MIN']
    }
  ];

  let html = '';
  for (const section of sections) {
    html += `<h4 style="margin:16px 0 8px 0; color:#ccc;">${section.title}</h4>`;
    for (const key of section.keys) {
      const value = constants[key];
      const step = (typeof value === 'number' && !Number.isInteger(value)) ? '0.1' : '1';
      const min = (key.includes('Min') || key.includes('_MIN')) ? '0' : '1';
      const max = (key.includes('Max') || key.includes('_MAX')) ? '9999' : '9999';
      html += `
        <div style="display:flex; align-items:center; margin:4px 0;">
          <label style="width:180px; font-size:13px; color:#aaa;">${key}</label>
          <input type="number" id="const-${key}" value="${value}" step="${step}" min="${min}" max="${max}"
                 style="flex:1; padding:4px 8px; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.15); border-radius:4px; color:#fff; font-family:monospace; font-size:13px;">
        </div>
      `;
    }
  }
  return html;
}

// ===== Render principal =====
export function renderSettings() {
  const p = pathManager;

  return `
    <h3 style="margin-top:0; margin-bottom:16px;">⚙️ Ajustes avanzados</h3>
    <div>
      ${generateInputs()}

      <hr style="border-color: rgba(255,255,255,0.08); margin: 16px 0;">

      <h4 style="margin:16px 0 8px 0; color:#ccc;">⚡ Rendimiento</h4>
      <div style="display:flex; align-items:center; margin:4px 0;">
        <label style="width:180px; font-size:13px; color:#aaa;">Ejecutar en 2º plano</label>
        <input type="checkbox" id="run-background" ${runInBackground ? 'checked' : ''}
               style="width:20px; height:20px; cursor:pointer;">
      </div>
      <div style="font-size:11px; color:#666; margin-left:180px; margin-top:-2px; margin-bottom:8px;">
        ⚠️ El navegador limita los temporizadores en segundo plano (~1s entre ticks)
      </div>

      <hr style="border-color: rgba(255,255,255,0.08); margin: 16px 0;">

      <h4 style="margin:16px 0 8px 0; color:#ccc;">📍 Sistema de ruta</h4>

      <!-- Activación y visibilidad -->
      <div style="display:flex; align-items:center; margin:4px 0;">
        <label style="width:180px; font-size:13px; color:#aaa;">Activar ruta</label>
        <input type="checkbox" id="path-enabled" ${p.enabled ? 'checked' : ''}
               style="width:20px; height:20px; cursor:pointer;">
      </div>
      <div style="display:flex; align-items:center; margin:4px 0;">
        <label style="width:180px; font-size:13px; color:#aaa;">Mostrar ruta</label>
        <input type="checkbox" id="path-visible" ${p.visible ? 'checked' : ''}
               style="width:20px; height:20px; cursor:pointer;">
      </div>
      <div style="display:flex; align-items:center; margin:4px 0;">
        <label style="width:180px; font-size:13px; color:#aaa;">Ruta persistente</label>
        <input type="checkbox" id="path-persistent" ${p.persistent ? 'checked' : ''}
               style="width:20px; height:20px; cursor:pointer;">
      </div>

      <!-- Filtro de aceptación -->
      <div style="display:flex; align-items:center; margin:4px 0;">
        <label style="width:180px; font-size:13px; color:#aaa;">Distancia base</label>
        <input type="number" id="path-basedist" value="${p.baseDist}" min="0.1" max="100" step="0.5"
               style="flex:1; padding:4px 8px; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.15); border-radius:4px; color:#fff; font-family:monospace; font-size:13px;">
      </div>
      <div style="display:flex; align-items:center; margin:4px 0;">
        <label style="width:180px; font-size:13px; color:#aaa;">Factor velocidad</label>
        <input type="number" id="path-speedfactor" value="${p.speedFactor}" min="0" max="1" step="0.05"
               style="flex:1; padding:4px 8px; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.15); border-radius:4px; color:#fff; font-family:monospace; font-size:13px;">
      </div>
      <div style="display:flex; align-items:center; margin:4px 0;">
        <label style="width:180px; font-size:13px; color:#aaa;">Umbral ángulo (coseno)</label>
        <input type="number" id="path-anglethreshold" value="${p.angleThreshold}" min="0.5" max="1" step="0.01"
               style="flex:1; padding:4px 8px; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.15); border-radius:4px; color:#fff; font-family:monospace; font-size:13px;">
        <span style="font-size:10px; color:#666; margin-left:6px;">(1=recto, 0=giro 90°)</span>
      </div>
      <div style="display:flex; align-items:center; margin:4px 0;">
        <label style="width:180px; font-size:13px; color:#aaa;">Intervalo mínimo (ms)</label>
        <input type="number" id="path-mintime" value="${p.minTimeBetweenPoints}" min="10" max="500" step="10"
               style="flex:1; padding:4px 8px; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.15); border-radius:4px; color:#fff; font-family:monospace; font-size:13px;">
      </div>

      <!-- LOD de renderizado -->
      <h5 style="margin:12px 0 6px 0; color:#888;">Nivel de detalle (LOD) en renderizado</h5>
      <div style="display:flex; align-items:center; margin:4px 0;">
        <label style="width:180px; font-size:13px; color:#aaa;">Subdiv. máximas (cerca)</label>
        <input type="number" id="path-lodmaxsubdivs" value="${p.lodMaxSubdivs}" min="2" max="40" step="1"
               style="flex:1; padding:4px 8px; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.15); border-radius:4px; color:#fff; font-family:monospace; font-size:13px;">
      </div>
      <div style="display:flex; align-items:center; margin:4px 0;">
        <label style="width:180px; font-size:13px; color:#aaa;">Subdiv. mínimas (lejos)</label>
        <input type="number" id="path-lodminsubdivs" value="${p.lodMinSubdivs}" min="1" max="20" step="1"
               style="flex:1; padding:4px 8px; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.15); border-radius:4px; color:#fff; font-family:monospace; font-size:13px;">
      </div>
      <div style="display:flex; align-items:center; margin:4px 0;">
        <label style="width:180px; font-size:13px; color:#aaa;">Distancia máxima LOD</label>
        <input type="number" id="path-lodmaxdist" value="${p.lodMaxDist}" min="100" max="50000" step="100"
               style="flex:1; padding:4px 8px; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.15); border-radius:4px; color:#fff; font-family:monospace; font-size:13px;">
      </div>

      <!-- Simplificación Douglas-Peucker -->
      <h5 style="margin:12px 0 6px 0; color:#888;">Simplificación (Douglas-Peucker)</h5>
      <div style="display:flex; align-items:center; margin:4px 0;">
        <label style="width:180px; font-size:13px; color:#aaa;">Activar simplificación</label>
        <input type="checkbox" id="path-simplify-enable" ${p.simplifyEnabled ? 'checked' : ''}
               style="width:20px; height:20px; cursor:pointer;">
      </div>
      <div style="display:flex; align-items:center; margin:4px 0;">
        <label style="width:180px; font-size:13px; color:#aaa;">Tolerancia</label>
        <input type="number" id="path-simplify-tolerance" value="${p.simplifyTolerance}" min="0" max="10" step="0.1"
               style="flex:1; padding:4px 8px; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.15); border-radius:4px; color:#fff; font-family:monospace; font-size:13px;"
               ${p.simplifyEnabled ? '' : 'disabled'}>
      </div>
      <div style="display:flex; align-items:center; margin:4px 0;">
        <label style="width:180px; font-size:13px; color:#aaa;">Ventana de puntos</label>
        <input type="number" id="path-simplify-window" value="${p.simplifyWindow}" min="0" max="500" step="10"
               style="flex:1; padding:4px 8px; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.15); border-radius:4px; color:#fff; font-family:monospace; font-size:13px;">
        <span style="font-size:10px; color:#666; margin-left:6px;">(0 = aplicar a toda la ruta)</span>
      </div>

      <!-- Botón borrar ruta -->
      <button id="path-clear" style="margin-top:10px; padding:8px 12px; background:rgba(200,100,100,0.2); border:1px solid rgba(200,100,100,0.3); border-radius:8px; color:#fff; font-family:inherit; font-size:13px; cursor:pointer;">
        🗑️ Borrar ruta
      </button>
    </div>

    <hr style="border-color: rgba(255,255,255,0.08); margin: 16px 0;">

    <div style="display:flex; gap:10px;">
      <button id="settings-apply" style="flex:2; padding:10px; background:rgba(100,200,100,0.2); border:1px solid rgba(100,200,100,0.3); border-radius:8px; color:#fff; font-family:inherit; font-size:14px; cursor:pointer; transition:background 0.2s;">
        💾 Aplicar y guardar
      </button>
      <button id="settings-reset" style="flex:1; padding:10px; background:rgba(200,100,100,0.2); border:1px solid rgba(200,100,100,0.3); border-radius:8px; color:#fff; font-family:inherit; font-size:14px; cursor:pointer; transition:background 0.2s;">
        🔄 Restaurar
      </button>
    </div>
    <div id="settings-feedback" style="margin-top:10px; text-align:center; font-size:13px; color:#4f4; opacity:0; transition:opacity 0.3s;"></div>
  `;
}

// ===== Configurar eventos =====
export function setupSettingsEvents(container, onApply) {
  const applyBtn = container.querySelector('#settings-apply');
  const resetBtn = container.querySelector('#settings-reset');
  const feedback = container.querySelector('#settings-feedback');

  // Referencias a controles de ruta
  const pathEnabled = container.querySelector('#path-enabled');
  const pathVisible = container.querySelector('#path-visible');
  const pathPersistent = container.querySelector('#path-persistent');
  const pathBaseDist = container.querySelector('#path-basedist');
  const pathSpeedFactor = container.querySelector('#path-speedfactor');
  const pathAngleThreshold = container.querySelector('#path-anglethreshold');
  const pathMinTime = container.querySelector('#path-mintime');
  const pathLodMaxSubdivs = container.querySelector('#path-lodmaxsubdivs');
  const pathLodMinSubdivs = container.querySelector('#path-lodminsubdivs');
  const pathLodMaxDist = container.querySelector('#path-lodmaxdist');
  const pathSimplifyEnable = container.querySelector('#path-simplify-enable');
  const pathSimplifyTolerance = container.querySelector('#path-simplify-tolerance');
  const pathSimplifyWindow = container.querySelector('#path-simplify-window');
  const pathClear = container.querySelector('#path-clear');

  // Control de habilitación del campo tolerancia (vinculado al checkbox)
  if (pathSimplifyEnable && pathSimplifyTolerance) {
    pathSimplifyEnable.addEventListener('change', () => {
      pathSimplifyTolerance.disabled = !pathSimplifyEnable.checked;
    });
  }

  // Si se activa persistente, forzar visibilidad
  if (pathPersistent) {
    pathPersistent.addEventListener('change', () => {
      if (pathPersistent.checked && pathVisible) {
        pathVisible.checked = true;
      }
    });
  }

  // Botón borrar ruta
  if (pathClear) {
    pathClear.addEventListener('click', () => {
      pathManager.clear();
      feedback.textContent = '🗑️ Ruta borrada';
      feedback.style.opacity = '1';
      setTimeout(() => { feedback.style.opacity = '0'; }, 1500);
    });
  }

  // Botón Aplicar
  if (applyBtn) {
    applyBtn.addEventListener('click', () => {
      // ---- 1. Actualizar constantes ----
      const inputs = container.querySelectorAll('input[id^="const-"]');
      let changedConstants = false;
      inputs.forEach(input => {
        const key = input.id.replace('const-', '');
        if (key in constants) {
          const val = parseFloat(input.value);
          if (!isNaN(val) && constants[key] !== val) {
            constants[key] = val;
            changedConstants = true;
          }
        }
      });

      // ---- 2. Actualizar parámetros de ruta ----
      const p = pathManager;
      let changedPath = false;

      const setIfChanged = (setter, value) => {
        if (value !== undefined && !isNaN(value)) {
          setter(value);
          changedPath = true;
        }
      };

      if (pathEnabled) p.setEnabled(pathEnabled.checked);
      if (pathVisible) p.setVisible(pathVisible.checked);
      if (pathPersistent) p.setPersistent(pathPersistent.checked);

      if (pathBaseDist) setIfChanged(p.setBaseDist.bind(p), parseFloat(pathBaseDist.value));
      if (pathSpeedFactor) setIfChanged(p.setSpeedFactor.bind(p), parseFloat(pathSpeedFactor.value));
      if (pathAngleThreshold) setIfChanged(p.setAngleThreshold.bind(p), parseFloat(pathAngleThreshold.value));
      if (pathMinTime) setIfChanged(p.setMinTimeBetweenPoints.bind(p), parseInt(pathMinTime.value));
      if (pathLodMaxSubdivs) setIfChanged(p.setLodMaxSubdivs.bind(p), parseInt(pathLodMaxSubdivs.value));
      if (pathLodMinSubdivs) setIfChanged(p.setLodMinSubdivs.bind(p), parseInt(pathLodMinSubdivs.value));
      if (pathLodMaxDist) setIfChanged(p.setLodMaxDist.bind(p), parseFloat(pathLodMaxDist.value));

      // Simplificación
      if (pathSimplifyEnable) {
        p.setSimplifyEnabled(pathSimplifyEnable.checked);
        changedPath = true;
      }
      if (pathSimplifyTolerance) {
        const val = parseFloat(pathSimplifyTolerance.value);
        if (!isNaN(val) && val >= 0) {
          p.setSimplifyTolerance(val);
          changedPath = true;
        }
      }
      if (pathSimplifyWindow) {
        const val = parseInt(pathSimplifyWindow.value);
        if (!isNaN(val) && val >= 0) {
          p.setSimplifyWindow(val);
          changedPath = true;
        }
      }

      // ---- 3. Ejecución en segundo plano ----
      const runBg = container.querySelector('#run-background');
      if (runBg) {
        setRunInBackground(runBg.checked);
      }

      // ---- 4. Guardar y notificar ----
      if (changedConstants) {
        saveConstants();
        if (onApply) onApply();
      }

      if (changedConstants || changedPath) {
        feedback.textContent = '✅ Ajustes aplicados y guardados';
        feedback.style.opacity = '1';
        setTimeout(() => { feedback.style.opacity = '0'; }, 2000);
        console.log('Constantes y parámetros de ruta actualizados');
      } else {
        feedback.textContent = 'ℹ️ No se detectaron cambios';
        feedback.style.opacity = '1';
        setTimeout(() => { feedback.style.opacity = '0'; }, 1500);
      }
    });
  }

  // Botón Restaurar (constantes + ruta)
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      if (confirm('¿Restaurar todas las constantes y parámetros de ruta a sus valores por defecto?')) {
        // 1. Restaurar constantes del juego
        resetConstantsToDefaults();
        // 2. Restaurar parámetros de ruta
        pathManager.resetToDefaults();

        // 3. Actualizar campos de constantes en la UI
        const inputs = container.querySelectorAll('input[id^="const-"]');
        inputs.forEach(input => {
          const key = input.id.replace('const-', '');
          if (key in constants) {
            input.value = constants[key];
          }
        });

        // 4. Actualizar campos de la ruta
        const p = pathManager;
        const pathFields = {
          'path-enabled': p.enabled,
          'path-visible': p.visible,
          'path-persistent': p.persistent,
          'path-basedist': p.baseDist,
          'path-speedfactor': p.speedFactor,
          'path-anglethreshold': p.angleThreshold,
          'path-mintime': p.minTimeBetweenPoints,
          'path-lodmaxsubdivs': p.lodMaxSubdivs,
          'path-lodminsubdivs': p.lodMinSubdivs,
          'path-lodmaxdist': p.lodMaxDist,
          'path-simplify-enable': p.simplifyEnabled,
          'path-simplify-tolerance': p.simplifyTolerance,
          'path-simplify-window': p.simplifyWindow,
        };
        Object.entries(pathFields).forEach(([id, value]) => {
          const el = container.querySelector(`#${id}`);
          if (el) {
            if (el.type === 'checkbox') {
              el.checked = value;
            } else {
              el.value = value;
            }
          }
        });
        // Actualizar estado del campo tolerancia (habilitado/deshabilitado)
        const simplifyEnable = container.querySelector('#path-simplify-enable');
        const simplifyTolerance = container.querySelector('#path-simplify-tolerance');
        if (simplifyEnable && simplifyTolerance) {
          simplifyTolerance.disabled = !simplifyEnable.checked;
        }

        if (onApply) onApply();
        feedback.textContent = '🔄 Constantes y parámetros de ruta restaurados';
        feedback.style.opacity = '1';
        setTimeout(() => { feedback.style.opacity = '0'; }, 2000);
        console.log('Constantes y parámetros de ruta restaurados a valores por defecto');
      }
    });
  }
}