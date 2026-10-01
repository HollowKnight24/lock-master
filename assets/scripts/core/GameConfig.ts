import { _decorator } from 'cc';
const { ccclass } = _decorator;

export enum GameMode {
    NORMAL = 0,    // 普通模式 (通过 1->2->3 关)
    CHALLENGE = 1  // 挑战模式（无限第五关）
}

// 区域类型枚举
export enum HighlightType {
    NONE = 0,
    YELLOW = 1, // 普通积分区域
    BLUE = 2    // 积分 + 1.5s 区域
}

// 判定结果枚举
export enum QTEResult {
    MISS = 0,
    HIT_YELLOW = 1,
    HIT_BLUE = 2
}

@ccclass('GameConfig')
export class GameConfig {
    public static readonly INITIAL_TIME: number = 25.0; // 默认值；开局读取对应关卡的 initialTime
    public static readonly BLUE_ZONE_BONUS: number = 1.5; // 蓝色区域加时

    // 五关普通模式配置；挑战模式复用第五关圆环规则。
    public static readonly LEVELS = [
        { levelId: 1, initialTime: 25, targetScore: 7, baseSpeed: 150, blueChance: 0.1 },
        { levelId: 2, initialTime: 20, targetScore: 15, baseSpeed: 130, blueChance: 0.12 },
        { levelId: 3, initialTime: 45, targetScore: 15, baseSpeed: 270, blueChance: 0.13, pathKind: 0 },
        { levelId: 4, initialTime: 50, targetScore: 17, baseSpeed: 310, blueChance: 0.14, pathKind: 1 },
        { levelId: 5, initialTime: 40, targetScore: 20, baseSpeed: 175, blueChance: 0.15 },
    ];

    // 挑战模式专属参数 (目标分设为极大值，不限制通关)
    public static readonly CHALLENGE_CONFIG = {
        levelIndex: 4,
        initialTime: 60,
        targetScore: 999999, // 无限模式
        baseSpeed: 220,
        blueChance: 0.15
    };
}
