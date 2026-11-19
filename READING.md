# 文间 · 高中现代文阅读原文馆

站点：https://arce-star.github.io/reading.html

## 馆藏来源

2026-11-19 从用户上传的三本《一本·现代文阅读技能训练100篇》PDF 扫描件中按目录抽取**文学类阅读原文 79 篇**，分别为：

- 高一：31 篇（小说 16、散文 15）
- 高二：25 篇（小说 14、散文 11）
- 高考：23 篇（小说 12、散文 11）

已完全替换原来自选的 100 篇书目及其 22 篇维基文库原文。其余论述类、实用类训练文章尚未纳入当前文学馆。

## 数据

- `assets/data/reading/catalog.json`：79 篇目录、所属年级、体裁、书内页码及扫描来源
- `assets/data/reading/fulltext.json`：79 篇 OCR 正文，尽可能剔除题目、答案及解析

三本 PDF 均为图片扫描版，**OCR 文本未经逐字校对**，可能存在错字、漏字、标点和换行错误。馆藏以 `ocrStatus: needs_review` 标记，并保留原书页码、PDF 页码供回查。版权归相应权利人所有。

保留小说/散文/年级筛选、收藏、阅读笔记、字号与夜间模式，以及 USTC LLM / DeepSeek 的 API Key 设置和 AI 文学赏析。旧的维基文库自动下载工作流已移除，避免外部作品再次混入当前馆藏。

## 阅读排版与 API 配置（2026-11-19）

- OCR 源文件中的单换行通常只是 PDF 行宽折行。阅读页会合并行内换行，并以短末行与句号等信号推断自然段，保留多行 OCR 内容；推断段落不代表原书逐字校对。
- USTC 官方 OpenAI 兼容入口：\`https://api.llm.ustc.edu.cn/v1\`；聊天 \`POST /v1/chat/completions\`；模型列表 \`GET /v1/models\`；Authorization: Bearer API-Key。默认使用用户示例的 \`qwen-chat\`，模型名称可手动输入或用 Key 查询。
- DeepSeek 官方：\`https://api.deepseek.com/chat/completions\`，默认 \`deepseek-flash\`。两套 Key 和模型分别维护；Key 默认仅在本次页面内存中，勾选后只存在当前标签页 sessionStorage。
- 若未设置代理，浏览器从 GitHub Pages 尝试直连官方 API；浏览器跨域限制可能阻止访问。推荐部署本仓库 \`api/reading.js\` 到 Vercel，并在页面填写 \`https://实际域名/api/reading\`。GitHub Pages 本身无法执行 Vercel Serverless API。未经真实 Key 授权，不能认为服务端请求已通过端到端测试。
