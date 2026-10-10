# M3 社区与 Stripe sandbox 验收

日期：2026-10-10。状态 DONE：实现、离线回归、真实 sandbox Checkout 和产品内权益已验证。没有真实收款、付费意愿或真人反馈证据；不保证评委得分。M2 真人试用按用户明确要求跳过，不作为 M3 前置。

## 已实现

同一 Next.js/端口 3000/SQLite：岗位详情 → 讨论 → Server Action 创建本地 Purchase → Stripe-hosted Checkout → 返回页重新向 Stripe 查询 → 事务写 PAID + Entitlement → 展示全部评论。没有第二个业务应用、额外数据库或本地支付 mock。

- `community.ts` 免费 SQL LIMIT 3，排序 created_at DESC/id DESC；只有可见正文进入服务返回与页面。免费发帖后依然只取最新三条。输入 1–1,000 字符，React 转义文本；用户本地 demo 帖与 fictional seed 标签分开。
- `comments.json` 是六条原创虚构评论模板，幂等 seed 到十个 synthetic 岗位；每话题至少六条。稳定 ID，不覆盖用户帖、订单或权益。没有新迁移、reset 或修改 001 SQL。
- 单话题 €0.99 EUR 一次性解锁，包含该话题现有及未来评论；固定本地 demo 身份。定价理由只是缩小购买范围的初始假设，不是付费意愿验证。
- 创建 Checkout 使用服务端 inline price_data；不需要预建 Product/Price 或 STRIPE_TOPIC_PRICE_ID。Stripe 自动产生测试商品与价格。元数据绑定本地 purchase/user/topic，idempotency key 使用稳定 purchase ID；进程内重复点击复用 Promise。
- 仅 sk_test_ key；创建和履约均拒绝 livemode，Session ID 必须 cs_test_。SDK 23.0.0 默认 API `2026-09-30.endive` 使用 `allowed_payment_method_types: ['card']`（旧示例的 create payment_method_types 不适用此声明）；实际创建已通过。Apple Pay 可以作为 card wallet 展示，不开启延迟支付。adaptive_pricing 关闭，不开折扣/税/配送/订阅。
- 付款确认不信任 URL 或 webhook 中的 paid 标记。重新查询完整 Session + line_items.price.product；检查 mode、sandbox、client_reference、metadata、EUR/99、单行/quantity=1、one_time price 与 product 绑定，且 complete/paid 才履约。返回页先验证本地订单归属。
- webhook 接受原始 body（64 KiB 上限），constructEvent 验签，拒绝 live；completed/expired 共用履约函数。失败返回可重试 HTTP，未知本地订单忽略。不要求浏览器身份的入口仅供签名已验证的 webhook 调用。
- 幂等事务与唯一权益约束；支付成功后写库失败回滚，后续确认可恢复。取消 URL 本身既不确认付款也不永久标失败。未付款不解锁，open Session 可复用，真实 expired 才创建新尝试。
- HTTP 创建结果不明时保留 CREATING，用同一 idempotency key 重试，不立即创建新订单。新 Session 过期设为创建时一小时，避免 Stripe 最少三十分钟约束；无 Session 的 CREATING 超过三十分钟可重建。本地单实例 demo，不是分布式支付系统。
- “Check payment / recover access” 核对当前用户该话题最近五条待确认订单，不创建收费。服务端固定 APP_URL loopback，Checkout URL 限 checkout.stripe.com。SDK timeout 20 秒/最多一次网络重试；没有日志输出 raw Stripe 错误或支付资料。

## 实际验收

| 检查 | 实际结果 |
|---|---|
| `npm test` | PASS，30/30（27 子测试 + 3 父测试），其中 M3 为 8 个子测试；全为临时数据库/明确模拟 Stripe，不当作交易证据 |
| `npm run check:m0` / typecheck | PASS，原 schema 约束与全项目类型 |
| `npm run build` | PASS，webpack，新增 topics、checkout/return、api/stripe/webhook |
| `npm run db:setup` | 首次新增 10 topics/60 fictional comments，已有 jobs/Profile/AI/申请保留 |
| `npm run db:seed` 再执行 | 0 jobs/0 topics/0 comments 新增；订单、权益、用户帖保留 |
| 浏览器发帖 | 3/6 → 3/7，仍只展示三条；本地帖子标为 unverified |
| 实际 raw HTML 付费正文检查 | 未解锁 job-04 与另一个未付款 job-03 的隐藏原文未出现（包含页面序列化 payload） |
| 实际取消与未付款 | Checkout 返回不解锁；真实 API 确认为 PENDING，entitlements=0；原 open Session 重用 |
| 实际 sandbox Checkout | 官方 4242 测试卡与完全虚构资料；livemode=false，99 EUR minor units，complete/paid |
| 实际 PaymentIntent 查询 | succeeded，amount_received=99；记录在 M3_REAL_RESULT.json |
| 产品内结果 | job-04 7/7 评论解锁；只有一份权益；job-03 仍 3/6、锁定 |
| 重复真实付款确认 | 同一 Session 再次查询，不新增付款或权益；entitlementCount=1 |
| 实际生产重启 | 同一订单仍 PAID、7 条评论解锁，M2 assessment ID/时间与原申请状态保留 |
| 浏览器伪造返回 URL | cs_test_unrecorded 显示未记录订单，不解锁 |
| 手机宽度 | 390px，documentWidth=390；viewport 已重置 |

离线测试还验证错误归属、未记录 ID、live session/非卡/订阅、错误金额/币种/元数据/商品/数量、重复并发、无配置/live key、事务写入失败恢复、创建超时后的稳定订单、过期重建、签名/原始 body 篡改、重复事件与无关事件。测试中的 “Hireland database operation failed” 是故意触发的 rollback 测试，不是生产失败。

## 真实证据与复现

- `M3_UNPAID_RESULT.json`：真实取消后 API 查询与付费正文不泄漏，未付款零权益。
- `M3_REAL_RESULT.json`：真实 Session、PaymentIntent、Product、Price、本地订单与一份权益标识；不含 API key、真实个人资料或卡数据。
- `M3_BROWSER_RESULT.json`：重启/readback、跨话题隔离、seed 不重复、原 M2 数据保留。
- `m3-free-discussion.png`、`m3-checkout.png`、`m3-payment-confirmed.png`、`m3-unlocked-discussion.png`：真实浏览器画面；付款确认截图为最终构建重复确认，不冒充第二笔交易。

执行 `npm run check:m3 -- --write-evidence` 只读取已有真实 Stripe 交易并重复幂等确认本地权益，不创建收费。可用 `--session=cs_test_...` 指定本地当前用户已有订单。缺配置/缺交易退出 2，核验失败退出 1，通过退出 0；旧结果在重写时归档。不要把它误解为自动完成 Checkout 的脚本。

## 明确限制与后续

当前没有配置 STRIPE_WEBHOOK_SECRET 或本地 Stripe 事件转发，未声称真实 webhook 已送达。签名及同一履约路径通过离线测试；实际付款由返回页确认，漏返回时用户可手动恢复。若要演示无人操作自动入账，另配置 CLI forwarding 的实际 secret 并验证送达；不要把合成签名测试当真实投递。

固定本地 demo 身份、单实例、无退款/纠纷撤销或正式注册。数据与支付资料是虚构测试材料；同账号/数据库可复看交易，新 clone 没有本地用户订单或凭据。比赛交付仍需 M4/M5 的剩余测试、说明和演示材料；用户研究缺口已明确由用户决定跳过。
