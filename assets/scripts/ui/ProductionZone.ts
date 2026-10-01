import { _decorator, Button, Color, Component, director, find, Graphics, HorizontalTextAlignment, Label, LabelOutline, Node, resources, Sprite, SpriteFrame, UITransform, Vec2, Widget, isValid } from 'cc';
import { ZoneLinear } from '../core/level1/ZoneLinear';
import { ZoneRotation } from '../core/level2_3/ZoneRotation';
import { HighlightType } from '../core/GameConfig';
import { EventManager, GameEvents } from '../utils/EventManager';
const { ccclass, property } = _decorator;

import { size, child, layer, hideRender, sprite, picture, text, format } from './ArtAssets';
@ccclass('ProductionZone')
export class ProductionZone extends Component {
    @property public radial = false;
    private lastPath = '';
    lateUpdate(): void {
        const kind = this.radial ? this.node.getComponent(ZoneRotation)?.currentType : this.node.getComponent(ZoneLinear)?.currentType;
        const tone = kind === HighlightType.BLUE ? 'blue' : 'yellow';
        const path = 'gameplay/zone_' + tone + (this.radial ? '_ring' : '_linear');
        const s = this.node.getComponent(Sprite);
        if (!s) return;
        if (path !== this.lastPath) {
            this.lastPath = path;
            sprite(this.node, path);
            if (this.radial) {
                s.type = Sprite.Type.FILLED; s.fillType = Sprite.FillType.RADIAL;
                s.fillStart = 0; s.fillCenter = new Vec2(0.5, 0.5);
            }
        }
        // Game rules set a debug BLUE/YELLOW tint; the painted texture supplies the color.
        s.color = Color.WHITE;
    }
}

