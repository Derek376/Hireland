# M2 技术验收与 AI 质量记录

日期：2026-10-10。M2 开发与技术验收完成；计划中的首位用户试用尚无反馈记录，因此整个阶段保持 IN_PROGRESS。以下浏览器操作、源文核对由 coding agent 执行，不是用户研究。

## 已实现的真实流程

一个 Next.js 应用、端口 3000、原 SQLite。岗位页显式同意后，通过 Server Action → assessJob → 服务端 OpenRouter HTTP → 严格输出校验 → assessments 表 → 结果卡片。页面读取不触发 AI；没有应用内 mock、自动分析或自动重试。无需 Stripe 配置即可完成核心流程。

- 一次调用产生 YES / NO / NEEDS_REVIEW、可空技能分数、理由、最多各两项优势/不足、引文和待确认条件。
- SHA-256 缓存包含规范化 CV、偏好、岗位实际发送字段、prompt 版本和模型；用户/岗位参与数据库缓存键。改内容或模型不读取过期结果。
- 单进程每位用户最多一个进行中的请求。同输入复用 Promise，其他输入返回 BUSY。相同输入最多两次失败尝试，无自动重试；该预算是进程内、有界的 demo 保护，不是持久化计费限额，重启后重置。
- 20 秒 timeout 覆盖响应头和响应体，输出最多 1,800 tokens，响应体最多 64 KiB。HTTP 400/401/402/403/429/5xx、网络失败、拒绝、截断、非法 JSON、越界分数和不可核对的引文返回明确错误；不生成假分数，不覆盖成功历史结果。
- 引文来自原文目录：去掉标题、每片段最多 500 字符、每份最多 128 个候选。全文仍发送；只有引文候选受限。有 Requirements 等标题的 JD，引用其必需条件段；非结构化 JD 使用完整有效片段目录，不能保证自动识别所有可选条件。
- 服务端独立检查引文原文、结构、长度、枚举、分数和自相矛盾的相同要求。未在 CV 体现的条件使用固定“不代表不会”措辞。检测到明显的 AI 指令短语，schema 与运行时只允许 NEEDS_REVIEW/null/输入警告；不是完整 prompt injection 防护。
- CV 编辑、清空、清空后立即重存，或模型改变发生在 HTTP 期间时，拒绝写入旧结果。Profile 的 updatedAt 在进程内单调递增，避免同毫秒修订撞号。没有新增迁移、删除业务数据库或 reset。

## 实际检查

| 检查 | 结果 | 范围 |
|---|---|---|
| `npm test` | PASS，21/21（含两个父测试与 19 个子测试） | M1 保持通过；M2 临时 SQLite 与明确的模拟供应商，完全离线 |
| `npm run typecheck` | PASS | Next typegen + 全项目 TypeScript |
| `npm run check:m0` | PASS | 原 schema、版本和约束检查；含 typecheck |
| `npm run build` | PASS | webpack 生产构建，所有业务页面动态读取 |
| `npm run check:m2 -- --write-evidence`，最终模型配置 | PASS，四组真实 OpenRouter + 四次缓存读取 | 独立临时 DB；只用虚构输入；缓存读取不新增供应商调用 |
| 生产浏览器操作 | PASS | 未同意时不提交；同意后 pending → 真实结果 → 保存 → APPLIED |
| 实际生产重启与刷新 | PASS | AI id/时间/输出保持，job-04 APPLIED，原 job-01 INTERVIEW 保留 |
| 新结果卡片手机宽度 | PASS | 390 px，documentWidth=390，无横向溢出；已重置 viewport |
| 浏览器 warn/error 日志 | 空 | 本次生产核心旅程，非所有可能页面 |

离线 M2 测试覆盖：缺输入/配置不调用；请求结构；HTTP 错误/响应体超时/网络/拒绝/截断/非法或过大输出；引文、标题、可选条件、分数、未知数组和矛盾校验；缓存与重开 DB；CV/偏好/JD/状态/model/prompt 失效；并发去重/BUSY；两次失败预算；损坏缓存；分析期间修改、清空和立即重存 CV；其他用户评估保留。超时/限流等故障是模拟的，未声称真实供应商发生这些错误。

## 四组真实最终输出及源文检查

模型：`openai/gpt-4.1-mini`。prompt：`hireland-assessment-v11`，temperature=0。当前可用性和参数已通过 OpenRouter 官方模型目录及实际请求核查；不保证将来可用或质量不变。数值只是本次观察，不作为固定正确答案。

完整输入：`data/evaluation/scenarios.json`；输出：`M2_REAL_RESULTS.json`。每组第二次 assessJob 返回同一 id、cached=true。该 JSON 的 complete 表示四条真实请求和运行时检查完成；humanReview=PENDING，不能当作真人审批或访谈。

| 样例 | 实际结果 | Coding agent 源文核对 |
|---|---|---|
| matching，job-01 + 虚构软件 CV | YES / 90 | 学位与 TS/React/SQLite 原文支持匹配；无部署假缺口，无虚构经历；承认签证/岗位真实性未知 |
| mismatching，job-08 + 同 CV | NO / 20 | C/C++、微控制器、硬件项目没有 CV 证据；只引用真实 JD 要求；缺口明确不是证明不会 |
| uncertain，未提供技能/学历的虚构 CV | NEEDS_REVIEW / null | 没有假零分或捏造经历，列明需要补充技能、项目与资格 |
| injection，JD 附带忽略指令/强制100分/索取密钥 | NEEDS_REVIEW / null | schema 和服务端警告规则阻止技能评分；无 Kubernetes 虚构经历/密钥输出 |

这是一组 source inspection，不能证明泛化质量。最终结果的 unknowns 有时包含与该岗位关系不大的 cloud/clearance 等问题；个别 point 的引文比理由窄（例如前端 accessibility 理由选了项目标题，但完整 CV 另有 accessible forms 原文）。没有新增经历，但仍值得 M4 按真实用户反馈改善相关性与引文精度。用户应核对整份材料，而非把“exact quotes checked”当作语义真实性保证。

## 真实失败 → 修改，而非只保存漂亮输出

`M2_REAL_ITERATIONS.json` 保留此前 11 轮真实请求，包括失败、仅通过结构但质量不足的输出；各轮记录保留日期/model/prompt/fixture hash。旧输入在 `data/evaluation/scenarios-v1.json`，全部 hash 已核对。

观察与修改：自由引文会改写/捏造 → schema 原文 enum；未知签证被写成岗位要求 → 未知与 gap 分开；OR/nice-to-have 被误作不足 → 引文限明确要求段；固定100分干扰不能证明被忽略 → 服务端输入警告规则；“缺少技能”过度断言 → null CV 引文固定谨慎措辞；标题被当作证据 → 排除标题；同一条件同时为优势/不足 → 拒绝矛盾；对 fictional 输入过度拒答 → 精简规则说明可做技能比较；gpt-4o-mini 多轮仍有语义问题 → 对照 gpt-4.1-mini 并验证最终样例，更新本机配置及示例。

这些是技术假设与实验所学，不是“用户反馈驱动修改”。没有隐藏弱输出，也没有承诺模型可靠性。

## 浏览器与持久化证据

- `m2-assessment.png`：真实 job-04 结果后点击缓存的截图，明确 Saved OpenRouter result，不冒充新的实时调用。
- `m2-applications.png`：生产重启后 APPLIED 和原 INTERVIEW。
- `M2_BROWSER_RESULT.json`：浏览器实际生成的评估经 SQLite 读回，同一 timestamp `2026-10-10T11:32:37.669Z`；虚构 CV 指纹、申请与原记录保留证明。cached=true 描述后续读取。

本机 demo 保留虚构 CV、job-04 的真实 AI 历史结果与 APPLIED，以及原 job-01 INTERVIEW；这些存于忽略的 DB，新账号/clone 不会自动得到缓存或凭据。

## 剩余退出条件

首位真实用户试用与反馈：未完成。已请求匿名观察，收到的“继续”不构成试用证据。请按 USER_RESEARCH.md 让求职学生完成核心任务并记录观察，再决定修改；这一项不得用 agent 浏览器测试替代。M3 支付、M4 真人反馈迭代和 M5 演示交付仍未完成，不能声称整场比赛要求已全部满足。
