import { _decorator, Component, Sprite, Color, tween, Tween, v3 } from 'cc';
import { HighlightType } from '../GameConfig';
const { ccclass } = _decorator;

@ccclass('ZoneRotation')
export class ZoneRotation extends Component {
    private _sprite: Sprite | null = null;
    private _currentTween: Tween<any> | null = null;
    private _onExpiredCallback: Function | null = null;
    private _previousWasBlue = false;
    
    private _savedType: HighlightType = HighlightType.NONE;
    public centerAngle: number = 0; 

    public get currentType(): HighlightType {
        if (!this.node || !this.node.active) return HighlightType.NONE;
        return this._savedType;
    }

    public get currentWidth(): number {
        if (!this._sprite) return 0;
        return this._sprite.fillRange * 360; 
    }

    start() {
        this._sprite = this.node.getComponent(Sprite);
    }

    public spawnNewZone(blueChance: number, isHalfCircle: boolean, onExpired: Function, preventConsecutiveBlue = true) {
        this._onExpiredCallback = onExpired;
        this._sprite = this.node.getComponent(Sprite);

        if (this._currentTween) this._currentTween.stop();

        const isBlue = (!preventConsecutiveBlue || !this._previousWasBlue) && Math.random() < blueChance;
        this._savedType = isBlue ? HighlightType.BLUE : HighlightType.YELLOW;
        this._previousWasBlue = isBlue;
        if (this._sprite) {
            this._sprite.color = this._savedType === HighlightType.BLUE ? Color.BLUE : Color.YELLOW;
        }

        // ★ 核心修复：第二关上半圆，中心点安全限定在 30 ~ 150 度之间，保证绝对在正上方
        this.centerAngle = isHalfCircle ? (Math.random() * 120 + 30) : (Math.random() * 360);
        this.centerAngle = (this.centerAngle % 360 + 360) % 360;
        this.node.active = true;

        let animTarget = { fillRange: 0.15 }; 
        this._sprite!.fillRange = animTarget.fillRange;

        // 对齐扇形中心位置
        let initOffset = this.centerAngle - (animTarget.fillRange * 360) / 2;
        initOffset = (initOffset % 360 + 360) % 360;
        this.node.setRotationFromEuler(v3(0, 0, initOffset));

        this._currentTween = tween(animTarget)
            .to(2.0, { fillRange: 0 }, {
                onUpdate: () => {
                    if (!this.node || !this._sprite) return;
                    this._sprite.fillRange = animTarget.fillRange;
                    let currentOffset = this.centerAngle - (animTarget.fillRange * 360) / 2;
                    currentOffset = (currentOffset % 360 + 360) % 360;
                    this.node.setRotationFromEuler(v3(0, 0, currentOffset));
                }
            })
            .call(() => {
                this.clearZone();
                if (this._onExpiredCallback) this._onExpiredCallback();
            });
        this._currentTween.start();
    }

    public clearZone() {
        if (this._currentTween) {
            this._currentTween.stop();
            this._currentTween = null;
        }
        this._savedType = HighlightType.NONE;
        this.node.active = false;
    }

    public setPaused(value: boolean) {
        if (!this._currentTween) return;
        if (value) this._currentTween.pause();
        else this._currentTween.resume();
    }
}
