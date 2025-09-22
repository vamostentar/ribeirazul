-- CreateTable
CREATE TABLE "settings"."settings" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "brandName" TEXT NOT NULL DEFAULT 'Ribeira Azul',
    "logoUrl" TEXT,
    "faviconUrl" TEXT,
    "primaryColor" TEXT NOT NULL DEFAULT '#2563eb',
    "secondaryColor" TEXT NOT NULL DEFAULT '#1f2937',
    "accentColor" TEXT NOT NULL DEFAULT '#f59e0b',
    "backgroundColor" TEXT NOT NULL DEFAULT '#ffffff',
    "textColor" TEXT NOT NULL DEFAULT '#1f2937',
    "contactEmail" TEXT NOT NULL DEFAULT 'contato@ribeirazul.com',
    "contactPhone" TEXT NOT NULL DEFAULT '+55 11 99999-9999',
    "contactAddress" TEXT NOT NULL DEFAULT 'São Paulo, SP',
    "socialLinks" JSONB,
    "businessHours" JSONB,
    "businessConfig" JSONB,
    "seoTitle" TEXT,
    "seoDescription" TEXT,
    "seoKeywords" TEXT,
    "maintenanceMode" BOOLEAN NOT NULL DEFAULT false,
    "maintenanceMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT,

    CONSTRAINT "settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "settings"."settings_history" (
    "id" TEXT NOT NULL,
    "settingsId" TEXT NOT NULL DEFAULT 'singleton',
    "fieldName" TEXT NOT NULL,
    "oldValue" TEXT,
    "newValue" TEXT,
    "changedBy" TEXT,
    "changeReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "settings_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "settings"."module_settings" (
    "id" TEXT NOT NULL,
    "moduleName" TEXT NOT NULL,
    "settingsKey" TEXT NOT NULL,
    "settingsValue" JSONB NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT,

    CONSTRAINT "module_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "module_settings_moduleName_settingsKey_key" ON "settings"."module_settings"("moduleName", "settingsKey");

-- AddForeignKey
ALTER TABLE "settings"."settings_history" ADD CONSTRAINT "settings_history_settingsId_fkey" FOREIGN KEY ("settingsId") REFERENCES "settings"."settings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
