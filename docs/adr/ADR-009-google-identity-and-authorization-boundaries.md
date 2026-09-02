# ADR-009 — Google Identity and Authentication Boundaries

## Status

Accepted

## Context

HiringLoop must support Google authentication without allowing an external
provider to become the application authorization authority. The domain model
defines User as global identity and OrganizationMembership as the relationship
that establishes tenant context.

## Decision

Google authentication is implemented behind a provider adapter using Google's
immutable OIDC provider subject (`sub`) as the durable identity key. The adapter
validates authorization response state, PKCE where supported/required, nonce
where applicable, issuer, audience/client ID, authorization-code exchange,
redirect URI, and provider signatures/claims through the selected standards-
based OIDC client. Provider access and refresh tokens remain server-side and
are never exposed to the frontend.

A successful Google authentication creates the same opaque PostgreSQL-backed
AuthSession used by password authentication.

An existing provider identity authenticates its associated User. A new Google
identity may create a global User according to registration rules. An email
match with an existing password account does not silently link accounts. It
enters an explicit account-linking-required state; linking requires authenticated
or re-authenticated proof. Full linking may remain a controlled deferred
lifecycle capability if it is not needed for the initial Phase 05 path.

Authentication establishes only global User identity. It does not create or
select an Organization, establish OrganizationMembership, grant RBAC
permissions, or decide resource policy. Those are separate downstream
authorization concerns owned by later phases.

## Consequences

- Provider protocol details remain isolated from auth use cases.
- Provider email claims are not sufficient for silent linking.
- Password and Google login share one session, revocation, and logout model.
- Organization onboarding and invitation/membership flows remain out of Phase
  05.
