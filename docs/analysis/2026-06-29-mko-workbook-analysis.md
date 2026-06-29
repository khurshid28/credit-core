# CLEVER Mikromoliya — Loan-Origination Workbook: Canonical Reference for credit-core

> Source: 30-sheet Excel workbook (CLEVER Mikromoliya Tashkiloti, Uzbekistan), decoded from 8 group analyses + the live Prisma schema at `apps/backend/prisma/schema.prisma`.
> Purpose: the single build-from reference for (a) **importing** filled workbooks, (b) **generating** the same workbook/Excel, and (c) **deriving/transforming** the data and generating all documents.

---

## 1. Overview — End-to-End Loan Lifecycle

The workbook implements a complete **microfinance line (микромолия линияси / MFL / РКЛ — Рамочная Кредитная Линия)** origination-to-collections pipeline for a Uzbek MKO (microfinance organization). It is built as a chain of **input sheets** feeding a chain of **document/generation sheets**, with a **scoring engine** in the middle.

The product is a **revolving credit line** (РКЛ "Бош келишув" / General Agreement) under which individual **tranches** (drawdowns / микрозайм / микрокредит sub-contracts) are issued. A regulatory threshold splits product naming: **≤ 100,000,000 UZS = микроқарз (micro-loan); > 100M = микрокредит (micro-credit)**.

Lifecycle stages, mapped to sheets:

| # | Stage | Driving sheets | Output |
|---|-------|----------------|--------|
| 1 | **Configuration** | Д0 (org master) | reusable lender requisites |
| 2 | **Origination / data entry** | Д1 (borrower), Д2 (line + collateral + insurance), Д3 (tranche), Справка (income certificate) | raw deal facts |
| 3 | **Credit-bureau pull** | b4 (АСОКИ / KATM credit history) | existing-debt facts |
| 4 | **Affordability analysis** | Д1 rows 44–49 (income/expense), b3 DTI | average income, DTI, surplus |
| 5 | **Scoring** | балл (20-factor engine) → Score отчет (verdict report) | score /100, verdict |
| 6 | **Borrower-facing forms** | b3 (анкета), Справка (income cert) | signable client docs |
| 7 | **Approval documents** | Ходатайство (petition), Протокол (committee decision), Приказ на сделку (director order) | internal approval chain |
| 8 | **Contract** | РКЛ Ген (general agreement), договор рус / договор узб (microloan contract RU/UZ), Акт согласования (collateral valuation act), обложка (cover), перечень (file checklist) | signed legal package |
| 9 | **Schedule** | График 6/12/18/24/30/33/48 мес (7 amortization variants) | Annex 1 payment plan |
| 10 | **Monitoring** | Акт мониторинга 1/2/3 (collateral re-inspection at +180/+360/+540 days) | periodic acts |
| 11 | **Collections** | Претензион (pre-litigation claim letter to court) | demand/enforcement |

**Data flow in one line:** `Д0/Д1/Д2/Д3 + b4 → балл → Score отчет → (approval docs) → (contracts) → (schedule) → (monitoring) → (claim)`. Every document sheet is **100% formula-driven** (no manual entry) except the income certificate (Справка), the credit application consent ticks, and the claim-letter number/date.

---

## 2. Unified Data Dictionary

Consolidated canonical entities. "Sheet!Cell" gives provenance. Type is the recommended storage type for credit-core.

### 2.1 Organization (lender / MKO master) — *Sheet Д0*
Pure configuration; changes only when the org changes. Source of requisites for every document.

| Field | Type | Source | Notes |
|---|---|---|---|
| nameMixed | string | Д0!B2 | `МЧЖ «CLEVER Mikromoliya Tashkiloti»` |
| nameUpper | string | Д0!B3 | UPPERCASE, used in clauses |
| nameSuffix | string | Д0!B4 | name-then-suffix form |
| directorShort | string | Д0!B5,B6 | `Б.Исмоилов` (signature form) |
| directorFull | string | Д0!B7 | `Исмоилов Баҳромжон Ахрор ўғли` |
| legalBasis | string | Д0!B8 | `Низом` (Charter) |
| address | string | Д0!B9 | full street address |
| bankAccount | string | Д0!B10 | р/с |
| bankMfo | string | Д0!B11 | МФО/BIC |
| bankName | string | Д0!B12 | `АЖ «ANORBANK»` |
| inn | string | Д0!B13 | org tax ID |
| licenseNo | string | Д0!B17 | |
| licenseDate | date | Д0!B18 | |
| signatoryRoles | label set | Д0!A14–A16 | Credit-Committee member / Head of credit dept / Credit manager |

### 2.2 Borrower — *Sheet Д1; restated in b3, contracts, all docs*
Multiple grammatical-case forms (C4–C9) exist only for Russian mail-merge — store once, decline at render.

| Field | Type | Source | Notes |
|---|---|---|---|
| fullName | string | Д1!C2 | nominative |
| shortName | string (derived) | Д1!C3 | `TADJIYEV A.J.` — derive from fullName |
| gender | enum(M/F) | Д1!C10 | Эркак/Аёл — **needed by scoring factor 1** |
| previousName | string | Д1!C11 | |
| citizenship | string | Д1!C12 | |
| placeOfBirth | string | Д1!C13 | |
| birthDate | date | Д1!C14 | drives age in scoring |
| pinfl | string(14) | Д1!C16 / b3!D9 | **conflict:** b3!D9 differs from Д1!C16 → pick Д1 as source of truth |
| inn / stir | string | Д1!C15 (blank) / b3!D8 | client tax ID |
| passportSeriesNumber | string | Д1!C17 | `KA №1191531` — parse to series+number |
| passportIssuer | string | Д1!C18 | authority + issue date (free text) |
| passportExpiry | date | Д1!C19 | or "бессрочный" |
| regAddress | string | Д1!C20 | permanent registration |
| regLandmark | string | Д1!C21 | ориентир |
| regTenure | enum | Д1!C22 | собственность/аренда/служебная/другое |
| regMatchesActual | enum | Д1!C23 | совпадает/не совпадает |
| actualAddress | string | Д1!C24 (=C20 if matches) | |
| actualLandmark | string | Д1!C25 | |
| actualTenure | enum | Д1!C26 | |
| phones | string[] (up to 5) | Д1!C27–C31 | each with owner tag (OZI/O'G'LI) |
| maritalStatus | enum | Д1!C32 | турмуш курган/ажрашган/бўйдоқ/бева |
| familySize | int | Д1!C33 | |
| education | enum | Д1!C34 | олий/урта махсус/урта… |
| residenceDuration | enum band | b3!D15 | 5-10 / 1-5 / иное |
| bankDepositsBand | enum | b3!D43 | none / <500$ / 500-1000$ / 1000-3000$ / >3000$ |
| ownsHome | enum | b3!D42 / Д1!C26 | housing tenure type |

### 2.3 Employment — *Sheet Д1 (no schema home today)*

| Field | Type | Source | Notes |
|---|---|---|---|
| employer | string | Д1!C36 | place of work / self-employment reg no |
| employerAddress | string | Д1!C37 (=C20 if self-emp) | |
| sector | enum (17 sectors) | Д1!C38 / b3!D25 | drives **industry-risk VLOOKUP** |
| sectorRiskCode | int (1–17) | b3!F25 = VLOOKUP(sector, M:N) | **scoring factor 9 input** |
| position | string | Д1!C40 | |
| employedSince | string/year | Д1!C41 | |
| totalExperienceBand | enum | Д1!C42 | до 3 лет … |
| employmentCertNo/Date | string/date | Д1!C51 | blank in sample |

### 2.4 Income / Expense Analysis (Affordability) — *Sheet Д1 rows 44–49, b3, Справка*
The heart of the affordability check. All values are computed via formulas reaching into Д2/Д3/b4/schedule.

| Field | Type | Source / formula | Notes |
|---|---|---|---|
| avgMonthlyIncome | money | Д1!C44 = `ROUNDUP((C48+D43)*2.2, -3)` | **2.2× affordability multiplier** |
| mainActivityIncome | money | b3!D28 = Д1!C44 | |
| secondaryIncome | money | b3!D29 | |
| familyIncome | money | b3!D30 | |
| otherIncome | money | Д1!C45 / b3!D31 | |
| newLoanPayment (annuity) | money | Д1!D44 = `ROUND(PMT(Д2!B19/12, 36, -Д3!B15), 2)` | |
| utilitiesExpense | money | Д1!C46 = `ROUNDUP(C44*1%, -4)` | 1% of income |
| familyExpense | money | Д1!C47 = `ROUNDUP(C44*1.5%, -4)` | 1.5% |
| existingCreditBurden | money | Д1!C48 = `b4!C9` | from credit bureau |
| otherExpense | money | Д1!C49 = `ROUNDUP(C44*0.5%, -4)` | 0.5% |
| totalIncome | money | b3!D38 = SUM(D28:D31) | |
| totalCreditPayments | money | b3!D37 = D35+D34 | new + existing |
| totalExpenses | money | b3!D39 = SUM(D32:D36) | |
| dtiRatio | float | b3!D46 = `D37/D38` | **debt-burden / DTI; 45.45% in sample** |
| 12-month salary history | money[12] | Справка!C10:C21 | manual entry |
| avgMonthlyNetIncome | money | Справка!L22 = `J22/12` | from salary cert |

### 2.5 CreditLine / РКЛ (revolving line master) — *Sheet Д2*

| Field | Type | Source | Notes |
|---|---|---|---|
| lineNumber | string | Д2!B3 | `№ 1199 TR` |
| loanType | enum | Д2!B2 = IF(amount≤100M, микроқарз, микрокредит) | |
| amountAuto (part 1) | money | Д2!A7 | AUTO/realty-backed portion |
| amountPolis (part 2) | money | Д2!B7 | insurance-backed portion |
| amountTotal | money | Д2!B4 = A7+B7 | |
| amountWords | string | Д2!B5 | Uzbek words (number→words) |
| termMonths | int | Д2!B9 / B17 | line term (e.g. 60) |
| lineDate | date | Д2!B11 | order/line date |
| lineMaturity | date | Д2!B14 | start + term; day-snap rule + 10 days |
| interestRate | decimal | Д2!B19 = 0.55 (55%) | annual, fraction |
| penaltyRate | decimal | Д2!B22 = 1.05 (105%) | overdue rate |
| orderNumber | string | Д2!B25 | `1881 MFL 1199 TR` |

### 2.6 Tranche / ТРАНШ — *Sheet Д3* (no schema home today)

| Field | Type | Source | Notes |
|---|---|---|---|
| trancheNo | int (1–5) | Д3!B1 | active tranche selector |
| applicationNo | string | Д3!B4 | `№ 1881 MFL 1199 TR` |
| applicationDate | date | Д3!B5 | |
| contractNo | string | Д3!B8 = B4 | |
| contractDate | date | Д3!B9 = B5 | |
| principalMatrix | money[5] | Д3!C4:G4 | running-balance matrix; tranche 1 = 130M |
| selectedPrincipal | money | Д3!B15 | picked by trancheNo |
| principalWords | string | Д3!B16 | |
| trancheTerm | int | Д3!B11 | e.g. 30 (≠ line term 60) |
| trancheMaturity | date | Д3!B13 | day-snap + 10 rule |
| scheduleType | enum | Д3!B17 | аннуитетный / дифференцированный |
| monthlyPayment | money | Д3!B18 = `'График 6 мес'!G8` | from schedule |
| insurancePayment | money | Д3!B20 = Д2!B81 | |
| loanTypeBands | enum[] | Д3!C7:G11 | cumulative ≤/>100M classification per drawdown |

### 2.7 Collateral (auto + realty) — *Sheet Д2*

**Common**

| Field | Type | Source |
|---|---|---|
| type | enum AUTO/REAL_ESTATE | Д2!B42 |
| agreedValue | money | Д2!B59 = `A7*140%` (LTV/coverage rule) |
| agreedValueWords | string | Д2!B60 |
| position/rank | int | Д2!B58 |

**Auto**

| Field | Source |
|---|---|
| model | Д2!B46 |
| stateNumber | Д2!B47 |
| bodyType | Д2!B48 |
| bodyNo | Д2!B49 |
| engineNo | Д2!B51 |
| chassis | Д2!B52 |
| color | Д2!B54 |
| year | Д2!B55 |
| mileage | Д2!B57 |
| techPassportNo | Д2!B45 |
| regAddress | Д2!B44 |

**Real estate**

| Field | Source | Notes |
|---|---|---|
| address | Д2!C44 (=B34) | |
| registryNo | Д2!C45 | |
| propertyType | Д2!C46/C47 | `YAKKA TARTIBDAGI TURAR JOY` |
| cadastreNo | Д2!C48 | |
| landAreaM2 | Д2!C49 | **no schema field** |
| totalExternalAreaM2 | Д2!C50 | |
| usableAreaM2 | Д2!C51 | **no schema field** |
| roomCount | Д2!C52 | |
| livingAreaM2 | Д2!C53 | ⚠ **cell layout inconsistent: RU contract reads C50, UZ reads C53 — reconcile at import** |
| areaLabels | Д2!D49–D53 | label/value pairs |

### 2.8 Collateral Owner / Pledgor (Залогодатель) — *Sheet Д2*

| Field | Type | Source | Notes |
|---|---|---|---|
| isBorrowerOwner | bool | Д2!B28 (да/нет) | drives signatory wording & 2-party vs 3-party acts |
| fullName | string | Д2!B35 (=Д1!C2 if да, else B29) | |
| shortName | string | Д2!B36 | |
| birthDate | date | Д2!B37 | |
| passport | string | Д2!B38 | |
| passportIssuer | string | Д2!B39 | |
| regAddress | string | Д2!B40 | used by claim letter |

### 2.9 Insurance / Policy — *Sheet Д2* (no schema home today)

| Field | Type | Source | Notes |
|---|---|---|---|
| insured | bool | Д2!B63 | да/нет — controls clause 3.1.2 |
| company | string | Д2!B65 | `АО "TRUST INSURANCE"` |
| genAgreementNo | string | Д2!B70 | |
| genAgreementDate | date | Д2!B71 | |
| policyNo | string | Д2!B73 | |
| policyIssueDate | date | Д2!B74 = B11 | |
| policyTermMonths | int | Д2!B75 | e.g. 24 |
| policyExpiry | date | Д2!B76 | start + term − 1 day |
| loanUnderPolicy | money | Д2!B77 = B7 | |
| insuredSum | money | Д2!B78 = `B77*1.3` (130%) | |
| insuredSumWords | string | Д2!B79 | |
| insuranceRate | decimal | Д2!B80 = 0.02 (2%) | |
| premium | money | Д2!B81 = `(B78*B80)/12*B75` | = 3,120,000 |

### 2.10 CreditHistory (АСОКИ / КATM) — *Sheet b4* (no schema home today)

| Field | Type | Source | Notes |
|---|---|---|---|
| repaidLoansCount | int | b4!C2 / C3 | **scoring factors 14, 16** |
| activeLoansCount | int | b4!C3 | |
| overdueSubstandardFlag | int/flag | b4!C4 | **problem-loans gate** |
| otherObligations | int/flag | b4!C5 | guarantees/pledges; **factor 15** |
| loansOver5MFlag | enum | b4!C6 | **factor 17 penalty input** |
| priorMfiPawnshopFlag | enum | b4!C7 | **factor 18 penalty input** |
| totalOutstandingDebt | money | b4!C8 | |
| avgMonthlyPaymentExisting | money | b4!C9 | feeds Д1!C48 |
| committeeProtocolRef | string | b4!D11 | `73-2020` |
| committeeDecisionDate | date | b4!C12 = C11 = Д2!B11 | |

### 2.11 ScoringInputs / ScoringResult — *Sheet балл* (no schema home today)

| Field | Type | Source |
|---|---|---|
| totalScore | int (0–100) | балл!D25 |
| maxScore | int (=100) | балл!E25 |
| factorBreakdown | {factorNo, points, max}[] | балл!D5:E24 |
| age | float | балл!C6 = (TODAY−birthDate)/365 |
| monthlyTranches | money | балл!C27 |
| monthlyIncome | money | балл!C28 |
| monthlyExpenses | money | балл!C29 |
| surplus | money | балл!C30 |
| netAfterDebt | money | балл!C31 = C28−C27 |
| verdict | enum | Score отчет!B24 |

### 2.12 Guarantor (Kafil)
Present in schema; **the workbook in this sample does not populate a separate guarantor** (collateral is self-pledged). Keep the model for cases that have guarantors.

---

## 3. Scoring Algorithm — The 20-Factor Model

**Engine:** sheet `балл`, rows 5–24, each producing `points` (col D) capped by `max` (col E). **Total = SUM(D5:D24) = 77 in sample; Max = SUM(E5:E24) = 100 fixed.**

| # | Factor | Rule (decoded) | Max | Input |
|---|--------|----------------|-----|-------|
| 1 | Gender (Пол) | female → 2; else → 1 | 2 | Д1!C10 |
| 2 | Age (Возраст) | >68 → 0; 50–68 → 5; 30–49 → 4; 20–29 → 2; <20 → 0 | 5 | C6 (age) |
| 3 | Education | highest option → 3; mid → 2; low → 1; else 0 | 3 | b3!D41 vs F41/G41/H41 |
| 4 | Marital status | E32 → 3; F32 → 2; G32 → 0; else 2 | 3 | Д1!C32 |
| 5 | Collateral type | авто → 2; else (real estate) → 4 | 4 | Д2!B42 |
| 6 | Children | ≥3 → 1; 1–2 → 2; 0 → 3 (fewer = higher) | 3 | b3!D22 |
| 7 | Pledgor present | да → 3; else 1 | 3 | Д2!B28 |
| 8 | Residence tenure | longest → 3; mid → 2; else 1 | 3 | b3!D15 |
| 9 | Activity sphere | metric >18 → 4; >9..≤18 → 5; ≤9 → 6 (inverted: lower risk-code scores higher) | 6 | b3!F25 (sectorRiskCode) |
| 10 | Position | F26 → 5; G26 → 4; else 2 | 5 | b3!D26 |
| 11 | Total work tenure | longest → 5; mid → 3; else 1 | 5 | b3!D27 |
| 12 | Home ownership | G42 → 1; H42 → 2; else 0 | 2 | b3!D42 |
| 13 | Deposits | H43 → 1; I43 → 2; J43 → 3; else 0 | 3 | b3!D43 |
| 14 | Repaid loans count | ≥3 → 3; =2 → 2; else (0–1) → 1 | 3 | b4!C3 |
| 15 | Other obligations | =0 → 2; else 0 | 2 | b4!C5 |
| 16 | Current obligations | if C4=1 → 0; else by repaid count: 0→5, 1→4, 2→2, else 0 | 5 | b4!C4, b4!C3 |
| 17 | Loans >5M (penalty) | if C6=neutral → 0; elif D44=H44 → **−5**; else 0 | 0 (penalty-only) | b4!C6, b3!D44 |
| 18 | Prior MFI/pawnshop (penalty) | if C7=neutral → 0; elif D45=H45 → **−5**; else 0 | 0 (penalty-only) | b4!C7, b3!D45 |
| 19 | **Tranche/income ratio** | C23 = monthlyTranches/income; if ≤0.5 → **22**; else 0 | **22** (highest weight) | C27/C28 |
| 20 | **Surplus/tranche coverage** | C24 = (income−expenses)/tranches; ≥1 → **21**; else → 16 | **21** | C30/C27 |

**Affordability block (rows 27–31):**
- `C27 monthlyTranches = b4!C9 + Д3!B18` (existing + new payment)
- `C28 monthlyIncome = Д1!C44 + Д1!C45`
- `C29 monthlyExpenses = C28*0.5 + SUM(Д1!C46:C49)` — **baseline living = 50% of income** plus declared lines
- `C30 surplus = C28 − C29`
- `C31 netAfterDebt = C28 − C27` (sign drives income gate)

### Decision logic (sheet `Score отчет`, cell B24 — ХУЛОСА)
Hard gates evaluated first, then threshold:

1. **Income gate** (B19): `балл!C31 < 0` → fails (income must cover all tranches).
2. **Problem-loans gate** (B20): `b4!C4` empty → "history not filled"; =0 → pass; else → "referred to credit committee".
3. **Current-obligations gate** (B21): `b4!C3` empty → "not filled"; ≥3 → fails; else pass.
4. **Age gate** (B22): age >68 OR <18 → fails (must be 18–68).
5. **Score** (B23 = балл!D25).

**Final verdict (effective rule):**
- score **< 60** → **REJECT** ("Скоринг балл минимал талабдан паст" / below minimum).
- score **60–69** → **REFER to underwriter/credit committee** (manual review).
- score **≥ 70** → **AUTO-APPROVE** ("Маъқулланди"), **UNLESS** any hard gate (problem loans / age / obligations) trips → forces referral/fail.

Recommended verdict enum: `APPROVED | REFER_COMMITTEE | FAILED_PROBLEM_LOANS | FAILED_INCOME | BELOW_MIN`.

---

## 4. Document Inventory

All formula-driven unless noted. Language: RU = Russian, UZ = Uzbek-Cyrillic.

| Document | Sheet | Lang | Purpose | Key inputs |
|---|---|---|---|---|
| **Client questionnaire (Анкета)** | b3 | UZ | Signable KYC form; restates identity/income/expense; adds DTI, sector-risk, PEP/KYC self-declarations | Д1 (all), b4 (debt flags), Д0!B3 (clauses) |
| **Income certificate (Справка)** | Справка | RU | Employer salary statement, 12 months → avg income; **the one data-entry doc** | manual salary, Д1!C2/C36/C37/C40 |
| **Scoring report (Score отчет)** | Score отчет | UZ | Underwriting verdict page: terms + 5 gates + score + ХУЛОСА | Д1, Д2, балл, b4 |
| **Petition (Ходатайство/Мурожаатнома)** | Ходатайство | UZ | Borrower asks director to open MFL | Д0, Д1, Д2 (limit/term/rate/collateral), Д3!B5 |
| **Committee protocol excerpt (Протокол)** | Протокол | UZ | Credit-committee approval (QAROR QILADI) | Д1, Д2, Д3!B17, ext [9]malumot, protocol no |
| **General Agreement (РКЛ Ген)** | РКЛ Ген | UZ | Master credit-line contract; S=L−D revolving formula, penalty tiers, sub-contract windows | Д0 requisites, Д1, Д2 (all) |
| **Microloan contract RU** | договор рус | RU | Signed loan contract; AUTO vs REALTY collateral branch; insurance clause | Д0, Д1, Д2, Д3 |
| **Microloan contract UZ** | договор узб | UZ | Same, Uzbek; labels product Микрокредит; explicit penalty-tier schedule (clause 2.5) | Д0, Д1, Д2, Д3 |
| **Collateral valuation act (Акт согласования)** | Акт согласования | UZ | Tripartite act fixing agreed collateral value; 2-party vs 3-party on B28 | Д0, Д1, Д2; ⚠ A8 = `#REF!` (handle on import) |
| **Director deal order (Приказ на сделку)** | Приказ на сделку | UZ | Director authorizes MFL opening | Д0, Д1, Д2!B25, Ходатайство, Акт согласования |
| **Credit application (Кредитная заявка/Ариза)** | Кредитная заявка | UZ | Borrower's formal request; consent ticks; acceptance-free debit consent | Д0, Д1, Д2, Д3 |
| **Cover page (обложка)** | обложка | UZ | Dossier title page + headline terms | Д0!B3, Д1!C2, Д2 |
| **File checklist (перечень)** | перечень | UZ | Ordered 16-document packet index (copies + pages) | static; manual copies/pages |
| **Monitoring act 1/2/3 (Акт мониторинга)** | Акт мониторинга 1/2/3 | UZ | Collateral re-inspection at +180/+360/+540 days | Д0, Д1, Д2, Д3!B9, Акт согласования, prior act |
| **Claim letter (Претензион)** | Претензион | RU | Pre-litigation demand to Mirabad court; copies to borrower + pledgor | Д0, Д1, Д2, monitoring acts; manual letter no/date |

**Payment schedule (График … мес)** — see §5, attached as Annex 1 to the contract.

**Checklist canonical packet order (sheet перечень):** 1 Client primary docs (passport, tech-passport/cadastre, legal-entity docs, ZAGS) · 2 Self-employment doc · 3 Petition · 4 Asoki certificate · 5 Questionnaire (анкета) · 6 Scoring results · 7 General agreement · 8 Valuation act · 9 Pledge agreement · 10 Encumbrance sheet · 11 Credit application · 12 Credit contract + schedule · 13 Payment request · 14 Memorial order · 15 Monitoring act · 16 Pretension.

---

## 5. Payment Schedule Logic

**Sheets:** `График 6/12/18/24/30/33/48 мес` — 7 amortization variants, **structurally identical** (same per-row engine copied to different lengths). `График 6 мес` is the **master** (others inherit header/requisites/signature block from it).

### Parameters (all flow in — schedules store nothing)
| Param | Source |
|---|---|
| principal | Д3!B15 (= CreditCase.amount) |
| termMonths (nper) | Д3!B11 |
| annualRate | Д2!B19 (0.55) |
| disbursementDate (day 0) | Д3!B9 |
| scheduleType | Д3!B17 (annuity / differentiated) |
| paymentDayCap | 15 (6-month variant) / **25 (all others)** |

### Core math (hybrid)
- **Annuity payment** = `ROUND(PMT(rate/12, nper, -principal), 2)`.
- **Principal portion per row:**
  - annuity → `payment − interest`
  - differentiated → `principal / nper` (equal principal each period)
- **Interest (ALWAYS, both modes)** = `balance × annualRate / 365 × daysInPeriod`, where `daysInPeriod` = actual days between real payment dates (**actual/365**; note: /365 divisor is hard-coded even in leap years → slight over-accrual is a known quirk).
- **First period** day-count = firstPaymentDate − disbursementDate (a partial month).
- **Installment total** = `CEILING(principal + interest, 1000)` — rounded **up to nearest 1000 UZS**.
- **Payment dates:** row n = firstPaymentDate + (n−1) months, on the capped day-of-month.
- **Final row** repays the entire remaining balance (balloon-closes to 0).
- **TOTAL principal** must equal the loan amount; **TOTAL interest** = total paid − principal.

### The 7 term variants & a critical bug to NOT replicate
The 7 sheets cover terms **6 / 12 / 18 / 24 / 30 / 33 / 48 months**. **The sheet NAME ≠ the real term.** In the sample all 7 carry the same term=30 loan, so `График 33` and `График 48` **overflow** past payoff: after the balance hits 0 the recurrence produces negative/huge garbage rows (e.g. C=−6.84M then +470M) and dates degenerate to `1899-12-30` (DATE serial 0).

> **Replacement rule:** generate **exactly `termMonths` rows**, never a fixed template length. Compute row count from `termMonths`; do not port the 7-fixed-template approach.

### 18-month special block (Norm / DSR check)
Only `График 18 мес` has a cols M/N/O guard: `O = IF(2×windowedInterest > openingPrincipal, excess, "НОРМА")` — an interest-burden ceiling (usury/DSR guard). Worth porting as a validation rule.

---

## 6. Cross-Sheet Dependency Map

```
PURE INPUT SHEETS (human/operator data or config):
  Д0  (org config)              ──┐
  Д1  (borrower + income/exp)   ──┤  read by almost everything
  Д2  (line + collateral + ins) ──┤
  Д3  (tranche)                 ──┤
  b4  (credit history АСОКИ)    ──┤
  Справка (income cert)         ──┘  (only true data-entry doc besides b4 inputs)

DERIVED / COMPUTED:
  Д1.income block  ← Д2, Д3, b4, 'График 6 мес'
  балл (scoring)   ← Д1, Д2, Д3, b3, b4
  График N мес     ← Д3, Д2, договор (for header/requisites)
  Д3.monthlyPayment ← 'График 6 мес'!G8   (cycle: Д3 → schedule → Д3)

GENERATED DOCUMENTS (read-only projections):
  b3 (анкета)          ← Д1, b4, Д0
  Score отчет          ← Д1, Д2, балл, b4
  Ходатайство          ← Д0, Д1, Д2, Д3
  Протокол             ← Д1, Д2, Д3, ext [9]/[10]/[11]
  РКЛ Ген              ← Д0, Д1, Д2
  договор рус/узб      ← Д0, Д1, Д2, Д3
  Акт согласования     ← Д0, Д1, Д2
  Приказ на сделку     ← Д0, Д1, Д2, Ходатайство, Акт согласования
  Кредитная заявка     ← Д0, Д1, Д2, Д3
  обложка              ← Д0, Д1, Д2
  перечень             ← (static)
  Акт мониторинга 1/2/3 ← Д0, Д1, Д2, Д3, Акт согласования, prior act (chained)
  Претензион           ← Д0, Д1, Д2, Акт согласования, мониторинга acts
```

**Practical consequence for build:** there are exactly **6 source-of-truth sheets** (Д0, Д1, Д2, Д3, b4, Справка). Importing these + computing `балл` and the schedule reproduces every other sheet. The number→words and date→Uzbek-words conversions (giant SUBSTITUTE/ROMAN chains across the `(прописью)` cells) are pure render-time transforms — implement once as utilities.

---

## 7. Credit-core Gap Analysis

Legend: ✅ exists · �−▢ partial · ❌ missing.

| Concern | Current schema | Status | Needed change |
|---|---|---|---|
| **Org / lender config** | none (Branch only) | ❌ | New `Organization` model: names (3 forms), director (short/full), legalBasis, address, bank account/MFO/name, INN, license no/date. |
| **Branch** | `Branch` | ✅ | reuse for region/city of issue |
| Borrower core identity | `Borrower.fullName/passportSeries/passportNumber/pinfl/birthDate/address/phone` | �−▢ | add: gender, citizenship, placeOfBirth, previousName, passportIssuer, passportIssueDate, passportExpiry, inn/stir |
| Borrower address split | single `address` | �−▢ | add regAddress/actualAddress + landmarks + tenure; or sub-model |
| Borrower phones | single `phone` | �−▢ | up to 5 numbers + owner tags → string[] or `BorrowerPhone[]` |
| Demographics | none | ❌ | maritalStatus, familySize, childrenCount, education, residenceDuration, ownsHome, depositsBand |
| **Employment** | none | ❌ | new `Employment` model: employer, employerAddress, sector, sectorRiskCode, position, employedSince, experienceBand |
| **Income/Expense (affordability)** | none | ❌ | new `Affordability` model: avgMonthlyIncome, income lines, expense lines, dtiRatio, surplus, netAfterDebt + the 2.2× / 1% / 1.5% / 0.5% / 50%-baseline rules in code |
| **Income certificate (12-mo salary)** | none | ❌ | new `IncomeCertificate` + `SalaryMonth[]` (bonus/tax/net derivations) |
| CreditCase amount/term | `amount`, `termMonths` | ◅▢ | one amount/term field cannot hold both **line** (150M/60mo) and **tranche** (130M/30mo) — see CreditLine + Tranche below |
| **CreditLine (РКЛ)** | none | ❌ | new `CreditLine`: lineNumber, amountAuto, amountPolis, amountTotal+words, termMonths, lineDate, lineMaturity, interestRate, penaltyRate, orderNumber, loanType (микроқарз/микрокредит) |
| **Tranche** | none | ❌ | new `Tranche`: trancheNo, application/contract no+date, principal+words, term, maturity, scheduleType (enum), monthlyPayment, insurancePayment, principal matrix (up to 5) |
| Per-case interest rate | `AppConfig.markupPercent/bankRate` (global) | ◅▢ | add per-case `interestRate` (55%) + `penaltyRate` (105%); AppConfig stays for defaults |
| Loan-type / product subtype | `ProductType` = REAL_ESTATE\|AUTO only | ◅▢ | add loanType enum (микроқарз vs микрокредит); productType stays for collateral kind |
| Repayment method | none | ❌ | enum `ANNUITY \| DIFFERENTIATED` (drives schedule) |
| Disbursement date / maturity | only `createdAt` | ❌ | add disbursementDate (day 0), lineStart/lineEnd, contract/application/petition dates |
| **PaymentSchedule** | none | ❌ | **biggest schedule gap** — new `PaymentSchedule` + `Installment[]` (date, openingBalance, principal, interest, total, days) OR persisted JSON; generate exactly termMonths rows |
| Penalty-tier schedule | none | ❌ | model/config: 0/0.5/1.0/2.0% over day-bands 5/30/60/120, cap 50% of annual loan; auto-debit 1–3% reimbursement |
| Collateral (auto+realty) | `Collateral.*` rich | ✅ | mostly direct |
| Collateral area types | `totalAreaM2`, `livingAreaM2` | ◅▢ | add landAreaM2, usableAreaM2; reconcile RU(C50)/UZ(C53) living-area cell inconsistency at import |
| Collateral rank/position | none | ❌ | add `position` |
| Pledgor distinction | `CollateralOwner` | ◅▢ | add `isBorrowerOwner` flag + pledgor regAddress, birthDate, issuer (для claim letter & 3-party acts) |
| ValuationAct | `ValuationAct` | ✅ | direct |
| **Insurance / Policy** | none | ❌ | new `InsurancePolicy`: company, gen-agreement no/date, policy no, dates, insuredSum+words, rate, premium, loanUnderPolicy |
| **CreditHistory (АСОКИ)** | none | ❌ | new `CreditHistory`: repaid/active counts, overdue flag, otherObligations, loansOver5M, priorMfiPawnshop, totalOutstanding, avgMonthlyPayment, committee protocol ref/date |
| **Scoring** | none | ❌ | add `CreditCase.scoringScore` (Int), `scoringVerdict` (enum); new `ScoringFactor[]` breakdown table; scoring config (max=100, thresholds 60/70, gate rules) |
| Amount/term-in-words | none | ◅▢ | only collateral has `*Words`; add words generation for amount/term (RU + UZ number→words util) |
| **Document templates / types** | `DocumentType` enum (9 values) | ◅▢ | most Uzbek doc categories (petition, анкета, scoring, MFL agreement, valuation act, pledge agreement, encumbrance, contract, schedule, memorial order, monitoring act, pretension) fall under OTHER/GENERATED_PDF — extend enum or add `DocumentTemplate` model |
| Document copies/pages + checklist state | none | ❌ | add copies/pages metadata + `ChecklistState` to track packet completeness |
| **MonitoringAct** | none | ❌ | new `MonitoringAct`: actNo, inspectionDate (+180/+360/+540 offsets), findings, signatories |
| **Claim/correspondence** | none | ❌ | new `ClaimLetter`/`Correspondence`: letter no, date, recipient court, copies-to |
| Committee decision metadata | `WorkflowEvent` | ◅▢ | timestamps exist; add committee protocol no + membership list |
| Import job | `ImportJob` (parsedJson) | ✅ | reuse for workbook ingestion |

---

## 8. Proposed Sub-project Decomposition

Each sub-project is independently buildable, with explicit scope, dependencies, and a recommended order.

### SP-1 — Data-Model Extension (Prisma schema)
**Scope:** All new models/fields from §7 — Organization, Employment, Affordability, IncomeCertificate, CreditLine, Tranche, InsurancePolicy, CreditHistory, ScoringFactor, scoring fields on CreditCase, PaymentSchedule/Installment, MonitoringAct, ClaimLetter, repayment-method/loan-type enums, words fields, document-template/checklist additions; reconcile area fields; pledgor flag.
**Dependencies:** none.
**Why first:** every other sub-project reads/writes these models. Nothing can be imported, scored, or generated without the tables. **This is the foundation.**

### SP-2 — Number/Date → Words & Formatting Utilities
**Scope:** RU + UZ number→words (the ROMAN/SUBSTITUTE chains), Uzbek date→words (`DD Month YYYY й.`), `FIXED(x,2)`, CEILING-to-1000. Pure library.
**Dependencies:** none (parallel with SP-1).
**Why early:** consumed by both schedule and document engines; small, testable in isolation.

### SP-3 — Excel Import / Parser
**Scope:** Read filled workbook; pull the **6 source-of-truth sheets** (Д0, Д1, Д2, Д3, b4, Справка); parse combined cells (passport "KA №1191531", areas, day-snap dates); resolve pledgor=borrower; handle the `#REF!` in Акт согласования and the b3!D9≠Д1!C16 PINFL conflict; reconcile RU/UZ living-area cell layout; persist via `ImportJob` → SP-1 models.
**Dependencies:** SP-1.

### SP-4 — Payment-Schedule Engine
**Scope:** Annuity + differentiated; actual/365 interest on outstanding balance; CEILING-1000; day-snap payment dates; **exactly termMonths rows** (no template overflow); final-row balloon close; 18-month DSR/Norm guard. Inputs: principal, term, rate, disbursement date, scheduleType, payment-day cap.
**Dependencies:** SP-1 (PaymentSchedule/Installment), SP-2 (rounding helpers).

### SP-5 — Scoring Engine
**Scope:** 20 factors with thresholds (§3), affordability block (2.2× / 1%/1.5%/0.5% / 50%-baseline), 5 hard gates, 60/70 thresholds, verdict enum; persist `scoringScore` + factor breakdown. Reads Borrower/Employment/Affordability/Collateral/CreditHistory.
**Dependencies:** SP-1; ideally after SP-3 (so it has real imported data) but specifiable independently. Needs SP-4's monthly payment for factor 19/20.

### SP-6 — Document-Generation Engine
**Scope:** Template the 15 documents (§4) RU/UZ; collateral AUTO/REALTY branches; insurance-clause toggle; 2-party vs 3-party acts; petition/protocol/order/contracts/cover/checklist/monitoring/claim; render to PDF; store as `Document(GENERATED_PDF)`. Monitoring-date offsets (+180/+360/+540) and claim-letter metadata.
**Dependencies:** SP-1, SP-2; SP-5 (scoring report needs verdict); SP-4 (contract needs schedule annex).

### SP-7 — Excel / Workbook Export
**Scope:** Regenerate the full filled `.xlsx` (the inverse of SP-3) — write all 30 sheets, including `(прописью)` cells and a correctly-sized schedule. Largely reuses SP-2/SP-4/SP-6 outputs.
**Dependencies:** SP-1, SP-2, SP-4, SP-6.

### Recommended Build Order
```
1. SP-1 Data-Model Extension      ── foundation; unblocks all
2. SP-2 Words/Format Utilities    ── parallel with SP-1; tiny, reusable
3. SP-3 Excel Import/Parser       ── proves the model against a real file; produces test data
4. SP-4 Payment-Schedule Engine   ── self-contained, high-value, unit-testable against the 7 sheets
5. SP-5 Scoring Engine            ── needs model + (ideally) imported data + SP-4 payment
6. SP-6 Document-Generation       ── needs scoring verdict + schedule annex
7. SP-7 Workbook Export           ── inverse of import; last, reuses everything
```

**Rationale:** SP-1 is non-negotiably first (everything depends on the tables). SP-2 runs in parallel (no deps, needed by 4/6/7). **SP-3 should come third** because importing a known-good filled workbook immediately validates the SP-1 model end-to-end and yields realistic fixtures for everything downstream. SP-4 and SP-5 are the two pure "engines" — SP-4 first because it is fully self-contained and its monthly payment is an input to scoring factors 19–20. SP-6 then SP-7 are the generation layers that consume all prior outputs.

### Recommend brainstorming/spec FIRST: **SP-1 (Data-Model Extension)**
It is the hard dependency for all six other sub-projects, it surfaces every modeling decision (line-vs-tranche split, insurance/credit-history/scoring/schedule as first-class entities, area-field reconciliation, words storage vs render-time generation, pledgor distinction), and getting it right de-risks the entire program. Spec it with the §2 data dictionary and §7 gap table as the direct inputs. A strong second to spec in the same session is **SP-4 (Payment-Schedule Engine)**, because its formulas are fully decoded here (§5) and it has zero UI ambiguity — an ideal early win.

---

**Load-bearing reference:** the live schema is at `C:/Users/Administrator/Desktop/credit-core/apps/backend/prisma/schema.prisma`. The current models that already cover workbook data: `CreditCase`, `Borrower`, `Collateral`, `CollateralOwner`, `ValuationAct`, `Guarantor`, `Document`, `ImportJob`, `Branch`, `AppConfig`. The major missing entities are: **Organization, CreditLine, Tranche, InsurancePolicy, CreditHistory, ScoringFactor/score fields, PaymentSchedule/Installment, Employment, Affordability, IncomeCertificate, MonitoringAct, ClaimLetter**, plus per-case rate/penalty fields, repayment-method & loan-type enums, and amount/term words.