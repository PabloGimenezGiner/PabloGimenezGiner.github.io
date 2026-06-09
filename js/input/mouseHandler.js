// input/mouseHandler.js
export default class MouseHandler {
    constructor(canvas, inputManager) {
        this.canvas = canvas;
        this.inputManager = inputManager;
        this.pointerLocked = false;
        this.sensitivity = 0.002;
        
        this.mouseButtons = { left: false, right: false, middle: false };
        
        this._initEvents();
    }
    
    _initEvents() {
        this.canvas.addEventListener('click', () => this.canvas.requestPointerLock());
        
        document.addEventListener('pointerlockchange', () => {
            this.pointerLocked = (document.pointerLockElement === this.canvas);
            if (!this.pointerLocked) {
                this.inputManager.resetMouseDelta();
            }
        });
        
        this.canvas.addEventListener('mousemove', this.onMouseMove.bind(this));
        this.canvas.addEventListener('mousedown', this.onMouseDown.bind(this));
        window.addEventListener('mouseup', this.onMouseUp.bind(this));
        this.canvas.addEventListener('wheel', this.onWheel.bind(this), { passive: false });
        this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    }
    
    onMouseMove(e) {
        if (!this.pointerLocked) return;
        const deltaYaw = e.movementX * this.sensitivity;
        const deltaPitch = e.movementY * this.sensitivity;
        this.inputManager.onMouseMove(deltaYaw, deltaPitch);
    }
    
    onMouseDown(e) {
        e.preventDefault();
        switch (e.button) {
            case 0: this.mouseButtons.left = true; break;
            case 1: this.mouseButtons.middle = true; this.inputManager.onTurboToggle(); break;
            case 2: this.mouseButtons.right = true; break;
        }
        this._updateMoveFromMouse();
    }
    
    onMouseUp(e) {
        switch (e.button) {
            case 0: this.mouseButtons.left = false; break;
            case 1: this.mouseButtons.middle = false; break;
            case 2: this.mouseButtons.right = false; break;
        }
        this._updateMoveFromMouse();
    }
    
    _updateMoveFromMouse() {
        const forward = this.mouseButtons.right ? 1 : 0;
        const backward = this.mouseButtons.left ? 1 : 0;
        this.inputManager.onMouseMoveButtons(forward, backward);
    }
    
    onWheel(e) {
        e.preventDefault();
        const delta = -Math.sign(e.deltaY);
        this.inputManager.onMouseWheel(delta);
    }
}