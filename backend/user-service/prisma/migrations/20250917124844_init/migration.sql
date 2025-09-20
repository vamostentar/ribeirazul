-- AlterTable
ALTER TABLE "public"."user_profiles" ADD COLUMN     "role" "public"."UserRole" NOT NULL DEFAULT 'CLIENT';
