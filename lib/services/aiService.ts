import { createOpenAI } from "@ai-sdk/openai"
import { embed, generateText } from "ai"
import { z } from "zod"

export const resumeAnalysisSchema = z.object({
  name: z.string(),
  skillTree: z.object({
    frontend: z.array(z.string()),
    backend: z.array(z.string()),
    others: z.array(z.string()),
  }),
  riskPoints: z
    .array(z.string())
    .describe("分析简历中的断档、跳槽频率或描述模糊处"),
  projectAuthenticity: z
    .string()
    .describe("根据项目描述的技术细节判断真实性，并给出评分"),
  interviewQuestions: z
    .array(z.string())
    .length(3)
    .describe("针对简历薄弱点生成的3道面试题"),
})

export type ResumeAnalysis = z.infer<typeof resumeAnalysisSchema>

export const interviewEvaluationSchema = z.object({
  overallScore: z.number().min(0).max(100),
  insight: z.string().min(1),
  updatedSkills: z.array(z.string()),
  credibilityVerdict: z.enum(["credible", "mixed", "suspicious"]),
  suggestedProfileAdjustment: z.string().min(1),
  embeddingSummary: z.string().min(1),
})

export type InterviewEvaluation = z.infer<typeof interviewEvaluationSchema>

const DEFAULT_OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1"
const DEFAULT_ANALYSIS_MODEL = "openrouter/hunter-alpha"
const DEFAULT_EMBEDDING_MODEL = "openai/text-embedding-3-small"

function getRequiredEnv(name: string): string {
  const value = process.env[name]?.trim()

  if (!value) {
    throw new Error(`缺少 ${name} 环境变量`)
  }

  return value
}

function createOpenRouterClient() {
  const headers: Record<string, string> = {}
  const siteUrl = process.env.OPENROUTER_SITE_URL?.trim()
  const appName = process.env.OPENROUTER_APP_NAME?.trim()

  if (siteUrl) {
    headers["HTTP-Referer"] = siteUrl
  }

  if (appName) {
    headers["X-Title"] = appName
  }

  return createOpenAI({
    name: "openrouter",
    apiKey: getRequiredEnv("OPENROUTER_API_KEY"),
    baseURL: process.env.OPENROUTER_BASE_URL?.trim() || DEFAULT_OPENROUTER_BASE_URL,
    headers,
  })
}

function getAnalysisModelId(): string {
  return process.env.OPENROUTER_MODEL?.trim() || DEFAULT_ANALYSIS_MODEL
}

function getEmbeddingModelId(): string {
  return (
    process.env.OPENROUTER_EMBEDDING_MODEL?.trim() || DEFAULT_EMBEDDING_MODEL
  )
}

function extractJson(text: string): string {
  const fencedMatch = text.match(/```json\s*([\s\S]*?)\s*```/i)

  if (fencedMatch?.[1]) {
    return fencedMatch[1].trim()
  }

  return text.trim()
}

function normalizeStringArray(value: unknown, maxItems?: number): unknown {
  if (!Array.isArray(value)) {
    return value
  }

  const normalized = value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean)

  return typeof maxItems === "number"
    ? normalized.slice(0, maxItems)
    : normalized
}

function normalizeNumber(value: unknown): unknown {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value
  }

  if (typeof value === "string") {
    const parsed = Number(value)

    if (Number.isFinite(parsed)) {
      return parsed
    }
  }

  return value
}

function normalizeResumeAnalysis(value: unknown): unknown {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return value
  }

  const parsed = value as Record<string, unknown>
  const skillTree = parsed.skillTree
  const normalizedSkillTree =
    skillTree && typeof skillTree === "object" && !Array.isArray(skillTree)
      ? {
          ...(skillTree as Record<string, unknown>),
          frontend: normalizeStringArray(
            (skillTree as Record<string, unknown>).frontend
          ),
          backend: normalizeStringArray(
            (skillTree as Record<string, unknown>).backend
          ),
          others: normalizeStringArray(
            (skillTree as Record<string, unknown>).others
          ),
        }
      : skillTree

  return {
    ...parsed,
    skillTree: normalizedSkillTree,
    riskPoints: normalizeStringArray(parsed.riskPoints),
    interviewQuestions: normalizeStringArray(parsed.interviewQuestions, 3),
  }
}

function normalizeInterviewEvaluation(value: unknown): unknown {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return value
  }

  const parsed = value as Record<string, unknown>
  const credibilityVerdict =
    typeof parsed.credibilityVerdict === "string"
      ? parsed.credibilityVerdict.trim().toLowerCase()
      : parsed.credibilityVerdict

  return {
    ...parsed,
    overallScore: normalizeNumber(parsed.overallScore),
    updatedSkills: normalizeStringArray(parsed.updatedSkills),
    credibilityVerdict,
  }
}

export function parseResumeAnalysis(value: unknown): ResumeAnalysis {
  const normalized = normalizeResumeAnalysis(value)
  const result = resumeAnalysisSchema.safeParse(normalized)

  if (result.success) {
    return result.data
  }

  console.error("简历画像结构校验错误:", result.error.flatten())
  throw new Error("候选人画像结构不符合预期")
}

export function parseInterviewEvaluation(value: unknown): InterviewEvaluation {
  const normalized = normalizeInterviewEvaluation(value)
  const result = interviewEvaluationSchema.safeParse(normalized)

  if (result.success) {
    return result.data
  }

  console.error("面试评价结构校验错误:", result.error.flatten())
  throw new Error("面试评价结构不符合预期")
}

export async function analyzeResume(
  resumeText: string
): Promise<ResumeAnalysis> {
  const openrouter = createOpenRouterClient()

  const prompt = `你是一个资深技术专家和猎头，请分析以下简历文本，给出深度画像。

请严格按照以下 JSON 格式返回结果，不要额外输出说明文字。
interviewQuestions 必须不多不少正好 3 条；如果你想到超过 3 条，也只能保留最重要的 3 条。
JSON 格式如下：
{
  "name": "候选人姓名",
  "skillTree": {
    "frontend": ["前端技能1", "前端技能2"],
    "backend": ["后端技能1", "后端技能2"],
    "others": ["其他技能"]
  },
  "riskPoints": ["风险点1", "风险点2"],
  "projectAuthenticity": "项目真实性分析...",
  "interviewQuestions": ["面试题1", "面试题2", "面试题3"]
}

简历文本：
${resumeText}`

  const { text } = await generateText({
    model: openrouter.chat(getAnalysisModelId()),
    maxOutputTokens: 2000,
    temperature: 0.2,
    system:
      "你是一个专业的技术招聘专家，擅长分析简历并提取关键信息。你必须只返回合法 JSON 对象，不要输出 markdown 代码块。",
    prompt,
  })

  let parsed: unknown

  try {
    parsed = JSON.parse(extractJson(text))
  } catch (error) {
    console.error("JSON 解析错误:", error)
    console.error("原始文本:", text)
    throw new Error("AI 返回结果解析失败")
  }

  try {
    return parseResumeAnalysis(parsed)
  } catch (error) {
    console.error("原始文本:", text)
    throw error
  }
}

export async function generateEmbedding(text: string): Promise<number[]> {
  const openrouter = createOpenRouterClient()

  const { embedding } = await embed({
    model: openrouter.embedding(getEmbeddingModelId()),
    value: text,
  })

  return embedding
}

export async function evaluateInterviewAnswers(params: {
  profile: ResumeAnalysis
  answers: string[]
}): Promise<InterviewEvaluation> {
  const { profile, answers } = params
  const openrouter = createOpenRouterClient()
  const prompt = `你是一个严谨但公平的技术面试官。请结合候选人原始简历画像、影子面试题与回答，判断他到底是真懂、半懂还是包装。

请严格按照以下 JSON 格式返回结果，不要额外输出说明文字。
{
  "overallScore": 87,
  "insight": "一句到两句总结候选人回答深度与真实性。",
  "updatedSkills": ["新增或被强化的技能1", "新增或被强化的技能2"],
  "credibilityVerdict": "credible",
  "suggestedProfileAdjustment": "说明应如何修正原始画像与风险点。",
  "embeddingSummary": "80 到 200 字的能力画像总结，强调真实技术深度、擅长方向、暴露出的短板和可信度，用于后续生成新的向量，不要写分数，不要写题号。"
}

返回规则：
1. overallScore 只能是 0 到 100 的数字。
2. credibilityVerdict 只能是 credible、mixed、suspicious 三个值之一。
3. updatedSkills 只保留最重要的技能，避免空数组以外的无效内容。
4. 如果回答空泛、套话、明显回避问题，要在 insight 与 suggestedProfileAdjustment 中明确指出。
5. 如果回答展现出比简历更强的深度，要在 updatedSkills 与 embeddingSummary 中体现“能力进化”。

候选人简历画像：
${JSON.stringify(profile, null, 2)}

候选人的 3 道影子面试题：
${JSON.stringify(profile.interviewQuestions, null, 2)}

候选人的回答：
${JSON.stringify(answers, null, 2)}`

  const { text } = await generateText({
    model: openrouter.chat(getAnalysisModelId()),
    maxOutputTokens: 1500,
    temperature: 0.2,
    system:
      "你是资深技术面试官，只能返回合法 JSON 对象，不要输出 markdown 代码块。",
    prompt,
  })

  let parsed: unknown

  try {
    parsed = JSON.parse(extractJson(text))
  } catch (error) {
    console.error("JSON 解析错误:", error)
    console.error("原始文本:", text)
    throw new Error("面试评价解析失败")
  }

  try {
    return parseInterviewEvaluation(parsed)
  } catch (error) {
    console.error("原始文本:", text)
    throw error
  }
}

export function buildEvolvedEmbeddingText(params: {
  profile: ResumeAnalysis
  answers: string[]
  evaluation: InterviewEvaluation
}): string {
  const { profile, answers, evaluation } = params

  return [
    `候选人：${profile.name}`,
    `原始技能树：${JSON.stringify(profile.skillTree)}`,
    `原始风险点：${profile.riskPoints.join("；") || "无明显风险点"}`,
    `项目真实性判断：${profile.projectAuthenticity}`,
    `影子面试题：${profile.interviewQuestions.join(" | ")}`,
    `候选人回答：${answers.join(" | ")}`,
    `能力进化总结：${evaluation.embeddingSummary}`,
    `新增或强化技能：${evaluation.updatedSkills.join("、") || "无"}`,
    `画像修正建议：${evaluation.suggestedProfileAdjustment}`,
    `可信度判断：${evaluation.credibilityVerdict}`,
  ].join("\n")
}
