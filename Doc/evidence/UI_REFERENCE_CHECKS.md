# 设计稿前端验收

日期：2026-10-10。分支：`feature/demo-ui`。来源：`Doc/Stripe docs.pdf` 的四页界面截图；使用 macOS PDFKit 渲染后逐页核对。

## 已实现

- 白底、深蓝文字、青色按钮、顶栏与头像菜单；岗位采用紧凑列表，包含公司标识、搜索/地点/行业筛选、排序与加载更多。
- CV Match Profile 侧栏复用真实评估组件、同意表单和缓存；没有评估时不显示设计稿的示例分数。Profile 与岗位详情样式保持一致。
- Discussions 侧栏显示服务端允许读取的最新三条、评论筛选、发帖和 €0.99 sandbox 解锁卡片；可打开评论详情并返回原入口的侧栏。
- My Tracker 展示真实保存记录、阶段计数/筛选、搜索、状态修改/移除及讨论入口。Next step 根据当前阶段展示建议，不虚构雇主日期或 OA 状态。
- 手机侧栏移至列表上方；关闭/Escape 返回打开按钮。表单有可访问标签、pending/错误/成功状态。

评论仍为现有平铺模型。设计稿中的回复线程、点赞、评论收藏未新增；不把其他独立评论标成回复。不补造岗位截止日期、录用概率或社区回复数。

## 实际验证

使用 Node 24.16.0；项目依赖版本/lockfile 未修改。运行环境默认 Node 26，因此通过临时 Node 24 分发包执行验证。

```bash
npm ci --ignore-scripts --no-audit --no-fund --cache /tmp/hireland-ui-npm-cache
npm test
npm run typecheck
npm run check:m0
npm run build
DATABASE_PATH=/tmp/hireland-ui-demo/demo.sqlite npm start
```

- 离线测试 **33/33 PASS**。新增 Workspace 测试覆盖序列化数据排除隐藏正文、没有伪造评估、读取不创建购买/评估，以及保存状态/新帖来自数据库。
- typecheck、check:m0、生产 webpack build：**PASS**。
- Google Chrome + Playwright 实际生产浏览器：搜索、地点筛选、空结果/清除、加载更多、保存及刷新、空评论服务器校验、发帖刷新/三条限制、评论筛选、Tracker 状态修改、CV 保存/侧栏读取、评论详情/返回、Escape 和隐藏评论深链检查：**PASS**。
- 1440 / 1024 / 768 / 390 / 320px 列表及打开侧栏均无横向溢出，浏览器 console error / pageerror 为空。机器结果见 [UI_REFERENCE_BROWSER_RESULT.json](UI_REFERENCE_BROWSER_RESULT.json)。

浏览器仅使用 `/tmp/hireland-ui-demo/demo.sqlite` 的虚构岗位/CV、测试保存和本地帖子；未修改用户业务数据库。没有新 AI 请求、Checkout 或实际付款，本次 UI 验收不能替代既有 M2/M3 真实证据或真人反馈。无 schema 迁移或 seed/reset 变更；没有密钥写入截图/日志/提交。

Context7 在本次工具中不可用，已说明限制，并使用 Next.js 官方 CSS/usePathname 文档与 React useActionState 文档核对实现。

## 界面截图

- [岗位列表](ui-reference-discover.png)
- [岗位列表与社区侧栏](ui-reference-community.png)
- [CV 侧栏](ui-reference-cv.png)
- [评论详情](ui-reference-comment.png)
- [My Tracker 与社区](ui-reference-tracker.png)
- [手机岗位列表](ui-reference-mobile.png)
- [手机社区面板](ui-reference-mobile-community.png)

截图全部来自本地生产构建，显示的是虚构 fixture 和本地测试状态；未配置供应商时按钮明确显示配置提示。
