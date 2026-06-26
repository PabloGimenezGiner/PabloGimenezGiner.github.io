// ui/windowManager.js

export class WindowManager {
  constructor(containerId = 'ui-root') {
    this.container = document.getElementById(containerId);
    if (!this.container) {
      this.container = document.createElement('div');
      this.container.id = containerId;
      document.body.appendChild(this.container);
    }

    this.windows = new Map();
    this.zIndexCounter = 1000;
    this.dragData = null;
    this.activeWindowId = null;

    this._boundOnDragMove = this._onDragMove.bind(this);
    this._boundOnDragEnd = this._onDragEnd.bind(this);

    this.container.addEventListener('mousedown', this._onContainerMouseDown.bind(this));
  }

  register(id, config) {
    if (this.windows.has(id)) {
      console.warn(`Ventana "${id}" ya registrada.`);
      return;
    }
    this.windows.set(id, {
      config: {
        title: config.title || 'Ventana',
        render: config.render || (() => '<p>Contenido vacío</p>'),
        onOpen: config.onOpen || null,
        onClose: config.onClose || null,
        width: config.width || 400,
        height: config.height || 300,
        x: config.x || 100,
        y: config.y || 100,
        resizable: config.resizable || false,
      },
      element: null,
      isOpen: false,
      zIndex: 0,
    });
    console.log(`📦 Ventana "${id}" registrada`);
  }

  // ---- open con force ----
  open(id, data = null, force = false) {
    const entry = this.windows.get(id);
    if (!entry) {
      console.error(`❌ Ventana "${id}" no registrada.`);
      return;
    }

    // Si ya está abierta y no forzamos, solo enfocar
    if (entry.isOpen && !force) {
      console.log(`ℹ️ Ventana "${id}" ya abierta, enfocando.`);
      this.focus(id);
      return;
    }

    // Si forzamos y está abierta, la cerramos y la recreamos
    if (force && entry.isOpen) {
      console.log(`🔄 Forzando recreación de "${id}"`);
      // Eliminar el elemento del DOM si existe
      if (entry.element && entry.element.parentNode) {
        entry.element.parentNode.removeChild(entry.element);
        entry.element = null;
      }
      entry.isOpen = false;
    }

    // Crear la ventana
    const { config } = entry;
    const el = this._createWindowElement(id, config, data);
    this.container.appendChild(el);
    entry.element = el;
    entry.isOpen = true;
    this.focus(id);

    if (config.onOpen) config.onOpen(data);

    requestAnimationFrame(() => {
      el.classList.add('open');
    });

    console.log(`✅ Ventana "${id}" abierta${force ? ' (forzada)' : ''}`);
  }

  close(id) {
    const entry = this.windows.get(id);
    if (!entry || !entry.isOpen) {
      console.warn(`⚠️ Intento de cerrar "${id}" pero no está abierta.`);
      return;
    }

    const el = entry.element;
    el.classList.remove('open');
    setTimeout(() => {
      if (el.parentNode) el.remove();
      entry.isOpen = false;
      entry.element = null;
      if (this.activeWindowId === id) this.activeWindowId = null;
      if (entry.config.onClose) entry.config.onClose();
      console.log(`🚪 Ventana "${id}" cerrada`);
    }, 200);
  }

  focus(id) {
    const entry = this.windows.get(id);
    if (!entry || !entry.isOpen) return;
    this.zIndexCounter++;
    entry.zIndex = this.zIndexCounter;
    entry.element.style.zIndex = this.zIndexCounter;
    this.activeWindowId = id;
    console.log(`🔝 Ventana "${id}" enfocada (z-index: ${this.zIndexCounter})`);
  }

  closeAll() {
    for (const [id, entry] of this.windows.entries()) {
      if (entry.isOpen) this.close(id);
    }
  }

  _createWindowElement(id, config, data) {
    const wrapper = document.createElement('div');
    wrapper.className = 'ui-window';
    wrapper.style.width = config.width + 'px';
    wrapper.style.height = config.height + 'px';
    wrapper.style.left = config.x + 'px';
    wrapper.style.top = config.y + 'px';
    wrapper.dataset.windowId = id;

    const titleBar = document.createElement('div');
    titleBar.className = 'title-bar';
    titleBar.innerHTML = `
      <span class="title">${config.title}</span>
      <div class="controls">
        <button class="close-btn" title="Cerrar">✕</button>
      </div>
    `;

    const content = document.createElement('div');
    content.className = 'content';
    let contentHTML = '';
    if (typeof config.render === 'function') {
      contentHTML = config.render(data);
    } else {
      contentHTML = config.render || '<p>Sin contenido</p>';
    }
    content.innerHTML = contentHTML;

    wrapper.appendChild(titleBar);
    wrapper.appendChild(content);

    const closeBtn = titleBar.querySelector('.close-btn');
    closeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.close(id);
    });

    titleBar.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;
      const rect = wrapper.getBoundingClientRect();
      this.dragData = {
        id,
        offsetX: e.clientX - rect.left,
        offsetY: e.clientY - rect.top,
      };
      document.addEventListener('mousemove', this._boundOnDragMove);
      document.addEventListener('mouseup', this._boundOnDragEnd);
      e.preventDefault();
    });

    wrapper.addEventListener('mousedown', () => {
      this.focus(id);
    });

    return wrapper;
  }

  _onDragMove(e) {
    if (!this.dragData) return;
    const { id, offsetX, offsetY } = this.dragData;
    const entry = this.windows.get(id);
    if (!entry || !entry.isOpen) return;
    const el = entry.element;
    let newX = e.clientX - offsetX;
    let newY = e.clientY - offsetY;
    newX = Math.max(0, Math.min(window.innerWidth - el.offsetWidth, newX));
    newY = Math.max(0, Math.min(window.innerHeight - el.offsetHeight, newY));
    el.style.left = newX + 'px';
    el.style.top = newY + 'px';
    entry.config.x = newX;
    entry.config.y = newY;
  }

  _onDragEnd(e) {
    if (this.dragData) {
      document.removeEventListener('mousemove', this._boundOnDragMove);
      document.removeEventListener('mouseup', this._boundOnDragEnd);
      this.dragData = null;
    }
  }

  _onContainerMouseDown(e) {
    // No hace nada
  }

  updateContent(id, newContent) {
    const entry = this.windows.get(id);
    if (!entry || !entry.isOpen) return;
    const contentEl = entry.element.querySelector('.content');
    if (contentEl) {
      if (typeof newContent === 'function') {
        contentEl.innerHTML = newContent();
      } else {
        contentEl.innerHTML = newContent;
      }
    }
  }
}