# 图像制作状态与本地环境记录

当前状态：**用户认可 v3 纯日系二维面部方向，并授权多代理完成服装、CG 与游戏接入。** `public/media.json` 的 `gpt-production-1` 清单登记 16 张背景、17 套透明衣装立绘、12 张 CG，共 45 张 PNG。实际游戏素材位于 `public/art/production`，按对白进度进入舞台、衣装浏览与场景回忆。本轮浏览器验证结果由 `docs/VERIFICATION.md` 记录；下方清单不代替测试结论。

用户提供的图片仅作为线条、明暗、发丝和服装细节的画风参考，不带入原人物的发色、面孔、角、尾巴、女仆装或奇幻服装。内置工具没有公开底层模型版本时，记录工具名而不推测具体版本。每张生产图的完整 prompt、参考用途、时间与实际工具保存在同名 `.png.json` sidecar。

标准设定、面部研究与衣装板保留在 `public/art/character-sheets`，作为设计过程记录。凛 sheet-v1 被指出过于温婉，sheet-v2 加强地雷系；用户随后指出全组面孔同质，又否定了偏欧美、半写实的结构研究。实际制作改用认可的 v3 面部方向；设定板不直接裁成运行立绘，未采纳版本不进入生产媒体清单。

本轮以二维眼型、眼距、眉形、眉眼距、中庭和下颌比例区分角色；保持简化的鼻部短线、口线与动画块面阴影，避免用写实鼻翼、丰厚唇部、凹陷眼窝、素描排线或西式骨相制造差异。v3 研究使用同样的柔光、素色上衣和空白背景，便于判断脸部；实际立绘与 CG 延续这些身份，三位女配再适度强化眼型与脸型差异，不将细微差别描述成完全消除同质感。

本轮采用的三组 v3 面部基准均由内置图像工具生成，实际传入原风格参考图并声明仅取画风，不复制人物设计。用户认可这个方向后授权制作实际游戏素材；面部基准本身作为设计参考保存：

| 角色 | 面部基准 | 完整提示词与参考记录 | 观察到的限制 |
| --- | --- | --- | --- |
| 凛 | [面部研究 v3](../public/art/character-sheets/rin-face-study-v3.png) | [生成记录](../public/art/character-sheets/rin-face-study-v3.png.json) | 回到日系二维与地雷系眼妆；下颌仍尖，表情变化较轻，鼻部高光略突出。 |
| 许砚 | [面部研究 v3](../public/art/character-sheets/xu-yan-face-study-v3.png) | [生成记录](../public/art/character-sheets/xu-yan-face-study-v3.png.json) | 鼻口与颈部阴影已简化；下颌偏柔，正面鼻影稍长，男性设计仍有常规美男特征。 |
| 七濑／栞／晚晴 | [六头像对照 v3](../public/art/character-sheets/supporting-face-study-v3.png) | [生成记录](../public/art/character-sheets/supporting-face-study-v3.png.json) | 杏圆眼、下垂细眼、半覆上挑眼已有差别；中性口线和下巴仍接近。 |

偏半写实的 face-lineup-v1、许砚 face-study-v2 与配角 face-study-v2 保留为未采纳的研究，不混入这轮候选。

最初本地 JPG 参考图未提取到可读的 Model/Model hash 生成字段，因此不能仅凭文件名确认由 tPonynai3_v7 生成。

## 生产素材清单

| 类型 | 数量 | 目录与用途 |
| --- | ---: | --- |
| 无人场景背景 | 16 | `public/art/production/backgrounds`：雨夜、居酒屋、车站、公寓、门口、便利店、清晨、咖啡馆、书店、国内住处、牛丼店，以及机场、洗手间、医院、打印店、仓库。 |
| 透明衣装立绘 | 17 | `public/art/production/portraits`：五位成年角色的独立服装图，保持身份一致，不从设定板裁切。 |
| 剧情 CG | 12 | `public/art/production/cgs`：窗外凌晨、追逐、枕上信封、摘口罩、隔轨离站、摄影棚、入冬画册、同桌晚饭、戴口罩的用餐，以及凛／七濑／栞各自的咖啡馆坐姿。 |

衣装映射使用下列键；`default` 只是同一素材的回退引用，不另计张数：

| 角色 | 套数 | `portraits` / `story.wardrobes` 衣装键 |
| --- | ---: | --- |
| 许砚 | 3 | `work`、`interview`、`home` |
| 黑濑凛 | 5 | `work`、`casual`、`night-visit`、`soft-knit`、`borrowed-jacket` |
| 日向七濑 | 3 | `work`、`casual`、`studio` |
| 雨宫栞 | 3 | `work`、`casual`、`bookshop` |
| 林晚晴 | 3 | `office`、`casual`、`date` |

CG 的媒体 ID 为 `dinner-masked`、`rin-cafe`、`nana-cafe`、`shiori-cafe`、`window`、`chase`、`envelope`、`dinner`、`departure`、`nana-studio`、`shiori-bookshop`、`qing-home`。全部成年人衣服完整；紧张场面通过行为、距离、视点和环境呈现。信封 CG 的小瓶只呈现密封的暗酒红液体，不确认成分；晚晴晚饭是两碗无葱面。

CG 实际输出约为 1672×940/941 RGB PNG；画面下部留自然环境供对白使用，部分桌面物件仍位于较低位置，可用 H 隐藏界面或在场景回忆查看完整图。背景与立绘的实际尺寸、生成提示和自检限制见各自 sidecar，不把工具未公开的底层模型版本写成确定信息。

## 运行时出场与回忆

`public/visuals.js` 根据 `public/media.json` 的 `scenes` 读取逐句 cue。`from`、`to` 是从 0 开始、包含两端的对白索引；cue 可设置 `background`、`cg`、`outfits`、`hidePortrait` 或 `photo`。例如 `dinner` 的 5–7 句使用戴口罩的用餐 CG，8–15 句才显示摘口罩 CG，避免在进入店内前提前揭示画面。

CG 出现时隐藏重复人物立绘；猫眼、电话等片段可显式隐藏人物。凛穿借来外套的手机照片用 `photo` 调用对应衣装，以照片样式显示，不画成她站在当前房间。远程说话人沿用故事中的位置判断。

人物入口中的“人物衣装”可切换全部场景服装；“场景回忆”由已有已读记录推导解锁十二张 CG，未读画面隐藏。查看原图使用完整图片，不裁成对白背景。此功能沿用 1.1 阅读与导出存档，不另建版本或独立收集存档。

## 已完成的本地环境准备

- 检查 `G:/AIsoftware`，发现旧 ComfyUI 与 WebUI，已有 Animagine XL 4.0 Opt 等检查点。旧 Python 中 PyTorch 为 2.0.1+cu118。
- 在本项目 `.local/ComfyUI` 克隆新版 ComfyUI，版本 0.42.0，提交 `bc5f880dbdd43e426077f42ccec53bb577ffee9f`。
- 在 `.local/art-venv` 建立 Python 3.11.8 隔离环境，安装 PyTorch 2.14.1+cu130 和依赖，`pip check` 通过。完整版本见 `art/requirements-lock.txt`。
- 下载 Anima Turbo 1.1、Qwen3-0.6B 编码器、Qwen Image VAE，共 5,628,171,998 字节，约 5.24 GiB。三个文件均校验 SHA-256。
- 准备 `art/prompts.json`：10 个场景背景、4 位成年角色立绘。固定提示词、分辨率、种子与采样参数；默认 10 步、CFG 1。
- 运行 `npm run art:plan`，导出 `art/workflows/*.json`。
- **只以 `--cpu` 模式**启动 ComfyUI 检查服务；读取节点定义，确认八种所需节点及各输入、模型枚举可用。生成队列的 pending/running 均为空。检查结束已关闭服务。

用户恢复生成后，曾实际提交 GPU 任务生成背景、立绘与关键场面试图，并做过一次提示词修订。用户认为画风和人物表现不符合目标，这批图已撤下媒体映射；保存路径仍在 public/art，旧映射备份在 .local/media-rejected-first-pass.json。停止时清空队列、请求卸载模型，不再继续本地试图。记录这些运行事实不代表图像质量获得认可。

## 模型记录

源仓库：[CircleStone Labs / Anima](https://huggingface.co/circlestone-labs/Anima)，下载固定到提交 `f973fc41ec7545364ac9776c2440285f43ff2a30`。该模型支持当前 ComfyUI 原生工作流，Turbo 的官方推荐为 CFG 1、8–12 步。模型说明及使用条款以官方页面为准。

| 文件 | 字节 | SHA-256 |
| --- | ---: | --- |
| anima-turbo-v1.1.safetensors | 4,182,230,656 | fba11953276b57edf59d1dc4f1857ac05aa079c56f982b4d7c20298d57d3f7eb |
| qwen_3_06b_base.safetensors | 1,192,135,096 | cd2a512003e2f9f3cd3c32a9c3573f820bb28c940f73c57b1ddaa983d9223eba |
| qwen_image_vae.safetensors | 253,806,246 | a70580f0213e67967ee9c95f05bb400e8fb08307e017a924bf3441223e023d1f |

权重位于 `.local/art-models/{diffusion_models,text_encoders,vae}`，下载清单位于 `.local/art-models/manifest.json`。`scripts/download-art-models.py` 支持断点续传与完整校验。不要将数 GB 模型权重打包进网页游戏。

## 本地命令记录（当前不执行）

只写工作流计划，不启动 ComfyUI、不加载模型：

```powershell
npm run art:plan
```

准备正式生图时，先在一个终端运行：

```powershell
.\scripts\start-comfy.ps1
```

另一个终端只生成首张图，先检查风格与资源占用：

```powershell
node scripts/art-workflow.js --asset=rain --run
```

全部图像的生成命令是 `node scripts/art-workflow.js --run`。脚本默认不联网提交任务，必须显式传 `--run`；已有同名最终素材时停止，避免无意覆盖。每张输出会附带完整工作流与提示词 JSON。

当前运行时采用 `public/art/production` 的清单与逐句 cue。以上本地环境、工作流和旧图保留作备选研究记录，不是当前游戏或内置图像工具的依赖；不重新启动本地生成，也不把未采纳试图混入生产映射。

官方环境依据：[ComfyUI 安装说明](https://github.com/Comfy-Org/ComfyUI#manual-install-windows-linux)。旧软件目录只读取，不在其环境中升级或覆盖文件。
