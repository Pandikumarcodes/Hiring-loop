# ADR-002 — Separate Candidate and Application Models

## Status

Accepted

## Context

HiringLoop is a multi-tenant recruiting system. A person may be considered for more than one Job in the same Organization. Each consideration has job-specific answers, source, stage, status, interviews, feedback, communications, and outcome. Existing module boundaries distinguish reusable candidate identity from application lifecycle.

## Decision

Model `Candidate` and `Application` as separate domain entities. `Candidate` is the organization-scoped, reusable recruiting profile for a person. `Application` is that Candidate's relationship with one specific Job and owns job-specific lifecycle state and history. An Application references one Candidate and one Job in the same Organization; a Candidate may have many Applications.

## Alternatives Considered

### Duplicate candidate per job application

This duplicates contact/profile data, makes deduplication and corrections difficult, and obscures a person's cross-job history.

### One combined CandidateApplication record

This mixes reusable person data with job-specific workflow and encourages candidate status to be mistaken for application status.

## Why

The separation matches the business language and workflows. It permits reusable profile data while preserving independent application stages, answers, interviews, feedback, and outcomes. It also gives the modular monolith clear ownership: Candidates owns reusable profile data; Applications owns job-specific candidacy.

## Consequences

- Candidate and Application require explicit organization/job/candidate context checks.
- Application queries are not the source of all candidate identity data.
- Candidate merges, anonymization, and duplicate-application policy need explicit workflows.
- Future persistence needs foreign-key and tenant-scope rules, but this ADR chooses no physical schema.
- Reporting can measure person-level history and application-level funnel behavior separately.

## Revisit Conditions

Revisit only if approved requirements establish that a Candidate is strictly one-time per Job, organizations cannot reuse candidate records, or a different identity/consent model is adopted. Evidence must show why this separation no longer reflects the recruiting domain.
