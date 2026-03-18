import prisma from "@/lib/prisma"
import { toPgVectorLiteral } from "@/lib/utils/vectorUtils"

export const INTERVIEW_QUESTION_COUNT = 3

export type InterviewTaskStatus =
  | "PENDING"
  | "IN_PROGRESS"
  | "EVALUATING"
  | "EVALUATED"

export type InterviewAnswers = Array<string | null>

type InterviewTaskRow = {
  id: string
  candidate_profile_id: string
  candidate_id: string
  questions: unknown
  answers: unknown
  status: string
  evaluation: unknown
  created_at: Date
  updated_at: Date
  evaluated_at: Date | null
}

export type InterviewTaskRecord = {
  id: string
  candidateProfileId: string
  candidateId: string
  questions: string[]
  answers: InterviewAnswers
  status: InterviewTaskStatus
  evaluation: unknown
  createdAt: Date
  updatedAt: Date
  evaluatedAt: Date | null
}

function emptyInterviewAnswers(): InterviewAnswers {
  return Array.from({ length: INTERVIEW_QUESTION_COUNT }, () => null)
}

function normalizeQuestions(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, INTERVIEW_QUESTION_COUNT)
}

export function normalizeInterviewAnswers(value: unknown): InterviewAnswers {
  const baseAnswers = emptyInterviewAnswers()

  if (!Array.isArray(value)) {
    return baseAnswers
  }

  value.slice(0, INTERVIEW_QUESTION_COUNT).forEach((item, index) => {
    if (typeof item !== "string") {
      return
    }

    const normalized = item.trim()
    baseAnswers[index] = normalized || null
  })

  return baseAnswers
}

export function countAnsweredAnswers(answers: InterviewAnswers): number {
  return answers.filter((answer): answer is string => Boolean(answer?.trim())).length
}

export function applyAnswerAtIndex(params: {
  answers: InterviewAnswers
  questionIndex: number
  answerText: string
}): InterviewAnswers {
  const { answers, questionIndex, answerText } = params
  const nextAnswers = [...answers]
  nextAnswers[questionIndex] = answerText.trim()
  return nextAnswers
}

function mapInterviewTaskRow(row: InterviewTaskRow): InterviewTaskRecord {
  return {
    id: row.id,
    candidateProfileId: row.candidate_profile_id,
    candidateId: row.candidate_id,
    questions: normalizeQuestions(row.questions),
    answers: normalizeInterviewAnswers(row.answers),
    status: (row.status as InterviewTaskStatus) || "PENDING",
    evaluation: row.evaluation,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    evaluatedAt: row.evaluated_at,
  }
}

async function findInterviewTaskByProfileId(
  candidateProfileId: string
): Promise<InterviewTaskRecord | null> {
  const rows = await prisma.$queryRaw<InterviewTaskRow[]>`
    SELECT
      id,
      candidate_profile_id,
      candidate_id,
      questions,
      answers,
      status,
      evaluation,
      created_at,
      updated_at,
      evaluated_at
    FROM interview_tasks
    WHERE candidate_profile_id = ${candidateProfileId}
    LIMIT 1
  `

  return rows[0] ? mapInterviewTaskRow(rows[0]) : null
}

export async function getOrCreateInterviewTask(params: {
  candidateProfileId: string
  candidateId: string
  questions: string[]
}): Promise<InterviewTaskRecord> {
  const existingTask = await findInterviewTaskByProfileId(params.candidateProfileId)

  if (existingTask) {
    return existingTask
  }

  const questionsJson = JSON.stringify(params.questions)
  const answersJson = JSON.stringify(emptyInterviewAnswers())
  const rows = await prisma.$queryRaw<InterviewTaskRow[]>`
    INSERT INTO interview_tasks (
      id,
      candidate_profile_id,
      candidate_id,
      questions,
      answers,
      status,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      ${params.candidateProfileId},
      ${params.candidateId},
      ${questionsJson}::jsonb,
      ${answersJson}::jsonb,
      ${"PENDING"},
      NOW(),
      NOW()
    )
    RETURNING
      id,
      candidate_profile_id,
      candidate_id,
      questions,
      answers,
      status,
      evaluation,
      created_at,
      updated_at,
      evaluated_at
  `

  return mapInterviewTaskRow(rows[0])
}

export async function updateInterviewTaskAnswers(params: {
  taskId: string
  answers: InterviewAnswers
  status: InterviewTaskStatus
}): Promise<InterviewTaskRecord> {
  const answersJson = JSON.stringify(params.answers)
  const rows = await prisma.$queryRaw<InterviewTaskRow[]>`
    UPDATE interview_tasks
    SET
      answers = ${answersJson}::jsonb,
      status = ${params.status},
      evaluation = NULL,
      evaluated_at = NULL,
      updated_at = NOW()
    WHERE id = ${params.taskId}
    RETURNING
      id,
      candidate_profile_id,
      candidate_id,
      questions,
      answers,
      status,
      evaluation,
      created_at,
      updated_at,
      evaluated_at
  `

  if (!rows[0]) {
    throw new Error("面试任务不存在或更新失败")
  }

  return mapInterviewTaskRow(rows[0])
}

export async function finalizeInterviewEvaluation(params: {
  taskId: string
  candidateProfileId: string
  answers: InterviewAnswers
  evaluation: unknown
  evolvedEmbedding: number[]
}): Promise<void> {
  const answersJson = JSON.stringify(params.answers)
  const evaluationJson = JSON.stringify(params.evaluation)
  const embeddingLiteral = toPgVectorLiteral(params.evolvedEmbedding)

  await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`
      UPDATE interview_tasks
      SET
        answers = ${answersJson}::jsonb,
        status = ${"EVALUATED"},
        evaluation = ${evaluationJson}::jsonb,
        evaluated_at = NOW(),
        updated_at = NOW()
      WHERE id = ${params.taskId}
    `

    await tx.$executeRaw`
      UPDATE candidate_profiles
      SET
        resume_embedding = ${embeddingLiteral}::vector,
        updated_at = NOW()
      WHERE id = ${params.candidateProfileId}
    `
  })
}
