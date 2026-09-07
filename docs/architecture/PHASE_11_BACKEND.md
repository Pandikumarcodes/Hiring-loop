# Phase 11 Backend — Application Form Builder

## Scope and status

Phase 11 backend work provides authenticated, recruiter-side application-form
configuration only. It does not provide a candidate application flow. Backend
implementation and verification are complete. Phase 11 is **COMPLETE**.

## Authorization

Phase 11 reuses the established Phase 07 authentication, organization-membership,
tenant-context, and centralized permission model. The backend, rather than a
frontend organization ID or UI state, authorizes every operation.

| Capability | ADMIN | RECRUITER | HIRING_MANAGER | INTERVIEWER |
|---|---:|---:|---:|---:|
| Application-form view | Allow | Allow | Allow | Deny |
| Application-form configure | Allow | Allow | Deny | Deny |

Hiring Manager view-only access follows the existing Phase 07/Job-read
authorization model. Configure includes draft creation, question mutations,
publishing, and discard.

Authentication and active organization membership are required. Mutations use
the existing CSRF middleware. Zod validates route parameters and request bodies;
unknown/server-owned fields are rejected. Errors are translated to structured
application errors, so raw Prisma/database errors are not exposed. Builder DTOs
omit unnecessary internal tenant/database relationship fields, and recruiter
labels, descriptions, placeholders, and option text are plain untrusted text.

## APIs

Exactly eight authenticated Phase 11 configuration APIs are documented:

1. `GET /organizations/:organizationId/jobs/:jobId/application-form`
2. `POST /organizations/:organizationId/jobs/:jobId/application-form/draft`
3. `POST /organizations/:organizationId/jobs/:jobId/application-form/draft/questions`
4. `PATCH /organizations/:organizationId/jobs/:jobId/application-form/draft/questions/:questionId`
5. `DELETE /organizations/:organizationId/jobs/:jobId/application-form/draft/questions/:questionId`
6. `PUT /organizations/:organizationId/jobs/:jobId/application-form/draft/questions/order`
7. `POST /organizations/:organizationId/jobs/:jobId/application-form/draft/publish`
8. `DELETE /organizations/:organizationId/jobs/:jobId/application-form/draft`

There are no candidate application or submission APIs in this phase.

## Lifecycle, versions, and concurrency

Every Job has an ApplicationForm with a default empty published V1. The
lifecycle is:

```text
PUBLISHED active version → create/reuse DRAFT → modify DRAFT → publish new version
```

Publishing makes the draft the active published version. Older published
versions remain immutable historical records. Each form has at most one DRAFT.
Creating a draft clones the active version’s questions/options: clones receive
new row IDs while retaining their stable logical `questionKey` values.

The database additionally enforces active-version ownership with a deferred
composite foreign key: the active version must belong to the same form and
organization. Defensive repository/use-case checks reject invalid persisted
state safely before it can be served.

Draft mutations require a positive `expectedRevision` in the request. The
revision is the optimistic-concurrency token and increments atomically only on a
successful mutation. A stale revision receives HTTP 409
`FORM_VERSION_CONFLICT`. Failed validation/limit requests do not partially
persist data and do not increment the draft revision.

Publish is transactional: it publishes the draft and updates the parent form’s
`activeVersionId` together. Discard deletes only the DRAFT (and its draft-owned
questions/options), never a published version. Discarding with no draft returns
HTTP 404 `APPLICATION_FORM_DRAFT_NOT_FOUND`. Phase 11 mutation APIs cannot
edit, delete, or reorder published versions.

## Questions and validation limits

Supported custom question types are `SHORT_TEXT`, `LONG_TEXT`, `NUMBER`,
`YES_NO`, `SINGLE_SELECT`, `MULTI_SELECT`, `DATE`, and `URL`.

- A form can contain at most 100 custom questions. Question 100 is allowed;
  question 101 returns HTTP 400 `APPLICATION_FORM_QUESTION_LIMIT_REACHED`.
- A choice question can contain at most 50 options. Fifty are allowed; 51 are
  rejected with HTTP 400 `VALIDATION_ERROR`.

`FILE` and resume fields are not configurable custom question types. Resume and
document upload are Phase 12 concerns.

## Tenant and resource isolation

Organization is the tenant boundary. Every operation follows and verifies the
resource chain:

```text
Organization → Job → ApplicationForm → Version → Question
```

Trusted session/membership context supplies the tenant; a frontend-provided
organization ID does not grant access. Repository and use-case checks ensure
that cross-organization valid IDs cannot access or mutate resources, with safe
resource behavior for foreign-tenant attempts. A question for Job A cannot be
mutated through Job B, and a reorder request cannot include questions from a
different form. Active versions must belong to their ApplicationForm; corrupted
active-version relationships are rejected safely.

## Phase 11 / Phase 12 boundary

Phase 11 is recruiter form configuration only. It does not include candidate
application submission, Candidate creation, Application creation/submission,
ApplicationAnswer persistence, resume upload, candidate documents, a public
Apply page, or AI screening. Those candidate-application concerns belong to
Phase 12.
