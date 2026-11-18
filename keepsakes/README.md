# 拾光手账 · Little Keepsakes

这是部署在个人 GitHub Pages 的独立电子手账。默认打开翻页手账，另有「时光卷轴」「日常拼贴」「珍藏柜」「荣耀分册」。

## 访问
- 网页：`https://arce-star.github.io/keepsakes/`
- 数据：`data/cards.json`（生活纪念物）、`data/matches.json`（王者荣耀战绩）
- 图片：`assets/` 或 `images/`，路径应是相对 `keepsakes/` 的本地图片路径。

## 新增日常纪念物
1. 用豆包修图后，导出图片，放在 `keepsakes/images/`。
2. 在 `data/cards.json` 中添加一条记录，使用唯一 `id`、`date`（YYYY-MM-DD）、`title`、`place`、`category`、`image`、`note`、`tags`、`sections`。
3. `sections` 可包含 `book`、`timeline`、`collage`、`collection`。例如普通发票 `["collage"]`，房卡 `["book","collection"]`，随手风景 `["timeline"]`。
4. `visibility` 为 `"public"` 才会展示。提交后页面自动读取 JSON，按日期排序。

## 新增王者战绩
- 在 `data/matches.json` 添加唯一 `id`、`date`、`title`、`hero`、`mode`、`result`、`kills`、`deaths`、`assists`、`rating`、`achievements`（数组）、`image`、`note` 和 `visibility`。
- 保留清晰的真实战绩截图用于核对数据；可以另外准备豆包生成的卡面图。

## 说明
- v1 中的 7 条生活记录、2 条战绩和 SVG 插画都是虚构样例；不是账号所有者真实经历。
- 首页「+ 收藏新的日子」仅介绍操作流程，不具备上传功能。
- DeepSeek Harness 的自动识别、生成 JSON、Git 推送以及豆包 API 尚未接入。后续可在本地自动更新数据文件并推送。
- 这是公开仓库：`visibility` 只控制网页显示，不能保护已提交的文件。上传前务必清理姓名、电话、二维码、房号、账单、账号、他人游戏昵称等敏感信息；不要上传含敏感内容的原始图。
