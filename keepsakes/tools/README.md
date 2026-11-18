# 拾光手账：DSH 本地导入 / 人工确认 / Git 发布

**状态：工具已实现；本机 DSH 尚需指向本地仓库，尚未连接实际相册或你的 Git 凭据。** Python 3.9+ 标准库即可运行，**不需要安装 Node 包、不需要额外 Python 包、不需要新的图像 API**。

## 1. 只做一次：打开本地仓库

1. 在电脑上用 Git 克隆 `https://github.com/arce-star/arce-star.github.io.git`，或使用已有的仓库副本。
2. 在 DSH 中把工作目录切换至 `<仓库路径>\keepsakes`，并要求它读取 `AGENTS.md`。
3. 在 DSH 中说“**检查拾光手账环境，不要发布**”。DSH 应执行 `python tools/keepsakes.py doctor`（如果 `python` 不可用，在 Windows 上尝试 `py -3`）。
4. `doctor` 只检查本地 Python/Git/仓库状态，**不会验证远端 GitHub 登录凭据**；正式发布前需要本机具备 Git 推送权限。ChatGPT 的 GitHub 授权**不会**自动传递给 DSH。

## 2. 每次新增收藏

你把豆包处理的照片 / 完整战绩截图保存在电脑，然后告诉 DSH：

- “把这张照片放进时光卷轴”
- “把这张票据放进日常拼贴”
- “把这张房卡收进珍藏柜和翻页手账”
- “记录这场王者荣耀战绩”

DSH 根据截图整理 JSON。**AI 只负责建议字段；不能假装 OCR 一定正确。** 没有图片理解能力时让用户提供字段，照样可以使用脚本。

DSH 生成 JSON 的结构参见 `templates/memory.json` 和 `templates/match.json`，将生成的临时 JSON 保存在仓库外。

例如（在 `keepsakes` 目录）：

```powershell
# 只导入私有草稿，绝不写入公开仓库
python tools/keepsakes.py prepare --kind memory --image "C:\Users\Me\Pictures\memory.png" --meta "C:\Users\Me\Pictures\memory.json"

# 从上一步输出复制草稿 ID（例如 memory-1234567890ab）
python tools/keepsakes.py preview --id memory-1234567890ab
python tools/keepsakes.py publish --id memory-1234567890ab --dry-run

# 修改已有草稿（可多次执行，不发布）
python tools/keepsakes.py update --id memory-1234567890ab --meta "C:\Users\Me\Pictures\corrected.json"
```

`preview` 生成仅本地访问的 `preview.html`；可以让 DSH 在你的电脑浏览器中打开并核对。图片草稿保存在 `~/.keepsakes-drafts/arce-star.github.io/`（Windows 对应用户主目录）。**不会写入网站的 `images/` 或 JSON。**

## 3. 只有收到你明确确认才允许公开发布

请先检查图片中任何可能识别个人的元素（二维码、姓名、订单号、房卡信息、身份证明、游戏 ID、第三方聊天内容）、文字、日期、分类。然后你亲自回复 DSH：

> 确认发布 memory-1234567890ab

DSH 才能运行：

```powershell
python tools/keepsakes.py publish --id memory-1234567890ab --confirm "确认公开发布" --privacy-ok
```

缺少 `--confirm` 或 `--privacy-ok` 的命令会失败，`--dry-run` 永远不改动网页。DSH 必须等待你的确认消息；命令行开关仅用于降低误操作风险，**不能验证对话中的确认是否真实来自人**。

发布时检查 `git main`、`origin` 是否指向 `arce-star/arce-star.github.io`、工作树是否干净，先 `git pull --ff-only`，然后**仅暂存新增图片及相应 JSON**，提交并推送。没有网络或没有 Git 凭据时，工具会报错，不宣称已发布。

## 4. JSON 字段对应关系

`memory`（`keepsakes/data/cards.json`）：必填 `title`、`date`（YYYY-MM-DD）、`category`、`sections`（`book` / `timeline` / `collage` / `collection` 的非空子集）；可选 `place`、`note`、`tags`。

`match`（`keepsakes/data/matches.json`）：必填 `title`、`date`、`hero`、`mode`、`result`（`WIN` / `LOSE` / `DRAW`）、`kills` / `deaths` / `assists`（非负整数）；`rating` 可为 `null`；可选 `achievements`、`note`。

工具自动生成唯一 `id`、`image`（`images/<id>.<ext>`）、`visibility` 为 `public` 以及 `source` 为 `dsh`。不接受用户元数据文件中的 `image`、`id` 或 `visibility` 覆盖这些路径和状态。

## 5. 安全边界

- `prepare` 将图片复制到**仓库外**的草稿区；不会上传原照片。支持 JPG、PNG、WebP，最大 12 MiB。JPG 的扫描前 EXIF/APP/COM 元数据、PNG 的文本/EXIF 等非必要分块会被删除；包含元数据的 WebP 会被拒绝。此清理**不等于画面内容已匿名**，仍需人工核对。
- 这是公开的 GitHub Pages 网站。**公开仓库中 `visibility: private` 或把卡片隐藏并不意味着私密。** 如不准备公开，停止于草稿阶段。
- 运行脚本不需要新增 API Key。DSH 对图片的理解需要本身使用支持图片输入的模型。如果 DSH 不支持视觉，人工填写 JSON 即可。
- 不提供删除/改历史功能，避免误删真实收藏；新增是单条追加。
- 网络推送失败但本地 commit 成功时，Git 日志和文件会留在本机，应检查原因后手动 `git push origin main`。不要重复导入。

## 6. 完全隔离的自测

```powershell
python -m unittest discover -s tools/tests -v
```

自测使用临时 Git 仓库、假图片和本机裸仓库模拟 push，不访问真实 GitHub、**不提交任何测试照片到公开仓库**。只有你确认真实素材后，`publish` 才会调用远程仓库。
