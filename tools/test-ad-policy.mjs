import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ts = require('C:/ProgramData/cocos/editors/Creator/3.8.8/resources/app.asar.unpacked/node_modules/typescript');
const root = path.resolve(import.meta.dirname, '..');
const settle = () => new Promise(resolve => setImmediate(resolve));
const deferred = () => {
    let resolve;
    const promise = new Promise(done => { resolve = done; });
    return { promise, resolve };
};

function fixture() {
    const clock = { now: 1000000 };
    const storage = new Map();
    const events = [];
    const calls = { rewarded: 0, interstitial: 0, banner: [] };
    class Label { string = ''; }
    class Button { interactable = true; clickEvents = []; }
    class Node {
        static EventType = { TOUCH_END: 'touch-end', TOUCH_START: 'touch-start', TOUCH_CANCEL: 'touch-cancel' };
        active = true;
        children = [];
        name = '';
        parent = null;
        label = new Label();
        button = new Button();
        get activeInHierarchy() { return this.active && (!this.parent || this.parent.activeInHierarchy); }
        getChildByName(name) { return this.children.find(child => child.name === name) || null; }
        getComponent(type) { return type === Button ? this.button : type === Label ? this.label : null; }
        getComponentInChildren(type) { return this.getComponent(type); }
        getComponentsInChildren(type) { return this.children.map(child => child.getComponent(type)).filter(Boolean); }
        addChild(child) { child.parent = this; this.children.push(child); }
        setPosition() {}
        on() {}
    }
    class Component {}
    const cc = {
        _decorator: { ccclass: () => value => value, property: () => () => {} },
        Component, Node, Button, Label,
        instantiate: () => new Node(),
        sys: { localStorage: {
            getItem: key => storage.get(key) ?? null,
            setItem: (key, value) => storage.set(key, value),
            removeItem: key => storage.delete(key),
        } },
    };
    const context = vm.createContext({
        console, setTimeout, clearTimeout,
        Date: class extends Date { static now() { return clock.now; } },
        __LOCK_MASTER_PLATFORM_CONFIG__: { browserMockAds: true, browserMockPlatform: true },
    });
    const cache = new Map();
    function load(relative) {
        const file = path.resolve(root, relative);
        if (cache.has(file)) return cache.get(file).exports;
        const module = { exports: {} };
        cache.set(file, module);
        const source = fs.readFileSync(file, 'utf8');
        const output = ts.transpileModule(source, {
            compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2015, experimentalDecorators: true },
        }).outputText;
        const localRequire = name => {
            if (name === 'cc') return cc;
            const resolved = path.resolve(path.dirname(file), name + '.ts');
            if (resolved.endsWith(path.join('ui', 'UITransition.ts')))
                return { presentPanel: node => { node.active = true; } };
            if (resolved.endsWith(path.join('utils', 'EventManager.ts')))
                return { EventManager: { emit: (...args) => events.push(args), on() {}, off() {} },
                    GameEvents: { GAME_START: 'game-start', GAME_OVER: 'game-over' } };
            if (resolved.indexOf(path.join('core', 'level')) >= 0 || resolved.endsWith('LockManager.ts'))
                return new Proxy({}, { get: () => class {} });
            return load(resolved);
        };
        vm.runInContext('(function(require, module, exports) {' + output + '\n})', context, { filename: file })
            (localRequire, module, module.exports);
        return module.exports;
    }
    const { PlatformMgr } = load('assets/scripts/platform/PlatformMgr.ts');
    const adapter = {
        kind: 'browser',
        capabilities: { rewardedVideo: true, share: false, banner: true, interstitial: true, leaderboard: false },
        showRewardedVideo: () => { calls.rewarded++; return Promise.resolve({ ok: true, value: { completed: true } }); },
        showInterstitial: () => { calls.interstitial++; return Promise.resolve({ ok: true }); },
        hideBanner() {},
        showBanner: placement => { calls.banner.push(placement); return Promise.resolve({ ok: true }); },
        uploadScore: () => Promise.resolve({ ok: true }),
        showLeaderboard: () => Promise.resolve({ ok: false, reason: 'unsupported' }),
        hideLeaderboard() {},
        dispose() {},
    };
    PlatformMgr.setAdapterForTests(adapter);
    const { PlayerData } = load('assets/scripts/core/PlayerData.ts');
    const { AdService } = load('assets/scripts/platform/AdService.ts');
    function component(relative, name) {
        const instance = new (load(relative)[name])();
        instance.node = new Node();
        return instance;
    }
    function resultUI() {
        const ui = component('assets/scripts/ui/GameOverUI.ts', 'GameOverUI');
        for (const name of ['RestartBtn', 'ReviveBtn', 'NextLevelBtn', 'HomeBtn'])
            { const node = new Node(); node.name = name; ui.node.addChild(node); }
        ui.titleLabel = new Label();
        ui.reviveBtn = ui.node.getChildByName('ReviveBtn');
        ui.nextBtn = ui.node.getChildByName('NextLevelBtn');
        ui.gamePlayPanel = new Node();
        ui.mainMenuPanel = new Node();
        return ui;
    }
    function modeUI() {
        const ui = component('assets/scripts/ui/ModeSelectUI.ts', 'ModeSelectUI');
        ui.normalBtn = new Node();
        ui.challengeBtn = new Node();
        ui.challengeLockMask = new Node();
        ui.challengeTrialBtn = new Node();
        ui.gamePlayPanel = new Node();
        return ui;
    }
    return { clock, storage, events, calls, adapter, PlayerData, AdService, component, resultUI, modeUI, load };
}

// Each normal entry resets its own clock/score; blue hits score and add time.
{
    const f = fixture();
    const game = f.component('assets/scripts/ui/GamePlayUI.ts', 'GamePlayUI');
    game.timeLabel = { string: '' };
    game.scoreLabel = { string: '' };
    game.clearCurrentTrackZone = () => {};
    game.nextZone = () => {};
    const wins = [];
    game.endGame = won => wins.push(won);
    const levels = [[25, 7], [20, 15], [45, 15], [50, 17], [40, 20]];
    levels.forEach(([time, target], index) => {
        game._gameTime = 1;
        game._score = 99;
        game.startGame(0, index);
        assert.equal(game._gameTime, time);
        assert.equal(game._score, 0);
        assert.equal(game.scoreLabel.string, `0 / ${target}`);
        game.handleQTEResult(2);
        assert.equal(game._score, 1, 'Blue and yellow hits both score one point');
        assert.equal(game._gameTime, time + 1.5);
        for (let hit = 1; hit < target; hit++) game.handleQTEResult(1);
        assert.equal(wins.length, index + 1, 'Only reaching the configured target wins');
        game.startGame(0, index);
        assert.equal(game._gameTime, time, 'Checkpoint retry restores the full level clock');
        assert.equal(game._score, 0);
    });
}

// Normal checkpoint retries differ from free restarts, and cannot double-claim.
{
    const f = fixture();
    let ui = f.resultUI();
    ui.onShowSummary(false, 0, 0, 0);
    assert.equal(ui.reviveBtn.active, false);
    await ui.onAdReviveClick();
    assert.equal(f.calls.rewarded, 0);
    ui = f.resultUI();
    ui.onShowSummary(false, 1, 2, 0);
    assert.equal(ui.reviveBtn.active, true);
    const ad = deferred();
    f.adapter.showRewardedVideo = () => { f.calls.rewarded++; return ad.promise; };
    const waiting = ui.onAdReviveClick();
    await ui.onAdReviveClick();
    ui.onRestartClick();
    assert.equal(f.calls.rewarded, 1);
    assert.equal(f.events.length, 0, 'Cannot restart underneath a full-screen ad');
    ad.resolve({ ok: false, reason: 'not-completed' });
    await waiting;
    assert.equal(f.events.length, 0, 'Incomplete ad must not preserve checkpoint');
    assert.equal(ui.reviveBtn.button.interactable, true);
    ui.onRestartClick();
    assert.equal(f.events.at(-1)[2], 0, 'Free restart returns to level one');
    ui = f.resultUI();
    ui.onShowSummary(false, 2, 4, 0);
    f.adapter.showRewardedVideo = () => Promise.resolve({ ok: true, value: { completed: true } });
    await ui.onAdReviveClick();
    assert.equal(f.events.at(-1)[2], 2, 'Rewarded retry restarts the third level');
    ui = f.resultUI();
    ui.onShowSummary(true, 1, 5, 0);
    await settle();
    ui.onNextLevelClick();
    assert.equal(f.events.at(-1)[2], 2, 'Successful second level advances to third');
    ui = f.resultUI();
    ui.onShowSummary(true, 4, 15, 0);
    assert.equal(f.PlayerData.isChallengeUnlocked(), true);
}

// One complete video grants exactly one entry, never permanent unlock.
{
    const f = fixture(), ui = f.modeUI();
    f.adapter.showRewardedVideo = () => Promise.resolve({ ok: false, reason: 'failed' });
    await ui.onChallengeTrialClick();
    assert.equal(f.PlayerData.hasChallengeTrial(), false);
    assert.equal(f.events.length, 0);
    f.adapter.showRewardedVideo = () => Promise.resolve({ ok: true, value: { completed: true } });
    await ui.onChallengeTrialClick();
    assert.equal(f.PlayerData.isChallengeUnlocked(), false);
    assert.equal(f.PlayerData.hasChallengeTrial(), true);
    f.PlayerData.reload();
    assert.equal(f.PlayerData.hasChallengeTrial(), true, 'Earned entry survives storage reload');
    const game = f.component('assets/scripts/ui/GamePlayUI.ts', 'GamePlayUI');
    game.startGame(1, 4);
    assert.equal(f.PlayerData.hasChallengeTrial(), false);
    assert.equal(game._score, 0);
    assert.equal(game._gameTime, 60, 'Challenge trials start with 60 seconds');
    const emitted = f.events.length;
    game.startGame(1, 4);
    assert.equal(f.events.length, emitted, 'Cannot enter a second challenge without another reward');
    f.PlayerData.unlockChallenge();
    game.startGame(1, 4);
    game.startGame(1, 4);
    assert.equal(game.node.active, true);
    assert.equal(game._gameTime, 60, 'Unlocked challenge restarts restore 60 seconds');
    const summary = f.resultUI();
    summary.onShowSummary(false, 4, 10, 1);
    await settle();
    assert.equal(summary.reviveBtn.active, false);
    const before = f.calls.rewarded;
    await summary.onAdReviveClick();
    assert.equal(f.calls.rewarded, before, 'Challenge summary must not offer ad continuation');
}

// Late callbacks preserve an earned entry but never restart a hidden screen.
{
    const f = fixture(), ui = f.modeUI(), ad = deferred();
    f.adapter.showRewardedVideo = () => ad.promise;
    const waiting = ui.onChallengeTrialClick();
    ui.node.active = false;
    ui.onDisable();
    ad.resolve({ ok: true, value: { completed: true } });
    await waiting;
    assert.equal(f.events.length, 0);
    assert.equal(f.PlayerData.hasChallengeTrial(), true);
    const summary = f.resultUI();
    summary.onShowSummary(false, 1, 1, 0);
    const retry = deferred();
    f.adapter.showRewardedVideo = () => retry.promise;
    const pending = summary.onAdReviveClick();
    summary.node.active = false;
    summary.onDisable();
    retry.resolve({ ok: true, value: { completed: true } });
    await pending;
    assert.equal(f.events.length, 0, 'Late retry callback must not start an obsolete game');
}

// Startup, result-count, rewarded separation, shared cooldown, and session cap.
{
    const f = fixture();
    f.AdService.initialize();
    await f.AdService.showResultInterstitial();
    f.clock.now += 120000;
    await f.AdService.showResultInterstitial();
    assert.equal(f.calls.interstitial, 0);
    await f.AdService.watchRewarded('revive');
    await f.AdService.showResultInterstitial();
    assert.equal(f.calls.interstitial, 0);
    f.clock.now += 180000;
    await f.AdService.showResultInterstitial();
    assert.equal(f.calls.interstitial, 1);
    f.clock.now += 179999;
    await f.AdService.showResultInterstitial();
    assert.equal(f.calls.interstitial, 1);
    f.clock.now++;
    await f.AdService.showResultInterstitial();
    assert.equal(f.calls.interstitial, 2);
    f.clock.now += 180000;
    await f.AdService.showResultInterstitial();
    assert.equal(f.calls.interstitial, 2, 'At most two interstitials per session');
}

// SDK close callbacks, rather than show() resolution, release the summary UI.
{
    const f = fixture();
    f.load('assets/scripts/platform/PlatformConfig.ts').PlatformConfig.current.wechat = {
        rewardedVideoAdUnitId: 'test-reward', interstitialAdUnitId: 'test-interstitial', bannerAdUnitId: 'test-banner',
    };
    let closeInterstitial, closeRewarded, bannerHideCount = 0;
    const bannerShow = deferred();
    const sdk = {
        createRewardedVideoAd: () => ({
            onClose: callback => { closeRewarded = callback; }, offClose() {}, onError() {}, offError() {},
            show: () => Promise.resolve(),
        }),
        createInterstitialAd: () => ({
            onClose: callback => { closeInterstitial = callback; }, offClose() {}, onError() {}, offError() {},
            load: () => Promise.resolve(), show: () => Promise.resolve(), destroy() {},
        }),
        createBannerAd: () => ({
            style: {}, show: () => bannerShow.promise, hide: () => { bannerHideCount++; },
        }),
        getSystemInfoSync: () => ({ screenWidth: 375, screenHeight: 812, safeArea: { bottom: 780 } }),
    };
    const { WeChatAdapter } = f.load('assets/scripts/platform/WeChatAdapter.ts');
    const adapter = new WeChatAdapter(sdk);
    const banner = adapter.showBanner('home-banner');
    adapter.hideBanner();
    bannerShow.resolve();
    await banner;
    assert.equal(bannerHideCount, 2, 'Late Banner show must not cover gameplay');
    const reward = adapter.showRewardedVideo('revive');
    await settle();
    closeRewarded({ isEnded: false });
    assert.equal((await reward).ok, false);
    assert.equal((await adapter.showInterstitial('result-interstitial')).ok, false);
    f.clock.now += 180000;
    let finished = false;
    const interstitial = adapter.showInterstitial('result-interstitial').then(result => { finished = true; return result; });
    await settle();
    assert.equal(finished, false, 'SDK show() success must not release gameplay');
    closeInterstitial();
    assert.equal((await interstitial).ok, true);
}

console.log('PASS: actual runtime tests cover checkpoint retries, one-session challenge trials, stale callbacks, shared ad frequency, and SDK close lifecycle.');
