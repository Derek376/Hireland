# 03 — 开发规范与三人协作约定

## 1. 不可谈判的规范

1. 每个开发者**只负责**自己对应的 `apps/<module>/`；不修改其他模块目录。
2. 每个模块自带 Spring Boot API、React UI、H2 文件数据库、种子数据、局部 README、单元/集成测试；无需启动其他模块。
3. 共享 JSON 数据契约与路由详见 `02_API_CONTRACT.md`。修改契约前必须征得三人一致同意。
4. 所有 API 路径使用 `/api/v1/...`，全部 JSON 用 camelCase；ID 不允许假设为整型。
5. 不让 OpenRouter 或 Stripe secret key 进入 Vite 环境变量或提交仓库；第三方服务调用只通过 Java 后端。
6. 本地测试数据与真实外部数据、AI 真结果与模拟结果，须在 UI 和 Demo 中明确区分。
7. 错误不得静默吞掉；前端必须展示 loading、empty、error states。
8. 所有 JS/Java 类型匹配，后端金额以整数 cent 储存，不能使用 float 计算支付金额。
9. H2 数据文件、`node_modules`, `.env`, Maven `target`, Vite `dist`, 上传的 CV、凭据文件等加入 `.gitignore`。
10. 未经官方授权不要强制爬取需要登录的平台，也不规避反爬和使用条款。

## 2. 编码风格

- Java：分层 `controller` / `service` / `repository` / `entity` / `dto` / `config` / `exception`；Controller 不写业务逻辑；`@Valid` 校验输入；Spring Data JPA；禁止直接返回持久化 Entity（使用 DTO）。
- TypeScript：`strict`；按 `pages`, `components`, `api`, `types` 分类；统一 fetch client 处理响应/错误；不要写 `any` 掩盖类型问题。
- UI：页面清晰、操作可验证，至少有加载、空列表、失败提示，禁用按钮需明确原因。Tailwind 不需要复杂设计系统。
- 日志：记录请求 ID、步骤与失败原因，但**不得打印完整 CV、API 密钥、支付客户信息**。
- 后端仅用 Java 21（用户要求），不得引入第二个 Python/FastAPI 业务后端；`demo/sync_jobs.py` 只允许作为一次性开发辅助脚本。

## 3. Git 分支与 PR

```text
main
feature/job-discovery         # A
feature/ai-tracker            # B
feature/community-payment     # C
```

- 三人从同一个固定 main commit 创建分支；尽量只改自己模块目录。
- `git status` 确认没有秘密信息，`git diff --check` 确认格式后提交。
- 每个 PR 必须写：新增功能、如何本地运行、接口示例、测试完成情况、已知限制、演示截图或录屏（可选）。
- 合并冲突仅由涉及的模块开发者解决；公共 contracts 出现冲突时先协调再修改。
- 不许 AI Agent 自动 force-push、删除别人的分支、改 GitHub Settings 或更改其他模块。

## 4. 环境变量和配置

各模块提供 `.env.example` 或 `application-local.example.yml`，只放变量名和示例占位值；自己本地使用不纳入 Git 的配置文件。建议使用系统环境变量注入 Spring Boot。

A：`JOB_DATA_SOURCE` / `JOB_SOURCE_API_URL`（如需要）；不需要密钥的公开源优先。

B：`OPENROUTER_API_KEY`、`OPENROUTER_MODEL`（设置为本人测试过的可用模型名称）、`VITE_API_BASE_URL=http://localhost:8082`。

C：`STRIPE_SECRET_KEY`（**sk_test_***）、`STRIPE_PRICE_ID`（仅 **test mode price**）、`STRIPE_SUCCESS_URL=http://localhost:5175/payment/success?session_id={CHECKOUT_SESSION_ID}`、`STRIPE_CANCEL_URL=http://localhost:5175/payment/cancel`、`VITE_API_BASE_URL=http://localhost:8083`。

**价格约定**：€0.99 / 话题 / 一次性解锁，不支持订阅；确保 Stripe Price 符合 EUR 99 cents、一次性付款。

## 5. 本地启动与端口

每模块后端：在 `apps/<module>/backend/` 执行 `./mvnw spring-boot:run`（Mac/Linux）；前端：在 `apps/<module>/frontend/` 执行 `npm install && npm run dev`。端口固定：A 8081/5173、B 8082/5174、C 8083/5175；对应 README 应列出 Java 21/Node 版本要求。

推荐 H2：`spring.datasource.url=jdbc:h2:file:./data/hireland-<module>`，`spring.jpa.hibernate.ddl-auto=update`。这是**仅 Demo** 的便利配置，不作为生产迁移方案。

## 6. 代码和功能验收

每个模块必须提供：

- `GET /api/v1/health` 返回 `{ "status": "ok", "module": "..." }`。
- 可直接运行的 1 条主要用户流程（不是全静态图）。
- 1 个以上通过的核心服务测试；验证参数为空、缺字段、外部服务失败，返回统一 error JSON。
- 完整 API 文档：至少在 README 中给出 cURL 样例；与共享契约一致。
- 被停掉其他两项服务时，其自身 Demo 不受影响。

## 7. 关键测试矩阵

| 模块 | 正常 | 边界 | 失败 |
|---|---|---|---|
| A | 新职位进入列表且通知 Watchlist | 相同 `jobKey` 重复抓取不重复插入 | 数据源 429/500 时前端正确提示或回退 seed |
| B | 有效 CV+JD 真实 OpenRouter 生成 JSON 与分数 | 空 CV、JD 太短、非英文 CV | OpenRouter 超时/非法 JSON 返回结构化错误，不返回编造结果 |
| C | 第 4 条评论付费前不可读取，支付后可读 | 无评论/仅 2 条/重复支付确认 | 取消/失败/伪造 session 或仅前端跳转不能解锁 |

## 8. 比赛证据

- 访谈 3 位学生，记录匿名化问题和回答；区分“推测”与“真实观察”。
- 合成数据页面醒目标为 Sample Data；真实职位带 Source URL 与 lastCheckedAt。
- AI Score 注明只是匹配度估算，不是成功率；社区讨论不是官方状态。
- Stripe 实际跑一笔 Sandbox 成功付款且服务器确认并更新授权；展示受限访问在支付前/后的区别。
