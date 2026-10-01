import { _decorator, Button, Component, instantiate, Label, Node, v3 } from 'cc';
import { PlatformConfig } from '../platform/PlatformConfig';
import { PlatformMgr } from '../platform/PlatformMgr';
import { AudioManager } from '../utils/AudioManager';
import { PlayerData } from '../core/PlayerData';
import { VisualTheme } from './VisualTheme';
import { presentPanel } from './UITransition';
import { SafeAreaLayout } from './SafeAreaLayout';
import { AdService } from '../platform/AdService';
const { ccclass, property } = _decorator;

@ccclass('MainMenuUI')
export class MainMenuUI extends Component {
    @property(Node) public rankListPanel: Node = null!;
    @property(Node) public modeSelectPanel: Node = null!;

    private _shareBtn: Node | null = null;
    private _soundBtn: Node | null = null;

    onLoad() {
        AdService.initialize();
        AudioManager.ensureInitialized();
        VisualTheme.ensureInitialized();
        this.ensureShareButton();
        this.ensureSoundButton();
        SafeAreaLayout.ensureInitialized();
        void PlatformMgr.initialize().then((result) => {
            if (result.ok === false && result.reason !== 'unsupported') {
                console.warn('[MainMenuUI] Platform initialization did not complete', result.message);
            }
        });
        PlatformMgr.reportClientConfigIssues();
    }

    onEnable() {
        const platform = PlatformMgr.current;
        if (this._shareBtn) this._shareBtn.active = platform.capabilities.share;
        void platform.showBanner('home-banner').then((result) => {
            if (result.ok === false && result.reason !== 'unsupported' && result.reason !== 'config-missing' && result.reason !== 'cancelled') {
                console.warn('[MainMenuUI] Banner display failed', result.message);
            }
        });
    }

    onDisable() {
        PlatformMgr.current.hideBanner();
    }

    public onPlayButtonClick() {
        this.node.active = false;
        if (this.modeSelectPanel) {
            presentPanel(this.modeSelectPanel);
        } else {
            console.error('[MainMenuUI] ModeSelectUI node is not assigned.');
        }
    }

    public onOpenRankClick() {
        presentPanel(this.rankListPanel);
    }

    public async onShareClick() {
        const result = await PlatformMgr.current.share({
            title: PlatformConfig.current.shareTitle,
            imageUrl: PlatformConfig.current.shareImageUrl,
            query: 'from=main_menu',
        });
        if (result.ok === false && result.reason !== 'cancelled') {
            console.warn('[MainMenuUI] Share failed', result.message);
        }
    }

    public onSoundToggleClick() {
        const enabled = !PlayerData.isAudioEnabled();
        AudioManager.ensureInitialized()?.setAudioEnabled(enabled);
        this.updateSoundButton();
    }

    private ensureShareButton() {
        const existing = this.node.getChildByName('ShareBtn');
        if (existing) {
            this._shareBtn = existing;
            return;
        }

        const source = this.node.getChildByName('OpenRankBtn');
        if (!source) {
            console.warn('[MainMenuUI] OpenRankBtn is missing; share button was not created.');
            return;
        }

        const shareBtn = instantiate(source);
        shareBtn.name = 'ShareBtn';
        shareBtn.setPosition(v3(0, -60, 0));
        const button = shareBtn.getComponent(Button);
        if (button) button.clickEvents = [];
        const label = shareBtn.getComponentInChildren(Label);
        if (label) label.string = 'SHARE GAME';
        shareBtn.on(Node.EventType.TOUCH_END, this.onShareClick, this);
        this.node.addChild(shareBtn);
        this._shareBtn = shareBtn;
    }

    private ensureSoundButton() {
        const existing = this.node.getChildByName('SoundBtn');
        if (existing) {
            this._soundBtn = existing;
            existing.setPosition(v3(330, -760, 0));
            this.updateSoundButton();
            return;
        }
        const source = this.node.getChildByName('OpenRankBtn');
        if (!source) {
            console.warn('[MainMenuUI] OpenRankBtn is missing; sound toggle was not created.');
            return;
        }
        const soundBtn = instantiate(source);
        soundBtn.name = 'SoundBtn';
        // Keep the large switch clear of the hanging lanterns, logo, mascot and chest.
        soundBtn.setPosition(v3(330, -760, 0));
        soundBtn.setScale(v3(0.58, 0.58, 1));
        const button = soundBtn.getComponent(Button);
        if (button) button.clickEvents = [];
        soundBtn.on(Node.EventType.TOUCH_END, this.onSoundToggleClick, this);
        this.node.addChild(soundBtn);
        this._soundBtn = soundBtn;
        this.updateSoundButton();
    }

    private updateSoundButton() {
        const label = this._soundBtn?.getComponentInChildren(Label);
        if (label) label.string = PlayerData.isAudioEnabled() ? 'SOUND: ON' : 'SOUND: OFF';
    }
}
