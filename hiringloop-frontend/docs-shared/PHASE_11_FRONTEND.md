# Phase 11 frontend — Application Form Builder

Phase 11 Prompt 3 adds the authenticated recruiter builder at
`/app/organizations/:organizationId/jobs/:jobId/application-form`, linked from
Job Detail. The `application-form` feature owns its DTOs, API client, scoped
`applicationFormKeys.builder(organizationId, jobId)` query, mutation hooks,
utilities, and page.

The page fetches one builder aggregate (published version and optional draft).
All seven mutation hooks use the existing CSRF-aware authenticated mutation
helper and replace exactly that query cache entry on success. A conflict
invalidates only that entry; the page explains the conflict and offers an
explicit reload without retrying stale writes.

`application-form:view` enables the page. `application-form:configure` enables
draft creation, question editing, publish, and discard. Hiring Managers receive
a read-only builder; Interviewers do not receive the Job Detail entry and are
denied by the page guard.

The builder supports all eight backend types, a maximum of 100 questions, up
to 50 choice options, confirmation dialogs for destructive
actions, and keyboard-accessible Move Up/Move Down ordering. Choice-option
order is editor-local: label/value edits, deletion, and accessible Move Up/Move
Down controls update the ordered options array and one question create/update
request persists that order. The first/last option movement controls are
disabled at their boundaries; at 50 options the add control explains the limit.
Preview is a local, disabled representation of configured custom questions
only; it creates no candidate/application data and does not submit anything.

The responsive two-column builder/preview layout stacks below the extra-large
breakpoint. All recruiter-provided text is rendered as text, and mutations use
the existing API client/CSRF flow. Phase 12 candidate-facing application,
submission, resume upload, and AI work remain out of scope.

Focused API, mutation-cache, page interaction, and route tests cover the
approved API contract, exact query cache behavior, builder lifecycle,
permissions, local option ordering, accessible dialogs and movement controls,
question ordering, preview boundaries, and validation states. Prompt 4 audit
and manual QA remain required before Phase 11 can be completed.

The frontend suite is verified in bounded Vitest groups because a single
process exceeds the execution window: 34 test files and 199 tests pass.
The groups include explicit Interviewer entry/route denial, create-draft,
delete, option-50 boundary, Move Up, publish, discard, and conflict-reload
page interactions. Prompt 4 audit passed with targeted fixes, Manual QA passed,
and Phase 11 is **COMPLETE**.
