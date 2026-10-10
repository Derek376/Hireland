# Module C — Job Community & Stripe（Developer C）

## 模块目标

独立的招聘讨论社区：每个职位/公司可拥有讨论话题。用户可发表评论；免费阅读最新 3 条，付费使用 Stripe Sandbox Checkout 解锁指定话题所有评论。**无需 A 岗位列表，也无需 B 用户/Profile 服务。**

## 负责目录

`apps/job-community/backend/` + `apps/job-community/frontend/`。不得修改 A/B 文件或共同 Contract。

## UI 页面

1. `/`：话题列表，搜索公司和岗位，允许建立自己的话题；启动即有合成 seed 话题。
2. `/jobs/:jobKey/discussion`：通过关联 jobKey 打开话题；本地未导入时显示明确说明，跳去新建话题页面（可把来自地址栏的 company/title 仅作预填写）。
3. `/discussions/:topicId`：评论（最新在上）、发帖表单、免费/已解锁标识、Unlock All Comments 价格 €0.99。
4. `/payment/success`：拿到 session_id → 后端主动 Stripe 校验 → 成功后返回解锁话题。
5. `/payment/cancel`：付款取消，不更改权限。

## Java Backend 核心

- Java Spring Boot 8083 / H2 file + JPA。
- 独立保存 topic、comments、orders、entitlements、可选 JobSnapshot 本地副本。
- `POST /api/v1/jobs/import`，保证相同 jobKey 不产生两个 topic；也提供独立创建话题 API。
- 评论数不少于 6 条的 synthetic demo 话题，预先做好“免费 3 条，付费 6 条”的效果。
- **服务端访问控制**：未购买时，无论 page/size 怎样请求，只能获得最新的前三条，不可直接浏览后续页或通过 API 返回全部 comment body。
- 免费用户可发表评论；评论按时间倒序显示；限制空评论及超长评论；标注“未经官方核实”。

## Stripe Sandbox 正确流程

1. 在 Stripe **test mode** 创建 one-time EUR 0.99 Price（或后端一次性 `price_data` 创建同等金额），不得使用真实卡或真实支付。
2. 前端点按钮调用 `POST /api/v1/payments/checkout {topicId}`；Java 使用 secret key 创建 Stripe Checkout Session `mode=payment`，包含 `client_reference_id=demo-student-1`、metadata `{topicId,userId}`、成功和取消 URL。
3. 用户完成测试付款后返回 `/payment/success?session_id=...`；前端调用 `POST /api/v1/payments/confirm`。
4. **后端通过 Stripe SDK Retrieve Checkout Session**，校验 Session 来源与本地 order、`payment_status=paid`、topicId、userId、金额=99 cents、currency=eur；只有验证完全成功才写入 Entitlement。
5. 再请求 Comment API，从 3 条解锁为全部；本地持久化后刷新仍已解锁。
6. 用户取消、错 session、未付费、仅手动打开 success 页面均不解锁。重复 confirm 幂等。

*生产环境建议 webhook 来保证用户没有返回网站时也能结算权益；但本比赛只在 localhost，服务端 retrieve Session + verify 方案无需公网 webhook。必须确保实际支付成功时状态为 paid。*

## 独立 Demo

不开 A 和 B → 使用 C 自带的 `Google Graduate SWE` 合成话题 → 6 条评论、免费只返回 3 条 → 用户发表评论 → 打开 Stripe Checkout → 用 Stripe 提供的测试卡完成 sandbox 付款 → 后端核验 → 显示全部评论 → 刷新保持权益。

## 测试

- 免费 API `page=1&size=100` 不能获取第 4 条。
- 仅 0–2 条评论时不需要看到 Unlock 按钮（可保持但应说明无更多评论）；没有付费却跳 `/payment/success` 不能解锁。
- 重复确认同一 Checkout Session 只产生一次 entitlement。
- Stripe 失败和错误 priceId 返回清晰错误；不泄露 secret key。

## 交付

独立源码 + README + 评论 seed + Stripe Test Mode 操作说明 + 服务端校验的测试（可 mock Stripe 客户端，不冒充实际完成付款），以及真实 Stripe 成功后的手工验收证明。
