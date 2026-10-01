import { PlatformConfig, AdPlacement } from './PlatformConfig';
import { PlatformMgr } from './PlatformMgr';
import { platformFailure } from './IPlatform';
import type { PlatformResult, RewardedVideoResult } from './IPlatform';

/** 所有广告入口共享频控。以下默认值仅为广告体验的测试起点。 */
export class AdService {
    private static sessionStartedAt: number | null = null;
    private static resultCount = 0;
    private static interstitialCount = 0;
    private static lastInterstitialAt: number | null = null;
    private static lastRewardedAt: number | null = null;
    private static fullScreenPending = false;

    public static initialize(): void {
        if (this.sessionStartedAt === null) this.sessionStartedAt = Date.now();
    }

    public static canWatchRewarded(): boolean {
        const platform = PlatformMgr.current;
        if (!platform.capabilities.rewardedVideo) return false;
        if (PlatformConfig.current.experienceMockAds) return true;
        if (platform.kind === 'crazygames') return true;
        return platform.kind === 'browser'
            ? PlatformConfig.current.browserMockAds
            : !!PlatformConfig.getChannel(platform.kind).rewardedVideoAdUnitId;
    }

    public static hideBanner(): void {
        PlatformMgr.current.hideBanner();
    }

    public static async watchRewarded(placement: AdPlacement): Promise<PlatformResult<RewardedVideoResult>> {
        this.initialize();
        if (this.fullScreenPending) return platformFailure('busy', '全屏广告正在展示');
        this.fullScreenPending = true;
        this.hideBanner();
        try {
            return await PlatformMgr.current.showRewardedVideo(placement);
        } catch (error) {
            return platformFailure('failed', '广告调用失败，请重试或免费重新开始', error);
        } finally {
            // 包含取消、失败：失败页之后不会紧接着出现插屏。
            this.lastRewardedAt = Date.now();
            this.fullScreenPending = false;
        }
    }

    public static async showResultInterstitial(): Promise<PlatformResult<void>> {
        this.initialize();
        this.resultCount++;
        const now = Date.now();
        const cooldown = Math.max(180000, Number(PlatformConfig.current.interstitialCooldownMs) || 0);
        if (this.fullScreenPending) return platformFailure('busy', '全屏广告正在展示');
        if (now - this.sessionStartedAt! < 120000 || this.resultCount < 3
            || this.interstitialCount >= 2
            || (this.lastInterstitialAt !== null && now - this.lastInterstitialAt < cooldown)
            || (this.lastRewardedAt !== null && now - this.lastRewardedAt < cooldown)) {
            return platformFailure('cooldown', '本次结算跳过插屏');
        }
        this.fullScreenPending = true;
        this.hideBanner();
        try {
            const result = await PlatformMgr.current.showInterstitial('result-interstitial');
            if (result.ok) {
                this.lastInterstitialAt = Date.now();
                this.interstitialCount++;
            }
            return result;
        } catch (error) {
            return platformFailure('failed', '插屏不可用，继续正常游戏', error);
        } finally {
            this.fullScreenPending = false;
        }
    }
}
