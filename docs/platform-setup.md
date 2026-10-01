# 《撬锁大师》微信 / 抖音小游戏接入与构建说明

## 网页好友试玩版

Cloudflare Pages 固定地址：`https://lock-master-trial.pages.dev/`

网页构建启用了明确标注“不计费”的模拟激励广告、Banner 和插屏，不接入微信登录、真实广告或开放数据域。更新项目后运行 `npm run web:trial:deploy`，脚本会依次重新构建、校验并部署到同一固定地址。Cloudflare 登录令牌由 Wrangler 保存在用户环境中，不写入项目仓库。

## 微信好友体验版

项目已提供 `npm run wechat:trial:build`，产物位于 `build/wechatgame-trial`。资源包已配置为微信小游戏分包，Cocos 引擎已配置为微信引擎插件；运行 `npm run wechat:trial:verify` 可自动检查入口文件、AppID、分包声明和包体限制。

当前本机 Creator 配置中已经存在一个真实微信小游戏 AppID，构建时会自动写入 `project.config.json`。上传前仍需由发布方确认该 AppID 正是本项目使用的账号。体验阶段可以暂不配置广告位、开放数据域和登录后端；对应能力会安全降级，但不影响五关普通玩法体验。

微信体验构建会由 `tools/inject-wechat-trial-config.mjs` 自动启用模拟广告。模拟流程不调用微信广告 SDK、不产生曝光或收益，并在界面中明确标注“不计费”。激励视频弹窗可选择“完整观看”或“中途关闭”，用于验证奖励边界；Banner 使用短提示模拟；插屏仍遵守业务层的启动时间、结算次数和冷却限制。正式渠道构建不运行该注入脚本，`experienceMockAds` 默认保持 `false`。

让微信好友试玩的最短流程：

1. 安装并登录微信开发者工具，选择“导入项目”，目录填写 `build/wechatgame-trial`。
2. 确认项目类型为“小游戏”，AppID 与本项目的微信小游戏后台一致。
3. 在开发者工具完成编译；至少验证首页、普通五关、暂停/继续、失败重开和挑战模式。
4. 点击“上传”，填写体验版本号和说明。
5. 登录微信公众平台，在“成员管理”中把好友添加为体验成员，再将体验版二维码发给他们。

未被加入体验成员的普通微信好友不能直接扫码打开未发布版本。若需要任何好友都能访问，则必须提交平台审核并发布正式版本。

本文对应 Cocos Creator 3.8.8 项目当前的 P1 平台层。代码已提供登录 code 获取、分享、广告生命周期、排行榜主域消息、统一存档和音频安全降级；正式发布仍需平台凭证、服务端、开放数据域工程和正式资源。

## 1. 发布前必填项

| 项目 | 微信小游戏 | 抖音小游戏 | 存放位置 |
| --- | --- | --- | --- |
| AppID | 必填 | 必填 | Creator 构建面板 / 平台开发者工具，不写入仓库 |
| AppSecret | 服务端必填 | 服务端必填 | 仅服务端密钥系统，严禁打入客户端 |
| 激励视频广告位 ID | 必填 | 必填 | 运行配置 `rewardedVideoAdUnitId` |
| Banner 广告位 ID | 按需 | 按需 | 运行配置 `bannerAdUnitId` |
| 插屏广告位 ID | 按需 | 按需 | 运行配置 `interstitialAdUnitId` |
| 分享模板 ID | 不使用 | 按平台能力填写 | `douyin.shareTemplateId` |
| 登录换票接口 | 必填 | 必填 | 业务服务端 |
| 排行榜权限及子域 | 必填 | 必填 | 平台后台、构建配置和开放数据域子工程 |

所有广告位和模板 ID 默认均为空。缺配置时客户端返回 `config-missing`，不会伪造广告成功或发放复活奖励。

## 2. 运行配置注入

在 **游戏业务模块首次加载之前** 的渠道启动脚本中设置全局配置。`PlatformConfig.current` 首次读取后会缓存配置，因此晚于游戏入口注入不会生效。

```js
globalThis.__LOCK_MASTER_PLATFORM_CONFIG__ = {
  loginTimeoutMs: 10000,
  adTimeoutMs: 120000,
  interstitialCooldownMs: 180000,
  leaderboardKey: 'challengeScore',
  shareTitle: '撬锁大师：来挑战我的最高分！',
  shareImageUrl: '',
  browserMockAds: false,
  browserMockPlatform: false,
  wechat: {
    rewardedVideoAdUnitId: '',
    bannerAdUnitId: '',
    interstitialAdUnitId: '',
    shareTemplateId: ''
  },
  douyin: {
    rewardedVideoAdUnitId: '',
    bannerAdUnitId: '',
    interstitialAdUnitId: '',
    shareTemplateId: ''
  }
};
```

建议通过渠道构建模板或受控启动脚本注入。临时修改构建产物只能用于联调，因为重新构建会覆盖改动。配置对象只能包含可公开的客户端参数；不得加入 AppSecret、session_key、服务端令牌或用户隐私数据。

`browserMockAds` 与 `browserMockPlatform` 仅用于人工调试，生产构建必须保持 `false`。后者可模拟分享、广告和排行榜调用，便于浏览器走完整 UI 链路；它不代表已接入平台 SDK 或开放数据域。

## 3. 登录与服务端会话

`MainMenuUI` 启动时调用一次 `PlatformMgr.initialize()`：

1. 微信环境调用 `wx.login`，抖音环境调用 `tt.login`。
2. 平台层只返回临时登录 `code`。
3. 客户端应通过 HTTPS 把 code 发送给业务服务端。
4. 服务端使用对应平台的 AppID/AppSecret 换取平台会话，并建立自己的短期登录态。
5. 客户端只保存业务服务端签发的安全会话，不保存平台秘密。

当前仓库尚未提供第 3～5 步所需的业务 API，不能仅凭客户端取得 code 就视为正式登录完成。

## 4. 广告与分享验收规则

### 激励视频

- 普通模式第二至第五关失败后，本关重试使用 placement：`revive`。第一关不提供广告重试。
- 完整观看后重置当前关卡的时间、得分、指针和目标区域；免费重开统一从第一关开始。
- 未解锁的挑战模式使用 placement：`challenge-trial`，完整观看后获得一局体验。体验不永久解锁，进入游戏时消费资格；挑战结束不允许广告续命。
- 普通五关最终通关后永久解锁挑战模式，包括使用广告重试后通关的情况。
- 仅广告关闭回调明确返回 `isEnded === true` 时，结果才是 `completed: true`。
- 中途关闭、取消、加载失败、超时或配置缺失均不发放复活。
- 同一时间只允许一个激励视频请求；展示失败时会先 `load` 再重试一次。

### Banner 与插屏

- 首页 Banner 使用 `home-banner`；排行榜使用 `rank-banner`，离开这两个页面后隐藏。游戏主场景、模式选择、结算和全屏广告期间不展示 Banner。
- 普通模式成功过关、挑战模式一次结束时才会产生 `result-interstitial` 展示机会；普通失败页不展示插屏。
- AdService 统一频控：会话开始至少两分钟、累计至少三次合格结算才可展示，默认间隔至少三分钟，看视频后至少三分钟不插屏，每会话最多两次。以上为广告测试起点，可后续调整。
- 插屏展示后，结算操作等待关闭回调；广告失败/超时恢复正常操作，不改变过关结果。
- 必须在平台后台确认广告位属于当前 AppID，并在开发者工具和真机分别验证。

### 分享

- 微信 `shareAppMessage` 成功调用只代表已唤起分享，不代表用户完成分享，不能据此发奖励。
- 抖音处理 success、fail、取消和超时；若平台要求分享模板，填写 `douyin.shareTemplateId`。
- `shareImageUrl` 留空时不传分享图；正式地址和素材需满足对应平台审核要求。

## 5. 排行榜边界与开放数据域协议

主域当前发送以下消息：

```json
{"type":"updateScore","key":"challengeScore","score":123}
{"type":"showLeaderboard","key":"challengeScore"}
{"type":"hideLeaderboard"}
```

挑战模式只有产生本机新纪录时才上传整数分数。当前 `RankListUI` 能显示本机最高分及平台调用状态，但仓库 **尚无真实开放数据域子工程，也没有把 sharedCanvas / ScreenCanvas 渲染到主域 UI**。成功提示仅代表“主域消息已发出”，不代表好友榜已经渲染。正式好友榜仍需：

1. 在对应平台申请排行榜/开放数据能力。
2. 创建开放数据域子工程并监听上述消息。
3. 在子域中读取、写入和排序平台托管数据。
4. 将子域画布接入 Cocos 排行榜面板。
5. 在开发者工具和真机验证权限、尺寸、触摸和刷新生命周期。

在完成这些步骤前，不应把当前状态 UI 对外描述为“好友排行榜已完成”。

## 6. 音频资源

运行时会复用或创建 `Canvas/GlobalAudio_Node`，并创建 `SFXSource`。当前版本不使用背景音乐；将正式音效导入以下资源路径（代码加载时不带扩展名）：

```text
assets/resources/audio/hit_yellow.*
assets/resources/audio/hit_blue.*
assets/resources/audio/miss.*
```

也可在场景中手动为 `GlobalAudio_Node` 添加 `AudioManager`，并在检查器绑定六个音效 `AudioClip`。若资源缺失，管理器只记录一次提示并静默跳过播放，不会中断游戏；音频开关由统一玩家存档持久化。正式格式、码率和包体策略需在两个平台真机上确认。

## 7. Cocos Creator 3.8.8 构建流程

分别为两个渠道执行，不要在缺少真实 AppID 时提交虚假 build profile：

1. 用 Cocos Creator 3.8.8 打开本项目，等待资源导入完成。
2. 打开“项目 → 构建发布”。
3. 微信选择“微信小游戏”；抖音选择对应的“字节跳动/抖音小游戏”平台。
4. 填写平台分配的 AppID，并按平台要求配置包名、方向、远程资源和开放数据域目录。
5. 构建后确保上面的运行配置先于游戏入口执行。
6. 使用微信开发者工具或抖音开发者工具导入构建目录。
7. 检查合法域名、隐私声明、用户权限、广告能力、分享能力和排行榜权限。
8. 完成开发者工具预览后，再进行测试账号和真机验收。

## 8. 发布前验收清单

- [ ] 两个平台均能取得登录 code，并由真实服务端换取业务会话。
- [ ] 首页 Banner 正确展示、隐藏和销毁，无安全区遮挡。
- [ ] 普通第一关无广告重试；第二至第五关完整播放才从本关重开；免费重开回第一关。
- [ ] 挑战广告体验仅获得一局资格；取消和失败不发资格，普通通关才永久解锁。
- [ ] 插屏符合启动限制和冷却，不阻断结算流程。
- [ ] 微信/抖音分享在真机回调符合预期，且不以唤起分享作为奖励条件。
- [ ] 新挑战纪录上传，开放数据域真实显示好友榜，关闭后资源正确回收。
- [ ] 六个正式音效均可播放，无背景音乐，静音状态重启后保持。
- [ ] 旧版 `LockMaster_ChallengeUnlocked` 数据能迁移，损坏存档能回退默认值。
- [ ] 正式切图、动画、音频、水印和素材授权全部复核。
- [ ] 两个平台分别完成弱网、切后台、拒绝权限、广告无填充及真机回归。

## 9. 当前外部阻塞项

以下内容仍没有可靠输入，因此未在仓库中伪造：广告位 ID、抖音 AppID、抖音分享模板 ID、AppSecret、登录换票后端、排行榜权限与开放数据域构建配置。微信构建已取得本机 Creator 保存的 AppID，但发布方仍需确认其归属。微信/抖音开发者工具和真机验证必须在相应工具与测试账号可用后执行。

## 官方参考

- [微信小游戏激励视频广告](https://developers.weixin.qq.com/minigame/dev/api/ad/wx.createRewardedVideoAd.html)
- [微信小游戏好友排行榜](https://developers.weixin.qq.com/minigame/dev/guide/open-ability/ranklist.html)
- [微信小游戏开放数据域](https://developers.weixin.qq.com/minigame/dev/guide/game-engine/unity-webgl-transform/Design/OpenData.html)
- [抖音小游戏激励视频广告](https://developer.open-douyin.com/docs/resource/zh-CN/mini-game/develop/api/javascript-api/ads/rewarded-video-ad/videoAdNotice)
- [抖音小游戏插屏广告规则](https://developer.open-douyin.com/docs/resource/zh-CN/mini-game/develop/open-capacity/ads/interstitial-ad/interstitial-ad-notice)
- [抖音小游戏分享](https://developer.open-douyin.com/docs/resource/zh-CN/mini-game/develop/api/javascript-api/open-capacity/retweet/tt-share-app-message)
- [Cocos Creator 发布抖音小游戏](https://docs.cocos.com/creator/4.0/manual/zh/editor/publish/publish-bytedance-mini-game.html)

以上平台资料均按项目接入场景重新表述；Content was rephrased for compliance with licensing restrictions.
