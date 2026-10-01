import { AdPlacement, PlatformKind } from './PlatformConfig';

export type PlatformFailureReason =
    | 'unsupported'
    | 'config-missing'
    | 'cancelled'
    | 'not-completed'
    | 'timeout'
    | 'busy'
    | 'cooldown'
    | 'failed';

export type PlatformResult<T> =
    | { ok: true; value: T }
    | { ok: false; reason: PlatformFailureReason; message: string; error?: unknown };

export interface PlatformCapabilities {
    login: boolean;
    share: boolean;
    rewardedVideo: boolean;
    banner: boolean;
    interstitial: boolean;
    leaderboard: boolean;
}

export interface LoginResult {
    /** 临时登录凭证，必须由服务端换取业务会话；不能在客户端保存 AppSecret。 */
    code: string;
}

export interface SharePayload {
    title: string;
    imageUrl?: string;
    query?: string;
    templateId?: string;
}

export interface ShareResult {
    triggered: boolean;
}

export interface RewardedVideoResult {
    completed: boolean;
}

export function platformSuccess<T>(value: T): PlatformResult<T> {
    return { ok: true, value };
}

export function platformFailure<T>(
    reason: PlatformFailureReason,
    message: string,
    error?: unknown,
): PlatformResult<T> {
    return { ok: false, reason, message, error };
}

export interface IPlatform {
    readonly kind: PlatformKind;
    readonly name: string;
    readonly capabilities: PlatformCapabilities;

    login(): Promise<PlatformResult<LoginResult>>;
    share(payload: SharePayload): Promise<PlatformResult<ShareResult>>;
    showRewardedVideo(placement: AdPlacement): Promise<PlatformResult<RewardedVideoResult>>;
    showBanner(placement: AdPlacement): Promise<PlatformResult<void>>;
    hideBanner(): void;
    showInterstitial(placement: AdPlacement): Promise<PlatformResult<void>>;
    uploadScore(key: string, score: number): Promise<PlatformResult<void>>;
    showLeaderboard(key: string): Promise<PlatformResult<void>>;
    hideLeaderboard(): void;
    gameplayStart?(): void;
    gameplayStop?(): void;
    happyTime?(): void;
    dispose(): void;
}
