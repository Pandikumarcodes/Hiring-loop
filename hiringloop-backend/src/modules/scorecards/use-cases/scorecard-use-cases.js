import {
  conflictError,
  forbiddenError,
  notFoundError,
  validationError,
} from '../../../errors/application-error.js';
import { generateEntityId } from '../../../utils/ids.js';
import {
  toMyScorecardDto,
  toNoteDto,
  toSubmittedDto,
  toSummaryDto,
  toTemplateDto,
} from '../domain/scorecard-dto.js';
const managers = new Set(['ADMIN', 'RECRUITER']);
const readers = new Set(['ADMIN', 'RECRUITER', 'HIRING_MANAGER']);
const fail = (r) => {
  if (r.outcome === 'conflict')
    throw conflictError('Scorecard revision is stale');
  if (r.outcome === 'not_found') throw notFoundError();
  if (r.outcome === 'no_template')
    throw notFoundError('No published scorecard template is available');
  if (r.outcome === 'submitted')
    throw conflictError('Submitted scorecards are immutable');
  if (r.outcome === 'invalid_response')
    throw validationError('Scorecard response does not match this template');
  if (r.outcome === 'incomplete')
    throw validationError(
      'Required criteria and overall recommendation are required',
    );
  return r;
};
export function createScorecardUseCases({
  repository,
  clock = () => new Date(),
}) {
  const internal = (role) => {
    if (!readers.has(role)) throw forbiddenError();
  };
  return {
    async getTemplate(input) {
      if (
        !managers.has(input.actorRole) &&
        input.actorRole !== 'HIRING_MANAGER'
      )
        throw forbiddenError();
      const dto = toTemplateDto(await repository.findTemplate(input));
      if (dto && !managers.has(input.actorRole)) dto.draft = null;
      return dto;
    },
    async createDraft(input) {
      if (!managers.has(input.actorRole)) throw forbiddenError();
      const t = await repository.createDraft({
        ...input,
        id: generateEntityId,
      });
      if (!t)
        throw notFoundError(
          'A published template is required before creating the next draft',
        );
      return toTemplateDto(t);
    },
    async updateTemplate(input) {
      if (!managers.has(input.actorRole)) throw forbiddenError();
      const r = await repository.mutateTemplate(input, async (tx, _t, d) => {
        await tx.scorecardCriterion.deleteMany({
          where: { templateVersionId: d.id },
        });
        await tx.scorecardTemplateVersion.update({
          where: { id: d.id },
          data: {
            title: input.title,
            instructions: input.instructions ?? null,
            criteria: {
              create: input.criteria.map((c) => ({
                id: generateEntityId(),
                organizationId: input.organizationId,
                label: c.label,
                description: c.description ?? null,
                type: c.type,
                required: c.required,
                position: c.position,
              })),
            },
          },
        });
      });
      return toTemplateDto(fail(r).template);
    },
    async publishTemplate(input) {
      if (!managers.has(input.actorRole)) throw forbiddenError();
      const r = await repository.mutateTemplate(input, async (tx, t, d) => {
        await tx.scorecardTemplateVersion.update({
          where: { id: d.id },
          data: { status: 'PUBLISHED', publishedAt: clock() },
        });
        await tx.scorecardTemplate.update({
          where: { id: t.id },
          data: { activeVersionId: d.id },
        });
      });
      return toTemplateDto(fail(r).template);
    },
    async my(input) {
      const mine = await repository.findMy(input);
      const participant = mine?.participants[0];
      if (!mine || !participant) throw notFoundError();
      const active =
        participant.scorecard?.templateVersion ??
        (
          await repository.findTemplate({
            organizationId: input.organizationId,
            jobId: mine.application.jobId,
          })
        )?.activeVersion;
      if (!participant.scorecard && !active)
        throw notFoundError('No published scorecard template is available');
      return toMyScorecardDto({
        interview: mine,
        participant,
        scorecard: participant.scorecard,
        templateVersion: active,
      });
    },
    async saveMy(input) {
      const r = fail(
        await repository.saveMy({ ...input, id: generateEntityId }),
      );
      return toMyScorecardDto(r);
    },
    async submitMy(input) {
      const r = fail(
        await repository.submitMy({ ...input, id: generateEntityId, clock }),
      );
      return toMyScorecardDto(r);
    },
    async summary(input) {
      internal(input.actorRole);
      const interview = await repository.findInterview(input);
      if (!interview) throw notFoundError();
      const cards = await repository.findScorecards(input);
      const byParticipant = new Map(
        cards.map((c) => [c.interviewParticipantId, c]),
      );
      return {
        interviewId: interview.id,
        participants: interview.participants.map((p) =>
          byParticipant.has(p.id)
            ? toSummaryDto(byParticipant.get(p.id))
            : {
                participant: { id: p.id },
                status: 'NOT_STARTED',
                submittedAt: null,
                overallRecommendation: null,
              },
        ),
      };
    },
    async submitted(input) {
      internal(input.actorRole);
      const s = await repository.findSubmitted(input);
      if (!s) throw notFoundError();
      return toSubmittedDto(s);
    },
    async applicationScorecards(input) {
      internal(input.actorRole);
      if (!(await repository.findApplication(input))) throw notFoundError();
      const interviews = await repository.applicationScorecards(input);
      return {
        applicationId: input.applicationId,
        interviews: interviews.map((i) => ({
          id: i.id,
          title: i.title,
          scheduledStartAt: i.scheduledStartAt,
          participants: i.participants.map((p) => ({
            participant: { id: p.id, user: { id: p.user.id } },
            scorecard: p.scorecard ? toSubmittedDto(p.scorecard) : null,
          })),
        })),
      };
    },
    async listNotes(input) {
      internal(input.actorRole);
      if (!(await repository.findApplication(input))) throw notFoundError();
      return (await repository.notes(input)).map(toNoteDto);
    },
    async createNote(input) {
      internal(input.actorRole);
      if (!(await repository.findApplication(input))) throw notFoundError();
      return toNoteDto(
        await repository.createNote({ ...input, id: generateEntityId }),
      );
    },
    async updateNote(input) {
      internal(input.actorRole);
      const r = await repository.updateNote({
        ...input,
        authorOnly: input.actorRole !== 'ADMIN',
      });
      if (!r.count)
        throw conflictError('Note was changed, removed, or is not editable');
      const note = (await repository.notes(input)).find(
        (item) => item.id === input.noteId,
      );
      if (!note) throw notFoundError();
      return toNoteDto(note);
    },
    async deleteNote(input) {
      internal(input.actorRole);
      const r = await repository.deleteNote({
        ...input,
        authorOnly: input.actorRole !== 'ADMIN',
      });
      if (!r.count) throw notFoundError();
    },
  };
}
