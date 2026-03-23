-- Upgrade embedding columns to 2048 dimensions for NVIDIA Llama Nemotron Embed VL 1B V2
ALTER TABLE "embeddings"
  ALTER COLUMN "embedding" TYPE vector(2048);

ALTER TABLE "candidate_profiles"
  ALTER COLUMN "resume_embedding" TYPE vector(2048);
