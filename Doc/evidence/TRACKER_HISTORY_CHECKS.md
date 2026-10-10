# Tracker 状态选择与变化日志

日期：2026-10-10。分支：`feature/demo-ui`。

## 行为

- 点击 Tracker 的 Stage 标签打开原生状态选择器，选中后自动保存，更新计数、Next step 与日志。取消选择不会提交；不需要展开 Manage application 或点击 Update status。
- 保存中禁止再次选择，并显示 Saving；失败恢复已保存状态并显示错误。键盘输入选择阶段也可自动保存，保存后恢复选择器焦点。
- 每个岗位下方的 History 显示最新到最旧的状态变化、UTC 时间和首次保存，默认收起；独立 Remove 按钮保留原有删除能力。
- 数据库持久化，新进程/页面刷新仍可读取。重复保存或相同状态不重复写日志；允许用户纠正状态。

## 数据升级

新增 `db/migrations/002_application_status_history.sql`，不修改已应用的 001：

- `application_status_events` 关联申请，保存 CREATED / BASELINE / CHANGED、前后阶段及 UTC 毫秒。
- 既有申请在升级时插入当前状态的 BASELINE，界面提示 Earlier changes were not recorded，不虚构原来没有记录的变化或时间。
- 保存/修改与日志使用同一 SQLite 事务；日志失败时申请修改回滚。读写仍由服务器取得当前用户，日志查询按申请归属过滤。
- 删除申请时级联移除该申请日志，其他记录保持；没有数据库 reset、seed 覆盖或供应商操作。

已执行当前本地 `npm run db:migrate`，两版迁移 PASS。旧数据保留。新 checkout 在首次数据库连接或 `npm run db:migrate` 时升级。

## 实际验收

使用 Node 24.16.0：

```bash
npm test
npm run typecheck
npm run check:m0
npm run build
npm run db:migrate
```

- **42/42 离线测试 PASS**。新增用例覆盖重复保存、精确前后状态/纠正、无变化/非法输入、他人归属、日志写入失败导致更新/初次保存回滚、新进程持久化、级联删除，以及 001 数据升级后 Profile/申请/评论/评估/支付/权益保持原样、baseline 仅创建一次。
- typecheck、check:m0、webpack production build：**PASS**。
- 实际 Chrome/Playwright 生产浏览器：自动保存、下一步/计数更新、日志追加及刷新持久化、键盘选择与焦点恢复、在过滤阶段中修改后行移出/新阶段保留日志、独立 Remove：**PASS**。
- 1440 / 1024 / 768 / 390 / 320px，展开日志并打开/关闭社区侧栏均无横向溢出；console error/pageerror 为空。结果见 [TRACKER_HISTORY_BROWSER_RESULT.json](TRACKER_HISTORY_BROWSER_RESULT.json)。
- 截图已检查：[桌面状态与日志](tracker-history-desktop.png)、[手机日志与社区](tracker-history-mobile.png)。多条重复方向的变化是临时样例在实际验证中的纠正操作，不是真实用户反馈。
- 用户正在运行的 3000 开发服务已做只读浏览器复查：两条申请均显示状态选择器和 History，已有记录的 baseline 提示可见，浏览器错误为空；没有修改用户阶段。

生产浏览器只操作 `/tmp/hireland-history-preview/demo.sqlite`，在独立端口 3001 启动且显式清空供应商密钥；没有修改用户的阶段或新增真实 AI/Stripe 请求。既有真实 M2/M3 证据保持。本次反馈及实现不代表已完成全部 M4/M5。

Context7 工具不可用，已说明限制并核对 [React useActionState](https://react.dev/reference/react/useActionState)、[React select](https://react.dev/reference/react-dom/components/select)、[Next.js revalidatePath](https://nextjs.org/docs/app/api-reference/functions/revalidatePath)。依赖和 lockfile 未改变，`.env.local` 保持忽略且未输出密钥。
