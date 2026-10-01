import { _decorator, Color, Component, Graphics, Node, Sprite, SpriteFrame, UITransform, Vec2, resources, v3 } from 'cc';
import { HighlightType, QTEResult } from './GameConfig';
const { ccclass } = _decorator;

// Authored visual measurements. Keep these named so visual-regression tests
// can guard the groove clearances independently from gameplay timing.
const S_ZONE_STROKE = 52;
const DIAMOND_ZONE_STROKE = 60;
const DIAMOND_ZONE_OUTWARD_OFFSET = 22;
const S_NEEDLE_HALF_LENGTH = 28;
const DIAMOND_NEEDLE_HALF_LENGTH = 46;

@ccclass('PathTrack')
export class PathTrack extends Component {
    public kind = 0; // 0: S open path, 1: rounded diamond closed path
    public speed = 150;
    private progress = 0;
    private direction = 1;
    private multiplier = 1;
    private frozen = false;
    private paused = false;
    private zoneCenter = .5;
    private zoneWidth = .14;
    private zoneLife = 0;
    private zoneType = HighlightType.NONE;
    private previousBlue = false;
    private blueChance = .15;
    private points: Vec2[] = [];
    private pointer!: Graphics;
    private zone!: Graphics;

    public configure(kind: number, speed: number, blueChance: number): void {
        this.kind = kind; this.speed = speed; this.blueChance = blueChance; this.progress = 0; this.direction = 1;
        this.points = kind === 0 ? this.sampleS() : this.sampleDiamond();
        this.createVisuals(kind === 0 ? 'lock_s' : 'lock_diamond');
        this.spawnZone(blueChance);
    }
    update(dt: number): void {
        if (!this.points.length || this.paused) return;
        if (!this.frozen) {
            this.progress += this.direction * this.speed * this.multiplier * dt / this.pathLength();
            if (this.kind === 0) {
                if (this.progress >= 1) { this.progress = 1; this.direction = -1; }
                if (this.progress <= 0) { this.progress = 0; this.direction = 1; }
            } else this.progress = (this.progress % 1 + 1) % 1;
        }
        this.zoneLife -= dt;
        if (this.zoneLife <= 0) this.spawnZone(this.blueChance);
        this.zoneWidth = Math.max(.018, .14 * Math.max(0, this.zoneLife / 2));
        this.draw();
    }
    public validate(): QTEResult {
        let d = Math.abs(this.progress - this.zoneCenter);
        if (this.kind === 1) d = Math.min(d, 1 - d);
        if (this.zoneType === HighlightType.NONE || d > this.zoneWidth / 2) return QTEResult.MISS;
        return this.zoneType === HighlightType.BLUE ? QTEResult.HIT_BLUE : QTEResult.HIT_YELLOW;
    }
    public spawnZone(blueChance: number): void {
        const blue = !this.previousBlue && Math.random() < blueChance;
        this.previousBlue = blue; this.zoneType = blue ? HighlightType.BLUE : HighlightType.YELLOW;
        this.zoneCenter = this.kind === 0 ? .08 + Math.random() * .84 : Math.random();
        this.zoneWidth = .14; this.zoneLife = 2;
    }
    public clearZone(): void { this.zoneType = HighlightType.NONE; if (this.zone) this.zone.clear(); }
    public setSpeedMultiplier(value: number): void { this.multiplier = value; }
    public setPaused(value: boolean): void { this.paused = value; }
    public triggerMissPenalty(): void { this.frozen = true; this.unschedule(this.release); this.scheduleOnce(this.release, .4); }
    private release = () => { this.frozen = false; };
    private createVisuals(asset: string): void {
        this.node.removeAllChildren();
        const body = new Node('__LockArt'); body.layer = this.node.layer; this.node.addChild(body);
        body.addComponent(UITransform).setContentSize(900, 1215); body.setPosition(0, 125);
        const sprite = body.addComponent(Sprite); sprite.sizeMode = Sprite.SizeMode.CUSTOM;
        resources.load('art/production/gameplay/' + asset + '/spriteFrame', SpriteFrame, (_e, frame) => { if (frame) sprite.spriteFrame = frame; });
        const zoneNode = new Node('PathZone'); zoneNode.layer = this.node.layer; this.node.addChild(zoneNode); this.zone = zoneNode.addComponent(Graphics);
        const pointerNode = new Node('PathPointer'); pointerNode.layer = this.node.layer; this.node.addChild(pointerNode); this.pointer = pointerNode.addComponent(Graphics);
    }
    private draw(): void {
        this.zone.clear();
        // Match each authored groove instead of sharing the narrower legacy
        // stroke. The diamond groove is substantially broader than the S.
        // Keep the diamond highlight inside the dark groove.  Its previous
        // 84 px stroke slightly crossed the groove's inner rim even though
        // the authored centre line was already aligned correctly.
        this.zone.lineWidth = this.kind === 0 ? S_ZONE_STROKE : DIAMOND_ZONE_STROKE;
        this.zone.lineCap = Graphics.LineCap.BUTT;
        this.zone.lineJoin = Graphics.LineJoin.ROUND;
        this.zone.strokeColor = this.zoneType === HighlightType.BLUE ? new Color(20,210,255,255) : new Color(255,207,20,255);
        const count = Math.max(2, Math.ceil(this.zoneWidth * this.points.length));
        for (let i=0;i<count;i++) {
            const t=this.zoneCenter-this.zoneWidth/2+i*this.zoneWidth/(count-1);
            const p=this.zoneAt(t);
            i?this.zone.lineTo(p.x,p.y):this.zone.moveTo(p.x,p.y);
        }
        this.zone.stroke();
        // Sample both sides of the pointer so its tangent remains valid at the
        // two open ends of the S track.  The needle is deliberately shorter
        // than the groove width, keeping the complete silver line inside it.
        const p=this.at(this.progress), before=this.at(this.progress-.004), after=this.at(this.progress+.004);
        const a=Math.atan2(after.y-before.y,after.x-before.x)+Math.PI/2;
        const needleHalfLength=this.kind===0?S_NEEDLE_HALF_LENGTH:DIAMOND_NEEDLE_HALF_LENGTH;
        this.pointer.clear(); this.pointer.lineWidth=6; this.pointer.lineCap=Graphics.LineCap.BUTT; this.pointer.strokeColor=new Color(225,235,240,255); this.pointer.moveTo(p.x-Math.cos(a)*needleHalfLength,p.y-Math.sin(a)*needleHalfLength); this.pointer.lineTo(p.x+Math.cos(a)*needleHalfLength,p.y+Math.sin(a)*needleHalfLength); this.pointer.stroke();
    }
    private at(t:number):Vec2 {
        if(this.kind===1)t=(t%1+1)%1; else t=Math.max(0,Math.min(1,t));
        const scaled=t*(this.points.length-1), index=Math.min(this.points.length-2,Math.floor(scaled));
        return Vec2.lerp(new Vec2(),this.points[index],this.points[index+1],scaled-index);
    }
    private zoneAt(t:number):Vec2 {
        const p=this.at(t);
        if(this.kind!==1) return p;

        // The diamond path runs clockwise. Move only the highlight along its
        // outward normal so its inner edge stays out of the solid centre;
        // the pointer remains on the authored groove centre line.
        const before=this.at(t-.003), after=this.at(t+.003);
        const tx=after.x-before.x, ty=after.y-before.y;
        const length=Math.sqrt(tx*tx+ty*ty)||1;
        const outwardOffset=DIAMOND_ZONE_OUTWARD_OFFSET;
        return new Vec2(
            p.x-ty/length*outwardOffset,
            p.y+tx/length*outwardOffset,
        );
    }
    private pathLength():number { let n=0; for(let i=1;i<this.points.length;i++)n+=Vec2.distance(this.points[i-1],this.points[i]); return n||1; }
    private sampleS():Vec2[] {
        // A strict geometric S made from two equal semicircles.  The upper
        // half bulges left and the lower half bulges right; they share the
        // same horizontal tangent at the centre.  Graphics uses BUTT caps so
        // the two exposed ends are flat rather than rounded.
        const out:Vec2[]=[];
        const radius=112, centreY=40, steps=96;
        for(let i=0;i<=steps;i++) {
            const angle=Math.PI/2+Math.PI*i/steps;
            out.push(new Vec2(radius*Math.cos(angle),centreY+radius+radius*Math.sin(angle)));
        }
        for(let i=1;i<=steps;i++) {
            const angle=Math.PI/2-Math.PI*i/steps;
            out.push(new Vec2(radius*Math.cos(angle),centreY-radius+radius*Math.sin(angle)));
        }
        return out;
    }
    private sampleDiamond():Vec2[] {
        // Match the centre of the rounded-diamond groove in lock_diamond.png.
        // The previous centre line sat slightly toward the inner orange plate.
        // Expanding the four vertices moves both needle and zone to the middle
        // of the visible dark groove while retaining its rounded corners.
        const vertices=[new Vec2(0,238),new Vec2(236,24),new Vec2(0,-186),new Vec2(-236,24)];
        const inset=45, out:Vec2[]=[];
        const entry:Vec2[]=[], exit:Vec2[]=[];
        for(let i=0;i<vertices.length;i++) {
            const current=vertices[i], previous=vertices[(i+vertices.length-1)%vertices.length], next=vertices[(i+1)%vertices.length];
            entry.push(new Vec2(current.x+(previous.x-current.x)*inset/Vec2.distance(current,previous),current.y+(previous.y-current.y)*inset/Vec2.distance(current,previous)));
            exit.push(new Vec2(current.x+(next.x-current.x)*inset/Vec2.distance(current,next),current.y+(next.y-current.y)*inset/Vec2.distance(current,next)));
        }
        for(let i=0;i<vertices.length;i++) {
            const next=(i+1)%vertices.length;
            for(let step=0;step<24;step++) out.push(Vec2.lerp(new Vec2(),exit[i],entry[next],step/24));
            for(let step=0;step<16;step++) {
                const t=step/16,u=1-t,p0=entry[next],p1=vertices[next],p2=exit[next];
                out.push(new Vec2(u*u*p0.x+2*u*t*p1.x+t*t*p2.x,u*u*p0.y+2*u*t*p1.y+t*t*p2.y));
            }
        }
        out.push(out[0].clone());
        return out;
    }
}
