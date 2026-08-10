DROP INDEX IF EXISTS knowledge_chunks_embedding_hnsw_idx;

CREATE INDEX IF NOT EXISTS knowledge_chunks_embedding_hnsw_idx 
ON knowledge_chunks 
USING hnsw (embedding vector_cosine_ops);
