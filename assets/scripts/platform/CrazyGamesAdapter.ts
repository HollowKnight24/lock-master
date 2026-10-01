import { director } from 'cc';
import type {
    IPlatform,
    LoginResult,
    PlatformCapabilities,
    PlatformResult,
    RewardedVideoResult,
    SharePayload,
    ShareResult,
} from './IPlatform';
import { platformFailure, platformSuccess } from './IPlatform';
import type { AdPlacement } from './PlatformConfig';
import { AudioManager } from '../utils/AudioManager';

type CrazyAdType = 'midgame' | 'rewarded';

/** CrazyGames HTML5 SDK v3 adapter. The SDK script is injected only into the CrazyGames build. */
export class CrazyGamesAdapter implements IPlatform {
    public readonly kind = 'crazygames' as const;
    public readonly name = 'CrazyGames';
    public readonly capabilities: PlatformCapabilities = {
        login: false,
        share: false,
        rewardedVideo: true,
        banner: false,
        interstitial: true,
        leaderboard: false,
    };

    private initPromise: Promise<void> | null = null;
    private settingsListener: ((settings: { muteAudio?: boolean }) => void) | null = null;

    public async login(): Promise<PlatformResult<LoginResult>> {
        try {
            await this.ensureInitialized();
            return platformSuccess({ code: '' });
        } catch (error) {
            return platformFailure('failed', 'CrazyGames SDK failed to initialize.', error);
        }
    }

    public share(_payload: SharePayload): Promise<PlatformResult<ShareResult>> {
        return Promise.resolve(platformFailure('unsupported', 'Sharing is not available on this platform build.'));
    }

    public async showRewardedVideo(_placement: AdPlacement): Promise<PlatformResult<RewardedVideoResult>> {
        const result = await this.requestAd('rewarded');
        if (result.ok) return platformSuccess({ completed: true });
        return result as PlatformResult<RewardedVideoResult>;
    }

    public showBanner(_placement: AdPlacement): Promise<PlatformResult<void>> {
        return Promise.resolve(platformFailure('unsupported', 'CrazyGames controls page-level banner inventory.'));
    }

    public hideBanner(): void {}

    public showInterstitial(_placement: AdPlacement): Promise<PlatformResult<void>> {
        return this.requestAd('midgame');
    }

    public uploadScore(_key: string, _score: number): Promise<PlatformResult<void>> {
        return Promise.resolve(platformFailure('unsupported', 'This release keeps challenge records locally.'));
    }

    public showLeaderboard(_key: string): Promise<PlatformResult<void>> {
        return Promise.resolve(platformFailure('unsupported', 'This release keeps challenge records locally.'));
    }

    public hideLeaderboard(): void {}

    public gameplayStart(): void {
        void this.withSdk((sdk) => sdk.game.gameplayStart());
    }

    public gameplayStop(): void {
        void this.withSdk((sdk) => sdk.game.gameplayStop());
    }

    public happyTime(): void {
        void this.withSdk((sdk) => sdk.game.happytime());
    }

    public dispose(): void {
        const sdk = this.sdk;
        if (sdk && this.settingsListener) sdk.game.removeSettingsChangeListener(this.settingsListener);
        this.settingsListener = null;
        AudioManager.setPlatformMuted(false);
    }

    private get sdk(): any {
        return (globalThis as any).CrazyGames?.SDK;
    }

    private ensureInitialized(): Promise<void> {
        if (this.initPromise) return this.initPromise;
        this.initPromise = (async () => {
            const sdk = this.sdk;
            if (!sdk) throw new Error('CrazyGames SDK v3 is unavailable');
            const bootstrap = (globalThis as any).__LOCK_MASTER_CRAZYGAMES_READY__;
            if (bootstrap && typeof bootstrap.then === 'function') {
                if (await bootstrap === false) throw new Error('CrazyGames SDK v3 failed to initialize');
            }
            else await sdk.init();
            sdk.game.loadingStop();
            this.applySettings(sdk.game.settings || {});
            this.settingsListener = (settings) => this.applySettings(settings || {});
            sdk.game.addSettingsChangeListener(this.settingsListener);
        })();
        return this.initPromise;
    }

    private applySettings(settings: { muteAudio?: boolean }): void {
        AudioManager.setPlatformMuted(!!settings.muteAudio);
    }

    private async withSdk(action: (sdk: any) => void): Promise<void> {
        try {
            await this.ensureInitialized();
            action(this.sdk);
        } catch (error) {
            console.warn('[CrazyGames] SDK event skipped', error);
        }
    }

    private async requestAd(type: CrazyAdType): Promise<PlatformResult<void>> {
        try {
            await this.ensureInitialized();
        } catch (error) {
            return platformFailure('failed', 'CrazyGames SDK is not ready.', error);
        }

        return new Promise((resolve) => {
            let settled = false;
            const resume = () => {
                director.resume();
                this.applySettings(this.sdk?.game?.settings || {});
            };
            const finish = (result: PlatformResult<void>) => {
                if (settled) return;
                settled = true;
                resume();
                resolve(result);
            };
            try {
                this.sdk.ad.requestAd(type, {
                    adStarted: () => {
                        AudioManager.setPlatformMuted(true);
                        director.pause();
                    },
                    adFinished: () => finish(platformSuccess(undefined)),
                    adError: (error: unknown) => finish(platformFailure('failed', 'The ad could not be displayed.', error)),
                });
            } catch (error) {
                finish(platformFailure('failed', 'The ad request failed.', error));
            }
        });
    }
}
