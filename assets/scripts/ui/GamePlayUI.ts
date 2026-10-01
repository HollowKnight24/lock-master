import { _decorator, Color, Component, EventKeyboard, EventMouse, game, Game, Graphics, HorizontalTextAlignment, Input, KeyCode, Label, Node, input } from 'cc';
import { GameConfig, GameMode, QTEResult } from '../core/GameConfig';
import { EventManager, GameEvents } from '../utils/EventManager';
import { LockManager } from '../core/LockManager';
import { PointerLinear } from '../core/level1/PointerLinear';
import { ZoneLinear } from '../core/level1/ZoneLinear';
import { ValidatorLinear } from '../core/level1/ValidatorLinear';
import { PointerRotation } from '../core/level2_3/PointerRotation';
import { ZoneRotation } from '../core/level2_3/ZoneRotation';
import { QTEValidator } from '../core/level2_3/QTEValidator';
import { PlayerData } from '../core/PlayerData';
import { AdService } from '../platform/AdService';
import { PathTrack } from '../core/PathTrack';
import { presentPanel } from './UITransition';
import { PlatformMgr } from '../platform/PlatformMgr';
import { format, layer, size, text } from './ArtAssets';
import { usesTouchControls } from './ControlLayout';

const { ccclass, property } = _decorator;

@ccclass('GamePlayUI')
export class GamePlayUI extends Component {
    @property(Label) public timeLabel: Label = null!; 
    @property(Label) public scoreLabel: Label = null!; 
    @property(LockManager) public lockManager: LockManager = null!;
    @property(Node) public speedUpBtn: Node = null!;
    @property(Node) public gameOverPanel: Node = null!;

    private _currentLevelIdx: number = 0;
    private _score: number = 0;
    private _gameTime: number = GameConfig.INITIAL_TIME;
    private _isGameOver: boolean = true;
    private _isPaused: boolean = false;
    private _currentMode: GameMode = GameMode.NORMAL;
    private _pausePanel: Node | null = null;
    private _suppressButtonUnlockUntil = 0;
    private _escapeHeld = false;
    private _useTouchControls = false;

    onLoad() {
        this._pausePanel = this.node.parent?.getChildByName('PauseUI') ?? null;
        if (this._pausePanel) this._pausePanel.active = false;
        this._useTouchControls = usesTouchControls();
        if (this._useTouchControls) this.setupTouchControls();
        else this.setupMouseControlLegend();
    }

    private setupTouchControls(): void {
        for (const name of ['UnlockBtn', 'SpeedUpBtn', 'PauseBtn']) {
            const button = this.node.getChildByName(name);
            if (button) button.active = true;
        }
        const legend = this.node.getChildByName('__MouseControlLegend');
        if (legend) legend.active = false;
        const oldHint = this.node.getChildByName('__Hint');
        if (oldHint) oldHint.active = false;

        const unlock = this.node.getChildByName('UnlockBtn');
        const boost = this.node.getChildByName('SpeedUpBtn');
        const pause = this.node.getChildByName('PauseBtn');
        const unlockLabel = unlock?.getChildByName('Label')?.getComponent(Label);
        const boostLabel = boost?.getChildByName('Label')?.getComponent(Label);
        if (unlockLabel) unlockLabel.string = 'TAP TO PICK';
        if (boostLabel) boostLabel.string = 'HOLD TO BOOST';
        if (pause) {
            pause.setPosition(0, -605);
            size(pause, 260, 132);
            const art = pause.getChildByName('__ButtonArt');
            if (art) size(art, 260, 132);
            const label = pause.getChildByName('Label')?.getComponent(Label);
            if (label) {
                label.string = 'PAUSE';
                size(label.node, 230, 108);
                label.node.setPosition(0, 0);
                format(label, 40);
            }
        }
    }

    private setupMouseControlLegend(): void {
        // Desktop input is handled globally below; the former large touch buttons
        // are intentionally hidden and no longer form part of the visual layout.
        for (const name of ['UnlockBtn', 'SpeedUpBtn', 'PauseBtn', '__Hint']) {
            const obsolete = this.node.getChildByName(name);
            if (obsolete) obsolete.active = false;
        }

        const legend = layer(this.node, '__MouseControlLegend', 720, 350);
        legend.setPosition(140, -570);
        const rows = [
            { name: 'Pick', label: 'PICK', y: 58, left: true },
            { name: 'Boost', label: 'BOOST (HOLD)', y: -58, left: false },
            { name: 'Pause', label: 'PAUSE', y: -174, left: null },
        ];
        for (const row of rows) {
            const root = layer(legend, '__' + row.name, 700, 104);
            root.setPosition(0, row.y);
            const label = text(root, '__Label', row.label, -92, 0, 430, 82, 38);
            label.horizontalAlign = HorizontalTextAlignment.RIGHT;

            if (row.left === null) {
                const key = layer(root, '__EscKey', 98, 86);
                key.setPosition(218, 0);
                const keyGraphics = key.getComponent(Graphics) || key.addComponent(Graphics);
                keyGraphics.clear();
                keyGraphics.fillColor = new Color(39, 38, 43, 230);
                keyGraphics.roundRect(-47, -37, 94, 74, 12);
                keyGraphics.fill();
                keyGraphics.strokeColor = new Color(224, 224, 216, 255);
                keyGraphics.lineWidth = 5;
                keyGraphics.roundRect(-47, -37, 94, 74, 12);
                keyGraphics.stroke();
                text(key, '__EscText', 'ESC', 0, 0, 88, 60, 29);
                continue;
            }

            const mouse = layer(root, '__Mouse', 96, 126);
            mouse.setPosition(218, 0);
            const g = mouse.getComponent(Graphics) || mouse.addComponent(Graphics);
            g.clear();
            g.fillColor = new Color(39, 38, 43, 230);
            g.roundRect(-38, -56, 76, 112, 34);
            g.fill();
            g.strokeColor = new Color(224, 224, 216, 255);
            g.lineWidth = 5;
            g.roundRect(-38, -56, 76, 112, 34);
            g.stroke();

            g.fillColor = row.left
                ? new Color(255, 191, 70, 255)
                : new Color(117, 190, 255, 255);
            g.roundRect(row.left ? -31 : 2, 7, 29, 41, 10);
            g.fill();
            g.strokeColor = new Color(224, 224, 216, 230);
            g.lineWidth = 3;
            g.moveTo(0, 8);
            g.lineTo(0, 48);
            g.moveTo(-31, 7);
            g.lineTo(31, 7);
            g.stroke();
        }
    }

    private isValidLevelIndex(levelIdx: number): boolean {
        return Number.isInteger(levelIdx) && levelIdx >= 0 && levelIdx < GameConfig.LEVELS.length;
    }

    private getCurrentConfig() {
        return this._currentMode === GameMode.CHALLENGE
            ? GameConfig.CHALLENGE_CONFIG
            : GameConfig.LEVELS[this._currentLevelIdx];
    }

    onEnable() {
        EventManager.on(GameEvents.GAME_START, this.startGame, this);
        // ★ 核心改变：注册底层关卡 Prefab 挂载完毕的通知
        EventManager.on("LEVEL_READY", this.onLevelReadyToInit, this);
        // ★ 核心改变：用纯代码直接绑定物理触摸，不再依赖编辑器的 EventTrigger 组件
        if (this._useTouchControls && this.speedUpBtn) {
            this.speedUpBtn.on(Node.EventType.TOUCH_START, this.onSpeedUpBtnPress, this);
            this.speedUpBtn.on(Node.EventType.TOUCH_END, this.onSpeedUpBtnRelease, this);
            this.speedUpBtn.on(Node.EventType.TOUCH_CANCEL, this.onSpeedUpBtnRelease, this);
        }
        if (!this._useTouchControls) {
            input.on(Input.EventType.MOUSE_DOWN, this.onMouseDown, this);
            input.on(Input.EventType.MOUSE_UP, this.onMouseUp, this);
            input.on(Input.EventType.KEY_DOWN, this.onKeyDown, this);
            input.on(Input.EventType.KEY_UP, this.onKeyUp, this);
        }
        game.on(Game.EVENT_HIDE, this.onSpeedUpBtnRelease, this);
    }

    onDisable() {
        EventManager.off(GameEvents.GAME_START, this.startGame, this);
        EventManager.off("LEVEL_READY", this.onLevelReadyToInit, this);
        // ★ 对应的，在禁用时解绑触摸，防止内存泄漏
        if (this._useTouchControls && this.speedUpBtn) {
            this.speedUpBtn.off(Node.EventType.TOUCH_START, this.onSpeedUpBtnPress, this);
            this.speedUpBtn.off(Node.EventType.TOUCH_END, this.onSpeedUpBtnRelease, this);
            this.speedUpBtn.off(Node.EventType.TOUCH_CANCEL, this.onSpeedUpBtnRelease, this);
        }
        input.off(Input.EventType.MOUSE_DOWN, this.onMouseDown, this);
        input.off(Input.EventType.MOUSE_UP, this.onMouseUp, this);
        input.off(Input.EventType.KEY_DOWN, this.onKeyDown, this);
        input.off(Input.EventType.KEY_UP, this.onKeyUp, this);
        game.off(Game.EVENT_HIDE, this.onSpeedUpBtnRelease, this);
        this._escapeHeld = false;
        this.onSpeedUpBtnRelease();
    }

    public startGame(mode: GameMode, levelIdx: number) {
        const resolvedMode = mode === GameMode.CHALLENGE ? GameMode.CHALLENGE : GameMode.NORMAL;
        if (resolvedMode === GameMode.CHALLENGE && !PlayerData.consumeChallengeEntry()) {
            this._isGameOver = true;
            this.node.active = false;
            const modePanel = this.node.parent?.getChildByName('ModeSelectUI');
            if (modePanel) modePanel.active = true;
            console.warn('[GamePlayUI] Challenge Mode requires a full clear or an ad trial.');
            return;
        }
        this._isPaused = false;
        if (this._pausePanel) this._pausePanel.active = false;
        AdService.initialize();
        AdService.hideBanner();
        if (mode !== GameMode.NORMAL && mode !== GameMode.CHALLENGE) {
            console.error(`[GamePlayUI] Invalid mode ${mode}; falling back to Normal Mode.`);
        }

        const requestedLevelIdx = resolvedMode === GameMode.CHALLENGE
            ? GameConfig.CHALLENGE_CONFIG.levelIndex
            : levelIdx;
        const fallbackLevelIdx = resolvedMode === GameMode.CHALLENGE
            ? Math.max(0, GameConfig.LEVELS.length - 1)
            : 0;
        const resolvedLevelIdx = this.isValidLevelIndex(requestedLevelIdx)
            ? requestedLevelIdx
            : fallbackLevelIdx;

        if (resolvedLevelIdx !== requestedLevelIdx) {
            console.error(`[GamePlayUI] Invalid level ${requestedLevelIdx}; falling back to ${resolvedLevelIdx}.`);
        }

        this.node.active = true;
        this._currentMode = resolvedMode;
        this._currentLevelIdx = resolvedLevelIdx;
        const levelLabel = this.node.getChildByName('LevelLabel')?.getComponent(Label);
        if (levelLabel) levelLabel.string = ['LINEAR LOCK', 'HALF-MOON LOCK', 'S-CURVE LOCK', 'DIAMOND LOCK', 'RING LOCK'][resolvedLevelIdx];
        const config = this.getCurrentConfig();
        this._score = 0;
        this._gameTime = config.initialTime;
        this._isGameOver = false;
        this._isPaused = false;
        if (this._pausePanel) this._pausePanel.active = false;

        if (this.timeLabel) {
            this.timeLabel.string = `⏳ ${this._gameTime.toFixed(1)}s`;
        }

        // UI 目标分展示逻辑
        if (this.scoreLabel) {
            this.scoreLabel.string = resolvedMode === GameMode.CHALLENGE
                ? `SCORE: ${this._score}`
                : `${this._score} / ${config.targetScore}`;
        }

        EventManager.emit("LOAD_LEVEL_PREFAB", resolvedLevelIdx);
        PlatformMgr.current.gameplayStart?.();
    }

    /** ★ 当 LockManager 确保 Prefab 被addChild进去后，安全执行子组件运动初始化 */
    private onLevelReadyToInit(levelIdx: number) {
        if (this._isGameOver) return;
        if (levelIdx !== this._currentLevelIdx) {
            console.warn(`[GamePlayUI] 忽略过期关卡就绪事件：${levelIdx}`);
            return;
        }

        const container = this.lockManager?.containerNode;
        if (!container) {
            console.error('[GamePlayUI] LockManager 或关卡 Container 未绑定，无法初始化关卡');
            this._isGameOver = true;
            return;
        }

        const config = this.getCurrentConfig();
        if (levelIdx === 2 || levelIdx === 3) {
            // PathTrack is fully configured by LockManager.
        } else if (levelIdx === 0) {
            const pLinear = container.getComponentInChildren(PointerLinear);
            if (pLinear) pLinear.initSpeed(config.baseSpeed);
        } else {
            const pRot = container.getComponentInChildren(PointerRotation);
            if (pRot) pRot.initSpeed(config.baseSpeed, levelIdx === 1);
        }
        // Loading may finish while the pause panel is already open. Create
        // the first zone once, then freeze the freshly mounted track.
        const shouldRemainPaused = this._isPaused;
        this._isPaused = false;
        this.nextZone();
        this._isPaused = shouldRemainPaused;
        if (shouldRemainPaused) this.setTrackPaused(true);
    }

    update(dt: number) {
        if (this._isGameOver || this._isPaused) return;
        this._gameTime -= dt;
        if (this._gameTime <= 0) {
            this._gameTime = 0;
            this.endGame(false);
        }
        if (this.timeLabel) {
            this.timeLabel.string = `⏳ ${this._gameTime.toFixed(1)}s`;
        }
    }

    private nextZone() {
        if (this._isGameOver || this._isPaused) return;

        const container = this.lockManager?.containerNode;
        if (!container) {
            console.error('[GamePlayUI] 关卡 Container 不可用，无法生成高亮区域');
            this._isGameOver = true;
            return;
        }

        const config = this.getCurrentConfig();
        if (this._currentLevelIdx === 2 || this._currentLevelIdx === 3) {
            this.lockManager.containerNode.getComponentInChildren(PathTrack)?.spawnZone(config.blueChance);
        } else if (this._currentLevelIdx === 0) {
            const zLinear = container.getComponentInChildren(ZoneLinear);
            if (zLinear) zLinear.spawnNewZone(config.blueChance, () => this.nextZone());
        } else {
            const zRot = container.getComponentInChildren(ZoneRotation);
            if (zRot) zRot.spawnNewZone(config.blueChance, this._currentLevelIdx === 1, () => this.nextZone(), true);
        }
    }

    private onMouseDown(event: EventMouse) {
        if (this._useTouchControls || this._isGameOver || this._isPaused) return;
        if (event.getButton() === EventMouse.BUTTON_LEFT) {
            // The authored button also receives the same physical click. Suppress
            // its delayed callback so one press can never score twice.
            this._suppressButtonUnlockUntil = Date.now() + 250;
            this.resolveUnlockAttempt();
        } else if (event.getButton() === EventMouse.BUTTON_RIGHT) {
            this.onSpeedUpBtnPress();
        }
    }

    private onMouseUp(event: EventMouse) {
        if (this._useTouchControls) return;
        if (event.getButton() === EventMouse.BUTTON_RIGHT) this.onSpeedUpBtnRelease();
    }

    private onKeyDown(event: EventKeyboard) {
        if (event.keyCode !== KeyCode.ESCAPE || this._escapeHeld) return;
        this._escapeHeld = true;
        if (this._isGameOver) return;
        if (this._isPaused) this.onResumeBtnClick();
        else this.onPauseBtnClick();
    }

    private onKeyUp(event: EventKeyboard) {
        if (event.keyCode === KeyCode.ESCAPE) this._escapeHeld = false;
    }

    public onUnlockBtnClick() {
        if (!this._useTouchControls && Date.now() < this._suppressButtonUnlockUntil) return;
        this.resolveUnlockAttempt();
    }

    private resolveUnlockAttempt() {
        if (this._isGameOver || this._isPaused) return;
        let result = QTEResult.MISS;

        if (this._currentLevelIdx === 2 || this._currentLevelIdx === 3) {
            result = this.lockManager.containerNode.getComponentInChildren(PathTrack)?.validate() ?? QTEResult.MISS;
        } else if (this._currentLevelIdx === 0) {
            let pLinear = this.lockManager.containerNode.getComponentInChildren(PointerLinear);
            let zLinear = this.lockManager.containerNode.getComponentInChildren(ZoneLinear);
            if (pLinear && zLinear) {
                result = ValidatorLinear.validate(pLinear.getCurrentY(), zLinear.centerY, zLinear.currentHeight, zLinear.currentType);
            }
        } else {
            let pRot = this.lockManager.containerNode.getComponentInChildren(PointerRotation);
            let zRot = this.lockManager.containerNode.getComponentInChildren(ZoneRotation);
            if (pRot && zRot) {
                result = QTEValidator.validate(pRot.getAbsoluteAngle(), zRot.centerAngle, zRot.currentWidth, zRot.currentType);
                if (result !== QTEResult.MISS && this._currentLevelIdx === 4) {
                    pRot.triggerReverse(); 
                }
            }
        }

        this.handleQTEResult(result);
    }

    private handleQTEResult(result: QTEResult) {
        if (this._isGameOver || this._isPaused) return;
        let isChallenge = (this._currentMode === GameMode.CHALLENGE);
        let config = isChallenge ? GameConfig.CHALLENGE_CONFIG : GameConfig.LEVELS[this._currentLevelIdx];

        if (result === QTEResult.HIT_YELLOW || result === QTEResult.HIT_BLUE) {
            this._score++;
            if (result === QTEResult.HIT_BLUE) {
                this._gameTime += GameConfig.BLUE_ZONE_BONUS; // 蓝区加 1.5s
                EventManager.emit(GameEvents.QTE_HIT_BLUE, GameConfig.BLUE_ZONE_BONUS);
            } else {
                EventManager.emit(GameEvents.QTE_HIT_YELLOW);
            }

            // 刷新分数 UI
            if (this.scoreLabel) {
                this.scoreLabel.string = isChallenge ? `SCORE: ${this._score}` : `${this._score} / ${config.targetScore}`;
            }

            // 普通模式判断是否过关[cite: 1]
            if (!isChallenge && this._score >= config.targetScore) {
                this.endGame(true);
                return;
            }

            this.clearCurrentTrackZone();
            this.nextZone();
        } else {
            EventManager.emit(GameEvents.QTE_MISS);
            
            // ★ 核心修复：Miss 触发多端屏幕震动反馈逻辑
            // @ts-ignore
            if (typeof wx !== 'undefined' && wx.vibrateShort) {
                // @ts-ignore
                wx.vibrateShort({ type: 'medium' });
            // @ts-ignore
            } else if (typeof tt !== 'undefined' && tt.vibrateShort) {
                // @ts-ignore
                tt.vibrateShort({ type: 'medium' });
            } else {
                // H5 网页白盒环境下让锁芯物理容器坐标发生突变以模拟物理震动
                let container = this.lockManager.containerNode;
                if (container) {
                    let origX = container.position.x;
                    this.scheduleOnce(() => container.setPosition(origX + 12, container.position.y), 0.02);
                    this.scheduleOnce(() => container.setPosition(origX - 12, container.position.y), 0.04);
                    this.scheduleOnce(() => container.setPosition(origX, container.position.y), 0.06);
                }
            }

            if (this._currentLevelIdx === 2 || this._currentLevelIdx === 3) {
                this.lockManager.containerNode.getComponentInChildren(PathTrack)?.triggerMissPenalty();
            } else if (this._currentLevelIdx === 0) {
                this.lockManager.containerNode.getComponentInChildren(PointerLinear)?.triggerMissPenalty();
            } else {
                this.lockManager.containerNode.getComponentInChildren(PointerRotation)?.triggerMissPenalty();
            }
        }
    }

    private clearCurrentTrackZone() {
        if (this._currentLevelIdx === 2 || this._currentLevelIdx === 3) {
            this.lockManager.containerNode.getComponentInChildren(PathTrack)?.clearZone();
        } else if (this._currentLevelIdx === 0) {
            this.lockManager.containerNode.getComponentInChildren(ZoneLinear)?.clearZone();
        } else {
            this.lockManager.containerNode.getComponentInChildren(ZoneRotation)?.clearZone();
        }
    }

    public onSpeedUpBtnPress() {
        if (this._isGameOver || this._isPaused) return;
        this.setTrackSpeedMultiplier(2.2);
    }

    public onSpeedUpBtnRelease() {
        this.setTrackSpeedMultiplier(1);
    }

    public onPauseBtnClick() {
        if (this._isGameOver || this._isPaused) return;
        this._isPaused = true;
        this.setTrackSpeedMultiplier(1);
        this.setTrackPaused(true);
        presentPanel(this._pausePanel);
        PlatformMgr.current.gameplayStop?.();
    }

    public onResumeBtnClick() {
        if (this._isGameOver || !this._isPaused) return;
        this._isPaused = false;
        if (this._pausePanel) this._pausePanel.active = false;
        this.setTrackPaused(false);
        PlatformMgr.current.gameplayStart?.();
    }

    public onPauseHomeClick() {
        if (this._isGameOver) return;
        this._isGameOver = true;
        this._isPaused = false;
        this.setTrackSpeedMultiplier(1);
        this.setTrackPaused(false);
        if (this._pausePanel) this._pausePanel.active = false;
        this.clearCurrentTrackZone();
        this.lockManager?.clearTrack();
        PlatformMgr.current.gameplayStop?.();
        this.node.active = false;
        presentPanel(this.node.parent?.getChildByName('MainMenuUI') ?? null);
    }

    private setTrackPaused(value: boolean) {
        const container = this.lockManager?.containerNode;
        if (!container) return;
        container.getComponentInChildren(PathTrack)?.setPaused(value);
        container.getComponentInChildren(PointerLinear)?.setPaused(value);
        container.getComponentInChildren(PointerRotation)?.setPaused(value);
        container.getComponentInChildren(ZoneLinear)?.setPaused(value);
        container.getComponentInChildren(ZoneRotation)?.setPaused(value);
    }

    private setTrackSpeedMultiplier(value: number) {
        if (!this.lockManager?.containerNode) return;
        if (this._currentLevelIdx === 2 || this._currentLevelIdx === 3) {
            this.lockManager.containerNode.getComponentInChildren(PathTrack)?.setSpeedMultiplier(value);
        } else if (this._currentLevelIdx === 0) {
            this.lockManager.containerNode.getComponentInChildren(PointerLinear)?.setSpeedMultiplier(value);
        } else {
            this.lockManager.containerNode.getComponentInChildren(PointerRotation)?.setSpeedMultiplier(value);
        }
    }

    private endGame(isWin: boolean) {
        PlatformMgr.current.gameplayStop?.();
        this._isGameOver = true;
        this._isPaused = false;
        if (this._pausePanel) this._pausePanel.active = false;
        this.setTrackPaused(false);
        this.clearCurrentTrackZone();
        // 1. 清理物理锁芯残余
        if (this.lockManager && this.lockManager.containerNode) {
            this.lockManager.clearTrack();
        }
        // 2. ★ 核心修复：在这里由活着的 GamePlayUI 直接强行把 GameOverUI 节点点名激活！
        if (this.gameOverPanel) {
            this.gameOverPanel.active = true; 
        } else {
            console.error("[GamePlayUI] 未在属性检查器中绑定 gameOverPanel 节点！");
        }
        this.node.active = false;
        EventManager.emit(GameEvents.GAME_OVER, isWin, this._currentLevelIdx, this._score, this._currentMode);
        if (isWin) PlatformMgr.current.happyTime?.();
    }
}
