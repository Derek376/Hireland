# Hireland

面向爱尔兰毕业生的岗位发现、AI 申请建议与申请追踪原型。

M0 已完成：版本锁定、数据 schema、内部接口、环境检查与研究模板。网页与业务流程从 M1 开始实现；目前没有 dev/build/start 命令。

一个 Next.js 全栈单体、一个端口、本地 SQLite（Node 内置驱动）。使用 Node 24.16.0 / npm 11.13.0。

```bash
nvm use
npm ci
npm run check:m0
cp .env.example .env.local
```

`check:m0` 验证安装版本、临时 SQLite schema/约束/持久化和内部接口类型，不创建或重置业务数据库。Next.js 网页构建与端到端行为尚待 M1 验证。

编辑 `.env.local` 填入自己的 OpenRouter key、支持结构化输出的 model 和 Stripe sandbox key，然后运行：

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
- [原始 PRD 草稿](Doc/00_MASTER_PRD.md)
- [HackUCD 2026 比赛要求](Doc/hackucd-2026-challenges.pdf)
