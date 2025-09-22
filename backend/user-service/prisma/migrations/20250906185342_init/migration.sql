-- CreateEnum
CREATE TYPE "public"."Gender" AS ENUM ('MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY');

-- CreateEnum
CREATE TYPE "public"."ContactMethod" AS ENUM ('EMAIL', 'PHONE', 'SMS', 'WHATSAPP');

-- CreateEnum
CREATE TYPE "public"."ProfileVisibility" AS ENUM ('PUBLIC', 'PRIVATE', 'FRIENDS_ONLY');

-- CreateEnum (scoped to users schema to avoid conflict with properties-service)
DO $$ BEGIN
    CREATE TYPE "users"."PropertyType" AS ENUM ('APARTMENT', 'HOUSE', 'TOWNHOUSE', 'CONDO', 'STUDIO', 'LOFT', 'PENTHOUSE', 'VILLA', 'COMMERCIAL', 'LAND', 'OTHER');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- CreateEnum
CREATE TYPE "public"."InterestType" AS ENUM ('VIEW', 'INQUIRY', 'SCHEDULE_VISIT', 'MAKE_OFFER', 'FAVORITE');

-- CreateEnum
CREATE TYPE "public"."Priority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "public"."SortBy" AS ENUM ('RELEVANCE', 'PRICE_ASC', 'PRICE_DESC', 'DATE_ASC', 'DATE_DESC', 'AREA_ASC', 'AREA_DESC');

-- CreateEnum
CREATE TYPE "public"."ViewMode" AS ENUM ('LIST', 'GRID', 'MAP');

-- CreateEnum
CREATE TYPE "public"."NotificationType" AS ENUM ('PROPERTY_ALERT', 'PRICE_DROP', 'NEW_PROPERTY', 'MARKET_UPDATE', 'SYSTEM_ANNOUNCEMENT', 'REMINDER', 'WELCOME');

-- CreateEnum
CREATE TYPE "public"."DeliveryMethod" AS ENUM ('IN_APP', 'EMAIL', 'SMS', 'PUSH');

-- CreateTable
CREATE TABLE "public"."user_profiles" (
    "id" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "avatar" TEXT,
    "bio" TEXT,
    "dateOfBirth" TIMESTAMP(3),
    "gender" "public"."Gender",
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "country" TEXT,
    "postalCode" TEXT,
    "preferredContactMethod" "public"."ContactMethod" NOT NULL DEFAULT 'EMAIL',
    "language" TEXT NOT NULL DEFAULT 'pt',
    "timezone" TEXT NOT NULL DEFAULT 'Europe/Lisbon',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isEmailVerified" BOOLEAN NOT NULL DEFAULT false,
    "emailVerifiedAt" TIMESTAMP(3),
    "isPhoneVerified" BOOLEAN NOT NULL DEFAULT false,
    "phoneVerifiedAt" TIMESTAMP(3),
    "profileVisibility" "public"."ProfileVisibility" NOT NULL DEFAULT 'PUBLIC',
    "allowMarketing" BOOLEAN NOT NULL DEFAULT false,
    "allowNotifications" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."user_preferences" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "propertyTypes" "users"."PropertyType"[],
    "minPrice" DECIMAL(65,30),
    "maxPrice" DECIMAL(65,30),
    "minBedrooms" INTEGER,
    "maxBedrooms" INTEGER,
    "minBathrooms" INTEGER,
    "maxBathrooms" INTEGER,
    "minArea" DECIMAL(65,30),
    "maxArea" DECIMAL(65,30),
    "preferredLocation" TEXT,
    "searchRadius" INTEGER DEFAULT 10,
    "sortBy" "public"."SortBy" NOT NULL DEFAULT 'RELEVANCE',
    "viewMode" "public"."ViewMode" NOT NULL DEFAULT 'LIST',
    "emailNotifications" BOOLEAN NOT NULL DEFAULT true,
    "smsNotifications" BOOLEAN NOT NULL DEFAULT false,
    "pushNotifications" BOOLEAN NOT NULL DEFAULT true,
    "priceDropAlerts" BOOLEAN NOT NULL DEFAULT true,
    "newPropertyAlerts" BOOLEAN NOT NULL DEFAULT true,
    "marketUpdateAlerts" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."property_interests" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "interestType" "public"."InterestType" NOT NULL DEFAULT 'VIEW',
    "notes" TEXT,
    "priority" "public"."Priority" NOT NULL DEFAULT 'MEDIUM',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "contacted" BOOLEAN NOT NULL DEFAULT false,
    "contactedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "property_interests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."saved_properties" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "folder" TEXT,
    "notes" TEXT,
    "tags" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "saved_properties_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."search_history" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "query" TEXT,
    "location" TEXT,
    "propertyType" "users"."PropertyType"[],
    "minPrice" DECIMAL(65,30),
    "maxPrice" DECIMAL(65,30),
    "minBedrooms" INTEGER,
    "maxBedrooms" INTEGER,
    "minBathrooms" INTEGER,
    "maxBathrooms" INTEGER,
    "minArea" DECIMAL(65,30),
    "maxArea" DECIMAL(65,30),
    "resultsCount" INTEGER,
    "searchTime" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "search_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."notifications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "public"."NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "data" JSONB,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "archivedAt" TIMESTAMP(3),
    "deliveryMethod" "public"."DeliveryMethod" NOT NULL DEFAULT 'IN_APP',
    "sentAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_profiles_email_key" ON "public"."user_profiles"("email");

-- CreateIndex
CREATE UNIQUE INDEX "user_preferences_userId_key" ON "public"."user_preferences"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "property_interests_userId_propertyId_key" ON "public"."property_interests"("userId", "propertyId");

-- CreateIndex
CREATE UNIQUE INDEX "saved_properties_userId_propertyId_key" ON "public"."saved_properties"("userId", "propertyId");

-- AddForeignKey
ALTER TABLE "public"."user_preferences" ADD CONSTRAINT "user_preferences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."user_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."property_interests" ADD CONSTRAINT "property_interests_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."user_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."saved_properties" ADD CONSTRAINT "saved_properties_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."user_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."search_history" ADD CONSTRAINT "search_history_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."user_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."user_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
