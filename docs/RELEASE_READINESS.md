# 第四阶段：设备适配与发布准备

## 已完成的工程收口

- 设计基准保持为竖屏 1080x1920，并使用 fitHeight。
- SafeAreaLayout 会在运行时读取设备安全区域：顶部状态区保护倒计时、分数和关卡标题；底部手势区保护解锁与加速按钮；首页音效开关避开右侧异形屏区域。
- Canvas/LevelTemplates 保存五关编辑器模板；第三、第四关运行时使用 PathTrack 几何路径，其余关卡复制对应模板。
- 资源目录不再打包背景音乐，只保留六个交互音效。
- check-release-readiness.mjs 可重复检查竖屏基准、安全区接入、无背景音乐策略和资源包体预算。

## 发布前执行

在项目根目录执行：

    node tools/check-release-readiness.mjs
    node tools/test-presentation-feedback.mjs
    node tools/test-platform-integration.mjs
    node tools/test-gameplay-flow.mjs
    node tools/verify-editor-scene.mjs
    node tools/test-scene-preview.mjs
    node tools/verify-formal-art.mjs --cocos

随后使用 Cocos Creator 的构建面板分别完成 Web Mobile、微信小游戏和抖音小游戏构建。

## 仍需外部验证

- 在 16:9、19.5:9、20:9 和带异形屏安全区的真机上检查触摸、按钮可达性和横竖屏锁定。
- 填入微信和抖音的真实 AppID、广告位、分享素材配置，完成各自开发者工具和真机审核链路。
- 在目标机型上用性能面板确认首屏加载、内存峰值和帧率；本阶段的资源预算检查不能替代真机性能数据。
- 冻结时间、分数、复活和难度曲线仍按当前约定留待最终试玩调参。
