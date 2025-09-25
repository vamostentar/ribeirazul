-- CreateEnum
CREATE TYPE "messages"."MessageStatus" AS ENUM ('RECEIVED', 'QUEUED', 'SENT', 'FAILED');

-- CreateEnum
CREATE TYPE "messages"."EventType" AS ENUM ('OUTBOUND_QUEUED', 'OUTBOUND_SENT', 'OUTBOUND_FAILED', 'INBOUND_RECEIVED');

-- CreateTable
CREATE TABLE "messages"."Message" (
    "id" TEXT NOT NULL,
    "fromName" TEXT NOT NULL,
    "fromEmail" TEXT NOT NULL,
    "phone" TEXT,
    "body" TEXT NOT NULL,
    "context" JSONB,
    "status" "messages"."MessageStatus" NOT NULL DEFAULT 'RECEIVED',
    "conversationId" TEXT,
    "retries" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "messages"."MessageEvent" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "type" "messages"."EventType" NOT NULL,
    "details" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MessageEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Message_conversationId_key" ON "messages"."Message"("conversationId");

-- AddForeignKey
ALTER TABLE "messages"."MessageEvent" ADD CONSTRAINT "MessageEvent_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "messages"."Message"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
