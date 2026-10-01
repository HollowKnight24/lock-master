import { _decorator, Component, Label, Node } from 'cc';
import { PlayerData } from '../core/PlayerData';
import { PlatformMgr } from '../platform/PlatformMgr';

const { ccclass, property } = _decorator;

@ccclass('RankListUI')
export class RankListUI extends Component {
    @property(Node) public closeBtn: Node = null!;

    private _statusLabel: Label | null = null;

    onLoad() {
        const labels = this.node.getComponentsInChildren(Label);
        this._statusLabel = labels.find((label) => label.string === 'ScrollView content')
            || labels[labels.length - 1]
            || null;
    }

    onEnable() {
        void PlatformMgr.current.showBanner('rank-banner');
        this.showRankList();
    }

    onDisable() {
        PlatformMgr.current.hideBanner();
        if (this.node.parent?.getChildByName('MainMenuUI')?.activeInHierarchy) {
            void PlatformMgr.current.showBanner('home-banner');
        }
    }

    public showRankList() {
        const bestScore = PlayerData.getChallengeBestScore();
        this.setStatus(`PERSONAL BEST\n${bestScore} POINTS\nSAVED ON THIS DEVICE`);
    }

    public onCloseBtnClick() {
        this.node.active = false;
    }

    private setStatus(text: string) {
        if (this._statusLabel) this._statusLabel.string = text;
        console.log(`[RankListUI] ${text.replace(/\n/g, ' ')}`);
    }
}
