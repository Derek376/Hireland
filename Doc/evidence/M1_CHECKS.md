# M1 验证与交付记录

日期：2026-10-10。基线 commit：5bb8be9。范围：岗位→Profile→申请追踪，单体本地流程。AI、社区、付款与真实用户访谈未实现或验证。

## 实际自动化检查

| 检查 | 结果 |
|---|---|
| npm run db:setup | 首次 10 岗位 inserted=10；再次 total=10/inserted=0；保留浏览器创建的 Profile 与申请 |
| npm test | 10/10 通过，包括顶层完整流程及 9 个子测试 |
| npm run typecheck / check:m0 | 通过；Next typegen + tsc 覆盖 src 页面/服务/actions、脚本、测试与生成类型 |
| npm run build | Next.js 16.4.0 webpack 生产构建通过；/、/profile、/applications、/jobs/[jobId] 均动态渲染 |
| 生产启动 | npm start，仅本机 127.0.0.1:3000；无供应商 key 仍可运行 |
| 干净源码类型/初始化复现 | 临时复制最新源码（不含 .next、next-env、业务 DB 或实际 .env），复用现有锁定依赖；typecheck 自动生成类型通过，db:setup 创建全新 10 岗位成功。此项不是另一台机器完整 npm ci 验收，后者留待 M5 |
| git diff --check | 通过 |

业务测试使用临时数据库，不更改本地 demo DB。覆盖：迁移/seed 重复执行、外键/WAL、字面关键词与 SQL 注入字符串、空搜索/无效输入、未知日期和 CLOSED、Profile 更新及 hash、重复保存保留旧状态、其他用户记录不能读写、seed 不删付款权益、新 Node 进程保留数据、已应用迁移篡改拒绝、清空 Profile 删除自身评估并保留申请。

测试里付款权益是假数据，用于检查 seed 的非破坏性，不是真实 Stripe 交易证据。

## 实际浏览器旅程

通过 Codex 浏览器执行；界面操作真实调用 Server Actions 和文件 SQLite，没有手动写 DB 冒充 UI 成果。

| 浏览器动作 | 实际反馈 / 结果 |
|---|---|
| 未填 CV 点击 Save profile | 明确 Add CV text 错误；草稿不被清空 |
| Load fictional CV → Save profile | 成功提示，刷新后虚构 CV 保留 |
| 勾选多个方向 → Save | 保存后 checkbox 与持久化偏好一致 |
| CV 改为空白后保存 | 校验报错；空白草稿保留，刷新恢复此前有效 CV |
| Clear saved profile | CV 清空，明确成功提示；再加载虚构 CV 可保存 |
| 搜索 no-such-role | 0 roles 与空状态，可返回全部岗位 |
| 搜索 clover | 正好 2 条该虚构公司岗位 |
| 打开 job-01 | 完整 JD、synthetic 来源、日期 Not provided、Unknown availability、无申请链接 |
| Save to tracker | 成功提示；按钮 Saved to tracker disabled；无真实投递 |
| 更新 APPLIED/INTERVIEW | 数据及页面摘要/选择框均正确更新 |
| Remove from tracker | 页面回到空状态，重新保存可恢复记录 |
| /jobs/missing-job | 自定义缺失页面与返回入口（检查的是页面行为，不声称 streamed HTTP 状态码） |
| 停 dev → build → start → 刷新 | Profile 与 APPLIED 保留；生产服务再更新 INTERVIEW 通过 |
| 390px 与 1280px 页面 | 申请页均无横向溢出，表单可用；无 console error |

## 遇到并修复的问题

1. 搜索 SQL 的 JS 反斜杠字面值被解释为无效 ESCAPE。改为 SQLite char(92)，参数化与通配符字面搜索回归通过。
2. React 成功提交自动 reset 导致下拉框/checkbox 显示旧值。状态选择使用保存状态为 key/defaultValue；Profile 显式在 transition 中 dispatch，保留受控草稿。再次实际提交与读取 DOM 值确认通过。
3. Next 平滑滚动警告已按提示设置 data-scroll-behavior；后续没有 console error。
4. Next dev 自动追加 agent rules；设 agentRules=false，保留团队 AGENTS，避免每次启动改工作区。
5. 默认工具 sandbox 禁止监听端口，首次 dev EPERM。通过允许的本地服务权限启动后成功；不是应用代码失败。

## 截图

- `m1-discover.png`：生产岗位发现页，10 条虚构数据及标签。
- `m1-applications.png`：生产申请页，INTERVIEW 与选择框、摘要一致。

这些截图是虚构测试数据的实际 UI，不构成用户研究或真实招聘进展证据。记录使用的 CV/岗位全部由团队原创，详情见 DATA_SOURCES 和 seed manifest。

## M1 完成判定与后续

M1 完成：同一应用可启动，真实数据库读写，Profile/申请新增更新删除，幂等数据初始化，重启保留，正常与边界反馈。M2 开始接真实 OpenRouter；供应商 key/model 未配置仍是外部阻塞。M4/M5 的研究、完整失败测试和最终演示证据仍需完成。
