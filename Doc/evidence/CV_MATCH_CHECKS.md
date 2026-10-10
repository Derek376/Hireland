# CV 缩略图、原地上传与匹配结果验收

日期：2026-10-10。分支：feature/demo-ui。

用户要求 CV 红框显示假的缩略图，下方按 demo 用匹配项、缺口和 supporting evidence 展示；Update CV 不跳转，直接选附件。

## 实现

- 上传后显示 CV ready、文件名/更新时间，以及 HTML/CSS 绘制的 Sample preview。该缩略图只是示意图，不渲染实际 CV，也不会把示意图内容送入分析。
- 当前有效评估直接展示：顶部百分比，下方 Matched requirements（绿勾）、Gaps to review（黄色提醒）、Needs confirmation。每条有 JD/CV 摘录；Supporting details 展开完整原文及解释；总评、建议与模型/时间收在 Supporting analysis。
- 评分、优势和不足来自既有校验/缓存业务，无硬编码 demo 88%。没有结果时才显示明确的分析同意表单；上传本身不调用 OpenRouter。
- Update CV 打开文件选择器，PDF / DOCX / UTF-8 TXT，最大 5 MB、提取文本 12,000 字符以内。原地解析/保存并刷新侧栏；保留偏好，首次默认为 Technology。仅保存文本和文件名，不保留原始二进制附件。
- 错误附件不修改保存的 CV；改动 CV 内容后旧分数不再匹配，需明确同意后重新分析。已有成功评估历史保留。粘贴 CV 文本会清除之前的附件 filename。
- 迁移 004 只添加 profiles.file_name；当前用户数据库迁移前后的原字段逐表比对一致，Profile/申请/状态日志/评估/评论/付款/权益未改变。完整 CV 不额外序列化到 Workspace。

## 实际验证

使用 Node 24.16.0/npm 11.13.0：

```bash
npm test
npm run check:m0
npm run build
DATABASE_PATH=/tmp/hireland-cv-preview/demo.sqlite npm start -- --port 3001
```

- **53/53 测试 PASS**；新增本地提取及错误文件保留、原输入缓存失效、偏好保留、文件名重启持久化、Workspace 不含全文测试。PDF/DOCX 是虚构测试文件，不是解析器 mock。
- **check:m0 / typecheck / production build PASS**。
- **生产 Chrome/Playwright PASS**：85% fixture 自动展示、示意缩略图、文件名、绿勾/黄色提醒、Supporting details 完整 CV/JD 原文、Supporting analysis 展开；Update CV 打开 chooser、不导航；非法文件保留旧 CV/85%；TXT 上传后旧分数消失、同意项未选、刷新仍保存；DOCX/PDF 通过真实生产 Server Action 提取成功。
- **1440 / 1024 / 768 / 390 / 320px 无横向溢出**，console error / pageerror 为空。JSON：[CV_MATCH_BROWSER_RESULT.json](CV_MATCH_BROWSER_RESULT.json)。
- 当前用户开发首页仅 GET 读取 **HTTP 200**，没有提交表单、上传或新 AI 请求。

浏览器验收全部写入临时 SQLite，只有虚构 CV 和离线缓存 fixture。截图 **85% 是离线 UI 示例**，不是本次真实 AI 输出；没有真实 provider 调用、Stripe 交易或用户反馈。自动审批拒绝了在当前用户服务器点击 Check CV match 的验收，理由是可能外发 CV；该点击未执行，已用隔离环境完成所有功能验收。

## 截图

- [桌面](cv-match-desktop.png)
- [手机](cv-match-mobile.png)

## 文档核对

Context7 当前无 callable 工具，已告知用户。实现参考官方 [Next Forms](https://nextjs.org/docs/app/guides/forms)、[Server Action bodySizeLimit](https://nextjs.org/docs/app/api-reference/config/next-config-js/serverActions)、[serverExternalPackages](https://nextjs.org/docs/app/api-reference/config/next-config-js/serverExternalPackages)、[pdf-parse](https://github.com/mehmet-kozan/pdf-parse) 和 [mammoth](https://github.com/mwilliamson/mammoth.js)。依赖锁定 pdf-parse 2.4.5 / mammoth 1.11.0，不从浏览器加载解析器或外部 worker。
