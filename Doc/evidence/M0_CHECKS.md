# M0 验证结果

日期：2026-10-10。以下是本次实际执行结果，不是完整产品验收。

| 检查 | 实际结果 |
|---|---|
| 开始时 Git 工作区 | 干净；基线 e857c27 |
| Node / npm | v24.16.0 / 11.13.0 |
| npm registry | 默认 sandbox DNS 失败；工具允许网络访问后版本查询成功 |
| 锁定版本安装 | `npm install --ignore-scripts --no-audit --no-fund --cache /tmp/hireland-npm-cache` 成功，安装 30 包并生成 package-lock |
| 锁文件重装 | `npm ci --offline --ignore-scripts --no-audit --no-fund --cache /tmp/hireland-npm-cache` 成功 |
| Next CLI | `./node_modules/.bin/next --version` 输出 Next.js v16.4.0 |
| M0 检查 | `npm run check:m0` 退出 0；精确包版本、9 表 schema、外键、唯一性、枚举/正文、价格、权益归属、回滚、持久化通过 |
| 类型检查 | 同一 check:m0 内 `tsc --noEmit` 通过；只覆盖 shared contracts |
| SQLite | Node 内置 SQLite 3.53.0；测试用临时文件，运行后清理 |
| 缺供应商配置 | `npm run check:providers` 退出 2；OpenRouter 与 Stripe 均 BLOCKED；没有发送认证请求 |
| 拒绝 live key | 使用明显虚构的 `sk_live_fixture` 运行脚本，退出 1，Stripe 被拒绝；无真实 live key/支付 |
| 忽略规则 | `.env.local`、本地 SQLite 及 WAL 文件均被 gitignore 排除 |
| 文本检查 | `git diff --check` 通过 |

首次版本检查曾因 server-only 不导出 package.json 子路径失败；检查方式已改为直接读取安装元数据，修复后以及重装后均重新通过。没有跳过该依赖检查。

## 未执行项及原因

- OpenRouter 真实最小调用、账号额度与具体模型：缺 OPENROUTER_API_KEY/OPENROUTER_MODEL。
- Stripe 真实 sandbox 认证：缺 STRIPE_SECRET_KEY；成功 Checkout/购买属于 M3，尚未实现。
- 网页构建、浏览器用户旅程：M1 尚未实现。
- 访谈、反馈修改、数据 seed：目前只有提纲/模板，尚无真实研究或业务数据。

## 后续复验

设置 `.env.local` 后运行 `npm run check:providers`，保留实际非敏感结果。OpenRouter 会消耗少量额度；Stripe 检查只读、不创建付款。不要把该 readiness 检查替代 M2 有用 AI 功能或 M3 真实 sandbox 交易证据。
