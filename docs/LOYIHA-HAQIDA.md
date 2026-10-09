# KidsWear — loyiha haqida

> Bolalar kiyimi do'koni: veb sayt + Android ilova bitta monorepoda.
> Jonli: https://kids-wear-007.web.app · Repo: https://github.com/Abdulmajidkhan007/rn-r-e-commerce
> Oxirgi tekshiruv: 2026-10-09 (koddan, taxmin emas).

## Nima uchun

O'zbek bozorida kichik kiyim do'koni uchun to'liq zanjir: katalog → savat →
oldindan to'lov (depozit) → buyurtma holati → admin panel. Ikki platforma
(veb va Android) bitta ma'lumot modeli, bitta tarjima va bitta dizayn
tokenlari ustida — biri o'zgarsa, ikkinchisi ortda qolmaydi.

## Hozir nima ishlaydi

| Qism | Holat | Izoh |
|---|---|---|
| Katalog, qidiruv, saralash, toifa filtri | ✅ | Qidiruv serverda: `searchTokens` + Firestore so'rovi |
| Mahsulot sahifasi, o'lcham/rang, savat | ✅ | Savat redux-persist bilan saqlanadi |
| Checkout + depozit | ✅ | Spark'da faqat "Sinov rejimi (test)" to'lovi |
| Payme / Click | 🔒 kod tayyor | Cloud Functions (Blaze) + merchant shartnomasi kerak |
| Buyurtmalar tarixi va holati (real-time) | ✅ | |
| Kirish: email/parol, Google | ✅ | Admin — Firebase custom claim (`role: admin`) |
| Admin: dashboard, mahsulot, toifa, buyurtma | ✅ | Rasm yuklash Storage talab qiladi (Blaze) |
| 3 til (uz/en/ru), dark/light | ✅ | Til hamma sahifada saqlangan tanlovga bo'ysunadi |
| Push bildirishnoma (FCM) | 🔒 | Functions (Blaze) + VAPID kalit kerak |
| Blog, Aloqa sahifalari | 🚧 | Hozircha bo'sh qolip (`PagePlaceholder`) |
| Android ilova | 🚧 | Yig'iladi (CI'da Metro bundle), Play Store'ga chiqmagan |
| Deploy | ✅ | Telefondan: `main` ga push → GitHub Actions → Firebase |

🔒 — kod bor, lekin Firebase **Blaze** rejasini kutadi. Billing hisobining
loyiha limiti to'lgan; hal bo'lgach `FIREBASE_PLAN` o'zgaruvchisi o'chiriladi.

## Arxitektura — asosiy qarorlar va nega

1. **Monorepo (npm workspaces + Turborepo), UI'dan boshqa hamma narsa umumiy.**
   `@kidswear/core` (Zod sxemalar), `data` (TanStack Query hook'lar), `store`
   (Redux Toolkit), `i18n`, `theme`, `firebase`. Nega: veb va mobil bitta
   biznes qoidasi bilan ishlashi kerak — narx, depozit, holat o'tishlari
   ikki joyda yozilsa, albatta ajralib ketadi.
2. **Zod — yagona manba.** Turlar `z.infer` bilan chiqariladi, qo'lda
   interfeys yozilmaydi. Nega: Firestore'dan kelgan ma'lumot ishonchsiz;
   sxema ham tekshiradi, ham tur beradi.
3. **Admin huquqi — custom claim, profildagi `role` emas.** Firestore
   qoidalari faqat token'dagi claim'ga ishonadi. Nega: profilni foydalanuvchi
   o'zi yozadi; claim'ni faqat server (`scripts/set-admin-claim.ts`) qo'yadi.
4. **To'lov server tasdiqlaydi.** Mijoz buyurtmani faqat `pending` holatda
   yarata oladi; `deposit_paid` ga Payme/Click webhook'i (Cloud Function)
   o'tkazadi. Nega: aks holda mijoz "to'ladim" deb yozib qo'yishi mumkin.
5. **Qidiruv tokenlari yozishda hisoblanadi.** Firestore matn qidirmaydi —
   har mahsulotga prefiks tokenlar yoziladi. Nega: alohida qidiruv serveri
   (Algolia/Typesense) kichik do'kon uchun ortiqcha xarajat.
6. **MUI + Tailwind v4 cascade layer'lari.** MUI stillari `mui` layer'ida;
   tartib (`theme, base, mui, components, utilities`) emotion'ning birinchi
   style'i sifatida e'lon qilinadi. Nega: 2026-10-09 gacha tartib noto'g'ri
   bo'lib, Tailwind reset'i MUI'ning hamma padding/ramkasini o'chirgan edi.

## Deploy (telefondan)

Batafsil — README, "Deploy from a phone". Qisqasi: GitHub'da
`FIREBASE_PROJECT_ID`, `FIREBASE_PLAN=spark` va `FIREBASE_SERVICE_ACCOUNT`;
**Actions → Deploy (Firebase) → Run workflow** (`seed` — demo katalog,
`admin` — emailga admin huquqi). Web config qo'lda kiritilmaydi.

## Tekshiruv

`npm run type-check && npm run lint && npm test` (Vitest: unit + web
komponentlar), `npm run test:rules` (Firestore qoidalari, emulyator). CI
uchala job'ni ham ishlatadi (2026-10-09 dan yashil).
