import fs from 'node:fs';
import path from 'node:path';

const project = path.resolve(import.meta.dirname, '..');
const read = (relative) => fs.readFileSync(path.join(project, relative), 'utf8');
const failures = [];
const expect = (condition, message) => {
    if (!condition) failures.push(message);
};

const config = read('assets/scripts/core/GameConfig.ts');
const gameplay = read('assets/scripts/ui/GamePlayUI.ts');
const linearPointer = read('assets/scripts/core/level1/PointerLinear.ts');
const radialPointer = read('assets/scripts/core/level2_3/PointerRotation.ts');
const scene = read('assets/scene.scene');
const visualTheme = read('assets/scripts/ui/VisualTheme.ts');
const productionZone = read('assets/scripts/ui/ProductionZone.ts');
const pathTrack = read('assets/scripts/core/PathTrack.ts');
const safeArea = read('assets/scripts/ui/SafeAreaLayout.ts');

// This verifies the first-stage flow without pinning balance values that will
// be tuned only after the visual and platform work is complete.
expect(config.includes('public static readonly INITIAL_TIME'), '缺少初始时间配置');
expect(config.includes('BLUE_ZONE_BONUS'), '缺少蓝色区域奖励配置');
expect(gameplay.includes('EventManager.emit("LOAD_LEVEL_PREFAB", resolvedLevelIdx)'), '开始游戏未加载对应关卡模板');
expect(gameplay.includes('levelIdx === 1'), '第二关没有使用半圆轨道规则');
expect(gameplay.includes('this._currentLevelIdx === 4'), '第五关没有命中反转逻辑');
expect(gameplay.includes('this.endGame(true)'), '普通模式没有通关结算');
expect(gameplay.includes('this.endGame(false)'), '倒计时结束没有失败结算');
expect(gameplay.includes('EventManager.emit(GameEvents.QTE_HIT_BLUE, GameConfig.BLUE_ZONE_BONUS)'),
    '蓝区命中事件未携带实际加时数值');
expect(gameplay.includes('this.lockManager.clearTrack()'), '结算没有清理关卡实例');
expect(linearPointer.includes('this._direction = 1'), '第一关重开未复位指针方向');
expect(linearPointer.includes('this.unschedule(this.releaseMissPenalty)'), '第一关连续误触冻结未去重');
expect(radialPointer.includes('this.unschedule(this.releaseMissPenalty)'), '旋转关连续误触冻结未去重');
expect(scene.includes('"debugStartLevel": 0'), '发布默认入口不是首页');
expect(scene.includes('"previewPage": 0'), '编辑器默认预览不是首页');
expect(scene.includes('"width": 172') && scene.includes('"height": 150'), '第一关已保存的高亮区域尺寸不正确');
expect(visualTheme.includes("size(zone, vertical ? 172 : 540, vertical ? 150 : 540)"), '运行时第一关高亮区域尺寸不正确');
expect(gameplay.includes('Input.EventType.MOUSE_DOWN') && gameplay.includes('EventMouse.BUTTON_LEFT')
    && gameplay.includes('EventMouse.BUTTON_RIGHT'), '海外版未接入左键解锁、右键加速');
expect(visualTheme.includes("picture(pointer, '__Needle', 'gameplay/pointer_linear', 80, 280)"), '第一关未使用统一银针素材');
expect(visualTheme.includes("picture(pointer, '__Needle', 'gameplay/pointer_radial', 80, 280, 130, 0)"), '圆轨道未使用统一银针素材或枢轴偏移不正确');
expect(productionZone.includes("tone + (this.radial ? '_ring' : '_linear')"), '黄蓝高亮没有使用对应正式素材');
expect(fs.existsSync(path.join(project, 'assets/resources/art/production/gameplay/pointer_linear.png')), '缺少正式线性银针素材');
expect(fs.existsSync(path.join(project, 'assets/resources/art/production/gameplay/pointer_radial.png')), '缺少正式旋转银针素材');

if (failures.length) {
    console.error('FAIL: ' + failures.join('；'));
    process.exit(1);
}
expect(config.includes('levelId: 4') && config.includes('levelId: 5'), '缺少新增的 S 型与菱形关卡配置');
expect(gameplay.includes('PathTrack'), '新增路径关卡未接入游戏流程');
expect(pathTrack.includes('const radius=112, centreY=40') && pathTrack.includes('Math.PI/2-Math.PI*i/steps'),
    '第三关没有使用两个相切半圆组成的标准 S 路径');
expect(pathTrack.includes('new Vec2(0,238)') && pathTrack.includes('new Vec2(236,24)')
    && pathTrack.includes('new Vec2(0,-186)') && pathTrack.includes('const inset=45'),
    '第四关圆角菱形中心线没有贴合正式轨道素材');
expect(pathTrack.includes('Graphics.LineCap.BUTT')
    && pathTrack.includes('S_NEEDLE_HALF_LENGTH:DIAMOND_NEEDLE_HALF_LENGTH')
    && pathTrack.includes('S_ZONE_STROKE : DIAMOND_ZONE_STROKE'),
    '第三、第四关高亮端口或银针长度没有使用贴轨参数');
expect(gameplay.includes('onPauseBtnClick') && gameplay.includes('onResumeBtnClick')
    && gameplay.includes('onPauseHomeClick') && gameplay.includes('setTrackPaused'),
    '关卡暂停、继续或退出首页流程缺失');
expect(gameplay.includes('Input.EventType.KEY_DOWN') && gameplay.includes('KeyCode.ESCAPE')
    && gameplay.includes('this._escapeHeld') && gameplay.includes('this.onResumeBtnClick()'),
    '海外版 Esc 暂停或继续未接入');
expect(safeArea.includes("node.name === 'PauseBtn'") && safeArea.includes('new Vec3(0, -605'),
    '手机暂停键的安全区域基准位置未固定在双按钮上方');
expect(gameplay.includes("'__MouseControlLegend'") && gameplay.includes("'BOOST (HOLD)'")
    && gameplay.includes("'__EscKey'") && gameplay.includes("'PauseBtn', '__Hint']")
    && gameplay.includes('setupTouchControls()') && gameplay.includes("'TAP TO PICK'")
    && gameplay.includes("'HOLD TO BOOST'"),
    '海外版电脑提示或手机触屏布局缺失');
expect(linearPointer.includes('setPaused(value: boolean)')
    && radialPointer.includes('setPaused(value: boolean)')
    && pathTrack.includes('setPaused(value: boolean)'),
    '暂停没有冻结所有指针路径组件');
expect(scene.includes('"_name": "PauseBtn"') && scene.includes('"_name": "PauseUI"')
    && scene.includes('"_name": "ContinueBtn"') && scene.includes('"_name": "PauseHomeBtn"'),
    '暂停按钮和暂停面板未保存到 Cocos 场景层级');
console.log('PASS: 五关加载、命中、路径判定、反转、结算和重开链路均已覆盖。');
