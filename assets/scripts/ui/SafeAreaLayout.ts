import { _decorator, Component, director, find, isValid, Node, sys, UITransform, Vec3, view } from 'cc';
import { usesTouchControls } from './ControlLayout';

const { ccclass } = _decorator;

type SafeEdge = 'top' | 'bottom' | 'right';

interface ManagedNode {
    node: Node;
    basePosition: Vec3;
    edge: SafeEdge;
}

@ccclass('SafeAreaLayout')
export class SafeAreaLayout extends Component {
    private readonly _managed: ManagedNode[] = [];

    public static ensureInitialized(): SafeAreaLayout | null {
        const scene = director.getScene();
        const canvas = scene ? find('Canvas', scene) : null;
        if (!canvas) {
            return null;
        }
        return canvas.getComponent(SafeAreaLayout) || canvas.addComponent(SafeAreaLayout);
    }

    protected onEnable(): void {
        this.refresh();
        this.schedule(this.refresh, 0.35);
    }

    protected onDisable(): void {
        this.unschedule(this.refresh);
    }

    private refresh = (): void => {
        this.collectManagedNodes();

        const canvasTransform = this.node.getComponent(UITransform);
        if (!canvasTransform) {
            return;
        }

        const visibleSize = view.getVisibleSize();
        const safeArea = sys.getSafeAreaRect();
        if (visibleSize.width <= 0 || visibleSize.height <= 0) {
            return;
        }

        const bottomInset = Math.max(0, safeArea.y);
        const rightInset = Math.max(0, visibleSize.width - safeArea.x - safeArea.width);
        const topInset = Math.max(0, visibleSize.height - safeArea.y - safeArea.height);

        for (const item of this._managed) {
            if (!isValid(item.node)) {
                continue;
            }

            const position = item.basePosition.clone();
            if (usesTouchControls() && (item.node.name === 'UnlockBtn' || item.node.name === 'SpeedUpBtn')) {
                const buttonWidth = Math.min(450, Math.max(300, (visibleSize.width - 90) / 2));
                const scale = buttonWidth / 450;
                item.node.setScale(scale, scale, 1);
                position.x = (item.node.name === 'UnlockBtn' ? 1 : -1) * (buttonWidth / 2 + 15);
            }
            if (item.edge === 'top') {
                position.y -= Math.min(120, topInset + 12);
            } else if (item.edge === 'bottom') {
                position.y += Math.min(150, bottomInset + 18);
            } else {
                position.x -= Math.min(150, rightInset + 12);
            }
            item.node.setPosition(position);
        }
    };

    private collectManagedNodes(): void {
        const targets: Array<{ path: string; edge: SafeEdge }> = [
            { path: 'UIRoot/GamePlayUI/TimeLabel', edge: 'top' },
            { path: 'UIRoot/GamePlayUI/ScoreLabel', edge: 'top' },
            { path: 'UIRoot/GamePlayUI/LevelLabel', edge: 'top' },
            ...(usesTouchControls()
                ? [
                    { path: 'UIRoot/GamePlayUI/UnlockBtn', edge: 'bottom' as const },
                    { path: 'UIRoot/GamePlayUI/SpeedUpBtn', edge: 'bottom' as const },
                    { path: 'UIRoot/GamePlayUI/PauseBtn', edge: 'bottom' as const },
                ]
                : [{ path: 'UIRoot/GamePlayUI/__MouseControlLegend', edge: 'bottom' as const }]),
            { path: 'UIRoot/MainMenuUI/SoundBtn', edge: 'right' },
        ];

        for (const target of targets) {
            const node = find(target.path, this.node);
            if (!node || this._managed.some((item) => item.node === node)) {
                continue;
            }
            this._managed.push({
                node,
                // Canvas may enable before GamePlayUI finishes its mobile setup.
                // Keep the pause anchor above the two action buttons on every refresh.
                basePosition: usesTouchControls() && node.name === 'PauseBtn'
                    ? new Vec3(0, -605, node.position.z)
                    : node.position.clone(),
                edge: target.edge,
            });
        }
    }
}
