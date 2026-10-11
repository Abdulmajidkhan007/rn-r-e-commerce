# KidsWear — loyiha haqida

> Bolalar kiyimi do'koni: veb sayt + Android ilova bitta monorepoda.
> Jonli: https://kids-wear-007.web.app · APK: https://github.com/Abdulmajidkhan007/rn-r-e-commerce/releases/latest/download/kidswear.apk · Repo: https://github.com/Abdulmajidkhan007/rn-r-e-commerce
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
| Kirish: email/parol, Google | ✅ | Admin — Firebase custom claim (`role: admin`); egasi (`OWNER_EMAIL`, standart santexnika.atoyo@gmail.com) har deploy'da admin qilinadi — avval bir marta kirgan bo'lishi kerak |
| Admin: dashboard, mahsulot, toifa, buyurtma | ✅ | Rasm yuklash Storage talab qiladi (Blaze) |
| 3 til (uz/en/ru), dark/light | ✅ | Til hamma sahifada saqlangan tanlovga bo'ysunadi |
| Push bildirishnoma (FCM) | 🔒 | Functions (Blaze) + VAPID kalit kerak |
| Aloqa formasi | ✅ | Firestore `messages`; admin `/admin/messages` |
| Blog (uz/en/ru) | ✅ | Admin yozadi, `/blog`, `/blog/:slug`; matn — oddiy paragraflar, HTML yo'q |
| Promo-kod | ✅ | Foiz yoki summa, muddat, minimal summa; chegirma qoidalarda qayta hisoblanadi |
| Hudud bo'yicha yetkazish narxi | ✅ | 14 hudud, standart narx, bepul chegarasi; qoidalarda tekshiriladi |
| Sevimlilar | ✅ | `users/{uid}/favorites`, yurakcha tugmasi, `/favorites` |
| Admin hisobot | ✅ | Tushum, o'rtacha buyurtma, 30 kun / 12 oy grafik, eng ko'p sotilganlar |
| Android ilova | ✅ APK | Veb'dagi 1-guruh funksiyalari ilovada ham bor (promo, yetkazish, sevimlilar, blog, aloqa, admin bo'limlari). Har `main` push'da GitHub Release (`apk-release.yml`), debug kalit bilan imzolangan; Play Store'da yo'q |
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
6. **Pul hisobi uch joyda bir xil.** `computeOrderTotals` (subtotal − chegirma
   + yetkazish, depozit jamidan 50%) checkout'da, `useCheckout` da (promo va
   yetkazish sozlamasi buyurtma paytida qayta o'qiladi) va Firestore
   qoidalarida (`promoOk`, `deliveryOk`, `totalsOk`). Nega: qo'lda yozilgan
   buyurtma chegirma o'ylab topolmasin yoki yetkazishni tashlab ketolmasin.
   Cheklov: mahsulot narxlarini qoidalar tekshirmaydi — buning uchun Cloud
   Function (Blaze) kerak.
7. **MUI + Tailwind v4 cascade layer'lari.** MUI stillari `mui` layer'ida;
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

## 2026-10-11 — topilgan va tuzatilgan xatolar

- **Vebda Google bilan kirish umuman ishlamagan.** `initializeAuth` (`getAuth`
  dan farqli) popup resolver'ni qo'shmaydi — `signInWithPopup` oyna ochmasdan
  `auth/argument-error` berardi, tugma esa xatoni yutib yuborardi. Endi veb
  `browserPopupRedirectResolver` beradi va har qanday xato formada ko'rinadi.
- **APK ochilishi bilan yopilgan.** CI build'da `google-services.json` yo'q edi,
  `messaging()` startda "No Firebase App" bilan yiqitardi. Endi workflow Android
  ilova config'ini loyihadan oladi (debug SHA-1 ham ro'yxatga qo'shiladi), push
  kodi esa config yo'q bo'lsa jim o'chadi.
- **Admin hech kimga berilmagan edi** — deploy'dagi qo'lda "admin" maydoni hech
  qachon to'ldirilmagan. Endi egasi avtomatik.
- Google bilan qayta kirish profildagi manzillarni o'chirib yuborardi — tuzatildi.

