// input/inputManager.js
import KeyboardHandler from './keyboardHandler.js';
import MouseHandler from './mouseHandler.js';

class InputManager {
    constructor(canvas) {
        this.canvas = canvas;
        
        this.moveDirection = { x: 0, y: 0, z: 0 };
        this.braking = false;
        this.rotBraking = false;
        this.rotationDelta = { yaw: 0, pitch: 0 };
        this.rollDirection = 0;
        this.pitchDirection = 0;
        this.yawDirection = 0;
        this.powerDelta = 0;
        this.turboToggleRequest = false;
        this.frustumToggleRequest = false;
        this.infoHudToggleRequest = false;
        
        this.movementAutoBrakeToggleRequest = false;
        this.rotationAutoDampToggleRequest = false;
        this.guiToggleRequest = false;
        
        this._mouseForward = 0;
        this._mouseBackward = 0;
        
        // Nuevo: estado de pausa
        this.paused = false;
        
        this.keyboard = new KeyboardHandler(this);
        this.mouse = new MouseHandler(canvas, this);
    }
    
    setPaused(paused) {
        this.paused = paused;
        if (paused) {
            // Al pausar, descartamos cualquier rotación acumulada para evitar saltos
            this.rotationDelta.yaw = 0;
            this.rotationDelta.pitch = 0;
        }
    }
    
    onKeyMove(x, y, z, braking, rotBraking) {
        this.moveDirection.x = x;
        this.moveDirection.y = y;
        this.moveDirection.z = z;
        this.braking = braking;
        this.rotBraking = rotBraking;
    }
    
    onRollDirection(direction) {
        this.rollDirection = direction;
    }
    
    onPitchDirection(direction) {
        this.pitchDirection = direction;
    }
    
    onYawDirection(direction) {
        this.yawDirection = direction;
    }
    
    onFrustumToggle() {
        this.frustumToggleRequest = true;
    }
    
    onInfoHudToggle() {
        this.infoHudToggleRequest = true;
    }
    
    onMovementAutoBrakeToggle() {
        this.movementAutoBrakeToggleRequest = true;
    }
    
    onRotationAutoDampToggle() {
        this.rotationAutoDampToggleRequest = true;
    }
    
    onGuiToggle() {
        this.guiToggleRequest = true;
    }
    
    onMouseMove(deltaYaw, deltaPitch) {
        // Ignorar movimientos del ratón si el juego está pausado
        if (this.paused) return;
        this.rotationDelta.yaw += deltaYaw;
        this.rotationDelta.pitch += deltaPitch;
    }
    
    onMouseWheel(delta) {
        this.powerDelta += delta;
    }
    
    onTurboToggle() {
        this.turboToggleRequest = true;
    }
    
    onMouseMoveButtons(forward, backward) {
        this._mouseForward = forward;
        this._mouseBackward = backward;
    }
    
    getMoveDirection() {
        let z = this.moveDirection.z;
        if (this._mouseForward) z += 1;
        if (this._mouseBackward) z -= 1;
        z = Math.max(-1, Math.min(1, z));
        return {
            x: this.moveDirection.x,
            y: this.moveDirection.y,
            z: z
        };
    }
    
    getRotationDelta() {
        const delta = { ...this.rotationDelta };
        this.rotationDelta.yaw = 0;
        this.rotationDelta.pitch = 0;
        return delta;
    }
    
    getRollDirection() { return this.rollDirection; }
    getPitchDirection() { return this.pitchDirection; }
    getYawDirection() { return this.yawDirection; }
    isBraking() { return this.braking; }
    isRotBraking() { return this.rotBraking; }
    
    consumePowerDelta() {
        const delta = this.powerDelta;
        this.powerDelta = 0;
        return delta;
    }
    
    consumeTurboToggle() {
        if (this.turboToggleRequest) {
            this.turboToggleRequest = false;
            return true;
        }
        return false;
    }
    
    consumeFrustumToggle() {
        if (this.frustumToggleRequest) {
            this.frustumToggleRequest = false;
            return true;
        }
        return false;
    }
    
    consumeInfoHudToggle() {
        if (this.infoHudToggleRequest) {
            this.infoHudToggleRequest = false;
            return true;
        }
        return false;
    }
    
    consumeMovementAutoBrakeToggle() {
        if (this.movementAutoBrakeToggleRequest) {
            this.movementAutoBrakeToggleRequest = false;
            return true;
        }
        return false;
    }
    
    consumeRotationAutoDampToggle() {
        if (this.rotationAutoDampToggleRequest) {
            this.rotationAutoDampToggleRequest = false;
            return true;
        }
        return false;
    }
    
    consumeGuiToggle() {
        if (this.guiToggleRequest) {
            this.guiToggleRequest = false;
            return true;
        }
        return false;
    }
    
    resetMouseDelta() {
        this.rotationDelta.yaw = 0;
        this.rotationDelta.pitch = 0;
    }
}

export default InputManager;