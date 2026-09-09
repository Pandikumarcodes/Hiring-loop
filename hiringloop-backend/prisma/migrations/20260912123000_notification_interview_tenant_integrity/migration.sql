CREATE UNIQUE INDEX "Interview_id_organizationId_key" ON "Interview" ("id", "organizationId");

ALTER TABLE "Notification" DROP CONSTRAINT "Notification_interviewId_fkey";
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_interviewId_organizationId_fkey"
  FOREIGN KEY ("interviewId", "organizationId") REFERENCES "Interview"("id", "organizationId")
  ON DELETE RESTRICT ON UPDATE RESTRICT;
