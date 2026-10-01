import type {
    IPlatform,
    LoginResult,
    PlatformCapabilities,
    PlatformResult,
    RewardedVideoResult,
} from './IPlatform';
import { platformFailure, platformSuccess } from './IPlatform';
import { AdPlacement, PlatformConfig, PlatformKind } from './PlatformConfig';

export abstract class MiniGameAdapterBase implements IPlatform {
    public readonly capabilities: PlatformCapabilities;

    protected readonly sdk: any;
    private rewardedAd: any = null;
    private bannerAd: any = null;
    private interstitialAd: any = null;
    private rewardInFlight = false;
    private readonly sessionStartedAt = Date.now();
    private lastInterstitialAt = 0;
    private lastRewardedAt = 0;
    private interstitialInFlight = false;
    private bannerVersion = 0;
    private bannerWanted = false;

    protected constructor(
        public readonly kind: PlatformKind,
        public readonly name: string,
        sdk: any,
    ) {
        this.sdk = sdk;
        const mockAds = PlatformConfig.current.experienceMockAds;
        this.capabilities = {
            login: typeof sdk?.login === 'function',
            share: typeof sdk?.shareAppMessage === 'function',
            rewardedVideo: mockAds || typeof sdk?.createRewardedVideoAd === 'function',
            banner: mockAds || typeof sdk?.createBannerAd === 'function',
            interstitial: mockAds || typeof sdk?.createInterstitialAd === 'function',
            leaderboard: typeof sdk?.getOpenDataContext === 'function',
        };
    }

    public login(): Promise<PlatformResult<LoginResult>> {
        if (!this.capabilities.login) {
            return Promise.resolve(platformFailure('unsupported', `${this.name} 当前环境不支持登录`));
        }

        return new Promise((resolve) => {
            let settled = false;
            const finish = (result: PlatformResult<LoginResult>) => {
                if (settled) return;
                settled = true;
                clearTimeout(timer);
                resolve(result);
            };
            const timer = setTimeout(
                () => finish(platformFailure('timeout', `${this.name} 登录超时`)),
                PlatformConfig.current.loginTimeoutMs,
            );

            try {
                this.sdk.login({
                    success: (res: any) => {
                        const code = typeof res?.code === 'string' ? res.code : '';
                        finish(code
                            ? platformSuccess({ code })
                            : platformFailure('failed', `${this.name} 登录未返回 code`, res));
                    },
                    fail: (error: any) => finish(platformFailure(
                        this.isCancelled(error) ? 'cancelled' : 'failed',
                        `${this.name} 登录失败`,
                        error,
                    )),
                });
            } catch (error) {
                finish(platformFailure('failed', `${this.name} 登录调用异常`, error));
            }
        });
    }

    public abstract share(payload: import('./IPlatform').SharePayload): Promise<import('./IPlatform').PlatformResult<import('./IPlatform').ShareResult>>;

    public showRewardedVideo(placement: AdPlacement): Promise<PlatformResult<RewardedVideoResult>> {
        if (this.rewardInFlight || this.interstitialInFlight) {
            return Promise.resolve(platformFailure('busy', '激励视频正在展示中'));
        }
        if (PlatformConfig.current.experienceMockAds) {
            return this.showMockRewardedVideo(placement);
        }
        if (!this.capabilities.rewardedVideo) {
            return Promise.resolve(platformFailure('unsupported', `${this.name} 当前环境不支持激励视频`));
        }

        const adUnitId = PlatformConfig.getChannel(this.kind).rewardedVideoAdUnitId;
        if (!adUnitId) {
            return Promise.resolve(platformFailure('config-missing', `${this.name} 未配置 ${placement} 激励广告位`));
        }

        this.rewardInFlight = true;
        this.hideBanner();
        return new Promise((resolve) => {
            let settled = false;
            let ad: any;
            let timer: ReturnType<typeof setTimeout>;

            const cleanup = () => {
                clearTimeout(timer);
                if (ad?.offClose) ad.offClose(onClose);
                if (ad?.offError) ad.offError(onError);
                this.rewardInFlight = false;
            };
            const finish = (result: PlatformResult<RewardedVideoResult>) => {
                if (settled) return;
                settled = true;
                cleanup();
                resolve(result);
            };
            const onClose = (res: any) => {
                this.lastRewardedAt = Date.now();
                const completed = res?.isEnded === true;
                finish(completed
                    ? platformSuccess({ completed: true })
                    : platformFailure('not-completed', '激励视频未完整播放'));
            };
            const onError = (error: any) => finish(platformFailure('failed', '激励视频加载或展示失败', error));

            try {
                ad = this.rewardedAd || this.sdk.createRewardedVideoAd({ adUnitId });
                this.rewardedAd = ad;
                if (!ad) {
                    finish(platformFailure('failed', '激励视频对象创建失败'));
                    return;
                }
                if (ad.onClose) ad.onClose(onClose);
                if (ad.onError) ad.onError(onError);
                timer = setTimeout(
                    () => finish(platformFailure('timeout', '激励视频等待超时')),
                    PlatformConfig.current.adTimeoutMs,
                );

                this.showAdWithReload(ad, () => !settled).then(() => {
                    if (!settled) this.lastRewardedAt = Date.now();
                }).catch(onError);
            } catch (error) {
                finish(platformFailure('failed', '激励视频调用异常', error));
            }
        });
    }

    public async showBanner(placement: AdPlacement): Promise<PlatformResult<void>> {
        const requestVersion = ++this.bannerVersion;
        if (PlatformConfig.current.experienceMockAds) {
            this.bannerWanted = true;
            this.showMockToast(`模拟 Banner：${placement}`);
            return platformSuccess(undefined);
        }
        if (!this.capabilities.banner) {
            return platformFailure('unsupported', `${this.name} 当前环境不支持 Banner`);
        }
        const adUnitId = PlatformConfig.getChannel(this.kind).bannerAdUnitId;
        if (!adUnitId) {
            return platformFailure('config-missing', `${this.name} 未配置 ${placement} Banner 广告位`);
        }

        try {
            this.bannerWanted = true;
            if (!this.bannerAd) {
                const info = this.getSystemInfo();
                const width = Math.min(320, info.screenWidth);
                this.bannerAd = this.sdk.createBannerAd({
                    adUnitId,
                    style: { left: (info.screenWidth - width) / 2, top: Math.max(0, info.safeBottom - 100), width },
                });
                if (this.bannerAd?.onResize) {
                    this.bannerAd.onResize((size: any) => {
                        if (!this.bannerAd?.style) return;
                        this.bannerAd.style.left = Math.max(0, (info.screenWidth - size.width) / 2);
                        this.bannerAd.style.top = Math.max(0, info.safeBottom - size.height);
                    });
                }
                if (this.bannerAd?.onError) {
                    this.bannerAd.onError((error: any) => console.warn(`[${this.name}] Banner error`, error));
                }
            }
            await Promise.resolve(this.bannerAd.show());
            if (requestVersion !== this.bannerVersion) {
                if (!this.bannerWanted) this.bannerAd?.hide?.();
                return platformFailure('cancelled', '页面已切换，已隐藏 Banner');
            }
            return platformSuccess(undefined);
        } catch (error) {
            return platformFailure('failed', 'Banner 展示失败', error);
        }
    }

    public hideBanner(): void {
        this.bannerVersion++;
        this.bannerWanted = false;
        if (PlatformConfig.current.experienceMockAds) {
            try { this.sdk.hideToast?.(); } catch {}
            return;
        }
        try {
            this.bannerAd?.hide?.();
        } catch (error) {
            console.warn(`[${this.name}] Banner 隐藏失败`, error);
        }
    }

    public async showInterstitial(placement: AdPlacement): Promise<PlatformResult<void>> {
        if (this.interstitialInFlight || this.rewardInFlight) return platformFailure('busy', '全屏广告正在展示');
        if (PlatformConfig.current.experienceMockAds) {
            return this.showMockInterstitial(placement);
        }
        if (!this.capabilities.interstitial) {
            return platformFailure('unsupported', `${this.name} 当前环境不支持插屏广告`);
        }
        const adUnitId = PlatformConfig.getChannel(this.kind).interstitialAdUnitId;
        if (!adUnitId) {
            return platformFailure('config-missing', `${this.name} 未配置 ${placement} 插屏广告位`);
        }
        const now = Date.now();
        if (this.kind === 'douyin' && now - this.sessionStartedAt < 30000) {
            return platformFailure('cooldown', '抖音小游戏启动后 30 秒内不展示插屏广告');
        }
        if (now - this.lastInterstitialAt < Math.max(60000, PlatformConfig.current.interstitialCooldownMs)
            || (this.lastRewardedAt > 0 && now - this.lastRewardedAt < 60000)) {
            return platformFailure('cooldown', '插屏广告仍在冷却中');
        }

        this.interstitialInFlight = true;
        this.hideBanner();
        return new Promise((resolve) => {
            let settled = false;
            let ad: any;
            let timer: ReturnType<typeof setTimeout>;
            const finish = (result: PlatformResult<void>) => {
                if (settled) return;
                settled = true;
                clearTimeout(timer);
                ad?.offError?.(onError);
                ad?.offClose?.(onClose);
                ad?.destroy?.();
                if (this.interstitialAd === ad) this.interstitialAd = null;
                this.interstitialInFlight = false;
                resolve(result);
            };
            const onError = (error: any) => finish(platformFailure('failed', '插屏广告展示失败', error));
            const onClose = () => {
                this.lastInterstitialAt = Date.now();
                finish(platformSuccess(undefined));
            };
            try {
                ad = this.sdk.createInterstitialAd({ adUnitId });
                this.interstitialAd = ad;
                if (!ad?.onClose) {
                    finish(platformFailure('unsupported', '插屏缺少关闭回调'));
                    return;
                }
                ad.onClose(onClose);
                ad.onError?.(onError);
                timer = setTimeout(() => finish(platformFailure('timeout', '插屏等待超时，恢复正常结算')),
                    PlatformConfig.current.adTimeoutMs);
                void (async () => {
                    if (ad.load) await Promise.resolve(ad.load());
                    if (settled) return;
                    await Promise.resolve(ad.show());
                    if (!settled) this.lastInterstitialAt = Date.now();
                })().catch(onError);
            } catch (error) {
                onError(error);
            }
        });
    }

    public uploadScore(key: string, score: number): Promise<PlatformResult<void>> {
        if (!this.capabilities.leaderboard) {
            return Promise.resolve(platformFailure('unsupported', `${this.name} 当前环境不支持开放数据域`));
        }
        if (!Number.isFinite(score) || score < 0) {
            return Promise.resolve(platformFailure('failed', '排行榜分数无效'));
        }
        return this.postOpenDataMessage({ type: 'updateScore', key, score: Math.floor(score) });
    }

    public showLeaderboard(key: string): Promise<PlatformResult<void>> {
        if (!this.capabilities.leaderboard) {
            return Promise.resolve(platformFailure('unsupported', `${this.name} 当前环境不支持开放数据域`));
        }
        return this.postOpenDataMessage({ type: 'showLeaderboard', key });
    }

    public hideLeaderboard(): void {
        if (!this.capabilities.leaderboard) return;
        try {
            this.sdk.getOpenDataContext().postMessage({ type: 'hideLeaderboard' });
        } catch (error) {
            console.warn(`[${this.name}] 隐藏排行榜失败`, error);
        }
    }

    public dispose(): void {
        this.hideBanner();
        this.bannerAd?.destroy?.();
        this.rewardedAd?.destroy?.();
        this.interstitialAd?.destroy?.();
        this.bannerAd = null;
        this.rewardedAd = null;
        this.interstitialAd = null;
        this.rewardInFlight = false;
    }

    protected isCancelled(error: any): boolean {
        const text = `${error?.errMsg || error?.message || error || ''}`.toLowerCase();
        return text.includes('cancel') || text.includes('deny');
    }

    private async showAdWithReload(ad: any, isCurrent: () => boolean): Promise<void> {
        try {
            await Promise.resolve(ad.show());
        } catch (firstError) {
            if (!isCurrent()) return;
            if (!ad.load) throw firstError;
            await Promise.resolve(ad.load());
            if (!isCurrent()) return;
            await Promise.resolve(ad.show());
        }
    }

    private showMockRewardedVideo(placement: AdPlacement): Promise<PlatformResult<RewardedVideoResult>> {
        this.rewardInFlight = true;
        this.hideBanner();
        return new Promise((resolve) => {
            let settled = false;
            const finish = (completed: boolean) => {
                if (settled) return;
                settled = true;
                this.lastRewardedAt = Date.now();
                this.rewardInFlight = false;
                resolve(completed
                    ? platformSuccess({ completed: true })
                    : platformFailure('not-completed', '模拟激励视频未完整播放'));
            };
            if (typeof this.sdk.showModal !== 'function') {
                setTimeout(() => finish(true), 800);
                return;
            }
            try {
                this.sdk.showModal({
                    title: '模拟激励广告（不计费）',
                    content: `广告场景：${placement}\n请选择测试结果。`,
                    confirmText: '完整观看',
                    cancelText: '中途关闭',
                    success: (res: any) => finish(res?.confirm === true),
                    fail: () => finish(false),
                });
            } catch {
                finish(false);
            }
        });
    }

    private showMockInterstitial(placement: AdPlacement): Promise<PlatformResult<void>> {
        this.interstitialInFlight = true;
        this.hideBanner();
        return new Promise((resolve) => {
            let settled = false;
            const finish = () => {
                if (settled) return;
                settled = true;
                this.lastInterstitialAt = Date.now();
                this.interstitialInFlight = false;
                resolve(platformSuccess(undefined));
            };
            if (typeof this.sdk.showModal !== 'function') {
                setTimeout(finish, 500);
                return;
            }
            try {
                this.sdk.showModal({
                    title: '模拟插屏广告（不计费）',
                    content: `广告场景：${placement}\n关闭后继续游戏。`,
                    showCancel: false,
                    confirmText: '关闭广告',
                    complete: finish,
                });
            } catch {
                finish();
            }
        });
    }

    private showMockToast(title: string): void {
        try {
            this.sdk.showToast?.({ title, icon: 'none', duration: 1800 });
        } catch {
            console.info(`[${this.name}] ${title}`);
        }
    }

    private getSystemInfo(): { screenWidth: number; screenHeight: number; safeBottom: number } {
        try {
            const info = this.sdk.getSystemInfoSync?.() || {};
            return {
                screenWidth: Number(info.windowWidth || info.screenWidth) || 375,
                screenHeight: Number(info.windowHeight || info.screenHeight) || 667,
                safeBottom: Number(info.safeArea?.bottom || info.windowHeight || info.screenHeight) || 667,
            };
        } catch {
            return { screenWidth: 375, screenHeight: 667, safeBottom: 667 };
        }
    }

    private postOpenDataMessage(message: Record<string, unknown>): Promise<PlatformResult<void>> {
        try {
            const context = this.sdk.getOpenDataContext();
            if (!context?.postMessage) return Promise.resolve(platformFailure('unsupported', '开放数据域不可用'));
            context.postMessage(message);
            return Promise.resolve(platformSuccess(undefined));
        } catch (error) {
            return Promise.resolve(platformFailure('failed', '开放数据域消息发送失败', error));
        }
    }
}
