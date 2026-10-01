import { _decorator, Button, Color, Component, director, find, Graphics, HorizontalTextAlignment, Label, LabelOutline, Node, resources, Sprite, SpriteFrame, UITransform, Vec2, Widget, isValid } from 'cc';
import { ZoneLinear } from '../core/level1/ZoneLinear';
import { ZoneRotation } from '../core/level2_3/ZoneRotation';
import { HighlightType } from '../core/GameConfig';
import { EventManager, GameEvents } from '../utils/EventManager';
const { ccclass, property } = _decorator;

import { size, child, layer, hideRender, sprite, picture, text, format } from './ArtAssets';
import { usesTouchControls } from './ControlLayout';
const icons: Record<string, string> = {
    PlayBtn: 'play', OpenRankBtn: 'rank', ShareBtn: 'share', SoundBtn: 'speed', NormalModeBtn: 'normal',
    ChallengeModeBtn: 'challenge', ChallengeTrialBtn: 'revive', CloseBtn: 'close', CloseRankBtnn: 'close',
    UnlockBtn: 'unlock', SpeedUpBtn: 'speed', RestartBtn: 'restart',
    NextLevelBtn: 'next', ReviveBtn: 'revive', HomeBtn: 'home',
};
@ccclass('ProductionButton')
export class ProductionButton extends Component {
    @property({ tooltip: '保留在编辑器中设置的按钮与子节点布局。' }) public editorAuthored = false;
    @property({ tooltip: '结算页按可见按钮自动紧凑排列；关闭后使用 Hierarchy 中的位置。' }) public autoReflowResult = true;
    private state = '';
    onLoad(): void {
        if (!this.editorAuthored) this.apply(); else this.lateUpdate();
        this.node.on(Node.EventType.TOUCH_END, this.onTouchEnd, this);
    }
    onDestroy(): void { this.node.off(Node.EventType.TOUCH_END, this.onTouchEnd, this); }
    private onTouchEnd(): void {
        if (this.node.name === 'SpeedUpBtn') return;
        const button = this.node.getComponent(Button);
        if (!button || button.interactable) EventManager.emit(GameEvents.UI_CLICK);
    }
    public apply(): void {
        const parent = this.node.parent?.name || '';
        const name = this.node.name;
        let w = 560, h = 112, x = 0, y = this.node.position.y;
        if (parent === 'MainMenuUI') {
            if (name === 'PlayBtn') y = -280;
            if (name === 'OpenRankBtn') y = -430;
            if (name === 'ShareBtn') y = -580;
        } else if (parent === 'ModeSelectUI') {
            if (name === 'NormalModeBtn') y = 80;
            if (name === 'ChallengeModeBtn') y = -75;
            if (name === 'ChallengeTrialBtn') y = -230;
            if (name === 'CloseBtn') y = -440;
        } else if (parent === 'GamePlayUI') {
            if (name === 'PauseBtn') {
                w = 260; h = 132; y = -605; x = 0;
            } else {
                w = 450; h = 140; y = -790; x = name === 'UnlockBtn' ? 245 : -245;
            }
        } else if (parent === 'GameOverUI') {
            h = 100;
            const positions: Record<string, number> = { RestartBtn: -65, NextLevelBtn: -190, ReviveBtn: -315, ShareBtn: -440, HomeBtn: -565 };
            y = positions[name] ?? y;
        } else if (parent === 'RankListUI') y = -580;
        size(this.node, w, h); this.node.setPosition(x, y);
        hideRender(this.node);
        const b = this.node.getComponent(Button);
        if (b) { b.transition = Button.Transition.SCALE; b.zoomScale = 0.95; }
        const art = layer(this.node, '__ButtonArt', w, h);
        art.setSiblingIndex(0);
        const icon = picture(this.node, '__ButtonIcon', 'ui/icon_' + (icons[name] || 'play'), 76, 76, -w / 2 + 75);
        if (name === 'PauseBtn') icon.active = false;
        const l = this.node.children.find(n => n.name === 'Label')?.getComponent(Label);
        if (l) {
            if (name === 'PauseBtn') {
                size(l.node, 230, 108); l.node.setPosition(0, 0); format(l, 40);
            } else {
                size(l.node, w - 175, h - 16); l.node.setPosition(36, 0); format(l, parent === 'GamePlayUI' ? 33 : 35);
            }
            if (l.string === 'button') l.string = 'LEFT CLICK · PICK';
            if (l.string === 'speed') l.string = 'RIGHT CLICK · BOOST';
        }
        this.state = ''; this.lateUpdate();
    }
    lateUpdate(): void {
        const b = this.node.getComponent(Button);
        const name = this.node.name;
        if (this.autoReflowResult && this.node.parent?.name === 'GameOverUI') {
            const order = ['RestartBtn', 'NextLevelBtn', 'ReviveBtn', 'ShareBtn', 'HomeBtn'];
            const visible = order.filter(key => this.node.parent?.getChildByName(key)?.active);
            const index = visible.indexOf(name);
            if (index >= 0) this.node.setPosition(0, -80 - index * 125);
        }
        const tone = b && !b.interactable ? 'disabled' : name === 'SpeedUpBtn' ? (usesTouchControls() ? 'cyan' : 'red') :
            ['ChallengeModeBtn', 'ChallengeTrialBtn', 'NextLevelBtn', 'ReviveBtn', 'ShareBtn'].indexOf(name) >= 0 ? 'cyan' : 'gold';
        if (tone === this.state) return;
        this.state = tone;
        const art = this.node.getChildByName('__ButtonArt');
        if (art) sprite(art, 'ui/button_' + tone);
    }
}
