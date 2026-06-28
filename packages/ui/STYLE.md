# UI uslub qoidalari (credit-core/ui)

Butun mahsulot bir xil ko'rinishi uchun yangi komponent yozganda shu qoidalarga amal qiling.

## 1. Yuzalar (kartalar/panellar) — yagona manba
Hech qachon `rounded-2xl border ... shadow-card ...` ni qo'lda takrorlamang.
Har doim `lib/surfaces.ts` dan oling:

```tsx
import { cn } from '../lib/cn';
import { surface, cardPad } from '../lib/surfaces';

<div className={cn(surface, cardPad, className)}>…</div>
```

- `surface` — radius + hairline border + `shadow-card` + dark mode (soya hamma joyda bir xil "turadi").
- `surfaceInteractive` — bosiladigan kartalar uchun (hover ko'tarilish).
- `cardPad` / `cardPadSm` — ichki padding.

Tayyor komponentlar: `Card` (primitives), `MetricCard`, `WidgetCard` (widgets) — hammasi shularga asoslangan.

## 2. Ranglar — faqat semantik token
Xom hex ishlatmang. Faqat preset token'lari:
`brand-*`, `navy-*`, `surface`, `canvas`, `ink`, `muted`, `hairline`,
`success-*`, `warning-*`, `danger-*`. Dark variant: `dark:bg-navy-800`, `dark:border-white/10`.

## 3. Soya
Faqat preset soyalari: `shadow-card` (kartalar, default), `shadow-soft` (hover/CTA), `shadow-pop` (modal/popover). Boshqa qiymat qo'shmang.

## 4. Shrift
Body: Fira Sans (default). Sarlavha/raqam: `font-heading` yoki `h1/h2/h3` (avtomatik Fira Code). Pul/raqam ustunlari: `.nums` (tabular).

## 5. Dashboard widgetlari
KPI uchun `<MetricCard icon label value delta? tone />`, bo'limlar uchun `<WidgetCard title action?>…</WidgetCard>`. Yangi karta yasamang — shularni ishlating.

## 6. Layout
Barcha app'lar `AppShell` ichida. Sidebar holati (ochiq/yig'ilgan) `localStorage` da saqlanadi (`cc.sidebar.collapsed`).

## 7. Radius
Kartalar `rounded-2xl`, ichki elementlar (tugma, input, ikonka-box) `rounded-xl`, kichik nishonlar `rounded-lg`/`rounded-full`.
