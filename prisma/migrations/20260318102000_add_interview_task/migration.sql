-- CreateTable
CREATE TABLE "interview_tasks" (
    "id" TEXT NOT NULL,
    "candidate_profile_id" TEXT NOT NULL,
    "candidate_id" TEXT NOT NULL,
    "questions" JSONB NOT NULL,
    "answers" JSONB,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "evaluation" JSONB,
    "evaluated_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "interview_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "interview_tasks_candidate_profile_id_key" ON "interview_tasks"("candidate_profile_id");

-- CreateIndex
CREATE INDEX "interview_tasks_candidate_id_idx" ON "interview_tasks"("candidate_id");

-- AddForeignKey
ALTER TABLE "interview_tasks"
ADD CONSTRAINT "interview_tasks_candidate_profile_id_fkey"
FOREIGN KEY ("candidate_profile_id") REFERENCES "candidate_profiles"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;
