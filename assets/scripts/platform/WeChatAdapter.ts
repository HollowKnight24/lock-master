import { PlatformConfig } from './PlatformConfig';
import { MiniGameAdapterBase } from './MiniGameAdapterBase';
import type { PlatformResult, SharePayload, ShareResult } from './IPlatform';
import { platformFailure, platformSuccess } from './IPlatform';

export class WeChatAdapter extends MiniGameAdapterBase {
    constructor(sdk: any = (globalThis as any).wx) {
        super('wechat', 'WeChat', sdk);
    }

    public share(payload: SharePayload): Promise<PlatformResult<ShareResult>> {
        if (!this.capabilities.share) {
            return Promise.resolve(platformFailure('unsupported', '微信当前环境不支持主动分享'));
        }

        try {
            const options: Record<string, unknown> = {
                title: payload.title || PlatformConfig.current.shareTitle,
            };
            const imageUrl = payload.imageUrl || PlatformConfig.current.shareImageUrl;
            if (imageUrl) options.imageUrl = imageUrl;
            if (payload.query) options.query = payload.query;
            this.sdk.shareAppMessage(options);
            // 微信主动分享只表示成功唤起，不能据此发放业务奖励。
            return Promise.resolve(platformSuccess({ triggered: true }));
        } catch (error) {
            return Promise.resolve(platformFailure('failed', '微信分享调用失败', error));
        }
    }
}
