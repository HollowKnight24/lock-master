import { Button, Color, Graphics, HorizontalTextAlignment, Label, Node, resources, Sprite, SpriteFrame, UITransform, Widget, isValid } from 'cc';
const frames = new Map<string, SpriteFrame>();
const pending = new Map<string, Array<(frame: SpriteFrame) => void>>();
function loadArt(path: string, cb: (frame: SpriteFrame) => void): void {
    const cached = frames.get(path);
    if (cached) { cb(cached); return; }
    const waiting = pending.get(path);
    if (waiting) { waiting.push(cb); return; }
    pending.set(path, [cb]);
    resources.load('art/production/' + path + '/spriteFrame', SpriteFrame, (err, frame) => {
        const callbacks = pending.get(path) || [];
        pending.delete(path);
        if (err || !frame) { console.error('[ProductionArt] ' + path, err); return; }
        frames.set(path, frame);
        callbacks.forEach(fn => fn(frame));
    });
}
export function size(node: Node, w: number, h: number): UITransform {
    const widget = node.getComponent(Widget);
    if (widget) widget.enabled = false;
    const t = node.getComponent(UITransform) || node.addComponent(UITransform);
    t.setContentSize(w, h);
    t.setAnchorPoint(0.5, 0.5);
    return t;
}
export function child(root: Node, name: string): Node | null {
    if (root.name === name) return root;
    for (const n of root.children) { const found = child(n, name); if (found) return found; }
    return null;
}
export function layer(parent: Node, name: string, w: number, h: number): Node {
    let n = parent.getChildByName(name);
    if (!n) { n = new Node(name); n.layer = parent.layer; parent.addChild(n); }
    size(n, w, h);
    return n;
}
export function hideRender(node: Node | null): void {
    if (!node) return;
    const s = node.getComponent(Sprite);
    const g = node.getComponent(Graphics);
    if (s) s.enabled = false;
    if (g) g.enabled = false;
}
export function sprite(node: Node, path: string, onReady?: () => void): Sprite {
    const s = node.getComponent(Sprite) || node.addComponent(Sprite);
    s.enabled = true;
    s.sizeMode = Sprite.SizeMode.CUSTOM;
    s.type = Sprite.Type.SIMPLE;
    s.color = Color.WHITE;
    // A node may switch from enabled to disabled art while an async load is in flight.
    (s as any).__productionPath = path;
    loadArt(path, frame => {
        if (isValid(node) && (s as any).__productionPath === path) {
            s.spriteFrame = frame;
            onReady?.();
        }
    });
    return s;
}
export function picture(root: Node, name: string, path: string, w: number, h: number, x = 0, y = 0): Node {
    const n = layer(root, name, w, h);
    n.setPosition(x, y);
    sprite(n, path);
    return n;
}
export function text(root: Node, name: string, value: string, x: number, y: number, w = 700, h = 65, fs = 36): Label {
    const n = layer(root, name, w, h);
    n.setPosition(x, y);
    const l = n.getComponent(Label) || n.addComponent(Label);
    l.string = value;
    format(l, fs);
    return l;
}
export function format(l: Label, fs = 34): void {
    l.fontSize = fs; l.lineHeight = fs * 1.25;
    l.color = new Color(255, 238, 192);
    l.horizontalAlign = HorizontalTextAlignment.CENTER;
    l.overflow = Label.Overflow.SHRINK;
    l.enableOutline = true;
    l.outlineColor = new Color(61, 28, 17);
    l.outlineWidth = 3;
}
