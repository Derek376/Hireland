# M0 决策：给 M1 的实施基线

日期：2026-10-10。本文件是 M0 的确定决策；版本选择已经查询 npm registry，安装/验证结果见 HANDOFF 与 evidence。本阶段只建立配置、接口与 schema，不提供可运行网页。

## 1. 范围

主主题 Everyday Frustrations，首批目标为爱尔兰寻找 Technology graduate/junior 岗位的学生。采用理由与需求强度仍是假设，需真实反馈验证。首批触达渠道假设为团队认识的学生、UCD 同学与 career society；未声称已有客户。

P0-Core：8–12 条 synthetic 岗位、关键词检索与详情、CV 文本和职业偏好、OpenRouter 评估、申请记录及状态、错误处理、用户验证和数据说明。P0-Bonus：一个话题的评论与 €0.99 EUR 单次 sandbox 解锁。其他能力按 `01_MONOLITH_PLAN.md` 后移。

同一 Next.js 应用、同一端口 3000、SQLite 本地文件。Server Components 直接读服务端函数，Server Actions 提交交互，只有 Stripe webhook 需要外部 Route Handler。M1 不建立通用 REST 层。

## 2. 版本与依赖选择

| 项目 | 锁定版本 / 选择 | 理由 |
|---|---|---|
| Node | 24.16.0，允许 24.16+ 的 24.x | 本机已有、内置 SQLite 可用；`.nvmrc` 给出复现版本 |
| npm | 11.13.0 | 本机版本；使用 npm 与 package-lock，不混用锁文件 |
| Next.js | 16.4.0 | registry 当日稳定版，Node/React peer 兼容 |
| React / React DOM | 19.3.0 / 19.3.0 | 匹配且满足 Next peer 约束 |
| TypeScript | 5.9.3 | 保守选择成熟 5.9，而非当日最新 7.0.2；M0 类型检查验证 |
| Stripe Node SDK | 23.0.0 | registry 稳定版；Node >=20，后续沿用该 SDK |
| node types | 24.19.2 | 与 Node 24 主版本对齐 |
| React types / DOM types | 19.3.0 / 19.3.0 | 与 React 主版本对齐 |
| server-only | 0.0.1 | M1 业务模块显式阻止客户端导入 |
| SQLite driver | Node `node:sqlite`，无需 npm 驱动 | 本机 SQLite 3.53.0；准备语句、事务与外键已纳入检查 |

Node 24.16 文档将 node:sqlite 标为 release candidate。接受其用于锁定版本、单机 hackathon demo；不推断为跨版本稳定生产保证。同步 DB 调用仅用于小规模本地操作，事务内不得等待供应商 HTTP。M1 使用 Node runtime，不用 Edge。样式使用基础 CSS，不额外引入 UI 框架或 ORM。

package.json 是 M0 依赖基线；tsconfig 当前仅检查 shared contracts。M1 添加 App Router、Next 配置与页面后必须扩展 tsconfig 并真实验证构建。M0 安装和 CLI 检查不等于网页构建已经通过。

## 3. Schema 与身份

规范 schema 是 `db/migrations/001_initial.sql`；所有 UTC 时间为 Unix 毫秒，SQL 用 snake_case，TypeScript 输出用 camelCase。9 张表：users、profiles、jobs、assessments、applications、topics、comments、purchases、entitlements。

- `users.id = demo-user`，演示名 Demo Student，由服务端固定获得；不是客户端参数，也不是生产认证方案。
- Profile 每用户一条，保存 CV/哈希/偏好。偏好使用 Technology/Finance/Consulting/Other 枚举，UI 首批以 Technology 为主。
- Job 的 id 做内部关联，job_key 唯一做来源去重；synthetic 使用固定 key。公开数据需 source_url；没有真实申请链接则 apply_url=null，不能构造虚假招聘页面。
- Assessment 缓存唯一键覆盖用户、岗位、完整输入 hash、prompt 版本和模型。input hash 包含规范化 CV、JD 和偏好；M2 用 SHA-256 和确定性序列化。只持久化成功校验的结果。
- Application 的 user_id+job_id 唯一，状态枚举受 CHECK 约束。允许状态纠正。
- Topic 的 job_id 唯一。Comment 的正文 trim 后 1–1000，created_at DESC/id DESC 排序，未付费 LIMIT 3 从 DB 读取。
- Purchase 先 CREATING，获得 Session 后 PENDING，真实 paid 核验后 PAID；创建失败 FAILED，过期 EXPIRED。取消返回不直接证明失败，重试确认应读 Stripe。Session 唯一，金额 99 欧分、currency=eur。一个用户可以有历史购买尝试，但一份话题权益。
- Entitlement 的 user_id+topic_id 唯一，并通过复合外键匹配同一 Purchase 的用户/话题；是否真实已付仍须 billing 函数核验，不能仅靠外键发权益。

M1 实现迁移版本记录与幂等 seed：初始 schema 可重复应用不删除表，但未来迁移应有版本号管理，不能永久用 CREATE IF NOT EXISTS 代替迁移。开启外键、WAL 与 busy timeout；连接复用；所有外部输入用参数化语句。测试只能使用临时数据库。当前没有创建项目业务数据库。

## 4. 进程内函数签名

`src/shared/contracts.ts` 是跨成员的类型规范，接口仅声明，不是已实现服务。统一 Result<T> 成功/失败结构；业务可预期错误返回稳定 code/message/retryable，未经处理异常在入口转成用户可理解反馈。

每个函数统一读取服务端 demo 身份，客户端不传 userId。CRUD 必须做记录归属检查。输入在服务端再次验证，不能只依赖 TypeScript。

- M1：getCurrentDemoUser、listJobs、getJob、getProfile、saveProfile、clearProfile、listApplications、saveApplication、updateApplication、deleteApplication。
- M2：assessJob；Profile 删除时同时删除关联评估；编辑后通过输入 hash 失效。
- M3：getTopicForJob、getTopicComments、addComment、createCheckout、fulfillCheckout。返回页调用前检查订单归属，webhook 调用前验签；内部 fulfill 再查询供应商和本地订单。

AssessmentOutput：decision=YES/NO/NEEDS_REVIEW、score=null 或 0–100、reason、最多各 2 项 strengths/gaps、unknowns。EvidencePoint 保留 CV/JD 原文 quote 或 null。M2 实现运行时长度、枚举、分数、quote 真实性检查，信息不明不等于供应商失败。

## 5. 配置及外部就绪检查

复制 `.env.example` 至 `.env.local`。APP_URL 和 DATABASE_PATH 有本地默认值。OpenRouter API key 与支持 structured outputs 的 model 必填才可评估；Stripe test key/Price/webhook secret 在 M3 才用于完整支付。

没有在 M0 猜测模型名称或虚构额度验证。设置 OPENROUTER_MODEL 后，运行 `npm run check:providers` 做一条无个人数据的最小结构化调用，会使用该账号的少量额度。Stripe 探测是只读 sandbox balance 查询，不创建订单或付款；受限 test key 必须具有该读取权限。

检查脚本退出码：0=所有探测通过；1=实际错误；2=缺配置。未设置密钥时不会发认证请求；响应内容与秘密不会打印。脚本检查阶段就绪，不是比赛 AI 功能或成功交易证据。

本机首次 registry 访问在默认 sandbox 下 DNS 失败，取得工具允许的网络访问后查询成功。新 agent 如果遇到相同环境限制，应区分工具网络与供应商账号错误。

## 6. M1 可以直接开始

1. 使用 nvm 指定版本，`npm ci`、`npm run check:m0`。
2. 沿用 schema/contracts，不另建账户、Job 或价格结构。
3. 添加单体 App Router 页面、服务端 DB 与迁移/seed 脚本及 dev/build/start 命令。
4. 生成 synthetic seed、虚构 CV 与数据 manifest，填写来源模板。
5. 验证页面旅程与重启持久化，更新 README/HANDOFF 并本地 commit。

M1 不依赖任何外部密钥。团队现在可以用 `Doc/evidence/USER_RESEARCH.md` 开始访谈；实际反馈留到收到后填写。

## 7. 已核实资料

Context7 查询 Next.js、Node 24、OpenRouter；具体版本另以 npm registry 元数据和本机安装为准，避免 canary 文档版本与锁定版本混淆。

- [Next.js 安装](https://nextjs.org/docs/app/getting-started/installation)、[全栈数据读取](https://nextjs.org/docs/app/guides/backend-for-frontend)。
- [Node 24.16 SQLite 文档](https://nodejs.org/download/release/v24.16.0/docs/api/sqlite.html)。
- [OpenRouter 结构化输出](https://openrouter.ai/docs/guides/features/structured-outputs)。
- [Stripe balance retrieve API](https://docs.stripe.com/api/balance/balance_retrieve)、[Checkout 履约](https://docs.stripe.com/checkout/fulfillment)。

比赛要求仍以仓库 PDF 为准，M0 不宣称已经满足全部比赛验收。
