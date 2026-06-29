# SP-6 Document Generation — First Slice Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the app actually produce visible PDF documents — a "Hujjatlar" panel on the case view that renders 3 real documents (contract, petition, credit application) from case data, watermarked "TASDIQLANMAGAN" until the director approves.

**Architecture:** Extend the existing pdfmake-based `PdfService`. Add a case loader that pulls the SP-1 relations, a small document-template registry (one pdfmake builder per document), a watermark applied by case status, two new all-roles endpoints under `/cases/:id/documents`, and a frontend panel. A persistent demo case is seeded so the documents render with real data.

**Tech Stack:** NestJS + Prisma 6 + MySQL (docker 3307), pdfmake (Roboto fonts, Cyrillic+Latin), React + Vite (packages/ui), Jest + ts-jest.

## Global Constraints

- **Spec:** `docs/superpowers/specs/2026-06-29-sp6-document-generation-design.md`. Document inputs: `docs/analysis/2026-06-29-mko-workbook-analysis.md` §4.
- **Branch:** new branch `feat/sp6-document-generation` off the CURRENT branch `feat/mko-workbook-sp1-spec` (it has SP-1; the dev DB already has SP-1 applied). Task 0.
- **First slice only:** documents `contract`, `petition`, `creditApplication`. The payment-schedule + scoring-report + remaining documents are DEFERRED (schedule/scoring need the SP-4/SP-5 engines' computed data).
- **Watermark:** "TASDIQLANMAGAN" when `status ∈ {MODERATION, DIRECTOR_REVIEW}`; "RAD ETILGAN"/"BEKOR QILINGAN" for REJECTED/CANCELLED; **clean** for ADMIN_FINALIZE/FINALIZED; documents are **unavailable (409) in DRAFT**.
- **Roles:** the new document endpoints allow ALL roles (operator/moderator/director/admin). The existing `OutputController` (ADMIN-only valuation act) is unchanged.
- **Transient:** render on demand, do not store the generated PDFs.
- **Prisma commands** (Task 2 seed only) need the engine env vars first AND the dev backend stopped (Windows locks the engine `.node`):
  ```bash
  export CHECKPOINT_DISABLE=1
  export PRISMA_QUERY_ENGINE_LIBRARY="C:/Users/Administrator/Desktop/credit-core/node_modules/@prisma/engines/query_engine-windows.dll.node"
  export PRISMA_SCHEMA_ENGINE_BINARY="C:/Users/Administrator/Desktop/credit-core/node_modules/@prisma/engines/schema-engine-windows.exe"
  ```
  Dev DB: `mysql://root:root@localhost:3307/credit_core`. UI verify = `tsc --noEmit` + build (not screenshots). Uzbek labels. Never `git add -A` (unrelated `packages/ui` edits exist) — add only named files.

---

### Task 0: Branch setup

- [ ] **Step 1: Branch off the SP-1 branch**

```bash
cd "C:/Users/Administrator/Desktop/credit-core"
git checkout feat/mko-workbook-sp1-spec
git checkout -b feat/sp6-document-generation
cd apps/backend && npm test 2>&1 | tail -5
```
Expected: on `feat/sp6-document-generation`; existing tests pass.

---

### Task 1: SP-2 — date→Uzbek-words helper

**Files:**
- Modify: `apps/backend/src/common/sum-to-words.util.ts`
- Test: `apps/backend/src/common/sum-to-words.spec.ts`

**Interfaces:**
- Produces: `dateToUzbekWords(d: Date): string` → e.g. `"25 iyun 2026 yil"` (UTC-based, matches stored Prisma DateTimes). `sumToWordsUz`/`integerToUzbekWords` already exist and are reused by templates.

- [ ] **Step 1: Write the failing test**

Append to `sum-to-words.spec.ts`:
```ts
import { dateToUzbekWords } from './sum-to-words.util';

describe('dateToUzbekWords', () => {
  it('formats a date as Uzbek words (UTC)', () => {
    expect(dateToUzbekWords(new Date('2026-06-25T00:00:00Z'))).toBe('25 iyun 2026 yil');
  });
  it('handles January', () => {
    expect(dateToUzbekWords(new Date('2026-01-01T00:00:00Z'))).toBe('1 yanvar 2026 yil');
  });
});
```

- [ ] **Step 2: Run it — verify it fails**

```bash
cd "C:/Users/Administrator/Desktop/credit-core/apps/backend" && npx jest sum-to-words 2>&1 | tail -10
```
Expected: FAIL (`dateToUzbekWords` is not exported).

- [ ] **Step 3: Implement**

Append to `sum-to-words.util.ts`:
```ts
const UZ_MONTHS = [
  'yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun',
  'iyul', 'avgust', 'sentabr', 'oktabr', 'noyabr', 'dekabr',
];

/** Format a date as Uzbek words, e.g. 2026-06-25 → "25 iyun 2026 yil" (UTC-based). */
export function dateToUzbekWords(d: Date): string {
  return `${d.getUTCDate()} ${UZ_MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()} yil`;
}
```

- [ ] **Step 4: Run it — verify it passes**

```bash
cd "C:/Users/Administrator/Desktop/credit-core/apps/backend" && npx jest sum-to-words 2>&1 | tail -8
```
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
cd "C:/Users/Administrator/Desktop/credit-core"
git add apps/backend/src/common/sum-to-words.util.ts apps/backend/src/common/sum-to-words.spec.ts
git commit -m "feat(common): dateToUzbekWords helper (SP-2)"
```

---

### Task 2: Persistent demo case seed

**Files:**
- Create: `apps/backend/prisma/seed-demo.ts`
- Modify: `apps/backend/package.json` (add a `db:seed:demo` script)

**Interfaces:**
- Produces: a persistent `CreditCase` with `number = 'DEMO-1199-TR'`, status `MODERATION` (so documents are available + watermarked), fully populated with the SP-1 relations, owned by the seeded `operator` in branch `BR`. Re-runnable (deletes the prior DEMO case first).

- [ ] **Step 1: Write the seed script**

Create `apps/backend/prisma/seed-demo.ts`:
```ts
import { PrismaClient, ProductType, Gender, LoanType, RepaymentMethod, ScoringVerdict, CaseStatus } from '@prisma/client';

const prisma = new PrismaClient();
const DEMO_NUMBER = 'DEMO-1199-TR';

async function main() {
  await prisma.creditCase.deleteMany({ where: { number: DEMO_NUMBER } });

  await prisma.organization.upsert({
    where: { id: 'default' },
    update: {},
    create: {
      id: 'default',
      nameMixed: 'МЧЖ «CLEVER Mikromoliya Tashkiloti»',
      nameUpper: 'МЧЖ «CLEVER MIKROMOLIYA TASHKILOTI»',
      nameSuffix: '«CLEVER MIKROMOLIYA TASHKILOTI» МЧЖ',
      directorShort: 'Б.Исмоилов',
      directorFull: 'Исмоилов Баҳромжон Ахрор ўғли',
      address: 'Тошкент шахар, Олмазор тумани, Сагбон 30 берк кўча, 6 уй',
      bankAccount: '20216000105068380006',
      bankMfo: '01183',
      bankName: 'АЖ «ANORBANK»',
      inn: '306365847',
      licenseNo: '61',
      licenseDate: new Date('2019-06-22T00:00:00Z'),
    },
  });

  const operator = await prisma.user.findUniqueOrThrow({ where: { login: 'operator' } });
  const branch = await prisma.branch.findUniqueOrThrow({ where: { symbol: 'BR' } });

  await prisma.creditCase.create({
    data: {
      number: DEMO_NUMBER,
      productType: ProductType.REAL_ESTATE,
      status: CaseStatus.MODERATION,
      amount: '150000000',
      termMonths: 60,
      branchId: branch.id,
      createdById: operator.id,
      borrower: {
        create: {
          fullName: 'TADJIYEV ATABEK JANGIROVICH',
          gender: Gender.MALE,
          citizenship: 'Ўзбекистон Республикаси',
          placeOfBirth: "TO'RTKO'L SHAHRI",
          birthDate: new Date('1979-06-24T00:00:00Z'),
          pinfl: '32406793420044',
          passportSeries: 'KA',
          passportNumber: '1191531',
          passportIssuer: "QORAQALPOG'ISTON RESPUBLIKASI TO'RTKO'L TUMANI IIB",
          passportExpiry: new Date('2028-08-07T00:00:00Z'),
          regAddress: "QORAQALPOG'ISTON RESPUBLIKASI TO'RTKO'L TUMANI TINCHLIK MFY ERKIN KO'CHASI 33-UY",
          phones: [{ number: '91-269-79-00', owner: 'OZI' }],
          maritalStatus: 'турмуш курган',
          familySize: 5,
          childrenCount: 3,
          education: 'олий',
        },
      },
      affordability: { create: { avgMonthlyIncome: '18838000', dtiRatio: 0.4545, surplus: '8336647', netAfterDebt: '10275647' } },
      creditHistory: { create: { repaidLoansCount: 2, activeLoansCount: 0, overdueSubstandardFlag: 0, otherObligations: 0, totalOutstandingDebt: '4654239', avgMonthlyPaymentExisting: '502353', committeeProtocolRef: '73-2020' } },
      scoring: {
        create: {
          totalScore: 77, maxScore: 100, verdict: ScoringVerdict.APPROVED, age: 47,
          factors: { create: [{ factorNo: 19, name: 'Транш/доход', points: 22, maxPoints: 22 }] },
        },
      },
      incomeCertificate: { create: { employer: 'XususiyTadbirkor', certNo: 'SPR-1', certDate: new Date('2026-06-20T00:00:00Z'), avgMonthlyNet: '18838000' } },
      creditLine: {
        create: {
          lineNumber: '№ 1199 TR', loanType: LoanType.MICROCREDIT,
          amountAuto: '90000000', amountPolis: '60000000', amountTotal: '150000000',
          termMonths: 60, lineDate: new Date('2026-06-25T00:00:00Z'), interestRate: '0.5500', penaltyRate: '1.0500', orderNumber: '1881 MFL 1199 TR',
          insurance: { create: { insured: true, company: 'АО "TRUST INSURANCE"', policyTermMonths: 24, loanUnderPolicy: '60000000', insuredSum: '78000000', insuranceRate: '0.0200', premium: '3120000' } },
          tranches: { create: [{ trancheNo: 1, applicationNo: '№ 1881 MFL 1199 TR', applicationDate: new Date('2026-06-25T00:00:00Z'), principal: '130000000', termMonths: 30, scheduleType: RepaymentMethod.ANNUITY, monthlyPayment: '8060000', insurancePayment: '3120000' }] },
        },
      },
      collaterals: {
        create: [{
          type: ProductType.REAL_ESTATE, agreedValue: '126000000', position: 1,
          address: "QORAQALPOG'ISTON RESPUBLIKASI TO'RTKO'L TUMANI", propertyType: 'YAKKA TARTIBDAGI TURAR JOY',
          cadastreNo: '35:04:...', totalAreaM2: 120.5, livingAreaM2: 85, roomCount: 4,
          owners: { create: [{ fullName: 'TADJIYEV ATABEK JANGIROVICH', isBorrowerOwner: true, sharePercent: 100 }] },
        }],
      },
    },
  });

  // eslint-disable-next-line no-console
  console.log('✅ Demo case seeded:', DEMO_NUMBER, '(status MODERATION — documents available + watermarked)');
}

main().then(() => prisma.$disconnect()).catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
```

- [ ] **Step 2: Add the script to package.json**

In `apps/backend/package.json` `scripts`, add:
```json
"db:seed:demo": "ts-node prisma/seed-demo.ts",
```

- [ ] **Step 3: Run it (dev backend stopped, env vars set)**

```bash
# stop any running backend (engine lock):
powershell -NoProfile -Command "Get-CimInstance Win32_Process -Filter \"Name='node.exe'\" | Where-Object { \$_.CommandLine -match 'apps..backend..dist..src..main|nest start|concurrently|vite' } | ForEach-Object { Stop-Process -Id \$_.ProcessId -Force -ErrorAction SilentlyContinue }"
cd "C:/Users/Administrator/Desktop/credit-core/apps/backend"
export CHECKPOINT_DISABLE=1
export PRISMA_QUERY_ENGINE_LIBRARY="C:/Users/Administrator/Desktop/credit-core/node_modules/@prisma/engines/query_engine-windows.dll.node"
npx prisma db seed 2>&1 | tail -3   # ensure base seed (operator/BR) exists
npm run db:seed:demo 2>&1 | tail -3
```
Expected: `✅ Demo case seeded: DEMO-1199-TR ...`. Verify: `docker exec credit-core-mysql mysql -uroot -proot -N -e "SELECT number,status FROM credit_core.CreditCase WHERE number='DEMO-1199-TR';"` → `DEMO-1199-TR MODERATION`.

- [ ] **Step 4: Commit**

```bash
cd "C:/Users/Administrator/Desktop/credit-core"
git add apps/backend/prisma/seed-demo.ts apps/backend/package.json
git commit -m "feat(seed): persistent DEMO case with full SP-1 data for document rendering"
```

---

### Task 3: Document infra — loader, layout helpers, watermark, render

**Files:**
- Create: `apps/backend/src/output/documents/case-document.loader.ts`
- Create: `apps/backend/src/output/documents/doc-layout.ts`
- Modify: `apps/backend/src/output/pdf.service.ts` (add a generic `render(def)` method)

**Interfaces:**
- Produces:
  - `loadCaseForDocs(prisma, id): Promise<CaseDocData | null>` — case + all SP-1 relations + `organization`.
  - `type CaseDocData` (the loaded shape).
  - `watermarkForStatus(status: string): string | null`.
  - `money(n): string`, `kv(label, val): [..]` layout helpers, `orgHeader(org): Content`.
  - `PdfService.render(def: TDocumentDefinitions): Promise<Buffer>`.

- [ ] **Step 1: Add a generic render method to PdfService**

In `apps/backend/src/output/pdf.service.ts`, add a public method (reuse the existing `this.printer`):
```ts
  /** Render any pdfmake document definition to a Buffer. */
  async render(def: import('pdfmake/interfaces').TDocumentDefinitions): Promise<Buffer> {
    const pdfDoc = this.printer.createPdfKitDocument(def);
    return new Promise<Buffer>((resolve, reject) => {
      const chunks: Buffer[] = [];
      pdfDoc.on('data', (d: Buffer) => chunks.push(d));
      pdfDoc.on('end', () => resolve(Buffer.concat(chunks)));
      pdfDoc.on('error', reject);
      pdfDoc.end();
    });
  }
```

- [ ] **Step 2: Write the loader**

Create `apps/backend/src/output/documents/case-document.loader.ts`:
```ts
import { PrismaService } from '../../prisma/prisma.service';

export async function loadCaseForDocs(prisma: PrismaService, id: string) {
  const c = await prisma.creditCase.findUnique({
    where: { id },
    include: {
      branch: true,
      borrower: true,
      collaterals: { include: { owners: true } },
      creditLine: { include: { tranches: { orderBy: { trancheNo: 'asc' } }, insurance: true } },
      affordability: true,
      creditHistory: true,
      scoring: { include: { factors: true } },
      incomeCertificate: { include: { months: true } },
    },
  });
  if (!c) return null;
  const organization = await prisma.organization.findUnique({ where: { id: 'default' } });
  return { ...c, organization };
}

export type CaseDocData = NonNullable<Awaited<ReturnType<typeof loadCaseForDocs>>>;
```

- [ ] **Step 3: Write layout helpers + watermark**

Create `apps/backend/src/output/documents/doc-layout.ts`:
```ts
import type { Content, TableCell } from 'pdfmake/interfaces';
import type { CaseDocData } from './case-document.loader';

const WATERMARK = new Set(['MODERATION', 'DIRECTOR_REVIEW']);

/** Diagonal watermark text for a status, or null when the clean (approved) version applies. */
export function watermarkForStatus(status: string): string | null {
  if (status === 'REJECTED') return 'RAD ETILGAN';
  if (status === 'CANCELLED') return 'BEKOR QILINGAN';
  return WATERMARK.has(status) ? 'TASDIQLANMAGAN' : null;
}

export const money = (n: unknown): string =>
  n == null ? '—' : new Intl.NumberFormat('ru-RU').format(Number(n)) + " so'm";

/** A two-column label/value row for a pdfmake table body. */
export const kv = (label: string, val: string): TableCell[] => [
  { text: label, bold: true, margin: [0, 2, 0, 2] },
  { text: val || '—', margin: [0, 2, 0, 2] },
];

/** Org letterhead block from the Organization record. */
export function orgHeader(org: CaseDocData['organization']): Content {
  return {
    stack: [
      { text: org?.nameUpper ?? 'МКО', bold: true, fontSize: 11 },
      { text: org?.address ?? '', fontSize: 8, color: '#555' },
      { text: [org?.bankName, org?.bankAccount].filter(Boolean).join(' · '), fontSize: 8, color: '#555' },
    ],
    margin: [0, 0, 0, 12],
  };
}
```

- [ ] **Step 4: Typecheck**

```bash
cd "C:/Users/Administrator/Desktop/credit-core/apps/backend" && npx tsc --noEmit 2>&1 | tail -6
```
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
cd "C:/Users/Administrator/Desktop/credit-core"
git add apps/backend/src/output/pdf.service.ts apps/backend/src/output/documents/case-document.loader.ts apps/backend/src/output/documents/doc-layout.ts
git commit -m "feat(output): doc loader, layout helpers, watermark, generic render"
```

---

### Task 4: Document templates + registry

**Files:**
- Create: `apps/backend/src/output/documents/templates/contract.ts`
- Create: `apps/backend/src/output/documents/templates/petition.ts`
- Create: `apps/backend/src/output/documents/templates/credit-application.ts`
- Create: `apps/backend/src/output/documents/registry.ts`
- Test: `apps/backend/src/output/documents/registry.spec.ts`

**Interfaces:**
- Produces: `type DocTemplate = (c: CaseDocData) => TDocumentDefinitions`; `DOC_REGISTRY: Record<string, { title: string; lang: 'uz'|'ru'; build: DocTemplate }>` with keys `contract`, `petition`, `creditApplication`.

- [ ] **Step 1: contract template**

Create `templates/contract.ts`:
```ts
import type { TDocumentDefinitions } from 'pdfmake/interfaces';
import { sumToWordsUz, dateToUzbekWords } from '../../../common/sum-to-words.util';
import { CaseDocData } from '../case-document.loader';
import { orgHeader, kv, money } from '../doc-layout';

export function contractTemplate(c: CaseDocData): TDocumentDefinitions {
  const line = c.creditLine;
  const tr = line?.tranches?.[0];
  const b = c.borrower;
  const amount = Number(tr?.principal ?? line?.amountTotal ?? c.amount ?? 0);
  return {
    defaultStyle: { font: 'Roboto', fontSize: 10 },
    pageMargins: [40, 50, 40, 50],
    content: [
      orgHeader(c.organization),
      { text: 'MIKROQARZ SHARTNOMASI', style: 'h1', alignment: 'center' },
      { text: `${line?.lineNumber ?? c.number}`, alignment: 'center', margin: [0, 0, 0, 4] },
      { text: line?.lineDate ? `Toshkent sh., ${dateToUzbekWords(line.lineDate)}` : '', alignment: 'center', margin: [0, 0, 0, 14] },
      { text: [c.organization?.nameMixed, ' (bundan keyin — "MMT") va ', b?.fullName, ' (bundan keyin — "Qarz oluvchi") quyidagilar haqida ushbu shartnomani tuzdilar:'].join(''), margin: [0, 0, 0, 10] },
      { text: '1. SHARTNOMA PREDMETI', style: 'h2' },
      { table: { widths: [180, '*'], body: [
        kv('Mikroqarz summasi', money(amount)),
        kv('Summa (so\'z bilan)', amount ? sumToWordsUz(amount) : '—'),
        kv('Muddati', tr?.termMonths != null ? `${tr.termMonths} oy` : (line?.termMonths != null ? `${line.termMonths} oy` : '—')),
        kv('Yillik foiz stavkasi', line?.interestRate != null ? `${Number(line.interestRate) * 100}%` : '—'),
        kv('Muddati o\'tgan uchun', line?.penaltyRate != null ? `${Number(line.penaltyRate) * 100}%` : '—'),
        kv('To\'lov turi', tr?.scheduleType === 'DIFFERENTIATED' ? 'differensial' : 'annuitet'),
      ] } },
      { text: '2. TA\'MINOT (GAROV)', style: 'h2' },
      { table: { widths: [180, '*'], body: c.collaterals.flatMap((col) => [
        kv(col.type === 'AUTO' ? 'Avtotransport' : 'Ko\'chmas mulk', col.type === 'AUTO' ? (col.model ?? '—') : (col.address ?? '—')),
        kv('Kelishilgan qiymati', money(col.agreedValue)),
      ]) } },
      { text: '3. TOMONLAR REKVIZITLARI', style: 'h2' },
      { columns: [
        { width: '*', stack: [{ text: 'MMT:', bold: true }, { text: c.organization?.nameMixed ?? '—' }, { text: `h/r ${c.organization?.bankAccount ?? '—'}` }, { text: `MFO ${c.organization?.bankMfo ?? '—'}` }, { text: '\n\n_______________ (imzo)' }] },
        { width: '*', stack: [{ text: 'Qarz oluvchi:', bold: true }, { text: b?.fullName ?? '—' }, { text: `Pasport: ${[b?.passportSeries, b?.passportNumber].filter(Boolean).join(' ') || '—'}` }, { text: `JSHSHIR: ${b?.pinfl ?? '—'}` }, { text: '\n\n_______________ (imzo)' }] },
      ], margin: [0, 6, 0, 0] },
    ],
    styles: { h1: { fontSize: 15, bold: true, margin: [0, 0, 0, 6] }, h2: { fontSize: 12, bold: true, margin: [0, 12, 0, 6] } },
  };
}
```

- [ ] **Step 2: petition template**

Create `templates/petition.ts`:
```ts
import type { TDocumentDefinitions } from 'pdfmake/interfaces';
import { dateToUzbekWords, sumToWordsUz } from '../../../common/sum-to-words.util';
import { CaseDocData } from '../case-document.loader';
import { orgHeader, kv, money } from '../doc-layout';

export function petitionTemplate(c: CaseDocData): TDocumentDefinitions {
  const line = c.creditLine;
  const amount = Number(line?.amountTotal ?? c.amount ?? 0);
  return {
    defaultStyle: { font: 'Roboto', fontSize: 10 },
    pageMargins: [40, 50, 40, 50],
    content: [
      orgHeader(c.organization),
      { text: `${c.organization?.directorFull ?? 'Ijrochi direktor'}ga`, alignment: 'right', margin: [0, 0, 0, 12] },
      { text: 'MIKROMOLIYA LINIYASINI OCHISH TO\'G\'RISIDA XODATAINOMA', style: 'h1', alignment: 'center', margin: [0, 0, 0, 14] },
      { text: `Qarz oluvchi ${c.borrower?.fullName ?? '—'} uchun quyidagi shartlarda mikromoliya liniyasini ochishni so'rayman:`, margin: [0, 0, 0, 8] },
      { table: { widths: [180, '*'], body: [
        kv('Liniya raqami', line?.lineNumber ?? '—'),
        kv('Summa', money(amount)),
        kv('Summa (so\'z bilan)', amount ? sumToWordsUz(amount) : '—'),
        kv('Muddati', line?.termMonths != null ? `${line.termMonths} oy` : '—'),
        kv('Filial', c.branch ? `${c.branch.name} (${c.branch.symbol})` : '—'),
      ] } },
      { text: line?.lineDate ? `Sana: ${dateToUzbekWords(line.lineDate)}` : '', margin: [0, 24, 0, 0] },
      { text: '\nKredit menejeri: _______________', margin: [0, 12, 0, 0] },
    ],
    styles: { h1: { fontSize: 13, bold: true } },
  };
}
```

- [ ] **Step 3: credit-application template**

Create `templates/credit-application.ts`:
```ts
import type { TDocumentDefinitions } from 'pdfmake/interfaces';
import { dateToUzbekWords } from '../../../common/sum-to-words.util';
import { CaseDocData } from '../case-document.loader';
import { orgHeader, kv, money } from '../doc-layout';

export function creditApplicationTemplate(c: CaseDocData): TDocumentDefinitions {
  const line = c.creditLine;
  const tr = line?.tranches?.[0];
  const b = c.borrower;
  return {
    defaultStyle: { font: 'Roboto', fontSize: 10 },
    pageMargins: [40, 50, 40, 50],
    content: [
      orgHeader(c.organization),
      { text: 'KREDIT ARIZASI', style: 'h1', alignment: 'center', margin: [0, 0, 0, 14] },
      { table: { widths: [180, '*'], body: [
        kv('F.I.SH.', b?.fullName ?? '—'),
        kv('Pasport', [b?.passportSeries, b?.passportNumber].filter(Boolean).join(' ') || '—'),
        kv('JSHSHIR', b?.pinfl ?? '—'),
        kv('Manzil', b?.regAddress ?? b?.address ?? '—'),
        kv('Telefon', Array.isArray(b?.phones) && b!.phones.length ? String((b!.phones as any[])[0]?.number ?? '—') : '—'),
        kv('So\'ralayotgan summa', money(tr?.principal ?? line?.amountTotal)),
        kv('Muddati', tr?.termMonths != null ? `${tr.termMonths} oy` : '—'),
        kv('Ariza raqami', tr?.applicationNo ?? '—'),
        kv('Ariza sanasi', tr?.applicationDate ? dateToUzbekWords(tr.applicationDate) : '—'),
      ] } },
      { text: 'Men yuqoridagi ma\'lumotlarning to\'g\'riligini tasdiqlayman.', margin: [0, 16, 0, 0] },
      { text: '\nImzo: _______________', margin: [0, 12, 0, 0] },
    ],
    styles: { h1: { fontSize: 14, bold: true } },
  };
}
```

- [ ] **Step 4: registry + its test (write test first)**

Create `registry.spec.ts`:
```ts
import { DOC_REGISTRY } from './registry';

describe('DOC_REGISTRY', () => {
  it('exposes the first-slice documents with metadata', () => {
    expect(Object.keys(DOC_REGISTRY).sort()).toEqual(['contract', 'creditApplication', 'petition']);
    for (const key of Object.keys(DOC_REGISTRY)) {
      const d = DOC_REGISTRY[key];
      expect(typeof d.title).toBe('string');
      expect(['uz', 'ru']).toContain(d.lang);
      expect(typeof d.build).toBe('function');
    }
  });
});
```
Run it — fails (no registry):
```bash
cd "C:/Users/Administrator/Desktop/credit-core/apps/backend" && npx jest registry 2>&1 | tail -8
```

- [ ] **Step 5: implement registry**

Create `registry.ts`:
```ts
import type { TDocumentDefinitions } from 'pdfmake/interfaces';
import { CaseDocData } from './case-document.loader';
import { contractTemplate } from './templates/contract';
import { petitionTemplate } from './templates/petition';
import { creditApplicationTemplate } from './templates/credit-application';

export type DocTemplate = (c: CaseDocData) => TDocumentDefinitions;

export const DOC_REGISTRY: Record<string, { title: string; lang: 'uz' | 'ru'; build: DocTemplate }> = {
  contract: { title: 'Mikroqarz shartnomasi', lang: 'uz', build: contractTemplate },
  petition: { title: 'Xodatainoma', lang: 'uz', build: petitionTemplate },
  creditApplication: { title: 'Kredit arizasi', lang: 'uz', build: creditApplicationTemplate },
};
```

- [ ] **Step 6: run tests + typecheck**

```bash
cd "C:/Users/Administrator/Desktop/credit-core/apps/backend"
npx jest registry 2>&1 | tail -6
npx tsc --noEmit 2>&1 | tail -6
```
Expected: registry test passes; tsc clean.

- [ ] **Step 7: Commit**

```bash
cd "C:/Users/Administrator/Desktop/credit-core"
git add apps/backend/src/output/documents/templates apps/backend/src/output/documents/registry.ts apps/backend/src/output/documents/registry.spec.ts
git commit -m "feat(output): contract/petition/application templates + registry"
```

---

### Task 5: Case-documents endpoints (all roles)

**Files:**
- Create: `apps/backend/src/output/case-documents.controller.ts`
- Modify: `apps/backend/src/output/output.module.ts` (register the controller)

**Interfaces:**
- Consumes: `loadCaseForDocs`, `watermarkForStatus`, `DOC_REGISTRY`, `PdfService.render`.
- Produces (HTTP, `JwtAuthGuard`, all roles):
  - `GET /cases/:id/documents` → `{ key, title, lang, available, watermarked }[]`.
  - `GET /cases/:id/documents/:key/pdf?download=0|1` → streams `application/pdf`.

- [ ] **Step 1: Write the controller**

Create `apps/backend/src/output/case-documents.controller.ts`:
```ts
import { Controller, Get, Param, Query, Res, UseGuards, NotFoundException, ConflictException } from '@nestjs/common';
import type { Response } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PdfService } from './pdf.service';
import { loadCaseForDocs } from './documents/case-document.loader';
import { watermarkForStatus } from './documents/doc-layout';
import { DOC_REGISTRY } from './documents/registry';

@UseGuards(JwtAuthGuard)
@Controller('cases/:id/documents')
export class CaseDocumentsController {
  constructor(private readonly prisma: PrismaService, private readonly pdf: PdfService) {}

  @Get()
  async list(@Param('id') id: string) {
    const c = await this.prisma.creditCase.findUnique({ where: { id }, select: { status: true } });
    if (!c) throw new NotFoundException('case not found');
    const available = c.status !== 'DRAFT';
    const wm = watermarkForStatus(c.status);
    return Object.entries(DOC_REGISTRY).map(([key, d]) => ({
      key, title: d.title, lang: d.lang, available, watermarked: available && wm !== null,
    }));
  }

  @Get(':key/pdf')
  async pdf(
    @Param('id') id: string,
    @Param('key') key: string,
    @Query('download') download: string | undefined,
    @Res() res: Response,
  ) {
    const tpl = DOC_REGISTRY[key];
    if (!tpl) throw new NotFoundException('unknown document');
    const c = await loadCaseForDocs(this.prisma, id);
    if (!c) throw new NotFoundException('case not found');
    if (c.status === 'DRAFT') throw new ConflictException('hujjat hali mavjud emas (qoralama)');

    const def = tpl.build(c);
    const wm = watermarkForStatus(c.status);
    if (wm) def.watermark = { text: wm, opacity: 0.12, angle: -40, bold: true } as any;

    const buffer = await this.pdf.render(def);
    const fileName = `${key}_${c.number}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `${download === '1' ? 'attachment' : 'inline'}; filename="${fileName}"`);
    res.send(buffer);
  }
}
```

- [ ] **Step 2: Register the controller**

In `apps/backend/src/output/output.module.ts`, add `CaseDocumentsController` to the module's `controllers` array (alongside `OutputController`). Ensure `PdfService` + `PrismaService` are available (PrismaModule likely already imported; if not, import it).

- [ ] **Step 3: Build + run all backend tests**

```bash
cd "C:/Users/Administrator/Desktop/credit-core/apps/backend"
npx tsc --noEmit 2>&1 | tail -6
npx jest 2>&1 | tail -8
```
Expected: tsc clean; all jest suites pass.

- [ ] **Step 4: Manual API smoke (dev backend running)**

Restart the backend (`npm run dev` from repo root, or `npm run start:dev -w @credit-core/backend`). Get the DEMO case id, then (replace TOKEN + CASEID):
```bash
curl -s http://localhost:3000/api/cases/CASEID/documents -H "Authorization: Bearer TOKEN" | head -c 300; echo
curl -s "http://localhost:3000/api/cases/CASEID/documents/contract/pdf" -H "Authorization: Bearer TOKEN" -o /tmp/contract.pdf -w "%{http_code} %{content_type}\n"
```
Expected: list returns 3 docs with `available:true, watermarked:true`; the pdf returns `200 application/pdf` and `/tmp/contract.pdf` opens as a watermarked PDF.

- [ ] **Step 5: Commit**

```bash
cd "C:/Users/Administrator/Desktop/credit-core"
git add apps/backend/src/output/case-documents.controller.ts apps/backend/src/output/output.module.ts
git commit -m "feat(output): GET /cases/:id/documents (list + watermarked PDF, all roles)"
```

---

### Task 6: Frontend "Hujjatlar" panel (CaseView)

**Files:**
- Modify: `packages/api-client/src/index.ts` (add `listCaseDocuments` + `caseDocumentUrl`)
- Modify: `packages/ui/src/pages/CaseView.tsx` (add the Hujjatlar panel)

**Interfaces:**
- Consumes: `GET /cases/:id/documents`, `GET /cases/:id/documents/:key/pdf?download=`.
- Produces: a panel listing documents with View + Download; a `CaseDocumentMeta = { key, title, lang, available, watermarked }` type.

- [ ] **Step 1: api-client methods**

In `packages/api-client/src/index.ts` add:
```ts
export type CaseDocumentMeta = { key: string; title: string; lang: 'uz' | 'ru'; available: boolean; watermarked: boolean };

// inside the api object:
listCaseDocuments: (id: string): Promise<CaseDocumentMeta[]> =>
  http.get(`/cases/${id}/documents`).then((r) => r.data),
caseDocumentUrl: (id: string, key: string, download = false): string =>
  `${apiBaseUrl}/api/cases/${id}/documents/${key}/pdf${download ? '?download=1' : ''}`,
```
(`apiBaseUrl` is the module-level base used elsewhere in this file; reuse it. The `<img>`/`<iframe>` will hit this URL — if endpoints require the Authorization header and cannot use a query token, instead fetch the PDF as a blob: add `caseDocumentBlob: (id,key) => http.get(url,{responseType:'blob'}).then(r=>URL.createObjectURL(r.data))` and use that for the iframe/download. Pick the blob approach if the app uses bearer-only auth — check how existing document downloads in CaseView authenticate.)

- [ ] **Step 2: Hujjatlar panel in CaseView**

In `packages/ui/src/pages/CaseView.tsx`, add a section (near the existing documents area) that loads `api.listCaseDocuments(c.id)` into state on mount and renders:
```tsx
<section className="rounded-xl border bg-card p-4 sm:p-5 space-y-3">
  <h3 className="text-sm font-semibold">Hujjatlar</h3>
  {c.status === 'DRAFT' ? (
    <p className="text-sm text-muted-foreground">Ariza yuborilgach hujjatlar shakllanadi.</p>
  ) : (
    <ul className="divide-y">
      {docs.map((d) => (
        <li key={d.key} className="flex items-center justify-between gap-3 py-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{d.title}</p>
            {d.watermarked && <span className="mt-0.5 inline-block rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">TASDIQLANMAGAN</span>}
          </div>
          <div className="flex shrink-0 gap-2">
            <button className="rounded-md border px-2.5 py-1 text-xs hover:bg-accent" onClick={() => setPreview(d)}>Ko'rish</button>
            <a className="rounded-md border px-2.5 py-1 text-xs hover:bg-accent" href={api.caseDocumentUrl(c.id, d.key, true)}>Yuklab olish</a>
          </div>
        </li>
      ))}
    </ul>
  )}
</section>
```
Add a `preview` state + a modal that renders `<iframe src={api.caseDocumentUrl(c.id, preview.key)} className="h-[80vh] w-full" />` (or the blob URL from Step 1 if bearer-auth). Reuse the existing `Modal` primitive in packages/ui. Apply ui-ux-pro-max for spacing/states.

- [ ] **Step 3: Typecheck + build**

```bash
cd "C:/Users/Administrator/Desktop/credit-core"
npx tsc --noEmit -p packages/ui/tsconfig.json 2>&1 | tail -6
npm run build 2>&1 | tail -8
```
Expected: no type errors; web apps build.

- [ ] **Step 4: Manual check**

`npm run dev`, open the DEMO case (status MODERATION). The Hujjatlar panel lists 3 documents each with a "TASDIQLANMAGAN" chip. "Ko'rish" opens the PDF in a modal; "Yuklab olish" downloads it. The contract shows the borrower, amount in words, collateral.

- [ ] **Step 5: Commit + final regression**

```bash
cd "C:/Users/Administrator/Desktop/credit-core/apps/backend" && npx jest 2>&1 | tail -5
cd "C:/Users/Administrator/Desktop/credit-core"
git add packages/api-client/src/index.ts packages/ui/src/pages/CaseView.tsx
git commit -m "feat(ui): Hujjatlar panel — view + download generated documents"
```

---

## Follow-up (explicitly NOT in this slice)
- Remaining documents: договор рус, Протокол, РКЛ Ген, Акт согласования, Приказ, обложка, перечень, Score отчёт, анкета, Справка (each a template + registry entry).
- **Payment-schedule** + **scoring-report** documents need the SP-4 (schedule) and SP-5 (scoring) engines to compute real rows/score first.
- Optional: persist a clean final copy as `Document(GENERATED_PDF)` on FINALIZE.
- Wire real case data entry (case form does not yet collect the new SP-1 fields) or import (SP-3) so non-demo cases also render fully.

## Self-Review notes
- **Spec coverage:** watermark-by-status (Task 3 `watermarkForStatus` + Task 5 apply), all-roles + status!=DRAFT guard (Task 5), view+download (Task 6), transient render (Task 5, no storage), org letterhead (Task 3 `orgHeader`), 3 documents (Task 4). Schedule/scoring/remaining docs deferred per spec §5/§7.
- **Placeholder scan:** every code step has complete code; templates are full functions (condensed but valid pdfmake). No TBD.
- **Type consistency:** `CaseDocData` (loader) flows into `DocTemplate`/templates/controller; `DOC_REGISTRY` keys (`contract`/`petition`/`creditApplication`) match the registry test and the frontend list; `PdfService.render` used by the controller; `watermarkForStatus` used by controller + list.
- **Data:** Task 2 seeds a MODERATION demo case so documents are available + watermarked on first run.
