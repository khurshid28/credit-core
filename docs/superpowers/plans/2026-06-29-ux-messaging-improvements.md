# UX & Messaging Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship four independent UX improvements to the credit-core web apps — user-credential polish, a workflow submit fix + action-panel redesign, a collateral attachment redesign, and a Telegram-style unified inbox (DMs + Saved Messages) — in that order.

**Architecture:** Groups B/C/D are UI + small backend changes with no DB migration. Group A makes `Message.caseId` nullable so messages can live outside a case, derives DM/Saved threads from `(senderId, toUserId, caseId IS NULL)`, and refactors the chat UI into a shared `MessageThread` reused by case-chat and the new inbox.

**Tech Stack:** NestJS + Prisma 6 + MySQL (docker, 3307), React + Vite + Tailwind (packages/ui shared across 4 web apps), Jest + ts-jest. Spec: `docs/superpowers/specs/2026-06-29-ux-messaging-improvements-design.md`.

## Global Constraints

- **Branch:** all work on a NEW branch `feat/ux-messaging-improvements` off `master` (Task 0). Do NOT use `feat/mko-workbook-sp1-spec`.
- **Build order:** B → C → D → A (quick wins first).
- **Do not touch the in-case `CaseChat` behaviour** except the shared-component refactor in Group A (which must keep it working identically).
- **Unrelated uncommitted `packages/ui/*` changes from another session exist** — commit only the files each task names; never `git add -A`.
- **UI verification = `tsc --noEmit` + vite build, not screenshots** (preview screenshots fail on the Spline splash; see memory `ui-verification`). Manual checks run against `npm run dev`.
- **Any `prisma` command (Group A only)** needs the engine env vars first, and the dev backend must be stopped (Windows locks the engine `.node`):
  ```bash
  export CHECKPOINT_DISABLE=1
  export PRISMA_QUERY_ENGINE_LIBRARY="C:/Users/Administrator/Desktop/credit-core/node_modules/@prisma/engines/query_engine-windows.dll.node"
  export PRISMA_SCHEMA_ENGINE_BINARY="C:/Users/Administrator/Desktop/credit-core/node_modules/@prisma/engines/schema-engine-windows.exe"
  ```
  (See memory `local-dev-setup`. Dev DB: `mysql://root:root@localhost:3307/credit_core`.)
- **Copy/labels are Uzbek** to match the app (e.g. "Yuborish", "Saqlangan xabarlar", "nusxalandi").

---

### Task 0: Branch setup

**Files:** none (git only).

- [ ] **Step 1: Create the branch off master**

```bash
cd "C:/Users/Administrator/Desktop/credit-core"
git stash push -m "unrelated-ui-wip" -- packages/ui   # park other-session UI edits, if any
git checkout master
git pull --ff-only 2>/dev/null || true
git checkout -b feat/ux-messaging-improvements
```
Expected: on `feat/ux-messaging-improvements`. If `git stash` reports "No local changes to save", continue. (Restore later with `git stash pop` only if those edits are yours to keep — otherwise leave stashed.)

- [ ] **Step 2: Confirm clean baseline build**

```bash
cd "C:/Users/Administrator/Desktop/credit-core/apps/backend" && npm test 2>&1 | tail -5
```
Expected: existing suites pass (`sum-to-words`, `workflow.service`).

---

## GROUP B — User management polish

### Task B1: Copy login+password together (UsersPage)

**Files:**
- Modify: `packages/ui/src/pages/UsersPage.tsx` (password/login cell area ~lines 42–45, 120–130)

**Interfaces:**
- Produces: a row action that copies `"<login>\n<plainPassword>"` to the clipboard with a toast.

- [ ] **Step 1: Add a copy-both handler near the existing copy helpers**

In `UsersPage.tsx`, find the existing single-field copy helper (around line 45, the one used for login/password). Add beside it:
```tsx
const copyBoth = async (login: string, password?: string) => {
  const text = password ? `${login}\n${password}` : login;
  await navigator.clipboard.writeText(text);
  toast.success('Login va parol nusxalandi');
};
```
(Reuse the existing `toast` import already used in this file; if the existing copy helper uses a different toast call, match it.)

- [ ] **Step 2: Add the button to the credentials cell**

In the user row, in the "Parol" (or login) cell, next to the existing eye-toggle + per-field copy buttons, add a button:
```tsx
<button
  type="button"
  title="Login va parolni birga nusxalash"
  onClick={() => copyBoth(u.login, u.plainPassword)}
  className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-accent"
>
  <Copy className="h-3.5 w-3.5" /> Login+Parol
</button>
```
(`Copy` icon is already imported in this file for the existing copy buttons; reuse that import. `u` is the row's user; `u.plainPassword` may be undefined — handled by `copyBoth`.)

- [ ] **Step 3: Typecheck**

```bash
cd "C:/Users/Administrator/Desktop/credit-core" && npx tsc --noEmit -p packages/ui/tsconfig.json 2>&1 | tail -5
```
Expected: no errors (no output / exit 0). If `packages/ui/tsconfig.json` does not exist, use `npx tsc --noEmit` from `packages/ui`.

- [ ] **Step 4: Manual check**

Start the app (`npm run dev` from repo root), log in as admin, open Users, click "Login+Parol" on a row → paste somewhere → both login and password appear on two lines; toast shows "Login va parol nusxalandi".

- [ ] **Step 5: Commit**

```bash
git add packages/ui/src/pages/UsersPage.tsx
git commit -m "feat(users): copy login+password together"
```

### Task B2: Phone field in the user form

**Files:**
- Modify: `packages/ui/src/pages/UsersPage.tsx` (FormState + form JSX + submit payload)
- Modify: `apps/backend/src/users/users.module.ts` (POST /users ~line 81, PUT /users/:id ~line 101)
- Modify: `packages/api-client/src/index.ts` (createUser/updateUser payload types — add `phone?: string`)

**Interfaces:**
- Produces: create/update user accepts and persists `phone` (User.phone already exists in the schema).

- [ ] **Step 1: Backend — accept `phone` on create**

In `users.module.ts`, the `POST /users` handler builds the `data` for `prisma.user.create`. Add `phone` from the body:
```ts
phone: body.phone ?? null,
```
Add `phone?: string` to the create DTO/body type used there.

- [ ] **Step 2: Backend — accept `phone` on update**

In the `PUT /users/:id` handler, add to the update `data` (only when provided):
```ts
...(body.phone !== undefined ? { phone: body.phone || null } : {}),
```
Add `phone?: string` to the update DTO/body type.

- [ ] **Step 3: api-client — add `phone` to the payload types**

In `packages/api-client/src/index.ts`, the `createUser`/`updateUser` argument types: add `phone?: string`.

- [ ] **Step 4: Frontend — add `phone` to FormState + form**

In `UsersPage.tsx`: add `phone: string` to `FormState` (init `''`), populate from the user on edit (`phone: editing?.phone ?? ''`), and add an input in the form (after the login field):
```tsx
<label className="block">
  <span className="text-sm font-medium">Telefon</span>
  <input
    type="tel"
    value={form.phone}
    onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
    placeholder="+998 90 123 45 67"
    className="mt-1 w-full rounded-lg border bg-background px-3 py-2"
  />
</label>
```
Include `phone: form.phone || undefined` in the create/update payload sent to the api-client.

- [ ] **Step 5: Typecheck backend + ui**

```bash
cd "C:/Users/Administrator/Desktop/credit-core/apps/backend" && npx tsc --noEmit 2>&1 | tail -5
cd "C:/Users/Administrator/Desktop/credit-core" && npx tsc --noEmit -p packages/ui/tsconfig.json 2>&1 | tail -5
```
Expected: no errors.

- [ ] **Step 6: Manual check**

Create a user with a phone, reload Users, edit that user → phone is preserved.

- [ ] **Step 7: Commit**

```bash
git add packages/ui/src/pages/UsersPage.tsx apps/backend/src/users/users.module.ts packages/api-client/src/index.ts
git commit -m "feat(users): collect phone on create/edit"
```

---

## GROUP C — Workflow

### Task C1: Allow admin to submit a draft (workflow rule + test)

**Files:**
- Modify: `packages/shared/src/workflow.ts` (TRANSITIONS array ~lines 19–46)
- Test: `apps/backend/src/credit-cases/workflow.service.spec.ts` (add a case)

**Interfaces:**
- Produces: `WorkflowService.resolve({ currentStatus: DRAFT, role: ADMIN, decision: SUBMIT })` returns `{ to: MODERATION }`.

- [ ] **Step 1: Write the failing test**

In `workflow.service.spec.ts`, add:
```ts
it('allows admin to submit a draft', () => {
  const rule = svc.resolve({
    currentStatus: CaseStatus.DRAFT,
    role: Role.ADMIN,
    decision: WorkflowDecision.SUBMIT,
    documentTypes: [],
  });
  expect(rule.to).toBe(CaseStatus.MODERATION);
});
```

- [ ] **Step 2: Run it — verify it fails**

```bash
cd "C:/Users/Administrator/Desktop/credit-core/apps/backend" && npx jest workflow.service 2>&1 | tail -12
```
Expected: FAIL (admin SUBMIT throws ForbiddenException — no matching rule).

- [ ] **Step 3: Add the transition rule**

In `packages/shared/src/workflow.ts`, in the `TRANSITIONS` array, directly after the operator `DRAFT → MODERATION` rule, add:
```ts
{ from: CaseStatus.DRAFT, to: CaseStatus.MODERATION, role: Role.ADMIN, decision: WorkflowDecision.SUBMIT },
```

- [ ] **Step 4: Rebuild shared + run the test**

```bash
cd "C:/Users/Administrator/Desktop/credit-core" && npm run build -w @credit-core/shared 2>&1 | tail -3
cd apps/backend && npx jest workflow.service 2>&1 | tail -8
```
Expected: all workflow tests PASS (including the new one).

- [ ] **Step 5: Commit**

```bash
cd "C:/Users/Administrator/Desktop/credit-core"
git add packages/shared/src/workflow.ts apps/backend/src/credit-cases/workflow.service.spec.ts
git commit -m "feat(workflow): allow admin to submit a draft to moderator"
```

### Task C2: Action-panel polish (CaseView) — ui-ux-pro-max

**Files:**
- Modify: `packages/ui/src/pages/CaseView.tsx` (transition area ~lines 228–298; cancel/reopen modal ~311–340)

**Interfaces:**
- Consumes: `myTransitions` (allowed transitions for current role/status, already computed ~line 68), `POST /cases/:id/transition`.
- Produces: a restyled "Amaliyot" panel; no API/contract change.

> Apply the **ui-ux-pro-max** skill for spacing/typography/states. This task is a visual refactor of the existing transition controls — same data and endpoints, better UX. Implement to this acceptance spec:

- [ ] **Step 1: Restructure the action area into an "Amaliyot" card**

Wrap the existing comment textarea + transition buttons in a titled card:
```tsx
<section className="rounded-xl border bg-card p-4 sm:p-5 space-y-4">
  <header className="flex items-center justify-between">
    <h3 className="text-sm font-semibold">Amaliyot</h3>
    <DeadlineBadge deadlineAt={c.stepDeadlineAt} paused={!!c.pausedAt} pauseUntil={c.pauseUntil} />
  </header>
  {/* requirement hint (Step 2) */}
  {/* comment field, relabelled "Qaror izohi" */}
  {/* primary/secondary action buttons (Step 3) */}
</section>
```
Keep the existing `myTransitions` mapping and the `transition(decision, comment)` call.

- [ ] **Step 2: Inline requirement hint for director-final docs**

When `c.status === 'DIRECTOR_REVIEW'` and no `DIRECTOR_FINAL` document is attached, render an amber hint above the buttons and disable the APPROVE button with that reason:
```tsx
{needsFinalDoc && (
  <p className="flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
    <AlertTriangle className="h-4 w-4" /> Tasdiqlash uchun yakuniy hujjat biriktiring.
  </p>
)}
```
`needsFinalDoc` = director review + no final doc (reuse the existing check at ~line 70–71/216). The APPROVE button gets `disabled={needsFinalDoc}` + `title` explaining why.

- [ ] **Step 3: Button hierarchy + per-button loading**

Render allowed transitions with clear hierarchy: the forward action (SUBMIT/APPROVE/FINALIZE) is `variant="primary"`, RETURN is `variant="secondary"`, CANCEL/REOPEN move into the existing modal trigger (`variant="ghost"` danger styling). Each button shows a spinner and disables while its own request is in flight (track `pendingDecision` state, set before `await transition(...)`, clear after). Labels + icons per decision: Yuborish/Send, Tasdiqlash/CheckCircle2, Qaytarish/RotateCcw, Yakunlash/Flag, Bekor qilish/X, Qayta ochish/RotateCcw (all icons already imported in this file).

- [ ] **Step 4: Terminal states**

When `c.status` is `FINALIZED` or `CANCELLED`, render a read-only summary (status chip + last `WorkflowEvent` actor/date) instead of the action card — no action buttons.

- [ ] **Step 5: Typecheck + manual**

```bash
cd "C:/Users/Administrator/Desktop/credit-core" && npx tsc --noEmit -p packages/ui/tsconfig.json 2>&1 | tail -5
```
Manual: as operator open a DRAFT case → "Amaliyot" card shows "Yuborish"; submit moves it to MODERATION. As admin, a draft you created also shows "Yuborish" (Task C1). As director on DIRECTOR_REVIEW with no final doc → APPROVE disabled + amber hint; attach a DIRECTOR_FINAL doc → APPROVE enables.

- [ ] **Step 6: Commit**

```bash
git add packages/ui/src/pages/CaseView.tsx
git commit -m "feat(workflow): redesign case action panel (Amaliyot)"
```

---

## GROUP D — Collateral attachment redesign

### Task D1: CollateralCard attachment block (CaseForm) — ui-ux-pro-max

**Files:**
- Modify: `packages/ui/src/pages/CaseForm.tsx` (CollateralCard ~lines 376–485; the "Qo'shimcha rasm va izohlar" block ~449–483)

**Interfaces:**
- Consumes: `StagedColDoc` (`{ localId, colIndex, file, type, title, description }`) and `addColDocs(colIndex, files)`, `removeColDoc(localId)`, `setColDocField(localId, patch)` from `useCaseForm` (~lines 62–77). No new data or API — the upload flow (`POST /documents/upload?...title&description`) is unchanged.
- Produces: a redesigned attach block; same staged-doc data.

> Apply **ui-ux-pro-max**. Same data, much better layout. Acceptance spec:

- [ ] **Step 1: Replace the cramped per-file row with a dropzone + card grid**

Replace the block body (the file-list `.map` at ~459–481) with:
- A **dropzone**: a dashed, focusable area ("Rasm yoki hujjat tashlang, yoki tanlang", subtext "JPG, PNG, PDF, DOC") that accepts click (hidden input `accept="image/*,.pdf,.doc,.docx" multiple`) AND drag-drop (`onDragOver`/`onDrop` → `addColDocs(colIndex, e.dataTransfer.files)`).
- A **responsive grid** (`grid gap-3 sm:grid-cols-2`) of attachment cards.

- [ ] **Step 2: Attachment card layout**

Each staged doc renders as a card:
```tsx
<div className="rounded-xl border bg-background p-3 flex gap-3">
  {isImage(d) ? (
    <button type="button" onClick={() => setLightbox(previewUrl(d.file))} className="shrink-0">
      <img src={previewUrl(d.file)} className="h-16 w-16 rounded-lg object-cover" />
    </button>
  ) : (
    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-muted"><FileIcon className="h-7 w-7 text-muted-foreground" /></div>
  )}
  <div className="min-w-0 flex-1 space-y-2">
    <input value={d.title} onChange={(e) => setColDocField(d.localId, { title: e.target.value })}
           placeholder="Nomi (masalan: Old tomondan)" className="w-full rounded-md border bg-background px-2.5 py-1.5 text-sm" />
    <input value={d.description} onChange={(e) => setColDocField(d.localId, { description: e.target.value })}
           placeholder="Izoh matni (ixtiyoriy)" className="w-full rounded-md border bg-background px-2.5 py-1.5 text-sm" />
    <p className="truncate text-xs text-muted-foreground">{d.file.name}</p>
  </div>
  <button type="button" onClick={() => removeColDoc(d.localId)} title="O'chirish" className="self-start text-destructive hover:opacity-80"><Trash2 className="h-4 w-4" /></button>
</div>
```
Helpers: `isImage(d) = (d.file.type || '').startsWith('image/')`; `previewUrl(file)` = memoized `URL.createObjectURL(file)` (create once per staged file, revoke on remove to avoid leaks — store the URL on the staged doc or in a `useMemo`/ref map keyed by `localId`).

- [ ] **Step 3: Image lightbox**

Add a `lightbox` state (`string | null`) and a simple modal overlay that shows the full image on card click, closes on backdrop/Escape. (Reuse the existing `Modal` primitive in packages/ui if present; otherwise a fixed overlay with the `<img>`.)

- [ ] **Step 4: Typecheck + manual**

```bash
cd "C:/Users/Administrator/Desktop/credit-core" && npx tsc --noEmit -p packages/ui/tsconfig.json 2>&1 | tail -5
```
Manual: open a case form, add a collateral, drag an image + a PDF into the dropzone → two cards appear; type a name + note on each; click the image → lightbox; remove one; Save → reload the case → name + description persisted on the collateral's documents.

- [ ] **Step 5: Commit**

```bash
git add packages/ui/src/pages/CaseForm.tsx
git commit -m "feat(collateral): redesign attachment block (dropzone + cards + lightbox)"
```

---

## GROUP A — Telegram-style unified inbox (DMs + Saved Messages)

### Task A1: Make Message.caseId nullable (schema + migration)

**Files:**
- Modify: `apps/backend/prisma/schema.prisma` (Message model)
- Create: `apps/backend/prisma/migrations/<ts>_message_caseid_nullable/migration.sql` (generated)

**Interfaces:**
- Produces: `Message.caseId` is nullable; `Message.case` is an optional relation; `@@index([toUserId])` exists.

- [ ] **Step 1: Recreate a fresh dev DB for this branch (throwaway data)**

This branch is off master (migrations: the original set, no SP-1). Reset the dev DB so migration history matches the branch:
```bash
cd "C:/Users/Administrator/Desktop/credit-core"
docker compose -f docker-compose.dev.yml down -v && docker compose -f docker-compose.dev.yml up -d
for i in $(seq 1 30); do [ "$(docker inspect -f '{{.State.Health.Status}}' credit-core-mysql 2>/dev/null)" = healthy ] && break; sleep 4; done
```

- [ ] **Step 2: Edit the Message model**

In `apps/backend/prisma/schema.prisma`, change the `Message` relation/field:
```prisma
  case   CreditCase? @relation(fields: [caseId], references: [id], onDelete: Cascade)
  caseId String?
```
and add, with the other `@@index` lines in `Message`:
```prisma
  @@index([toUserId])
```

- [ ] **Step 3: Validate + create the migration (backend stopped, env vars set)**

```bash
# stop any running dev backend first (Windows engine lock):
powershell -NoProfile -Command "Get-CimInstance Win32_Process -Filter \"Name='node.exe'\" | Where-Object { \$_.CommandLine -match 'apps..backend..dist..src..main|nest start|concurrently|vite' } | ForEach-Object { Stop-Process -Id \$_.ProcessId -Force -ErrorAction SilentlyContinue }"
cd "C:/Users/Administrator/Desktop/credit-core/apps/backend"
export CHECKPOINT_DISABLE=1
export PRISMA_QUERY_ENGINE_LIBRARY="C:/Users/Administrator/Desktop/credit-core/node_modules/@prisma/engines/query_engine-windows.dll.node"
export PRISMA_SCHEMA_ENGINE_BINARY="C:/Users/Administrator/Desktop/credit-core/node_modules/@prisma/engines/schema-engine-windows.exe"
npx prisma validate && npx prisma migrate dev --name message_caseid_nullable
```
Expected: validate OK; migration `..._message_caseid_nullable` created + applied; client generated; seed runs. If generate hits `EPERM`, a node process still holds the engine — re-run the powershell kill, then `npx prisma generate`.

- [ ] **Step 4: Seed (if not auto-run) and commit**

```bash
npx prisma db seed 2>&1 | tail -3   # idempotent; ensures operator/etc. exist
cd "C:/Users/Administrator/Desktop/credit-core"
git add apps/backend/prisma/schema.prisma apps/backend/prisma/migrations
git commit -m "feat(db): make Message.caseId nullable for DM/saved threads"
```

### Task A2: Messaging backend — conversations, DM, saved, save-to-saved

**Files:**
- Modify: `apps/backend/src/messages/messages.module.ts` (add endpoints; generalise send/visibility)
- Create: `apps/backend/src/messages/threads.spec.ts` (thread-identity unit tests)

**Interfaces:**
- Consumes: `PrismaService`, `StorageService`, the request user (`req.user`), existing `MessageDto` shape + attachment upload helper.
- Produces (HTTP, all under the existing controller, `JwtAuthGuard`):
  - `GET /conversations` → `Conversation[]` = `{ kind: 'saved'|'dm'|'case', key: string, title: string, lastText: string|null, lastAt: string|null, unread: number }` (saved first, then by `lastAt` desc).
  - `GET /dm/:userId/messages` → `MessageDto[]`; `POST /dm/:userId/messages` (multipart `text?`, `files?` ≤3) → `MessageDto`.
  - `GET /saved/messages` → `MessageDto[]`; `POST /saved/messages` (multipart) → `MessageDto`.
  - `POST /messages/:id/save-to-saved` → `MessageDto` (the copy in the caller's saved thread).

- [ ] **Step 1: Write thread-identity unit tests (pure helpers)**

Create `apps/backend/src/messages/threads.spec.ts`. First, in `messages.module.ts`, export two pure helpers (add them near the top, exported):
```ts
export const dmPairKey = (a: string, b: string) => [a, b].sort().join(':');
export const dmWhere = (me: string, other: string) => ({
  caseId: null,
  OR: [
    { senderId: me, toUserId: other },
    { senderId: other, toUserId: me },
  ],
});
export const savedWhere = (me: string) => ({ caseId: null, senderId: me, toUserId: me });
```
Test:
```ts
import { dmPairKey, dmWhere, savedWhere } from './messages.module';

describe('message threads', () => {
  it('dm pair key is order-independent', () => {
    expect(dmPairKey('a', 'b')).toBe(dmPairKey('b', 'a'));
  });
  it('dm where matches both directions and excludes case messages', () => {
    const w = dmWhere('me', 'you') as any;
    expect(w.caseId).toBeNull();
    expect(w.OR).toEqual([
      { senderId: 'me', toUserId: 'you' },
      { senderId: 'you', toUserId: 'me' },
    ]);
  });
  it('saved where is self-to-self with no case', () => {
    expect(savedWhere('me')).toEqual({ caseId: null, senderId: 'me', toUserId: 'me' });
  });
});
```

- [ ] **Step 2: Run the test — verify it fails**

```bash
cd "C:/Users/Administrator/Desktop/credit-core/apps/backend" && npx jest threads 2>&1 | tail -10
```
Expected: FAIL (helpers not exported yet / file imports undefined).

- [ ] **Step 3: Implement the helpers + endpoints**

Add the three exported helpers (Step 1). Then add the endpoints, reusing the existing attachment-upload routine the case `POST /cases/:id/messages` already uses (extract it into a private `createMessage({ senderId, caseId, toUserId, text, files })` returning a `MessageDto`, and have the case route call it too — DRY). Key logic:
- **DM send** (`POST /dm/:userId/messages`): `createMessage({ senderId: me, caseId: null, toUserId: params.userId, text, files })`; store attachments under `dm/${dmPairKey(me, other)}/`.
- **Saved send** (`POST /saved/messages`): `createMessage({ senderId: me, caseId: null, toUserId: me, text, files })`; store under `saved/${me}/`.
- **DM/saved list**: `prisma.message.findMany({ where: dmWhere(me, other) | savedWhere(me), include: { attachments: true, sender: true }, orderBy: { createdAt: 'asc' } })` mapped to `MessageDto`; mark read by appending `me` to `readBy` (reuse existing read-marking helper).
- **save-to-saved** (`POST /messages/:id/save-to-saved`): load the source message (404 if not found); authorise via the existing `visibleTo(message, me)` check (reject 403 if not visible); copy its `text` + each attachment `Document` (copy the stored file via `StorageService` into `saved/${me}/`, create new `Document` rows) into a new self-message (`createMessage`), return it.
- **conversations** (`GET /conversations`): build the list = `[saved]` + DM peers (distinct other-user from messages where `caseId IS NULL` and `me` is sender or recipient) + case-chats (reuse the existing `unread-by-case` query). For each: last message text/time + unread count (messages not containing `me` in `readBy`, not sent by `me`). Sort: saved first, then by `lastAt` desc.

- [ ] **Step 4: Run unit tests + typecheck**

```bash
cd "C:/Users/Administrator/Desktop/credit-core/apps/backend"
npx jest 2>&1 | tail -8
npx tsc --noEmit 2>&1 | tail -5
```
Expected: all jest suites pass (threads + existing); tsc clean.

- [ ] **Step 5: Manual API smoke (dev backend running)**

With the app running, get a JWT (login), then:
```bash
# replace TOKEN + USERID
curl -s -X POST http://localhost:3000/api/saved/messages -H "Authorization: Bearer TOKEN" -F "text=salom o'zimga" | head -c 200; echo
curl -s http://localhost:3000/api/conversations -H "Authorization: Bearer TOKEN" | head -c 300; echo
```
Expected: saved message returns a MessageDto; conversations includes the `saved` entry first.

- [ ] **Step 6: Commit**

```bash
cd "C:/Users/Administrator/Desktop/credit-core"
git add apps/backend/src/messages
git commit -m "feat(messages): conversations + DM + saved threads + save-to-saved"
```

### Task A3: Shared MessageThread component (refactor from CaseChat)

**Files:**
- Create: `packages/ui/src/components/MessageThread.tsx`
- Modify: `packages/ui/src/components/CaseChat.tsx` (use MessageThread; keep behaviour identical)
- Modify: `packages/api-client/src/index.ts` (add `listDm/sendDm/listSaved/sendSaved/listConversations/saveToSaved`)

**Interfaces:**
- Produces: `<MessageThread messages={MessageDto[]} onSend={(text, files) => Promise<void>} onSaveToSaved?={(id)=>Promise<void>} onEdit?/onDelete? targetSelector?={ReactNode} loading?={boolean} />` — the bubble list + composer + attachment rendering, extracted verbatim from CaseChat's current render so case-chat is unchanged.

- [ ] **Step 1: Extract the presentational thread from CaseChat**

Create `MessageThread.tsx` containing the message-list rendering (bubbles, image grid, file rows, read receipts, edit-inline, delete-confirm) and the composer (text input + file picker, max 3) currently in `CaseChat.tsx` (~lines 100–311). It takes data + callbacks via props (above); it owns NO data fetching. Keep all existing Uzbek labels and styles.

- [ ] **Step 2: Make CaseChat consume MessageThread**

`CaseChat.tsx` keeps its case-scoped data fetching/polling + the directory target selector, and renders `<MessageThread ... targetSelector={<existing selector/>} onSend={sendToCase} ... />`. Behaviour must be identical to before.

- [ ] **Step 3: api-client methods**

Add to `packages/api-client/src/index.ts`:
```ts
listConversations: () => http.get('/conversations').then(r => r.data),
listDm: (userId: string) => http.get(`/dm/${userId}/messages`).then(r => r.data),
sendDm: (userId: string, form: FormData) => http.post(`/dm/${userId}/messages`, form).then(r => r.data),
listSaved: () => http.get('/saved/messages').then(r => r.data),
sendSaved: (form: FormData) => http.post('/saved/messages', form).then(r => r.data),
saveToSaved: (msgId: string) => http.post(`/messages/${msgId}/save-to-saved`).then(r => r.data),
```
(Match the existing `http` axios instance + the existing case-message method signatures for FormData.)

- [ ] **Step 4: Typecheck + manual (regression)**

```bash
cd "C:/Users/Administrator/Desktop/credit-core" && npx tsc --noEmit -p packages/ui/tsconfig.json 2>&1 | tail -5
```
Manual: open a case → chat tab → send text + image + file, edit, delete, target a user/role — all behave exactly as before the refactor.

- [ ] **Step 5: Commit**

```bash
git add packages/ui/src/components/MessageThread.tsx packages/ui/src/components/CaseChat.tsx packages/api-client/src/index.ts
git commit -m "refactor(chat): extract shared MessageThread; keep case-chat identical"
```

### Task A4: ChatsPage two-pane messenger (inbox + threads + new DM + save)

**Files:**
- Modify: `packages/ui/src/pages/ChatsPage.tsx` (full redesign into two-pane messenger)

**Interfaces:**
- Consumes: `api.listConversations/listDm/sendDm/listSaved/sendSaved/saveToSaved`, the existing `GET /directory` search, and `<MessageThread>` (Task A3).

> Apply **ui-ux-pro-max**. Acceptance spec:

- [ ] **Step 1: Two-pane layout + conversation list**

`ChatsPage` becomes: left pane = a search box + the conversation list from `listConversations()` (📌 "Saqlangan xabarlar" pinned first, then DMs + case-chats, each row: title, last-message preview, time, unread badge); right pane = the selected thread. Poll `listConversations` every 8s (match existing chat polling). On narrow screens, show list OR thread (back button).

- [ ] **Step 2: Thread panes via MessageThread**

- Saved selected → `<MessageThread messages={listSaved()} onSend={(t,f)=>sendSaved(form)} />`.
- DM selected (peer userId) → `<MessageThread messages={listDm(userId)} onSend={(t,f)=>sendDm(userId, form)} onSaveToSaved={saveToSaved} />`.
- Case selected → navigate to the case chat (reuse existing `/cases/:id` chat) OR render its messages read-only here; simplest: clicking a case row routes to the case view's chat. (Pick routing to avoid duplicating case logic.)
Build `FormData` (`text`, `files[]`) the same way CaseChat does.

- [ ] **Step 3: New DM via directory**

A "+" button opens the existing directory search (`GET /directory?q=`); selecting a user opens/creates the DM thread (set selected = that peer; the first `sendDm` creates it server-side).

- [ ] **Step 4: Save-to-saved action**

`MessageThread` already exposes `onSaveToSaved` (Task A3); wire it in DM (and case, if rendered here) threads so any message can be copied to Saved with a toast "Saqlanganlarga qo'shildi".

- [ ] **Step 5: Typecheck + manual**

```bash
cd "C:/Users/Administrator/Desktop/credit-core" && npx tsc --noEmit -p packages/ui/tsconfig.json 2>&1 | tail -5
```
Manual (two browser logins, e.g. operator + moderator): operator opens Chats → Saved pinned top; post text+image to Saved; "+" → pick moderator → send a DM; moderator sees the DM in their inbox with unread badge and replies; operator uses "Saqlanganlarga qo'shish" on a DM message → it appears in Saved. Case rows still open the case chat.

- [ ] **Step 6: Build all web apps (final regression) + commit**

```bash
cd "C:/Users/Administrator/Desktop/credit-core" && npm run build 2>&1 | tail -8
git add packages/ui/src/pages/ChatsPage.tsx
git commit -m "feat(chat): Telegram-style unified inbox (DM + Saved Messages)"
```

---

## Self-Review notes

- **Spec coverage:** B (copy-both = B1, phone = B2); C (admin-submit = C1, action-panel polish = C2); D (attachment redesign = D1); A (caseId nullable = A1, backend conversations/DM/saved/save-to-saved = A2, shared thread = A3, inbox UI = A4). The "keep case-chat unchanged" constraint is enforced in A3 Step 2 + A4 Step 2. The only schema change (Message.caseId nullable + toUserId index) is A1.
- **Placeholder scan:** UI tasks (C2/D1/A3/A4) are acceptance-spec'd with concrete component shapes, key JSX, exact handlers/endpoints, and verification — not "polish it"; ui-ux-pro-max drives only the visual finish. No TBD/TODO.
- **Type consistency:** `MessageThread` prop shape in A3 matches its consumers in A4; api-client method names (`listConversations/listDm/sendDm/listSaved/sendSaved/saveToSaved`) are identical across A2 (HTTP), A3 (added), A4 (used); helper names `dmPairKey/dmWhere/savedWhere` consistent A2↔tests.
- **Branch/DB:** Task 0 isolates the branch; A1 resets the dev DB so the branch's migration history is clean (no SP-1 dependency).
