# ADR-001 — Modular Monolith Architecture

## Status

Accepted

## Context

HiringLoop is a production-style, multi-tenant recruitment SaaS platform at the architecture and project-foundation stage. The repository is intentionally one Git repository with separate frontend and backend applications. The product will need consistent workflows across organizations, jobs, candidates, applications, interviews, feedback, communications, offers, and reporting. The project is software-engineering-first, and AI engineering is deferred.

At this stage there is no demonstrated need for independently deployed services, independently scaling domains, or separate organizational ownership of backend modules. The architecture should preserve strong boundaries while keeping local development, transactions, and debugging straightforward.

## Decision

Use a modular monolith backend with clearly separated domain modules and background workers where justified. The backend remains one deployable application, with modules communicating through explicit services, use cases, and contracts. BullMQ-style workers may handle slow, retryable, or external work without turning each domain into a service.

## Alternatives Considered

### Microservices from day one

This would provide deployment and scaling isolation early, but would add network boundaries, distributed tracing, service deployment, consistency challenges, and operational overhead before the product demonstrates a need.

### Unstructured monolithic backend

This would be simple to start, but would allow domain ownership and dependencies to blur. Over time it would make authorization, testing, change impact, and future extraction harder to reason about.

### Modular monolith

This keeps one deployable backend while enforcing domain-oriented boundaries, explicit collaboration, and a place for background workers. It matches the current stage and preserves useful evolution paths.

## Why This Decision

- **Development simplicity:** one backend runtime and local development workflow.
- **Transaction consistency:** related domain changes can use clear database transactions without distributed coordination.
- **Easier debugging:** request flows and failures are observable within one application boundary.
- **Lower operational complexity:** fewer deployments, networks, secrets, and service-level concerns.
- **Strong module boundaries:** domain responsibilities, ownership, and collaboration remain explicit.
- **Future extraction possibility:** a well-bounded module may be extracted later if evidence supports it.

## Consequences

### Positive

- Faster feature iteration during the early product stages.
- Straightforward tenant-scoped persistence and cross-module workflows.
- Lower infrastructure and monitoring burden.
- A disciplined structure that discourages a single unstructured codebase.

### Negative

- A defect or resource issue in the backend can affect multiple modules.
- Teams must actively protect module boundaries inside one codebase.
- Independent deployment and scaling are less granular.
- Poorly maintained boundaries could create coupling and make later extraction harder.

## Revisit Conditions

Reconsider this decision if evidence shows a need for:

- independently scaling workloads
- durable organizational or team ownership boundaries
- deployment isolation requirements
- demonstrated module coupling or scaling pressure

These conditions should be assessed with operational and product evidence. They do not imply that microservices will definitely be required later.
