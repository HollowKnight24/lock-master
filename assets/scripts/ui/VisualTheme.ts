import { _decorator, Button, Color, Component, director, find, Graphics, HorizontalTextAlignment, Label, Node, resources, Sprite, SpriteFrame, UITransform, Vec2, Widget, isValid } from 'cc';
import { ZoneLinear } from '../core/level1/ZoneLinear';
import { ZoneRotation } from '../core/level2_3/ZoneRotation';
import { GameConfig, HighlightType } from '../core/GameConfig';
import { EventManager, GameEvents } from '../utils/EventManager';
const { ccclass, property } = _decorator;

import { size, child, layer, hideRender, sprite, picture, text, format } from './ArtAssets';
import { ProductionZone } from './ProductionZone';
import { ProductionButton } from './ProductionButton';
import { tween, Tween, UIOpacity, Vec3 } from 'cc';
@ccclass('VisualTheme')
export class VisualTheme extends Component {
    @property({ tooltip: '正式场景已在 Hierarchy 中搭建；运行时不再覆盖布局。' })
    public editorAuthored = false;
    private scanTime = 0;
    private resultVersion = 0;
    public static ensureInitialized(): VisualTheme | null {
        const scene = director.getScene();
        const canvas = scene ? find('Canvas', scene) : null;
        return canvas ? canvas.getComponent(VisualTheme) || canvas.addComponent(VisualTheme) : null;
    }
    onLoad(): void { if (!this.editorAuthored) this.layout(); }
    onEnable(): void {
        EventManager.on('LEVEL_READY', this.styleTracks, this);
        EventManager.on(GameEvents.GAME_OVER, this.result, this);
        EventManager.on(GameEvents.QTE_HIT_YELLOW, this.hitYellow, this);
        EventManager.on(GameEvents.QTE_HIT_BLUE, this.hitBlue, this);
        EventManager.on(GameEvents.QTE_MISS, this.miss, this);
    }
    onDisable(): void {
        EventManager.off('LEVEL_READY', this.styleTracks, this);
        EventManager.off(GameEvents.GAME_OVER, this.result, this);
        EventManager.off(GameEvents.QTE_HIT_YELLOW, this.hitYellow, this);
        EventManager.off(GameEvents.QTE_HIT_BLUE, this.hitBlue, this);
        EventManager.off(GameEvents.QTE_MISS, this.miss, this);
    }
    lateUpdate(dt: number): void {
        if (this.editorAuthored) return;
        this.scanTime += dt;
        if (this.scanTime < 0.4) return;
        this.scanTime = 0;
        this.buttons(this.node);
    }
    private root(name: string): Node | null { return find('UIRoot/' + name, this.node); }
    private modal(root: Node): void {
        const n = layer(root, '__ModalShade', 1080, 1920); n.setSiblingIndex(0);
        const g = n.getComponent(Graphics) || n.addComponent(Graphics);
        g.clear(); g.fillColor = new Color(12, 8, 20, 205);
        g.rect(-540, -960, 1080, 1920); g.fill();
        const plate = picture(root, '__Panel', 'ui/panel_wood', 900, 1310);
        plate.setSiblingIndex(1);
    }
    private layout(): void {
        picture(this.node, '__ProductionBackground', 'background/bg_cartoon_dungeon', 1080, 1920).setSiblingIndex(0);
        const menu = this.root('MainMenuUI');
        if (menu) {
            hideRender(menu.getChildByName('Background')); hideRender(menu.getChildByName('Graphics'));
            picture(menu, '__Logo', 'branding/logo_lockmaster', 930, 465, 0, 600);
            picture(menu, '__Mascot', 'characters/mascot_idle', 570, 620, 0, 115);
            text(menu, '__Hint', 'Find the sweet spot. Crack the lock!', 0, -660, 800, 60, 30);
        }
        const mode = this.root('ModeSelectUI');
        if (mode) {
            hideRender(mode.getChildByName('OverlayMask')); this.modal(mode);
            text(mode, '__Title', 'SELECT MODE', 0, 240, 600, 90, 54);
            text(mode, '__Note', 'Clear all 5 levels to unlock · Ads grant one trial run', 0, -340, 750, 60, 25);
            const mask = child(mode, 'LockMask');
            if (mask) {
                mask.children.forEach(hideRender);
                size(mask, 62, 62); mask.setPosition(230, 0);
                picture(mask, '__Locked', 'ui/icon_locked', 62, 62);
            }
        }
        const rank = this.root('RankListUI');
        if (rank) {
            this.modal(rank);
            picture(rank, '__Panel', 'ui/panel_rank', 1040, 1120, 0, 90);
            text(rank, '__Title', 'CHALLENGE RECORD', 0, 295, 570, 80, 44);
            const scroll = child(rank, 'ScrollView');
            if (scroll) {
                size(scroll, 460, 480); scroll.setPosition(0, -60); hideRender(scroll);
                const view = child(scroll, 'view'); if (view) size(view, 440, 440);
                const content = child(scroll, 'content');
                if (content) { size(content, 420, 440).setAnchorPoint(0.5, 1); content.setPosition(0, 220); }
                const item = child(scroll, 'item'); const l = item?.getComponent(Label);
                if (item && l) {
                    size(item, 420, 400).setAnchorPoint(0.5, 1); item.setPosition(0, -10); format(l, 30);
                    l.color = new Color(73, 36, 20);
                    l.enableOutline = true;
                    l.outlineColor = new Color(255, 244, 216);
                    l.outlineWidth = 1;
                }
            }
        }
        const game = this.root('GamePlayUI');
        if (game) {
            for (const [name, x, icon] of [['TimeLabel', -270, 'time'], ['ScoreLabel', 270, 'score']] as const) {
                const n = child(game, name); const l = n?.getComponent(Label);
                if (n && l) { size(n, 400, 85); n.setPosition(x, 775); format(l, 36); }
                picture(game, '__' + icon, 'ui/icon_' + icon, 80, 80, x, 865);
            }
            const level = child(game, 'LevelLabel'); const l = level?.getComponent(Label);
            if (level && l) { size(level, 400, 70); level.setPosition(0, 850); format(l, 30); }
            picture(game, '__GuideMascot', 'characters/mascot_idle', 210, 228, -370, -535);
        }
        const over = this.root('GameOverUI');
        if (over) {
            this.modal(over);
            picture(over, '__ResultMascot', 'characters/mascot_lose', 220, 220, 0, 85);
            const title = child(over, 'ResultTitle'); const l = title?.getComponent(Label);
            if (title && l) { size(title, 740, 110); title.setPosition(0, 260); format(l, 42); }
        }
        this.buttons(this.node); this.styleTracks();
    }
    private buttons(root: Node): void {
        if (root.getComponent(Button) && !root.getComponent(ProductionButton)) root.addComponent(ProductionButton);
        root.children.forEach(n => this.buttons(n));
    }
    private result(win: boolean): void {
        const root = this.root('GameOverUI'); const n = root?.getChildByName('__ResultMascot');
        if (!root || !n) return;
        const version = ++this.resultVersion;
        n.active = false;
        sprite(n, 'characters/mascot_' + (win ? 'win' : 'lose'), () => {
            if (version !== this.resultVersion || !root.activeInHierarchy) return;
            n.active = true;
            Tween.stopAllByTarget(n);
            n.setPosition(0, win ? 48 : 106);
            n.setScale(win ? 0.68 : 0.88, win ? 0.68 : 0.88, 1);
            if (win) {
                // The correct success mascot now performs the celebration;
                // the old implementation animated only the burst behind it.
                tween(n)
                    .to(0.20, { position: new Vec3(0, 102, 0), scale: new Vec3(1.14, 1.14, 1) }, { easing: 'quadOut' })
                    .to(0.16, { position: new Vec3(0, 78, 0), scale: new Vec3(0.96, 0.96, 1) })
                    .to(0.14, { position: new Vec3(0, 85, 0), scale: new Vec3(1, 1, 1) })
                    .start();
            } else {
                tween(n)
                    .to(0.22, { position: new Vec3(0, 76, 0), scale: new Vec3(1.02, 1.02, 1) }, { easing: 'quadOut' })
                    .to(0.18, { position: new Vec3(0, 85, 0), scale: new Vec3(1, 1, 1) })
                    .start();
            }
            this.playResultBurst(root, win);
        });
    }
    private playResultBurst(root: Node, win: boolean): void {
        const burst = layer(root, '__ResultBurst', 150, 150);
        burst.setPosition(0, 85);
        picture(burst, '__Effect', 'effects/fx_' + (win ? 'success' : 'miss'), 145, 145);
        const opacity = burst.getComponent(UIOpacity) || burst.addComponent(UIOpacity);
        Tween.stopAllByTarget(burst); Tween.stopAllByTarget(opacity);
        burst.setScale(0.45, 0.45, 1); opacity.opacity = 0;
        tween(burst).to(0.2, { scale: new Vec3(1.15, 1.15, 1) }).to(0.25, { scale: new Vec3(1, 1, 1) }).start();
        tween(opacity).to(0.08, { opacity: 255 }).delay(0.3).to(0.25, { opacity: 0 }).start();
    }
    private hitYellow(): void { this.feedback('PERFECT HIT', false); }
    private hitBlue(bonusSeconds: number = GameConfig.BLUE_ZONE_BONUS): void {
        const seconds = Number.isFinite(bonusSeconds) ? bonusSeconds : GameConfig.BLUE_ZONE_BONUS;
        const amount = Number.isInteger(seconds) ? seconds.toFixed(0) : seconds.toFixed(1);
        this.feedback(`TIME BONUS +${amount}s`, false);
    }
    private miss(): void { this.feedback('MISSED — TIME IT AGAIN', true); }
    private feedback(message: string, failure: boolean): void {
        const root = this.root('GamePlayUI'); if (!root?.activeInHierarchy) return;
        const n = layer(root, '__QTEFeedback', 600, 110); n.setPosition(0, -430);
        picture(n, '__Effect', 'effects/fx_' + (failure ? 'miss' : 'success'), 100, 100, -200);
        text(n, '__Text', message, 30, 0, 400, 80, 38);
        const opacity = n.getComponent(UIOpacity) || n.addComponent(UIOpacity);
        Tween.stopAllByTarget(n); Tween.stopAllByTarget(opacity);
        n.setScale(0.8, 0.8, 1); opacity.opacity = 0;
        tween(n).to(0.12, { scale: new Vec3(1, 1, 1) }).start();
        tween(opacity).to(0.08, { opacity: 255 }).delay(0.4).to(0.2, { opacity: 0 }).start();
    }
    private styleTracks(): void {
        if (this.editorAuthored) return;
        const container = find('LockManager_Node/TrackContainer', this.node);
        if (!container) return;
        for (const track of container.children) {
            const root = child(track, 'LockBackground_Art');
            if (!root || root.getChildByName('__LockArt')) continue;
            hideRender(root);
            const vertical = track.name.includes('Vertical');
            const half = track.name.includes('Half');
            // Artwork gets a separate offset child. Rule nodes remain at their original origins.
            const art = picture(root, '__LockArt', 'gameplay/lock_' + (vertical ? 'vertical' : half ? 'half' : 'full'),
                vertical ? 930 : 900, vertical ? 1240 : 1200, vertical ? -26 : half ? 0 : 28, vertical ? 137 : 133);
            const levelLabel = this.root('GamePlayUI')?.getChildByName('LevelLabel')?.getComponent(Label);
            if (levelLabel) levelLabel.string = vertical ? 'LINEAR LOCK' : half ? 'HALF-MOON LOCK' : 'RING LOCK';
            art.setSiblingIndex(0);
            const zone = child(track, vertical ? 'Zone_Linear' : 'Zone_Rotation');
            if (zone) {
                // Keep the width inside the slot; enlarge the initial linear hit window.
                size(zone, vertical ? 172 : 540, vertical ? 150 : 540);
                const s = sprite(zone, 'gameplay/zone_yellow_' + (vertical ? 'linear' : 'ring'));
                if (!vertical) {
                    s.type = Sprite.Type.FILLED; s.fillType = Sprite.FillType.RADIAL;
                    s.fillStart = 0; s.fillCenter = new Vec2(0.5, 0.5);
                }
                const z = zone.getComponent(ProductionZone) || zone.addComponent(ProductionZone);
                z.radial = !vertical;
            }
            const pointer = child(track, vertical ? 'Pointer_Linear' : 'Pointer_Rotation');
            if (pointer) {
                hideRender(pointer);
                const oldArt = child(pointer, 'Pointer_Art'); hideRender(oldArt);
                if (vertical) {
                    // Same arrow and visual scale as radial tracks, translated vertically by the rule node.
                    const n = picture(pointer, '__Needle', 'gameplay/pointer_linear', 80, 280);
                    n.setRotationFromEuler(0, 0, -90);
                } else {
                    // Texture pivot is ~85% down the cropped canvas; angle zero must point RIGHT.
                    // New silver needle's pivot sits lower in its source canvas, so align it to the lock center.
                    const n = picture(pointer, '__Needle', 'gameplay/pointer_radial', 80, 280, 130, 0);
                    n.setRotationFromEuler(0, 0, -90);
                }
            }
        }
    }
}
