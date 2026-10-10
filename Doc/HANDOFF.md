# Hireland 开发交接记录

最后更新：2026-10-10。

## 当前真实状态

- M0 完成；有依赖清单/锁文件、可执行 schema、TypeScript 内部接口和验证脚本。网页、业务服务、业务数据库和 seed 尚未实现。
- 已分析原 PRD 与全部六页比赛 PDF，已编写单体方案和 M0–M5 开发 prompts。
- 用户已明确要求：一个 monolith，不分多个应用。
- 锁定并安装 Next.js 16.4.0、React 19.3.0、TypeScript 5.9.3、Stripe SDK 23.0.0；使用 Node 24.16.0/npm 11.13.0、内置 SQLite 3.53.0。安装、CLI、schema 与类型检查通过；网页构建尚未验证。
- OpenRouter 凭据/额度/真实调用：BLOCKED，缺 API key 与模型配置。
- Stripe sandbox 认证：BLOCKED，缺 test key；真实测试交易尚未实现。
- 真实用户访谈、反馈修改、演示录屏：未完成。
- 用户授权每次工作结束直接本地 commit，已写入 AGENTS.md 并更新阶段 prompts；不自动推送或部署。M0 提交标题为 `chore: complete M0 foundation and handoff`，实际 hash 用 git log 核查。

## 里程碑状态

| 阶段 | 状态 | 证据 |
|---|---|---|
| M0 范围与外部依赖检查 | DONE | Doc/evidence/M0_CHECKS.md；外部凭据阻塞明确记录，M1 可开始 |
| M1 应用骨架与持久化 | NOT_STARTED | 无 |
| M2 真实 AI 核心闭环 | NOT_STARTED | 无 |
| M3 社区与支付 bonus | NOT_STARTED | 无 |
| M4 测试与反馈迭代 | NOT_STARTED | 无 |
| M5 复现与演示 | NOT_STARTED | 无 |

状态使用 NOT_STARTED / IN_PROGRESS / BLOCKED / DONE / SKIPPED。这是项目记录，不是工具中的 goal 状态。DONE 必须有证据；M3 可明确 SKIPPED，不能暗示取得 Stripe bonus。

## 继续工作入口

下一步执行 `Doc/02_MILESTONE_PROMPTS.md` 中的 M1。阅读 AGENTS.md、README、`Doc/01_MONOLITH_PLAN.md` 和 `Doc/03_M0_DECISIONS.md`。旧 `00_MASTER_PRD.md` 中三个独立 App 要求已失效。缺密钥不阻塞 M1；不要重复初始化一个新仓库或用 create-next-app 覆盖已锁定配置。

## 环境与运行

- 本机 Node 24.16.0/npm 11.13.0，`.nvmrc` 与 package-lock 给出复现基线。
- `npm ci` 安装；本次实际安装与离线重装使用 `--ignore-scripts --no-audit --no-fund --cache /tmp/hireland-npm-cache`。未执行供应商安装脚本，后续 app build 仍需验证。
- `npm run check:m0` 通过，包含 SQLite 和 tsc；只检查现有 schema/contracts，不代表产品运行。
- `npm run check:providers` 当前退出 2：缺配置；供应商验证未完成。
- 尚无 dev/build/start 或业务迁移/seed 命令，这些是 M1 的工作。
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

- 决策与来源：`Doc/03_M0_DECISIONS.md`；比赛 PDF 与原方案已重新核对。
- schema：`db/migrations/001_initial.sql`，9 表、UTC 毫秒、字符串 ID；M1 实现文件迁移 runner、版本记录、连接复用、WAL 与 seed。SQL 重复执行不删表；没有业务数据库可迁移。
- 接口：`src/shared/contracts.ts`；只声明接口，不是业务实现。固定 demo-user 从服务端取得。tsconfig 目前只覆盖 shared，M1 必须扩展。
- 配置：`.env.example`；APP_URL、DATABASE_PATH、OPENROUTER_API_KEY、OPENROUTER_MODEL、STRIPE_SECRET_KEY、STRIPE_WEBHOOK_SECRET、STRIPE_TOPIC_PRICE_ID。秘密值不入库/日志。
- 检查：`scripts/check-m0.mjs` 与 `scripts/check-providers.mjs`，结果见 `Doc/evidence/M0_CHECKS.md`。缺配置=退出 2，错误=1，通过=0。
- 用户研究：`Doc/evidence/USER_RESEARCH.md` 是待执行访谈与假设模板；数据登记：`DATA_SOURCES.md` 是待填写模板。没有编造反馈或数据。
- 团队待办：在忽略的 `.env.local` 配置自己的 API key/model/test key，复验 provider readiness；开始匿名访谈。M2 必须完成实际有用的 OpenRouter 调用，M3 必须另做真实 sandbox 交易。
- M1 最小下一步：沿用包/schema/contracts，建立 App Router、服务端 DB 和数据 seed，再完成岗位/Profile/申请持久化及浏览器旅程。仅基础 CSS，不加入 ORM、多服务、上传或爬虫。
