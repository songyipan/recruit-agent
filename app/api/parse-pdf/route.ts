import { NextRequest, NextResponse } from "next/server"
import { parsePDFFromURL } from "@/lib/services/pdfService"
import { analyzeResume, generateEmbedding } from "@/lib/services/aiService"
import {
  getSupportedRequestPayload,
  isSupportedContentType,
} from "@/lib/utils/httpUtils"
import prisma from "@/lib/prisma"
import { toPgVectorLiteral } from "@/lib/utils/vectorUtils"

const DEFAULT_CANDIDATE_ID = "test-user-001"

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

    const payload = await getSupportedRequestPayload(request)
    const pdfUrl =
      typeof payload.pdfUrl === "string" ? payload.pdfUrl.trim() : null
    const candidateId =
      typeof payload.candidateId === "string" && payload.candidateId.trim()
        ? payload.candidateId.trim()
        : DEFAULT_CANDIDATE_ID

    if (!pdfUrl) {
      return NextResponse.json({ error: "缺少 pdfUrl 参数" }, { status: 400 })
    }

    // 1. 解析 PDF
    const pdfResult = await parsePDFFromURL(pdfUrl)

    // 2. AI 结构化分析
    const aiReport = await analyzeResume(pdfResult.text)

    // 3. 生成嵌入向量
    const embedding = await generateEmbedding(JSON.stringify(aiReport))
    const embeddingLiteral = toPgVectorLiteral(embedding)
    const aiReportJson = JSON.stringify(aiReport)
    const questionsJson = JSON.stringify(aiReport.interviewQuestions)
    const emptyAnswersJson = JSON.stringify([null, null, null])

    // 4. 存入数据库（使用原始 SQL 插入向量）
    const profileResult = await prisma.$queryRaw`
      INSERT INTO candidate_profiles (
        id, candidate_id, name, ai_report, resume_embedding, pdf_url, created_at, updated_at
      ) VALUES (
        gen_random_uuid(),
        ${candidateId},
        ${aiReport.name},
        ${aiReportJson}::jsonb,
        ${embeddingLiteral}::vector,
        ${pdfUrl},
        NOW(),
        NOW()
      )
      RETURNING id, candidate_id, name, created_at
    `

    const savedProfile = Array.isArray(profileResult)
      ? profileResult[0]
      : profileResult

    const interviewTaskResult = await prisma.$queryRaw`
      INSERT INTO interview_tasks (
        id, candidate_profile_id, candidate_id, questions, answers, status, created_at, updated_at
      ) VALUES (
        gen_random_uuid(),
        ${savedProfile.id},
        ${candidateId},
        ${questionsJson}::jsonb,
        ${emptyAnswersJson}::jsonb,
        ${"PENDING"},
        NOW(),
        NOW()
      )
      RETURNING id, status, questions, created_at
    `

    const savedInterviewTask = Array.isArray(interviewTaskResult)
      ? interviewTaskResult[0]
      : interviewTaskResult

    return NextResponse.json({
      success: true,
      data: {
        profileId: savedProfile.id,
        candidateId,
        pdfUrl,
        pdfInfo: {
          numpages: pdfResult.numpages,
        },
        aiReport,
        savedProfile,
        interviewTask: savedInterviewTask,
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
