import { _decorator, Component, Sprite, Color, tween, Tween, v3, UITransform } from 'cc';
import { HighlightType } from '../GameConfig';
const { ccclass } = _decorator;

@ccclass('ZoneLinear')
export class ZoneLinear extends Component {
    private _sprite: Sprite | null = null;
    private _currentTween: Tween<any> | null = null;
    private _onExpiredCallback: Function | null = null;
    private _previousWasBlue = false;

    public centerY: number = 0;
    public currentType: HighlightType = HighlightType.NONE;

    public get currentHeight(): number {
        const transform = this.node.getComponent(UITransform);
        return transform ? Math.abs(this.node.scale.y) * transform.contentSize.height : 0;
    }

    start() {
        this._sprite = this.node.getComponent(Sprite);
    }

    public spawnNewZone(blueChance: number, onExpired: Function) {
        this._onExpiredCallback = onExpired;
        this._sprite = this.node.getComponent(Sprite);
        
        if (this._currentTween) this._currentTween.stop();

        // Keep history through clearZone so an expired or hit blue zone cannot repeat.
        const isBlue = !this._previousWasBlue && Math.random() < blueChance;
        this.currentType = isBlue ? HighlightType.BLUE : HighlightType.YELLOW;
        this._previousWasBlue = isBlue;
        if (this._sprite) {
            this._sprite.color = this.currentType === HighlightType.BLUE ? Color.BLUE : Color.YELLOW;
        }

        // 在槽位 (-200 ~ 200) 内随机中轴线坐标
        this.centerY = (Math.random() * 400) - 200;
        this.node.setPosition(v3(0, this.centerY, 0));

        // 缩放缓动模拟两侧缩小效果
        let scaleTarget = { y: 1.0 };
        this.node.setScale(v3(1, 1, 1));

        this._currentTween = tween(scaleTarget)
            .to(2.0, { y: 0.1 }, {
                onUpdate: () => {
                    if (this.node) this.node.setScale(v3(1, scaleTarget.y, 1));
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
        this.currentType = HighlightType.NONE;
        this.node.setScale(v3(1, 0, 1));
    }

    public setPaused(value: boolean) {
        if (!this._currentTween) return;
        if (value) this._currentTween.pause();
        else this._currentTween.resume();
    }
}
