import { Node, Tween, tween, UIOpacity, Vec3 } from 'cc';

/** Small, reusable panel entrance used by menus and results. */
export function presentPanel(panel: Node | null): void {
    if (!panel) return;
    panel.active = true;
    const opacity = panel.getComponent(UIOpacity) || panel.addComponent(UIOpacity);
    Tween.stopAllByTarget(panel);
    Tween.stopAllByTarget(opacity);
    opacity.opacity = 0;
    panel.setScale(0.96, 0.96, 1);
    tween(opacity).to(0.14, { opacity: 255 }).start();
    tween(panel).to(0.16, { scale: new Vec3(1, 1, 1) }, { easing: 'quadOut' }).start();
}
