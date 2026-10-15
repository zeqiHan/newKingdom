# JudgmentOS v0.2 Deployment Checklist

## ✅ Code Deployment

- [x] Feature branch merged to master
- [x] Code pushed to GitHub
- [x] Branch: `master`
- [x] Commit: `1e6ddcd`

## 📋 Database Migration Required

### New Fields Added

**Projects Table:**
```sql
willing_sacrifices    JSONB NOT NULL DEFAULT '[]'
sacrifices_accepted_at TIMESTAMPTZ
```

**Experiments Table:**
```sql
required_sacrifices    JSONB NOT NULL DEFAULT '[]'
sacrifices_accepted_at TIMESTAMPTZ
```

### How to Apply Migration

**Option 1: Supabase SQL Editor (Recommended)**

1. Open Supabase Dashboard: https://supabase.com/dashboard
2. Select your project
3. Go to **SQL Editor**
4. Copy and paste: `judgment-os/db/migrations/002_add_sacrifices.sql`
5. Click **Run**

**Option 2: Command Line**

```bash
cd judgment-os
# Set DATABASE_URL in .env.local first
npx dotenv -e .env.local -- npm run db:migrate -- db/migrations/002_add_sacrifices.sql
```

## 🔧 Environment Variables Required

### On AI Builders Platform

Set these in deployment configuration:

| Variable | Value | Required |
|----------|-------|----------|
| `DATABASE_URL` | Supabase Postgres connection string | ✅ Required |
| `OPENAI_API_KEY` | OpenAI API key for GPT-4o | ✅ Required (new) |
| `AI_BUILDER_TOKEN` | Auto-injected by platform | N/A |

### ⚠️ Important: OPENAI_API_KEY

The new features (Conversation Analysis & Sacrifice Generation) require OpenAI API:

- **Model**: GPT-4o
- **Usage**: 
  - Conversation analysis: ~2000 tokens per project creation
  - Sacrifice generation: ~1000 tokens per generation
- **Cost**: ~$0.01-0.02 per project creation

**Where to get it:**
1. Go to https://platform.openai.com/api-keys
2. Create new API key
3. Add to deployment env vars as `OPENAI_API_KEY`

## 🚀 Deployment Steps

### Step 1: Apply Database Migration

```bash
# In Supabase SQL Editor, run:
judgment-os/db/migrations/002_add_sacrifices.sql
```

### Step 2: Update Environment Variables

Add `OPENAI_API_KEY` to AI Builders deployment config.

### Step 3: Trigger Redeploy

Since code is already on master, the platform should auto-deploy.

Or manually trigger redeploy if needed.

### Step 4: Verify Deployment

1. Open https://judgment-os.ai-builders.space/projects
2. Try creating a project with conversation input
3. Check that sacrifice declaration works

## 🧪 Testing Checklist

After deployment, test these features:

### 1. Conversation-First Project Creation

- [ ] Navigate to `/projects`
- [ ] See "对话创建项目" panel
- [ ] Type a project description
- [ ] Click "分析并生成项目"
- [ ] Verify AI generates:
  - [ ] Goal and criteria
  - [ ] Constraints
  - [ ] 3 sacrifice declarations
  - [ ] 3-5 uncertainties
  - [ ] 3-5 milestones
- [ ] Can expand details
- [ ] Can create project

### 2. Sacrifice Declaration

- [ ] Open a project detail page
- [ ] See "牺牲声明" section
- [ ] Click "生成 AI 牺牲提案"
- [ ] Verify 3 sacrifices generated
- [ ] Can edit sacrifices
- [ ] Can add custom sacrifice
- [ ] Can accept sacrifices

### 3. Existing Features Still Work

- [ ] Manual project creation
- [ ] Milestone management
- [ ] Uncertainty tracking
- [ ] Decision engine

## 🐛 Troubleshooting

### Issue: "No response from OpenAI"

**Cause:** Missing or invalid `OPENAI_API_KEY`

**Fix:** 
1. Verify API key is set in deployment config
2. Check API key is valid at https://platform.openai.com/api-keys
3. Ensure you have credits on your OpenAI account

### Issue: Database error on sacrifice features

**Cause:** Migration not applied

**Fix:**
1. Run `002_add_sacrifices.sql` in Supabase SQL Editor
2. Verify columns exist:
   ```sql
   SELECT column_name FROM information_schema.columns 
   WHERE table_name = 'projects' AND column_name LIKE '%sacrifice%';
   ```

### Issue: Conversation analysis fails

**Cause:** OpenAI API rate limit or quota

**Fix:**
- Check OpenAI usage dashboard
- Upgrade OpenAI plan if needed
- Or wait for rate limit to reset

## 📊 Monitoring

After deployment, monitor:

1. **OpenAI API Usage**
   - Dashboard: https://platform.openai.com/usage
   - Expected: ~100-200 tokens per user action
   - Alert if costs spike unexpectedly

2. **Application Logs**
   - Check for errors in conversation analysis
   - Monitor sacrifice generation success rate

3. **User Behavior**
   - Are users using conversation input?
   - Or falling back to manual forms?
   - Conversation usage = success metric

## 📞 Support

If issues occur:

1. Check deployment logs on AI Builders platform
2. Verify database migration applied
3. Confirm OPENAI_API_KEY is set and valid
4. Test locally first if needed:
   ```bash
   cd judgment-os
   npm install
   npm run dev
   ```

## ✅ Post-Deployment

Once deployed and tested:

- [ ] Update PR status (merge or close)
- [ ] Monitor for 24 hours
- [ ] Collect initial user feedback
- [ ] Document any issues

---

## 🎉 What's New in v0.2

**Conversation-First Interface:**
- Users type one message instead of filling 10+ forms
- AI extracts complete project structure
- 30-second project creation

**Sacrifice Declaration:**
- Makes tradeoffs explicit
- AI proposes 3 realistic sacrifices per project
- User accepts/modifies/adds custom

**Core Principle:**
> "如果使用过程像做作业一样，那么它就会没人使用。"

Now users can actually use JudgmentOS without homework-style forms!
