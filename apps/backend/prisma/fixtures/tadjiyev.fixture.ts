/**
 * SP-1 round-trip fixture: builds one CreditCase with every new relation populated
 * from the TADJIYEV ATABEK JANGIROVICH sample workbook, reads it back, asserts, cleans up.
 * Run: ts-node prisma/fixtures/tadjiyev.fixture.ts   (dev MySQL on 3307 must be up)
 */
import { PrismaClient, ProductType, Gender, LoanType, RepaymentMethod, ScoringVerdict, CaseStatus } from '@prisma/client';

const prisma = new PrismaClient();
const FIXTURE_NUMBER = 'FIXTURE-1199-TR';

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error('ASSERT FAILED: ' + msg);
}

async function main() {
  // Make the fixture re-runnable: drop any leftover from a prior failed run (cascades to children).
  await prisma.creditCase.deleteMany({ where: { number: FIXTURE_NUMBER } });

  // Org config (singleton) + reuse the seeded operator/branch.
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
      licenseDate: new Date('2019-06-22'),
    },
  });

  const operator = await prisma.user.findUniqueOrThrow({ where: { login: 'operator' } });
  const branch = await prisma.branch.findUniqueOrThrow({ where: { symbol: 'BR' } });

  const created = await prisma.creditCase.create({
    data: {
      number: FIXTURE_NUMBER,
      productType: ProductType.REAL_ESTATE,
      status: CaseStatus.DRAFT,
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
          birthDate: new Date('1979-06-24'),
          pinfl: '32406793420044',
          passportSeries: 'KA',
          passportNumber: '1191531',
          passportExpiry: new Date('2028-08-07'),
          regAddress: "QORAQALPOG'ISTON RESPUBLIKASI TO'RTKO'L TUMANI",
          phones: [{ number: '91-269-79-00', owner: 'OZI' }, { number: '90-708-07-27', owner: "O'G'LI" }],
          maritalStatus: 'турмуш курган',
          familySize: 5,
          childrenCount: 3,
          education: 'олий',
        },
      },
      employment: {
        create: { employer: 'XususiyTadbirkor', sector: 'savdo', sectorRiskCode: 12, position: 'rahbar', experienceBand: 'до 3 лет' },
      },
      affordability: {
        create: { avgMonthlyIncome: '18838000', dtiRatio: 0.4545, surplus: '8336647', netAfterDebt: '10275647' },
      },
      creditHistory: {
        create: { repaidLoansCount: 2, activeLoansCount: 0, overdueSubstandardFlag: 0, otherObligations: 0, totalOutstandingDebt: '4654239', avgMonthlyPaymentExisting: '502353', committeeProtocolRef: '73-2020' },
      },
      scoring: {
        create: {
          totalScore: 77, maxScore: 100, verdict: ScoringVerdict.APPROVED, age: 47.0,
          monthlyTranches: '8562353', monthlyIncome: '18838000', monthlyExpenses: '10501353', surplus: '8336647', netAfterDebt: '10275647',
          factors: { create: [
            { factorNo: 1, name: 'Пол', points: 1, maxPoints: 2 },
            { factorNo: 19, name: 'Транш/доход', points: 22, maxPoints: 22 },
            { factorNo: 20, name: '(Доход-расход)/транш', points: 21, maxPoints: 21 },
          ] },
        },
      },
      incomeCertificate: {
        create: {
          employer: 'XususiyTadbirkor', certNo: 'SPR-1', certDate: new Date('2026-06-20'), avgMonthlyNet: '18838000',
          months: { create: [
            { monthIndex: 1, gross: '20000000', tax: '1162000', net: '18838000' },
            { monthIndex: 2, gross: '20000000', tax: '1162000', net: '18838000' },
          ] },
        },
      },
      creditLine: {
        create: {
          lineNumber: '№ 1199 TR', loanType: LoanType.MICROCREDIT,
          amountAuto: '90000000', amountPolis: '60000000', amountTotal: '150000000',
          termMonths: 60, lineDate: new Date('2026-06-25'), interestRate: '0.5500', penaltyRate: '1.0500', orderNumber: '1881 MFL 1199 TR',
          insurance: {
            create: { insured: true, company: 'АО "TRUST INSURANCE"', policyTermMonths: 24, loanUnderPolicy: '60000000', insuredSum: '78000000', insuranceRate: '0.0200', premium: '3120000' },
          },
          tranches: {
            create: [{
              trancheNo: 1, applicationNo: '№ 1881 MFL 1199 TR', applicationDate: new Date('2026-06-25'),
              principal: '130000000', termMonths: 30, scheduleType: RepaymentMethod.ANNUITY, monthlyPayment: '8060000', insurancePayment: '3120000',
              schedule: {
                create: {
                  method: RepaymentMethod.ANNUITY, principal: '130000000', termMonths: 30, annualRate: '0.5500',
                  disbursementDate: new Date('2026-06-25'), paymentDayCap: 25,
                  installments: { create: [
                    { seq: 1, dueDate: new Date('2026-07-25'), openingBalance: '130000000', principal: '2100000', interest: '5960000', total: '8060000', days: 30 },
                    { seq: 2, dueDate: new Date('2026-08-25'), openingBalance: '127900000', principal: '2200000', interest: '5860000', total: '8060000', days: 31 },
                  ] },
                },
              },
            }],
          },
        },
      },
      collaterals: {
        create: [{
          type: ProductType.REAL_ESTATE, agreedValue: '126000000', position: 1,
          address: "QORAQALPOG'ISTON RESPUBLIKASI", propertyType: 'YAKKA TARTIBDAGI TURAR JOY',
          totalAreaM2: 120.5, livingAreaM2: 85.0, landAreaM2: 300.0, usableAreaM2: 100.0, roomCount: 4,
          owners: { create: [{ fullName: 'TADJIYEV ATABEK JANGIROVICH', isBorrowerOwner: true, sharePercent: 100, regAddress: "QORAQALPOG'ISTON RESPUBLIKASI" }] },
        }],
      },
    },
  });

  // Read back with every relation.
  const full = await prisma.creditCase.findUniqueOrThrow({
    where: { id: created.id },
    include: {
      borrower: true, employment: true, affordability: true, creditHistory: true,
      scoring: { include: { factors: true } },
      incomeCertificate: { include: { months: true } },
      creditLine: { include: { insurance: true, tranches: { include: { schedule: { include: { installments: true } } } } } },
      collaterals: { include: { owners: true } },
    },
  });

  assert(full.borrower?.gender === Gender.MALE, 'borrower gender');
  assert((full.borrower?.phones as any[]).length === 2, 'borrower phones json');
  assert(full.scoring?.totalScore === 77, 'scoring total');
  assert(full.scoring?.factors.length === 3, 'scoring factors');
  assert(full.incomeCertificate?.months.length === 2, 'salary months');
  assert(full.creditLine?.loanType === LoanType.MICROCREDIT, 'loan type');
  assert(full.creditLine?.insurance?.insured === true, 'insurance');
  assert(full.creditLine?.tranches[0].schedule?.installments.length === 2, 'installments');
  assert(full.collaterals[0].owners[0].isBorrowerOwner === true, 'pledgor flag');
  assert(Number(full.creditLine?.amountTotal) === 150000000, 'line amount total');

  // Cleanup (cascades to every child).
  await prisma.creditCase.delete({ where: { id: created.id } });
  // eslint-disable-next-line no-console
  console.log('✅ SP-1 round-trip OK — full case persisted, read back, asserted, and cleaned up.');
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
