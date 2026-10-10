# 数据来源登记

状态：M1 已创建岗位与 CV 数据；M2 评估样例已创建；M3 评论尚未创建。机器可读登记见 `data/seed/manifest.json`。

| 文件 / 数据集 | 类型 | 作者或来源链接 | 生成/获取日期 | 使用条件 | 假设与限制 | 界面标签 |
|---|---|---|---|---|---|---|
| data/seed/jobs.json | synthetic | Hireland 团队、AI 起草，无外部招聘源 | 2026-10-10 | 本项目原创演示 fixtures | 10 条虚构岗位、虚构日期、无真实申请链接；9 条 UNKNOWN、1 条 CLOSED | Synthetic demo job |
| data/seed/demo-cv.txt | synthetic | Hireland 团队、AI 起草 | 2026-10-10 | 本项目原创演示 fixture | 完全虚构，无真实个人信息；不代表用户反馈 | Fictional demo CV |
| data/evaluation/scenarios.json / scenarios-v1.json | synthetic | Hireland coding agent 基于现有岗位/CV 编写 | 2026-10-10 | 本项目原创测试 fixtures | 四组虚构评估材料；故意添加信息不足和恶意指令文本，不代表真人或公开招聘数据；旧版本用于实验 hash 追溯 | 仅验收脚本使用，文件标为 synthetic |
| Doc/evidence/M2_REAL_RESULTS.json / M2_REAL_ITERATIONS.json | AI generated | 实际 OpenRouter 输出，model/prompt 逐轮记录 | 2026-10-10 | 测试和质量复核证据 | 只含虚构输入生成的结果；包括弱输出/失败，不是用户研究或模型正确性保证 | 生产卡片标注 OpenRouter 与模型；历史实验仅文档 |
| 评论 seed（M3） | synthetic | 团队原创，待填写 | 待填写 | 待填写 | 不代表真实申请者或招聘方 | Fictional demo comments |

M1 目标 8–12 条岗位，覆盖未知日期/状态、重复导入等边界；不要伪造来源 URL 或真实开放状态。M3 热门话题至少 6 条评论。若加入公开数据，逐项补实际链接、时间与再利用限制，不能将公开访问等同于任意再利用。

## 数据登记验收

- 记录与实际 seed 文件及稳定 jobKey 一致。
- 所有 synthetic 数据在界面与数据文件均可辨识。
- 真实岗位的状态未知时显示 UNKNOWN，不承诺仍开放。
- 不把虚构评论当访谈证据，不把 sandbox 付款当真实收入。
