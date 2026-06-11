// ui/uiManager.js
export default class UIManager {
    constructor(canvas) {
        this.canvas = canvas;
        this.isVisible = false;
        this.pauseCallback = null;
        this.resumeCallback = null;
        
        this.createUI();
        this.bindEvents();
        this.initPointerLockListener();
    }
    
    createUI() {
        this.panel = document.createElement('div');
        this.panel.id = 'game-ui-panel';
        this.panel.style.position = 'fixed';
        this.panel.style.left = '20px';
        this.panel.style.top = '50%';
        this.panel.style.transform = 'translateY(-50%)';
        this.panel.style.width = '260px';
        this.panel.style.backgroundColor = 'rgba(0, 0, 0, 0.95)';
        this.panel.style.backdropFilter = 'blur(10px)';
        this.panel.style.borderRadius = '12px';
        this.panel.style.padding = '16px';
        this.panel.style.border = '2px solid rgba(255,255,255,0.3)';
        this.panel.style.boxShadow = '0 4px 20px rgba(0,0,0,0.8)';
        this.panel.style.fontFamily = 'monospace';
        this.panel.style.zIndex = '10000';
        this.panel.style.display = 'none';
        this.panel.style.color = 'white';
        
        const title = document.createElement('h2');
        title.textContent = 'MENÚ';
        title.style.color = '#fff';
        title.style.textAlign = 'center';
        title.style.margin = '0 0 20px 0';
        title.style.fontSize = '24px';
        this.panel.appendChild(title);
        
        const buttons = [
            { id: 'resume', text: '▶ Volver al juego', action: () => this.hide() },
            { id: 'progress', text: '📊 Progreso', action: () => this.showProgress() },
            { id: 'stats', text: '📈 Estadísticas', action: () => this.showStats() },
            { id: 'options', text: '⚙️ Opciones', action: () => this.showOptions() },
            { id: 'reset', text: '🏠 Volver al inicio', action: () => this.resetGame() }
        ];
        
        buttons.forEach(btn => {
            const button = document.createElement('button');
            button.id = `ui-btn-${btn.id}`;
            button.textContent = btn.text;
            button.style.width = '100%';
            button.style.padding = '12px';
            button.style.margin = '8px 0';
            button.style.backgroundColor = 'rgba(30,30,40,0.9)';
            button.style.border = '1px solid rgba(255,255,255,0.3)';
            button.style.borderRadius = '8px';
            button.style.color = '#fff';
            button.style.fontSize = '16px';
            button.style.fontFamily = 'monospace';
            button.style.cursor = 'pointer';
            button.style.transition = 'all 0.2s ease';
            
            button.addEventListener('mouseenter', () => {
                button.style.backgroundColor = 'rgba(80,80,120,0.9)';
                button.style.transform = 'translateX(4px)';
            });
            button.addEventListener('mouseleave', () => {
                button.style.backgroundColor = 'rgba(30,30,40,0.9)';
                button.style.transform = 'translateX(0)';
            });
            
            button.addEventListener('click', (e) => {
                e.stopPropagation();
                btn.action();
            });
            
            this.panel.appendChild(button);
        });
        
        document.body.appendChild(this.panel);
        console.log("✅ Panel UI creado y añadido al DOM");
    }
    
    bindEvents() {
        this.panel.addEventListener('click', (e) => e.stopPropagation());
    }
    
    initPointerLockListener() {
        document.addEventListener('pointerlockchange', () => {
            const isLocked = document.pointerLockElement === this.canvas;
            console.log(`🖱️ Pointer lock change: locked = ${isLocked}`);
            // Si el puntero se ha liberado y el menú no está visible, lo abrimos
            if (!isLocked && !this.isVisible) {
                console.log("   Abriendo menú por liberación de puntero");
                this.open();
            }
        });
    }
    
    setPauseHandlers(pauseFn, resumeFn) {
        this.pauseCallback = pauseFn;
        this.resumeCallback = resumeFn;
    }
    
    open() {
        console.log("🔓 open() llamado, isVisible actual:", this.isVisible);
        if (this.isVisible) {
            console.log("   El menú ya está visible, no se abre de nuevo");
            return;
        }
        this.isVisible = true;
        this.panel.style.display = 'block';
        console.log("   Panel display = block");
        if (this.pauseCallback) {
            console.log("   Llamando a pauseCallback()");
            this.pauseCallback();
        }
        console.log("✅ Menú abierto");
    }
    
    hide() {
        console.log("🔒 hide() llamado, isVisible actual:", this.isVisible);
        if (!this.isVisible) {
            console.log("   El menú no estaba visible, no se cierra");
            return;
        }
        this.isVisible = false;
        this.panel.style.display = 'none';
        console.log("   Panel display = none");
        if (this.resumeCallback) {
            console.log("   Llamando a resumeCallback()");
            this.resumeCallback();
        }
        console.log("✅ Menú cerrado");
    }
    
    showProgress() { alert("Progreso: 0% completado (demo)"); }
    showStats() { alert("Estadísticas: ¡Ninguna aún! (demo)"); }
    showOptions() { alert("Opciones: próximamente..."); }
    resetGame() {
        if (confirm("¿Volver al inicio? Se perderá el progreso actual.")) {
            window.location.reload();
        }
    }
}