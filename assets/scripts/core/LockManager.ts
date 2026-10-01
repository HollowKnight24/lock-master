import { _decorator, Component, Node, Prefab, instantiate } from 'cc';
import { EventManager } from '../utils/EventManager';
import { ZoneLinear } from './level1/ZoneLinear';
import { ZoneRotation } from './level2_3/ZoneRotation';
import { PathTrack } from './PathTrack';
import { GameConfig } from './GameConfig';
const { ccclass, property } = _decorator;

@ccclass('LockManager')
export class LockManager extends Component {
    @property([Prefab])
    public trackPrefabs: Prefab[] = []; // 0->TrackVertical, 1->TrackHalfCircle, 2->TrackFullCircle

    @property(Node)
    public containerNode: Node = null!;

    @property({ type: [Node], tooltip: 'Hierarchy 中的五关模板，优先于 Prefab；运行时复制所选模板。' })
    public trackTemplates: Node[] = [];

    public clearTrack(): void {
        if (!this.containerNode) return;
        for (const node of [...this.containerNode.children]) {
            node.getComponentInChildren(ZoneLinear)?.clearZone();
            node.getComponentInChildren(ZoneRotation)?.clearZone();
            node.removeFromParent(); node.destroy();
        }
    }

    onEnable() {
        // ★ 核心改变：不再抢 GAME_START 事件，而是等待 GamePlayUI 彻底就绪后发出的 "LOAD_LEVEL_PREFAB" 事件
        EventManager.on("LOAD_LEVEL_PREFAB", this.onLevelLoad, this);
    }

    onDisable() {
        EventManager.off("LOAD_LEVEL_PREFAB", this.onLevelLoad, this);
    }

    private onLevelLoad(levelIndex: number) {
        if (!Number.isInteger(levelIndex) || levelIndex < 0 || levelIndex >= GameConfig.LEVELS.length) {
            console.error(`[LockManager] 非法关卡索引 ${levelIndex}`);
            return;
        }

        if (!this.containerNode) {
            console.error('[LockManager] 未绑定关卡 Container 节点！');
            return;
        }

        if (levelIndex === 2 || levelIndex === 3) {
            this.clearTrack(); const node = new Node(levelIndex === 2 ? 'TrackS' : 'TrackDiamond'); this.containerNode.addChild(node);
            node.addComponent(PathTrack).configure(levelIndex - 2, GameConfig.LEVELS[levelIndex].baseSpeed, GameConfig.LEVELS[levelIndex].blueChance);
            EventManager.emit('LEVEL_READY', levelIndex); return;
        }
        const sourceIndex = levelIndex === 4 ? 2 : levelIndex;
        const prefab = this.trackTemplates[sourceIndex] || this.trackPrefabs[sourceIndex];
        if (!prefab) {
            console.error(`[LockManager] 关卡 ${levelIndex} 未绑定 Prefab！`);
            return;
        }

        this.clearTrack();
        const template = this.trackTemplates[sourceIndex];
        const trackInstance = template ? instantiate(template) : instantiate(this.trackPrefabs[sourceIndex]);
        trackInstance.active = true;
        this.containerNode.addChild(trackInstance);
        console.log(`[LockManager] 动态载入 LEVEL ${levelIndex + 1} 专属 Prefab 成功`);

        // 安全通知 UI 层进行物理初始化
        EventManager.emit("LEVEL_READY", levelIndex);
    }
}
