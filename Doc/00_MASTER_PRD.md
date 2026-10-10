# 00 — Hireland 总体产品需求文档（PRD）

版本：v1.0 / HackUCD 2026 / 比赛当天 MVP。语言：中文；技术名称保留英文。

## 1. 背景、问题、产品定位

在爱尔兰寻找 Graduate / Entry-level 机会的学生，通常需要每天打开多个招聘网站、手动辨别岗位是否适合自己的背景、用 Excel/Notion 管理申请状态，以及在散落的群聊中打听 OA、面试、拒信或招聘关闭的进展。

**Hireland** 是一个 **AI-powered, community-driven student job discovery and application tracking platform**：发现岗位、判断是否值得申请、追踪进度、从其他申请者获得最新社区信息。核心价值不是承诺抓到“所有岗位”，而是减少切换多个平台和重复劳动。

### 1.1 首批用户

- 首要用户：爱尔兰大学毕业生、在读硕士、本科高年级，正在寻找 graduate / junior 全职职位的求职者。
- 初期覆盖范围（**可调整的产品假设**）：爱尔兰职位，Technology / Finance / Consulting 三个方向；从少量公开招聘源开始。
- 现有替代方案（需访谈确认）：LinkedIn/公司官网找职位 + Excel/Notion 追踪 + WhatsApp/Reddit/群聊查询状态。
- 用产品的理由：一次完成发现、AI 初筛、申请追踪、社区互动。
- 初始触达：现场参赛学生、UCD 同学、学院或 Career Society；不能将这些假设写成已验证事实。

## 2. 产品目标与非目标

### 2.1 今天必须完成

1. 岗位列表中至少有一批可展示数据；显示来源、申请链接及数据更新时间。
2. 能独立完成 A：刷新/检索岗位、关注公司并模拟触发站内通知。
3. 能独立完成 B：CV 上传/文本提取、OpenRouter 的 CV Match 评分与 Should I Apply YES/NO、申请追踪。
4. 能独立完成 C：岗位话题评论、免费 3 条限制、Stripe Sandbox 付款后实际解锁完整评论。
5. 三个服务均可独立 `localhost` 启动；有本地 demo fixtures；至少一次端到端串联。
6. 有用户反馈、数据来源说明与正常/边界/失败测试证据。

### 2.2 不做

抓全网所有职位；保证岗位一定开放；爬登录后的招聘平台；邮件通知；真实支付；生产级账户/身份系统；简历美化/改写；长期数据采集运营；复杂权限策略；大规模社区运营。

## 3. 核心用户旅程

**Onboarding**：打开 B 模块 → 配置目标职业方向 → 上传 General CV → 保存本地演示用户 Profile。

**Discover & Decide**：打开 A 模块 → 搜索岗位 → 查看 JD、来源和更新时间 → 跳转 B（通过共享 `jobKey`）→ CV Match `score/100`、Should I Apply `YES/NO`。

**Track**：在 B 模块将岗位加入申请看板 → 将状态从 SAVED 更改为 APPLIED/INTERVIEW/OFFER/REJECTED。

**Community**：从 A 模块跳转 C 的岗位话题 → 免费阅读最新 3 条评论 → 可发表评论 → 点 Unlock → Stripe Sandbox Checkout → 成功付款后 C 后端核验并放开该话题的全部评论。

**Watchlist**：在 A 关注公司 → 管理员手动触发数据刷新并发现该公司一个新的 `jobKey` → A 站内提示一条新岗位通知。

## 4. 功能需求及验收标准

### A. Job Discovery + Watchlist（P0）

- A-01 以合法可访问的公开来源或受限公共 API 获取岗位；遇到限制或失败时保留可演示的**显式合成数据**。
- A-02 统一字段：`jobKey`, `company`, `title`, `location`, `category`, `description`, `source`, `sourceUrl`, `firstSeenAt`, `lastCheckedAt`, `status`。
- A-03 按唯一 `jobKey` 去重；相同岗位二次 Refresh 不应重复插入。
- A-04 搜索关键词和筛选公司、地区、职业方向；点击查看完整 JD 与 Apply URL。
- A-05 添加或移除被关注公司；若刷新检测到新职位，对应 Watchlist 生成未读站内提醒。
- A-06 输出标准 JobSnapshot，供 B/C **选择性导入**；A 独立运行不需要 B/C。

### B. AI & Application Tracker（P0）

- B-01 Demo Profile：选择 Technology / Finance / Consulting / Other（支持多选），上传一份 General CV，允许覆盖更新。
- B-02 接受 PDF、DOCX、TXT，抽取纯文本；限制 3 MB；对空文档/不支持的文件报错。
- B-03 `CV Match`：由后端通过 OpenRouter API 处理 CV + JD，生成 0–100 适配分及简短可核查理由（最多 2 个优势、2 个不足），标注“不是面试成功概率”。
- B-04 `Should I Apply`：CV + 职业偏好 + JD，输出 **YES / NO** 以及一句话理由；没有足够输入时返回明确错误，不胡乱给 NO。
- B-05 支持手动粘贴 JD/选择本地种子岗位；即使 A 未启动也能完成所有 AI 功能。
- B-06 用户添加、查看、修改申请记录；状态枚举 `SAVED`, `APPLIED`, `INTERVIEW`, `OFFER`, `REJECTED`；可以删除记录。
- B-07 当用户已有 General CV 时，B 的岗位列表可**自动对首屏最多 3 个岗位**调用 `POST /api/v1/ai/should-apply` 以显示 YES/NO；其余岗位按需计算。按 CV 文本哈希与 JD 哈希缓存，限制并发与 API 成本，不要求全网批量预计算。
- B-08 模型错误/超时/无法解析 JSON 时给明确用户反馈，绝不伪造匹配分数。

### C. Community + Stripe（P0）

- C-01 可以从自带的合成 Demo 话题直接进入评论，**不依赖 A**；支持按公司和职位检索话题；可通过手动输入公司、职位、链接创建话题。
- C-02 所有话题有稳定 `topicId`；从 A 导入的帖子可关联 `jobKey`，不允许以名字猜测同一职位。
- C-03 支持发评论、展示作者演示名、时间与内容；无文本或超长文本要校验。
- C-04 免费用户**仅能从 API 读取最新 3 条**；付费墙必须在后端实施，不是仅在前端隐藏。
- C-05 明码标价 **€0.99 / topic / one-time unlock（仅测试价格）**；支付成功可永久解锁该演示用户在本地 DB 中的该话题评论。
- C-06 Stripe Sandbox Checkout 成功返回后，服务端调用 Stripe API 查询 Session，确认 `payment_status=paid`、price/currency、topicId、userId 均对应后再持久化 Entitlement；重复确认不得重复生成权益。
- C-07 Stripe 按钮本身不能直接设置 Paid；失败、取消、未付款均不得解锁。
- C-08 明确“评论是未经核实的社区反馈，不代表招聘方官方信息”。

### P1（做完 P0 再考虑）

自动每天定时触发 A 的刷新；B 的新岗位 YES/NO 推荐批处理；C 的举报按钮；评论排序/简单关键词过滤；跨模块单页面导航壳。

## 5. Demo 数据要求

- 至少 8–12 个 synthetic 或来源清晰的岗位，包含多个公司、重复职位、缺失发布日期或未知状态等边界样例。
- B 提供一个**完全虚构**且可读的英文 General CV，以及 1 个高匹配和 1 个低匹配 JD。
- C 预置 >= 6 条某个热门话题的**明确标注为虚构**评论，以便显示 3 条免费 + 支付后全部。
- 所有跨模块 seed 记录从 `contracts/demo-jobs.json` 使用**相同 `jobKey`**；真实爬取职位也须遵循共享规范。

## 6. 用户验证与假设检验

- 访谈至少 3 位有求职经验的学生，问题聚焦：每天找职位的来源、用什么追踪、是否查别人申请进度、是否相信 AI 初筛、是否愿意为评论付费。
- 记录真实回答，不暗示其愿意付费；将假设与已验证发现分开。
- 测一个假设，例如“用户愿意使用同一岗位下的申请者评论”或“AI Yes/No 能降低初筛时间”，并据反馈做至少一个产品调整。
- 按同样标准测试正常输入、边界输入、失败输入；汇报不足、数据来源、收费行为和误导风险。

## 7. HackUCD 验收对齐

- **Users First /10**：用户画像、现有替代方式、访谈证据、可触达首批用户。
- **Create with Craft and Beauty /10**：清晰体验、正确业务结果、反馈/异常处理、合理布局。
- **Move with Urgency and Focus /10**：只做端到端闭环和精简演示数据。
- **Stay Curious /10**：用户假设验证、基于反馈迭代、正常/边界/失败测试。
- **AI Usage /10**：运行时真实 OpenRouter 调用 + 展示正确性和失败行为；仅用 AI 写代码不算。
- **Stripe Bonus +5**：真实 sandbox Checkout、成功模拟付款、服务端支付确认、解锁对应产品权益；只展示 Buy 按钮不计分。

## 8. 完成定义（Definition of Done）

三个 App 从干净 clone 可在本地启动；独立 DEMO 各可运行；Git 分支各自 PR 通过；合成内容正确标识；API 合约一致；OpenRouter 和 Stripe 测试流程真实可演示；关键业务路径有明确正常/失败测试；至少一条跨模块旅程能操作到底。

## 9. 待团队确认（不是阻塞当前开发）

1. 初始招聘源具体是哪 1–2 个官方公开接口/许可数据源？如接口不可用，现场只展示 synthetic 数据并清楚标明。
2. 是否维持 €0.99 解锁**单个 Job Discussion Topic** 的一次性付费（本文采用此默认）？
3. 最终演示是否需要真的注册多个账户？本方案出于一天的时间约束，采用**单 Demo 用户**而非正式身份认证。
4. 是否每个新职位都批量 AI 评估？默认按需查询、缓存结果；大规模实时预计算超出当天 MVP。
