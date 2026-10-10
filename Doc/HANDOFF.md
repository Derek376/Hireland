# Hireland 开发交接记录

最后更新：2026-10-10。

## 当前真实状态

- M0、M1 完成；App Router 页面、版本化迁移、幂等 seed、Profile/申请服务与 Server Actions 已实现，10 条虚构岗位可浏览。业务 SQLite 文件本地持久化，未提交到 Git。
- 已分析原 PRD 与全部六页比赛 PDF，已编写单体方案和 M0–M5 开发 prompts。
- 用户已明确要求：一个 monolith，不分多个应用。
- 锁定并安装 Next.js 16.4.0、React 19.3.0、TypeScript 5.9.3、Stripe SDK 23.0.0；使用 Node 24.16.0/npm 11.13.0、内置 SQLite 3.53.0。M1 类型、业务测试、生产构建与浏览器操作通过。
- OpenRouter 真实功能：PASS，四组样例及生产浏览器调用成功。当前模型 `openai/gpt-4.1-mini`，prompt `hireland-assessment-v11`；密钥保存在忽略的 `.env.local`。M2 完成；用户在 2026-10-10 明确跳过真人试用，这不构成真实用户验证。
- M3 社区与 Stripe sandbox：DONE。真实 €0.99 EUR Checkout 已成功，PaymentIntent succeeded，job-04 全部评论解锁；真实 webhook 自动投递未配置，返回确认/手动恢复可用。
- 设计稿前端更新完成：按四页 `Doc/Stripe docs.pdf` 实现岗位列表、CV/社区侧栏、Tracker、评论详情及响应式布局；33 个离线测试、生产构建与浏览器交互通过，证据见 UI_REFERENCE_CHECKS。本次没有新增真实 AI/付款或用户反馈。
- Tracker 已按用户反馈改为点击阶段直接选择、自动保存，并新增可展开的持久化变化日志；42 个测试及生产浏览器通过，升级迁移不覆盖已有数据，见 TRACKER_HISTORY_CHECKS。
- 新增 Stripe 官方 New Grad 岗位（Dublin HQ），用户指定添加日期 10 月 10 日，官方 logo、View job 外链已验收。默认 10 虚构 + 1 公开岗位，46 个测试通过；见 STRIPE_PUBLIC_JOB_CHECKS。
- CV 侧栏按新增 demo 反馈更新：示意缩略图、原地 PDF/DOCX/TXT 上传、百分比和匹配/缺口列表、可展开 supporting 引文；53 个测试、生产构建及隔离浏览器验收通过，见 CV_MATCH_CHECKS。
- 真实用户访谈、反馈修改、演示录屏：未完成。
- 用户授权每次工作结束直接本地 commit，已写入 AGENTS.md 并更新阶段 prompts；不自动推送或部署。M0 提交标题为 `chore: complete M0 foundation and handoff`，实际 hash 用 git log 核查。

## 里程碑状态

| 阶段 | 状态 | 证据 |
|---|---|---|
| M0 范围与外部依赖检查 | DONE | Doc/evidence/M0_CHECKS.md；外部凭据阻塞明确记录，M1 可开始 |
| M1 应用骨架与持久化 | DONE | Doc/evidence/M1_CHECKS.md；生产构建、10 个测试、浏览器操作与重启持久化 |
| M2 真实 AI 核心闭环 | DONE | 技术证据见 M2_CHECKS；用户明确跳过真人试用，无反馈证据 |
| M3 社区与支付 bonus | DONE | M3_CHECKS、真实 Session/PaymentIntent、产品权益与重启证据 |
| M4 测试与反馈迭代 | NOT_STARTED | 无 |
| M5 复现与演示 | NOT_STARTED | 无 |

状态使用 NOT_STARTED / IN_PROGRESS / BLOCKED / DONE / SKIPPED。这是项目记录，不是工具中的 goal 状态。DONE 必须有证据；M3 可明确 SKIPPED，不能暗示取得 Stripe bonus。

## 继续工作入口

M3 已完成；下一步按用户明确指令执行 M4/M5，保留真实 AI 与 sandbox 闭环。M2 真人试用已明确跳过，不继续请求该反馈。阅读 AGENTS.md、README、单体计划和 M2 证据，不重建项目。真人反馈不能由 agent 浏览器检查替代，不因技术完成宣称比赛全部达标。

## 环境与运行

- 本机 Node 24.16.0/npm 11.13.0，`.nvmrc` 与 package-lock 给出复现基线。
- `npm ci` 安装；本次实际安装与离线重装使用 `--ignore-scripts --no-audit --no-fund --cache /tmp/hireland-npm-cache`。未执行供应商安装脚本；当前生产构建已通过。
- `npm run check:m0`、typecheck、webpack 生产 build 通过；当前 `npm test` 53/53。M2 真实样例命令及浏览器证据见下文。
- OpenRouter 与 Stripe 实际产品调用已验证；Stripe webhook secret/真实自动事件转发未配置。
- `npm run db:setup` 初始化与 seed；`npm run dev` 开发、`npm run build` 构建、`npm start` 生产运行。端口 3000，仅绑定 127.0.0.1；不要同时运行 dev/start。
- `npm run typecheck` 先 `next typegen` 再 tsc；next-env 与 .next 类型忽略，不需提交。Next 自动修改 AGENTS 功能在配置中关闭，保留团队指令。
- 不在此文件存储密钥、完整 CV、真实个人资料或含凭据的日志。
- 新账号的工具权限、供应商登录与本地环境不会自动继承；需要重新检查，不假定可用。

## 后续每阶段必须追加的交接信息

1. 阶段、日期、状态，以及可用时的分支/commit；未提交改动与归属。
2. 已完成行为与关键文件，不只写“已完成”。
3. 实际执行的安装/启动/初始化/验证命令，结果及证据路径；未执行项目明确标注。
4. 已确定的技术版本、配置变量名称和设置方法；不记录变量的秘密值。
5. 数据库 schema/迁移、seed/reset 行为，以及是否会删除数据。
6. 外部验证结果：真实 OpenRouter、真实 sandbox 交易、用户反馈；mock 与真实证据分开。
7. 未完成项、阻塞原因、下一步最小动作；需要人执行的步骤单列。
8. 下一位 agent 应执行的里程碑及验收入口。

保留之前的有效结果，更新概览使其反映现状；不要把计划或预期输出记录为实际完成。

## M0 实施交接

下文保留 M0 时点记录；当前 schema runner、类型范围与 seed 等以本文件 M1 交接为准。

- 决策与来源：`Doc/03_M0_DECISIONS.md`；比赛 PDF 与原方案已重新核对。
- schema：`db/migrations/001_initial.sql`，9 表、UTC 毫秒、字符串 ID；M1 实现文件迁移 runner、版本记录、连接复用、WAL 与 seed。SQL 重复执行不删表；没有业务数据库可迁移。
- 接口：`src/shared/contracts.ts`；只声明接口，不是业务实现。固定 demo-user 从服务端取得。tsconfig 目前只覆盖 shared，M1 必须扩展。
- 配置：`.env.example`；APP_URL、DATABASE_PATH、OPENROUTER_API_KEY、OPENROUTER_MODEL、STRIPE_SECRET_KEY、STRIPE_WEBHOOK_SECRET、STRIPE_TOPIC_PRICE_ID。秘密值不入库/日志。
- 检查：`scripts/check-m0.mjs` 与 `scripts/check-providers.mjs`，结果见 `Doc/evidence/M0_CHECKS.md`。缺配置=退出 2，错误=1，通过=0。
- 用户研究：`Doc/evidence/USER_RESEARCH.md` 是待执行访谈与假设模板；数据登记：`DATA_SOURCES.md` 是待填写模板。没有编造反馈或数据。
- 团队待办：在忽略的 `.env.local` 配置自己的 API key/model/test key，复验 provider readiness；开始匿名访谈。M2 必须完成实际有用的 OpenRouter 调用，M3 必须另做真实 sandbox 交易。
- M1 最小下一步：沿用包/schema/contracts，建立 App Router、服务端 DB 和数据 seed，再完成岗位/Profile/申请持久化及浏览器旅程。仅基础 CSS，不加入 ORM、多服务、上传或爬虫。

## M1 实施交接

- 提交标题：`feat: complete M1 monolith discovery and application tracking`，实际 hash 用 git log 核查；用户已授权直接本地 commit。
- 页面：`src/app/page.tsx`、`profile/page.tsx`、`jobs/[jobId]/page.tsx`、`applications/page.tsx`；统一 layout/nav、基础 CSS、loading/error/not-found。英文展示用于现场 demo。
- 数据：`src/server/db.ts` 复用单进程连接，开启外键/WAL/5 秒 busy timeout；按 checksum 和事务记录 schema_migrations。初始 9 表加迁移记录表。不要编辑 001 SQL，新增版本迁移。
- seed：`data/seed/jobs.json`（10 条 Technology 岗位，9 UNKNOWN/1 CLOSED，无申请 URL）、`demo-cv.txt` 和 manifest；`src/server/seed.ts` 仅添加缺失 jobKey，不覆盖业务数据，不自动 reset。
- 服务：identity/jobs/profile/applications/results 都为 server-only；实现 M0 的 M1 函数，服务器固定身份与归属检查。清空 Profile 同时清理当前用户评估，不删申请/其他用户数据。
- Server Actions：`src/actions/profile.ts` 与 applications.ts；校验、业务调用、revalidatePath。客户端 forms 使用 useActionState 显示 pending/错误/成功，不存 localStorage。
- 修复：SQL 搜索参数及通配符转义；成功提交表单后 checkbox/select 被 reset 到旧值的问题；CV 验证失败保留草稿。键盘 label、焦点、skip link 与 aria-live 已检查。
- 验证：`npm test` 10 个通过、check:m0/typecheck 和 production build 通过；实际浏览器保存/清空 CV、搜索、保存/更新/删除申请、404、手机/桌面无横向溢出、生产重启持久化。详见 evidence；已有真实 AI/付款/访谈仍为零。
- 当前本机演示数据：验收创建的虚构 CV（Technology）及一个 job-01 的 INTERVIEW 记录保留在忽略的本地 DB；新 clone 不含这些用户记录，先 db:setup 再从 UI 加载 CV/保存岗位即可。
- M2 入口：沿用 getProfile/getJob、shared AssessmentOutput、Result 与评估表，新增 OpenRouter adapter、assessJob、评估 action/card；替换详情页“not available yet”提示。缓存须含 CV/JD/偏好/prompt/model；真实证据和离线故障模拟分开。
- 剩余：OpenRouter/Stripe 配置与外部调用、社区/支付、用户反馈、M4/M5 完整比赛证据。不得因 M1 可运行便宣称整场比赛要求已满足。

## M2 实施交接

- 提交标题：`feat: implement M2 OpenRouter assessments and evidence validation`；实际 hash 用 git log 核查。无推送或部署。
- 入口：`src/actions/assessments.ts` 显式同意校验 → `src/server/assessments.ts` 服务端读取用户/Profile/Job → `src/server/providers/openrouter.ts` 真实 HTTP → `src/server/assessment-output.ts` schema 和原文校验 → SQLite → `src/components/assessment-panel.tsx`。页面读取无供应商调用，失败无 mock 评分。
- 缓存包含用户、岗位、完整输入 hash、model 和 prompt；有效历史成功结果保留。坏缓存拒绝显示；同输入请求复用、不同输入 BUSY。每输入最多两次失败尝试，进程内预算不是持久限额。20 秒 timeout 覆盖响应体；64 KiB 响应上限、1,800 输出 tokens、无自动重试。
- 原文候选排除标题，明确 Requirements 段排除后续可选项；全文仍发送。缺少 CV 证据时谨慎措辞，不等于证明不会。严格检查引用、结构、分数和同一要求的矛盾。明显指令干扰返回 NEEDS_REVIEW/null，不承诺完整防注入。具体语义局限见 M2_CHECKS。
- 修改期间的过期请求拒绝落库；profile updatedAt 使用单调时钟，防同毫秒清空重存。无 schema 变更，无数据库 reset。Profile 保存/清空会刷新岗位页当前评估。
- 当前 `.env.local` 配置由用户授权提供；原忽略的 `.env` 已迁移至 `.env.local`。实际比较后将非秘密模型名换为 `openai/gpt-4.1-mini`；API key 未打印、未改变、未提交。新账号须自行配置，不能自动继承凭据。
- 检查：21 个离线测试、check:m0/typecheck、生产 build；四组真实最终输出加四次缓存读取；实际生产浏览器 consent/pending/真实结果/保存/APPLIED/缓存；生产重启保持相同评估与申请、390px 无横向溢出、浏览器 warn/error 空。失败路径是离线模拟，不声称供应商真实发生故障。
- 实验命令 `npm run check:m2 -- --write-evidence` 使用临时 DB，只用虚构 CV/JD；四次真实请求有费用。当前结果 `M2_REAL_RESULTS.json`；11 轮此前真实质量实验 `M2_REAL_ITERATIONS.json`；原输入 scenarios-v1.json 和当前 scenarios.json 保留来源 hash。JSON humanReview=PENDING，不是真人审核。
- 浏览器证据 `M2_BROWSER_RESULT.json` 与两张 PNG。当前忽略的本机 DB 保留虚构 CV、job-04 的真实 v11 评估和 APPLIED，以及原 job-01 INTERVIEW；重启已核对。新 clone 无这些业务记录。
- 剩余：首位求职用户试用/匿名反馈。收到“继续”不能写成反馈；按 USER_RESEARCH.md 收集观察，必要时修改后再标 DONE。M3/M4/M5 未实施，Stripe sandbox 尚无真实交易。当前状态 IN_PROGRESS 仅因真人试用未完成，代码和技术验收已经完成。

### 用户范围调整（2026-10-10）

用户要求忽略真实用户试用反馈，并开始 M3；按上下文将其“把 m3 标注为完成”理解为 M2。M2 标 DONE，真人研究没有完成；比赛 Users first/用户假设证据仍缺，不承诺满足所有评分。M3 不提前标 DONE，须核对真实 sandbox 交易与产品权益。以上优先于前文历史待办。

## M3 实施交接

- 提交标题：`feat: complete M3 community and Stripe sandbox checkout`，hash 用 git log 查询；不推送/部署。
- 实现：server/community.ts、billing.ts、providers/stripe.ts、stripe-webhook.ts；actions/community.ts、components/community-forms.tsx；topics/[topicId]、checkout/return、api/stripe/webhook。岗位页增加同一岗位讨论入口。
- 无 schema 变更。db:setup 附加 seedCommunity，六条原创评论模板按固定 ID 加到十个 synthetic 岗位，不覆盖已有用户帖子/购买/权益。免费 SQL LIMIT 3，不返回隐藏正文；有权益返回全部。
- Stripe SDK 23 默认 endive API；create 使用 allowed_payment_method_types/card、inline EUR 99 price_data，不需 STRIPE_TOPIC_PRICE_ID；原 M0 Price 配置决定已被此次实现调整。API 返回的价格、商品、数量与订单绑定在履约时全部核查。
- 服务端 stable Purchase ID/idempotency key、单进程重复创建合并、未付款 open Session 复用、取消不发权益、expired 重建。创建不明保留 CREATING 可重试；已付写库失败可重试确认。事务 PAID+唯一 Entitlement；返回页检查当前用户，签名 webhook 调同一内部逻辑。
- APP_URL 仅 loopback HTTP origin；使用用户当前 `.env.local` 的 localhost:3000 也已验证。密钥在忽略文件，真实 sandbox key 已由用户配置；无真实收款。SDK timeout20秒/一次网络重试。
- 实际命令：db:setup 新增10/60，重复db:seed新增0；30测试、check:m0/typecheck、最终build全通过。真实浏览器发帖/免费3条/取消/同一Checkout重用/官方测试卡付款/返回确认/7条解锁；生产重启、另一话题锁定、伪造返回ID失败、390px检查通过。
- `npm run check:m3 -- --write-evidence` 从本地已记录的当前用户订单取 Session，用真实 API 复核 Session/PaymentIntent 并做幂等本地确认；不自动创建订单或支付。缺配置/缺交易退出2，失败1，通过0。详见 M3_CHECKS。
- 证据：M3_REAL_RESULT、UNPAID_RESULT、BROWSER_RESULT 与四张 PNG；Session `cs_test_a1nou05Nvsd00vlXZ2zt3y5nZ2YEkNQ6jCkur3dxFlDsjBs0XdBQ3pwvNX`，PaymentIntent `pi_3UOyl7Rzj2dmuCm90ax4mpgP`。这些是测试标识，不是密钥。
- 本机数据库：job-04 PAID、一个 Entitlement、6 fictional seed + 1 agent 写的虚构测试帖；job-01 INTERVIEW/job-04 APPLIED 与 M2 AI 原 ID/时间保留。新 clone 无业务记录；不要 reset 演示证据。
- 真实 webhook 自动投递未配置，签名/重放/错误路径只有离线证据；返回确认与手动 Check payment 可用。本地自动 forwarding 可后续补，但不要声称已验证。M3 的真实 sandbox 购买和产品权益退出条件已达成。
- 用户已跳过真人反馈，仍不等于比赛用户假设已验证。M4/M5 尚未实施；不擅自启动下一里程碑。

## 设计稿前端交接（2026-10-10）

- 用户要求按 `Doc/Stripe docs.pdf` 修改前端。当前仓库已经是 M0–M3 Next.js 单体；在 `feature/demo-ui` 分支工作。提交标题 `feat: match frontend to reference demo design`，实际 hash 用 git log 查询；不推送/部署。
- 全局 CSS/layout/navigation 对齐四页设计截图；新增 `components/workspace.tsx`、community-preview、icon/company-logo；Find jobs 与 My Tracker 共享布局、实际搜索/状态/保存和 CV/社区侧栏。Topic 页面支持授权评论详情及返回原侧栏，Profile/岗位详情沿用既有能力并统一主题。
- 新增 server/workspace.ts 与 shared/workspace.ts，只聚合既有服务的授权评论、真实申请与有效评估。不自动调用 provider、不泄漏完整 CV 或隐藏正文。评估/发帖/付款恢复 actions 刷新列表和 Tracker；没有数据库 schema/seed/reset 变更。
- 设计中的回复线程、点赞、评论收藏未新增；现有平铺评论不伪装成回复。缺少截止日期/分数时明确说明，不复制设计稿示例数值；Tracker Next step 是按阶段给出的建议。
- Node 24.16.0 从临时官方分发包运行；npm ci 安装，33/33 离线测试、typecheck、check:m0、production build 通过。生产 Chrome/Playwright 验证搜索/空结果、保存刷新、发帖/三条权限、状态修改、保存 CV、详情返回、隐藏评论深链与 320–1440px 无溢出，console/pageerror 为空。命令、截图与 JSON 见 `Doc/evidence/UI_REFERENCE_CHECKS.md`。
- 本次 checkout 未包含历史本机 `.env.local` 或业务 SQLite；此前 M2/M3 的真实证据保留，没有覆盖。本次验收使用 `/tmp/hireland-ui-demo/demo.sqlite` 并创建虚构 CV/本地测试帖子和申请，未进行新 AI/Stripe 请求。不要把本次截图当成新的真实交易或用户反馈。新环境须自行配置忽略的 `.env.local`。
- Context7 无 callable 工具，已告知用户并查阅 Next.js/React 官方文档。依赖版本和 lockfile未修改；Playwright 仅装于临时目录，不加入产品依赖。
- 继续入口：`nvm use` → `npm ci` → `npm run db:setup` → `npm run dev`，端口 3000；右上角菜单编辑 CV，岗位 Check CV match/Discussions，My Tracker 管理申请。UI 请求已完成，不据此标 M4/M5 完成；按用户后续明确范围继续。

## Tracker 反馈改进（2026-10-10）

- 用户明确反馈 Manage application 的选择/提交块不干净，要求直接点击状态修改并记录变化。已在 `feature/demo-ui` 完成；提交标题 `feat: add inline tracker stages and persistent status history`，hash 用 git log 查询，不推送。
- 新增 `components/tracker-controls.tsx`：原生阶段 select 自动执行现有 Server Action，pending/错误/键盘焦点处理；每岗位 History 时间线、独立 Remove。移除旧展开编辑块和未使用的表单组件，手机/侧栏布局仍可用。
- 新增 migration 002 的 application_status_events 表及 shared ApplicationStatusEvent；server/applications 的首次保存/状态更改与日志在同一事务，按归属读取。相同状态无新日志/时间变化；删除级联日志。Workspace 聚合真实历史，action 刷新页面/Tracker/岗位。
- 既有记录升级时仅添加真实当前状态的 BASELINE 与升级时间，明确没有过去的日志；没有补造 Saved→Applied 等历史。实际本地 db:migrate 已通过，保留申请/Profile/评论/评估/支付/权益，不删除或重置数据。`.env.local` 未改变/提交/输出。
- 验证：42/42 离线测试、typecheck、check:m0、最终 production build；Chrome 生产 3001 端口+临时虚构 DB 验证状态自动保存/计数/建议/日志、刷新、键盘焦点、阶段筛选后移出、删除和 320–1440px。结果/截图/命令见 `Doc/evidence/TRACKER_HISTORY_CHECKS.md`。没有新 AI/Stripe 调用，不将其冒充新的真实交易。
- Context7 不可用，沿用 React/Next 官方文档回退；依赖/lockfile 未改。用户正在运行的开发服务与业务阶段不用于写入浏览器测试。
- 下一步入口：刷新当前 My Tracker，点击阶段标签更改，展开 History 查看记录。全新进程连接自动应用迁移，已有进程可 `npm run db:migrate` 后刷新。此次用户反馈已处理，M4/M5 整体状态仍按原范围等待后续指令。

## Stripe 公开岗位（2026-10-10）

- 用户要求按 `https://stripe.com/careers/listing/software-engineer-new-grad/8130881` 新增岗位，日期设为 10 月 10 日，头像换 Stripe 图片，View job 进入外链。已在 `feature/demo-ui` 完成；提交标题 `feat: add public Stripe graduate role and official branding`，hash 用 git log 核查，不推送。
- 官网读取核对后新增 `data/seed/public-jobs.json`（短改写摘要）与 public-manifest；默认 11 个岗位，公开数据与原 synthetic fixtures 分开，`seedPublicJobs()` 幂等添加并创建空讨论，不向真实岗位复制虚构评论。db:setup 包含公开导入。
- 新增 migration 003，仅在 jobs 增加 listed_at，保存用户指定的添加日期；官方发布日期未给出，publishedAt 仍 null，UI 显示 Added 10 Oct。既有岗位新字段 null，不改原数据；按 listedAt 排序使 Stripe 在首位。
- 公司图来自 Stripe 官方媒体 logo kit 的原始 Blurple SVG，保存 `public/logos/stripe.svg`。普通 anchor 的 View job 在当前页跳转原 URL；本地岗位详情/保存/CV/Tracker 继续可用。来源说明同步区分公开与演示数据。
- 实际当前 DB migrate + 公共岗位单独导入新增 1，导入前后完整比较 Profile/申请/日志/评论/评估/购买/权益，均保持。`.env.local` 与已有记录未覆盖，没有新 AI/Stripe 支付调用。
- 46/46 离线测试、check:m0/typecheck、production build PASS；实际 Chrome 临时生产 3001 核对岗位、日期、logo、保存、空讨论、详情与移动宽度，并点击 View job 验证真实官网导航。现有用户 3000 页只读检查也通过。截图/JSON/命令见 `Doc/evidence/STRIPE_PUBLIC_JOB_CHECKS.md`。
- Context7 仍不可用，按官方 Next Image 文档回退；无依赖/lockfile 改动。后续刷新 Find jobs 即可看到新增岗位；未来状态需按官网复核，不宣称自动抓取或实时刷新。M4/M5 不因这次功能提前标完成。

## CV 上传后状态与匹配结果（2026-10-10）

- 用户明确要求红框放假的 CV 缩略图，并按 demo 重排下方结果，保留此前 Update CV 原地选择附件的需求。缩略图用 HTML/CSS 画示意文件，标 Sample preview，不依赖图片生成或真实 PDF 渲染，不假装展示简历内容。
- `components/cv-match-profile.tsx` 显示 CV ready、实际文件名/更新时间；原文本 Profile 显示 Your saved CV。Update CV 打开 file input，不跳转。`assessment-panel.tsx` 自动显示当前有效结果，先百分比、文件卡片，再 Matched requirements / Gaps to review / Needs confirmation；条目有绿勾/黄叹号、JD/CV 摘录，Supporting details 展开完整原文和解释，长总评/来源放 Supporting analysis。无有效结果才显示 consent/Analyse；不复制 demo 88% 或制造匹配项。
- `server/cv-upload.ts` 本地解析 PDF/DOCX/TXT，5 MB 文件/12,000 字符文本上限；类型、空文件、损坏/加密/扫描无文本、UTF-8/长度校验失败保留原 CV。保存文本、文件名，不保留二进制；不调用 AI，保留职业偏好（首次默认为 Technology）。Action 刷新 Profile/岗位/Tracker，新 CV 按既有输入 hash 使旧评估不可用于新内容，原成功评估历史不删除。
- 新增迁移 `004_cv_attachment_name.sql`，只增加可空 file_name；saveProfile 改为显式列写入，粘贴文本清除旧 filename。当前用户数据库已应用迁移，逐表比对迁移前全部原字段，Profile/申请/状态日志/评估/评论/付款/权益相同，无 reset 或新虚构数据写入。Workspace 仅额外序列化 filename/updatedAt，不包含完整 CV。
- 依赖锁定 `pdf-parse@2.4.5`、`mammoth@1.11.0`（npm install --save-exact --ignore-scripts）；Next serverExternalPackages 外置解析器，Server Action multipart 上限 6 MB，文件自身上限仍 5 MB。Context7 无 callable 工具；已告知用户并核对官方 Next Forms/serverActions/serverExternalPackages、pdf-parse/mammoth 文档。
- 实际检查：Node 24.16.0，npm test **53/53 PASS**，check:m0/typecheck、production build **PASS**。浏览器使用 `/tmp/hireland-cv-preview/demo.sqlite` 与离线虚构结果，验证分数/文件卡片/摘要与完整引文展开、Update CV chooser/无跳转、错误保留旧结果、TXT 更新及刷新持久化、真实 PDF/DOCX 提取，1440/1024/768/390/320 无溢出，console/pageerror 空。见 `CV_MATCH_CHECKS.md`、`CV_MATCH_BROWSER_RESULT.json` 与两张截图；截图 85% 是隔离 UI fixture，不是本次真实 AI 请求。
- 自动审批拒绝了在当前用户服务器点击 Check CV match 的浏览器验收，理由是可能向外部 AI 发送 CV；未执行该点击，改用隔离虚构数据完成验收。未进行新真实 AI/Stripe 调用，未修改凭据。提交标题 `feat: add inline CV attachments and evidence-based match layout`，hash 用 git log 查询；不推送/部署。
