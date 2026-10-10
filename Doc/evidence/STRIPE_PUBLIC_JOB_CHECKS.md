# Stripe 公开岗位与外链验收

日期：2026-10-10。用户要求根据指定 URL 新增岗位、显示 10 月 10 日、使用 Stripe 公司图片，View job 跳转原网址。

- 已核对 [Stripe 官方岗位页面](https://stripe.com/careers/listing/software-engineer-new-grad/8130881)，新增 `stripe-8130881` / `public:stripe:8130881`。页面信息以官网为准；本地只保存简短改写摘要。
- 添加日期是用户指定的 2026-10-10；新增 migration 003 的 `jobs.listed_at`，保留官方发布日期 `published_at=NULL`。列表显示 Added 10 Oct，并按添加日期排在最前。
- 公司头像使用官方 [logo kit](https://stripe.com/newsroom/information) 的 Blurple SVG 原文件，保存在 `public/logos/stripe.svg`；列表、Tracker 和侧栏共享此图。来源/条款见 `data/seed/public-manifest.json`。
- View job 使用普通外链，在当前标签页进入用户指定的 Stripe URL；岗位标题仍可进入本地详情使用 CV、保存及状态记录。公开岗位拥有一个空本地讨论，不附加虚构 seed 评论。
- 调整列表/页脚的来源说明以区分公开岗位和虚构演示，原十条 fixtures 的 source、日期及本地详情行为保留。

## 实际检查

Node 24.16.0：`npm test` **46/46 PASS**，`npm run check:m0`（含 typecheck）和 `npm run build` **PASS**。

新增测试覆盖公开来源和 HTTPS 申请链接、用户日期与未知发布日期分离、空讨论不附加虚构评论、重复导入不覆盖本地摘要/帖子/申请/变化日志，以及新连接读取。原迁移保护测试继续确认旧 Profile/评估/支付/权益等原字段保留。

当前用户数据库已执行 `npm run db:migrate` 和单独的 `seedPublicJobs()`：新增 **1** 条公开岗位；导入前后比较 Profile、申请、变化日志、评论、评估、购买、权益全部记录，相同。没有删除、重置或覆盖这些业务记录。新 checkout 使用 `npm run db:setup` 即可得到 10 虚构 + 1 公开岗位；重复 seed 保留本地数据。

生产预览只使用 `/tmp/hireland-stripe-job-preview/demo.sqlite`，启动命令：

```bash
DATABASE_PATH=/tmp/hireland-stripe-job-preview/demo.sqlite npm run db:setup
DATABASE_PATH=/tmp/hireland-stripe-job-preview/demo.sqlite APP_URL=http://127.0.0.1:3001 OPENROUTER_API_KEY= STRIPE_SECRET_KEY= STRIPE_WEBHOOK_SECRET= npm start -- --port 3001
```

Chrome/Playwright 真实生产浏览器 PASS：首条岗位/日期/公司图加载、空讨论、保存至 Tracker、内部详情、1366/768/390/320px 无横向溢出，以及 **实际点击 View job 后导航至指定 Stripe URL**。本地页面 console error/pageerror 为空。未点击官网 Apply，未提交招聘申请，也没有 AI/Checkout 调用。

用户现有 3000 开发服务另做只读浏览器确认，首条岗位、日期、图片、外链正确且错误为空，不修改用户保存/申请状态。

- [机器结果](STRIPE_PUBLIC_JOB_BROWSER_RESULT.json)
- [桌面截图](stripe-public-job-desktop.png)
- [手机截图](stripe-public-job-mobile.png)

Context7 仍无 callable 工具，已说明并查阅 Next.js 官方 Image 文档。依赖、lockfile、`.env.local` 未改变；密钥和业务 SQLite 不提交。
