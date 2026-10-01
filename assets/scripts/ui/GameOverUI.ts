import { _decorator, Button, Component, instantiate, Label, Node, v3 } from 'cc';
import { GameConfig, GameMode } from '../core/GameConfig';
import { PlayerData } from '../core/PlayerData';
import { PlatformConfig } from '../platform/PlatformConfig';
import { PlatformMgr } from '../platform/PlatformMgr';
import { EventManager, GameEvents } from '../utils/EventManager';
import { presentPanel } from './UITransition';
import { AdService } from '../platform/AdService';
const { ccclass, property } = _decorator;

@ccclass('GameOverUI')
export class GameOverUI extends Component {
    @property(Label) public titleLabel: Label = null!;
    @property(Node) public nextBtn: Node = null!;
    @property(Node) public reviveBtn: Node = null!;
    @property(Node) public gamePlayPanel: Node = null!;
    @property(Node) public mainMenuPanel: Node = null!;

    private _savedLevelIndex = 0;
    private _savedMode = GameMode.NORMAL;
    private _savedScore = 0;
    private _revivePending = false;
    private _interstitialPending = false;
    private _savedWin = false;
    private _requestVersion = 0;
    private _shareBtn: Node | null = null;

    onLoad() {
        this.ensureShareButton();
    }

    onEnable() {
        EventManager.on(GameEvents.GAME_OVER, this.onShowSummary, this);
        presentPanel(this.node);
        if (this._shareBtn) this._shareBtn.active = PlatformMgr.current.capabilities.share;
    }

    onDisable() {
        EventManager.off(GameEvents.GAME_OVER, this.onShowSummary, this);
        this._requestVersion++;
        this._revivePending = false;
        this._interstitialPending = false;
    }

    private onShowSummary(isWin: boolean, levelIndex: number, score: number, mode: GameMode = GameMode.NORMAL) {
        this._savedLevelIndex = levelIndex;
        this._savedMode = mode;
        this._savedScore = score;
        this._savedWin = isWin;
        this._requestVersion++;
        this._revivePending = false;
        this._interstitialPending = false;
        this.setActionsEnabled(true);
        AdService.hideBanner();

        if (mode === GameMode.CHALLENGE) {
            const isNewBest = PlayerData.submitChallengeScore(score);
            const bestScore = PlayerData.getChallengeBestScore();
            if (this.titleLabel) {
                this.titleLabel.string = isNewBest
                    ? `🏆 NEW RECORD! SCORE: ${score}`
                    : `🏆 CHALLENGE OVER! SCORE: ${score} / BEST: ${bestScore}`;
            }
            if (this.nextBtn) this.nextBtn.active = false;
            this.setReviveVisible(false);
            this.setRestartText(PlayerData.isChallengeUnlocked() ? 'PLAY AGAIN' : 'BACK TO MODES');

            if (isNewBest) {
                void PlatformMgr.current
                    .uploadScore(PlatformConfig.current.leaderboardKey, bestScore)
                    .then((result) => {
                        if (result.ok === false && result.reason !== 'unsupported') {
                            console.warn('[GameOverUI] 最高分上传失败', result.message);
                        }
                    });
            }
        } else {
            if (this.titleLabel) {
                this.titleLabel.string = isWin ? '🔓 LOCK OPENED!' : '💥 TIME UP!';
            }
            if (this.nextBtn) this.nextBtn.active = isWin && levelIndex < GameConfig.LEVELS.length - 1;
            this.setReviveVisible(!isWin && levelIndex > 0 && AdService.canWatchRewarded());
            this.setRestartText('RESTART FROM LEVEL 1');

            if (isWin && levelIndex === GameConfig.LEVELS.length - 1 && PlayerData.unlockChallenge()) {
                console.log('🎉 Normal Mode cleared. Challenge Mode unlocked.');
            }

        }
        if (mode === GameMode.CHALLENGE || isWin) void this.showResultAd();
    }

    public onRestartClick() {
        if (this.isAdPending()) return;
        if (this._savedMode === GameMode.CHALLENGE && !PlayerData.isChallengeUnlocked()) {
            const modePanel = this.node.parent?.getChildByName('ModeSelectUI');
            if (modePanel) {
                this.node.active = false;
                presentPanel(modePanel);
            } else this.onReturnHomeClick();
            return;
        }
        this.startSavedGame(this._savedMode === GameMode.NORMAL ? 0 : this._savedLevelIndex);
    }

    public onNextLevelClick() {
        if (this.isAdPending() || !this._savedWin || this._savedMode !== GameMode.NORMAL || this._savedLevelIndex >= GameConfig.LEVELS.length - 1) return;
        presentPanel(this.gamePlayPanel);
        EventManager.emit(GameEvents.GAME_START, GameMode.NORMAL, this._savedLevelIndex + 1);
        this.node.active = false;
    }

    public async onAdReviveClick() {
        if (this.isAdPending() || this._savedMode !== GameMode.NORMAL
            || this._savedWin || this._savedLevelIndex <= 0 || !AdService.canWatchRewarded()) return;
        const requestVersion = this._requestVersion;
        this._revivePending = true;
        this.setActionsEnabled(false);
        this.updateReviveButton('LOADING AD...', false);

        const result = await AdService.watchRewarded('revive');
        if (!this.node.activeInHierarchy || requestVersion !== this._requestVersion) return;
        this._revivePending = false;
        this.setActionsEnabled(true);
        if (result.ok && result.value.completed) {
            this.startSavedGame(this._savedLevelIndex);
            return;
        }

        this._revivePending = false;
        this.updateReviveButton(this.retryText(), true);
        if (this.titleLabel) this.titleLabel.string = 'AD NOT COMPLETED · TRY AGAIN OR RESTART';
        if (result.ok === false && result.reason !== 'cancelled' && result.reason !== 'not-completed') {
            console.warn('[GameOverUI] 无法完成广告复活', result.message);
        }
    }

    public async onShareClick() {
        if (this.isAdPending()) return;
        const result = await PlatformMgr.current.share({
            title: this._savedMode === GameMode.CHALLENGE
                ? `I scored ${this._savedScore} in Lock Master!`
                : PlatformConfig.current.shareTitle,
            imageUrl: PlatformConfig.current.shareImageUrl,
            query: `from=result&mode=${this._savedMode}&score=${this._savedScore}`,
        });
        if (result.ok === false && result.reason !== 'cancelled') {
            console.warn('[GameOverUI] 分享失败', result.message);
        }
    }

    public onReturnHomeClick() {
        if (this.isAdPending()) return;
        if (!this.mainMenuPanel) {
            console.error('[GameOverUI] 未绑定主界面节点');
            return;
        }
        presentPanel(this.mainMenuPanel);
        this.node.active = false;
    }

    private startSavedGame(levelIndex: number) {
        presentPanel(this.gamePlayPanel);
        EventManager.emit(GameEvents.GAME_START, this._savedMode, levelIndex);
        this.node.active = false;
    }

    private retryText(): string {
        return '▶ WATCH AD · RETRY LEVEL ' + (this._savedLevelIndex + 1);
    }

    private isAdPending(): boolean {
        return this._revivePending || this._interstitialPending;
    }

    private setRestartText(text: string): void {
        const label = this.node.getChildByName('RestartBtn')?.getComponentInChildren(Label);
        if (label) label.string = text;
    }

    private setActionsEnabled(enabled: boolean): void {
        for (const button of this.node.getComponentsInChildren(Button)) button.interactable = enabled;
    }

    private async showResultAd(): Promise<void> {
        const requestVersion = this._requestVersion;
        this._interstitialPending = true;
        this.setActionsEnabled(false);
        const result = await AdService.showResultInterstitial();
        if (!this.node.activeInHierarchy || requestVersion !== this._requestVersion) return;
        this._interstitialPending = false;
        this.setActionsEnabled(true);
        if (result.ok === false && ['unsupported', 'config-missing', 'cooldown', 'busy'].indexOf(result.reason) < 0) {
            console.warn('[GameOverUI] 插屏不可用，已恢复结算操作', result.message);
        }
    }

    private setReviveVisible(visible: boolean) {
        if (!this.reviveBtn) return;
        this.reviveBtn.active = visible;
        if (visible) this.updateReviveButton(this.retryText(), true);
    }

    private updateReviveButton(text: string, interactable: boolean) {
        if (!this.reviveBtn) return;
        const button = this.reviveBtn.getComponent(Button);
        if (button) button.interactable = interactable;
        const label = this.reviveBtn.getComponentInChildren(Label);
        if (label) label.string = text;
    }

    private ensureShareButton() {
        const existing = this.node.getChildByName('ShareBtn');
        if (existing) {
            this._shareBtn = existing;
            return;
        }

        const source = this.node.getChildByName('RestartBtn');
        if (!source) {
            console.warn('[GameOverUI] 缺少 RestartBtn，无法生成分享按钮');
            return;
        }

        const shareBtn = instantiate(source);
        shareBtn.name = 'ShareBtn';
        shareBtn.setPosition(v3(0, -175, 0));
        const button = shareBtn.getComponent(Button);
        if (button) button.clickEvents = [];
        const label = shareBtn.getComponentInChildren(Label);
        if (label) label.string = 'SHARE SCORE';
        shareBtn.on(Node.EventType.TOUCH_END, this.onShareClick, this);
        this.node.addChild(shareBtn);
        this._shareBtn = shareBtn;
    }
}
