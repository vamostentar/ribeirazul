-- CreateEnum
CREATE TYPE "PropertyStatus" AS ENUM ('for_sale', 'for_rent', 'sold', 'rented', 'under_contract', 'withdrawn');

-- CreateEnum
CREATE TYPE "PropertyType" AS ENUM ('apartamento', 'moradia', 'loft', 'penthouse', 'estudio', 'escritorio', 'terreno', 'loja', 'armazem', 'quinta', 'predio');

-- CreateEnum
CREATE TYPE "PropertyFeature" AS ENUM ('POOL', 'GARAGE', 'GARDEN', 'ELEVATOR', 'BALCONY', 'TERRACE', 'FIREPLACE', 'AIR_CONDITIONING', 'CENTRAL_HEATING', 'SOLAR_PANELS', 'FURNISHED', 'PARKING', 'SECURITY_SYSTEM', 'GYM', 'SPA', 'CONCIERGE', 'PET_FRIENDLY', 'OCEAN_VIEW', 'MOUNTAIN_VIEW', 'CITY_VIEW');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'AGENT', 'USER');

-- CreateTable
CREATE TABLE "properties" (
    "id" TEXT NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "location" VARCHAR(500) NOT NULL,
    "price" DECIMAL(12,2) NOT NULL,
    "status" "PropertyStatus" NOT NULL DEFAULT 'for_sale',
    "type" "PropertyType",
    "imageUrl" VARCHAR(2048),
    "description" TEXT,
    "bedrooms" SMALLINT,
    "bathrooms" SMALLINT,
    "area" DECIMAL(8,2),
    "yearBuilt" SMALLINT,
    "coordinates" JSONB,
    "features" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "contactPhone" VARCHAR(20),
    "contactEmail" VARCHAR(100),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "ownerId" TEXT,
    "agentId" TEXT,

    CONSTRAINT "properties_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "property_images" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "url" VARCHAR(2048) NOT NULL,
    "alt" VARCHAR(200),
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "property_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "price_history" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "oldPrice" DECIMAL(12,2),
    "newPrice" DECIMAL(12,2) NOT NULL,
    "reason" VARCHAR(100),
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "changedBy" TEXT,

    CONSTRAINT "price_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "property_visits" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "visitorId" TEXT,
    "ipAddress" INET NOT NULL,
    "userAgent" TEXT,
    "visitedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "property_visits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "property_favorites" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "property_favorites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" VARCHAR(100) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "phone" VARCHAR(20),
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agents" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "license" VARCHAR(50) NOT NULL,
    "company" VARCHAR(200),
    "specialties" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "properties_status_idx" ON "properties"("status");

-- CreateIndex
CREATE INDEX "properties_type_idx" ON "properties"("type");

-- CreateIndex
CREATE INDEX "properties_price_idx" ON "properties"("price");

-- CreateIndex
CREATE INDEX "properties_area_idx" ON "properties"("area");

-- CreateIndex
CREATE INDEX "properties_bedrooms_idx" ON "properties"("bedrooms");

-- CreateIndex
CREATE INDEX "properties_bathrooms_idx" ON "properties"("bathrooms");

-- CreateIndex
CREATE INDEX "properties_yearBuilt_idx" ON "properties"("yearBuilt");

-- CreateIndex
CREATE INDEX "properties_location_idx" ON "properties"("location");

-- CreateIndex
CREATE INDEX "properties_createdAt_idx" ON "properties"("createdAt");

-- CreateIndex
CREATE INDEX "properties_updatedAt_idx" ON "properties"("updatedAt");

-- CreateIndex
CREATE INDEX "properties_status_type_idx" ON "properties"("status", "type");

-- CreateIndex
CREATE INDEX "properties_status_price_idx" ON "properties"("status", "price");

-- CreateIndex
CREATE INDEX "properties_type_price_idx" ON "properties"("type", "price");

-- CreateIndex
CREATE INDEX "property_images_propertyId_order_idx" ON "property_images"("propertyId", "order");

-- CreateIndex
CREATE INDEX "price_history_propertyId_changedAt_idx" ON "price_history"("propertyId", "changedAt");

-- CreateIndex
CREATE INDEX "property_visits_propertyId_visitedAt_idx" ON "property_visits"("propertyId", "visitedAt");

-- CreateIndex
CREATE INDEX "property_visits_visitorId_visitedAt_idx" ON "property_visits"("visitorId", "visitedAt");

-- CreateIndex
CREATE INDEX "property_favorites_userId_createdAt_idx" ON "property_favorites"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "property_favorites_propertyId_userId_key" ON "property_favorites"("propertyId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_role_isActive_idx" ON "users"("role", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "agents_userId_key" ON "agents"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "agents_license_key" ON "agents"("license");

-- CreateIndex
CREATE INDEX "agents_license_idx" ON "agents"("license");

-- CreateIndex
CREATE INDEX "agents_isVerified_idx" ON "agents"("isVerified");

-- AddForeignKey
ALTER TABLE "properties" ADD CONSTRAINT "properties_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "properties" ADD CONSTRAINT "properties_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "agents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "property_images" ADD CONSTRAINT "property_images_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "price_history" ADD CONSTRAINT "price_history_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "property_visits" ADD CONSTRAINT "property_visits_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "property_favorites" ADD CONSTRAINT "property_favorites_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "property_favorites" ADD CONSTRAINT "property_favorites_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agents" ADD CONSTRAINT "agents_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
