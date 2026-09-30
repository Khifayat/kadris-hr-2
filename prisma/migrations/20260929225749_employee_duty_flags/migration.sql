-- AlterTable
ALTER TABLE "Employee" ADD COLUMN     "performsMedicationDuties" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "transportsParticipants" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "JobRoleRequirement" ADD COLUMN     "conditionKey" TEXT;
