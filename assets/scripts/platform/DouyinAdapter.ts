import { PlatformConfig } from './PlatformConfig';
import { MiniGameAdapterBase } from './MiniGameAdapterBase';
import type { PlatformResult, SharePayload, ShareResult } from './IPlatform';
import { platformFailure, platformSuccess } from './IPlatform';

export class DouyinAdapter extends MiniGameAdapterBase {
    constructor(sdk: any = (globalThis as any).tt) {
        super('douyin', 'Douyin', sdk);
    }

    public share(payload: SharePayload): Promise<PlatformResult<ShareResult>> {
        if (!this.capabilities.share) {
            return Promise.resolve(platformFailure('unsupported', '抖音当前环境不支持主动分享'));
        }

        return new Promise((resolve) => {
            let settled = false;
            const finish = (result: PlatformResult<ShareResult>) => {
                if (settled) return;
                settled = true;
                clearTimeout(timer);
                resolve(result);
            };
            const timer = setTimeout(
                () => finish(platformFailure('timeout', '抖音分享等待超时')),
                PlatformConfig.current.loginTimeoutMs,
            );

            try {
                const templateId = payload.templateId || PlatformConfig.current.douyin.shareTemplateId;
                const options: Record<string, unknown> = {
                    title: payload.title || PlatformConfig.current.shareTitle,
                    desc: payload.title || PlatformConfig.current.shareTitle,
                    query: payload.query || '',
                    success: () => finish(platformSuccess({ triggered: true })),
                    fail: (error: any) => finish(platformFailure(
                        this.isCancelled(error) ? 'cancelled' : 'failed',
                        '抖音分享失败',
                        error,
                    )),
                };
                if (templateId) options.templateId = templateId;
                this.sdk.shareAppMessage(options);
            } catch (error) {
                finish(platformFailure('failed', '抖音分享调用异常', error));
            }
        });
    }
}
