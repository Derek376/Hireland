# C — Job Community Backend

本次只实现后端，按 `Doc/AGENT_C.md`、`Doc/C_COMMUNITY_STRIPE.md` 和 `Doc/02_API_CONTRACT.md` 开发。不包含 React 页面，不依赖 A/B，也不需要 Docker。

技术栈：Java 21、Spring Boot 3.5.6、Maven Wrapper 3.9.11、Spring Web / Validation / Data JPA、H2 file database、Stripe Java SDK 34.0.0。

## 启动

从仓库根目录运行：

```bash
cd apps/job-community/backend
./mvnw spring-boot:run
```

Windows 使用 `mvnw.cmd spring-boot:run`。首次运行需要网络下载 Maven 和依赖，不需要安装全局 Maven。请使用 Java 21；本后端不需要 Node。

服务地址为 `http://localhost:8083`，仅监听本机 `127.0.0.1`。默认数据库保存在 **backend 工作目录** 的 `data/hireland-job-community.mv.db`，重启保留话题、评论、订单和权益。启动命令应始终在 backend 目录执行。

没有 Stripe 密钥也能运行话题和评论功能；创建 Checkout 时返回 `503 PAYMENT_CONFIGURATION_ERROR`。

```bash
curl http://localhost:8083/api/v1/health
```

返回 `{"status":"ok","module":"job-community"}`。

也可以打包后启动：

```bash
./mvnw package
java -jar target/job-community-0.0.1-SNAPSHOT.jar
```

## 目录与文件

```text
job-community/
  .gitignore
  README.md
  backend/
    pom.xml
    mvnw / mvnw.cmd / .mvn/wrapper/maven-wrapper.properties
    .env.example
    src/main/java/com/hireland/community/
      CommunityApplication.java
      config/       # 本地 CORS、服务端固定 demo 身份、requestId、幂等种子数据
      controller/   # 健康检查、话题与评论、岗位导入、付款
      dto/          # API records 和 JobSnapshot
      entity/       # 五种私有 JPA 实体
      repository/   # 五种 Repository，话题付款锁
      service/      # 社区、导入、付款、Stripe SDK adapter、输入规则
      exception/    # 统一 error JSON
    src/main/resources/
      application.yml
      demo-jobs.json
    src/test/java/com/hireland/community/
      ApiIntegrationTest.java
      StripeConfigurationTest.java
      DemoSeedTest.java
      DatabaseRestartTest.java
```

数据库不共享给 A/B。`topicId` 是话题自己的字符串 ID，`jobKey` 是保持原样的岗位关联键。前端提供的 `userId` 不参与授权；当前只使用后端固定的 `demo-student-1`，没有正式身份认证。

## 独立 Demo 数据

启动时提供 3 个明确标注为 synthetic 的话题：

- Google / Graduate Software Engineer：6 条虚构评论。
- Microsoft / Graduate Software Engineer：2 条虚构评论。
- Stripe / Graduate Engineer：0 条评论。

种子不会在重启时重复插入，也不会覆盖已经导入的岗位快照。话题和评论 API 带 `disclaimer`；种子话题和评论带 `synthetic: true`，评论正文也标有 `Synthetic demo`。后续前端需要把这些提示显示出来。

## API

API Base：`http://localhost:8083/api/v1`。JSON camelCase，ID 是字符串，时间为 ISO 8601 UTC。Controller 只返回 DTO。

| Method | Path | 行为 |
|---|---|---|
| GET | `/health` | 健康检查 |
| GET | `/discussions?query=&company=` | 按公司/职位搜索；返回 `items` |
| POST | `/discussions` | 独立创建话题；已有相同 jobKey 返回现有话题 |
| GET | `/discussions/by-job/{jobKey}` | 根据已关联 jobKey 找到话题；未知为 404 |
| GET | `/discussions/{topicId}` | 单个话题详情，新增的便利接口 |
| GET | `/discussions/{topicId}/comments?page=0&size=20` | 免费预览或已解锁分页 |
| POST | `/discussions/{topicId}/comments` | 免费用户也可评论；body 1–1000，displayName 1–80 |
| POST | `/jobs/import` | 接受原生 JobSnapshot 数组，批次最多 100 条，原子 upsert |
| GET | `/payments/entitlement?topicId=...` | 读取当前 demo 用户的话题权益 |
| POST | `/payments/checkout` | 创建 Stripe 测试 Checkout，返回 URL/sessionId |
| POST | `/payments/confirm` | 向 Stripe 重新查询并核验 session，幂等授权 |

免费用户无论传入什么整数 page/size，始终只从数据库读取最新 3 条，按 `createdAt DESC, id DESC` 排序，响应 page=0、size=3、visibleLimit=3。不会把隐藏评论正文返回给客户端。`total` 只是总条数；`hasMore` 表示存在隐藏评论。

解锁后 page 从 0 开始，size 默认 20、有效范围 1–100。`visibleLimit: null` 表示不再受免费条数限制；hasMore 是正常分页的后续页标志。

所有评论报告都未经核实，不代表招聘方官方信息。API 报错示例：

```json
{"error":{"code":"PAYMENT_NOT_COMPLETED","message":"Payment has not completed. This topic remains restricted.","requestId":"req_..."}}
```

错误响应包含 `X-Request-Id`，不回传 Stripe 密钥或原始 Stripe 异常。正常输入错误返回 400，未知实体 404，未付费或会话不匹配 409，Stripe 配置/外部服务失败 503。

### 社区接口手工检查

```bash
curl 'http://localhost:8083/api/v1/discussions?query=Google'
curl http://localhost:8083/api/v1/discussions/by-job/job_demo_google_grad_swe_001
```

把返回的 topicId 填到下面变量中：

```bash
TOPIC_ID='topic_replace_with_returned_id'

# 即使请求下一页和 100 条，也只能返回最新 3 条
curl "http://localhost:8083/api/v1/discussions/$TOPIC_ID/comments?page=1&size=100"

# 发表评论：201；之后该条进入最新三条
curl -X POST "http://localhost:8083/api/v1/discussions/$TOPIC_ID/comments" \
  -H 'Content-Type: application/json' \
  -d '{"displayName":"Demo Student","body":"Synthetic manual demo: my example application is under review."}'

# 手动创建独立话题，不需要 A 的岗位
curl -X POST http://localhost:8083/api/v1/discussions \
  -H 'Content-Type: application/json' \
  -d '{"jobKey":null,"company":"Example Ltd","title":"Graduate Analyst","sourceUrl":"https://example.com/jobs/analyst"}'

# 导入本模块的合成岗位；已有 seed 应返回 skipped=3
curl -X POST http://localhost:8083/api/v1/jobs/import \
  -H 'Content-Type: application/json' \
  --data-binary @src/main/resources/demo-jobs.json
```

导入按照原样 jobKey 匹配，绝不根据公司/职位名推断同一职位；更新快照保留原 topicId、评论和权益。整个批次先验证再修改，失败会回滚。数据库唯一约束防止并发插入重复 jobKey；并发冲突返回 409，可重试。

## Stripe 测试配置

复制 `backend/.env.example` 为 `.env`，在本地编辑，填入自己的 **sk_test_** 密钥。本模块忽略 `.env`、H2 数据文件、target 和本地依赖缓存。Spring 不会自动读取 `.env`，需从 backend 目录将本地文件导出到环境：

```bash
set -a
source .env
set +a
./mvnw spring-boot:run
```

| 环境变量 | 默认/用途 |
|---|---|
| `STRIPE_SECRET_KEY` | 无默认密钥；只接受 sk_test_，live/public key 会被拒绝 |
| `STRIPE_PRICE_ID` | 可选。为空时后端创建一次性 EUR 99 cents 的 price_data；填写时验证 active、test mode、EUR 99 cents、one_time |
| `STRIPE_SUCCESS_URL` | `http://localhost:5175/payment/success?session_id={CHECKOUT_SESSION_ID}` |
| `STRIPE_CANCEL_URL` | `http://localhost:5175/payment/cancel` |
| `COMMUNITY_FRONTEND_ORIGIN` | CORS 只允许 `http://localhost:5175` |
| `COMMUNITY_SEED_ENABLED` | 默认 true，可设 false 禁用初始化演示数据 |
| `COMMUNITY_DB_URL` | 默认 `jdbc:h2:file:./data/hireland-job-community` |
| `COMMUNITY_DB_PASSWORD` | 本地 demo 默认空 |

本次没有前端。若要现在手工验收测试付款，可把本地 `.env` 的两个跳转 URL 临时改为后端健康检查：

```dotenv
STRIPE_SUCCESS_URL='http://localhost:8083/api/v1/health?session_id={CHECKOUT_SESSION_ID}'
STRIPE_CANCEL_URL='http://localhost:8083/api/v1/health?payment=cancel'
```

健康检查只用于提供有效的返回地址，**不会自动确认付款或解锁**。前端接入后恢复默认的 5175 地址，并由成功页面调用 confirm。

### 真实 Stripe Sandbox 手工验收

1. 在 Stripe 测试环境取得自己的测试 secret key，按上面的步骤配置并重新启动。
2. 选择还没有购买过的话题。使用 comments 和 entitlement API 确认免费只能看到 3 条，unlocked=false。
3. 创建 Checkout：

```bash
curl -X POST http://localhost:8083/api/v1/payments/checkout \
  -H 'Content-Type: application/json' \
  -d "{\"topicId\":\"$TOPIC_ID\"}"
```

4. 保存返回的 sessionId，并在浏览器打开 checkoutUrl。确认页面金额是 €0.99，用 Stripe 官方测试卡 `4242 4242 4242 4242`、未来有效日期和任意三位 CVC 完成测试购买。不要使用真实卡。
5. 返回后手工调用 confirm。后端会通过 Stripe SDK Retrieve Session 核验，不依赖地址栏的成功标记：

```bash
SESSION_ID='cs_test_replace_with_returned_session_id'
curl -X POST http://localhost:8083/api/v1/payments/confirm \
  -H 'Content-Type: application/json' \
  -d "{\"sessionId\":\"$SESSION_ID\"}"

curl "http://localhost:8083/api/v1/payments/entitlement?topicId=$TOPIC_ID"
curl "http://localhost:8083/api/v1/discussions/$TOPIC_ID/comments?page=0&size=100"
```

6. 应返回 paid=true、unlocked=true，评论可读全部 6 条（如果之前添加过评论则更多）。重复 confirm 仍只有一份权益。
7. 停止后端并从同一 backend 目录重启，重复查询，仍然保持解锁。
8. 另选未解锁话题，创建新 Checkout 后取消，或在未付款时调用 confirm：不得解锁；未付款 confirm 返回 409 PAYMENT_NOT_COMPLETED。伪造 cs_test_ session 返回 PAYMENT_SESSION_INVALID；仅附加 success=true 也不会改变权限。
9. 保留 Stripe Dashboard 的测试交易、确认响应、前后评论数量和重启结果作为实际验收证据。本仓库没有宣称已经完成真实 Sandbox 购买。

核验包括：本地订单保存的 Session ID、测试模式、mode=payment、client_reference_id、metadata.userId/topicId/orderId、amountSubtotal/amountTotal=99、currency=eur、payment_status=paid 和 status=complete。订单与授权在同一事务提交。话题行锁和 `(user_id, topic_id)` 唯一约束保证同一会话或多个会话并发确认不会重复授权。已解锁话题再次创建 Checkout 返回 TOPIC_ALREADY_UNLOCKED。

API 依据：[Stripe Checkout Session](https://docs.stripe.com/api/checkout/sessions/object)、[Create Session](https://docs.stripe.com/api/checkout/sessions/create?lang=java)、[Stripe 测试卡](https://docs.stripe.com/testing?testing-method=payment-methods)。

## 测试结果

```bash
cd apps/job-community/backend
./mvnw test
./mvnw package
```

2026-10-10 本机验证：**41 tests，0 failures，0 errors，0 skipped；打包成功**。

- 免费用户修改 page/size、伪造 unlocked/userId/success 参数也只返回最新 3 条。
- 0/2 条评论、时间相同的排序、空或超长评论、未知话题、错误 JSON 和参数。
- 手动话题独立、重复导入跳过、更新保留 topicId 和评论、非法批次不产生部分写入。
- 已支付后分页、重复确认、两个不同会话同时确认、权益只属于对应话题。
- 取消/未支付、错误用户/话题/订单/金额/币种/模式/Session、Stripe 错误和缺失/非测试密钥。
- 真实 H2 file 数据库关闭后，以全新应用上下文重新打开，已确认的权益和全部评论仍在。
- 实际在 8083 启动 JAR，通过 HTTP 验证健康检查、合成 seed、免费分页限制、发表评论、缺失密钥和伪造 Session；重启验证评论保存且 seed 不重复。

支付业务测试使用明确的 stub StripeGateway，不向 Stripe 发起真实付款。默认运行使用 StripeSdkGateway；没有开发用的假付款/直接解锁 API。

## 契约与限制

- 用户明确要求只写后端，因此没有本次任务书中的 React 页面。免责声明、synthetic 字段和付款结果已通过 API 提供，后续由前端展示。
- 当前仓库只有 `Doc/`；文档提到的共享 `contracts/job-snapshot.schema.json` / `contracts/demo-jobs.json` 尚不存在。这里使用 C 私有的 `src/main/resources/demo-jobs.json`；Google jobKey 复用 API 文档的示例，其余键待共享 fixtures 补齐后对齐。没有创建或修改共享契约。
- 路由/已有 JSON keys 按 API 文档实现。新增单话题详情接口和 disclaimer/synthetic 等字段；已解锁响应使用 visibleLimit=null。metadata 增加 orderId 作订单绑定。
- 当前是 localhost 单 demo 用户；没有生产登录、Webhook、退款/撤销授权、内容管理或举报。付款确认采用比赛文档指定的服务端 Retrieve Session；用户不返回并调用 confirm 时不会自动授予权益。
- 未配置可用测试密钥，尚未执行真实 Stripe Sandbox Checkout；上述手工验收仍需实际完成。
