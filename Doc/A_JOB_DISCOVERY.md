# Module A — Job Discovery & Watchlist（Developer A）

## 模块目标

独立 Java/React 招聘信息聚合器：让毕业生浏览爱尔兰 Graduate / Junior 职位、按职位/公司搜索、订阅心仪公司并收到新职位站内提醒。**绝不依赖 B/C 运行。**

## 负责的目录

`apps/job-discovery/backend/` + `apps/job-discovery/frontend/`；读取 `contracts/`，但不要修改共享 Contract 或 B/C 文件。

## UI 页面

1. `/`：列表首页，职位搜索输入框，地区/行业/公司筛选，职位卡片和 Apply 来源链接；标注 synthetic / lastCheckedAt。
2. `/jobs/:jobKey`：完整 JD、来源、关注公司按钮，导航到 B 的 CV Match/Tracker 与 C 的 Discussion 深链接（即使其他模块关闭，A 仍能展示自己的 JD）。
3. `/watchlist`：已关注公司，取消关注。
4. `/notifications`：新岗位站内提醒；可标记已读。

## Backend 核心实现

- Java 21 / Spring Boot 3.x / Spring Web + JPA + Validation + H2 file。
- `GET /api/v1/jobs`, `GET /api/v1/jobs/{jobKey}`, `GET /api/v1/jobs/export`, `POST /api/v1/jobs/refresh`。
- `GET /api/v1/companies`, `GET/POST/DELETE /api/v1/watchlist`, `GET/PATCH /api/v1/notifications`。
- `JobSourceClient` 抽象，使 seed 数据和真实数据源切换不影响服务其余部分；优先支持 1 个允许公开访问的 JSON 接口或官方开放职位 feed。无可靠来源时先用 seed，**不要偷偷把 synthetic 当真实职位**。
- 统一规范化抓取结果，唯一索引 jobKey，允许刷新更新 description / lastCheckedAt，保留首次发现时间。
- 处理 source error / timeout / 429；不绕过登录和反爬限制。
- Watchlist 站内提醒触发条件：Refresh 新增的 `jobKey` 其 companyKey 在该用户 Watchlist；每 `(userId, jobKey)` 最多一条通知。为了现场可演示，可设计**明确标注 SYNTHETIC 的 Demo Source**：首次加载 9 条岗位，用户关注公司后手动 Refresh，才将第 10 条模拟为新增；不得将其称为真实新开岗位。

## 具体 P0 验收

1. 后端 8081、前端 5173 可独立启动。
2. Job 列表有至少 4 条合成 Demo 数据；通过关键词筛选出正确职位。
3. 重复刷新已存在职位不重复；新公司关注之后新增相应职位会生成提醒。
4. 可以为至少 1 个合法公共来源演示成功拉取；若无稳定来源，明确标明 limited demo data，不能冒充已完成全网爬取。
5. `/jobs/export` 返回符合 shared JSON schema 的**原生数组**（方便 B/C 导入）。
6. 不启动 B/C 时所有 A 内部页面仍能运行。

## 建议最小单测

- `JobKeyGeneratorTest`：同一个 source/external ID 稳定生成相同 key。
- `JobRefreshServiceTest`：去重、更新时间、数据源失败。
- `WatchlistNotificationServiceTest`：只有关注公司有新职位才有通知，重复 refresh 不重复提醒。

## 交付

应用源码、模块 README（启动步骤、env、cURL）、种子数据、至少 1 个服务测试、说明不能保证数据实时性或“所有开放岗位”。
