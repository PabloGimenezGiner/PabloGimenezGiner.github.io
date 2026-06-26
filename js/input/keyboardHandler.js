// input/keyboardHandler.js
export default class KeyboardHandler {
    constructor(inputManager) {
        this.inputManager = inputManager;
        this.uiManager = null;
        
        this.keys = {
            KeyW: false, KeyS: false,
            KeyA: false, KeyD: false,
            KeyQ: false, KeyE: false,
            KeyI: false, KeyP: false,
            KeyO: false, KeyL: false,
            KeyK: false,
            KeyX: false,
            Comma: false,
            KeyR: false,
            KeyU: false,
            KeyC: false,
            KeyF: false,
            KeyV: false,
            Escape: false,
            F2: false, F4: false
        };
        
        this.ñPressed = false;
        
        this.updateMoveAndBraking();
        this.updateRollDirection();
        this.updatePitchDirection();
        this.updateYawDirection();
        
        window.addEventListener('keydown', this.onKeyDown.bind(this));
        window.addEventListener('keyup', this.onKeyUp.bind(this));
    }
    
    setUIManager(uiManager) {
        this.uiManager = uiManager;
        console.log("✅ UIManager conectado al teclado");
    }
    
    updateMoveAndBraking() {
        let x = 0, y = 0, z = 0;
        if (this.keys.KeyA) x -= 1;
        if (this.keys.KeyD) x += 1;
        if (this.keys.KeyQ) y += 1;
        if (this.keys.KeyE) y -= 1;
        if (this.keys.KeyW) z += 1;
        if (this.keys.KeyS) z -= 1;
        
        const len = Math.hypot(x, y, z);
        if (len > 0) {
            x /= len;
            y /= len;
            z /= len;
        }
        
        this.inputManager.onKeyMove(x, y, z, this.keys.KeyX, this.keys.Comma);
    }
    
    updateRollDirection() {
        let direction = 0;
        if (this.keys.KeyI) direction = -1;
        if (this.keys.KeyP) direction = 1;
        if (this.keys.KeyI && this.keys.KeyP) direction = 0;
        this.inputManager.onRollDirection(direction);
    }
    
    updatePitchDirection() {
        let direction = 0;
        if (this.keys.KeyO) direction = -1;
        if (this.keys.KeyL) direction = 1;
        if (this.keys.KeyO && this.keys.KeyL) direction = 0;
        this.inputManager.onPitchDirection(direction);
    }
    
    updateYawDirection() {
        let direction = 0;
        if (this.keys.KeyK) direction = -1;
        if (this.ñPressed) direction = 1;
        if (this.keys.KeyK && this.ñPressed) direction = 0;
        this.inputManager.onYawDirection(direction);
    }
    
    onKeyDown(e) {
        const code = e.code;
        const key = e.key;
        
        if (key === 'ñ' || key === 'Ñ') {
            e.preventDefault();
            this.ñPressed = true;
            this.updateYawDirection();
            return;
        }
        
        if (this.keys.hasOwnProperty(code)) {
            e.preventDefault();
            
            if (code === 'F2') {
                this.inputManager.onFrustumToggle();
                return;
            }
            if (code === 'F4') {
                this.inputManager.onInfoHudToggle();
                return;
            }
            if (code === 'KeyR') {
                this.inputManager.onMovementAutoBrakeToggle();
                return;
            }
            if (code === 'KeyU') {
                this.inputManager.onRotationAutoDampToggle();
                return;
            }
            if (code === 'KeyC') {
                this.inputManager.onTurboToggle();
                return;
            }
            if (code === 'KeyF') {
                this.inputManager.onMouseWheel(1);
                return;
            }
            if (code === 'KeyV') {
                this.inputManager.onMouseWheel(-1);
                return;
            }
            // ESC: lo dejamos como respaldo, pero la lógica principal está en pointerlockchange
            if (code === 'Escape') {
                if (this.uiManager) {
                    this.uiManager.toggleMenu();
                }
                return;
            }
            
            this.keys[code] = true;
            this.updateMoveAndBraking();
            if (code === 'KeyI' || code === 'KeyP') this.updateRollDirection();
            if (code === 'KeyO' || code === 'KeyL') this.updatePitchDirection();
            if (code === 'KeyK') this.updateYawDirection();
        }
    }
    
    onKeyUp(e) {
        const code = e.code;
        const key = e.key;
        
        if (key === 'ñ' || key === 'Ñ') {
            e.preventDefault();
            this.ñPressed = false;
            this.updateYawDirection();
            return;
        }
        
        if (this.keys.hasOwnProperty(code)) {
            e.preventDefault();
            this.keys[code] = false;
            this.updateMoveAndBraking();
            if (code === 'KeyI' || code === 'KeyP') this.updateRollDirection();
            if (code === 'KeyO' || code === 'KeyL') this.updatePitchDirection();
            if (code === 'KeyK') this.updateYawDirection();
        }
    }
}