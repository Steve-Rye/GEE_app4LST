# 步骤 1 Remotion 短动效

GEE_app4LST 中文小白跟做教程的 **步骤 1** 示意动画。本目录是独立 Remotion 子项目，不改根目录 GEE 脚本。

当前只实现步骤 1，步骤 2–5 尚未制作。画面为纯示意 UI（浏览器壳 + 简化 Code Editor），不嵌真实截图或录屏。

## 规格

| 项 | 值 |
| --- | --- |
| Composition id | `Step1OpenScript` |
| 时长 | 180 帧 ≈ **6 秒**（两拍，30 fps） |
| 尺寸 | 1920×1080（横屏 16:9） |
| 帧率 | 30 |
| 拍 1 | 0–84 帧（2.8s）：标题「步骤 1 · 打开脚本并确认登录」+ 缩短 URL 打出 |
| 拍 2 | 84–180 帧（3.2s）：左列表高亮 + 中间假代码；右上角「已登录」弹出 |

缩短地址示例：`code.earthengine.google.com/…`（截断，不逐字打完整串）。

## 安装

需要 Node.js 18+。本项目使用 **npm**。

```bash
cd doc/guides/beginner-tutorial/remotion
npm install
```

## 预览（Remotion Studio）

```bash
cd doc/guides/beginner-tutorial/remotion
npm run studio
```

等价命令：

```bash
npx remotion studio --no-open
```

终端会打印本地地址（一般为 `http://localhost:3000`）。打开后选择 Composition **`Step1OpenScript`**，也可直接访问：

```text
http://localhost:3000/Step1OpenScript
```

## 渲染成片

```bash
cd doc/guides/beginner-tutorial/remotion
npm run render:step1
```

等价命令：

```bash
npx remotion render Step1OpenScript out/step1-open-script.mp4
```

成片相对路径（相对本子项目）：

```text
out/step1-open-script.mp4
```

相对仓库根目录：

```text
doc/guides/beginner-tutorial/remotion/out/step1-open-script.mp4
```

## 关键帧截图（环境缺编解码器时）

若 `render` 因缺少 H.264 / VP8 等编解码器失败，可导出两拍关键帧，再到本机补渲染成片：

```bash
cd doc/guides/beginner-tutorial/remotion
npm run still:step1
```

等价命令：

```bash
npx remotion still Step1OpenScript out/step1-beat1.png --frame=42
npx remotion still Step1OpenScript out/step1-beat2.png --frame=120
```

| 文件 | 帧 | 含义 |
| --- | --- | --- |
| `out/step1-beat1.png` | 42 | 第 1 拍中段（标题已现、URL 正在打出） |
| `out/step1-beat2.png` | 120 | 第 2 拍，「已登录」角标弹出之后 |

本机补渲染（已安装 Chrome / Chromium 与 ffmpeg）：

```bash
npx remotion render Step1OpenScript out/step1-open-script.mp4
```

可选 WebM：

```bash
npx remotion render Step1OpenScript out/step1-open-script.webm --codec=vp8
```

## 工程结构

```text
src/
  index.ts              # registerRoot
  Root.tsx              # <Composition id="Step1OpenScript" />
  Step1OpenScript.tsx   # 两拍 <Sequence>
  components/           # 可复用示意：浏览器壳、编辑器、角标、标题
  fonts.ts              # 系统 / 网页安全中文字体栈
```

后续步骤应继续复用 `components/`，不要在本子项目里引入 GEE 业务脚本。
