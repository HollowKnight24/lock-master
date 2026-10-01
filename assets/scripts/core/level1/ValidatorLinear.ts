import { _decorator } from 'cc';
import { QTEResult, HighlightType } from '../GameConfig';

export class ValidatorLinear {
    /**
     * @param pointerY 指针当前Y坐标
     * @param zoneY 高亮区中心Y坐标
     * @param zoneHeight 高亮区当前实时高度宽度
     */
    public static validate(pointerY: number, zoneY: number, zoneHeight: number, currentType: HighlightType): QTEResult {
        if (currentType === HighlightType.NONE) return QTEResult.MISS;

        // 算一维绝对距离差
        let diff = Math.abs(pointerY - zoneY);
        let halfHeight = zoneHeight / 2;

        if (diff <= halfHeight) {
            return currentType === HighlightType.BLUE ? QTEResult.HIT_BLUE : QTEResult.HIT_YELLOW;
        }
        return QTEResult.MISS;
    }
}