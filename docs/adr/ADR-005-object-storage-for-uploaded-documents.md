# ADR-005 — Object Storage for Uploaded Documents

## Status

Accepted

## Context

Resumes and other candidate- or offer-related documents contain private, potentially large binary content. PostgreSQL must retain metadata, ownership, association, lifecycle, authorization context, and relevant history, while durable file bytes need a storage boundary with private access controls and signed capabilities.

## Decision

Store uploaded document bytes in private AWS S3 object storage. Keep authoritative document metadata and tenant/resource ownership in PostgreSQL. The backend authorizes access and issues narrowly scoped signed upload/download URLs; browsers never receive storage credentials or unrestricted object paths.

Object keys must be unpredictable and must not expose tenant or candidate identity. Upload validation, size/type limits, malware scanning/quarantine, retention, cleanup, and deletion are required future policies; no S3 configuration is part of this ADR.

## Consequences

- Large binary data is separated from relational domain records while metadata remains queryable and tenant-scoped.
- S3 and PostgreSQL can partially fail, so upload confirmation and document availability need explicit states and orphan reconciliation.
- Signed URLs are bearer capabilities and require short, scoped, security-reviewed handling.
- Storage credentials, bucket policy, lifecycle rules, and scanning operations require infrastructure/security ownership.

## Revisit Conditions

Revisit if measured file volume, compliance, access patterns, or provider constraints justify another object-storage design. Any alternative must preserve private access, backend authorization, PostgreSQL metadata authority, and recoverable failure handling.
