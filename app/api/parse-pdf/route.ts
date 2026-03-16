import { NextRequest, NextResponse } from "next/server"
import { parsePDFFromURL } from "@/lib/services/pdfService"
import { analyzeResume, generateEmbedding } from "@/lib/services/aiService"
import { getRequestParam, isSupportedContentType } from "@/lib/utils/httpUtils"
import prisma from "@/lib/prisma"

export async function POST(request: NextRequest) {
  try {
    // 检查 Content-Type
    if (!isSupportedContentType(request.headers.get("content-type") || "")) {
      return NextResponse.json(
        {
          error: "不支持的 Content-Type，请使用 application/json 或 form-data",
        },
        { status: 400 }
      )
    }

    // 获取 pdfUrl 参数
    const pdfUrl = await getRequestParam(request, "pdfUrl")

    if (!pdfUrl) {
      return NextResponse.json({ error: "缺少 pdfUrl 参数" }, { status: 400 })
    }

    // 1. 解析 PDF
    const pdfResult = await parsePDFFromURL(pdfUrl)

    // 2. AI 结构化分析
    const aiReport = await analyzeResume(pdfResult.text)

    // 3. 生成嵌入向量
    const embedding = await generateEmbedding(JSON.stringify(aiReport))

    // 4. 存入数据库（使用原始 SQL 插入向量）
    const result = await prisma.$queryRaw`
      INSERT INTO candidate_profiles (
        id, candidate_id, name, ai_report, resume_embedding, pdf_url, created_at, updated_at
      ) VALUES (
        gen_random_uuid(),
        ${"test-user-001"},
        ${aiReport.name},
        ${JSON.stringify(aiReport)}::jsonb,
        ${embedding}::vector(1536),
        ${pdfUrl},
        NOW(),
        NOW()
      )
      RETURNING id, candidate_id, name, created_at
    `

    const savedProfile = Array.isArray(result) ? result[0] : result

    return NextResponse.json({
      success: true,
      data: {
        pdfUrl,
        pdfInfo: {
          numpages: pdfResult.numpages,
        },
        aiReport,
        savedProfile,
      },
    })
  } catch (error) {
    console.error("PDF 处理错误:", error)
    const errorMessage = error instanceof Error ? error.message : "未知错误"
    return NextResponse.json(
      {
        error: "PDF 处理失败",
        details: errorMessage,
      },
      { status: 500 }
    )
  }
}
