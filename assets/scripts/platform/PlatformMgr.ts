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
import { WeChatAdapter } from './WeChatAdapter';
import { DouyinAdapter } from './DouyinAdapter';
import { CrazyGamesAdapter } from './CrazyGamesAdapter';
import { AdPlacement, PlatformConfig } from './PlatformConfig';

class BrowserAdapter implements IPlatform {
    public readonly kind = 'browser' as const;
    public readonly name = 'BrowserSandbox';
    public readonly capabilities: PlatformCapabilities = {
        login: false,
        share: PlatformConfig.current.browserMockPlatform,
        rewardedVideo: PlatformConfig.current.browserMockAds,
        banner: PlatformConfig.current.browserMockPlatform,
        interstitial: PlatformConfig.current.browserMockPlatform,
        leaderboard: PlatformConfig.current.browserMockPlatform,
    };
    private mockBestScore = 0;

    public login(): Promise<PlatformResult<LoginResult>> {
        return Promise.resolve(platformFailure('unsupported', '浏览器预览不提供平台登录'));
    }

    public share(_payload: SharePayload): Promise<PlatformResult<ShareResult>> {
        return Promise.resolve(PlatformConfig.current.browserMockPlatform
            ? platformSuccess({ triggered: true })
            : platformFailure('unsupported', '浏览器预览不提供平台分享'));
    }

    public showRewardedVideo(placement: AdPlacement): Promise<PlatformResult<RewardedVideoResult>> {
        if (!PlatformConfig.current.browserMockAds) {
            return Promise.resolve(platformFailure('unsupported', '浏览器广告模拟未启用'));
        }
        const confirm = (globalThis as any).confirm;
        const completed = typeof confirm !== 'function' || confirm(
            `模拟激励广告（不计费）\n场景：${placement}\n\n确定：完整观看并获得奖励\n取消：中途关闭，不发奖励`,
        );
        return Promise.resolve(completed
            ? platformSuccess({ completed: true })
            : platformFailure('not-completed', '模拟激励视频未完整播放'));
    }

    public showBanner(placement: AdPlacement): Promise<PlatformResult<void>> {
        if (!PlatformConfig.current.browserMockPlatform) {
            return Promise.resolve(platformFailure('unsupported', '浏览器预览不提供 Banner'));
        }
        const document = (globalThis as any).document;
        if (document?.body) {
            let banner = document.getElementById('lock-master-mock-banner');
            if (!banner) {
                banner = document.createElement('div');
                banner.id = 'lock-master-mock-banner';
                Object.assign(banner.style, {
                    position: 'fixed', left: '50%', bottom: '10px', transform: 'translateX(-50%)',
                    width: 'min(88vw, 420px)', padding: '10px 14px', zIndex: '99999',
                    color: '#dbeafe', background: 'rgba(15, 23, 42, .94)',
                    border: '1px solid #60a5fa', borderRadius: '8px', textAlign: 'center',
                    font: '14px sans-serif', boxSizing: 'border-box', pointerEvents: 'none',
                });
                document.body.appendChild(banner);
            }
            banner.textContent = `模拟 Banner（不计费）· ${placement}`;
        }
        return Promise.resolve(platformSuccess(undefined));
    }

    public hideBanner(): void {
        (globalThis as any).document?.getElementById('lock-master-mock-banner')?.remove();
    }

    public showInterstitial(placement: AdPlacement): Promise<PlatformResult<void>> {
        if (!PlatformConfig.current.browserMockPlatform) {
            return Promise.resolve(platformFailure('unsupported', '浏览器预览不提供插屏广告'));
        }
        (globalThis as any).alert?.(`模拟插屏广告（不计费）\n场景：${placement}\n\n关闭后继续游戏。`);
        return Promise.resolve(platformSuccess(undefined));
    }

    public uploadScore(_key: string, score: number): Promise<PlatformResult<void>> {
        if (!PlatformConfig.current.browserMockPlatform) {
            return Promise.resolve(platformFailure('unsupported', '浏览器预览不提供好友排行榜'));
        }
        this.mockBestScore = Math.max(this.mockBestScore, Math.max(0, Math.floor(score)));
        return Promise.resolve(platformSuccess(undefined));
    }

    public showLeaderboard(_key: string): Promise<PlatformResult<void>> {
        return Promise.resolve(PlatformConfig.current.browserMockPlatform
            ? platformSuccess(undefined)
            : platformFailure('unsupported', '浏览器预览不提供好友排行榜'));
    }

    public hideLeaderboard(): void {}
    public dispose(): void {}
}

export class PlatformMgr {
    private static _current: IPlatform | null = null;
    private static _loginPromise: Promise<PlatformResult<LoginResult>> | null = null;

    public static get current(): IPlatform {
        if (!this._current) {
            const runtime = globalThis as any;
            if (runtime.wx) this._current = new WeChatAdapter(runtime.wx);
            else if (runtime.tt) this._current = new DouyinAdapter(runtime.tt);
            else if (runtime.CrazyGames?.SDK) this._current = new CrazyGamesAdapter();
            else this._current = new BrowserAdapter();
        }
        return this._current;
    }

    /** 同一进程只发起一次平台登录；返回的 code 仍需交给业务后端换取会话。 */
    public static initialize(): Promise<PlatformResult<LoginResult>> {
        if (!this._loginPromise) this._loginPromise = this.current.login();
        return this._loginPromise;
    }

    /** 构建前快速暴露遗漏的公开平台配置；不包含、也不接受任何服务端秘密。 */
    public static reportClientConfigIssues(): void {
        const kind = this.current.kind;
        if (kind === 'browser') return;
        const issues = PlatformConfig.getClientConfigIssues(kind);
        if (issues.length) console.warn('[PlatformMgr] Missing public platform configuration: ' + issues.join(', '));
    }

    public static setAdapterForTests(adapter: IPlatform | null): void {
        this._current?.dispose();
        this._current = adapter;
        this._loginPromise = null;
    }
}
