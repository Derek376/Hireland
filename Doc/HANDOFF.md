# Hireland 开发交接记录

最后更新：2026-10-10。

## 当前真实状态

- M0、M1 完成；App Router 页面、版本化迁移、幂等 seed、Profile/申请服务与 Server Actions 已实现，10 条虚构岗位可浏览。业务 SQLite 文件本地持久化，未提交到 Git。
- 已分析原 PRD 与全部六页比赛 PDF，已编写单体方案和 M0–M5 开发 prompts。
- 用户已明确要求：一个 monolith，不分多个应用。
- 锁定并安装 Next.js 16.4.0、React 19.3.0、TypeScript 5.9.3、Stripe SDK 23.0.0；使用 Node 24.16.0/npm 11.13.0、内置 SQLite 3.53.0。M1 类型、业务测试、生产构建与浏览器操作通过。
- OpenRouter 真实功能：PASS，四组样例及生产浏览器调用成功。当前模型 `openai/gpt-4.1-mini`，prompt `hireland-assessment-v11`；密钥保存在忽略的 `.env.local`。M2 技术完成，首位真人试用仍待记录。
- Stripe sandbox 认证：BLOCKED，缺 test key；真实测试交易尚未实现。
- 真实用户访谈、反馈修改、演示录屏：未完成。
- 用户授权每次工作结束直接本地 commit，已写入 AGENTS.md 并更新阶段 prompts；不自动推送或部署。M0 提交标题为 `chore: complete M0 foundation and handoff`，实际 hash 用 git log 核查。

## 里程碑状态

| 阶段 | 状态 | 证据 |
|---|---|---|
| M0 范围与外部依赖检查 | DONE | Doc/evidence/M0_CHECKS.md；外部凭据阻塞明确记录，M1 可开始 |
| M1 应用骨架与持久化 | DONE | Doc/evidence/M1_CHECKS.md；生产构建、10 个测试、浏览器操作与重启持久化 |
| M2 真实 AI 核心闭环 | IN_PROGRESS | Doc/evidence/M2_CHECKS.md；技术验收通过，首位真人试用未完成 |
| M3 社区与支付 bonus | NOT_STARTED | 无 |
| M4 测试与反馈迭代 | NOT_STARTED | 无 |
| M5 复现与演示 | NOT_STARTED | 无 |

状态使用 NOT_STARTED / IN_PROGRESS / BLOCKED / DONE / SKIPPED。这是项目记录，不是工具中的 goal 状态。DONE 必须有证据；M3 可明确 SKIPPED，不能暗示取得 Stripe bonus。

## 继续工作入口

下一步补 M2 首位真实用户试用记录；用户若要求 M3，可沿用已通过技术验收的核心闭环继续社区与 sandbox 支付。阅读 AGENTS.md、README、单体计划和 M2 证据，不重建项目。真人反馈不能由 agent 浏览器检查替代，不因技术完成宣称比赛全部达标。

## 环境与运行

- 本机 Node 24.16.0/npm 11.13.0，`.nvmrc` 与 package-lock 给出复现基线。
- `npm ci` 安装；本次实际安装与离线重装使用 `--ignore-scripts --no-audit --no-fund --cache /tmp/hireland-npm-cache`。未执行供应商安装脚本，后续 app build 仍需验证。
- `npm run check:m0`、typecheck、webpack 生产 build 通过；当前 `npm test` 21/21。M2 真实样例命令及浏览器证据见下文。
- OpenRouter 实际产品调用已验证；Stripe 配置仍缺，不能将综合 provider readiness 当作全部通过。
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
