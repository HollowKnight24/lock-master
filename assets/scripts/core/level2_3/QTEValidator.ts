import { HighlightType, QTEResult } from '../GameConfig';

export class QTEValidator {
    public static validate(pointerAngle: number, zoneCenterAngle: number, zoneWidth: number, currentType: HighlightType): QTEResult {
        if (currentType === HighlightType.NONE) return QTEResult.MISS;

        let pAngle = (pointerAngle % 360 + 360) % 360;
        let zAngle = (zoneCenterAngle % 360 + 360) % 360;

        let diff = Math.abs(pAngle - zAngle);
        if (diff > 180) diff = 360 - diff; 

        let halfWidth = zoneWidth / 2;
        if (diff <= halfWidth) {
            return currentType === HighlightType.BLUE ? QTEResult.HIT_BLUE : QTEResult.HIT_YELLOW;
        }
        return QTEResult.MISS;
    }
}