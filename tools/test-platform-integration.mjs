import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const failures = [];
const expect = (ok, message) => { if (!ok) failures.push(message); };

const config = read('assets/scripts/platform/PlatformConfig.ts');
const manager = read('assets/scripts/platform/PlatformMgr.ts');
const miniGameAdapter = read('assets/scripts/platform/MiniGameAdapterBase.ts');
const trialInjector = read('tools/inject-wechat-trial-config.mjs');
const trialBuild = read('tools/build-wechat-trial.cmd');
const rank = read('assets/scripts/ui/RankListUI.ts');
const docs = read('docs/platform-setup.md');

expect(config.includes('browserMockPlatform'), '缺少浏览器平台模拟配置');
expect(config.includes('experienceMockAds: false'), '体验模拟广告默认值必须为 false');
expect(config.includes('getClientConfigIssues'), '缺少平台公开配置检查');
expect(manager.includes('reportClientConfigIssues'), '启动时未报告平台配置缺口');
expect(manager.includes('mockBestScore'), '浏览器模拟排行榜未保存最高分');
expect(manager.includes('lock-master-mock-banner')
    && manager.includes('模拟激励广告（不计费）')
    && manager.includes('模拟插屏广告（不计费）'), '网页版模拟广告界面不完整');
expect(miniGameAdapter.includes('模拟激励广告（不计费）')
    && miniGameAdapter.includes('模拟插屏广告（不计费）')
    && miniGameAdapter.includes('模拟 Banner'), '小游戏体验版模拟广告反馈不完整');
expect(miniGameAdapter.includes("platformFailure('not-completed'"), '模拟激励广告未覆盖中途关闭分支');
expect(trialInjector.includes('LOCK_MASTER_WECHAT_TRIAL_CONFIG')
    && trialInjector.includes('experienceMockAds: true'), '微信体验构建未注入模拟广告开关');
expect(trialBuild.includes('inject-wechat-trial-config.mjs'), '微信体验构建脚本未执行模拟广告注入');
expect(rank.includes('PERSONAL BEST\\n${bestScore} POINTS\\nSAVED ON THIS DEVICE')
    && !rank.includes('showLeaderboard(')
    && !rank.includes('COMING LATER'), '海外版排行榜必须仅展示本地挑战纪录');
expect(docs.includes('browserMockPlatform'), '平台接入说明未记录浏览器模拟模式');
expect(docs.includes('模拟广告') && docs.includes('不产生曝光或收益'), '平台说明未标注体验模拟广告边界');
expect(docs.includes('AppSecret') && docs.includes('严禁'), '平台说明未强调服务端秘密禁止进入客户端');

if (failures.length) {
    console.error('FAIL: ' + failures.join('；'));
    process.exit(1);
}
console.log('PASS: 平台模拟、配置检查、排行榜状态边界与秘密隔离均已覆盖。');
