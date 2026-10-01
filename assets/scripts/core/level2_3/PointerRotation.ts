import { _decorator, Component, v3 } from 'cc';
const { ccclass } = _decorator;

@ccclass('PointerRotation')
export class PointerRotation extends Component {
    public rotateSpeed: number = 120; 
    private _isReverseMode: boolean = false;
    private _direction: number = 1; // 1逆时针(往上/左), -1顺时针(往下/右)
    private _speedMultiplier: number = 1.0;
    private _isFrozen: boolean = false;
    private _isPaused: boolean = false;

    public initSpeed(speed: number, isReverse: boolean) {
        this.rotateSpeed = speed;
        this._isReverseMode = isReverse; // 第二关为 true
        this._speedMultiplier = 1.0;
        this._isFrozen = false;
        this.unschedule(this.releaseMissPenalty);
        
        // ★ 第二关起始设为 0 度（正右侧），向 180 度（正左侧）往复摆动
        this._direction = isReverse ? 1 : -1; 
        let startAngle = isReverse ? 0 : 0;
        
        this.node.setRotationFromEuler(v3(0, 0, startAngle));
    }

    update(dt: number) {
        if (this._isFrozen || this._isPaused) return;

        let step = this.rotateSpeed * this._speedMultiplier * dt * this._direction;
        let currentEulerZ = this.node.eulerAngles.z;
        let targetEulerZ = currentEulerZ + step;

        // 统一归一化到 0 ~ 360 度
        targetEulerZ = (targetEulerZ % 360 + 360) % 360;

        if (this._isReverseMode) {
            // ★ 核心边界判断：上半圆摆动 (0度 正右 -> 90度 正上 -> 180度 正左)
            if (this._direction === 1 && (targetEulerZ >= 180 && targetEulerZ < 270)) {
                targetEulerZ = 180;
                this._direction = -1; // 撞到 180 度（左侧），调头顺时针向右摆
            } else if (this._direction === -1 && (targetEulerZ <= 0 || targetEulerZ > 270)) {
                targetEulerZ = 0;
                this._direction = 1;  // 撞到 0 度（右侧），调头逆时针向左摆
            }
        }

        this.node.setRotationFromEuler(v3(0, 0, targetEulerZ));
    }

    public getAbsoluteAngle(): number {
        return (this.node.eulerAngles.z % 360 + 360) % 360;
    }

    public setSpeedMultiplier(val: number) { 
        this._speedMultiplier = val; 
    }

    public setPaused(value: boolean) {
        this._isPaused = value;
    }

    public triggerReverse() {
        if (!this._isReverseMode) {
            this._direction *= -1;
        }
    }

    public triggerMissPenalty() {
        this._isFrozen = true;
        // A new miss extends the current freeze rather than allowing an old
        // scheduled callback to release the pointer first.
        this.unschedule(this.releaseMissPenalty);
        this.scheduleOnce(this.releaseMissPenalty, 0.4);
    }

    private releaseMissPenalty() {
        this._isFrozen = false;
    }
}
