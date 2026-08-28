# HiringLoop Architecture Principles

1. PostgreSQL is the source of truth.
2. Backend authorization is authoritative.
3. Tenant isolation is a critical invariant.
4. Controllers remain thin.
5. Business rules belong in services, use cases, or domain logic.
6. Prisma is not accessed directly from controllers.
7. External input is validated at trust boundaries.
8. Responses use explicit DTOs.
9. Critical workflows use transactions where appropriate.
10. Slow or unreliable work may use background jobs.
11. Caching is introduced only when justified by evidence.
12. External providers are assumed fallible.
13. Security and performance are considered during feature design.
14. AI is deferred until the software-engineering milestone is complete.
15. Microservices are not introduced without demonstrated need.
16. Every important architecture change should be documented.
