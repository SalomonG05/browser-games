-- CreateTable
CREATE TABLE "Party" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "shortName" TEXT NOT NULL,
    "website" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Source" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "partyId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "title" TEXT,
    "rawText" TEXT NOT NULL,
    "fetchedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "contentHash" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL DEFAULT 'PARTY_WEBSITE',
    "isPrimary" BOOLEAN NOT NULL DEFAULT true,
    "changed" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "Source_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES "Party" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Position" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "partyId" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "specificQuestion" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "positionValue" REAL,
    "confidence" TEXT NOT NULL DEFAULT 'MEDIUM',
    "sourceQuote" TEXT NOT NULL,
    "sourceUrl" TEXT NOT NULL,
    "aiInterpretation" TEXT NOT NULL,
    "reviewStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "reviewNote" TEXT,
    "conflictingSources" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Position_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES "Party" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Position_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "Source" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Question" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "topic" TEXT NOT NULL,
    "questionText" TEXT NOT NULL,
    "description" TEXT,
    "weightingEnabled" BOOLEAN NOT NULL DEFAULT true,
    "reviewStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "QuestionPosition" (
    "questionId" TEXT NOT NULL,
    "positionId" TEXT NOT NULL,

    PRIMARY KEY ("questionId", "positionId"),
    CONSTRAINT "QuestionPosition_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "QuestionPosition_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "Position" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "UserSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "UserAnswer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "answer" INTEGER,
    "importance" INTEGER NOT NULL DEFAULT 1,
    "skipped" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "UserAnswer_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "UserSession" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "UserAnswer_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Source_url_contentHash_key" ON "Source"("url", "contentHash");

-- CreateIndex
CREATE UNIQUE INDEX "UserAnswer_sessionId_questionId_key" ON "UserAnswer"("sessionId", "questionId");
