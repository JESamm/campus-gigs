-- AlterTable
ALTER TABLE "User" ADD COLUMN "githubUrl" TEXT;
ALTER TABLE "User" ADD COLUMN "linkedinUrl" TEXT;
ALTER TABLE "User" ADD COLUMN "twitterUrl" TEXT;
ALTER TABLE "User" ADD COLUMN "websiteUrl" TEXT;

-- CreateTable
CREATE TABLE "ProjectFile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "size" INTEGER NOT NULL DEFAULT 0,
    "mimeType" TEXT NOT NULL DEFAULT 'application/octet-stream',
    "path" TEXT NOT NULL DEFAULT '/',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "projectId" TEXT NOT NULL,
    "uploadedById" TEXT NOT NULL,
    CONSTRAINT "ProjectFile_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ProjectFile_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ProjectDiscussion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "pinned" BOOLEAN NOT NULL DEFAULT false,
    "closed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "projectId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    CONSTRAINT "ProjectDiscussion_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ProjectDiscussion_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DiscussionReply" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "body" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "discussionId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    CONSTRAINT "DiscussionReply_discussionId_fkey" FOREIGN KEY ("discussionId") REFERENCES "ProjectDiscussion" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DiscussionReply_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Project" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "skillsNeeded" TEXT NOT NULL DEFAULT '[]',
    "maxMembers" INTEGER NOT NULL DEFAULT 5,
    "status" TEXT NOT NULL DEFAULT 'open',
    "visibility" TEXT NOT NULL DEFAULT 'public',
    "readme" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deadline" DATETIME,
    "createdById" TEXT NOT NULL,
    CONSTRAINT "Project_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Project" ("category", "createdAt", "createdById", "deadline", "description", "id", "maxMembers", "skillsNeeded", "status", "title", "updatedAt") SELECT "category", "createdAt", "createdById", "deadline", "description", "id", "maxMembers", "skillsNeeded", "status", "title", "updatedAt" FROM "Project";
DROP TABLE "Project";
ALTER TABLE "new_Project" RENAME TO "Project";
CREATE INDEX "Project_createdById_idx" ON "Project"("createdById");
CREATE INDEX "Project_status_idx" ON "Project"("status");
CREATE INDEX "Project_category_idx" ON "Project"("category");
CREATE INDEX "Project_visibility_idx" ON "Project"("visibility");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "ProjectFile_projectId_idx" ON "ProjectFile"("projectId");

-- CreateIndex
CREATE INDEX "ProjectFile_uploadedById_idx" ON "ProjectFile"("uploadedById");

-- CreateIndex
CREATE INDEX "ProjectDiscussion_projectId_idx" ON "ProjectDiscussion"("projectId");

-- CreateIndex
CREATE INDEX "ProjectDiscussion_authorId_idx" ON "ProjectDiscussion"("authorId");

-- CreateIndex
CREATE INDEX "DiscussionReply_discussionId_idx" ON "DiscussionReply"("discussionId");

-- CreateIndex
CREATE INDEX "DiscussionReply_authorId_idx" ON "DiscussionReply"("authorId");
