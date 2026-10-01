import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const requiredAudio = ['ui_click', 'hit_yellow', 'hit_blue', 'miss', 'win', 'lose'];
const failures = [];
const expect = (value, message) => { if (!value) failures.push(message); };

for (const name of requiredAudio) {
    const file = path.join(root, 'assets', 'resources', 'audio', name + '.wav');
    expect(fs.existsSync(file), '缺少音频：' + name);
    if (fs.existsSync(file)) {
        const header = fs.readFileSync(file).subarray(0, 12).toString('ascii');
        expect(header === 'RIFF' + String.fromCharCode(0, 0, 0, 0) || header.startsWith('RIFF'), 'WAV 文件头错误：' + name);
    }
}

const audio = read('assets/scripts/utils/AudioManager.ts');
const events = read('assets/scripts/utils/EventManager.ts');
const button = read('assets/scripts/ui/ProductionButton.ts');
const transition = read('assets/scripts/ui/UITransition.ts');
const theme = read('assets/scripts/ui/VisualTheme.ts');
const menu = read('assets/scripts/ui/MainMenuUI.ts');
const audioPaths = read('assets/scripts/utils/AudioManager.ts');
expect(events.includes('UI_CLICK'), '缺少按钮声音事件');
expect(audio.includes('GameEvents.UI_CLICK') && audio.includes('GameEvents.GAME_OVER'), '音频管理器未监听按钮或结算事件');
expect(button.includes('GameEvents.UI_CLICK'), '正式按钮未触发点击反馈');
expect(transition.includes('UIOpacity') && transition.includes('quadOut'), '页面入场动效未启用');
expect(theme.includes('__ResultBurst') && theme.includes("win ? 'success' : 'miss'"), '结算成功/失败动效未启用');
expect(theme.includes('`TIME BONUS +${amount}s`') && theme.includes('GameConfig.BLUE_ZONE_BONUS'),
    '蓝区命中反馈未显示实际加时数值');
expect(theme.includes("characters/mascot_") && theme.includes('this.playResultBurst(root, win)')
    && theme.includes('new Vec3(1.14, 1.14, 1)'), '结算人物未在正确资源加载后播放成功庆祝动画');
expect(menu.includes('ensureSoundButton') && menu.includes('onSoundToggleClick'), '首页声音开关未接入');
expect(menu.includes('soundBtn.setScale(v3(0.58, 0.58, 1))'), '首页声音开关尺寸未放大');
expect(menu.includes('soundBtn.setPosition(v3(330, -760, 0))')
    && menu.includes('existing.setPosition(v3(330, -760, 0))'),
    '首页声音开关未移出灯笼和主视觉区域');
expect(!audioPaths.includes('BGM') && !audioPaths.includes('bgm'), '背景音乐运行逻辑尚未移除');
expect(audioPaths.includes('sfxSource') && audioPaths.includes('hitYellow'), '音效播放逻辑未保留');

if (failures.length) {
    console.error('FAIL: ' + failures.join('；'));
    process.exit(1);
}
console.log('PASS: 6 个音效资源、按钮音、命中/结算音和页面/结果动效均已接入；未包含背景音乐。');
