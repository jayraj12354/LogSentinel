-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'VIEWER');

-- CreateEnum
CREATE TYPE "LogFormat" AS ENUM ('GENERIC', 'ACCESS');

-- CreateEnum
CREATE TYPE "LogLevel" AS ENUM ('DEBUG', 'INFO', 'WARN', 'ERROR', 'CRITICAL');

-- CreateEnum
CREATE TYPE "Severity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "AlertStatus" AS ENUM ('OPEN', 'ACKNOWLEDGED', 'RESOLVED');

-- CreateEnum
CREATE TYPE "BatchStatus" AS ENUM ('RUNNING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "GroupBy" AS ENUM ('IP', 'SOURCE');

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "username" VARCHAR(50) NOT NULL,
    "email" VARCHAR(120) NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'VIEWER',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sources" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(80) NOT NULL,
    "file_path" TEXT,
    "format" "LogFormat" NOT NULL DEFAULT 'GENERIC',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rules" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(80) NOT NULL,
    "pattern" TEXT NOT NULL,
    "flags" VARCHAR(5) NOT NULL DEFAULT 'i',
    "category" VARCHAR(40) NOT NULL,
    "severity" "Severity" NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by" INTEGER,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alert_policies" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(80) NOT NULL,
    "category" VARCHAR(40) NOT NULL,
    "threshold_count" INTEGER NOT NULL,
    "window_seconds" INTEGER NOT NULL,
    "group_by" "GroupBy" NOT NULL DEFAULT 'IP',
    "severity" "Severity" NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "alert_policies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "import_batches" (
    "id" SERIAL NOT NULL,
    "source_id" INTEGER NOT NULL,
    "file_name" TEXT NOT NULL,
    "status" "BatchStatus" NOT NULL DEFAULT 'RUNNING',
    "lines_total" INTEGER NOT NULL DEFAULT 0,
    "lines_ok" INTEGER NOT NULL DEFAULT 0,
    "lines_failed" INTEGER NOT NULL DEFAULT 0,
    "started_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finished_at" TIMESTAMPTZ(6),

    CONSTRAINT "import_batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "log_entries" (
    "source_id" INTEGER NOT NULL,
    "line_no" INTEGER NOT NULL,
    "batch_id" INTEGER,
    "logged_at" TIMESTAMPTZ(6) NOT NULL,
    "level" "LogLevel" NOT NULL,
    "message" TEXT NOT NULL,
    "ip" INET,
    "category" VARCHAR(40),
    "rule_id" INTEGER,
    "raw" JSONB,

    CONSTRAINT "log_entries_pkey" PRIMARY KEY ("source_id","line_no")
);

-- CreateTable
CREATE TABLE "alerts" (
    "id" SERIAL NOT NULL,
    "policy_id" INTEGER NOT NULL,
    "source_id" INTEGER,
    "title" TEXT NOT NULL,
    "severity" "Severity" NOT NULL,
    "event_count" INTEGER NOT NULL,
    "ip" INET,
    "dedupe_key" VARCHAR(120) NOT NULL,
    "status" "AlertStatus" NOT NULL DEFAULT 'OPEN',
    "window_start" TIMESTAMPTZ(6) NOT NULL,
    "window_end" TIMESTAMPTZ(6) NOT NULL,
    "triggered_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acknowledged_by" INTEGER,
    "acknowledged_at" TIMESTAMPTZ(6),
    "details" JSONB,

    CONSTRAINT "alerts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "sources_name_key" ON "sources"("name");

-- CreateIndex
CREATE UNIQUE INDEX "rules_name_key" ON "rules"("name");

-- CreateIndex
CREATE UNIQUE INDEX "alert_policies_name_key" ON "alert_policies"("name");

-- CreateIndex
CREATE INDEX "idx_log_entries_logged_at" ON "log_entries"("logged_at");

-- CreateIndex
CREATE INDEX "idx_log_entries_category_time" ON "log_entries"("category", "logged_at");

-- CreateIndex
CREATE INDEX "idx_log_entries_ip" ON "log_entries"("ip");

-- CreateIndex
CREATE INDEX "idx_alerts_status_time" ON "alerts"("status", "triggered_at");

-- CreateIndex
CREATE UNIQUE INDEX "alerts_policy_id_dedupe_key_key" ON "alerts"("policy_id", "dedupe_key");

-- AddForeignKey
ALTER TABLE "rules" ADD CONSTRAINT "rules_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "import_batches" ADD CONSTRAINT "import_batches_source_id_fkey" FOREIGN KEY ("source_id") REFERENCES "sources"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "log_entries" ADD CONSTRAINT "log_entries_source_id_fkey" FOREIGN KEY ("source_id") REFERENCES "sources"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "log_entries" ADD CONSTRAINT "log_entries_rule_id_fkey" FOREIGN KEY ("rule_id") REFERENCES "rules"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "log_entries" ADD CONSTRAINT "log_entries_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "import_batches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_policy_id_fkey" FOREIGN KEY ("policy_id") REFERENCES "alert_policies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_source_id_fkey" FOREIGN KEY ("source_id") REFERENCES "sources"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_acknowledged_by_fkey" FOREIGN KEY ("acknowledged_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
