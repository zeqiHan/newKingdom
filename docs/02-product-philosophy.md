# 02 — Product Philosophy

如果 `01-judgment-theory.md` 是真的，那么 JudgmentOS 必须怎么设计？



这一页只回答：哪些产品规则是不可妥协的。

---

## Milestone Rule

Milestone 不是 task。

Milestone 存在的唯一理由：减少某个关键 uncertainty。

结束时必须产生真实 feedback / learning。

如果没有新信息、没有验证假设、没有降低风险 —— 它不是 Milestone。

---

## Evidence Rule

系统先搜索事实。

用户可以 challenge、correct、补充。

系统必须明确区分：

- Fact
- Assumption
- Inference
- Opinion

不能把推导或意见，包装成事实。

---

## Decision Rule

AI 可以推荐。

AI 不能偷偷替用户做价值取舍。

每一次推荐，必须展示：

- Alternatives
- Tradeoffs
- Unknowns
- 为什么建议这一方案

推荐不是结论。推荐是论据。

---

## Time Rule

同时提供两条时间线：

- User Deadline
- System Recommended Timeline

如果用户压缩或延长时间，系统必须显式展示利弊。

Deadline 可以覆盖推荐。

但代价不能被隐藏。

---

## Human Agency Rule

用户永远可以：

- 增删改 Milestone
- 否定 AI
- 重新打开 Decision

AI 可以警告后果。

AI 不能阻止。

Agency 不是功能开关。Agency 是产品宪法。

---

## Model Scaling Filter

对每条产品规则问：

> 如果 AI 强大 100 倍，这条规则为什么仍然存在？

这条过滤很残酷。

它把「弥补模型智力不足」的规则，和「保护判断结构」的规则分开。

### 不一定 survive

例如：

**AI 自动生成 Milestones**

未来模型本来就会。这不是护城河。

### 很可能 survive

例如：

**用户可以修改 Milestones，系统必须显示修改带来的 tradeoff**

这保护的是 human agency，不是弥补模型不够聪明。

模型再强，也不能替用户承担价值观、风险偏好、责任和后果。

### 用这把尺子检查五条规则

| Rule | 100× AI 后是否仍必须存在？ | 为什么 |
| --- | --- | --- |
| Milestone Rule | 是 | 减少 uncertainty 是判断结构，不是生成能力 |
| Evidence Rule | 是 | 事实与意见的边界属于认识论，不属于模型智商 |
| Decision Rule | 是 | 价值取舍必须由人承担 |
| Time Rule | 是 | 时间压力下的代价暴露，是判断训练，不是排期算法 |
| Human Agency Rule | 是 | 这是产品存在的理由 |

如果某条规则只在「模型不够强」时才有意义 —— 删掉它，或降级为实现细节。

如果某条规则在模型无限强时仍然必须存在 —— 它才属于 JudgmentOS。
