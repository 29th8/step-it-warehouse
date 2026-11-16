ALTER TABLE "User" ADD COLUMN "verifiedEmail" TEXT;
CREATE UNIQUE INDEX "User_verifiedEmail_key" ON "User"("verifiedEmail");
CREATE TABLE "PasswordResetChallenge" (
  "email" TEXT NOT NULL,
  "codeHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PasswordResetChallenge_pkey" PRIMARY KEY ("email")
);
