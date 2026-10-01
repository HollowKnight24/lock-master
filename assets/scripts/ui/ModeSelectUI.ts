import { _decorator, Button, Component, instantiate, Label, Node } from 'cc';
import { GameConfig, GameMode } from '../core/GameConfig';
import { PlayerData } from '../core/PlayerData';
import { EventManager, GameEvents } from '../utils/EventManager';
import { presentPanel } from './UITransition';
import { AdService } from '../platform/AdService';

const { ccclass, property } = _decorator;

@ccclass('ModeSelectUI')
export class ModeSelectUI extends Component {
    @property(Node) public normalBtn: Node = null!;
    @property(Node) public challengeBtn: Node = null!;
    @property(Node) public challengeLockMask: Node = null!;
    @property(Node) public gamePlayPanel: Node = null!;
    @property(Node) public mainMenuPanel: Node = null!;
    @property(Node) public challengeTrialBtn: Node = null!;

    private _trialPending = false;
    private _requestVersion = 0;

    onLoad() {
        this.ensureTrialButton();
    }

    onEnable() {
        AdService.hideBanner();
        this.refreshUnlockState();
    }

    onDisable() {
        this._requestVersion++;
        this._trialPending = false;
    }

    private ensureTrialButton(): void {
        if (!this.challengeTrialBtn) this.challengeTrialBtn = this.node.getChildByName('ChallengeTrialBtn')!;
        if (this.challengeTrialBtn || !this.normalBtn) return;
        const trial = instantiate(this.normalBtn);
        trial.name = 'ChallengeTrialBtn';
        trial.setPosition(0, -230, 0);
        const button = trial.getComponent(Button);
        if (button) button.clickEvents = [];
        trial.on(Node.EventType.TOUCH_END, this.onChallengeTrialClick, this);
        this.node.addChild(trial);
        this.challengeTrialBtn = trial;
    }

    /** 检查是否已通关普通模式。 */
    public refreshUnlockState() {
        const isUnlocked = PlayerData.isChallengeUnlocked();
        if (this.challengeLockMask) {
            this.challengeLockMask.active = !isUnlocked;
        }
        const challengeButton = this.challengeBtn?.getComponent(Button);
        if (challengeButton) challengeButton.interactable = isUnlocked && !this._trialPending;
        if (this.challengeTrialBtn) {
            this.challengeTrialBtn.active = !isUnlocked;
            const button = this.challengeTrialBtn.getComponent(Button);
            if (button) button.interactable = !this._trialPending
                && (PlayerData.hasChallengeTrial() || AdService.canWatchRewarded());
            const label = this.challengeTrialBtn.getComponentInChildren(Label);
            if (label) label.string = this._trialPending ? 'LOADING AD...'
                : PlayerData.hasChallengeTrial() ? 'START CHALLENGE TRIAL'
                : '▶ WATCH AD FOR 1 CHALLENGE RUN';
        }
        const note = this.node.getChildByName('__Note')?.getComponent(Label);
        if (note) note.string = isUnlocked ? 'CHALLENGE MODE UNLOCKED'
            : AdService.canWatchRewarded() || PlayerData.hasChallengeTrial()
                ? 'CLEAR ALL 5 LEVELS TO UNLOCK · OR WATCH AN AD FOR 1 RUN'
                : 'CLEAR ALL 5 LEVELS TO UNLOCK · ADS CURRENTLY UNAVAILABLE';
        for (const name of ['NormalModeBtn', 'CloseBtn']) {
            const button = this.node.getChildByName(name)?.getComponent(Button);
            if (button) button.interactable = !this._trialPending;
        }
    }

    public onNormalModeClick() {
        if (this._trialPending) return;
        this.node.active = false;
        presentPanel(this.gamePlayPanel);
        EventManager.emit(GameEvents.GAME_START, GameMode.NORMAL, 0);
    }

    public onChallengeModeClick() {
        if (this._trialPending) return;
        if (!PlayerData.isChallengeUnlocked()) {
            console.log('Challenge Mode is locked. Clear Normal Mode first.');
            return;
        }

        this.node.active = false;
        presentPanel(this.gamePlayPanel);
        EventManager.emit(GameEvents.GAME_START, GameMode.CHALLENGE, GameConfig.CHALLENGE_CONFIG.levelIndex);
    }

    public async onChallengeTrialClick(): Promise<void> {
        if (this._trialPending || PlayerData.isChallengeUnlocked()) return;
        if (!PlayerData.hasChallengeTrial()) {
            if (!AdService.canWatchRewarded()) return;
            const requestVersion = this._requestVersion;
            this._trialPending = true;
            this.refreshUnlockState();
            const result = await AdService.watchRewarded('challenge-trial');
            if (result.ok && result.value.completed) PlayerData.grantChallengeTrial();
            if (!this.node.activeInHierarchy || requestVersion !== this._requestVersion) return;
            this._trialPending = false;
            this.refreshUnlockState();
            if (!result.ok || !result.value.completed) {
                const note = this.node.getChildByName('__Note')?.getComponent(Label);
                if (note) note.string = 'AD NOT COMPLETED · TRY AGAIN OR PLAY NORMAL MODE';
                return;
            }
        }
        this.node.active = false;
        presentPanel(this.gamePlayPanel);
        EventManager.emit(GameEvents.GAME_START, GameMode.CHALLENGE, GameConfig.CHALLENGE_CONFIG.levelIndex);
    }

    public onCloseClick() {
        if (this._trialPending) return;
        presentPanel(this.mainMenuPanel);
        this.node.active = false;
    }
}
