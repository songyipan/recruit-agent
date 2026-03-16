-- CreateTable
CREATE TABLE "candidate_profiles" (
    "id" TEXT NOT NULL,
    "candidate_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "ai_report" JSONB NOT NULL,
    "resume_embedding" vector(1536) NOT NULL,
    "pdf_url" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "candidate_profiles_pkey" PRIMARY KEY ("id")
);
