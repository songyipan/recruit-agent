import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import prisma from "@/lib/prisma"
import {
  buildEvolvedEmbeddingText,
  evaluateInterviewAnswers,
  generateEmbedding,
  parseInterviewEvaluation,
  parseResumeAnalysis,
} from "@/lib/services/aiService"
import {
  applyAnswerAtIndex,
  countAnsweredAnswers,
  finalizeInterviewEvaluation,
  getOrCreateInterviewTask,
  INTERVIEW_QUESTION_COUNT,
  normalizeInterviewAnswers,
  updateInterviewTaskAnswers,
} from "@/lib/services/interviewService"

const submitInterviewAnswerSchema = z
  .object({
    profileId: z.string().trim().min(1).optional(),
    candidateId: z.string().trim().min(1).optional(),
    questionIndex: z.coerce.number().int().min(0).max(2).optional(),
    answerText: z.string().trim().min(1).max(8000).optional(),
    answers: z.array(z.string().trim().min(1).max(8000)).length(3).optional(),
  })
  .superRefine((value, ctx) => {
    if (!value.profileId && !value.candidateId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "profileId 和 candidateId 至少需要传一个",
        path: ["profileId"],
      })
    }

    if (!value.answers && value.questionIndex === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "缺少 questionIndex",
        path: ["questionIndex"],
      })
    }

    if (!value.answers && !value.answerText) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "缺少 answerText",
        path: ["answerText"],
      })
    }
  })

async function findCandidateProfile(params: {
  profileId?: string
  candidateId?: string
}) {
  if (params.profileId) {
    return prisma.candidateProfile.findUnique({
      where: { id: params.profileId },
    })
  }

  return prisma.candidateProfile.findFirst({
    where: { candidateId: params.candidateId },
    orderBy: { createdAt: "desc" },
  })
}

export async function POST(request: NextRequest) {
  try {
    let rawBody: unknown

    try {
      rawBody = (await request.json()) as unknown
    } catch {
      return NextResponse.json(
        {
          error: "请求体不是合法 JSON",
          details:
            "answerText 如果包含换行、双引号或特殊字符，请使用合法 JSON 编码后再提交。",
        },
        { status: 400 }
      )
    }

    const parsedBody = submitInterviewAnswerSchema.safeParse(rawBody)

    if (!parsedBody.success) {
      return NextResponse.json(
        {
          error: "请求参数不合法",
          details: parsedBody.error.flatten(),
        },
        { status: 400 }
      )
    }

    const body = parsedBody.data
    const profile = await findCandidateProfile({
      profileId: body.profileId,
      candidateId: body.candidateId,
    })

    if (!profile) {
      return NextResponse.json({ error: "候选人画像不存在" }, { status: 404 })
    }

    if (body.candidateId && profile.candidateId !== body.candidateId) {
      return NextResponse.json(
        { error: "candidateId 与 profileId 不匹配" },
        { status: 400 }
      )
    }

    const resumeAnalysis = parseResumeAnalysis(profile.aiReport)
    const interviewTask = await getOrCreateInterviewTask({
      candidateProfileId: profile.id,
      candidateId: profile.candidateId,
      questions: resumeAnalysis.interviewQuestions,
    })

    const existingAnswers = normalizeInterviewAnswers(interviewTask.answers)
    const nextAnswers = body.answers
      ? [...body.answers]
      : applyAnswerAtIndex({
          answers: existingAnswers,
          questionIndex: body.questionIndex ?? 0,
          answerText: body.answerText ?? "",
        })
    const answersChanged =
      JSON.stringify(existingAnswers) !== JSON.stringify(nextAnswers)
    const answeredCount = countAnsweredAnswers(nextAnswers)

    if (
      !answersChanged &&
      answeredCount === INTERVIEW_QUESTION_COUNT &&
      interviewTask.status === "EVALUATED" &&
      interviewTask.evaluation
    ) {
      try {
        const existingEvaluation = parseInterviewEvaluation(
          interviewTask.evaluation
        )

        return NextResponse.json({
          success: true,
          status: "evaluated",
          data: {
            taskId: interviewTask.id,
            profileId: profile.id,
            candidateId: profile.candidateId,
            answeredCount,
            totalQuestions: INTERVIEW_QUESTION_COUNT,
            evaluation: existingEvaluation,
          },
        })
      } catch (error) {
        console.warn("已存储评价结构异常，准备重新评价:", error)
      }
    }

    if (answeredCount < INTERVIEW_QUESTION_COUNT) {
      const updatedTask = answersChanged
        ? await updateInterviewTaskAnswers({
            taskId: interviewTask.id,
            answers: nextAnswers,
            status: answeredCount === 0 ? "PENDING" : "IN_PROGRESS",
          })
        : interviewTask

      return NextResponse.json({
        success: true,
        status: "collecting",
        data: {
          taskId: updatedTask.id,
          profileId: profile.id,
          candidateId: profile.candidateId,
          answeredCount,
          totalQuestions: INTERVIEW_QUESTION_COUNT,
          remainingQuestions: INTERVIEW_QUESTION_COUNT - answeredCount,
          questions: resumeAnalysis.interviewQuestions,
          answers: nextAnswers,
        },
      })
    }

    await updateInterviewTaskAnswers({
      taskId: interviewTask.id,
      answers: nextAnswers,
      status: "EVALUATING",
    })

    try {
      const completeAnswers = nextAnswers.filter(
        (answer): answer is string => typeof answer === "string" && Boolean(answer)
      )
      const evaluation = await evaluateInterviewAnswers({
        profile: resumeAnalysis,
        answers: completeAnswers,
      })
      const evolvedEmbeddingInput = buildEvolvedEmbeddingText({
        profile: resumeAnalysis,
        answers: completeAnswers,
        evaluation,
      })
      const evolvedEmbedding = await generateEmbedding(evolvedEmbeddingInput)

      await finalizeInterviewEvaluation({
        taskId: interviewTask.id,
        candidateProfileId: profile.id,
        answers: nextAnswers,
        evaluation,
        evolvedEmbedding,
      })

      return NextResponse.json({
        success: true,
        status: "evaluated",
        data: {
          taskId: interviewTask.id,
          profileId: profile.id,
          candidateId: profile.candidateId,
          answeredCount: INTERVIEW_QUESTION_COUNT,
          totalQuestions: INTERVIEW_QUESTION_COUNT,
          evaluation,
        },
      })
    } catch (error) {
      await updateInterviewTaskAnswers({
        taskId: interviewTask.id,
        answers: nextAnswers,
        status: "IN_PROGRESS",
      })

      throw error
    }
  } catch (error) {
    console.error("面试评价失败:", error)
    const errorMessage = error instanceof Error ? error.message : "未知错误"

    return NextResponse.json(
      {
        error: "面试评价失败",
        details: errorMessage,
      },
      { status: 500 }
    )
  }
}
