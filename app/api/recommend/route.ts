import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { generateEmbedding } from "@/lib/services/aiService"
import { findRecommendedCandidates } from "@/lib/services/recommendService"
import { toPgVectorLiteral } from "@/lib/utils/vectorUtils"

const recommendRequestSchema = z.object({
  jdText: z.string().trim().min(1, "请输入职位要求").max(20000),
  limit: z.coerce.number().int().min(1).max(20).default(5),
})

export async function POST(request: NextRequest) {
  try {
    let rawBody: unknown

    try {
      rawBody = (await request.json()) as unknown
    } catch {
      return NextResponse.json(
        {
          error: "请求体不是合法 JSON",
          details: "请使用 JSON 传递 jdText，必要时对换行和双引号做转义。",
        },
        { status: 400 }
      )
    }

    const parsedBody = recommendRequestSchema.safeParse(rawBody)

    if (!parsedBody.success) {
      return NextResponse.json(
        {
          error: "请求参数不合法",
          details: parsedBody.error.flatten(),
        },
        { status: 400 }
      )
    }

    const { jdText, limit } = parsedBody.data
    const jdVector = await generateEmbedding(jdText)
    const jdVectorLiteral = toPgVectorLiteral(jdVector)
    const candidates = await findRecommendedCandidates({
      jdVectorLiteral,
      limit,
    })

    return NextResponse.json({
      success: true,
      data: {
        jdText,
        limit,
        total: candidates.length,
        candidates,
      },
    })
  } catch (error) {
    console.error("推荐失败:", error)
    const errorMessage = error instanceof Error ? error.message : "未知错误"

    return NextResponse.json(
      {
        error: "检索失败",
        details: errorMessage,
      },
      { status: 500 }
    )
  }
}
