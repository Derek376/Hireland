# 社区点赞、点踩与帖子下方评论验收

日期：2026-10-10。分支：feature/demo-ui。

## 实现

- 截图红框位置显示 Like、Dislike、Comment 和真实计数。根帖和下方评论均可赞踩；每用户一票，Like/Dislike 互斥，重复点击取消。没有假初始票数。
- Comment 按钮聚焦下方编辑器；添加的评论关联当前帖子，提交后直接出现在 Comments 列表，计数刷新。成功清空草稿，失败保留，空白禁用，最长 1,000 字符，pending 防重复点击。刷新后保留内容/票数。
- 社区侧栏同步显示票数和评论数；Comment 入口打开正确帖子下方的编辑器。其他独立帖子保持在 More from this conversation，不伪装成当前帖的回复。
- 免费预览是最新三个帖子（含其下方评论）。增加回复不改变根帖排序或总数；隐藏父帖的回复和票状态不进入未授权响应。直接读/写隐藏父帖、跨 topic/parent/reply ID 均拒绝。客户端无法指定用户身份。
- 迁移 005 仅添加回复/反应表及约束。当前业务 DB 升级时逐表比较全部原记录相同，新互动表为空；CV/申请/支付/权益没有重置。删除根帖时外键级联清理对应回复与票。

## 实际验证

Node 24.16.0/npm 11.13.0：

```bash
npm test
npm run check:m0
npm run build
DATABASE_PATH=/tmp/hireland-comment-preview/demo.sqlite npm start -- --port 3001
```

- **62/62 测试 PASS**。新增真实 SQLite 测试：零初始票、赞踩切换/取消/desired-state 幂等、其他用户票保留、回复归属/根帖计数不变、评论独立票/跨 ID 拒绝、重开持久化、父帖退出预览后读写拒绝/解锁后可见、写失败回滚/外键级联。
- **check:m0 / typecheck / production build PASS**。
- **生产 Chrome/Playwright PASS**：Like 与刷新、Dislike 替换与再次取消；Comment 聚焦编辑器、空白禁用、提交出现/清空/无跳转；评论独立票及刷新无重复；侧栏同步与入口；失败保留草稿、隐藏深链无正文/回复/编辑器。
- **1440 / 1024 / 768 / 390 / 320px 无横向溢出**，console error/pageerror 为空。机器结果：[COMMENT_INTERACTIONS_BROWSER_RESULT.json](COMMENT_INTERACTIONS_BROWSER_RESULT.json)。
- 当前用户开发页面只有 **GET HTTP 200** 验证，确认新按钮与评论框已渲染；没有给用户真实帖子投票或发表评论。

浏览器写操作全部在临时数据库使用虚构帖子/评论，AI/Stripe 凭据为空，没有真实供应商调用或用户反馈。当前身份仍是同一机器的固定 demo-user，不是多用户生产登录。

## 截图

- [桌面评论与互动](comment-interactions-desktop.png)
- [手机评论与互动](comment-interactions-mobile.png)

Context7 当前无 callable 工具，已告知用户，改查官方 [React useActionState](https://react.dev/reference/react/useActionState) 和 [Next revalidatePath](https://nextjs.org/docs/app/api-reference/functions/revalidatePath)。依赖与 lockfile 未改变。
