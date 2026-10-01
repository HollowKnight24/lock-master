# 《撬锁大师》生产美术资源规格

## 1. 生产边界

- 设计分辨率：`1080 × 1920`，竖屏，Creator 项目采用 `fitHeight`。
- 概念稿只用于机制、信息层级和“暖色洞穴中的精密开锁台”氛围参考；不裁切、不去水印、不采样原像素、不描摹角色或现成图标。
- 所有交付图形由本项目的可重复生成脚本原创绘制；生成脚本与导出清单作为源资产一并保留。
- `LEVEL`、时间、积分、按钮文案、排行、结算与机制说明继续由 Cocos `Label` 渲染。图片中不得烘焙动态文字；Logo 图片只包含锁形徽章和装饰底板，标题文字仍由 Label 叠加。
- PNG 使用 sRGB、8-bit RGBA、直通 Alpha（straight alpha）。除全屏背景外，透明区域 RGB 必须清零，避免图集边缘脏色。

## 2. 坐标、安全区与透明边界

- 主内容安全区：设计坐标 `x = 54…1026`、`y = 72…1848`；标题/HUD 不越过顶部 120 px，底部交互不越过底部 120 px。
- 可点击按钮视觉尺寸不小于 `360 × 94`，实际触摸区域不小于 `360 × 104`。
- 普通透明切图保留 8–16 px 透明边界；柔光、烟雾和火焰保留 24–40 px，以免图集裁切光晕。
- 锁体、角色、灯笼、宝箱锚点均为 `(0.5, 0.5)`；旋转指针节点锚点必须为 `(0.5, 0)`；线性指针为 `(0.5, 0.5)`。
- 九宫格资源禁止 trim 和 rotate；其他资源也统一禁用 rotate，以保证指针枢轴和版本差异下的确定性。

## 3. 资源清单

所有路径均相对于 `assets/art/production/`。

### 3.1 独立大图与装饰

| 文件 | 像素尺寸 | Alpha/边界 | 锚点 | 用途 |
| --- | ---: | --- | --- | --- |
| `background/bg_cave_workshop.png` | 1080×1920 | 全不透明 | 0.5,0.5 | 暖色洞穴、工作台、暗部留白；不含文字、角色或按钮 |
| `branding/logo_lock_master.png` | 760×280 | 四周 24 px，顶部光晕 36 px | 0.5,0.5 | 原创铜锁徽章与标题底板；标题由 Label 绘制 |
| `decor/decor_lantern.png` | 240×360 | 火焰光晕 32 px | 0.5,0.5 | 左侧暖光层，可复用 |
| `decor/decor_clockwork_helper.png` | 380×560 | 轮廓 16 px | 0.5,0.5 | 原创发条机械助手，不复刻概念稿角色 |
| `decor/decor_treasure_chest.png` | 360×280 | 轮廓 16 px | 0.5,0.5 | 右下装饰，可复用 |
| `sharing/share_card.png` | 1080×864 | 全不透明 | 0.5,0.5 | 平台分享图；仅含徽章与洞穴场景，不含实时分数 |

全屏背景与分享图不进入图集。三个装饰物可进入 `decor` 图集。

### 3.2 九宫格面板

| 文件 | 像素尺寸 | 九宫格 border（L/R/T/B） | 建议显示范围 |
| --- | ---: | --- | --- |
| `ui-atlas/panel_copper_9s.png` | 256×256 | 72/72/72/72 | 520×260 至 960×1400 |
| `ui-atlas/panel_stone_9s.png` | 256×256 | 64/64/64/64 | 420×220 至 900×1200 |
| `ui-atlas/hud_cell_9s.png` | 320×128 | 56/56/40/40 | 320×112 至 460×148 |
| `ui-atlas/feedback_yellow_9s.png` | 320×112 | 48/48/32/32 | 300×104 至 520×132 |
| `ui-atlas/feedback_blue_9s.png` | 320×112 | 48/48/32/32 | 300×104 至 520×132 |
| `ui-atlas/feedback_red_9s.png` | 320×112 | 48/48/32/32 | 300×104 至 520×132 |

九宫格边框必须落在不重复的角件/描边之外；中心区域只保留可平铺的低频纹理。

### 3.3 按钮状态

按钮源图统一为 `384×128`，九宫格 border 为 `60/60/42/42`。每个状态几何轮廓完全一致：

- `ui-atlas/btn_copper_normal.png`
- `ui-atlas/btn_copper_pressed.png`
- `ui-atlas/btn_copper_disabled.png`
- `ui-atlas/btn_steel_normal.png`
- `ui-atlas/btn_steel_pressed.png`
- `ui-atlas/btn_steel_disabled.png`
- `ui-atlas/btn_teal_normal.png`
- `ui-atlas/btn_teal_pressed.png`
- `ui-atlas/btn_teal_disabled.png`
- `ui-atlas/btn_red_normal.png`
- `ui-atlas/btn_red_pressed.png`
- `ui-atlas/btn_red_disabled.png`

状态规范：

- normal：顶部高光、完整外描边和 100% 明度。
- pressed：内容整体向下 5 px，内阴影增强，明度约 82%；不得只靠运行时缩放伪造。
- disabled：去饱和、对比度降低到约 55%，仍保持可辨识轮廓。
- hover 在移动端复用 normal；Button 继续使用 Sprite transition，并为 normal/pressed/disabled 分别绑定对应 SpriteFrame。

### 3.4 通用图标

下列图标均为 `128×128` RGBA，四周至少 12 px 透明边界，锚点 `(0.5,0.5)`，不含文字：

`icon_play`、`icon_rank`、`icon_share`、`icon_normal_mode`、`icon_challenge`、`icon_close`、`icon_home`、`icon_restart`、`icon_next`、`icon_revive`、`icon_unlock`、`icon_speed`、`icon_time`、`icon_score`、`icon_lock`。

文件位于 `ui-atlas/<name>.png`。图标使用浅金/象牙色主体、深棕内线，确保在铜、钢和青色按钮上均有足够对比度。

### 3.5 锁具、指针与判定区

| 文件 | 像素尺寸 | Alpha/边界 | 锚点/特殊要求 |
| --- | ---: | --- | --- |
| `gameplay-atlas/lock_vertical.png` | 520×840 | 16 px | 0.5,0.5；中间槽位透明/深色，视觉运动范围与 `-260…260` 对齐 |
| `gameplay-atlas/lock_half.png` | 720×720 | 16 px | 0.5,0.5；仅上半圆为主刻度，中心留透明锁芯 |
| `gameplay-atlas/lock_full.png` | 720×720 | 16 px | 0.5,0.5；完整 360° 刻度，中心留透明锁芯 |
| `gameplay-atlas/pointer_linear.png` | 280×72 | 8 px | 0.5,0.5；判定线中心清晰 |
| `gameplay-atlas/pointer_rotary.png` | 80×300 | 底部 8 px、其余 12 px | **节点锚点 0.5,0**；尖端朝本地 +Y，底端与 hub 重叠 |
| `gameplay-atlas/pointer_hub.png` | 120×120 | 8 px | 0.5,0.5 |
| `gameplay-atlas/zone_linear_yellow.png` | 256×96 | 8 px | 0.5,0.5；与 blue 版 Alpha 几何完全一致 |
| `gameplay-atlas/zone_linear_blue.png` | 256×96 | 8 px | 0.5,0.5；与 yellow 版 Alpha 几何完全一致 |
| `gameplay-atlas/zone_radial_yellow.png` | 512×512 | 8 px | 0.5,0.5；完整白底式环形 Alpha，经 FILLED/RADIAL 显示扇段 |
| `gameplay-atlas/zone_radial_blue.png` | 512×512 | 8 px | 0.5,0.5；与 yellow 版 Alpha 几何完全一致 |

接入合同：

- `Zone_Rotation` 必须保留 `Sprite.Type = FILLED`、`fillType = RADIAL`、`fillCenter = (0.5,0.5)`；禁止把判定扇区改成静态普通 Sprite。
- 黄色/蓝色状态应通过两个已导入 SpriteFrame 切换；若脚本使用 tint，必须把 tint 设为白色，避免色彩相乘失真。
- `Pointer_Rotation/Pointer_Art` 保留底部枢轴；`Pointer_Linear` 保留 `-260…260` 运动范围。
- 第一关 Zone 的实际高度继续由 `UITransform.height × abs(scale.y)` 提供给判定逻辑，不能用仅视觉子节点替代功能节点。

## 4. 图集规范

### `ui-common`

- 来源：`ui-atlas/` 下所有面板、按钮状态和图标，以及 `branding/logo_lock_master.png`。
- 最大尺寸：2048×2048；padding 4 px；extrude 2 px；禁用旋转；禁用九宫格资源 trim。
- 颜色格式：RGBA8888；构建阶段可由 Creator 针对目标平台压缩，源文件始终保留 PNG。

### `gameplay`

- 来源：`gameplay-atlas/` 下锁体、指针、hub、线性/径向 Zone。
- 最大尺寸：2048×2048；padding 4 px；extrude 2 px；禁用旋转；全部保留原始尺寸和透明边界。

### `decor`

- 来源：`decor/` 下灯笼、机械助手、宝箱。
- 最大尺寸：1024×1024；padding 4 px；extrude 2 px；禁用旋转，允许 trim，但必须保持 SpriteFrame 原始尺寸与 offset。

`background/` 与 `sharing/` 永不入图集。生成脚本输出 `atlas-manifest.json`，记录每个逻辑图集的成员、尺寸、SHA-256 与切片设置；Creator 的 Auto Atlas 或 SpriteAtlas 元数据必须由 Creator 3.8.8 实际导入生成，不手写 UUID。

## 5. Cocos 3.8.8 导入与引用规则

1. 将 PNG 放入 `assets/art/production/` 后，由 Creator 3.8.8 AssetDB 完整导入。
2. 验证每张 PNG 的 `.meta` 都包含 ImageAsset 根资源及 Texture2D/SpriteFrame 子资源；只使用 Creator 生成的 SpriteFrame UUID。
3. 九宫格 SpriteFrame 按本文件 border 数值设置，节点 Sprite 使用 `Type=SLICED`。
4. 按钮 Button 保持 `Transition=SPRITE`，绑定 normal/pressed/disabled；hover 复用 normal。
5. 场景和 Prefab 修改必须由 Creator 保存，禁止手工猜测或拼接 `@xxxx` 子资源 UUID。
6. 保留节点硬名称与脚本绑定：`OpenRankBtn`、`RestartBtn`、`TrackContainer`、`GlobalAudio_Node`、`Zone_Linear`、`Zone_Rotation`、`Pointer_Linear`、`Pointer_Rotation`、`Pointer_Art`。
7. `OpenRankBtn` 和 `RestartBtn` 仍可作为动态 `ShareBtn` 克隆源，但克隆后必须覆盖分享图标/按钮状态，不能继续显示排行或重开图标。

## 6. 验收标准

- PNG 头、尺寸、色型、Alpha 范围、透明边缘 RGB 和文件哈希均可由脚本复验。
- 除两个不透明大图外，每张 PNG 至少包含一个 Alpha=0 像素和一个 Alpha>0 像素；不允许“声明透明但实际全不透明”。
- 按钮三态同尺寸；同系列 Alpha 几何一致；pressed 的视觉位移在图内完成。
- 黄/蓝 Zone 同尺寸且 Alpha 几何一致；径向 Zone 在 5%、15%、50% fillRange 下无断裂。
- 图集中无旋转 SpriteFrame；九宫格拉伸到最大建议尺寸后，角件不变形。
- 冷启动后依次验证主菜单、模式选择、三关 HUD/锁具/Zone/指针、排行、结算、动态分享与广告按钮状态。
- 最终保留 `VisualTheme` 作为代码级安全回退，但生产模式不再创建其程序化屏幕、按钮或轨道绘制层。