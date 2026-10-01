import {
    _decorator,
    AudioClip,
    AudioSource,
    Component,
    director,
    find,
    isValid,
    Node,
    resources,
} from 'cc';
import { PlayerData } from '../core/PlayerData';
import { EventManager, GameEvents } from './EventManager';
const { ccclass, property } = _decorator;

const AUDIO_PATHS = {
    hitYellow: 'audio/hit_yellow',
    hitBlue: 'audio/hit_blue',
    miss: 'audio/miss',
    uiClick: 'audio/ui_click',
    win: 'audio/win',
    lose: 'audio/lose',
};

@ccclass('AudioManager')
export class AudioManager extends Component {
    private static _platformMuted = false;
    @property(AudioSource) public sfxSource: AudioSource = null!;
    @property(AudioClip) public hitYellowClip: AudioClip | null = null;
    @property(AudioClip) public hitBlueClip: AudioClip | null = null;
    @property(AudioClip) public missClip: AudioClip | null = null;
    @property(AudioClip) public uiClickClip: AudioClip | null = null;
    @property(AudioClip) public winClip: AudioClip | null = null;
    @property(AudioClip) public loseClip: AudioClip | null = null;

    private readonly _cache = new Map<string, AudioClip>();
    private readonly _loading = new Map<string, Promise<AudioClip | null>>();
    private readonly _missing = new Set<string>();

    /** 将音频控制器挂到现有 GlobalAudio_Node；没有节点时创建一个安全后备节点。 */
    public static ensureInitialized(): AudioManager | null {
        const scene = director.getScene();
        if (!scene) return null;

        let audioNode = find('Canvas/GlobalAudio_Node', scene);
        if (!audioNode) {
            const parent = find('Canvas', scene) || scene;
            audioNode = new Node('GlobalAudio_Node');
            parent.addChild(audioNode);
        }

        return audioNode.getComponent(AudioManager) || audioNode.addComponent(AudioManager);
    }

    onLoad() {
        this.ensureAudioSources();
        this.seedSerializedClips();
    }

    onEnable() {
        EventManager.on(GameEvents.QTE_HIT_YELLOW, this.onHitYellow, this);
        EventManager.on(GameEvents.QTE_HIT_BLUE, this.onHitBlue, this);
        EventManager.on(GameEvents.QTE_MISS, this.onMiss, this);
        EventManager.on(GameEvents.UI_CLICK, this.onUIClick, this);
        EventManager.on(GameEvents.GAME_OVER, this.onGameOver, this);
    }

    onDisable() {
        EventManager.off(GameEvents.QTE_HIT_YELLOW, this.onHitYellow, this);
        EventManager.off(GameEvents.QTE_HIT_BLUE, this.onHitBlue, this);
        EventManager.off(GameEvents.QTE_MISS, this.onMiss, this);
        EventManager.off(GameEvents.UI_CLICK, this.onUIClick, this);
        EventManager.off(GameEvents.GAME_OVER, this.onGameOver, this);
    }

    public setAudioEnabled(enabled: boolean) {
        PlayerData.setAudioEnabled(enabled);
    }

    public static setPlatformMuted(muted: boolean): void {
        this._platformMuted = muted;
    }

    public async playSFX(path: string, serializedClip: AudioClip | null = null) {
        if (AudioManager._platformMuted || !PlayerData.isAudioEnabled() || !this.sfxSource) return;
        const clip = serializedClip || await this.loadClip(path);
        if (!clip || !isValid(this) || !this.enabledInHierarchy || !this.sfxSource
            || AudioManager._platformMuted || !PlayerData.isAudioEnabled()) return;
        this.sfxSource.playOneShot(clip, 0.4);
    }

    private onHitYellow() {
        void this.playSFX(AUDIO_PATHS.hitYellow, this.hitYellowClip);
    }

    private onHitBlue() {
        void this.playSFX(AUDIO_PATHS.hitBlue, this.hitBlueClip);
    }

    private onMiss() {
        void this.playSFX(AUDIO_PATHS.miss, this.missClip);
    }

    private onUIClick() {
        void this.playSFX(AUDIO_PATHS.uiClick, this.uiClickClip);
    }

    private onGameOver(isWin: boolean) {
        void this.playSFX(isWin ? AUDIO_PATHS.win : AUDIO_PATHS.lose, isWin ? this.winClip : this.loseClip);
    }

    private ensureAudioSources() {
        if (!this.sfxSource) {
            const sfxNode = this.getOrCreateChild('SFXSource');
            this.sfxSource = sfxNode.getComponent(AudioSource) || sfxNode.addComponent(AudioSource);
        }
    }

    private getOrCreateChild(name: string): Node {
        let child = this.node.getChildByName(name);
        if (!child) {
            child = new Node(name);
            this.node.addChild(child);
        }
        return child;
    }

    private seedSerializedClips() {
        if (this.hitYellowClip) this._cache.set(AUDIO_PATHS.hitYellow, this.hitYellowClip);
        if (this.hitBlueClip) this._cache.set(AUDIO_PATHS.hitBlue, this.hitBlueClip);
        if (this.missClip) this._cache.set(AUDIO_PATHS.miss, this.missClip);
        if (this.uiClickClip) this._cache.set(AUDIO_PATHS.uiClick, this.uiClickClip);
        if (this.winClip) this._cache.set(AUDIO_PATHS.win, this.winClip);
        if (this.loseClip) this._cache.set(AUDIO_PATHS.lose, this.loseClip);
    }

    private loadClip(path: string): Promise<AudioClip | null> {
        const cached = this._cache.get(path);
        if (cached) return Promise.resolve(cached);
        if (this._missing.has(path)) return Promise.resolve(null);
        const pending = this._loading.get(path);
        if (pending) return pending;

        const request = new Promise<AudioClip | null>((resolve) => {
            resources.load(path, AudioClip, (error, clip) => {
                this._loading.delete(path);
                if (error || !clip) {
                    this._missing.add(path);
                    console.info(`[AudioManager] 音频资源尚未提供：assets/resources/${path}`);
                    resolve(null);
                    return;
                }
                this._cache.set(path, clip);
                resolve(clip);
            });
        });
        this._loading.set(path, request);
        return request;
    }
}
