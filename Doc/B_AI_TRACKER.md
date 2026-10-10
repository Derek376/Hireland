# Module B — AI Career Assistant & Tracker（Developer B）

## 模块目标

独立求职助手：本地 Demo 用户上传 General CV，配置职业方向；通过 OpenRouter 对 JD 做 CV Match 和 Should I Apply；管理申请状态。**必须支持手动粘贴 JD，不能依赖 A 的岗位数据。**

## 负责目录

`apps/ai-career-assistant/backend/` + `apps/ai-career-assistant/frontend/`。不得修改 A/C 文件或共同 Contract。

## UI 页面

1. `/onboarding`：目标行业复选框、上传/更新 General CV。
2. `/jobs`：本地 seed 岗位列表 + 粘贴新 JD 的入口。
3. `/jobs/:jobKey`：岗位详情 + `CV Match` 按钮（0–100 + 至多两项 strengths/gaps）+ `Should I Apply?` 按钮（**YES/NO**）+ `Track Job`。
4. `/applications`：申请追踪看板，状态切换和删除；支持手工添加公司/职位。

## Backend 实现

- Java Spring Boot + H2 8082；上传文本解析使用 PDFBox / Apache POI / Java TXT reader（限制 3 MB）。
- `GET/PUT /api/v1/profile`, `POST /api/v1/cv/upload`, `GET /api/v1/cv/status`。
- `POST /api/v1/jobs/import`、`POST /api/v1/jobs/manual`、`GET /api/v1/jobs/{jobKey}`。
- `POST /api/v1/ai/match`、`POST /api/v1/ai/should-apply`。
- Application Tracker CRUD API，详细见共享 Contract。
- OpenRouter 从 backend 请求；对模型要求固定 JSON 输出，解析并校验分数 0–100、精确 `YES/NO`，并在失败时返回真实错误；不可用硬编码评分代替。
- 分数为**match estimate**，不是申请成功概率。明确识别 CV 中没有列出的技能，不能 AI 凭空补全。
- 基于用户 CV hash、JD hash、模型、业务功能类型缓存结果；更新 CV/职位说明时自动失效。
- 内容隐私：只保存在 B 本地 H2；不在日志中打印 CV 原文；仅为了对应匹配请求向 OpenRouter 发送必要文本。

## 两个 AI 功能的具体区别

**CV Match**：用户主动点击，使用 CV + JD，`score: integer 0..100`，`strengths[]`、`gaps[]`，尽量有证据。

**Should I Apply**：根据 General CV、目标行业和 JD，返回精简 `{decision:"YES"|"NO",reason:"..."}`；用户界面重点显示二元决策。输入缺失则 `422 INPUT_INSUFFICIENT`，不要错误地将缺失推断为 NO。

**自动化范围**：用户完成 CV 上传后，B 的岗位列表对首屏最多 **3 个岗位**自动依次调用已有的 Should I Apply API，显示 YES/NO，并缓存结果；其他岗位按需点击判断。严禁对所有用户 × 所有岗位无限量自动调用。

## 独立 Demo 流程

上传合成 CV（例如会 Java/SQL 的学生） → 选 TECH → 从 B 自带 seed 选择 Google Graduate SWE → OpenRouter 返回结构化评分和 YES/NO → 添加 Tracker → SAVED 变 APPLIED。关闭 A/C 不影响流程。

## 测试

- 合法 PDF/DOCX/TXT 解析成功；空文件/超大文件/扩展名不支持被拒绝。
- 同一 CV+JD 重复请求命中缓存；CV 更新后重新计算。
- JSON 结果分数越界/YES-NO 非法，返回 AI_INVALID_RESPONSE；OpenRouter 无效凭据/超时返回 AI_UNAVAILABLE。
- Tracker 不允许非法状态，CRUD 正确且持久化。

## 交付

独立可运行源码、模块 README、合成 CV 测试样例、演示真实 OpenRouter 请求的操作步骤（不提交 token）、至少 1 个 backend 服务测试。
