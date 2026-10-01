import { _decorator, Component, Node, Vec3, tween } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('PointerCtrl')
export class PointerCtrl extends Component {
    @property(Node)
    public pointerNode: Node = null!; // 拖入你的指针节点

    private _moveSpeed: number = 100; // 每秒旋转角度
    private _direction: number = 1;   // 1为顺时针，-1为逆时针
    private _speedMultiplier: number = 1; // 加速倍率
    private _isPaused: boolean = false;

    public isReverseEnabled: boolean = false; // 是否开启过关反向（第三关开启）

    update(dt: number) {
        if (this._isPaused || !this.pointerNode) return;

        // 计算当前帧旋转角度
        let currentEuler = this.pointerNode.eulerAngles;
        let deltaAngle = this._moveSpeed * this._speedMultiplier * this._direction * dt;
        
        // Cocos Creator Z轴顺时针为负，逆时针为正
        this.pointerNode.setRotationFromEuler(new Vec3(0, 0, currentEuler.z - deltaAngle));
    }

    // 设置基础速度
    public initSpeed(speed: number) {
        this._moveSpeed = speed;
        this._direction = 1;
        this._speedMultiplier = 1;
        this._isPaused = false;
    }

    // 按住加速
    public setSpeedMultiplier(multiplier: number) {
        this._speedMultiplier = multiplier;
    }

    // 反向运动
    public triggerReverse() {
        this._direction *= -1;
    }

    // 失败短暂停顿与震动
    public triggerMissPenalty(targetLockNode: Node) {
        if (this._isPaused) return;
        this._isPaused = true;

        // 1. 指针停顿 0.5 秒后恢复
        this.scheduleOnce(() => {
            this._isPaused = false;
        }, 0.5);

        // 2. 简单的锁芯节点代码震动效果
        if (targetLockNode) {
            let origPos = targetLockNode.position.clone();
            tween(targetLockNode)
                .to(0.05, { position: new Vec3(origPos.x + 10, origPos.y, origPos.z) })
                .to(0.05, { position: new Vec3(origPos.x - 10, origPos.y, origPos.z) })
                .to(0.05, { position: new Vec3(origPos.x, origPos.y + 10, origPos.z) })
                .to(0.05, { position: new Vec3(origPos.x, origPos.y, origPos.z) })
                .start();
        }
    }

        // 获取当前指针相对于正上方的绝对角度 (确保严格落在 0-360 范围内)
    public getAbsoluteAngle(): number {
        if (!this.pointerNode) return 0;
        let z = this.pointerNode.eulerAngles.z;
        
        // Cocos Z轴度数可能超出360或为负数，通过此标准公式将其锁死在 0~360
        let normalizedAngle = (z % 360 + 360) % 360;
        return normalizedAngle;
    }
}