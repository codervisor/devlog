/*
  Warnings:

  - The `status` column on the `chat_sessions` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `content` on the `devlog_documents` table. All the data in the column will be lost.
  - You are about to drop the column `content_type` on the `devlog_documents` table. All the data in the column will be lost.
  - You are about to drop the column `title` on the `devlog_documents` table. All the data in the column will be lost.
  - The `type` column on the `devlog_entries` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `status` column on the `devlog_entries` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `priority` column on the `devlog_entries` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Changed the type of `role` on the `chat_messages` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `agent` on the `chat_sessions` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `type` on the `devlog_dependencies` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Added the required column `filename` to the `devlog_documents` table without a default value. This is not possible if the table is not empty.
  - Added the required column `mime_type` to the `devlog_documents` table without a default value. This is not possible if the table is not empty.
  - Added the required column `original_name` to the `devlog_documents` table without a default value. This is not possible if the table is not empty.
  - Added the required column `size` to the `devlog_documents` table without a default value. This is not possible if the table is not empty.
  - Added the required column `type` to the `devlog_documents` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `category` on the `devlog_notes` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- DropIndex
DROP INDEX "public"."devlog_documents_content_type_idx";

-- AlterTable
ALTER TABLE "public"."chat_messages" DROP COLUMN "role",
ADD COLUMN     "role" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "public"."chat_sessions" DROP COLUMN "agent",
ADD COLUMN     "agent" TEXT NOT NULL,
DROP COLUMN "status",
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'imported';

-- AlterTable
ALTER TABLE "public"."devlog_dependencies" DROP COLUMN "type",
ADD COLUMN     "type" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "public"."devlog_documents" DROP COLUMN "content",
DROP COLUMN "content_type",
DROP COLUMN "title",
ADD COLUMN     "binary_content" BYTEA,
ADD COLUMN     "filename" TEXT NOT NULL,
ADD COLUMN     "metadata" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN     "mime_type" TEXT NOT NULL,
ADD COLUMN     "original_name" TEXT NOT NULL,
ADD COLUMN     "size" INTEGER NOT NULL,
ADD COLUMN     "text_content" TEXT,
ADD COLUMN     "type" TEXT NOT NULL,
ADD COLUMN     "uploaded_by" TEXT;

-- AlterTable
ALTER TABLE "public"."devlog_entries" DROP COLUMN "type",
ADD COLUMN     "type" TEXT NOT NULL DEFAULT 'task',
DROP COLUMN "status",
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'new',
DROP COLUMN "priority",
ADD COLUMN     "priority" TEXT NOT NULL DEFAULT 'medium';

-- AlterTable
ALTER TABLE "public"."devlog_notes" DROP COLUMN "category",
ADD COLUMN     "category" TEXT NOT NULL;

-- DropEnum
DROP TYPE "public"."AgentType";

-- DropEnum
DROP TYPE "public"."ChatRole";

-- DropEnum
DROP TYPE "public"."ChatStatus";

-- DropEnum
DROP TYPE "public"."DevlogDependencyType";

-- DropEnum
DROP TYPE "public"."DevlogNoteCategory";

-- DropEnum
DROP TYPE "public"."DevlogPriority";

-- DropEnum
DROP TYPE "public"."DevlogStatus";

-- DropEnum
DROP TYPE "public"."DevlogType";

-- CreateIndex
CREATE INDEX "chat_messages_role_idx" ON "public"."chat_messages"("role");

-- CreateIndex
CREATE INDEX "chat_sessions_agent_idx" ON "public"."chat_sessions"("agent");

-- CreateIndex
CREATE INDEX "chat_sessions_status_idx" ON "public"."chat_sessions"("status");

-- CreateIndex
CREATE INDEX "devlog_dependencies_type_idx" ON "public"."devlog_dependencies"("type");

-- CreateIndex
CREATE INDEX "devlog_documents_mime_type_idx" ON "public"."devlog_documents"("mime_type");

-- CreateIndex
CREATE INDEX "devlog_documents_type_idx" ON "public"."devlog_documents"("type");

-- CreateIndex
CREATE INDEX "devlog_documents_original_name_idx" ON "public"."devlog_documents"("original_name");

-- CreateIndex
CREATE INDEX "devlog_entries_status_idx" ON "public"."devlog_entries"("status");

-- CreateIndex
CREATE INDEX "devlog_entries_type_idx" ON "public"."devlog_entries"("type");

-- CreateIndex
CREATE INDEX "devlog_entries_priority_idx" ON "public"."devlog_entries"("priority");

-- CreateIndex
CREATE INDEX "devlog_notes_category_idx" ON "public"."devlog_notes"("category");
