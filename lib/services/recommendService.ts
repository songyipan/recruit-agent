import prisma from "@/lib/prisma"
import {
  type InterviewEvaluation,
  parseInterviewEvaluation,
  type ResumeAnalysis,
  parseResumeAnalysis,
} from "@/lib/services/aiService"

type CandidateRecommendationRow = {
  id: string
  candidate_id: string
  name: string
  ai_report: unknown
  pdf_url: string
  created_at: Date
  updated_at: Date
  interview_status: string | null
  evaluation: unknown
  evaluated_at: Date | null
  similarity: number
}

export type CandidateRecommendation = {
  profileId: string
  candidateId: string
  name: string
  matchScore: number
  similarity: number
  coreStrengths: string[]
  projectAuthenticity: string | null
  riskPoints: string[]
  interview: {
    status: string | null
    overallScore: number | null
    insight: string | null
    updatedSkills: string[]
    credibilityVerdict: InterviewEvaluation["credibilityVerdict"] | null
    evaluatedAt: string | null
  }
  aiReport: ResumeAnalysis | null
  pdfUrl: string
  createdAt: string
  updatedAt: string
}

function safeParseResumeAnalysis(value: unknown): ResumeAnalysis | null {
  try {
    return parseResumeAnalysis(value)
  } catch (error) {
    console.warn("候选人画像解析失败，已降级返回:", error)
    return null
  }
}

function safeParseInterviewEvaluation(
  value: unknown
): InterviewEvaluation | null {
  if (!value) {
    return null
  }

  try {
    return parseInterviewEvaluation(value)
  } catch (error) {
    console.warn("面试评价解析失败，已降级返回:", error)
    return null
  }
}

function collectCoreStrengths(params: {
  aiReport: ResumeAnalysis | null
  evaluation: InterviewEvaluation | null
}): string[] {
  const { aiReport, evaluation } = params
  const values = [
    ...(evaluation?.updatedSkills ?? []),
    ...(aiReport?.skillTree.frontend ?? []),
    ...(aiReport?.skillTree.backend ?? []),
    ...(aiReport?.skillTree.others ?? []),
  ]

  const uniqueValues = Array.from(
    new Set(
      values
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim())
        .filter(Boolean)
    )
  )

  return uniqueValues.slice(0, 8)
}

function normalizeSimilarity(value: number): number {
  if (!Number.isFinite(value)) {
    return 0
  }

  return Math.max(-1, Math.min(1, value))
}

function toMatchScore(similarity: number): number {
  const normalized = normalizeSimilarity(similarity)
  return Math.round(Math.max(0, normalized) * 100)
}

function mapRecommendationRow(
  row: CandidateRecommendationRow
): CandidateRecommendation {
  const aiReport = safeParseResumeAnalysis(row.ai_report)
  const evaluation = safeParseInterviewEvaluation(row.evaluation)
  const similarity = normalizeSimilarity(Number(row.similarity))

  return {
    profileId: row.id,
    candidateId: row.candidate_id,
    name: row.name,
    matchScore: toMatchScore(similarity),
    similarity,
    coreStrengths: collectCoreStrengths({ aiReport, evaluation }),
    projectAuthenticity: aiReport?.projectAuthenticity ?? null,
    riskPoints: aiReport?.riskPoints ?? [],
    interview: {
      status: row.interview_status,
      overallScore: evaluation?.overallScore ?? null,
      insight: evaluation?.insight ?? null,
      updatedSkills: evaluation?.updatedSkills ?? [],
      credibilityVerdict: evaluation?.credibilityVerdict ?? null,
      evaluatedAt: row.evaluated_at?.toISOString() ?? null,
    },
    aiReport,
    pdfUrl: row.pdf_url,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  }
}

export async function findRecommendedCandidates(params: {
  jdVectorLiteral: string
  limit: number
}): Promise<CandidateRecommendation[]> {
  const rows = await prisma.$queryRaw<CandidateRecommendationRow[]>`
    SELECT
      cp.id,
      cp.candidate_id,
      cp.name,
      cp.ai_report,
      cp.pdf_url,
      cp.created_at,
      cp.updated_at,
      it.status AS interview_status,
      it.evaluation,
      it.evaluated_at,
      (1 - (cp.resume_embedding <=> ${params.jdVectorLiteral}::vector))::double precision AS similarity
    FROM candidate_profiles cp
    LEFT JOIN interview_tasks it
      ON it.candidate_profile_id = cp.id
    ORDER BY cp.resume_embedding <=> ${params.jdVectorLiteral}::vector ASC
    LIMIT ${params.limit}
  `

  return rows.map(mapRecommendationRow)
}
