# 文间 · 文学阅读与赏析馆

站点入口：[https://arce-star.github.io/reading.html](https://arce-star.github.io/reading.html)

## 功能

- **100 篇真实作品书目**：小说 50、散文 50。每篇具备作者、年代、主题、阅读引导、来源链接及版权状态提示。
- **本地完整原文**：当前已收录《故乡》《孔乙己》《一件小事》《背影》《荷塘月色》《春》《匆匆》《冬天》共 8 篇；原文与网页分离存放在 `fulltext.json`，页面直接读取仓库文件，不需要访问维基文库才能阅读。其余 92 篇仍是书目/来源入口，后续逐篇核验后补齐。
- **阅读**：对于少量可能具有合法公开全文的中文原作，尝试从维基文库 API 读取；遇到来源缺失、版本不确定或跨域网络错误，显示原始来源链接与摘录输入，不生成伪造原文。
- **阅读体验**：响应式阅读界面、夜间模式、字体大小、阅读进度、收藏和本地私人笔记。
- **AI 赏析**：按作品主题、文本证据、另一种解读和开放问题进行文学细读；支持用户粘贴合法取得的文本片段，不默认把它们发布到 GitHub。
- **AI 发现**：在网页上推荐真实作品候选；DeepSeek 官方接口可使用原生联网搜索工具（若模型/API 权限支持），USTC LLM 不假定具有联网能力。候选仅供验证，不直接变成正式全文。
- **GitHub 入库**：管理员完成书目和来源核验后，凭服务端设置的发布口令，将新书目信息写回 `assets/data/reading/catalog.json`。发布流程**不上传未经授权的全文**。

## API 提供方

页面右上角打开“API 设置”：

| 提供方 | 对话接口 | 初始模型 |
| --- | --- | --- |
| USTC LLM | `https://api.llm.ustc.edu.cn/v1/chat/completions` | `deepseek-v4-flash` |
| DeepSeek 官方 | `https://api.deepseek.com/chat/completions` | `deepseek-flash` |

两者使用 **Bearer API Key + Chat Completions** 格式。模型名允许修改，以平台当前权限为准。DeepSeek 官方在 2026 年更新了模型 ID：旧的 `deepseek-chat` 不应作为新项目默认值。

学校官方文档：https://llm.ustc.edu.cn/guide/api-usage/

DeepSeek 官方文档：https://api-docs.deepseek.com/api/create-chat-completion/

### 部署关系：GitHub Pages + Vercel

`reading.html` 在 GitHub Pages 静态托管，**不能直接执行** `api/reading.js`。模型调用与 GitHub 写入逻辑需要把当前仓库部署到 **Vercel**（或兼容 Node.js Serverless Functions 的平台）。这和仓库现有的 `api/video.js` 架构一致。

1. 将 `arce-star/arce-star.github.io` 连接到 Vercel 项目并部署；Vercel 会将 `api/reading.js` 作为 POST `/api/reading` 处理。
2. 在网页的“服务端代理地址”填写真实的 `https://<你的-vercel-部署域名>/api/reading`。
3. 选择 USTC 或 DeepSeek，填写该提供方 API Key 和有权访问的模型名称。
4. 点击“测试连接”；成功后即可对文章进行 AI 赏析或发现新候选。
5. 如果要启用管理员写入 GitHub，在 Vercel 项目环境变量中设置：
   - `READING_ADMIN_TOKEN`：独立管理员发布口令，随机生成，**不要**使用 API Key。
   - `READING_GITHUB_TOKEN`：GitHub fine-grained token，**只授权目标仓库的 Contents: Read and write**。此令牌只能存在于 Vercel 环境变量，绝不能写进网页或公开仓库。
   - `READING_ALLOWED_ORIGINS`：可选，逗号分隔的额外被许可网页来源，例如你自己的域名。预置允许 `https://arce-star.github.io`、同域 Vercel 页面及部分 localhost 调试地址。

不安装或部署 Vercel 后端，**书目、收藏、阅读及个人笔记仍可使用，但在线 AI 调用和自动 GitHub 发布不可用**。

### Key 处理方式

默认仅在网页 JS 内存中保存用户输入的 Key；选择“在此标签页内记住”后，才保存到当前标签页的 `sessionStorage`，关掉标签页会删除。每次模型请求会通过 HTTPS 将密钥发送到用户配置的 Vercel 代理，代理再将其转发到所选官方 API，不在 GitHub 和 Vercel 环境变量中存储访客 Key。

请只在自己信任的页面使用此功能；共享计算机建议不勾选记住 Key。学校平台可能对个人凭据、项目额度和公网调用有额外使用规定，使用前需遵守。

## 目录

- `reading.html`：阅读空间页面
- `assets/css/reading.css`：响应式阅读样式
- `assets/js/reading.js`：书目展示、交互、发现与赏析
- `assets/data/reading/catalog.json`：100 篇精选书目（小说 50、散文 50）
- `assets/data/reading/fulltext.json`：已实际收录并随站点发布的完整原文，目前 15 篇；每篇附来源、署名与许可信息。其余书目暂为作品索引，不冒充已收录全文
- `api/reading.js`：USTC/DeepSeek 请求转发及受保护的 GitHub 书目发布

## 内容治理

推荐文章和真实书目并不自动证明全文的复制/公开展示权利。现代作家作品、中文译作、节选及版本差异尤其需要单独核对。本站把未验证全文的作品保持为“来源入口/书目”，避免将模型生成的文字冒充原文。
