# 01 — 总体技术架构（Architecture）

## 1. 架构原则

- **真正的开发期独立性**：A、B、C 各有 React UI + Java Spring Boot API + H2 file-based DB + seed 数据，各自能在另外两个模块离线时 Demo。
- **只有 Contract 是共同依赖**：固定 `JobSnapshot` JSON schema、demo-user ID、端口、错误格式、跨模块跳转 URL。**不能共享各自的 JPA Entity 或 H2 文件。**
- **集成通过显式同步**：A 导出 JobSnapshot；集成脚本主动导入 B、C；B/C 不依赖 A 的实时可用性。
- **安全边界**：CV 内容/AI keys/Stripe secret keys 在服务端；Stripe 权益必须由服务端 Stripe 状态验证。
- **无部署**：全部 localhost。线上认证、生产安全、扩展性明确不在 Hackathon MVP 范围。

## 2. 技术选择（已定）

| 层 | 技术 | 理由 |
|---|---|---|
| Backend | **Java 21 + Spring Boot 3.x** | 用户明确要求 Java；成熟的 REST、JPA 和 validation |
| Java Build | Maven Wrapper | 团队启动命令一致 |
| DB | **H2 file mode + Spring Data JPA** | 无需 Postgres server / Docker；本地重启后能保留数据 |
| Frontend | **React + TypeScript + Vite + Tailwind** | 前端独立、快速搭建，兼容 localhost |
| API | JSON REST `/api/v1` | 易测试、易与其他模块对接 |
| AI | OpenRouter REST API, Java HttpClient / Spring RestClient | B 后端调用，私钥不上前端 |
| CV parsing | Apache PDFBox（PDF）、Apache POI（DOCX）、Java NIO（TXT） | Java 原生流程，不依赖 Python 服务 |
| Stripe | Stripe Java SDK + hosted Checkout（test mode） | C 后端创建会话并核验支付状态 |
| Job import | 官网许可公开接口 / 可访问公共数据 + demo JSON | 可靠且合法，避开绕过反爬 |

## 3. Monorepo 目录

```text
Hireland/
  README.md
  .gitignore
  .editorconfig
  contracts/
    job-snapshot.schema.json
    demo-jobs.json
  docs/
    00_MASTER_PRD.md
    01_ARCHITECTURE.md
    02_API_CONTRACT.md
    03_DEV_STANDARDS.md
    modules/
      A_JOB_DISCOVERY.md
      B_AI_TRACKER.md
      C_COMMUNITY_STRIPE.md
    prompts/
      AGENT_A.md
      AGENT_B.md
      AGENT_C.md
  demo/
    sync_jobs.py             # 集成时调用：A export -> B/C import（一次性脚本）
    user-feedback.md         # 访谈与假设的真实记录
    demo-script.md           # 最终演示脚本（集成阶段补充）
  apps/
    job-discovery/
      backend/               # A 独占
      frontend/
    ai-career-assistant/
      backend/               # B 独占
      frontend/
    job-community/
      backend/               # C 独占
      frontend/
```

前端和后端代码都**禁止修改其他开发者的 `apps` 目录**。README/合同先由一位协调者在 `main` 版本冻结，Agent 只能读取。

## 4. 运行拓扑和端口

```text
Browser
  A React  localhost:5173 ---> A Spring localhost:8081 ---> H2 A
  B React  localhost:5174 ---> B Spring localhost:8082 ---> H2 B
                                   |---> OpenRouter (only B backend)
  C React  localhost:5175 ---> C Spring localhost:8083 ---> H2 C
                                   |---> Stripe Sandbox (only C backend)
```

Java CORS 只放行对应前端本地 origin。Vite 使用 `VITE_API_BASE_URL=http://localhost:808{1|2|3}`。全部 backend `server.port` 明确设置。

**本地演示身份**：使用固定 `demo-student-1` 作为演示用户 ID；后端不信任前端的支付成功声明。请勿对外宣称实现了生产级账户与登录。

## 5. 跨模块集成：`JobSnapshot` + 导出/导入

- A 管理真实岗位并提供 `GET /api/v1/jobs/export?limit=50` 返回标准 `JobSnapshot[]`。
- B、C 各自提供 `POST /api/v1/jobs/import`，接受同一 JSON 数组，按 `jobKey` **upsert** 到本地快照表。
- A 前端链接：
  - B: `http://localhost:5174/jobs/{jobKey}` （B 展示 AI 匹配和 Track）。
  - C: `http://localhost:5175/jobs/{jobKey}/discussion` （C 展示话题和评论）。
- **没有 A 也能独立演示**：B、C 在服务启动时 seed `contracts/demo-jobs.json` 的镜像数据（可复制到各自 resources），并支持用户手动创建岗位/讨论话题。
- 集成阶段运行一次 `demo/sync_jobs.py`（需实现）或手动导出/导入；不用每天运行；第三方模块不在线不影响任何一个模块独立功能。
- 任何跨模块新增 API 都必须先更新 `docs/02_API_CONTRACT.md`，再实施。

## 6. 唯一标识及匹配策略

- `jobKey` 为**稳定、不可变、opaque string**，A 对真实职位按 `{source}:{externalJobId}`（若有可靠外部 ID）计算 SHA-256，取前 16 位 hex，格式 `job_<hex>`；无外部 ID 时对规范化岗位 URL 计算，同样格式。
- B/C **不得根据职位名+公司名临时生成另一个 `jobKey` 来冒充同一岗位**；直接保留 A 导出值。
- 官方 API 缺少岗位 ID 时，去掉 URL 中常见追踪参数后生成 hash；变更 URL 可能产生不同 key，应在 UI 标识数据源限制。
- Synthetic fixtures 可使用 `job_demo_...`；真实数据按 hash 算法；每模块都复用同一份 fixtures。
- C `topicId` 是讨论话题自己的 UUID；通过独立字段 `jobKey` 关联岗位。B `applicationId` 是自己业务记录的 UUID。**不要把三者混用**。
- A 更新 JD 时保留同一 `jobKey`；B 在后续导入时依据 JD hash 使旧 AI 缓存失效。

## 7. 本地持久化模型（模块私有）

- A：`jobs(job_key PK, company, title, location, category, description, source, source_url, ... )`、`watched_companies(user_id, company_key, company_name)`、`notifications(id, user_id, job_key, message, read, created_at)`。
- B：`profiles(user_id PK, target_sectors_json)`、`resumes(id, user_id, parsed_text, hash, ...)`、`job_snapshots(job_key PK, ...)`、`applications(id, user_id, job_key nullable, company, title, status, ...)`、`ai_results(user_id, job_key, cv_hash, jd_hash, type, result_json)`。
- C：`job_snapshots(job_key PK, ...)`、`discussion_topics(id PK, job_key nullable UNIQUE, company, title, ...)`、`comments(id, topic_id, user_id, display_name, body, created_at)`、`checkout_orders(id, stripe_session_id UNIQUE, user_id, topic_id, status, amount_cents, currency)`、`entitlements(user_id, topic_id, granted_at, UNIQUE(user_id, topic_id))`。

## 8. 一天内开发和集成的顺序

1. 协调者：10–15 分钟创建目录、合同、fixtures、`.gitignore`，推到 main。
2. A/B/C：各自 feature branch 并行实现，尽早产生第一个可用的独立页面和接口。
3. 各模块独立验证正常、边界和失败路径；确保 `README` 有单独启动方式。
4. PR 合并。合并规则：不允许推未测试的半成品到 main。
5. 一次性导入 A -> B/C 的 JobSnapshot；在 A Job Detail 上增加 B、C 深链。
6. 最终检查 OpenRouter 的**真实调用**与 Stripe 的**实际 Sandbox 成功付款+解锁**；准备备用演示数据和 3 个用户访谈记录。

## 9. 主要风险与回退策略

- 招聘网站阻断/反爬：**不要绕过**；展示许可的 API 数据或合成职位并注明 synthetic。不可宣称“全部岗位实时开放”。
- API rate limit / AI 超时：B 显示暂时不可用及可重试；已有合法缓存可以展示并标注。
- Stripe key/账号未就绪：C 评论功能照常运行，但不能宣称 Stripe Bonus 已完成；先确保 test mode Checkout 可用。
- 模块整合失败：分别启动并独立演示；主打三模块可以并行交付，不能用模拟支付成功冒充完成 bonus。
