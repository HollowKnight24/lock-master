# Cocos Hierarchy 场景调试说明

已搭建在项目 D:\cocos\minigame1.0 的 assets/scene.scene 中，包含五关可编辑模板。
正式美术直接绑定 SpriteFrame，编辑器中无需运行游戏即可看到布局。五个关卡资源也已完成搭建。

## 打开与预览

1. 在 Creator 的 Assets 面板双击 assets/scene.scene。当前旧窗口标题若仍是 Untitled，说明尚未打开这个实际场景。
2. 在 Hierarchy 选择 Canvas/EditorPreview_Control。
3. Inspector 的 ScenePreview 组件中，previewPage 可切换首页、模式选择、第一至第五关、结算、排行榜。
4. debugStartLevel 是实际游戏调试入口：选择第一至第五关后保存场景，点击 Creator 顶部游戏预览，会直接开始该普通关卡。发布前恢复“正常首页”（当前交付默认值）。
5. 页面预览只影响编辑器显示。正常游戏启动会隐藏模板、恢复首页，不会把编辑器页面预览带入发布版本。

## 节点结构与编辑位置

- Canvas/__ProductionBackground：地牢背景。
- Canvas/UIRoot/MainMenuUI：Logo、角色、开始／排行榜／分享按钮。
- Canvas/UIRoot/ModeSelectUI：模式面板、模式按钮、锁定标识。
- Canvas/UIRoot/GamePlayUI：时间、分数、关卡名、提示、角色、开锁／加速按钮、反馈节点。
- Canvas/UIRoot/GameOverUI：结算面板、结果角色、标题和全部结算按钮。
- Canvas/UIRoot/RankListUI：排行榜面板、ScrollView 与行模板。
- Canvas/LevelTemplates 下包含 TrackVertical、TrackHalfCircle、TrackS、TrackDiamond、TrackFullCircle 五关正式可编辑模板。
- Canvas/LockManager_Node/TrackContainer：游戏运行时当前关卡实例。
- assets/prefabs 下的五个 Track Prefab：完成美术搭建的备用关卡资源。

运行时 LockManager 优先复制 LevelTemplates 中所选关卡。因此修改场景模板中的锁体、指针、高亮尺寸／位置后，保存即可在游戏中看到效果；不会被动态美术脚本覆盖。场景模板是独立可编辑节点，不是与外部 Prefab 双向同步的实例。若想改运行效果，优先改 LevelTemplates；外部 Prefab 用于备用／后续重用。

调整锁体：LockBackground_Art/__LockArt。
调整指针外观：Pointer_Linear 或 Pointer_Rotation 下的 __Needle。
高亮位于 Zone_Linear 或 Zone_Rotation，自带 ProductionZone，运行时按规则切换黄／蓝贴图。

请优先调整装饰子节点。规则节点的原点、大小及旋转会影响判定。尤其第一关 Zone_Linear 为 172×76，旋转关高亮使用 RADIAL FILLED Sprite（中心 0.5、0.5）；不要为了移美术而无意改变玩法判定。

## 布局与事件

VisualTheme.editorAuthored 已开启：不会在运行时重建／重排整套美术。
ProductionButton.editorAuthored 已开启：按钮、图标、文字的初始布局按编辑器保存值。
结算按钮保留 autoReflowResult：隐藏不支持的分享／复活或不适用的下一关后，自动紧凑排列。若需要手动调整结算按钮 Y 位置，关闭其 ProductionButton.autoReflowResult。
分享按钮已经保存到场景并绑定点击事件，不再依赖克隆创建。真实平台能力仍会控制是否显示。

冻结时间、分数、复活、难度、指针速度等参数未调。编辑器里的时间／分数只是占位文字，实际预览依然读取现有 GameConfig。

## 备份与验证

修改前的场景和三个 Prefab 位于 scene-backups/20260913-before-hierarchy（项目 assets 外，不参与导入）。
可执行：
- node tools/verify-editor-scene.mjs：检查引用、层级、素材 UUID、脚本类型及正常首页默认启动。
- node tools/test-scene-preview.mjs：检查九页编辑预览和五个直接调试关卡的分支。
- Creator Web Mobile debug 构建已通过；浏览器实际检查首页、五关和结算，运行错误日志为空。
- TypeScript --noEmit --skipLibCheck 检查通过。skipLibCheck 用来排除引擎本身的声明文件问题。

tools/author-editor-scene.mjs 是一次性搭建工具：发现已搭建场景会拒绝重写，避免覆盖后续人工调整。不要重新运行以“刷新”场景。

当前 Windows computer-use 截图接口返回 SetIsBorderRequired / E_NOINTERFACE，未能自动操作 Creator 窗口打开场景。场景文件、预制体、引用和构建均已独立完成验证，请按上述第 1 步打开。
