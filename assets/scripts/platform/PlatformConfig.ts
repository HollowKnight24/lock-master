export type PlatformKind = 'wechat' | 'douyin' | 'crazygames' | 'browser';
export type AdPlacement = 'revive' | 'challenge-trial' | 'home-banner' | 'rank-banner' | 'result-interstitial';

export interface PlatformChannelConfig {
    rewardedVideoAdUnitId: string;
    bannerAdUnitId: string;
    interstitialAdUnitId: string;
    shareTemplateId: string;
}

export interface PlatformRuntimeConfigData {
    loginTimeoutMs: number;
    adTimeoutMs: number;
    interstitialCooldownMs: number;
    leaderboardKey: string;
    shareTitle: string;
    shareImageUrl: string;
    /** 仅体验构建：在小游戏真机中模拟广告回调，不请求广告 SDK，也不产生收益。 */
    experienceMockAds: boolean;
    browserMockAds: boolean;
    /** 仅浏览器验收：模拟分享、广告和排行榜调用；生产构建必须为 false。 */
    browserMockPlatform: boolean;
    wechat: PlatformChannelConfig;
    douyin: PlatformChannelConfig;
}

const EMPTY_CHANNEL: PlatformChannelConfig = {
    rewardedVideoAdUnitId: '',
    bannerAdUnitId: '',
    interstitialAdUnitId: '',
    shareTemplateId: '',
};

const DEFAULT_CONFIG: PlatformRuntimeConfigData = {
    loginTimeoutMs: 10000,
    adTimeoutMs: 120000,
    interstitialCooldownMs: 180000,
    leaderboardKey: 'challengeScore',
    shareTitle: 'Lock Master: can you beat my challenge score?',
    shareImageUrl: '',
    experienceMockAds: false,
    browserMockAds: false,
    browserMockPlatform: false,
    wechat: { ...EMPTY_CHANNEL },
    douyin: { ...EMPTY_CHANNEL },
};

/**
 * 非秘密的平台运行配置。
 * 构建前可在启动脚本中设置 globalThis.__LOCK_MASTER_PLATFORM_CONFIG__ 覆盖默认值。
 * AppSecret、session_key 等服务端秘密严禁写入客户端。
 */
export class PlatformConfig {
    private static _current: PlatformRuntimeConfigData | null = null;

    public static get current(): PlatformRuntimeConfigData {
        if (!this._current) {
            const external = (globalThis as any).__LOCK_MASTER_PLATFORM_CONFIG__ || {};
            this._current = {
                ...DEFAULT_CONFIG,
                ...external,
                wechat: { ...DEFAULT_CONFIG.wechat, ...(external.wechat || {}) },
                douyin: { ...DEFAULT_CONFIG.douyin, ...(external.douyin || {}) },
            };
        }
        return this._current;
    }

    public static getChannel(kind: PlatformKind): PlatformChannelConfig {
        if (kind === 'wechat') return this.current.wechat;
        if (kind === 'douyin') return this.current.douyin;
        return EMPTY_CHANNEL;
    }

    /** 仅检查客户端公开配置，绝不要求或记录 AppSecret 等服务端秘密。 */
    public static getClientConfigIssues(kind: Exclude<PlatformKind, 'browser'>): string[] {
        if (kind === 'crazygames') return [];
        const channel = this.getChannel(kind);
        const issues: string[] = [];
        if (!this.current.experienceMockAds) {
            if (!channel.rewardedVideoAdUnitId) issues.push('激励视频广告位 ID');
            if (!channel.bannerAdUnitId) issues.push('Banner 广告位 ID');
            if (!channel.interstitialAdUnitId) issues.push('插屏广告位 ID');
        }
        if (kind === 'douyin' && !channel.shareTemplateId) issues.push('抖音分享模板 ID');
        if (!this.current.shareImageUrl) issues.push('分享图片 URL');
        return issues;
    }

    public static resetForTests(): void {
        this._current = null;
    }
}
