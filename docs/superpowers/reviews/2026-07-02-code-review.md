# Code review — 2026-07-02

## Scope

An extra-high-recall review of the working diff against base `1366793`. That range covers today's work: 19 commits (`c5ae0e0..be1445b`) plus the compact case-detail launcher bar. Emphasis was on correctness bugs (workflow-blocking defaults, timezone drift, deep-link state, seed data) with a secondary sweep for dead code and reuse cleanups. Fifteen findings were surfaced and triaged into fixed and deferred buckets below.

## Findings

| # | Severity | File:line | Summary |
|---|----------|-----------|---------|
| 1 | High | packages/ui/src/pages/CaseView.tsx:131 | Director-review upload defaulted to the stale `NOTARY` type, so the attached final doc was filed under a type Approve does not accept — silently blocking approval. |
| 2 | High | apps/backend/prisma/seed.ts:47 | Upsert `update` branch omitted `passwordHash`/`plainPassword`, so re-seeding an existing DB never populated the admin-visible seed passwords (only a fresh DB showed them). |
| 3 | High | packages/ui/src/components/forms.tsx:297 | `DatePicker` stored the picked/typed date at local midnight via `toISOString()`, shifting date-only fields a day back for UTC+5 users (birth dates, contract/application dates in generated PDFs). |
| 4 | Med | packages/ui/src/pages/ChatsPage.tsx:23 | The `?case=` deep-link was read only in the `useState` initializer; React Router reuses the `/chats` element on a query-only change, so navigating from a case never opened its chat. |
| 5 | Med | packages/ui/src/components/forms.tsx:306 | A fully typed but impossible date (e.g. `32.13.2026`) silently reverted with no signal to the user; free-form input also accepted non-date characters. |
| 6 | Med | apps/backend/src/credit-cases/credit-cases.service.ts:222 | `GET /cases/:id/participants` performs no case-access scoping — any authenticated user can enumerate a case's participants regardless of branch/role. |
| 7 | Low | apps/backend/src/prisma/prisma.service.ts | Dead `$on('query')` QueryLog util (with its `queryLogEnabled()` gate) left in the tree after the recursion fix disabled the logger. |
| 8 | Low | packages/ui/src/components/CaseForm | Dead `CaseForm` component — no longer referenced after the wizard replaced the single-page edit route. |
| 9 | Low | packages/ui/src/components (NewCaseModal) | Dead `NewCaseModal` — superseded by the full-screen wizard for new applications. |
| 10 | Low | packages/ui/src/lib/roles.ts:3 | `roleTone` and `initials` were duplicated inline across CaseChat/participants views instead of shared from a single module. |
| 11 | Low | packages/shared/src/dto.ts:221 | `CaseParticipantDto` carried fields the participants strip never renders, widening the API surface unnecessarily. |
| 12 | Low | packages/ui/src/pages/CaseView.tsx:26 | Decision label/icon maps and the APPROVE destination label were rebuilt per render inside the component instead of hoisted to module scope. |
| 13 | Low | packages/ui/src/components/CaseChat.tsx:58 | Participants query had no `staleTime`, refetching an effectively static list on every mount/focus. |
| 14 | Low | packages/ui/src/pages/CaseView.tsx | Modal bodies stayed mounted while closed, rebuilding their element trees on unrelated re-renders. |
| 15 | Low | apps/backend/tsconfig.json:25 | `include` is limited to `src`, so `prisma/seed.ts` is excluded from the build's type-check — seed regressions (like #2) aren't caught by `tsc`. |

## Fixed

- **Director-review upload files as `DIRECTOR_FINAL`.** `effectiveUploadType` falls back to the first allowed type when the controlled `uploadType` is stale for the context, so a director's attachment is filed under `DIRECTOR_FINAL` and Approve is no longer blocked (CaseView.tsx:131).
- **Seed populates passwords on re-seed.** The upsert `update` branch now sets `passwordHash` and `plainPassword`, so re-seeding an existing DB shows the admin-visible seed passwords (seed.ts:47).
- **DatePicker stores UTC midnight.** Both the typed-commit path and the calendar-cell click now build the ISO string via `Date.UTC(...)`, stopping the UTC+5 off-by-one on date-only fields (forms.tsx:297, :339).
- **ChatsPage re-syncs the deep-link.** A `useEffect` on `searchParams` re-derives the active `?case=` conversation on query-only navigation, since the element is reused and the initializer no longer runs (ChatsPage.tsx:23).
- **DatePicker masks input and surfaces invalid dates.** Input is masked to `dd.mm.yyyy` via `maskDate`, and a complete-but-impossible date keeps the text and shows an inline error (`invalid` state + error border/`aria-invalid`) instead of silently reverting (forms.tsx:291, :306, :318).
- **Cleanup pass.** Deleted the dead query-log util (and its `queryLogEnabled()` gate) plus its spec, and rewrote the commented-out block in `prisma.service.ts` so it no longer names the removed helpers; removed the dead `CaseForm` and `NewCaseModal`; extracted `roleTone`/`initials` to `lib/roles.ts`; dropped unused `CaseParticipantDto` fields; hoisted CaseView's decision maps to module scope and added APPROVE destination labels; added a `staleTime` (5 min) to the participants query.

## Deferred

- **Participants endpoint case-access scoping (#6).** `GET /cases/:id/participants` matches the existing unscoped `GET /cases/:id`, so scoping it in isolation would be inconsistent. Access control for case-detail reads is best fixed holistically across both endpoints rather than patched piecemeal here.
- **tsconfig seed type-check gap (#15).** `include: ["src"]` leaves `prisma/seed.ts` out of the type-check, which is why the seed regression in #2 slipped through. Widening the build to cover the seed touches build config and `rootDir` assumptions, so it's deferred to a dedicated change rather than folded into this review's fixes.
