-- CreateIndex
CREATE INDEX "Artwork_status_createdAt_idx" ON "Artwork"("status", "createdAt" DESC);