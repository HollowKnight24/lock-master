# 新美术提示词规格集

## 2026-09-13 第一关美术统一

第一关指针改为与第二、三关完全相同的铜金箭头贴图（pointer_linear 是 pointer_radial 的导出别名），尺寸 128×448，UI 显示 80×280，旋转为向右。只改装饰子节点，移动节点与判定节点不变。

直线黄／蓝高亮改为与黄／蓝圆环一致的亮色锁芯材质、细白高光、同色描边及紧凑发光。真实 RGBA 母稿通过内置 imagegen 生成并检查透明通道；运行时均导出 384×128。原始直线按钮式高亮不再使用。ZoneLinear 200×76 与游戏设置保持原样。

### 直线黄色母稿（生成与透明提取）

Use case: stylized-concept. Asset type: production-ready transparent 2D game sprite, straight lock timing highlight. Input images: Image 1 yellow circular highlight style reference; Image 2 blue circular highlight style reference. Primary request: create the STRAIGHT horizontal equivalent of the YELLOW ring only, matching its luminous golden-yellow material, orange bevel, white-hot edge strips, and restrained compact glow exactly. Shape: one solid horizontal rounded rectangular luminous bar, roughly 4:1 width-to-height, no hole. Orthographic front view. Two fine bright white-yellow highlights along the long top and bottom edges. Smooth orange-gold bevel, yellow glowing central surface, subtle glossy reflections like reference. Center sprite on a genuinely TRANSPARENT alpha background with generous empty margin; all glow compact and contained near silhouette. No panel housing, no rivets, no diamonds, no ornamental frame, no text, no scene, no checkerboard or black pixels as background, no multiple variants. This is not a UI button: only a straight glowing target segment consistent with ring material. Preserve actual PNG transparency.

Use case: background-extraction. Image 1 is the edit target: the yellow straight glowing bar just generated. Remove the entire baked gray checkerboard background and any gray background haze. Deliver the exact same yellow glowing bar silhouette, bevel, color, and white highlights as a clean isolated PNG cutout on a genuinely transparent ALPHA channel. Do NOT draw a checkerboard transparency visualization, do NOT substitute black or white background. Empty pixels must actually be transparent. Keep compact yellow glow immediately around the bar only. Preserve the bar without redesign. No additional objects or text.

Selected source: exec-2a12e5e1-d101-423e-a204-95f57756e8d3.png

### 直线蓝色母稿（变体与透明提取）

Use case: precise-object-edit. Input image 1 edit target: isolated yellow straight lock highlight. Change ONLY yellow/orange material to the electric cyan BLUE material of the game's blue circular timing ring: cyan-blue bevel, vivid blue central surface, thin white-hot cyan edge strips and matching compact cyan glow. Keep the EXACT same horizontal bar shape, cap curvature, silhouette, dimensions, composition, edge highlight layout and transparency. Actual transparent ALPHA background, empty pixels transparent; do not paint black, white or checkerboard background. No extra objects, frames, rivets, text or ornaments. This is the matching blue variant of this same production sprite.

Use case: background-extraction. Image 1 is edit target, blue glowing horizontal bar on baked gray checkerboard. Remove ALL baked gray checkerboard and background haze. Deliver this exact same blue bar as a genuinely transparent PNG cutout with actual ALPHA channel, empty pixels A=0. Preserve silhouette, electric cyan-blue bevel, white-hot highlights and compact glow without redesign. Do not draw checkerboard transparency visualization or black/white matte. No extra elements or text.

Selected source: exec-667a3f86-8a8d-4e79-a06f-4e19e330d10a.png


方式：imagegen 内置图片生成。下列是选用母稿的生产规格归纳；并非所有失败迭代的逐字日志。各源 PNG 的实际文件名和裁切区域见 asset-manifest.json。未使用旧 49 张 PNG。

共同要求：friendly polished handpainted cartoon dungeon mobile game；蓝灰石墙与暖棕岩洞；暖橙铜锁；紫色大耳锁匠、金色眼睛、橙色兜帽/围巾、银色扳手；粗细统一的深棕轮廓与柔和高光。除 Logo 外不烘焙文字，无水印。精灵要求真实 RGBA 和清楚透明边界；背景/分享封面是完整场景。

- 地牢背景：portrait 9:16 cave dungeon, two amber lanterns and treasure chest, clear central negative space for game UI, no characters or text.
- 待机角色：same purple large-eared locksmith mascot, full body, welcome wave, silver wrench; isolated transparent sprite.
- 结果角色：same identity/outfit, celebrate pose and worried drooping-ear pose, separately isolated.
- 锁体：three front-view round copper padlocks, same proportions/materials, vertical groove / upper semicircular groove / full annular groove; no built-in pointers, highlights or UI text.
- Logo：verbatim Chinese “撬锁大师”, chunky gold-orange lettering, copper lock crest, purple underline and matching mascot accent, transparent.
- 图标：play, rank, share, normal, challenge; close, home, restart, next, revive; unlock, speed, time, score, locked. Handpainted bevel copper/gold, no text, isolated.
- 黄蓝圆环：centered complete annulus, hollow transparent center, yellow-gold / cyan-blue variants, game radial-fill texture, no pointer or background.
- 分享封面：5:4 landscape, same mascot and copper lock in friendly lantern-lit dungeon; no baked title or stats.

## 本次选用补充母稿的提示词

### QTE 指针与直线区域

Production 2D game sprite sheet, actual RGBA transparent background. Four distinct clean isolated QTE assets in 2x2 grid with generous empty transparent gutters: top left slim copper-gold vertical needle with rounded white tip; top right copper tapered clock hand pointing straight up with round pivot at bottom; bottom left short wide yellow-gold rounded target bar; bottom right identical cyan-blue rounded target bar. Handpainted polished casual dungeon mobile game, crisp dark copper outlines, bevelled warm metal, white specular glints. Absolutely NO external glow, NO bloom, NO haze, NO shadows outside objects. Object edge bounded opacity only. Genuine transparent alpha background, no colored wash, no checkerboard drawn. Textless.

### 按钮

Four separate horizontally wide rounded rectangular button cutouts in vertical column with generous transparent gutters. Top orange-gold, second cyan-blue, third steel gray, fourth coral red. Each button thick dark copper metal outline, warm bevel highlights, rivet at each short side, painted smooth glossy colored inset. Casual friendly dungeon locksmith mobile game. No external glow or background lighting or atmospheric haze, no backdrop, no checkerboard. Alpha=0 outside button silhouettes. No text/icons. Identical geometry.

### 木质面板

Single ornate round copper-framed wooden panel with padlock shackle on top and small circular gear badge. Friendly polished handpainted cartoon dungeon mobile game art: chunky orange-copper bevel rim, warm brown wood plank interior, curled small corner flourishes, round rivets, crisp dark-brown outlines, soft painted highlights. Direct front view symmetrical. Large solid wood center for dynamic text/buttons, no text. Genuine RGBA transparent background; empty shackle arch transparent. No haze, glow, bloom, external drop shadow or scene.

### 羊皮纸排行榜

Single cartoon dungeon leaderboard panel. Front view symmetrical: copper-gold padlock shackle above a wide blank wooden title plaque, two warm wood side doors open outward with copper edging, central large cream parchment rolled at bottom. Chunky handpainted friendly mobile game UI style, orange copper highlights, crisp dark brown contours, round rivets and curled decoration. Central parchment blank; no baked rows/text. Genuine RGBA alpha transparent background. Empty spaces alpha 0. No haze, glow, external cast shadow, scene or checkerboard.

### 命中与失误

Exactly two isolated objects side by side on actual RGBA transparent background. Left: bright gold-white four-point success sparkle with 3 tiny gold diamond shards. Right: coral-red angular failure impact burst with white-hot small center and 3 red diamond shards. Friendly polished handpainted cartoon dungeon game, crisp high-contrast contours, clean readable silhouettes, textless. No external glow, haze, wash, smoke, bloom, backdrop or painted checkerboard. Empty space including between shards alpha=0. Generous gutters.
