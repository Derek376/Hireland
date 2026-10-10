# Hireland

面向爱尔兰毕业生的岗位发现、AI 申请建议与申请追踪原型。

M0、M1 已完成：一个可运行的岗位发现、CV/偏好保存和申请追踪原型。AI 是 M2 的下一步；社区与 Stripe 是 M3，当前界面明确标为尚未提供。

一个 Next.js 全栈单体、一个端口、本地 SQLite（Node 内置驱动）。使用 Node 24.16.0 / npm 11.13.0。

```bash
nvm use
npm ci
npm run db:setup
npm run dev
```

打开 [本地应用](http://127.0.0.1:3000)：Discover → My profile → 加载虚构 CV 并保存 → 打开岗位详情 → Save to tracker → Applications 修改状态/删除。保存不会向公司提交申请。

无需任何供应商密钥即可运行 M1。默认数据库 `data/hireland.sqlite`；只有单个本地演示用户，请使用虚构信息。10 个岗位与 CV 都是明确标注的 synthetic 数据，没有真实申请链接。

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

需要自定义数据库路径或开始 M2/M3 时，复制配置并编辑 `.env.local`：

```bash
cp .env.example .env.local
```

`DATABASE_PATH` 是本地路径，相对路径基于仓库根目录；Next 与数据库脚本均读取 `.env.local`。设置自己的 OpenRouter key、支持结构化输出的 model 和 Stripe sandbox key 后运行：

```bash
npm run check:providers
```

该命令会做一次最小真实 OpenRouter 请求（消耗少量额度）和只读 Stripe sandbox 检查。退出码 0 表示通过、1 表示错误、2 表示缺配置；缺密钥不阻塞 M1。它不创建 Checkout，也不构成比赛 AI 功能或付款证据。不要将密钥发到聊天或提交到 Git。

后续 agent 每次工作结束验证并更新 HANDOFF，按用户要求直接做本地 commit。

- [单体架构、比赛要求对照、实施计划与里程碑](Doc/01_MONOLITH_PLAN.md)
- [各里程碑独立开发 Prompt 与跨账号交接方法](Doc/02_MILESTONE_PROMPTS.md)
- [当前开发状态与交接记录](Doc/HANDOFF.md)
- [M0 技术决策、schema 与接口约定](Doc/03_M0_DECISIONS.md)
- [用户访谈提纲与记录模板](Doc/evidence/USER_RESEARCH.md)
- [数据来源登记模板](Doc/evidence/DATA_SOURCES.md)
- [M1 测试与浏览器验收证据](Doc/evidence/M1_CHECKS.md)
- [原始 PRD 草稿](Doc/00_MASTER_PRD.md)
- [HackUCD 2026 比赛要求](Doc/hackucd-2026-challenges.pdf)
