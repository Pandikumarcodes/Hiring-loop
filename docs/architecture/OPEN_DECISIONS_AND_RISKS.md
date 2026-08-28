# HiringLoop Open Decisions and Risks

## Purpose

This register consolidates unresolved decisions and known risks carried forward from Phase 00. Deferral is intentional where the decision depends on product requirements, implementation evidence, provider behavior, or production operations. An open item is not automatically a Phase 01 blocker.

Status values are **Open**, **Deferred**, or **Accepted Risk**. Owners identify the decision authority or the phase in which evidence should be produced; they are not individual assignments.

## Product Decisions

| Item | Status | Owner / decision phase | Why deferred | Resolve by |
|---|---|---|---|---|
| Duplicate Application policy | Open | Product / Application phase | Public submission behavior and duplicate identity rules are not in a repository-local PRD. | Before Application implementation and public submission tests. |
| Application withdrawal and exit behavior | Open | Product / Application and Pipeline phases | Lifecycle states beyond the baseline are not confirmed. | Before lifecycle implementation. |
| Fixed roles versus custom roles | Open | Product + Security / Authorization phase | Final permission vocabulary and administration model are not approved. | Before role/permission implementation. |
| Recruiter and Hiring Manager scope | Open | Product + Security / Authorization phase | Organization-wide versus job-assignment scope affects resource policies. | Before authorization matrix implementation. |
| Feedback visibility and editing | Open | Product + Security / Scorecards phase | Private-feedback audience, editing, and post-interview access are unresolved. | Before Feedback implementation. |
| Candidate self-service scope | Open | Product + Security / Candidate and communication phases | Candidate access to applications, documents, interviews, and offers is not specified. | Before candidate-facing workflows. |
| Offer version/count rules and explicit Hire transition | Open | Product / Offers phase | Offer lifecycle and acceptance-versus-hire behavior require business policy. | Before Offer implementation. |
| Retention, deletion, anonymization, and consent behavior | Open | Product + Privacy/Security / relevant feature phases | No local PRD or approved privacy policy supplies periods or deletion semantics. | Before storing production candidate data. |
| Realtime use cases and acceptable stale-state UX | Deferred | Product + UX / Realtime phase | REST/polling may be sufficient; no demonstrated low-latency need exists yet. | After implemented workflow evidence. |

## Security Decisions

| Item | Status | Owner / decision phase | Why deferred | Resolve by |
|---|---|---|---|---|
| Session, cookie, and CSRF implementation specifics | Open | Security + Backend / Authentication phase | Architecture direction exists; deployment/session details require implementation review. | Before authentication release. |
| Exact permission grants and field-level visibility | Open | Product + Security / Authorization phase | Role descriptions are not a final grant matrix. | Before protected feature release. |
| Audit visibility, retention, export, and redaction | Open | Security + Product / Audit phase | Audience and retention depend on policy and compliance needs. | Before audit query/export release. |
| Signed URL expiry and scope | Open | Security + Infrastructure / File phase | Must balance usability, leakage risk, and access patterns. | Before document access implementation. |
| Malware scanning/quarantine provider and workflow | Open | Security + Product / Resume phase | File-risk posture and provider choice need evidence and policy. | Before uploaded documents become available. |
| Provider webhook verification and replay policy | Open | Security + Backend / Integration phases | Provider contracts and callback infrastructure are not selected. | Before accepting provider callbacks. |
| Candidate-data privacy/retention policy | Open | Product + Security / before Production | Sensitive data categories and legal/operational requirements need approval. | Before production data onboarding. |

## Infrastructure Decisions

| Item | Status | Owner / decision phase | Why deferred | Resolve by |
|---|---|---|---|---|
| Redis hosting provider and topology | Deferred | Infrastructure / Redis and workers phase | Redis is reserved but no measured queue/cache need or provider constraints exist. | Before Redis-dependent implementation. |
| Worker hosting and scaling strategy | Deferred | Infrastructure / Background jobs phase | Workload volume, concurrency, and operational ownership are unknown. | Before worker deployment. |
| S3 bucket topology, lifecycle, and tenant isolation | Open | Infrastructure + Security / File phase | Environment, retention, scanning, and access patterns are unresolved. | Before file implementation. |
| Backup, restore, and database recovery design | Open | Infrastructure / Database and production-readiness phases | RPO/RTO and operational evidence are not approved. | Before production data. |
| Monitoring, tracing, and error-reporting provider | Deferred | Infrastructure / Observability phase | Tool choice should follow deployed topology and privacy review. | Before operational release. |
| Realtime transport and connection topology | Deferred | Product + Infrastructure / Realtime phase | Transport depends on UX need, fan-out, reconnect, and connection evidence. | Before realtime implementation. |
| CDN need and authorized file-delivery approach | Deferred | Performance + Security / Performance and file phases | Traffic, caching, and signed-capability evidence do not exist. | Before optimizing delivery. |
| Database connection-pool configuration | Deferred | Backend + Infrastructure / Database and performance phases | Hosting connection limits and measured concurrency are unknown. | Before deployed database load. |

## Operational Decisions

| Item | Status | Owner / decision phase | Why deferred | Resolve by |
|---|---|---|---|---|
| MVP concurrency and representative dataset sizes | Open | Product + Engineering / before load testing | No repository-local PRD or usage evidence defines capacity assumptions. | Before meaningful load tests. |
| Production uptime objective | Open | Product + Infrastructure / production readiness | Early deployment history and dependency budgets do not exist. | Before production SLA/SLO approval. |
| RPO and RTO | Open | Product + Infrastructure / production readiness | Recovery tradeoffs require business impact and restore evidence. | Before production launch. |
| API, queue, and provider alert thresholds | Deferred | Infrastructure / Observability phase | Thresholds should derive from baseline behavior and error budgets. | Before operational alerting. |
| Log, audit, webhook, and telemetry retention | Open | Security + Infrastructure / hardening and operations | Retention must balance diagnosis, privacy, cost, and audit needs. | Before production telemetry. |
| Load-testing thresholds and regression gates | Deferred | Engineering / Performance and Testing phases | Representative features and data do not exist yet. | Before performance release gates. |
| Backup/restore and disaster-recovery drill cadence | Deferred | Infrastructure / Production Readiness | Depends on selected resources and RPO/RTO. | Before production readiness sign-off. |

## Known Risks

| Risk | Impact | Current mitigation | Blocking before Phase 01? |
|---|---|---|---|
| Missing repository-local PRD | Feature scope, acceptance, privacy, and capacity decisions may be incomplete. | Roadmap and state record the gap; architecture uses explicit proposed/TBD labels. | No for foundation setup; yes before feature implementation expands. |
| No production performance evidence | Initial latency targets may be wrong for real workloads. | Targets are provisional; measure before optimization and set SLOs later. | No. |
| External provider fallibility | Email, calendar, storage, OAuth, and realtime workflows may be delayed or partially successful. | Adapter boundaries, PostgreSQL authority, pending/failed states, idempotency, retry, and reconciliation direction. | No. |
| Sensitive recruiting data | Leakage or over-retention could cause severe harm. | Tenant isolation, backend authorization, private files, DTO minimization, secret/log rules, and security review gates. | No for setup; yes before protected production data. |
| Async duplicate effects | Retries or worker redelivery could duplicate sends, events, or transitions. | Durable intent, idempotency, deterministic identity, retry classification, and scenario tests required later. | No. |
| Operational recovery not yet evidenced | A database, queue, or provider failure may take too long to diagnose or recover. | Recoverability and observability requirements recorded; RPO/RTO and runbooks remain open. | No for Phase 01; yes for production readiness. |

## Review Rule

Open decisions should be resolved at the earliest phase where the required evidence or product authority exists. They must not be silently converted into implementation defaults. New decisions that change ownership, consistency, security authority, deployment boundaries, or module structure should be recorded in an ADR.
