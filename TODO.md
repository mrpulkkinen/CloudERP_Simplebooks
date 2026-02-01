# CloudERP Simplebooks TODO

Track outstanding feature work and process updates here. Check off items when
done and add new ones as they surface.

## High priority

- [x] Implement sales order workflow (list/create, confirm, convert to invoices) and manual journal entry tooling.
- [x] Improve AR/AP lifecycle: editable/voidable invoices & bills, payments that can apply to multiple documents, and UI to manage accounts and tax rates.
- [x] Harden infrastructure: deterministic numbering sequences (no race conditions), better automated tests around postings, and multi-organization awareness instead of a hard-coded default org.
- [ ] Deliver Danish digital bookkeeping compliance baseline (see `docs/compliance/danish_digital_bookkeeping.md`).
  - [ ] Immutable audit log for all financial events (create/update/correct + user/time/context).
  - [ ] Bilag handling: enforce electronic attachments with deterministic IDs per posting.
  - [ ] Period locking + correction-only flows (no destructive delete) with documented rationale.
  - [ ] Backup/restore procedure and verification tests documented and automated.
  - [ ] Export pipeline for postings, bilag, chart of accounts, and logs for authorities.

## Process

- Keep this list updated at the end of each task.
- Capture any follow-up work discovered in reviews or while coding.
