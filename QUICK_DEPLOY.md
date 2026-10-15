# 🚀 Quick Deploy Guide - JudgmentOS v0.2

## ✅ 代码已推送

- ✅ 所有代码已合并到 `master` 分支
- ✅ 已推送到 GitHub
- ✅ 准备好部署

---

## 📋 部署前必做：数据库迁移

### 方法：在 Supabase SQL Editor 中执行

1. **打开 Supabase Dashboard**
   - 访问：https://supabase.com/dashboard
   - 选择你的 JudgmentOS 项目

2. **进入 SQL Editor**
   - 左侧菜单 → **SQL Editor**

3. **执行迁移SQL**
   
   复制粘贴以下内容并运行：

```sql
-- Add sacrifice tracking to projects and experiments
-- Migration: Add Sacrifice Declaration feature

-- Add willing_sacrifices to projects
ALTER TABLE projects ADD COLUMN IF NOT EXISTS willing_sacrifices JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS sacrifices_accepted_at TIMESTAMPTZ;

-- Add required_sacrifices to experiments
ALTER TABLE experiments ADD COLUMN IF NOT EXISTS required_sacrifices JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE experiments ADD COLUMN IF NOT EXISTS sacrifices_accepted_at TIMESTAMPTZ;
```

4. **点击 Run** 执行

---

## 🔑 环境变量配置

### ⚠️ 重要：需要添加 OPENAI_API_KEY

新功能需要 OpenAI API：

1. **获取 API Key**
   - 访问：https://platform.openai.com/api-keys
   - 创建新的 API key
   - 复制 key（以 `sk-` 开头）

2. **在 AI Builders 中配置**
   - 进入部署设置
   - 添加环境变量：
     ```
     名称: OPENAI_API_KEY
     值: sk-xxxxxxxxxxxxxx
     ```

3. **已有的环境变量**
   - ✅ `DATABASE_URL` - Supabase 连接串（已配置）
   - ✅ `AI_BUILDER_TOKEN` - 平台自动注入

---

## 🚀 触发部署

### 自动部署（推荐）

代码已在 `master` 分支，AI Builders 应该会自动检测并部署。

### 手动部署

如果没有自动部署，在 AI Builders 平台手动触发：
- 找到 `judgment-os` 服务
- 点击 "Redeploy" 或 "Deploy"

---

## 🧪 部署后测试

访问：https://judgment-os.ai-builders.space/projects

### 测试 1：对话创建项目

1. 看到 "💬 对话创建项目" 面板
2. 输入一段话，例如：
   ```
   我想两周内做出一个判断力训练工具，
   主要是帮我管理项目里的不确定性和决策。
   约束是只有我一个人开发，技术栈用Next.js。
   ```
3. 点击 "分析并生成项目"
4. 应该看到：
   - ✅ AI 生成的项目摘要
   - ✅ 3个牺牲声明
   - ✅ 3-5个不确定性
   - ✅ 3-5个里程碑
5. 点击 "创建项目"

### 测试 2：牺牲声明

1. 进入刚创建的项目详情页
2. 找到 "牺牲声明 (Sacrifice Declaration)" 区域
3. 点击 "生成 AI 牺牲提案"
4. 应该看到：
   - ✅ 3个牺牲选项（TIME/QUALITY/SCOPE等）
   - ✅ 每个有类别、描述、影响
5. 可以编辑、接受

---

## ❌ 如果出错

### 错误 1：AI 分析失败

**原因：** OPENAI_API_KEY 未配置或无效

**解决：**
1. 检查环境变量是否设置
2. 验证 API key 是否有效
3. 确认 OpenAI 账户有余额

### 错误 2：数据库错误

**原因：** 迁移未执行

**解决：**
1. 在 Supabase SQL Editor 执行上面的迁移 SQL
2. 验证列是否存在：
   ```sql
   SELECT column_name 
   FROM information_schema.columns 
   WHERE table_name = 'projects' 
   AND column_name LIKE '%sacrifice%';
   ```

---

## 💰 成本说明

### OpenAI API 成本

- **每次项目创建：** ~2000 tokens = $0.01-0.02
- **每次牺牲生成：** ~1000 tokens = $0.005-0.01
- **预估月成本：** 100次使用 ≈ $1-2

非常低的成本，测试完全没问题！

---

## ✅ 完成检查

部署成功后：

- [ ] 可以访问 https://judgment-os.ai-builders.space/projects
- [ ] 对话创建项目功能正常
- [ ] 牺牲声明功能正常
- [ ] 原有功能（手动创建、里程碑等）正常

---

## 🎉 新功能

### 1. 对话优先 (Conversation-First)

**理念：** 如果使用过程像做作业一样，那么它就会没人使用。

**体验：**
- 输入一段话 → AI 填充所有框架 → 30秒创建项目
- 不再需要填10+个表单字段

### 2. 牺牲声明 (Sacrifice Declaration)

**理念：** 你必须牺牲什么，才能得到什么？

**体验：**
- AI 生成3个现实的牺牲选项
- 用户review、修改、接受
- 让代价显性化

---

## 📞 需要帮助？

如果遇到问题：

1. 查看 `DEPLOYMENT_CHECKLIST.md` 详细指南
2. 检查部署日志
3. 验证环境变量和数据库迁移

---

**准备好了！现在就可以部署测试了。** 🚀
