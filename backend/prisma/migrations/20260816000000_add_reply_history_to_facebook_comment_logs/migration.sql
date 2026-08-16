-- Migration: Add replyHistory JSON column to facebook_comment_logs
ALTER TABLE "facebook_comment_logs" ADD COLUMN IF NOT EXISTS "replyHistory" JSONB DEFAULT '[]';
