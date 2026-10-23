-- CreateIndex
CREATE INDEX IF NOT EXISTS "conversations_tenantId_isArchived_lastMessageAt_idx" ON "conversations"("tenantId", "isArchived", "lastMessageAt" DESC);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "conversations_tenantId_lastMessageAt_idx" ON "conversations"("tenantId", "lastMessageAt" DESC);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "conversations_tenantId_unreadCount_idx" ON "conversations"("tenantId", "unreadCount");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "messages_conversationId_createdAt_idx" ON "messages"("conversationId", "createdAt");
