-- CreateTable
CREATE TABLE "Target" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "environment" TEXT NOT NULL,
    "config" JSONB NOT NULL,
    "targetConfigHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Target_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Scan" (
    "id" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'queued',
    "profile" TEXT NOT NULL DEFAULT 'standard',
    "judgeMode" TEXT,
    "libraryVersion" TEXT,
    "engineVersion" TEXT,
    "judgeModel" TEXT,
    "resiliencePct" DOUBLE PRECISION,
    "weightedRiskPct" DOUBLE PRECISION,
    "total" INTEGER DEFAULT 0,
    "pass" INTEGER DEFAULT 0,
    "fail" INTEGER DEFAULT 0,
    "inconclusive" INTEGER DEFAULT 0,
    "error" INTEGER DEFAULT 0,
    "errorMessage" TEXT,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Scan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Finding" (
    "id" TEXT NOT NULL,
    "scanId" TEXT NOT NULL,
    "probeId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "owasp" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "verdict" TEXT NOT NULL,
    "tier1Verdict" TEXT,
    "reason" TEXT NOT NULL,
    "responseText" TEXT NOT NULL,
    "judge" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Finding_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Scan" ADD CONSTRAINT "Scan_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "Target"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Finding" ADD CONSTRAINT "Finding_scanId_fkey" FOREIGN KEY ("scanId") REFERENCES "Scan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
