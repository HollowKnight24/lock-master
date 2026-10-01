import { _decorator, Component, Enum, Label, Node, profiler } from 'cc';
import { EDITOR } from 'cc/env';
import { GameMode } from '../core/GameConfig';
import { EventManager, GameEvents } from '../utils/EventManager';
const { ccclass, property, executeInEditMode } = _decorator;
enum PreviewPage { Home, ModeSelect, Level1, Level2, Level3, Level4, Level5, Results, Records }
enum DebugLevel { Home = 0, Level1 = 1, Level2 = 2, Level3 = 3, Level4 = 4, Level5 = 5 }

@ccclass('ScenePreview')
@executeInEditMode
export class ScenePreview extends Component {
    @property({ type: Enum(PreviewPage), tooltip: '仅编辑器：切换 Scene 中展示的页面，不改游戏参数。' })
    public previewPage = PreviewPage.Home;
    @property({ type: Enum(DebugLevel), tooltip: '点击 Creator 预览后直接进入指定普通关卡；发布时保持正常首页。' })
    public debugStartLevel = DebugLevel.Home;
    @property({ tooltip: '仅运行预览：显示性能面板，默认关闭以免遮挡操作区。' })
    public showPerformanceStats = false;
    @property({ type: [Node] }) public panels: Node[] = [];
    @property(Node) public templatesRoot: Node = null!;
    @property({ type: [Node] }) public tracks: Node[] = [];
    @property(Label) public levelLabel: Label = null!;
    private lastPage = -1;
    onLoad(): void { this.showPage(EDITOR ? this.previewPage : PreviewPage.Home); }
    update(): void {
        if (EDITOR && this.lastPage !== this.previewPage) this.showPage(this.previewPage);
    }
    start(): void {
        if (!EDITOR) {
            if (this.showPerformanceStats) profiler?.showStats?.();
            else profiler?.hideStats?.();
        }
        if (EDITOR || this.debugStartLevel === DebugLevel.Home) return;
        // Wait until all UI listeners and scene references have been initialized.
        this.scheduleOnce(() => {
            this.panels.forEach((n, i) => { if (n && typeof n === 'object') n.active = i === 3; });
            EventManager.emit(GameEvents.GAME_START, GameMode.NORMAL, this.debugStartLevel - 1);
        }, 0);
    }
    private showPage(page: PreviewPage): void {
        this.lastPage = page;
        // panels: home, mode, rank, gameplay, result.
        const selected = page === PreviewPage.Home ? 0 : page === PreviewPage.ModeSelect ? 1 :
            page === PreviewPage.Records ? 2 : page === PreviewPage.Results ? 4 : 3;
        this.panels.forEach((n, i) => { if (n && typeof n === 'object') n.active = i === selected; });
        const level = page >= PreviewPage.Level1 && page <= PreviewPage.Level5 ? page - PreviewPage.Level1 : -1;
        if (this.templatesRoot) this.templatesRoot.active = EDITOR && level >= 0;
        this.tracks.forEach((n, i) => { if (n && typeof n === 'object') n.active = i === level; });
        if (level >= 0 && this.levelLabel) this.levelLabel.string = ['LINEAR LOCK', 'HALF-MOON LOCK', 'S-CURVE LOCK', 'DIAMOND LOCK', 'RING LOCK'][level];
    }
}
