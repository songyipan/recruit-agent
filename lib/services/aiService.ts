import { openai } from "@ai-sdk/openai"
import { generateObject, embed } from "ai"
import { z } from "zod"

// 定义简历分析结果的结构
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

/**
 * 使用 AI 分析简历文本
 */
export async function analyzeResume(
  resumeText: string
): Promise<ResumeAnalysis> {
  const { object: aiReport } = await generateObject({
    model: openai("gpt-4o"),
    schema: resumeAnalysisSchema,
    prompt: `你是一个资深技术专家和猎头，请分析以下简历文本，给出深度画像：

${resumeText}`,
  })

  return aiReport
}

/**
 * 生成文本的嵌入向量
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const { embedding } = await embed({
    model: openai.embedding("text-embedding-3-small"),
    value: text,
  })

  return embedding
}
