// ui/uiManager.js
import { WindowManager } from './windowManager.js';
import { renderMenu, setupMenuEvents } from './windows/menuWindow.js';
import { renderSettings, setupSettingsEvents } from './windows/settingsWindow.js';
import { renderStats } from './windows/statsWindow.js';
import { pauseGameOnMenu, setPauseGameOnMenu, resetGameState, chunks } from '../core/gameState.js';
import { saveGame } from '../core/persistence.js';
import { constants } from '../constants.js';
import { updateChunks } from '../world/chunkManager.js';

export default class UIManager {
  constructor(canvas) {
    this.canvas = canvas;
    this.windowManager = new WindowManager('ui-root');
    this._lockRequestPending = false;
    this._ignorePointerLockChange = false;
    this._isClosing = false;
    this._statsInterval = null; // <-- para el intervalo de actualización

    // Registrar menú
    this.windowManager.register('menu', {
      title: 'MENÚ',
      width: 300,
      height: 420,
      x: 40,
      y: 80,
      render: renderMenu,
      onOpen: () => {
        const entry = this.windowManager.windows.get('menu');
        if (!entry || !entry.element) return;
        const container = entry.element;
        
        this._updateMenuContent(container);
        
        setupMenuEvents(container, {
          resume: () => this.hideMenu(),
          progress: () => this.windowManager.open('progress'),
          stats: () => this.windowManager.open('stats'),
          options: () => this.windowManager.open('settings'),
          reset: () => this.resetGame(),
          togglePause: () => this._togglePauseMode(),
        });
        
        if (pauseGameOnMenu && this.onPause) {
          this.onPause();
        }
        
        this._ignorePointerLockChange = true;
        if (document.pointerLockElement) {
          document.exitPointerLock();
        }
        setTimeout(() => {
          this._ignorePointerLockChange = false;
        }, 150);
      },
      onClose: () => {
        if (pauseGameOnMenu && this.onResume) {
          this.onResume();
        }
        this._isClosing = true;
        this._requestPointerLockSafely();
        setTimeout(() => {
          this._isClosing = false;
        }, 200);
      }
    });

    // Registrar opciones
    this.windowManager.register('settings', {
      title: 'Opciones',
      width: 420,
      height: 520,
      x: 120,
      y: 80,
      render: renderSettings,
      onOpen: () => {
        const entry = this.windowManager.windows.get('settings');
        if (!entry || !entry.element) return;
        const container = entry.element;
        setupSettingsEvents(container, () => {
          this._regenerateChunksIfNeeded();
        });
      }
    });

    // Registrar progreso (demo)
    this.windowManager.register('progress', {
      title: 'Progreso',
      width: 320,
      height: 200,
      x: 160,
      y: 160,
      render: () => `<p>📊 Progreso: 0% completado</p><p style="font-size:12px; color:#888;">(demo)</p>`
    });

    // Registrar estadísticas (con actualización automática cada 500 ms)
    this.windowManager.register('stats', {
      title: 'Estadísticas',
      width: 340,
      height: 260,
      x: 200,
      y: 200,
      render: renderStats,
      onOpen: () => {
        // Iniciar intervalo de actualización si no existe
        if (this._statsInterval) {
          clearInterval(this._statsInterval);
          this._statsInterval = null;
        }
        this._statsInterval = setInterval(() => {
          const entry = this.windowManager.windows.get('stats');
          if (entry && entry.isOpen) {
            this.windowManager.updateContent('stats', renderStats);
          } else {
            // Si la ventana se cerró inesperadamente, limpiar el intervalo
            clearInterval(this._statsInterval);
            this._statsInterval = null;
          }
        }, 500); // Actualiza cada medio segundo
      },
      onClose: () => {
        // Limpiar intervalo al cerrar la ventana
        if (this._statsInterval) {
          clearInterval(this._statsInterval);
          this._statsInterval = null;
        }
      }
    });

    this.onPause = null;
    this.onResume = null;
    this._lastChunkParams = {
      renderDistanceChunks: constants.renderDistanceChunks,
      chunkSize: constants.chunkSize,
      starsPerChunk: constants.starsPerChunk
    };

    document.addEventListener('pointerlockchange', this._onPointerLockChange.bind(this));
  }

  _updateMenuContent(container) {
    const pauseBtn = container.querySelector('[data-action="togglePause"]');
    if (pauseBtn) {
      const icon = pauseGameOnMenu ? '⏸️' : '▶️';
      const label = pauseGameOnMenu ? 'Pausa: Activada' : 'Pausa: Desactivada';
      pauseBtn.textContent = `${icon} ${label}`;
    }
  }

  _togglePauseMode() {
    const newValue = !pauseGameOnMenu;
    setPauseGameOnMenu(newValue);
    console.log(`Modo pausa: ${newValue ? 'Activado' : 'Desactivado'}`);
    saveGame();
    
    const entry = this.windowManager.windows.get('menu');
    if (entry && entry.element) {
      this._updateMenuContent(entry.element);
    }
    
    if (newValue && this.onPause) {
      this.onPause();
    }
    if (!newValue && this.onResume) {
      this.onResume();
    }
  }

  _regenerateChunksIfNeeded() {
    const current = {
      renderDistanceChunks: constants.renderDistanceChunks,
      chunkSize: constants.chunkSize,
      starsPerChunk: constants.starsPerChunk
    };
    const changed = (
      current.renderDistanceChunks !== this._lastChunkParams.renderDistanceChunks ||
      current.chunkSize !== this._lastChunkParams.chunkSize ||
      current.starsPerChunk !== this._lastChunkParams.starsPerChunk
    );
    if (changed) {
      console.log('🔄 Parámetros de chunks cambiados, regenerando...');
      for (const key in chunks) {
        delete chunks[key];
      }
      import('../core/gameState.js').then(({ camera }) => {
        updateChunks(camera.x, camera.y, camera.z);
      });
      this._lastChunkParams = current;
    }
  }

  _requestPointerLockSafely() {
    if (this._lockRequestPending) return;
    if (document.pointerLockElement === this.canvas) return;
    if (document.activeElement !== this.canvas) {
      this.canvas.focus();
    }
    if (document.hasFocus()) {
      this._lockRequestPending = true;
      this.canvas.requestPointerLock()
        .then(() => { this._lockRequestPending = false; })
        .catch((err) => {
          this._lockRequestPending = false;
          console.warn('No se pudo adquirir pointer lock:', err);
          if (err.name === 'SecurityError' && err.message.includes('immediately')) {
            setTimeout(() => {
              this._requestPointerLockSafely();
            }, 300);
          }
        });
    }
  }

  _onPointerLockChange() {
    const isLocked = document.pointerLockElement === this.canvas;
    if (this._ignorePointerLockChange) {
      console.log('pointerlockchange ignorado (operación interna)');
      return;
    }
    if (this._isClosing) {
      console.log('pointerlockchange ignorado (cerrando menú)');
      return;
    }
    if (!isLocked) {
      console.log('🔓 Pointer lock perdido, alternando menú');
      this.toggleMenu();
    }
  }

  // ---- Métodos públicos ----
  setPauseHandlers(pauseFn, resumeFn) {
    this.onPause = pauseFn;
    this.onResume = resumeFn;
  }

  openMenu() {
    const menuEntry = this.windowManager.windows.get('menu');
    if (menuEntry && menuEntry.isOpen) return;
    this.windowManager.open('menu');
  }

  hideMenu() {
    this._isClosing = true;
    this.windowManager.close('menu');
    setTimeout(() => {
      this._isClosing = false;
    }, 250);
  }

  toggleMenu() {
    const menuEntry = this.windowManager.windows.get('menu');
    if (menuEntry && menuEntry.isOpen && !menuEntry.element?.parentNode) {
      menuEntry.isOpen = false;
      menuEntry.element = null;
    }

    const isOpen = menuEntry && menuEntry.isOpen;
    console.log(`🔁 toggleMenu() llamado. isOpen = ${isOpen}`);

    if (isOpen) {
      console.log('➡️ Cerrando menú');
      this.hideMenu();
    } else {
      console.log('➡️ Abriendo menú');
      this.windowManager.open('menu', null, true);
      this.windowManager.focus('menu');
      const entry = this.windowManager.windows.get('menu');
      if (entry && entry.element) {
        entry.element.style.display = 'flex';
        entry.element.style.visibility = 'visible';
        entry.element.classList.add('open');
      }
      console.log('✅ Menú abierto y visible');
    }
  }

  resetGame() {
    if (!confirm('¿Volver al inicio? Se perderá el progreso actual.')) {
      return;
    }
    
    console.log('🔄 Reiniciando posición...');
    resetGameState();
    
    setTimeout(() => {
      import('../core/gameState.js').then(({ camera }) => {
        updateChunks(camera.x, camera.y, camera.z);
      });
    }, 50);
    
    setTimeout(() => saveGame(), 100);
    console.log('✅ Posición reiniciada correctamente (ajustes intactos)');
  }
}