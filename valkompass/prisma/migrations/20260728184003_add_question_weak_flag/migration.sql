-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Question" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "topic" TEXT NOT NULL,
    "questionText" TEXT NOT NULL,
    "description" TEXT,
    "weightingEnabled" BOOLEAN NOT NULL DEFAULT true,
    "weak" BOOLEAN NOT NULL DEFAULT false,
    "reviewStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_Question" ("createdAt", "description", "id", "questionText", "reviewStatus", "topic", "weightingEnabled") SELECT "createdAt", "description", "id", "questionText", "reviewStatus", "topic", "weightingEnabled" FROM "Question";
DROP TABLE "Question";
ALTER TABLE "new_Question" RENAME TO "Question";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
