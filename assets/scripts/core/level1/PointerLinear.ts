import { _decorator, Component, Vec3, v3 } from 'cc';
const { ccclass } = _decorator;

@ccclass('PointerLinear')
export class PointerLinear extends Component {
    public moveSpeed: number = 300; 
    public minY: number = -235; // 收进正式轨道边缘，给银针及其光晕留出余量
    public maxY: number = 235;

    private _direction: number = 1; 
    private _speedMultiplier: number = 1.0;
    private _isFrozen: boolean = false;
    private _isPaused: boolean = false;

    public initSpeed(speed: number) {
        this.moveSpeed = speed;
        this._direction = 1;
        this._speedMultiplier = 1.0;
        this._isFrozen = false;
        this.unschedule(this.releaseMissPenalty);
        this.node.setPosition(v3(0, this.minY, 0));
    }

    update(dt: number) {
        if (this._isFrozen || this._isPaused) return;

        let step = this.moveSpeed * this._speedMultiplier * dt * this._direction;
        let targetY = this.node.position.y + step;

        if (targetY >= this.maxY) {
            targetY = this.maxY;
            this._direction = -1;
        } else if (targetY <= this.minY) {
            targetY = this.minY;
            this._direction = 1;
        }
        this.node.setPosition(v3(0, targetY, 0));
    }

    public getCurrentY(): number { return this.node.position.y; }
    public setSpeedMultiplier(val: number) { this._speedMultiplier = val; }
    public setPaused(value: boolean) { this._isPaused = value; }

    public triggerMissPenalty() {
        this._isFrozen = true;
        // Repeated taps restart this window instead of allowing an older
        // callback to unfreeze the pointer early.
        this.unschedule(this.releaseMissPenalty);
        this.scheduleOnce(this.releaseMissPenalty, 0.4);
    }

    private releaseMissPenalty() {
        this._isFrozen = false;
    }
}
