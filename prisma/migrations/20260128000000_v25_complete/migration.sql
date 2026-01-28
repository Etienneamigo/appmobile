-- Migration to V2.5 schema (adds all missing features)

-- Add ADMIN role to UserRole enum
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'ADMIN';

-- Add VIDEO_UPLOAD to MediaKind enum
ALTER TYPE "MediaKind" ADD VALUE IF NOT EXISTS 'VIDEO_UPLOAD';

-- Create SubscriptionStatus enum
DO $$ BEGIN
    CREATE TYPE "SubscriptionStatus" AS ENUM ('TRIALING', 'ACTIVE', 'PAST_DUE', 'CANCELED', 'UNPAID', 'INCOMPLETE');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create StatEventType enum
DO $$ BEGIN
    CREATE TYPE "StatEventType" AS ENUM ('IMPRESSION', 'CLICK');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add new columns to User table
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "emailVerified" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "emailVerificationToken" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "emailVerificationExpires" TIMESTAMP(3);

-- Add unique constraint on emailVerificationToken if not exists
DO $$ BEGIN
    ALTER TABLE "User" ADD CONSTRAINT "User_emailVerificationToken_key" UNIQUE ("emailVerificationToken");
EXCEPTION
    WHEN duplicate_table THEN null;
    WHEN duplicate_object THEN null;
END $$;

-- Add new columns to Establishment table
ALTER TABLE "Establishment" ADD COLUMN IF NOT EXISTS "bookingUrl" TEXT;
ALTER TABLE "Establishment" ADD COLUMN IF NOT EXISTS "stripeCustomerId" TEXT;
ALTER TABLE "Establishment" ADD COLUMN IF NOT EXISTS "stripeSubscriptionId" TEXT;
ALTER TABLE "Establishment" ADD COLUMN IF NOT EXISTS "subscriptionStatus" "SubscriptionStatus";
ALTER TABLE "Establishment" ADD COLUMN IF NOT EXISTS "trialEndsAt" TIMESTAMP(3);
ALTER TABLE "Establishment" ADD COLUMN IF NOT EXISTS "currentPeriodEnd" TIMESTAMP(3);
ALTER TABLE "Establishment" ADD COLUMN IF NOT EXISTS "usedPromoCodeId" TEXT;

-- Add unique constraints to Establishment if not exists
DO $$ BEGIN
    ALTER TABLE "Establishment" ADD CONSTRAINT "Establishment_stripeCustomerId_key" UNIQUE ("stripeCustomerId");
EXCEPTION
    WHEN duplicate_table THEN null;
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "Establishment" ADD CONSTRAINT "Establishment_stripeSubscriptionId_key" UNIQUE ("stripeSubscriptionId");
EXCEPTION
    WHEN duplicate_table THEN null;
    WHEN duplicate_object THEN null;
END $$;

-- Add unique constraint on Activity.establishmentId (1:1 relation)
DO $$ BEGIN
    ALTER TABLE "Activity" ADD CONSTRAINT "Activity_establishmentId_key" UNIQUE ("establishmentId");
EXCEPTION
    WHEN duplicate_table THEN null;
    WHEN duplicate_object THEN null;
END $$;

-- Add new columns to Media table
ALTER TABLE "Media" ADD COLUMN IF NOT EXISTS "fileName" TEXT;
ALTER TABLE "Media" ADD COLUMN IF NOT EXISTS "fileSize" INTEGER;

-- Create ActivityStatEvent table
CREATE TABLE IF NOT EXISTS "ActivityStatEvent" (
    "id" TEXT NOT NULL,
    "activityId" TEXT NOT NULL,
    "type" "StatEventType" NOT NULL,
    "sessionId" TEXT,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ActivityStatEvent_pkey" PRIMARY KEY ("id")
);

-- Create indexes on ActivityStatEvent
CREATE INDEX IF NOT EXISTS "ActivityStatEvent_activityId_type_createdAt_idx" ON "ActivityStatEvent"("activityId", "type", "createdAt");
CREATE INDEX IF NOT EXISTS "ActivityStatEvent_activityId_sessionId_createdAt_idx" ON "ActivityStatEvent"("activityId", "sessionId", "createdAt");

-- Create PromoCode table
CREATE TABLE IF NOT EXISTS "PromoCode" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "extraTrialDays" INTEGER NOT NULL DEFAULT 0,
    "maxRedemptions" INTEGER,
    "redeemedCount" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PromoCode_pkey" PRIMARY KEY ("id")
);

-- Add unique constraint on PromoCode.code
DO $$ BEGIN
    ALTER TABLE "PromoCode" ADD CONSTRAINT "PromoCode_code_key" UNIQUE ("code");
EXCEPTION
    WHEN duplicate_table THEN null;
    WHEN duplicate_object THEN null;
END $$;

-- Create SiteSettings table
CREATE TABLE IF NOT EXISTS "SiteSettings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "heroVideoDesktopUrl" TEXT,
    "heroVideoMobileUrl" TEXT,
    "heroVideoDesktopName" TEXT,
    "heroVideoMobileName" TEXT,
    "heroImageDesktopUrl" TEXT,
    "heroImageMobileUrl" TEXT,
    "heroImageDesktopName" TEXT,
    "heroImageMobileName" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SiteSettings_pkey" PRIMARY KEY ("id")
);

-- Create Event table
CREATE TABLE IF NOT EXISTS "Event" (
    "id" TEXT NOT NULL,
    "activityId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3) NOT NULL,
    "allDay" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- Create indexes on Event
CREATE INDEX IF NOT EXISTS "Event_activityId_startAt_idx" ON "Event"("activityId", "startAt");
CREATE INDEX IF NOT EXISTS "Event_startAt_idx" ON "Event"("startAt");

-- Add foreign key constraints
DO $$ BEGIN
    ALTER TABLE "ActivityStatEvent" ADD CONSTRAINT "ActivityStatEvent_activityId_fkey"
        FOREIGN KEY ("activityId") REFERENCES "Activity"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "Establishment" ADD CONSTRAINT "Establishment_usedPromoCodeId_fkey"
        FOREIGN KEY ("usedPromoCodeId") REFERENCES "PromoCode"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "Event" ADD CONSTRAINT "Event_activityId_fkey"
        FOREIGN KEY ("activityId") REFERENCES "Activity"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
