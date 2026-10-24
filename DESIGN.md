---
name: "未读，凌晨四点"
description: "全屏夜景、轻 HUD 与底部渐变对白构成的原创 galgame 阅读界面。"
colors:
  ink: "#14151b"
  plum: "#222029"
  surface: "#2b2831"
  paper: "#f0edf0"
  muted: "#bdb6c2"
  pink: "#dda0b7"
  line: "#57505e"
  sage: "#bacbc1"
  blue: "#b9c8f0"
  gold: "#e3c299"
typography:
  display:
    fontFamily: '"Story Serif","Noto Serif SC",serif'
    fontSize: "clamp(52px,6.9vw,96px)"
    fontWeight: 500
    lineHeight: 1.35
    letterSpacing: ".025em"
  headline:
    fontFamily: '"Story Serif","Noto Serif SC",serif'
    fontSize: "14px"
    fontWeight: 500
    lineHeight: 1.7
    letterSpacing: ".08em"
  title:
    fontFamily: '"Story Serif","Noto Serif SC",serif'
    fontSize: "23px"
    fontWeight: 500
  body:
    fontFamily: '"Noto Sans SC","Microsoft YaHei","PingFang SC",sans-serif'
    fontSize: "14px"
    lineHeight: 1.65
  dialogue:
    fontFamily: '"Noto Sans SC","Microsoft YaHei","PingFang SC",sans-serif'
    fontSize: "var(--reader-size,20px)"
    lineHeight: 1.9
    letterSpacing: ".035em"
  label:
    fontFamily: '"Noto Sans SC","Microsoft YaHei","PingFang SC",sans-serif'
    fontSize: "11px"
rounded:
  flat: "0"
  control: "2px"
  radius: "3px"
spacing:
  compact: "8px"
  control-gap: "12px"
  standard: "24px"
  dialogue-gap: "28px"
components:
  button-primary:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "12px 24px"
  button-primary-hover:
    backgroundColor: "{colors.pink}"
  button-secondary:
    backgroundColor: "#25232be6"
    textColor: "{colors.paper}"
    rounded: "{rounded.control}"
    padding: "12px 22px"
  button-small:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.paper}"
    rounded: "{rounded.control}"
    padding: "7px 14px"
  icon-button:
    backgroundColor: "transparent"
    textColor: "{colors.paper}"
    rounded: "{rounded.control}"
    height: "44px"
    width: "44px"
  title-navigation:
    backgroundColor: "transparent"
    textColor: "{colors.muted}"
    padding: "10px 5px"
  hud-toggle:
    backgroundColor: "transparent"
    textColor: "{colors.paper}"
    padding: "8px 12px"
  story-choice:
    backgroundColor: "#19191fe8"
    textColor: "{colors.paper}"
    rounded: "{rounded.flat}"
    padding: "16px 42px"
  story-choice-hover:
    backgroundColor: "#41313edb"
  dialogue-region:
    textColor: "{colors.paper}"
    typography: "{typography.dialogue}"
    rounded: "{rounded.flat}"
    padding: "47px 8vw 58px"
  modal:
    backgroundColor: "#18191feF"
    textColor: "{colors.paper}"
    rounded: "{rounded.radius}"
    width: "min(840px,calc(100vw - 32px))"
  checkpoint-chip:
    backgroundColor: "{colors.plum}"
    textColor: "{colors.paper}"
    rounded: "{rounded.control}"
    padding: "8px 13px"
  settings-range:
    width: "170px"
  art-navigation:
    backgroundColor: "transparent"
    textColor: "{colors.muted}"
    gap: "24px"
  wardrobe-frame:
    backgroundColor: "{colors.plum}"
    height: "min(64svh,560px)"
    rounded: "{rounded.flat}"
  memory-item:
    backgroundColor: "{colors.plum}"
    textColor: "{colors.paper}"
    rounded: "{rounded.flat}"
    padding: "0"
  cg-frame:
    backgroundColor: "{colors.ink}"
    width: "100%"
  phone-photo:
    backgroundColor: "#e8e3e1"
    padding: "12px 12px 34px"
---

# Design System: 未读，凌晨四点

## Overview

**Creative North Star: "夜场中的临场抉择"**

阅读舞台覆盖整个视口，操作悬浮在边缘，底部暗色渐变承载对白。炭黑与深梅紫保持夜间叙事氛围，纸白文字承担阅读，淡樱粉只在操作反馈、细刻线和故事状态中出现。轻 HUD 与平直长条选项让界面服从场景和决定。

本文从 v1.1 的 CSS 与 HTML 提取，取代旧版网页侧栏、圆角对白卡片和未读纸片系统。用户提供的参考确定全屏场景、顶部操作与底部对白之间的结构关系；配色、字体和 SVG 控件由本项目实现，不复制参考人物、标识或美术资产。方向与交付范围见 [surface-brief.md](docs/surface-brief.md)。

本轮在原界面中接入已认可的纯日系二维美术，媒体清单登记 16 张背景、17 套透明衣装立绘与 12 张 CG。色彩、字体、阅读版式与既有方向保持；只扩展现有弹窗中的衣装浏览、阅读解锁回忆和特定手机照片呈现，不重抽设计方向，也不把历史未采纳试图当作当前素材。

**Key Characteristics:**

- 炭黑与梅紫构成全屏舞台，纸白负责阅读，樱粉提供局部反馈。
- 宋体书名与叙事标题，黑体对白与操作控件。
- 顶部轻 HUD、底部无卡片渐变对白、中央长条选项。
- 平直边框、细线刻痕和少量小圆角。
- 标题与阅读分离；暂停时再进入设置、存档和收集。
- 原创日系二维角色随场景换装；CG 和人物的出场时机服从对白，回忆隐藏未读画面。

## Colors

前置令牌沿用源码名称和原始 CSS 色值。

### Primary

- **纸白 / paper**：对白、主要标签及主按钮底色；主按钮采用炭黑文字。
- **淡樱粉 / pink**：悬停、焦点、选择刻线、当前分支与坏结局标记。主按钮悬停从纸白变为粉色。

### Secondary

- **鼠尾草 / sage**：好结局标记与人物身份提示。
- **信纸金 / gold**：中性结局与回看中的已选行动。
- **远信浅蓝 / blue**：人物身份色的既有调色资源，不能据此新增操作状态。
- 说话人的实际颜色由故事数据提供；人物身份色不自动成为按钮配色。

### Neutral

- **炭黑 / ink**：页面与舞台基底。
- **深梅紫 / plum**：分支节点、人物字形占位。
- **浮层梅紫 / surface**：紧凑按钮和局部表单控件。
- **雾紫 / muted**：章节、时间、句序号、工具和说明文字。
- **紫灰细线 / line**：弹窗、记录分隔与次级操作描边。
- 对白使用从透明到近黑的底部渐变，选项使用高不透明度的独立暗色长条；精确渐变与描边在 sidecar 组件中保存。

**The Readable Stage Rule.** 背景与 CG 变化时保留底部对白渐变与文字阴影；阅读态背景只加轻遮罩，保持正文、说话人和选择的阅读层级。

## Typography

**Display Font:** Story Serif，后备为 Noto Serif SC 与通用衬线体。  
**Body Font:** Noto Sans SC、Microsoft YaHei、PingFang SC 与通用无衬线体。

Story Serif 是本地分发的 Noto Serif SC 可变字重子集，当前文件为 466,084 字节，许可为 SIL OFL 1.1。字体从本地加载；来源、许可和字形更新流程见 [FONTS.md](docs/FONTS.md)。

- **Display**：前置 display 用于书名；≤1000px 时改为 clamp(48px,7vw,80px)，≤650px 时为 clamp(44px,11.5vw,65px)。
- **Headline**：章节名保持低对比小宋体；手机缩至 13px，横屏高度不足时隐藏这一整组章节元信息。
- **Title**：弹窗标题采用前置 title；手机为 21px。
- **Body**：常规说明与操作采用前置 body。
- **Dialogue**：最大行长 64ch。字号通过 --reader-size 接受玩家设置；前置令牌中的值是 CSS 后备值，不能覆盖实际设置。手机行高为 1.85，短横屏为 1.65。
- **Speaker**：说话人桌面为 20px、中小屏为 17px，保持单行。
- **Label**：辅助信息为 11px；时钟和序号使用等宽数字。

**The Two Voices Rule.** 宋体承载书名和叙事标题，连续对白与交互标签使用黑体。

## Layout

舞台高度与最小高度均为 100svh，阅读状态没有常驻网页侧栏。标题态的书名和短对白位于左侧，游戏菜单悬浮在右侧；进入阅读后隐藏标题顶栏和菜单，切换到顶部 HUD。标题态的隐藏开始按钮不是可见入口，主入口由游戏菜单提供。

阅读 HUD 横跨顶部：左侧菜单、设置、回看和隐藏，右侧自动与已读跳过。章节和时间位于 HUD 下方。桌面对白在底部横跨舞台，使用 115px 说话人列与可伸缩正文列，列间距 28px。底部另有轻量音乐、快存、快读和全屏工具。

中央选项纵向排列为横向长条，桌面宽度 min(860px,73vw)、间距 14px。选项组有独立最大高度与滚动，选项不收缩，确保全部行动可达。发生溢出时，独立滚动提示以 11px 字号、20px 行高显示选项总数和向下或向上滚动的方向；桌面及竖屏未溢出时隐藏提示，H 隐藏界面时同步隐藏。

- **≥1700px**：对白边距增加，选项宽度扩至 min(1000px,70vw)。
- **≤1000px**：对白说话人列缩至 94px，选项宽度为 82vw。
- **≤650px**：标题菜单改为书名下方的双列按钮；标题舞台最小高度 740px。阅读对白改为上下结构，说话人与句序号同排、正文在下；选项宽度为视口减 36px。
- **≤350px**：进一步压缩 HUD、标题菜单和对白边距，保留文字操作名称。
- **高度≤560px 且宽度≥651px**：隐藏章节组；对白压低并限制字号；选项从顶部 58px 处开始，最大高度为视口减 260px，独立滚动，隐藏选项辅助说明。
- **弹窗**：最大高度 88svh，标题在滚动顶部；存档与结局列表桌面双列、手机单列。

前置 spacing 记录重复使用的真实尺寸，不构成强制等步长网格。`media.json` 现映射 production 背景、透明人物衣装与 CG；`visuals.js` 依照从 0 开始、包含两端的对白区间 cue 切换。CG 占据背景舞台时隐藏重复人物；远程说话人不出现在现场，特定手机照片另以照片形式呈现。图片缺席时仍有源码色面作为回退。

背景焦点通过应用写入的 `--scene-focus` 交给 CSS 的 `background-position` 使用。宽度 ≤650px 且舞台正在显示 CG 时，背景按 `--cg-mobile-size` 与 `--cg-mobile-position` 设置尺寸和位置，默认 `auto 72svh`、`50% top`，不重复铺图，空余区域使用炭黑。窗外凌晨画面横向定位为 `68% top`；信封与离站画面采用 `100% auto`、`center 22%`，保留宽幅全图及关键物件。普通背景仍使用既有 `cover`；完整 CG 弹窗继续使用 `contain`。

## Elevation & Depth

阅读界面靠遮罩与渐变分层。顶部 HUD 有向下消退的暗色渐变，底部对白向上融入场景；对白无外边框、圆角或盒阴影。阅读态背景使用轻遮罩，保留美术细节，文字仍由自己的底部渐变与阴影承载。选项靠细线和暗底建立边界。透明角色带轻微投影；特定手机照片用浅纸色衬边、-3deg 倾角与独立阴影表达画中画，不能误作现场人物。原生弹窗与提示条沿用既有投影。

图标按钮以 .18s 变化底色和文字；标题菜单以 .2s 变化文字、图标透明度及水平位移；选项以 .2s 变化底色和边线。减少动态效果时关闭 CSS 过渡、动画与雨幕。

**The Unboxed Dialogue Rule.** 对白融入全屏场景的底部渐变，不还原成网页卡片或带边框的独立面板。

## Shapes

对白与选项保持直角；选项左侧有短粉色刻线，右下有纸白细线。通用按钮、图标按钮、分支节点使用 2px 小圆角，弹窗使用 3px。常规线宽为 1px，键盘焦点为粉色 2px 外轮廓，外移 5px。

图标为自有内联 SVG：无填充、1.6 描边、圆端点与圆连接。图标常态尺寸 22px，按 HUD 和标题菜单用途缩放。

## Components

### Buttons

主按钮采用纸白底炭黑字，悬停为粉底；次级按钮为暗底细线，悬停改变边线。两者至少 48px 高。紧凑按钮至少 38px 高。禁用状态为 .35 不透明度，并保留原生禁用语义。

### Navigation

标题菜单使用无容器、透明底的大文字行。桌面悬停与当前项向右移动 6px，同时显示粉色线描图标；手机图标常态可见，菜单改为双列。阅读期间通过暂停菜单访问存读档、分支记录和收集。

### Reading HUD

顶部左侧为图标操作，右侧为文字开关。自动与跳过保留 aria-pressed，自动旁显示 ON/OFF。H 隐藏界面，L 打开回看，Esc 打开暂停；隐藏后提供独立恢复按钮。底部工具不设实色工具栏。

### Story Choices

行动按钮居中对齐，编号位于左侧，辅助说明另起一行。悬停变亮并使用粉色边线。长条选项纵向堆叠，独立滚动；短横屏不显示辅助说明。状态不能只靠颜色传达。

### Dialogue Region

桌面说话人位于正文左侧，手机移到正文上方。正文使用轻微文字阴影；句序号、已读状态和继续按钮作为辅助信息。继续按钮带粉色三角标记，屏幕阅读器通过完整句子的状态区域得到更新。

### Modal / Records

暂停、设置和存读档使用同一原生弹窗。弹窗有细边框、暗色遮罩和固定在滚动顶部的标题。记录列表以细线分隔；人物图片缺席时显示姓名末字。结局类型保留文字，并辅以好结局鼠尾草色、中性金色、坏结局粉色。

### Character Wardrobes / Scene Memories

人物入口内的“人物衣装”和“场景回忆”共用透明文字导航、紫灰下分隔线与粉色当前态，保留 `aria-pressed`。人物列表使用实际角色缩略图；衣装页桌面为图像与说明双列、间距 28px，图像置于无圆角的深梅紫容器并用 `contain` 保留完整轮廓。衣装选择沿用紧凑按钮，当前项为纸白底炭黑字；五人共 17 套衣装，支持查看原图。手机衣装页使用纵向 flex、间距 16px，说明容器采用 `display:contents`：衣装按钮组置顶（order 0），接着标题（1）、说明（2）、人物图（3）和原图链接（4）；隐藏年龄行，便于先切换再看图。人物图保持宽度 100%、高度 `min(54svh,440px)`。

场景回忆桌面双列、手机单列，使用直角 16:9 缩略图与短标题。未读项目仅显示锁定占位，不加载其剧透缩略图；读到对应 cue 后由现有已读记录推导解锁，不另建存档版本。完整 CG 在宽至 1240px 的同式弹窗中用 `contain` 显示，避免把舞台裁切当成原图；可返回列表或查看原图。正文舞台的 H 隐藏功能继续可用，便于查看可能处于对白区后方的桌面物件。

### Checkpoint Chips

已读节点可重读，当前节点以粉字粉线标记；未读节点禁用并采用虚线边框和通用位置名称。状态与实际保存的阅读检查点一致。

### Inputs / Fields

设置使用原生范围滑块与复选框，强调色为粉色。滑块关联标签及数值，桌面宽 170px、最多占行宽 45%，手机宽 120px。当前没有可见的自由文本输入。

## Do's and Don'ts

### Do:

- **Do** 保持全屏舞台、顶部轻 HUD 与底部渐变对白的关系。
- **Do** 使用宋体标题、黑体对白与可调整的阅读字号。
- **Do** 让全部选项可达，并在短横屏启用选项组独立滚动。
- **Do** 为图标操作保留可访问名称，为开关保留文字和状态。
- **Do** 遵守隐藏界面、恢复操作与减少动态效果偏好。
- **Do** 为新增宋体字形更新本地字体子集并保留许可。
- **Do** 依据当前对白 cue 展示背景、衣装、照片与 CG，保留阅读遮罩和完整图查看方式。

### Don't:

- **Don't** 将阅读界面恢复为网页侧栏或圆角对白卡片。
- **Don't** 复制参考作品的人物、标识或美术资产。
- **Don't** 用标题页菜单遮挡阅读中的场景与对白。
- **Don't** 将未交付的场景图片或立绘描述为现有资产。
- **Don't** 用裁切或收缩选项掩盖小屏空间不足。
- **Don't** 提前暴露未读回忆，或在已经包含人物的 CG 上重复叠加现场立绘。



## 2026-10-24 阅读沉浸修订（覆盖前文旧显示规则）

用户要求移除阅读中的额外元信息。章节、场景标题、时钟、句数、已读状态和左下状态均隐藏；其数据仅供菜单与存档使用。旁白不显示说话人行，正文占据对白区完整列宽；角色台词仍显示姓名。操作按钮留在边缘，继续按钮靠右。餐桌段落采用完整坐姿 CG，不在桌面背景上叠加全身站立人物。
