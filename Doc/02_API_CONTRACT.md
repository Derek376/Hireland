# 02 — API Contract（所有 Agent 必须遵守）

**冻结原则**：下述路由、JSON keys、枚举和错误结构是三个模块之间的唯一共同约束。每个模块独立运行；只通过统一 `JobSnapshot` 关联。不共享 DB，也不直接读取别人的 Entity。

## 1. 统一标准

- API Base：各模块自身 `http://localhost:808{1,2,3}/api/v1`；响应类型 `application/json`。
- 日期时间：ISO 8601 UTC 字符串（如 `2026-10-10T10:00:00Z`）；未知为 `null`，不能编造。
- JSON：camelCase；字符串 ID；页号从 `0` 开始；默认 page size = 20，上限 100。
- Status：200（读取/更新）、201（创建）、400（校验失败）、404（不存在）、409（冲突）、422（输入不足）、429（限流）、502/503（第三方失败）。
- 健康检查：各模块 `GET /api/v1/health`，响应 `{ "status": "ok", "module": "job-discovery|ai-career-assistant|job-community" }`。
- 统一失败响应示例：

```json
{
  "error": {
    "code": "CV_REQUIRED",
    "message": "Please upload your CV first.",
    "requestId": "req_demo_123"
  }
}
```

## 2. 共享对象 `JobSnapshot`（唯一跨服务实体）

```json
{
  "jobKey": "job_demo_google_grad_swe_001",
  "company": "Google",
  "title": "Graduate Software Engineer",
  "location": "Dublin, Ireland",
  "category": "TECH",
  "description": "Example job description, explicitly synthetic.",
  "source": "SYNTHETIC",
  "sourceUrl": "https://example.com/jobs/google-graduate-swe",
  "postedAt": null,
  "firstSeenAt": "2026-10-10T08:00:00Z",
  "lastCheckedAt": "2026-10-10T08:00:00Z",
  "status": "UNKNOWN",
  "synthetic": true
}
```

**字段规定**：`jobKey/company/title/description/source/sourceUrl/firstSeenAt/lastCheckedAt/status/synthetic` 必填；`location` 可为 `"Remote"` 或 `"Unknown"`；`category` 枚举 `TECH, FINANCE, CONSULTING, OTHER`；`status` 枚举 `OPEN, CLOSED, UNKNOWN`；`postedAt` 可 null。`sourceUrl` 为真实职位时必须是实际来源；Synthetic 可 `example.com` 且 `synthetic=true`。

**jobKey**：真实职位用官方外部唯一 ID 或规范化 URL 生成 `job_` + SHA256 的前 16 位十六进制；Synthetic `job_demo_` 前缀。B/C 原样保留 A 的 key，禁止以职位名猜测是否同一职位。

## 3. A — Job Discovery（port 8081）

### `GET /api/v1/jobs`

Query：`query`, `company`, `location`, `category`, `page=0`, `size=20`，任意可选。

```json
{
  "items": [{"jobKey":"job_demo_google_grad_swe_001","company":"Google","title":"Graduate Software Engineer","location":"Dublin, Ireland","category":"TECH","description":"Example job description, explicitly synthetic.","source":"SYNTHETIC","sourceUrl":"https://example.com/jobs/google-graduate-swe","postedAt":null,"firstSeenAt":"2026-10-10T08:00:00Z","lastCheckedAt":"2026-10-10T08:00:00Z","status":"UNKNOWN","synthetic":true}],
  "page": 0,
  "size": 20,
  "total": 1
}
```

### `GET /api/v1/jobs/{jobKey}`
返回完整单个 `JobSnapshot`，不存在为 404。

### `GET /api/v1/jobs/export?limit=50`
返回原生 `JobSnapshot[]`（不是分页包装），用于 B/C 导入；1–100 条。

### `POST /api/v1/jobs/refresh`
手动拉取指定合法来源，不等待其他模块；返回：

```json
{"newJobs": 3, "updatedJobs": 2, "unchangedJobs": 12, "failedSources": 0, "refreshedAt": "2026-10-10T10:00:00Z"}
```

### `GET /api/v1/companies`
返回 `{ "items": [{ "companyKey": "google", "name": "Google" }] }`；companyKey 是标准化 lowercase slug。

### `GET /api/v1/watchlist`、`POST /api/v1/watchlist`
后者 Request `{ "companyKey": "google", "companyName": "Google" }`，返回 201 或已关注时 200；示例返回 `{ "companyKey": "google", "companyName": "Google", "watched": true }`。

### `DELETE /api/v1/watchlist/{companyKey}`
成功 204；允许重复删除（204）。

### `GET /api/v1/notifications`
```json
{"items":[{"id":"note_001","jobKey":"job_demo_google_grad_swe_001","company":"Google","message":"New Google position: Graduate Software Engineer","read":false,"createdAt":"2026-10-10T10:00:00Z"}]}
```

### `PATCH /api/v1/notifications/{id}/read`
成功 `{ "id": "note_001", "read": true }`。

## 4. B — AI Career Assistant（port 8082）

### `GET /api/v1/profile`、`PUT /api/v1/profile`
PUT Request `{ "targetSectors": ["TECH", "FINANCE"], "preferredLocations": ["Dublin"] }`，返回 `{ "userId": "demo-student-1", ...body }`。最少一个 sector。

### `POST /api/v1/cv/upload`
Multipart，字段名 `file`；只允许 PDF、DOCX、TXT，<=3 MB；后端解析，保存文本，返回：

```json
{"cvId":"cv_001","fileName":"general_cv.pdf","characterCount":2314,"uploadedAt":"2026-10-10T10:00:00Z"}
```

### `GET /api/v1/cv/status`
`{ "exists": true, "cvId": "cv_001", "fileName": "general_cv.pdf", "uploadedAt": "..." }`；无 CV：`{ "exists": false }`。

### `POST /api/v1/jobs/import`
Request 原生 `JobSnapshot[]`，按 jobKey upsert；返回 `{ "imported": 5, "updated": 0, "skipped": 0 }`；独立运行时使用 B 自带 fixtures。

### `POST /api/v1/jobs/manual`
方便 B 单独 Demo，Request：`{ "company": "Example Ltd", "title": "Data Analyst", "location": "Dublin", "category": "TECH", "description": "..." }`；返回 B 本地构造的 `JobSnapshot`，使用 `job_manual_<uuid>`，`synthetic=true`, `status=UNKNOWN`, `source=MANUAL`，`sourceUrl` 可为空字符串仅对 MANUAL 允许。

### `GET /api/v1/jobs/{jobKey}`
返回 B 本地复制的 `JobSnapshot`。B 独立 Demo 不依赖 A。

### `POST /api/v1/ai/match`
Request `{ "jobKey": "job_demo_google_grad_swe_001" }`，前置条件：已有可解析 CV 和本地 jobKey。响应：

```json
{
  "jobKey":"job_demo_google_grad_swe_001",
  "score":78,
  "strengths":["Java experience", "SQL experience"],
  "gaps":["Kubernetes is not mentioned"],
  "model":"configured-openrouter-model",
  "cached":false,
  "disclaimer":"Match score is an estimate, not an interview probability."
}
```

Score 为 0–100 整数；strengths/gaps 为 0–2 项；只能从实际 CV/JD 证据产生，绝不能凭空捏造技能。API 请求时在服务端调用 OpenRouter，确认使用的是实际模型；已缓存响应必须保留来源说明。

### `POST /api/v1/ai/should-apply`
Request `{ "jobKey": "job_demo_google_grad_swe_001" }`，返回：

```json
{
  "jobKey": "job_demo_google_grad_swe_001",
  "decision": "YES",
  "reason": "The role aligns with your technical background and selected target sector.",
  "cached": false
}
```

`decision` **仅 `YES` 或 `NO`**；CV/JD 不足时返回 **HTTP 422 + `INPUT_INSUFFICIENT`**，不能伪造 NO；OpenRouter 服务不可用时 503 `AI_UNAVAILABLE`。

### Application Tracker

- `GET /api/v1/applications` → `{ "items": [{ "id":"app_001", "jobKey":"...", "company":"Google", "title":"Graduate Software Engineer", "status":"APPLIED", "notes":"", "updatedAt":"..." }] }`
- `POST /api/v1/applications` → `{ "jobKey": "...", "company":"Google", "title":"Graduate Software Engineer", "status":"SAVED", "notes":"" }`；`jobKey` 可 `null`，支持完全独立的手动添加。
- `PATCH /api/v1/applications/{id}` → `{ "status": "INTERVIEW", "notes": "OA completed" }`。
- `DELETE /api/v1/applications/{id}` → 204。
- status 枚举只能是：`SAVED, APPLIED, INTERVIEW, OFFER, REJECTED`。

## 5. C — Community & Stripe（port 8083）

### `POST /api/v1/jobs/import`
Request 原生 `JobSnapshot[]`；C 本地保存快照，按 jobKey 创建或关联话题；返回 `{ "imported": 5, "updated": 0, "skipped": 0 }`。与 A/B 数据库不共享。

### `GET /api/v1/discussions?query=&company=`
`{ "items": [{ "topicId": "topic_001", "jobKey":"job_demo_google_grad_swe_001", "company":"Google", "title":"Graduate Software Engineer", "commentCount":6 }] }`。

### `POST /api/v1/discussions`
Request `{ "jobKey": null, "company": "Google", "title": "Graduate Software Engineer", "sourceUrl": "https://example.com/jobs/sample" }`；返回 `{ "topicId": "topic_001", "jobKey": null, ... }`。已有相同关联 jobKey 时返回现存 topic；无 jobKey 的手动话题生成独立 `topicId`。

### `GET /api/v1/discussions/by-job/{jobKey}`
返回按 `jobKey` 关联的 Topic；本地找不到返回 404（已导入后应能返回）。

### `GET /api/v1/discussions/{topicId}/comments?page=0&size=20`
免费用户强制只返回按 `createdAt DESC, id DESC` 的前三条，**忽略试图绕开配额的 page/size**；付费后允许分页。

```json
{
  "items": [{ "id": "comment_001", "displayName": "Student A", "body": "Received an OA invitation (unverified user report).", "createdAt": "2026-10-10T09:00:00Z" }],
  "total": 6,
  "visibleLimit": 3,
  "unlocked": false,
  "hasMore": true,
  "page": 0,
  "size": 3
}
```

### `POST /api/v1/discussions/{topicId}/comments`
Request `{ "displayName":"Student A", "body":"Received an OA invitation today." }`；免费用户也能发表评论；body 1–1000 字；返回新建 `Comment`（201）。

### `GET /api/v1/payments/entitlement?topicId=topic_001`
返回 `{ "topicId":"topic_001", "userId":"demo-student-1", "unlocked":false }`。

### `POST /api/v1/payments/checkout`
Request `{ "topicId": "topic_001" }`；C 后端创建 **Stripe test mode** Checkout Session（`mode=payment`），把 `topicId` / `userId` 写入 Stripe Session metadata；成功：

```json
{
  "checkoutUrl":"https://checkout.stripe.com/c/pay/cs_test_example",
  "sessionId":"cs_test_example",
  "amountCents":99,
  "currency":"eur",
  "topicId":"topic_001"
}
```

### `POST /api/v1/payments/confirm`
Request `{ "sessionId": "cs_test_example" }`；**必须由 Java 后端调用 Stripe API 重新取 Checkout Session**，核实 `payment_status=paid`、该 Session 的 metadata `topicId`、`userId` 与本地订单/演示用户匹配、金额和币种为 99 EUR cents，成功后幂等插入授权。

成功：`{ "paid": true, "topicId": "topic_001", "unlocked": true }`。未成功付款：返回 409 `PAYMENT_NOT_COMPLETED`；错误归属 / 价格：403/409（见统一 error）。禁止通过前端 querystring 的 `success=true` 直接开通权益。

### Stripe 页面路径（C React）

- `/payment/success?session_id={CHECKOUT_SESSION_ID}` ：此页调用后台 `/payments/confirm`，显示核验中与结果，然后跳回该 topic。
- `/payment/cancel`：仅显示取消，不改变权限。
- 后续如有时间可补 webhook + Stripe CLI 进一步提高可靠性，但**今日基础要求可通过后端调用 Stripe API 核验 Session 来完成**。

## 6. 跨模块导入/导出约定

1. `GET http://localhost:8081/api/v1/jobs/export?limit=50` 返回 `JobSnapshot[]`。
2. `POST http://localhost:8082/api/v1/jobs/import` 接收数组，B 本地 upsert。
3. `POST http://localhost:8083/api/v1/jobs/import` 接收同一数组，C 本地 upsert，并产生 Discussion Topic。
4. `jobKey` 保持完全一致。导入失败不能破坏原有数据。重复导入必须幂等。
5. A 的「CV Match/Track」与「Discussion」按钮分别跳 `http://localhost:5174/jobs/{jobKey}`、`http://localhost:5175/jobs/{jobKey}/discussion`。B/C 发现未知 jobKey 应显示“尚未导入，请使用本地手动输入”，不能假装已有。

## 7. 必须实现的公共错误码（可扩展）

`VALIDATION_ERROR`, `NOT_FOUND`, `CV_REQUIRED`, `UNSUPPORTED_CV_FORMAT`, `CV_TOO_LARGE`, `INPUT_INSUFFICIENT`, `AI_UNAVAILABLE`, `AI_INVALID_RESPONSE`, `JOB_SOURCE_UNAVAILABLE`, `PAYMENT_NOT_COMPLETED`, `PAYMENT_SESSION_INVALID`, `PAYMENT_CONFIGURATION_ERROR`。

## 8. contract-first 的边界

上面每个 `POST`/`GET` 的请求与响应是“对外契约”；模块内部 endpoint 可扩展，但不能不经协商改变这些字段。允许添加**新字段**而不删除、改名或改变已有字段的含义。
