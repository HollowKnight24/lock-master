import { _decorator, Component, Node, Sprite, Color, tween, v3, Tween } from 'cc';
import { HighlightType } from './GameConfig';
const { ccclass, property } = _decorator;

@ccclass('ZoneSpawner')
export class ZoneSpawner extends Component {
    @property(Node)
    public zoneNode: Node = null!; 

    // ⭐【核心修复1】将原有的 public 变量改为私有存储
    private _currentType: HighlightType = HighlightType.NONE;

    // ⭐【核心修复2】通过 get 属性提供安全保护：只要高亮区节点还是 active(可见) 的，
    // 即使 clearZone 把变量抹掉了，它依然能返回刚刚被点击成功的真实类型，撑过 0.05 秒的断档期！
    public get currentType(): HighlightType {
        if (!this.zoneNode || !this.zoneNode.active) {
            return HighlightType.NONE;
        }
        return this._currentType;
    }
    public set currentType(value: HighlightType) {
        this._currentType = value;
    }

    // ⭐ 每帧动态、严格计算出当前扇形在屏幕上的真实“视觉中轴线角度”
    public get centerAngle(): number {
        if (!this.zoneNode || !this._sprite) return 0;
        let nodeAngle = (this.zoneNode.eulerAngles.z % 360 + 360) % 360;
        let halfWidth = (this._sprite.fillRange * 360) / 2;
        
        // 节点的角度 + 填充的一半 = 扇形的绝对中轴线
        return (nodeAngle + halfWidth) % 360;
    }

    // 动态属性：实时获取当前扇形的实际角度宽度
    public get currentWidth(): number {
        if (!this.zoneNode) return 0;
        let sprite = this.zoneNode.getComponent(Sprite);
        if (sprite) {
            return sprite.fillRange * 360; 
        }
        return 0;
    }

    private _blueChance: number = 0.3;
    private _onZoneExpiredCallback: Function | null = null;
    private _sprite: Sprite | null = null;
    private _currentTween: Tween<any> | null = null; 

    start() {
        if (this.zoneNode) {
            this.zoneNode.active = false;
            this._sprite = this.zoneNode.getComponent(Sprite);
        }
    }

    public setBlueChance(chance: number) {
        this._blueChance = chance;
    }

    public spawnNewZone(onExpired: Function) {
        this._onZoneExpiredCallback = onExpired;
        
        // 每次生成时，先确保掐断上一次运行的任何缓动，防止倒计时重叠
        if (this._currentTween) {
            this._currentTween.stop();
            this._currentTween = null;
        }
        
        // 使用公开的 setter 赋值
        this.currentType = Math.random() < this._blueChance ? HighlightType.BLUE : HighlightType.YELLOW;
        
        // 随机一个目标中轴线角度
        let targetCenterAngle = Math.random() * 360;

        if (this.zoneNode && this._sprite) {
            this.zoneNode.setScale(v3(1, 1, 1));
            this.zoneNode.active = true;
            this._sprite.color = this._currentType === HighlightType.BLUE ? Color.BLUE : Color.YELLOW;

            // 构造无污染的第三方缓动对象
            let animTarget = { fillRange: 0.15 }; 
            this._sprite.fillRange = animTarget.fillRange; 

            // 计算初始的节点旋转偏置
            let initOffsetAngle = targetCenterAngle - (this._sprite.fillRange * 360) / 2;
            this.zoneNode.setRotationFromEuler(v3(0, 0, initOffsetAngle));

            this._currentTween = tween(animTarget)
                .to(2.0, { fillRange: 0 }, {
                    onUpdate: () => {
                        if (this.zoneNode && this._sprite) {
                            this._sprite.fillRange = animTarget.fillRange;
                            // 保持两侧收缩的视觉动效，这里用初始随机的 targetCenterAngle 来算偏移
                            let currentOffsetAngle = targetCenterAngle - (animTarget.fillRange * 360) / 2;
                            this.zoneNode.setRotationFromEuler(v3(0, 0, currentOffsetAngle));
                        }
                    }
                })
                .call(() => {
                    this.handleZoneExpired();
                });
                
            this._currentTween.start();
        }
    }

    public clearZone() {
        if (this._currentTween) {
            this._currentTween.stop();
            this._currentTween = null;
        }
        if (this._sprite) tween(this._sprite).stop();
        if (this.zoneNode) {
            tween(this.zoneNode).stop();
            this.zoneNode.active = false; // 🛑 只要这里隐藏，上面的 get currentType 就会安全退化回 NONE
        }
        this.currentType = HighlightType.NONE;
    }

    private handleZoneExpired() {
        this._currentTween = null; 
        this.clearZone();
        if (this._onZoneExpiredCallback) {
            this._onZoneExpiredCallback();
        }
    }
}