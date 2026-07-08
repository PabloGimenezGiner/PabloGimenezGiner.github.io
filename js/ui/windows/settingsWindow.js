// ui/windows/settingsWindow.js
import {
  constants
} from '../../constants.js';
import { saveConstants, resetConstantsToDefaults } from '../../core/persistence.js';
import pathManager from '../../render/path/pathManager.js';

// Función para generar campos de entrada para constantes
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

export function renderSettings() {
  // Determinar si la simplificación está activa (tolerance > 0)
  const simplifyActive = pathManager.simplifyTolerance > 0;
  const simplifyValue = pathManager.simplifyTolerance;

  return `
    <h3 style="margin-top:0; margin-bottom:16px;">⚙️ Ajustes avanzados</h3>
    <div style="padding-right:4px;">
      ${generateInputs()}
      
      <hr style="border-color: rgba(255,255,255,0.08); margin: 16px 0;">
      
      <h4 style="margin:16px 0 8px 0; color:#ccc;">📍 Registro de ruta (optimizado)</h4>
      <div style="display:flex; align-items:center; margin:4px 0;">
        <label style="width:180px; font-size:13px; color:#aaa;">Activar ruta</label>
        <input type="checkbox" id="path-enabled" ${pathManager.enabled ? 'checked' : ''}
               style="width:20px; height:20px; cursor:pointer;">
      </div>
      <div style="display:flex; align-items:center; margin:4px 0;">
        <label style="width:180px; font-size:13px; color:#aaa;">Mostrar ruta</label>
        <input type="checkbox" id="path-visible" ${pathManager.visible ? 'checked' : ''}
               style="width:20px; height:20px; cursor:pointer;">
      </div>
      <div style="display:flex; align-items:center; margin:4px 0;">
        <label style="width:180px; font-size:13px; color:#aaa;">Ruta persistente</label>
        <input type="checkbox" id="path-persistent" ${pathManager.persistent ? 'checked' : ''}
               style="width:20px; height:20px; cursor:pointer;">
      </div>
      <div style="display:flex; align-items:center; margin:4px 0;">
        <label style="width:180px; font-size:13px; color:#aaa;">Máx. puntos</label>
        <input type="number" id="path-maxpoints" value="${pathManager.maxPoints}" min="10" max="5000" step="10"
               style="flex:1; padding:4px 8px; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.15); border-radius:4px; color:#fff; font-family:monospace; font-size:13px;">
      </div>
      <div style="display:flex; align-items:center; margin:4px 0;">
        <label style="width:180px; font-size:13px; color:#aaa;">Dist. mínima</label>
        <input type="number" id="path-mindist" value="${pathManager.minDistance}" min="0.5" max="100" step="0.5"
               style="flex:1; padding:4px 8px; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.15); border-radius:4px; color:#fff; font-family:monospace; font-size:13px;">
      </div>
      <div style="display:flex; align-items:center; margin:4px 0;">
        <label style="width:180px; font-size:13px; color:#aaa;">Umbral ángulo</label>
        <input type="number" id="path-angle" value="${pathManager.angleThreshold}" min="0.01" max="1.0" step="0.01"
               style="flex:1; padding:4px 8px; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.15); border-radius:4px; color:#fff; font-family:monospace; font-size:13px;">
      </div>
      <div style="display:flex; align-items:center; margin:4px 0;">
        <label style="width:180px; font-size:13px; color:#aaa;">Factor velocidad</label>
        <input type="number" id="path-speedfactor" value="${pathManager.speedFactor}" min="0" max="1" step="0.05"
               style="flex:1; padding:4px 8px; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.15); border-radius:4px; color:#fff; font-family:monospace; font-size:13px;">
      </div>
      
      <!-- Simplificación con checkbox -->
      <div style="display:flex; align-items:center; margin:4px 0;">
        <label style="width:180px; font-size:13px; color:#aaa;">Simplificar (DP)</label>
        <input type="checkbox" id="path-simplify-enable" ${simplifyActive ? 'checked' : ''}
               style="width:20px; height:20px; cursor:pointer;">
      </div>
      <div style="display:flex; align-items:center; margin:4px 0;">
        <label style="width:180px; font-size:13px; color:#aaa;">Tolerancia simplif.</label>
        <input type="number" id="path-simplify" value="${simplifyValue}" min="0" max="10" step="0.1"
               style="flex:1; padding:4px 8px; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.15); border-radius:4px; color:#fff; font-family:monospace; font-size:13px;"
               ${simplifyActive ? '' : 'disabled'}>
      </div>
      
      <hr style="border-color: rgba(255,255,255,0.08); margin: 16px 0;">
      <h4 style="margin:16px 0 8px 0; color:#ccc;">🔵 Filtro BQS (control de frecuencia)</h4>
      <div style="display:flex; align-items:center; margin:4px 0;">
        <label style="width:180px; font-size:13px; color:#aaa;">Epsilon BQS</label>
        <input type="number" id="path-bqs-epsilon" value="${pathManager.bqsEpsilonBase}" min="0.1" max="100" step="0.5"
               style="flex:1; padding:4px 8px; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.15); border-radius:4px; color:#fff; font-family:monospace; font-size:13px;">
      </div>
      <div style="display:flex; align-items:center; margin:4px 0;">
        <label style="width:180px; font-size:13px; color:#aaa;">Factor velocidad BQS</label>
        <input type="number" id="path-bqs-speedfactor" value="${pathManager.bqsSpeedFactor}" min="0" max="1" step="0.05"
               style="flex:1; padding:4px 8px; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.15); border-radius:4px; color:#fff; font-family:monospace; font-size:13px;">
      </div>
      <div style="display:flex; align-items:center; margin:4px 0;">
        <label style="width:180px; font-size:13px; color:#aaa;">Intervalo mínimo (ms)</label>
        <input type="number" id="path-mintime" value="${pathManager.minTimeBetweenPoints}" min="10" max="500" step="10"
               style="flex:1; padding:4px 8px; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.15); border-radius:4px; color:#fff; font-family:monospace; font-size:13px;">
      </div>
      <div style="display:flex; align-items:center; margin:4px 0;">
        <label style="width:180px; font-size:13px; color:#aaa;">Forzar en cambio de ángulo</label>
        <input type="checkbox" id="path-force-angle" ${pathManager.forceOnAngleChange ? 'checked' : ''}
               style="width:20px; height:20px; cursor:pointer;">
      </div>
      <button id="path-clear" style="margin-top:6px; padding:8px 12px; background:rgba(200,100,100,0.2); border:1px solid rgba(200,100,100,0.3); border-radius:8px; color:#fff; font-family:inherit; font-size:13px; cursor:pointer;">
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

export function setupSettingsEvents(container, onApply) {
  const applyBtn = container.querySelector('#settings-apply');
  const resetBtn = container.querySelector('#settings-reset');
  const feedback = container.querySelector('#settings-feedback');

  // Campos de ruta
  const pathEnabled = container.querySelector('#path-enabled');
  const pathVisible = container.querySelector('#path-visible');
  const pathPersistentChk = container.querySelector('#path-persistent');
  const pathMaxPoints = container.querySelector('#path-maxpoints');
  const pathMinDist = container.querySelector('#path-mindist');
  const pathAngle = container.querySelector('#path-angle');
  const pathSpeedFactor = container.querySelector('#path-speedfactor');
  const pathSimplifyEnable = container.querySelector('#path-simplify-enable');
  const pathSimplify = container.querySelector('#path-simplify');
  const pathClear = container.querySelector('#path-clear');

  // Campos BQS
  const pathBqsEpsilon = container.querySelector('#path-bqs-epsilon');
  const pathBqsSpeedFactor = container.querySelector('#path-bqs-speedfactor');
  const pathMinTime = container.querySelector('#path-mintime');
  const pathForceAngle = container.querySelector('#path-force-angle');

  // Control de habilitación del campo de tolerancia
  if (pathSimplifyEnable && pathSimplify) {
    pathSimplifyEnable.addEventListener('change', () => {
      pathSimplify.disabled = !pathSimplifyEnable.checked;
    });
  }

  if (pathPersistentChk) {
    pathPersistentChk.addEventListener('change', () => {
      if (pathPersistentChk.checked && pathVisible) {
        pathVisible.checked = true;
      }
    });
  }

  if (pathClear) {
    pathClear.addEventListener('click', () => {
      pathManager.clear();
      feedback.textContent = '🗑️ Ruta borrada';
      feedback.style.opacity = '1';
      setTimeout(() => { feedback.style.opacity = '0'; }, 1500);
    });
  }

  if (applyBtn) {
    applyBtn.addEventListener('click', () => {
      const inputs = container.querySelectorAll('input[id^="const-"]');
      let changed = false;
      inputs.forEach(input => {
        const key = input.id.replace('const-', '');
        if (key in constants) {
          const val = parseFloat(input.value);
          if (!isNaN(val) && constants[key] !== val) {
            constants[key] = val;
            changed = true;
          }
        }
      });

      // Aplicar configuraciones de ruta
      if (pathEnabled) pathManager.setEnabled(pathEnabled.checked);
      if (pathVisible) pathManager.setVisible(pathVisible.checked);
      if (pathPersistentChk) {
        const persistent = pathPersistentChk.checked;
        pathManager.setPersistent(persistent);
        if (persistent && pathVisible) {
          pathManager.setVisible(true);
          pathVisible.checked = true;
        }
      }
      if (pathMaxPoints) {
        const val = parseInt(pathMaxPoints.value);
        if (!isNaN(val) && val > 0) pathManager.setMaxPoints(val);
      }
      if (pathMinDist) {
        const val = parseFloat(pathMinDist.value);
        if (!isNaN(val) && val > 0) pathManager.setMinDistance(val);
      }
      if (pathAngle) {
        const val = parseFloat(pathAngle.value);
        if (!isNaN(val) && val > 0) pathManager.setAngleThreshold(val);
      }
      if (pathSpeedFactor) {
        const val = parseFloat(pathSpeedFactor.value);
        if (!isNaN(val) && val >= 0 && val <= 1) pathManager.setSpeedFactor(val);
      }

      // Simplificación: si el checkbox está activo, usar el valor; si no, poner 0
      if (pathSimplifyEnable && pathSimplify) {
        if (pathSimplifyEnable.checked) {
          const val = parseFloat(pathSimplify.value);
          if (!isNaN(val) && val >= 0) {
            pathManager.setSimplifyTolerance(val);
          }
        } else {
          pathManager.setSimplifyTolerance(0);
        }
      }

      // Aplicar configuraciones BQS
      if (pathBqsEpsilon) {
        const val = parseFloat(pathBqsEpsilon.value);
        if (!isNaN(val) && val > 0) pathManager.setBqsEpsilonBase(val);
      }
      if (pathBqsSpeedFactor) {
        const val = parseFloat(pathBqsSpeedFactor.value);
        if (!isNaN(val) && val >= 0 && val <= 1) pathManager.setBqsSpeedFactor(val);
      }
      if (pathMinTime) {
        const val = parseInt(pathMinTime.value);
        if (!isNaN(val) && val >= 10) pathManager.setMinTimeBetweenPoints(val);
      }
      if (pathForceAngle) {
        pathManager.setForceOnAngleChange(pathForceAngle.checked);
      }

      if (changed) {
        saveConstants();
        if (onApply) onApply();
        feedback.textContent = '✅ Ajustes aplicados y guardados';
        feedback.style.opacity = '1';
        setTimeout(() => { feedback.style.opacity = '0'; }, 2000);
        console.log('Constantes actualizadas:', constants);
      } else {
        feedback.textContent = 'ℹ️ No se detectaron cambios';
        feedback.style.opacity = '1';
        setTimeout(() => { feedback.style.opacity = '0'; }, 1500);
      }
    });
  }

  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      if (confirm('¿Restaurar todas las constantes a sus valores por defecto?')) {
        resetConstantsToDefaults();
        const inputs = container.querySelectorAll('input[id^="const-"]');
        inputs.forEach(input => {
          const key = input.id.replace('const-', '');
          if (key in constants) {
            input.value = constants[key];
          }
        });
        if (onApply) onApply();
        feedback.textContent = '🔄 Constantes restauradas';
        feedback.style.opacity = '1';
        setTimeout(() => { feedback.style.opacity = '0'; }, 2000);
        console.log('Constantes restauradas a valores por defecto');
      }
    });
  }
}