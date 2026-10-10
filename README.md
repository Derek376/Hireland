# Hireland

面向爱尔兰毕业生的岗位发现、AI 申请建议与申请追踪原型。

M0、M1 已完成；M2 的真实 OpenRouter 评估、引文校验、缓存和申请闭环已通过技术验收。用户已明确跳过 M2 真人试用，M2 按调整后的范围标为完成；没有用户反馈证据。M3 社区与真实 Stripe sandbox 购买/解锁已完成。

一个 Next.js 全栈单体、一个端口、本地 SQLite（Node 内置驱动）。使用 Node 24.16.0 / npm 11.13.0。

```bash
nvm use
npm ci
npm run db:setup
npm run dev
```

打开 [本地应用](http://127.0.0.1:3000)：Find jobs → 右上角 My CV & preferences → 加载虚构 CV 并保存 → 岗位的 Check CV match → 勾选向外部 AI 发送材料的同意项 → Analyse this job → 核对建议与引文 → Save → My Tracker 修改状态/删除。保存不会向公司提交申请。

前端已参照 [四页设计稿](Doc/Stripe%20docs.pdf) 更新为白底、深蓝文字与青色按钮：紧凑岗位列表、搜索筛选、CV/社区侧栏、Tracker 状态筛选和评论详情。小屏幕侧栏改为顶部独立面板，支持关闭和 Escape。Discussions 可查看最新三个帖子、发帖和进入现有 Stripe sandbox 解锁流程；打开页面或侧栏不会自动调用 AI 或创建付款。

CV Match Profile 已支持上传后的文件卡片与示意缩略图；Update CV 在当前页选择 PDF、DOCX 或 UTF-8 TXT（最大 5 MB，提取文本不超过 12,000 字符）。仅保存提取的文本、文件名和时间，不保留原始二进制文件；已有职业偏好保留。匹配结果顶部显示百分比，下面用 Matched requirements / Gaps to review 展示 JD 和 CV 依据，Supporting details 展开完整引文与解释。示意缩略图不是文件的实际渲染，评分仍使用当前输入的有效评估；上传本身不调用 AI。查看 [CV 界面和上传验收](Doc/evidence/CV_MATCH_CHECKS.md)。

设计中的示例评分、截止日期、回复数不会被当成业务数据；CV 分数仅显示实际保存的评估。帖子和其下方评论均支持 Like / Dislike：每人一票、互斥、重复点击取消。打开帖子后点 Comment 会聚焦下方输入框，提交后评论挂在当前帖子下面，数量同步更新并持久化；失败保留草稿。社区侧栏也显示赞踩和评论数。免费预览仍为最新三个帖子，包含这些帖子的评论；隐藏帖子的回复不可读取或操作。暂未加入评论收藏或多层回复。查看 [评论互动验收](Doc/evidence/COMMENT_INTERACTIONS_CHECKS.md) 和 [首版界面验收](Doc/evidence/UI_REFERENCE_CHECKS.md)。

My Tracker 中可直接点击阶段标签选择 Saved / Applied / Interview / Offer / Rejected，选择后自动保存。每个岗位下方的 History 展示修改时间与前后阶段，刷新或重启后保留；重复选择当前阶段不追加日志。已有记录从升级时的当前状态开始记历史，不补造之前的变化。Remove 移除该岗位及其日志。详见 [状态与日志验收](Doc/evidence/TRACKER_HISTORY_CHECKS.md)。

无需供应商密钥即可浏览岗位、保存 Profile 和追踪申请；AI 分析需要 OpenRouter 配置。默认数据库 `data/hireland.sqlite`；只有单个本地演示用户，请使用虚构信息。默认数据包含 10 个明确标注的虚构岗位、虚构 CV，以及一条 [Stripe 官方 New Grad 岗位](https://stripe.com/careers/listing/software-engineer-new-grad/8130881)。Stripe 使用官方 logo，View job 跳转官网；列表 Added 10 Oct 是用户指定的 Hireland 添加日期，官方发布日期未知。公开岗位使用独立来源文件和空讨论，不附加虚构评论。

`db:setup` 执行版本化迁移与幂等 seed；重复执行保留 Profile、申请、评论与权益，不覆盖已有岗位、不删除数据库。网页首次连接会补迁移与 demo 用户，但不会自动 seed 或 reset。更改已应用迁移会报错，后续修改应添加新迁移。

生产运行和验证：

```bash
npm run build
npm start
```

不要同时启动 dev 与 start 占用同一端口；端口 3000，两者都只绑定本机 127.0.0.1。业务采用 Node runtime，生产构建使用 webpack；开发使用 Next 默认 Turbopack。

```bash
npm test
npm run check:m0
```

`npm test` 在临时数据库验证业务约束、身份归属和新进程持久化，不改 demo 数据。`check:m0` 保留原 schema 检查并检查整个项目类型；它先用 `next typegen` 生成忽略的 Next 类型，因此干净 checkout 无需先启动服务器。完整生产构建和浏览器流程已验证，详见 `Doc/evidence/M1_CHECKS.md`。

首次需要配置时，复制示例并编辑忽略的 `.env.local`（已有配置时不要覆盖）：

```bash
cp .env.example .env.local
```

`DATABASE_PATH` 是本地路径，相对路径基于仓库根目录；Next 与数据库脚本均读取 `.env.local`。设置 `OPENROUTER_API_KEY` 与 `OPENROUTER_MODEL`；本次实际通过的模型为 `openai/gpt-4.1-mini`，可用性与输出质量仍须在自己的账号复验。AI 分析将发送 CV、偏好和 JD，默认只使用虚构材料；保存 Profile 本身不会调用 AI。Stripe key 仅 M3 需要。供应商只读预检：

```bash
npm run check:providers
```

该命令会做一次最小真实 OpenRouter 请求（消耗少量额度）和只读 Stripe sandbox 检查。退出码 0 表示通过、1 表示错误、2 表示缺配置；缺密钥不阻塞 M1。它不创建 Checkout，也不构成比赛 AI 功能或付款证据。不要将密钥发到聊天或提交到 Git。

M2 实际功能验收（会产生四次真实 OpenRouter 请求并消耗额度）：

```bash
npm run check:m2 -- --write-evidence
```

它使用独立临时 SQLite，不修改演示数据库；四组虚构输入分别覆盖匹配、不匹配、信息不足和明显指令干扰，每组重复读取核查缓存。仅缺配置退出 2，失败退出 1，通过退出 0。写入 evidence 时保留旧轮次。当前离线 `npm test` 共 62 个测试，模拟故障明确与真实调用分开。真实输出、历史质量迭代、浏览器操作和生产重启见 M2 证据。

同输入、用户、模型和 prompt 的成功结果可复用；改 CV/偏好/JD 等会使当前缓存失效。请求 20 秒超时，无自动重试，同输入最多两次失败尝试（进程内预算，重启重置）。错误不显示假分数。引文校验只证明片段来自输入，不保证模型语义判断正确；分数不是录用概率。该原型使用固定本地 demo 身份。

M3：打开岗位详情 → Open job discussion → 查看最新三条/发评论 → Buy sandbox access (€0.99 EUR) → Stripe-hosted Checkout → 返回确认并解锁该话题全部评论。仅 sandbox，不收真实款；定价与评论均为演示假设。

配置 `STRIPE_SECRET_KEY=sk_test_...` 和本机 `APP_URL`（例如 `http://127.0.0.1:3000`，也支持 localhost）后重新启动；沿用 `npm run db:setup` 补话题/评论，不删除已有数据。不需要预建 Product/Price，`STRIPE_TOPIC_PRICE_ID` 不使用。实际验收使用 Stripe 官方测试卡和虚构邮箱/姓名，不要输入真实卡资料。

```bash
npm run check:m3 -- --write-evidence
```

该命令只核对应用内已有的真实 sandbox 交易并重复幂等确认本地权益，不创建收费；先在浏览器完成 Checkout。取消/未付款不解锁，重复确认只保留一份权益；付款后没返回时用讨论页的 Check payment 恢复。购买只解锁当前话题，重启后保留。

webhook 路径是 `/api/stripe/webhook`，需另配置 `STRIPE_WEBHOOK_SECRET` 与真实本地事件转发才会自动确认；当前未配置真实投递，返回页和手动恢复已实测。签名与错误路径通过离线测试，详见 M3 证据。

后续 agent 每次工作结束验证并更新 HANDOFF，按用户要求直接做本地 commit。

- [单体架构、比赛要求对照、实施计划与里程碑](Doc/01_MONOLITH_PLAN.md)
- [各里程碑独立开发 Prompt 与跨账号交接方法](Doc/02_MILESTONE_PROMPTS.md)
- [当前开发状态与交接记录](Doc/HANDOFF.md)
- [M0 技术决策、schema 与接口约定](Doc/03_M0_DECISIONS.md)
- [用户访谈提纲与记录模板](Doc/evidence/USER_RESEARCH.md)
- [数据来源登记模板](Doc/evidence/DATA_SOURCES.md)
- [M1 测试与浏览器验收证据](Doc/evidence/M1_CHECKS.md)
- [M2 真实 AI、质量迭代与浏览器验收证据](Doc/evidence/M2_CHECKS.md)
- [M3 社区、真实 sandbox 交易与权益验收证据](Doc/evidence/M3_CHECKS.md)
- [原始 PRD 草稿](Doc/00_MASTER_PRD.md)
- [HackUCD 2026 比赛要求](Doc/hackucd-2026-challenges.pdf)
