# AI Agent 工作指南

> 每次修改代码前，请先阅读此文件，检查是否有合适的 skills 可以使用。

## 工作流程

1. **阅读此文件** - 了解当前项目可用的 skills
2. **分析任务** - 判断是否需要使用 skill
3. **执行操作** - 如果需要，先调用 skill，再修改代码

## 可用 Skills

### 1. find-skills
**用途**：查找和安装新的 agent skills
**触发场景**：
- 用户问"如何..."、"有没有 skill 可以..."
- 需要扩展功能时

### 2. skill-creator
**用途**：创建自定义 skills
**触发场景**：
- 用户说"创建一个 skill"
- 需要添加新功能时

### 3. web-design-guidelines
**用途**：检查 UI 代码是否符合 Web 界面指南
**触发场景**：
- 用户说"检查我的 UI"
- 检查可访问性
- 审计设计
- 检查 UX

### 4. vercel-react-best-practices
**用途**：React 和 Next.js 性能优化
**触发场景**：
- 编写/审查 React 组件
- 优化 Next.js 页面
- 数据获取优化
- 性能改进

### 5. next-cache-components
**用途**：Next.js 16 缓存组件（PPR、use cache、cacheLife、cacheTag）
**触发场景**：
- 使用 Next.js 16 缓存功能
- 配置缓存策略

### 6. next-best-practices
**用途**：Next.js 最佳实践
**触发场景**：
- 文件约定
- RSC 边界
- 数据模式
- 异步 API
- 元数据
- 错误处理
- 路由处理器
- 图片/字体优化

## 项目技术栈

- **框架**: Next.js 15 + React 19
- **数据库**: PostgreSQL 17 + Prisma 7
- **向量数据库**: pgvector
- **样式**: Tailwind CSS
- **包管理**: pnpm

## 代码规范

1. 使用 TypeScript 严格模式
2. 优先使用 Server Components
3. 数据库操作通过 Prisma Client
4. 向量操作使用原始 SQL（Prisma 不支持 vector 类型）
5. **每次修改代码后必须执行 `npm run lint` 检查**

## 数据库模型

- `User` - 用户表
- `Post` - 文章表
- `Embedding` - 向量存储表（使用 pgvector）

---

**记住：改代码前先检查是否有合适的 skill！**
