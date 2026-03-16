import Anthropic from "@anthropic-ai/sdk"
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

// 初始化 Anthropic 客户端（使用 MiniMax）
const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
  baseURL: "https://api.minimaxi.com/anthropic",
})

/**
 * 使用 MiniMax AI 分析简历文本
 */
export async function analyzeResume(
  resumeText: string
): Promise<ResumeAnalysis> {
  const prompt = `你是一个资深技术专家和猎头，请分析以下简历文本，给出深度画像。

请严格按照以下 JSON 格式返回结果：
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

  const message = await client.messages.create({
    model: "MiniMax-M2.5",
    max_tokens: 2000,
    system:
      "你是一个专业的技术招聘专家，擅长分析简历并提取关键信息。你必须以 JSON 格式返回结果。",
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: prompt,
          },
        ],
      },
    ],
  })

  // 解析返回的 JSON
  const textContent = message.content.find((block) => block.type === "text")
  if (!textContent || textContent.type !== "text") {
    throw new Error("AI 返回结果格式错误")
  }

  // 提取 JSON（可能包含 markdown 代码块）
  const jsonMatch = textContent.text.match(/```json\n?([\s\S]*?)\n?```|([\s\S]*)/)
  const jsonStr = jsonMatch?.[1] || jsonMatch?.[2] || textContent.text

  try {
    const parsed = JSON.parse(jsonStr.trim())
    return resumeAnalysisSchema.parse(parsed)
  } catch (error) {
    console.error("JSON 解析错误:", error)
    console.error("原始文本:", textContent.text)
    throw new Error("AI 返回结果解析失败")
  }
}

/**
 * 生成文本的嵌入向量
 * 注意：MiniMax 暂不支持嵌入 API，使用 OpenAI 的嵌入
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const { openai } = await import("@ai-sdk/openai")
  const { embed } = await import("ai")

  const { embedding } = await embed({
    model: openai.embedding("text-embedding-3-small"),
    value: text,
  })

  return embedding
}
