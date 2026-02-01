# Danish Digital Bookkeeping Compliance

This document captures the statutory and best-practice requirements for
building a Danish-compliant digital bookkeeping solution in CloudERP
Simplebooks. Use it as the authoritative checklist when designing features,
reviewing implementations, and preparing documentation for auditors or the
Danish Business Authority (Erhvervsstyrelsen).

## 1. Legal Basis

- **Bogføringsloven** (LBK nr. 700 af 24/05/2022 m.fl.)
- **Bekendtgørelse om digital bogføring**
- Requirements on retention, traceability, digital posting, and control access.
- Responsibility ultimately stays with the company operating the system.

## 2. Functional Requirements

| Area | Key expectations | Notes for Simplebooks |
| --- | --- | --- |
| Løbende bogføring | Chronological posting, timely registration, documented accruals | Enforce timestamps, automatic numbering, and posting period locks. |
| Bilagshåndtering | Every posting has an electronic attachment with immutable storage | Require uploads for invoices/bills/manual journals and store references per posting. |
| Kontoplan & posteringer | Structured chart of accounts, double-entry validation, change log | Already enforced in Prisma schema; need version history + audit log for edits. |
| Revisionsspor | Bidirectional trace from bilag ↔ bogføring ↔ regnskab | Provide click-through UI + API exports that connect attachments, postings, journals, reports. |
| Rettelser | No destructive deletes; corrections via reversing entries | Already enforced logically; need explicit UI/service restrictions + logging of rationale. |

## 3. Non-Functional Requirements

- **Security & Access**: Unique users, role-based access, optional MFA.
- **Logging**: Immutable log of create/update/correction events capturing who/what/when.
- **Backup & Restore**: Automated daily backups, off-site copy, documented restore that is tested yearly.
- **Data Integrity**: Checksums or tamper detection, restricted DB access, monitoring for unauthorized modifications.

## 4. Retention & Export

- Minimum 5-year digital retention after fiscal year end.
- Storage in standard formats (PDF, CSV, XML) accessible without vendor tools.
- Capability to export postings, attachments, chart of accounts, and logs quickly for authorities.

## 5. Documentation

Document and keep current:

- System purpose, architecture, data flows, and controls.
- Processes for bookkeeping, attachments, corrections, backups, and access reviews.

## 6. Compliance Workstream Tracker

| Requirement | Planned Solution | Owner | Status |
| --- | --- | --- | --- |
| Entydig bilagsreference | Deterministic bilag IDs linked to postings | Platform | 🚧 in design |
| Ingen sletning uden spor | Enforce reverse/correction entries only + audit log | Platform | 🚧 in progress |
| Revisionsspor | UI/API linking bilag ↔ journal ↔ rapporter | Platform | ⬜ Not started |
| Backup & restore | Daily automated backups + documented restore test | Infra | ⬜ Not started |
| Logning af handlinger | Append-only audit log with user/time/event | Platform | 🚧 initial infra |

> Continue updating this table as implementation progresses.

## 7. Next Steps

1. Introduce immutable audit log storage (model + service).
2. Require attachments for financial documents and enforce bilag IDs.
3. Surface revisions and period locking controls in UI/API.
4. Document backup/restore and run tabletop restore tests.
5. Prepare export endpoints for compliance reviews.

