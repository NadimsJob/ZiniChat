-- Migration: Fix knowledge_chunks embedding dimension
-- Switching from OpenAI text-embedding-3-small (1536-dim) to Gemini text-embedding-004 (768-dim)
-- IMPORTANT: This drops and recreates the HNSW index. Existing embeddings stored as vector(1536)
-- must be re-generated after applying this migration.

-- Step 1: Drop existing HNSW index (dimension-specific, cannot be reused after type change)
DROP INDEX IF EXISTS knowledge_chunks_embedding_hnsw_idx;

-- Step 2: Truncate existing embeddings (1536-dim vectors are incompatible with vector(768) column)
-- This sets all existing chunk embeddings to NULL so they can be re-embedded with Gemini.
UPDATE "knowledge_chunks" SET "embedding" = NULL;

-- Step 3: Alter column type from vector(1536) to vector(768)
ALTER TABLE "knowledge_chunks"
  ALTER COLUMN "embedding" TYPE vector(768)
  USING NULL;

-- Step 4: Recreate HNSW index for new 768-dim cosine similarity search
CREATE INDEX IF NOT EXISTS knowledge_chunks_embedding_hnsw_idx
  ON knowledge_chunks
  USING hnsw (embedding vector_cosine_ops);

-- Step 5: Mark all previously 'completed' documents as 'pending' so they are re-processed
-- (re-embedded with Gemini text-embedding-004)
UPDATE "knowledge_documents" SET "status" = 'pending' WHERE "status" = 'completed';
