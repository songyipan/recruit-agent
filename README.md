# Recruit Agent

一个用于技术招聘场景的 AI 简历处理与候选人推荐项目。当前仓库以后端 API 为主，提供简历上传、PDF 解析、AI 画像生成、影子面试评估、基于 JD 的向量检索推荐等能力。

## 项目能做什么

- 上传 PDF 简历并保存到本地 `uploads/` 目录
- 解析 PDF 文本内容
- 调用 OpenRouter 大模型生成候选人画像
- 为候选人自动生成 3 道影子面试题
- 保存候选人画像、面试任务和简历向量到 PostgreSQL
- 接收候选人的面试回答，生成面试评价并更新向量
- 根据职位描述（JD）生成向量，检索最匹配的候选人
- 通过 `/uploads/...` 路径访问本地上传文件和测试简历

当前首页 [`app/page.tsx`](./app/page.tsx) 仍是占位页，核心能力主要通过 API 提供。

## 核心流程

1. 调用 `/api/upload` 上传 PDF 简历
2. 调用 `/api/parse-pdf` 解析 PDF，并生成 AI 画像、面试题、候选人档案
3. 调用 `/api/interview/evaluate` 逐题或一次性提交 3 个回答，完成影子面试评估
4. 调用 `/api/recommend` 输入 JD，返回推荐候选人列表

## 系统设计说明

这个项目本质上是一个面向招聘场景的“简历理解 + 向量检索 + 面试校准”系统，不是传统聊天型 RAG，但底层使用了和 RAG 很接近的核心手法：

- 先把原始非结构化文本转换成结构化知识
- 再把结构化结果编码成向量
- 最后基于向量相似度做语义召回和排序

和常见 RAG 的区别在于：

- 传统 RAG 的目标通常是“检索文档后生成答案”
- 这个项目的目标是“检索候选人后生成招聘判断”
- 检索对象不是知识库 chunk，而是候选人画像和面试后更新过的能力向量

可以把它理解成一个招聘垂类的轻量 RAG / Retrieval Pipeline。

## 详细功能拆解

### 1. 简历上传与本地文件托管

- 支持上传 PDF 文件
- 文件会落盘到本地 `uploads/` 目录
- 通过 Next.js rewrite 将 `/uploads/*` 转发到文件读取接口
- 既能服务用户上传的简历，也能服务仓库内置的测试简历

### 2. PDF 解析与文本抽取

- 服务端通过 `fetch(pdfUrl)` 获取 PDF 文件
- 使用 `pdf-parse-fork` 提取 PDF 文本和页数信息
- 提取后的纯文本作为后续 AI 分析的输入

这一层解决的是“把二进制简历变成可理解文本”的问题。

### 3. 简历结构化理解

项目不会直接把整份原始简历丢进数据库做字符串匹配，而是先让模型把简历重写为标准化画像。当前画像结构包括：

- `name`
  候选人姓名
- `skillTree.frontend`
  前端技能列表
- `skillTree.backend`
  后端技能列表
- `skillTree.others`
  其他技能列表
- `riskPoints`
  风险点，例如断档、频繁跳槽、技术描述模糊、职责不清
- `projectAuthenticity`
  对项目真实性和技术深度的分析
- `interviewQuestions`
  基于候选人薄弱点自动生成的 3 道影子面试题

这一步的意义是把原始简历从“文档”转成“可计算、可检索、可对比”的候选人画像。

### 4. 候选人向量化

结构化画像生成后，系统会把画像 JSON 序列化，再调用 embedding 模型生成 2048 维向量，并写入 `candidate_profiles.resume_embedding`。

这意味着数据库里保存的不是简单关键词，而是候选人能力语义空间中的位置。后面做 JD 匹配时，比较的是语义相似度，而不是字面重合度。

### 5. 影子面试与画像校准

项目不是只看简历文本。它会根据简历中的薄弱点自动生成 3 道问题，然后允许逐题或一次性提交候选人的回答。

当 3 个回答收集完成后，系统会继续生成一份面试评价，主要包括：

- `overallScore`
  面试综合评分
- `insight`
  对回答深度和真实性的总结
- `updatedSkills`
  根据回答补充或强化后的技能点
- `credibilityVerdict`
  `credible` / `mixed` / `suspicious`
- `suggestedProfileAdjustment`
  对原始候选人画像的修正建议
- `embeddingSummary`
  用于重新生成向量的能力总结文本

这一步的关键价值是：候选人向量不是静态的，会在面试后被“二次校准”。也就是说，系统最终推荐的不是“纸面简历最像 JD 的人”，而是“纸面能力 + 面试可信度 + 回答深度”综合后的候选人。

### 6. JD 向量检索与推荐

当输入职位描述 `jdText` 后，系统会：

- 对 JD 文本生成 embedding
- 使用 PostgreSQL `pgvector` 对候选人向量做相似度排序
- 联合候选人画像和面试结果，返回推荐列表

最终输出不只是一个“相似度分数”，还会返回：

- 候选人姓名和 ID
- 匹配分数 `matchScore`
- 原始相似度 `similarity`
- 核心技能 `coreStrengths`
- 风险点 `riskPoints`
- 项目真实性分析
- 面试状态、面试评分、可信度判断

## 向量数据库与检索逻辑

项目使用 PostgreSQL + `pgvector` 作为向量数据库方案，而不是单独引入 Pinecone、Milvus 或 Weaviate。

这样做的好处：

- 候选人业务数据和向量数据存在同一个数据库里
- 事务、关联查询、迁移管理都更简单
- 适合当前这个中小规模、强业务关联的招聘场景

当前向量列包括：

- `candidate_profiles.resume_embedding`
- `embeddings.embedding`

向量维度固定为 `2048`，和默认 embedding 模型保持一致。

推荐接口的核心 SQL 思路是：

- 使用 `cp.resume_embedding <=> jdVector` 计算距离
- 按距离升序排序
- 再把距离换算成 `similarity`
- 联查 `interview_tasks`，补全候选人的面试状态和评价信息

因此，这一层本质上是“语义召回 + 业务字段增强”的组合，而不是单纯的数据库模糊搜索。

## 简历会被解析成什么样

简历解析后的核心产物保存在 `ai_report` 字段中，结构类似下面这样：

```json
{
  "name": "Song Yipan",
  "skillTree": {
    "frontend": ["Vue3", "TypeScript", "Schema-driven UI"],
    "backend": ["NestJS", "Prisma", "MySQL"],
    "others": ["Redis", "BPMN", "Pixel Streaming", "WebSocket"]
  },
  "riskPoints": [
    "部分项目描述偏结果导向，缺少复杂问题拆解细节",
    "后端能力在简历中有体现，但生产级别深度需要进一步验证"
  ],
  "projectAuthenticity": "项目与工业软件、流程引擎、可视化相关，技术关键词较具体，真实性较高，但部分经历仍需通过面试确认深度。",
  "interviewQuestions": [
    "如何设计一个可配置表单引擎，并处理字段联动和权限控制？",
    "BPMN 节点和业务表单如何做映射，才能兼顾灵活性和可维护性？",
    "Pixel Streaming 与业务侧实时数据同步时，如何处理连接稳定性和状态一致性？"
  ]
}
```

这个结构对应的不是“摘要”，而是一个标准化的候选人理解结果，后续推荐、展示、面试评估都围绕这份结构进行。

## 面试后会新增什么内容

面试评估完成后，`interview_tasks.evaluation` 中会保存类似下面的结构：

```json
{
  "overallScore": 84,
  "insight": "候选人对流程配置、权限控制和实时同步有较清晰的工程理解，回答整体可信，但部分底层细节仍偏概括。",
  "updatedSkills": ["RBAC", "Workflow Engine Design", "Realtime State Sync"],
  "credibilityVerdict": "credible",
  "suggestedProfileAdjustment": "可以上调其系统设计与复杂业务建模能力评估，但后端高并发与数据库调优经验仍需谨慎判断。",
  "embeddingSummary": "候选人具备较强的前端工程与业务系统建模能力，在流程配置、动态表单、实时可视化集成方面有明确经验，回答显示其对权限、状态同步和复杂页面交互有实际理解。"
}
```

随后系统会基于这份评价生成新的 embedding，并覆盖原有的候选人向量。

## 技术栈

- Web 框架: Next.js 16 + App Router
- UI 层: React 19 + Tailwind CSS 4 + shadcn/ui
- 语言与校验: TypeScript + Zod
- AI 接入: Vercel AI SDK + OpenRouter
- 文本理解: LLM 结构化输出
- 向量化: embedding 模型生成 2048 维向量
- 数据库: PostgreSQL
- 向量数据库能力: pgvector
- ORM: Prisma 7 + `@prisma/adapter-pg`
- PDF 解析: `pdf-parse-fork`
- 文件存储: 本地文件系统 `uploads/`

## 关键技术点

- 结构化输出约束
  使用 Zod 对简历画像和面试评价做 schema 校验，避免模型输出漂移后直接污染数据库。
- 向量与业务数据同库存储
  将候选人元数据、AI 画像、面试任务和向量统一落在 PostgreSQL 中，减少系统拆分复杂度。
- 原始 SQL 处理 `vector`
  Prisma 当前不能原生优雅处理 `vector` 列，因此项目在写入和检索向量时使用原始 SQL。
- 多阶段画像演化
  先根据简历生成初始画像，再根据面试回答生成二次评价和新的 embedding，形成动态候选人画像。
- 招聘场景语义检索
  不是关键词过滤，而是通过向量比较 JD 和候选人能力画像的语义距离。
- 本地文件代理
  通过 Next.js rewrite + route handler 将本地 `uploads/` 目录变成可访问资源。
- 容错和归一化
  对模型输出做 JSON 提取、字段归一化、字符串数组清洗、数值修正，降低大模型输出不稳定带来的风险。

## 目录结构

```text
app/
  api/
    upload/              上传 PDF
    parse-pdf/           解析简历并生成候选人画像
    interview/evaluate/  面试回答评估
    recommend/           JD 推荐
    file/[...path]/      本地文件访问代理
lib/
  services/
    aiService.ts         大模型分析、嵌入、面试评估
    pdfService.ts        文件存储与 PDF 解析
    recommendService.ts  向量召回与结果映射
    interviewService.ts  面试任务读写
prisma/
  schema.prisma          数据模型
  migrations/            数据库迁移
uploads/
  test-resumes/          本地联调用测试简历
```

## 环境准备

项目依赖以下运行环境：

- Node.js LTS
- pnpm
- PostgreSQL 数据库
- PostgreSQL `pgvector` 扩展
- OpenRouter API Key

### 1. 安装依赖

```bash
pnpm install
```

### 2. 配置环境变量

复制环境变量模板：

```bash
cp .env.example .env
```

`.env.example` 中包含以下配置：

```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/ai_test?schema=public"

# OpenRouter
OPENROUTER_API_KEY="your_openrouter_api_key"
OPENROUTER_BASE_URL="https://openrouter.ai/api/v1"
OPENROUTER_MODEL="openrouter/auto"
OPENROUTER_EMBEDDING_MODEL="nvidia/llama-nemotron-embed-vl-1b-v2:free"
OPENROUTER_SITE_URL="http://localhost:3000"
OPENROUTER_APP_NAME="next-app"
```

说明：

- `DATABASE_URL` 必须指向可用的 PostgreSQL 数据库
- 数据库需要支持 `pgvector`，项目迁移中会执行 `CREATE EXTENSION IF NOT EXISTS vector`
- `OPENROUTER_MODEL` 需要是聊天模型，不能配置成 embedding 模型
- `OPENROUTER_EMBEDDING_MODEL` 当前默认使用 2048 维向量模型，需与数据库向量列维度一致

### 3. 初始化数据库

执行 Prisma 迁移：

```bash
pnpm prisma migrate dev
```

如果只是生成 Prisma Client，也可以执行：

```bash
pnpm prisma generate
```

可选：填充示例 `User` 和 `Post` 数据

```bash
pnpm tsx prisma/seed.ts
```

注意：仓库当前没有为 `seed` 单独配置 npm script，上面命令需要本地有可执行的 `tsx`，或者你自行改成团队习惯的执行方式。`CandidateProfile` 和 `InterviewTask` 不依赖 seed，会在接口调用时自动产生。

## 如何启动

开发环境启动：

```bash
pnpm dev
```

默认启动地址：

```text
http://localhost:3000
```

其他常用命令：

```bash
pnpm lint
pnpm typecheck
pnpm build
pnpm start
```

## API 说明

### 1. 上传简历

`POST /api/upload`

请求类型：`multipart/form-data`

表单字段：

- `file`: PDF 文件，最大 10MB

示例：

```bash
curl -X POST http://localhost:3000/api/upload \
  -F "file=@/absolute/path/to/resume.pdf"
```

返回结果会包含本地可访问路径，例如：

```json
{
  "success": true,
  "message": "文件上传成功",
  "data": {
    "filename": "1773664690387_resume.pdf",
    "originalName": "resume.pdf",
    "size": 123456,
    "path": "/uploads/1773664690387_resume.pdf"
  }
}
```

### 2. 解析 PDF 并生成候选人画像

`POST /api/parse-pdf`

支持 `application/json`、`multipart/form-data`、`application/x-www-form-urlencoded`。

请求字段：

- `pdfUrl`: PDF 的可访问地址，必填
- `candidateId`: 候选人 ID，选填；不传时默认使用 `test-user-001`

JSON 示例：

```bash
curl -X POST http://localhost:3000/api/parse-pdf \
  -H "Content-Type: application/json" \
  -d '{
    "candidateId": "candidate-001",
    "pdfUrl": "http://localhost:3000/uploads/test-resumes/01_song-yipan.pdf"
  }'
```

接口会完成以下动作：

- 拉取 PDF 内容并提取文本
- 生成结构化简历画像
- 生成 3 道影子面试题
- 生成简历向量
- 写入 `candidate_profiles`
- 创建对应的 `interview_tasks`

### 3. 提交面试回答并评估

`POST /api/interview/evaluate`

支持两种调用方式：

- 逐题提交：传 `questionIndex` 和 `answerText`
- 一次性提交：直接传 3 个 `answers`

请求字段：

- `profileId`: 候选人画像 ID，选填
- `candidateId`: 候选人 ID，选填
- `questionIndex`: 问题下标，取值 `0` 到 `2`
- `answerText`: 单题回答
- `answers`: 长度为 3 的回答数组

约束：

- `profileId` 和 `candidateId` 至少传一个
- 如果没有一次性传 `answers`，则必须传 `questionIndex` 和 `answerText`

逐题提交示例：

```bash
curl -X POST http://localhost:3000/api/interview/evaluate \
  -H "Content-Type: application/json" \
  -d '{
    "candidateId": "candidate-001",
    "questionIndex": 0,
    "answerText": "我会先说明问题背景，再拆分状态同步、权限、性能和容错几个部分。"
  }'
```

一次性提交示例：

```bash
curl -X POST http://localhost:3000/api/interview/evaluate \
  -H "Content-Type: application/json" \
  -d '{
    "candidateId": "candidate-001",
    "answers": [
      "第一题回答",
      "第二题回答",
      "第三题回答"
    ]
  }'
```

当 3 个问题都回答完成后，接口会：

- 生成面试评价
- 更新 `interview_tasks`
- 基于原始画像 + 回答 + 评价重新生成 embedding
- 更新 `candidate_profiles.resume_embedding`

### 4. 根据 JD 推荐候选人

`POST /api/recommend`

请求字段：

- `jdText`: 职位描述文本，必填
- `limit`: 返回数量，选填，默认 `5`，最大 `20`

示例：

```bash
curl -X POST http://localhost:3000/api/recommend \
  -H "Content-Type: application/json" \
  -d '{
    "jdText": "招聘高级前端工程师，熟悉 React、Next.js、TypeScript、性能优化和企业后台系统。",
    "limit": 5
  }'
```

返回结果中包含：

- 匹配分数 `matchScore`
- 向量相似度 `similarity`
- 核心技能 `coreStrengths`
- 风险点 `riskPoints`
- 项目真实性分析
- 面试状态和面试评分

### 5. 访问本地上传文件

`GET /uploads/:path*`

项目通过 [`next.config.mjs`](./next.config.mjs) 将 `/uploads/*` 重写到 [`app/api/file/[...path]/route.ts`](./app/api/file/[...path]/route.ts)，因此可以直接访问本地上传文件，例如：

```text
http://localhost:3000/uploads/test-resumes/01_song-yipan.pdf
```

## 本地联调建议

仓库里已经准备了测试简历文件，位于 [`uploads/test-resumes`](./uploads/test-resumes)。

一个最短联调流程如下：

1. 启动 PostgreSQL，并确保目标库可连接
2. 配置 `.env`
3. 执行 `pnpm prisma migrate dev`
4. 执行 `pnpm dev`
5. 使用测试简历调用 `/api/parse-pdf`
6. 调用 `/api/interview/evaluate` 提交 3 个回答
7. 调用 `/api/recommend` 输入 JD 查看推荐结果

推荐先用这个测试地址：

```text
http://localhost:3000/uploads/test-resumes/01_song-yipan.pdf
```

## 主要数据表

- `candidate_profiles`: 候选人画像、AI 报告、PDF 地址、简历向量
- `interview_tasks`: 影子面试问题、回答、状态、评价结果
- `embeddings`: 通用向量表示例表
- `users` / `posts`: Prisma 初始化示例表

## 已知现状

- 首页还没有正式业务界面
- 项目核心以 API 为中心
- 向量操作使用原始 SQL，因为 Prisma 目前不能直接处理 `vector` 列
- 当前 embedding 维度固定为 `2048`，修改模型时需要同步更新数据库列定义与向量校验逻辑

## 相关文件

- [`app/api/upload/route.ts`](./app/api/upload/route.ts)
- [`app/api/parse-pdf/route.ts`](./app/api/parse-pdf/route.ts)
- [`app/api/interview/evaluate/route.ts`](./app/api/interview/evaluate/route.ts)
- [`app/api/recommend/route.ts`](./app/api/recommend/route.ts)
- [`lib/services/aiService.ts`](./lib/services/aiService.ts)
- [`lib/services/pdfService.ts`](./lib/services/pdfService.ts)
- [`lib/services/recommendService.ts`](./lib/services/recommendService.ts)
- [`lib/services/interviewService.ts`](./lib/services/interviewService.ts)
- [`prisma/schema.prisma`](./prisma/schema.prisma)
