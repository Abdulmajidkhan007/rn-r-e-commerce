# KidsWear — loyiha haqida

> Bolalar kiyimi do'koni: veb sayt + Android ilova bitta monorepoda.
> Jonli: https://kids-wear-007.web.app · APK: https://github.com/Abdulmajidkhan007/rn-r-e-commerce/releases/latest/download/kidswear.apk · Repo: https://github.com/Abdulmajidkhan007/rn-r-e-commerce
> Oxirgi tekshiruv: 2026-10-21 (koddan va egasining telefonidagi APK 1.0.9 dan).

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
| Admin: dashboard, mahsulot, toifa, buyurtma | ✅ | Mahsulot rasmi Spark'da Firestore'ga siqib yoziladi (2026-10-21, telefonda hali sinalmagan). Profil rasmi (avatar) hali Storage'ga bog'liq — Blaze'siz ishlamaydi |
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

## 2026-10-12 / 13 — APK ochiladi

- **APK hali ham ochilishi bilan yopilardi** (`useState of null`): monorepo
  bundle'ida React ikki nusxada edi. Metro endi bitta React'ni oladi (PR #4).
- Mobil: ikonkalar ko'rinmasdi, til va tema tanlash qo'shildi, bosh sahifa
  dizayni yangilandi (PR #5).
- **Natija (2026-10-21, egasi tasdiqlagan):** APK **1.0.9** telefonda ochiladi —
  bosh sahifa, toifa, "Yangi" bo'limi, Blog, Aloqa va pastki navigatsiya
  ishlaydi. Ko'rinishdagi kichik nuqson: mahsulot kartasida yurakcha tugmasi
  mahsulot nomi ustiga tushib qolgan.
- Hali sinalmagan: ilovada Google bilan kirish, buyurtma berish to'liq oqimi.

## 2026-10-21 — mahsulot rasmi, rasmsiz karta, yurakcha

- **Sabab (o'lchandi):** `kids-wear-007` loyihasida Storage bucket umuman yo'q —
  `kids-wear-007.firebasestorage.app` ham, `kids-wear-007.appspot.com` ham
  "The specified bucket does not exist" (404) qaytaradi, Firestore esa ishlaydi.
  Spark'da yangi loyihaga bucket ochilmaydi, shuning uchun `uploadBytes` har
  safar yiqilardi; forma xatoni yutib, faqat "yuklashda xato" ko'rsatardi.
  Jonli bazadagi yagona mahsulot ("Test") rasmsiz (`images: []`).
- **Yechim (Blaze'siz):** rasm brauzerda (canvas) / ilovada (image-resizer)
  JPEG'ga siqiladi: 1080 px / sifat 0.8 dan boshlab, ≤300 KB ga sig'guncha
  720 px / 0.4 gacha pasayadi. Har rasm alohida `productImages/{id}` hujjati
  (base64 ≈400 KB, 1 MiB chegarasidan ancha past); mahsulotda faqat
  `kwimg:<id>` saqlanadi — mahsulot, savat va buyurtma hujjatlari kichik qoladi.
  Qoidalar: yozish faqat admin, faqat `data:image/...;base64`, ≤420 000 belgi,
  o'zgartirib bo'lmaydi (rasm keshda abadiy turadi), admin o'chira oladi.
  Qoidalar testlari 51 → 57 (biri ilovadagi converter orqali yozadi). Chromium'da o'lchandi: oddiy rasm 1-qadamda
  (~10 KB), eng og'ir holat (sof shovqin 4000×3000) 2-qadamda 295 KB.
- **Blaze ochilganda:** `packages/firebase/src/productImages.ts` da
  `PRODUCT_IMAGE_BACKEND = 'storage'` — yangi rasmlar Storage'ga ketadi, eski
  `kwimg:` havolalar ishlashda davom etadi.
- **Rasmsiz karta:** veb va mobilda umumiy `ProductImage` komponenti — rasm
  bo'lmasa yoki yuklanmasa ham ramka 4:5 o'lchamini saqlaydi, ichida ilgich
  ikonkasi (mavzu ranglarida, dark/light). Mahsulot sahifasi, savat, buyurtma
  sahifasi va admin formasidagi kichik rasmlar ham shu komponent orqali.
- **Mobil yurakcha:** rasm yo'q bo'lganda media bloki 0 balandlikda qolib,
  yurakcha nom ustiga tushardi. Endi blok har doim 4:5, yurakcha uning chap
  yuqori burchagida.
- **Sinalmagan / cheklovlar:** telefonda (APK) rasm tanlash–siqish–yozish
  oqimi hali sinalmagan; vebda brauzer orqali admin bilan to'liq oqim ham
  sinalmagan (siqish va qoidalar alohida tekshirildi). Formadan rasm olib
  tashlansa yoki forma bekor qilinsa, `productImages` hujjati o'chirilmaydi
  (yetim qoladi). Katalog kartasi to'liq o'lchamdagi rasmni yuklaydi
  (alohida kichik nusxa yo'q).

## 2026-10-21 — mahsulot kartasi

APK 1.0.10 sinovidan chiqqan kartadagi muammolar (mobil + veb):

- **Rasm eni:** mobil kartada media bloki endi `alignSelf: 'stretch'`, 4:5,
  `overflow: hidden` va yuqori burchaklar bo'yicha kesiladi; rasm `cover` bilan
  to'liq to'ladi (o'ngdagi bo'sh joy yo'qoldi). Vebda karta `overflow: hidden`,
  rasm kartaning o'zi bilan kesiladi.
- **Nishon va yurakcha:** "Mavjud" nishoni — chap yuqori, yurakcha — o'ng yuqori
  burchak; ikkalasi kichik (`dense` / `compact` variantlar) va rasm ichida.
  Vebda ham xuddi shunday joylashuv.
- **Proportsiya:** media 4:5 saqlandi; placeholder ham aynan shu o'lchamda.
  Karta eni endi aniq hisoblanadi (quyida), shuning uchun ortiqcha cho'zilmaydi.
- **Karta eni:** `useProductGrid` — telefonda 2, planshetda 3, keng ekranda 4
  ustun; karta eni qat'iy (bitta mahsulot ham boshqalardan keng bo'lmaydi).
  Bosh sahifa va katalog shuni ishlatadi.
- **Pastki padding:** Tab navigator tab bar va safe area'ni o'zi hisobga oladi,
  shuning uchun Home/Catalog'da qo'shimcha `insets.bottom` olib tashlandi
  (`spacing.xl` qoldi). Mahsulot sahifasi stack ekrani — u o'z `insets.bottom`ini
  saqlaydi.
- **Ulashish:** mahsulot sahifasi sarlavhasida `Share.share` tugmasi (matn: nomi).
  Havola yo'q — veb manzil mobil ilovada sozlanmagan.

**Tekshirildi:** `type-check`, `lint`, `test` yashil. Veb karta Chromium +
Firestore emulyatori + `seed-emulator.mjs` bilan dark/light, 375 va 1280 px da
ko'rildi (rasmli va placeholder).

**Telefonda hali sinalmagan:** mobil o'zgarishlarning barchasi (rasm to'ldirishi,
nishon/yurakcha o'lchami, ustunlar soni, pastki padding, ulashish tugmasi) —
APK qurilmadi, faqat tip/lint tekshiruvidan o'tdi. Telefonda tasdiqlash kerak.
