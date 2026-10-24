# 本地字体

标题、章节、时钟与重要弹窗使用项目自带的 `Story Serif` 字体，即 Noto Serif SC 的字形子集。scene-pass-2 已核对全部章节与场景标题，所需字形均包含。浏览器从本地 `/fonts/story-serif.woff2` 加载，不依赖在线字体服务。正文和控件使用系统中文黑体。

来源：[Google Fonts / Noto Serif SC](https://github.com/google/fonts/tree/main/ofl/notoserifsc)，源文件 `NotoSerifSC[wght].ttf`；许可为 SIL Open Font License 1.1，完整文本随游戏保存在 `public/fonts/OFL.txt`。字体子集为 466,084 字节，保留可变字重。

字体子集使用 FontTools 4.67.0 与 Brotli 1.2.1 在 CPU 上生成。原字体下载保存在 `.local/NotoSerifSC.ttf`，不需要随游戏分发。修改台词或界面后，如新增字形，可重新从 `public/index.html`、`public/story.js`、`public/app.js` 收集字符到 `art/font-characters.txt`，再运行：

```powershell
.local\art-venv\Scripts\python.exe -m fontTools.subset .local\NotoSerifSC.ttf --text-file=art/font-characters.txt --flavor=woff2 --output-file=public/fonts/story-serif.woff2 --layout-features="*" --name-IDs="*" --name-legacy --name-languages="*"
```
