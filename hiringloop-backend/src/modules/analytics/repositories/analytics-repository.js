import { Prisma } from '@prisma/client';

const range = (field, from, to) =>
  Prisma.sql`${Prisma.raw(field)} >= ${from} AND ${Prisma.raw(field)} < ${to}`;
const job = (alias, jobId) =>
  jobId
    ? Prisma.sql` AND ${Prisma.raw(alias)}."jobId" = ${jobId}`
    : Prisma.empty;
const number = (row, key) => Number(row?.[key] ?? 0);
const nullableNumber = (row, key) =>
  row?.[key] == null ? null : Number(row[key]);
export function createAnalyticsRepository(prisma) {
  async function assertJob({ organizationId, jobId }) {
    if (!jobId) return;
    const found = await prisma.job.findFirst({
      where: { id: jobId, organizationId },
      select: { id: true },
    });
    if (!found) return false;
    return true;
  }
  return {
    assertJob,
    async overview({ organizationId, jobId, from, to, now }) {
      const [
        applications,
        interviews,
        offers,
        outcomes,
        active,
        openJobs,
        awaiting,
        tth,
      ] = await Promise.all([
        prisma.$queryRaw(
          Prisma.sql`SELECT count(*)::int AS count FROM "Application" a WHERE a."organizationId"=${organizationId}${job('a', jobId)} AND ${range('a."submittedAt"', from, to)}`,
        ),
        prisma.$queryRaw(
          Prisma.sql`SELECT count(*)::int AS count FROM "Interview" i JOIN "Application" a ON a.id=i."applicationId" WHERE i."organizationId"=${organizationId}${job('a', jobId)} AND ${range('i."scheduledStartAt"', from, to)}`,
        ),
        prisma.$queryRaw(
          Prisma.sql`SELECT count(*)::int AS count FROM "Offer" o JOIN "Application" a ON a.id=o."applicationId" WHERE o."organizationId"=${organizationId}${job('a', jobId)} AND o."sentAt" IS NOT NULL AND ${range('o."sentAt"', from, to)}`,
        ),
        prisma.$queryRaw(
          Prisma.sql`SELECT e.type, count(DISTINCT e."applicationId")::int AS count FROM "ApplicationOutcomeEvent" e JOIN "Application" a ON a.id=e."applicationId" WHERE e."organizationId"=${organizationId}${job('a', jobId)} AND ${range('e."occurredAt"', from, to)} GROUP BY e.type`,
        ),
        prisma.application.count({
          where: {
            organizationId,
            outcome: 'ACTIVE',
            ...(jobId ? { jobId } : {}),
          },
        }),
        prisma.job.count({
          where: {
            organizationId,
            status: 'OPEN',
            ...(jobId ? { id: jobId } : {}),
          },
        }),
        prisma.offer.count({
          where: {
            organizationId,
            status: 'SENT',
            ...(jobId ? { application: { jobId } } : {}),
          },
        }),
        prisma.$queryRaw(
          Prisma.sql`SELECT avg(EXTRACT(EPOCH FROM (e."occurredAt" - a."submittedAt"))) AS seconds FROM (SELECT DISTINCT ON (e."applicationId") e."applicationId", e."occurredAt" FROM "ApplicationOutcomeEvent" e JOIN "Application" a ON a.id=e."applicationId" WHERE e."organizationId"=${organizationId}${job('a', jobId)} AND e.type='HIRED' AND ${range('e."occurredAt"', from, to)} ORDER BY e."applicationId", e."occurredAt" DESC, e.id DESC) e JOIN "Application" a ON a.id=e."applicationId"`,
        ),
      ]);
      const outcome = Object.fromEntries(
        outcomes.map((x) => [x.type, number(x, 'count')]),
      );
      return {
        applicationsReceived: number(applications[0], 'count'),
        scheduledInterviews: number(interviews[0], 'count'),
        offersSent: number(offers[0], 'count'),
        hires: outcome.HIRED ?? 0,
        rejections: outcome.REJECTED ?? 0,
        activeApplications: active,
        openJobs,
        awaitingOfferDecision: awaiting,
        averageTimeToHireSeconds: nullableNumber(tth[0], 'seconds'),
        generatedAt: now,
      };
    },
    async funnel({ organizationId, jobId, from, to }) {
      const [applied, sent, accepted, hired, scheduled] = await Promise.all([
        prisma.$queryRaw(
          Prisma.sql`SELECT count(*)::int AS count FROM "Application" a WHERE a."organizationId"=${organizationId}${job('a', jobId)} AND ${range('a."submittedAt"', from, to)}`,
        ),
        prisma.$queryRaw(
          Prisma.sql`SELECT count(*)::int AS count FROM "Offer" o JOIN "Application" a ON a.id=o."applicationId" WHERE o."organizationId"=${organizationId}${job('a', jobId)} AND o."sentAt" IS NOT NULL AND ${range('o."sentAt"', from, to)}`,
        ),
        prisma.$queryRaw(
          Prisma.sql`SELECT count(*)::int AS count FROM "Offer" o JOIN "Application" a ON a.id=o."applicationId" WHERE o."organizationId"=${organizationId}${job('a', jobId)} AND o."acceptedAt" IS NOT NULL AND ${range('o."acceptedAt"', from, to)}`,
        ),
        prisma.$queryRaw(
          Prisma.sql`SELECT count(DISTINCT e."applicationId")::int AS count FROM "ApplicationOutcomeEvent" e JOIN "Application" a ON a.id=e."applicationId" WHERE e."organizationId"=${organizationId}${job('a', jobId)} AND e.type='HIRED' AND ${range('e."occurredAt"', from, to)}`,
        ),
        prisma.$queryRaw(
          Prisma.sql`SELECT count(*)::int AS count FROM "Interview" i JOIN "Application" a ON a.id=i."applicationId" WHERE i."organizationId"=${organizationId}${job('a', jobId)} AND ${range('i."scheduledStartAt"', from, to)}`,
        ),
      ]);
      return {
        applied: number(applied[0], 'count'),
        offerSent: number(sent[0], 'count'),
        offerAccepted: number(accepted[0], 'count'),
        hired: number(hired[0], 'count'),
        scheduledInterviewContext: number(scheduled[0], 'count'),
      };
    },
    async pipeline({ organizationId, jobId, from, to }) {
      const [stages, initialEntries] = await Promise.all([
        prisma.$queryRaw(
          Prisma.sql`SELECT s.id, s.name, count(a.id)::int AS count FROM "PipelineStage" s JOIN "Pipeline" p ON p.id=s."pipelineId" JOIN "Job" j ON j.id=p."jobId" LEFT JOIN "Application" a ON a."currentPipelineStageId"=s.id AND a."organizationId"=${organizationId}${job('a', jobId)} WHERE j."organizationId"=${organizationId}${job('j', jobId)} GROUP BY s.id, s.name, s.position ORDER BY s.position ASC, s.id ASC`,
        ),
        prisma.$queryRaw(
          Prisma.sql`SELECT h."toStageId" AS "stageId", count(*)::int AS count FROM "ApplicationStageHistory" h JOIN "Application" a ON a.id=h."applicationId" WHERE h."organizationId"=${organizationId}${job('a', jobId)} AND h.event='APPLICATION_SUBMITTED' AND ${range('h."occurredAt"', from, to)} GROUP BY h."toStageId"`,
        ),
      ]);
      return {
        currentStages: stages.map((row) => ({
          id: row.id,
          name: row.name,
          count: number(row, 'count'),
        })),
        initialEntries: initialEntries.map((row) => ({
          stageId: row.stageId,
          count: number(row, 'count'),
        })),
      };
    },
    async interviews({ organizationId, jobId, from, to, now }) {
      const [scheduled, cancelled, upcoming, submitted] = await Promise.all([
        prisma.$queryRaw(
          Prisma.sql`SELECT count(*)::int AS count FROM "Interview" i JOIN "Application" a ON a.id=i."applicationId" WHERE i."organizationId"=${organizationId}${job('a', jobId)} AND ${range('i."scheduledStartAt"', from, to)}`,
        ),
        prisma.$queryRaw(
          Prisma.sql`SELECT count(*)::int AS count FROM "Interview" i JOIN "Application" a ON a.id=i."applicationId" WHERE i."organizationId"=${organizationId}${job('a', jobId)} AND i."cancelledAt" IS NOT NULL AND ${range('i."cancelledAt"', from, to)}`,
        ),
        prisma.$queryRaw(
          Prisma.sql`SELECT count(*)::int AS count FROM "Interview" i JOIN "Application" a ON a.id=i."applicationId" WHERE i."organizationId"=${organizationId}${job('a', jobId)} AND i.status='SCHEDULED' AND i."scheduledStartAt" >= ${now}`,
        ),
        prisma.$queryRaw(
          Prisma.sql`SELECT count(*)::int AS count FROM "Scorecard" s JOIN "Interview" i ON i.id=s."interviewId" JOIN "Application" a ON a.id=i."applicationId" WHERE s."organizationId"=${organizationId}${job('a', jobId)} AND s.status='SUBMITTED' AND s."submittedAt" IS NOT NULL AND ${range('s."submittedAt"', from, to)}`,
        ),
      ]);
      return {
        scheduled: number(scheduled[0], 'count'),
        cancelled: number(cancelled[0], 'count'),
        upcoming: number(upcoming[0], 'count'),
        submittedFeedback: number(submitted[0], 'count'),
      };
    },
    async communications({ organizationId, jobId, from, to }) {
      const rows = await prisma.$queryRaw(
        Prisma.sql`SELECT c.status, count(*)::int AS count FROM "Communication" c JOIN "Application" a ON a.id=c."applicationId" WHERE c."organizationId"=${organizationId}${job('a', jobId)} AND ${range('c."createdAt"', from, to)} GROUP BY c.status`,
      );
      const value = Object.fromEntries(
        rows.map((x) => [x.status, number(x, 'count')]),
      );
      const sent = value.SENT ?? 0;
      const failed = value.FAILED ?? 0;
      return {
        attempted: sent + failed + (value.PENDING ?? 0),
        pending: value.PENDING ?? 0,
        sent,
        failed,
        completedDeliverySuccessRate:
          sent + failed ? sent / (sent + failed) : null,
      };
    },
    async outcomes({ organizationId, jobId, from, to }) {
      const [rows, reasons, tth, offers, pools] = await Promise.all([
        prisma.$queryRaw(
          Prisma.sql`SELECT e.type, count(DISTINCT e."applicationId")::int AS count FROM "ApplicationOutcomeEvent" e JOIN "Application" a ON a.id=e."applicationId" WHERE e."organizationId"=${organizationId}${job('a', jobId)} AND ${range('e."occurredAt"', from, to)} GROUP BY e.type`,
        ),
        prisma.$queryRaw(
          Prisma.sql`SELECT e."reasonCode" AS code, count(*)::int AS count FROM "ApplicationOutcomeEvent" e JOIN "Application" a ON a.id=e."applicationId" WHERE e."organizationId"=${organizationId}${job('a', jobId)} AND e.type='REJECTED' AND ${range('e."occurredAt"', from, to)} GROUP BY e."reasonCode" ORDER BY count DESC, code ASC`,
        ),
        prisma.$queryRaw(
          Prisma.sql`SELECT avg(EXTRACT(EPOCH FROM (e."occurredAt" - a."submittedAt"))) AS seconds FROM (SELECT DISTINCT ON (e."applicationId") e."applicationId", e."occurredAt" FROM "ApplicationOutcomeEvent" e JOIN "Application" a ON a.id=e."applicationId" WHERE e."organizationId"=${organizationId}${job('a', jobId)} AND e.type='HIRED' AND ${range('e."occurredAt"', from, to)} ORDER BY e."applicationId", e."occurredAt" DESC, e.id DESC) e JOIN "Application" a ON a.id=e."applicationId"`,
        ),
        prisma.$queryRaw(
          Prisma.sql`SELECT o.status, count(*)::int AS count FROM "Offer" o JOIN "Application" a ON a.id=o."applicationId" WHERE o."organizationId"=${organizationId}${job('a', jobId)} GROUP BY o.status`,
        ),
        prisma.$queryRaw(
          Prisma.sql`SELECT (SELECT count(*)::int FROM "TalentPool" p WHERE p."organizationId"=${organizationId}) AS "poolCount", (SELECT count(*)::int FROM "TalentPoolMember" m WHERE m."organizationId"=${organizationId}) AS memberships, (SELECT count(DISTINCT m."candidateId")::int FROM "TalentPoolMember" m WHERE m."organizationId"=${organizationId}) AS "uniqueCandidates", (SELECT count(*)::int FROM "TalentPoolMember" m WHERE m."organizationId"=${organizationId} AND ${range('m."createdAt"', from, to)}) AS "membersAdded"`,
        ),
      ]);
      const values = Object.fromEntries(
        rows.map((x) => [x.type, number(x, 'count')]),
      );
      const offerValues = Object.fromEntries(
        offers.map((x) => [x.status, number(x, 'count')]),
      );
      const decisions =
        (offerValues.ACCEPTED ?? 0) + (offerValues.DECLINED ?? 0);
      const outcomes = (values.HIRED ?? 0) + (values.REJECTED ?? 0);
      return {
        hired: values.HIRED ?? 0,
        rejected: values.REJECTED ?? 0,
        reopened: values.REOPENED ?? 0,
        hireRate: outcomes ? (values.HIRED ?? 0) / outcomes : null,
        rejectionRate: outcomes ? (values.REJECTED ?? 0) / outcomes : null,
        rejectionReasons: reasons.map((x) => ({
          code: x.code,
          count: number(x, 'count'),
        })),
        averageTimeToHireSeconds: nullableNumber(tth[0], 'seconds'),
        offers: {
          created: null,
          sent: null,
          accepted: offerValues.ACCEPTED ?? 0,
          declined: offerValues.DECLINED ?? 0,
          withdrawn: offerValues.WITHDRAWN ?? 0,
          awaitingDecision: offerValues.SENT ?? 0,
          acceptanceRate: decisions
            ? (offerValues.ACCEPTED ?? 0) / decisions
            : null,
          declineRate: decisions
            ? (offerValues.DECLINED ?? 0) / decisions
            : null,
        },
        talentPools: {
          poolCount: number(pools[0], 'poolCount'),
          memberships: number(pools[0], 'memberships'),
          uniqueCandidates: number(pools[0], 'uniqueCandidates'),
          membersAddedInRange: number(pools[0], 'membersAdded'),
        },
      };
    },
    async jobs({ organizationId, from, to, page, pageSize }) {
      const rows = await prisma.$queryRaw(
        Prisma.sql`SELECT j.id, j.title, (SELECT count(*)::int FROM "Application" a WHERE a."organizationId"=${organizationId} AND a."jobId"=j.id AND ${range('a."submittedAt"', from, to)}) AS applications, (SELECT count(*)::int FROM "Application" a WHERE a."organizationId"=${organizationId} AND a."jobId"=j.id AND a.outcome='ACTIVE') AS active, (SELECT count(*)::int FROM "Interview" i JOIN "Application" a ON a.id=i."applicationId" WHERE i."organizationId"=${organizationId} AND a."jobId"=j.id AND ${range('i."scheduledStartAt"', from, to)}) AS "scheduledInterviews", (SELECT count(*)::int FROM "Offer" o WHERE o."organizationId"=${organizationId} AND o."applicationId" IN (SELECT id FROM "Application" a WHERE a."jobId"=j.id) AND o."sentAt" IS NOT NULL AND ${range('o."sentAt"', from, to)}) AS "offersSent", (SELECT count(DISTINCT e."applicationId")::int FROM "ApplicationOutcomeEvent" e JOIN "Application" a ON a.id=e."applicationId" WHERE e."organizationId"=${organizationId} AND a."jobId"=j.id AND e.type='HIRED' AND ${range('e."occurredAt"', from, to)}) AS hires, (SELECT count(DISTINCT e."applicationId")::int FROM "ApplicationOutcomeEvent" e JOIN "Application" a ON a.id=e."applicationId" WHERE e."organizationId"=${organizationId} AND a."jobId"=j.id AND e.type='REJECTED' AND ${range('e."occurredAt"', from, to)}) AS rejections FROM "Job" j WHERE j."organizationId"=${organizationId} ORDER BY j.title ASC, j.id ASC OFFSET ${(page - 1) * pageSize} LIMIT ${pageSize}`,
      );
      const totalItems = await prisma.job.count({ where: { organizationId } });
      return {
        rows: rows.map((x) => ({
          ...x,
          applications: number(x, 'applications'),
          active: number(x, 'active'),
          scheduledInterviews: number(x, 'scheduledInterviews'),
          offersSent: number(x, 'offersSent'),
          hires: number(x, 'hires'),
          rejections: number(x, 'rejections'),
        })),
        totalItems,
      };
    },
  };
}
