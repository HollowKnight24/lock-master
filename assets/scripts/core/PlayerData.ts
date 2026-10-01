import { sys } from 'cc';

export interface PlayerSaveData {
    version: number;
    challengeUnlocked: boolean;
    challengeBestScore: number;
    challengeTrialCredits: number;
    audioEnabled: boolean;
}

const STORAGE_KEY = 'LockMaster_PlayerData';
const LEGACY_UNLOCK_KEY = 'LockMaster_ChallengeUnlocked';
const CURRENT_VERSION = 2;

const DEFAULT_DATA: PlayerSaveData = {
    version: CURRENT_VERSION,
    challengeUnlocked: false,
    challengeBestScore: 0,
    challengeTrialCredits: 0,
    audioEnabled: true,
};

/** CrazyGames Data mirrors localStorage for guests and syncs signed-in players across devices. */
function playerStorage(): Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> {
    const runtime = globalThis as any;
    if (runtime.__LOCK_MASTER_CRAZYGAMES_READY_RESULT__ === true && runtime.CrazyGames?.SDK?.data) {
        return runtime.CrazyGames.SDK.data;
    }
    return sys.localStorage;
}

/** 统一管理本地玩家数据，并兼容早期单独保存的挑战解锁标记。 */
export class PlayerData {
    private static _cache: PlayerSaveData | null = null;

    public static isChallengeUnlocked(): boolean {
        return this.getData().challengeUnlocked;
    }

    public static hasChallengeTrial(): boolean {
        return this.getData().challengeTrialCredits > 0;
    }

    /** 完整观看一次广告获得一局资格，未进入游戏时保留到下次。 */
    public static grantChallengeTrial(): void {
        const data = this.getData();
        data.challengeTrialCredits = 1;
        this.persist(data);
    }

    /** 在游戏实际开始时消费资格，永久解锁玩家不需要资格。 */
    public static consumeChallengeEntry(): boolean {
        const data = this.getData();
        if (data.challengeUnlocked) return true;
        if (data.challengeTrialCredits <= 0) return false;
        data.challengeTrialCredits = 0;
        this.persist(data);
        return true;
    }

    public static unlockChallenge(): boolean {
        const data = this.getData();
        if (data.challengeUnlocked) return false;
        data.challengeUnlocked = true;
        this.persist(data);
        return true;
    }

    public static getChallengeBestScore(): number {
        return this.getData().challengeBestScore;
    }

    /** 仅在刷新最高分时写盘，返回本次是否创造新纪录。 */
    public static submitChallengeScore(score: number): boolean {
        const normalizedScore = Number.isFinite(score) ? Math.max(0, Math.floor(score)) : 0;
        const data = this.getData();
        if (normalizedScore <= data.challengeBestScore) return false;
        data.challengeBestScore = normalizedScore;
        this.persist(data);
        return true;
    }

    public static isAudioEnabled(): boolean {
        return this.getData().audioEnabled;
    }

    public static setAudioEnabled(enabled: boolean): void {
        const data = this.getData();
        if (data.audioEnabled === enabled) return;
        data.audioEnabled = enabled;
        this.persist(data);
    }

    /** 供调试或账号切换后重新读取存档，不删除用户数据。 */
    public static reload(): void {
        this._cache = null;
    }

    private static getData(): PlayerSaveData {
        if (!this._cache) this._cache = this.load();
        return this._cache;
    }

    private static load(): PlayerSaveData {
        let parsed: Partial<PlayerSaveData> = {};
        try {
            const raw = playerStorage().getItem(STORAGE_KEY);
            if (raw) {
                const candidate = JSON.parse(raw);
                if (candidate && typeof candidate === 'object' && !Array.isArray(candidate)) {
                    parsed = candidate as Partial<PlayerSaveData>;
                } else {
                    console.warn('[PlayerData] 存档格式无效，已使用默认值');
                }
            }
        } catch (error) {
            console.warn('[PlayerData] 存档读取失败，已使用默认值', error);
        }

        let legacyUnlocked = false;
        try {
            legacyUnlocked = playerStorage().getItem(LEGACY_UNLOCK_KEY) === 'true';
        } catch (error) {
            console.warn('[PlayerData] 旧版解锁数据读取失败，已忽略', error);
        }

        const data: PlayerSaveData = {
            version: CURRENT_VERSION,
            challengeUnlocked: parsed.challengeUnlocked === true || legacyUnlocked,
            challengeTrialCredits: Number(parsed.challengeTrialCredits) >= 1 ? 1 : 0,
            challengeBestScore: Number.isFinite(parsed.challengeBestScore)
                ? Math.max(0, Math.floor(parsed.challengeBestScore as number))
                : 0,
            audioEnabled: parsed.audioEnabled !== false,
        };

        if (parsed.version !== CURRENT_VERSION || legacyUnlocked) {
            const persisted = this.persist(data);
            if (persisted && legacyUnlocked) {
                try {
                    playerStorage().removeItem(LEGACY_UNLOCK_KEY);
                } catch (error) {
                    console.warn('[PlayerData] 旧版解锁数据清理失败', error);
                }
            }
        }
        return data;
    }

    private static persist(data: PlayerSaveData): boolean {
        data.version = CURRENT_VERSION;
        this._cache = data;
        try {
            playerStorage().setItem(STORAGE_KEY, JSON.stringify(data));
            return true;
        } catch (error) {
            console.error('[PlayerData] 存档写入失败', error);
            return false;
        }
    }
}
