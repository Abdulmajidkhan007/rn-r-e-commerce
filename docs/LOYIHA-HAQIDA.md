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
| Mahsulot sahifasi, o'lcham/rang, savat | ✅ | Savat redux-persist bilan saqlanadi. 2026-10-22 dan zaxira va narx har o'lcham×rang turi uchun alohida (vebda sinalgan, telefonda emas) |
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

## 2026-10-22 — mahsulot turlari

Bolalar kiyimi o'lcham bo'yicha tugaydi, shuning uchun zaxira (va xohlansa narx)
endi har **o'lcham × rang** turi uchun alohida.

**Nima qilindi:**

- **Model** (`@kidswear/core`, `variant.ts`): mahsulotda `variants` —
  `{id, size, color, stock, price?, sku?}`; turlar `sizes × colors` dan yasaladi,
  admin o'chirgan kombinatsiyalar `variantsExcluded` da saqlanadi. Narx berilmasa —
  mahsulot narxi. Hammasi Zod sxemadan (`z.infer`).
- **Eski mahsulotlar:** `variants` yo'q bo'lsa bitta "standart" tur (mahsulot
  `stock`/narxi) — ma'lumotni migratsiya qilish shart emas, shuning uchun backfill
  skripti yozilmadi. Admin eski mahsulotni ochsa, turlar jadvali 0 zaxira bilan
  chiqadi va "zaxirani turlar bo'yicha taqsimlang" eslatmasi ko'rinadi.
- **Mahsulot `stock`** = turlar yig'indisi — admin mutatsiyasi har saqlashda
  hisoblaydi; katalogdagi `StockBadge` o'zgarmay ishlaydi.
- **Admin forma** (veb + mobil): o'lcham/rang kiritilgach jadval (vebda — jadval,
  telefonda — har tur alohida blok): zaxira, narx (ixtiyoriy), kod; turni olib
  tashlash va qaytarish. Yo'l-yo'lakay xato tuzatildi: o'lcham/rang maydonida
  vergul yozib bo'lmasdi (matn har harfda ro'yxatdan qayta yasalib, vergulni
  yutib yuborardi) — ikkinchi o'lchamni faqat paste bilan kiritish mumkin edi.
- **Mahsulot sahifasi** (veb + mobil): zaxirasi 0 bo'lgan kombinatsiya o'chiq va
  ustidan chizilgan; tanlangan tur narxi va "Omborda: N dona" ko'rsatiladi; turlar
  narxi har xil bo'lsa tanlovgacha "… dan". Tanlash mantiqi umumiy
  (`describeVariantPicker`).
- **Savat/buyurtma:** qator `variantId` saqlaydi; bir mahsulotning turli turlari
  alohida qator. Eski (redux-persist) savat qatorlari `variantId` siz ham ishlaydi.
  Checkout zaxirani tur bo'yicha qayta tekshiradi.
- **Qoidalar:** xatti-harakat o'zgarmadi (mahsulot yozish — faqat admin;
  `totalsOk`, `promoOk`, `deliveryOk` tegilmadi). Qoidalar testlari 57 → 61.
- **Seed:** `seed-emulator.mjs` va `seed.ts` turlar bilan (ba'zilari 0 zaxira,
  katta o'lcham qimmatroq); emulyator seed'ida 2 ta mahsulot ataylab turlarsiz.
- **Cloud Function** `onOrderCreate` (Blaze'da yoqiladi) endi turning zaxirasini
  kamaytiradi va `stock` ni yig'indi qiladi — hozir ishlamaydi, faqat unit test.

**Tekshirildi:** `type-check`, `lint`, `test` (unit 200), `test:rules` (61) yashil.
Vebda Firestore + Auth emulyatori va `seed-emulator.mjs` bilan Chromium
(Playwright) oqimi: admin 3 o'lcham × 2 rang mahsulot yaratdi, har turga zaxira,
bir turga alohida narx va kod berdi (saqlangan `stock` = yig'indi 15) → mijoz
(390 px) 98-o'lchamni tanlaganda zaxirasiz "ko'k" o'chiq → 110/ko'k (175 000)
va 104/qizil savatga alohida qator bo'lib tushdi → buyurtma `deposit_paid`,
qatorlarda `variantId` bor. Turlarsiz mahsulot ham savatga qo'shiladi.
Dark (1280 px) rejimda ham ko'rildi.

**Sinalmagan:** mobil ilova (APK) — admin turlar bloki va mahsulot ekranidagi
tanlash faqat type-check/lint'dan o'tdi, telefonda ko'rilmagan. Jonli
(`kids-wear-007`) bazada sinalmagan. Cheklov: zaxira buyurtmada kamaymaydi
(Spark — Functions yo'q), qator narxini qoidalar tekshirmaydi; katalog kartasi
mahsulotning asosiy narxini ko'rsatadi ("… dan" emas).

## 2026-10-22 — ombor

**Muammo:** Spark'da buyurtma berilganda zaxira kamaymasdi — buni faqat Blaze'dagi
`onOrderCreate` qilardi. Endi zaxirani admin klienti Firestore tranzaksiyasida yuritadi.

- **Tasdiqlashda zaxira yechiladi.** Admin buyurtmani `processing` ga (yoki to'g'ridan
  `shipped`/`delivered` ga) o'tkazganda bitta tranzaksiyada: har qator turining zaxirasi
  kamayadi, `stock` = turlar yig'indisi, `stockMoves` ga "sotuv" yozuvi, buyurtmaga
  `stockApplied: true`. Zaxira yetmasa tranzaksiya to'xtaydi — holat o'zgarmaydi, admin
  "… (98 / oq) uchun zaxira yetmaydi" xabarini ko'radi.
- **Ikki marta kamaymaydi.** `stockApplied` tranzaksiya ichida o'qiladi: qayta bosish,
  `processing → shipped`, bir xil holatni qayta saqlash — zaxiraga tegmaydi. Blaze'dagi
  `onOrderCreate` ham shu belgini o'qiydi/qo'yadi (va jurnalga `by: 'system'` yozadi), shuning
  uchun Functions yoqilganda ham ikki yo'l bir-birini takrorlamaydi.
- **Bekor/qaytarishda zaxira qaytadi.** Zaxirasi olingan buyurtma `cancelled` (yoki
  to'lanmagan holatga) qaytarilsa — "qaytish" yozuvi, `stockApplied: false`. Qayta
  tasdiqlansa yana bir marta yechiladi.
- **`stockMoves` jurnali:** `{productId, variantId, delta, reason, orderId?, note?, by,
  createdAt}`; sabablar: sotuv, qaytish, kirim, hisobdan chiqarish, inventarizatsiya. Faqat
  admin yozadi/o'qiydi; tahrirlab ham, o'chirib ham bo'lmaydi (qoidada).
- **"Ombor" sahifasi** — veb `/admin/inventory` va mobil admin ekrani: mahsulot × tur
  zaxirasi (0 — qizil, ≤5 — sariq), qidiruv, kirim, hisobdan chiqarish, inventarizatsiya
  (haqiqiy son → farq jurnalga), jurnal. Har amal tranzaksiyada. Turlarsiz (eski) mahsulot
  bitta "Yagona tur" qatori bo'lib ko'rinadi.
- **Mijoz bekor qilishi:** faqat `pending` buyurtmani, tasdiqlash dialogi bilan (veb +
  mobil). Qoidada: faqat egasi, faqat `pending → cancelled`, `cancelReason: 'customer'`,
  boshqa maydon o'zgarmaydi. Avval `deposit_paid` ni ham bekor qila olardi — endi yo'q
  (pul to'langan, qaytarish admin ishi). Uz tilida dialogning ikkala tugmasi ham "Bekor
  qilish" edi — endi "Buyurtmani saqlab qolish" / "Buyurtmani bekor qilish".
- **Eng kam buyurtma:** `settings/delivery.minOrder` (admin "Yetkazib berish"
  sahifasida). Checkout tekshiradi (tugma o'chadi, ogohlantirish) va qoidalar ham
  (`minOrderOk`, chegirmadan keyingi summa). Savatda "Bepul yetkazishga X qoldi" (bepul
  chegara bo'lsa) va eng kam summaga yetmasa ogohlantirish.
- **Yo'l-yo'lakay tuzatildi:** buyurtma `serverTimestamp()` bilan yangilangach lokal
  snapshot'da `updatedAt` vaqtincha `null` bo'lib, Zod konverteri xato tashlardi (sahifada
  ushlanmagan xato). Konverter endi `serverTimestamps: 'estimate'` bilan o'qiydi.
- `firebase.json` ga Auth emulyatori porti (9099) qo'shildi; `seed-emulator.mjs`
  `settings/delivery` ni (minOrder 100 000, bepul 500 000 dan) yozadi.

**Tekshirildi:** `type-check`, `lint`, `test` (unit), `test:rules` yashil — qoidalar
testlari 61 → 71 (mijoz jurnal/zaxiraga yoza olmaydi, boshqaning va `pending` bo'lmagan
buyurtmani bekor qila olmaydi, `minOrder` dan kam rad etiladi, admin tranzaksiyasi
o'tadi). Vebda Firestore + Auth emulyatori va seed bilan Chromium (Playwright), 25/25:
mijoz (390 px) savatda "Bepul yetkazishga … qoldi" → buyurtma (`deposit_paid`, zaxira
hali o'sha) → admin "Tayyorlanmoqda": tur zaxirasi 3 → 2, `stock` = yig'indi,
`stockApplied`, jurnalda sotuv −1 → "Jo'natildi": zaxira o'zgarmadi → "Bekor qilindi":
zaxira qaytdi, qaytish +1 → qayta tasdiq/bekor ham bir martadan; zaxirasiz turga
buyurtma tasdiqlanmadi (holat `pending` qoldi, ogohlantirish); mijoz o'z `pending`
buyurtmasini bekor qildi (`cancelReason: 'customer'`), to'langanida tugma yo'q; `minOrder`
dan kam buyurtmani qoidalar rad etdi; Ombor: kirim +5, chiqim −2, inventarizatsiya
(farq jurnalda), zaxiradan ko'p chiqim rad etildi, jurnal hamma yozuvni ko'rsatadi;
dark rejim 390 px da gorizontal skrollsiz.

**Sinalmagan:** mobil ilova (APK) — Ombor ekrani, buyurtma bekor qilish, savatdagi
bepul yetkazish/minimal summa va admin holat o'zgartirish faqat type-check/lint'dan
o'tdi, telefonda ko'rilmagan. Jonli (`kids-wear-007`) bazada sinalmagan. Blaze
`onOrderCreate` dagi belgi/jurnal o'zgarishi faqat type-check va unit test (Functions
o'chiq). Cheklovlar: zaxira faqat admin tasdiqlaganda yechiladi — tasdiqgacha bitta
oxirgi donani ikki mijoz buyurtma qilishi mumkin (tasdiqda ikkinchisi to'xtaydi);
qo'lda tahrirlash (mahsulot formasi) jurnalga yozilmaydi; o'chirilgan mahsulot
qaytarilganda zaxira qaytmaydi (qator o'tkazib yuboriladi).

## 2026-10-22 — kartaga o'tkazma

Spark'da haqiqiy pul olishning birinchi yo'li: mijoz depozitni do'kon kartasiga o'tkazadi,
chek rasmini yuklaydi, admin tekshirib tasdiqlaydi.

- **`settings/payment`** (hamma o'qiydi, admin yozadi): `transferEnabled`, `cardNumber`
  (faqat raqamlar, ekranda `8600 0000 0000 0000` ko'rinishida), `cardHolder`, `bank`,
  `note`. Admin → "To'lov sozlamalari" (veb `/admin/payment`, mobil admin menyusi). Yoqilgan
  bo'lsa 16 xonali karta va egasi majburiy (`PaymentSettingsSchema`). Karta faqat
  ko'rsatiladi — ilova hech qachon pul yechmaydi.
- **Checkout:** `PaymentProviderSchema` ga `transfer` qo'shildi. O'tkazma yoqilgan bo'lsa
  "Kartaga o'tkazma" birinchi va sukut bo'yicha tanlangan, "Sinov rejimi" ham qoladi.
  Buyurtma `pending`, `paidAmount: 0`, `payment: { provider: 'transfer', state: 'created' }`
  bilan yaratiladi va mijoz buyurtma sahifasiga o'tadi. Qoidalar o'tkazma o'chiq bo'lsa
  (yoki `settings/payment` yo'q bo'lsa) bunday buyurtmani rad etadi; `deposit_paid` ni
  mijoz o'zi yarata ham, o'zgartira ham olmaydi (avvalgidek faqat `mock`).
- **Buyurtma sahifasi (mijoz):** karta raqami, egasi, bank, izoh, o'tkaziladigan summa
  (depozit), vebda "Nusxa olish" (clipboard), mobilda raqam tanlanadigan matn + "Ulashish"
  (RN'da o'rnatilgan clipboard yo'q — yangi native kutubxona qo'shmadim). "Chek rasmini
  yuklash" → rasm qurilmada siqiladi (mahsulot rasmlari bilan bir xil ≤300 KB JPEG
  byudjeti) → `receipts/{orderId}_r{1..5}`. Cheklar ro'yxati holati bilan (Tekshirilmoqda /
  Tasdiqlandi / Rad etildi + sabab) real-time yangilanadi.
- **Admin buyurtmalar:** `transfer` buyurtmalarda "Cheklar" tugmasi, yangi cheklar soni
  nishonda (veb) / tugma matnida (mobil). Dialogda chek kattalashtiriladi; ✅ Tasdiqlash —
  bitta tranzaksiyada chek `approved` va buyurtma `deposit_paid`, `paidAmount =
  depositAmount`, `payment.state: 'paid'`, `payment.transactionId` = chek id
  (`reviewReceipt`, `@kidswear/firebase/receipts.ts`). `deposit_paid` zaxira yechmaydi (Faza 3
  qarori) — zaxira keyin admin "Tayyorlanmoqda" qilganda `changeOrderStatus` bilan.
  ❌ Rad etish — sabab majburiy, mijozga ko'rinadi; mijoz keyingi slotga yangi chek yuklaydi.
- **Qoidalar (`receipts`):** faqat buyurtma egasi, faqat o'zining `pending` + `transfer`
  buyurtmasiga yaratadi; id faqat `{orderId}_r1…_r5` — 6-chek va mavjud slotni qayta yozish
  rad etiladi; ≤420 000 belgi, faqat `data:image/jpeg;base64`; `status: 'pending'`,
  `createdAt == request.time`. O'qish — egasi va admin. Mijoz o'zgartira/o'chira olmaydi;
  admin faqat `status`/`reviewedBy`/`reviewedAt`/`note` ni, faqat `pending` chekda, bir marta
  o'zgartiradi. Hech kim o'chira olmaydi.
- **Seed:** `seed-emulator.mjs` `settings/payment` ni soxta karta (`8600 0000 0000 0000`,
  "KIDSWEAR TEST") bilan yozadi. Haqiqiy karta repoga tushmaydi — admin panelda kiritiladi.
- **PDF chek yo'q:** Firestore hujjatiga faqat siqilgan rasm sig'adi. Storage (Blaze)
  kelganda PDF va asl rasmni Storage'ga o'tkazish kerak (xuddi `PRODUCT_IMAGE_BACKEND`
  kabi).

**Tekshirildi:** `type-check`, `lint`, `test` (unit 237, shundan 13 tasi yangi:
karta formati, sozlamalar sxemasi, slot/limit, yuklash taqiqlari), `test:rules` 71 → 84
(boshqa foydalanuvchi chekni o'qiy/yarata olmaydi, 6-chek rad, mijoz `approved` qila
olmaydi va chekni o'chira olmaydi, mijoz `deposit_paid` qila olmaydi, o'tkazma o'chiq
bo'lsa buyurtma rad, admin faqat ko'rib chiqish maydonlarini bir marta o'zgartiradi, admin
tasdiq tranzaksiyasi o'tadi). Vebda Firestore + Auth emulyatori va seed bilan Chromium
(Playwright), 32/32: mijoz (390 px) checkout'da "Kartaga o'tkazma" sukut bo'yicha → buyurtma
`pending`/0 → sahifada karta `8600 0000 0000 0000`, summa, "Nusxa olish" 16 raqamni
clipboard'ga oladi → chek yuklandi (JPEG, ~26 000 belgi, `_r1`) → boshqa mijoz chekni
ko'rmaydi, REST o'qishi 403 → admin nishonda 1 ta yangi chek, kattalashtirdi, sabab bilan rad
etdi → mijoz sahifasida sabab darhol ko'rindi, buyurtma `pending` → yangi chek (`_r2`) →
admin tasdiqladi → buyurtma `deposit_paid`, `paidAmount = depositAmount`, `stockApplied`
yo'q, mijoz sahifasi real-time yangilandi, yuklash tugmasi yo'qoldi → admin o'tkazmani
o'chirdi → checkout'da variant yo'q; 16 xonasiz karta saqlanmadi → qayta yoqildi; dark rejim
390 px da gorizontal skrollsiz.

**Sinalmagan:** mobil ilova (APK) — checkout'dagi o'tkazma, chek tanlash/siqish
(`react-native-image-picker` + resizer), "Ulashish", admin cheklar oynasi va To'lov
sozlamalari ekrani faqat type-check/lint'dan o'tdi, telefonda ko'rilmagan. Jonli
(`kids-wear-007`) bazada va haqiqiy bank o'tkazmasi bilan sinalmagan. Vebda HEIC
(iPhone) rasm brauzer qo'llamasa siqilmaydi — umumiy xato chiqadi. Cheklovlar: rad etilgan
cheklar ham 5 talik limitga kiradi (5 tasi rad etilsa mijoz admin bilan bog'lanadi); admin
ro'yxatidagi nishon kutilayotgan cheklarni rasmlari bilan birga yuklaydi (kam bo'ladi,
lekin trafik bor); qoidalar `deposit_paid` ni tasdiqlangan chekka bog'lamaydi — admin
ishonchli (holat menyusidan qo'lda ham qo'yishi mumkin).

## 2026-10-22 — sharhlar

Mahsulotda reyting bor edi, lekin sharh yozib bo'lmasdi. Endi yetkazilgan buyurtmasi bor mijoz
sharh yozadi, admin moderatsiya qiladi, reyting moderatsiyadan keyin yangilanadi.

- **Model (`@kidswear/core/review.ts`):** `ReviewSchema` — `productId`, `userId`, `orderId`,
  `authorName` ("Ali V."), `rating` (1–5 butun), `text` (≤1000, ixtiyoriy), `status`
  (`visible`/`hidden`), `featured?`, `createdAt`, `updatedAt`. Yordamchilar:
  `reviewableProductIds`, `canEditReview`, `summarizeReviews`, `authorDisplayName`.
- **Kolleksiya:** `reviews/{orderId}_{productId}` — bitta buyurtmadagi bitta mahsulotga bitta
  sharh.
- **Qoidalar:** yaratish — faqat kirgan, `userId == auth.uid`, buyurtma o'ziniki va
  `delivered`, mahsulot buyurtma qatorlarida bor (qoida `items` ning 0–19 qatorlarini birma-bir
  tekshiradi — `productIds` maydoni qo'shilmadi, shuning uchun **eski buyurtmalar ham hech
  qanday ko'chirishsiz ishlaydi**; sabab DECISIONS.md "Reviews on Spark"da), id shakli
  tekshiriladi, `visible`, `featured` yo'q. O'qish: `visible` — hamma, `hidden` — muallif va
  admin. Muallif 7 kun ichida faqat baho/matnni tahrirlaydi. Admin faqat `status`/`featured`
  ni o'zgartiradi va o'chiradi.
- **Reyting:** mijoz `products` ga yozolmaydi. Admin sharhni ko'rsatsa/yashirsa/"Mijozlar
  fikri"ga qo'shsa/o'chirsa — bitta tranzaksiyada sharh va mahsulotning `rating`/`reviewCount`
  i (ko'rinadigan sharhlar o'rtachasi, 1 xona) yoziladi. "Reytinglarni qayta hisoblash"
  tugmasi hamma mahsulotni qayta sanaydi. Yangi sharh admin harakatigacha ro'yxatda ko'rinadi,
  lekin mahsulot reytingi o'zgarmaydi (ataylab — mahsulot sahifasi faqat saqlangan reytingni
  ko'rsatadi, ikki xil son chiqmasin).
- **Veb:** mahsulot sahifasida sarlavha ostida yulduz + "4.5 · 2 ta sharh", pastda "Sharhlar"
  ro'yxati (5 tadan, "Yana ko'rsatish"). Buyurtma sahifasida (`delivered`) har mahsulot
  ostida "Sharh yozish" → forma (yulduz majburiy, matn ixtiyoriy) → "Sizning sharhingiz" +
  "Sharhni tahrirlash" (7 kun) / "yashirilgan" belgisi. Bosh sahifada "Mijozlar fikri" (6
  tagacha). Admin → "Sharhlar" (`/admin/reviews`): filtr (hammasi/ko'rinadi/yashirilgan),
  yashirish/ko'rsatish, Mijozlar fikriga, o'chirish (tasdiq bilan), qayta hisoblash.
- **Mobil:** xuddi shu — mahsulot ekrani, buyurtma ekrani (yulduz tanlagich bilan dialog),
  bosh ekranda gorizontal "Mijozlar fikri", admin menyusida "Sharhlar" ekrani.
- **Seed (`seed-emulator.mjs`):** 8 ta sharh (4 tasi featured, 1 tasi yashirilgan spam),
  mahsulot reytinglari shulardan hisoblanadi. Auth emulyatori ishlayotgan bo'lsa ikkita faqat
  emulyator uchun hisob (`mijoz@kidswear.test`, `admin@kidswear.test`, parol
  `kidswear-demo`) va mijozga `delivered` buyurtma (`demo-delivered`, 2 mahsulot) yaratiladi.

**Tekshirildi:** `type-check`, `lint` (faqat oldingi ogohlantirish), `test` 237 → 254 (17
yangi: sxema/forma validatsiyasi, o'rtacha hisoblash, id, ism qisqartirish, 20 qator chegarasi,
7 kunlik muddat), `test:rules` 84 → 97 (xarid qilmagan yoza olmaydi; `delivered` bo'lmagan
buyurtma bilan yoza olmaydi; boshqaning buyurtmasi bilan yoza olmaydi; noto'g'ri id; takroriy
sharh rad; mijoz `hidden`/`featured`/noto'g'ri baho bilan yarata olmaydi, featured/status
o'zgartira va o'chira olmaydi; mahsulot reytingini yoza olmaydi; 7 kundan keyin tahrir rad;
hidden boshqaga ko'rinmaydi, filtrsiz so'rov rad; admin moderatsiya tranzaksiyasi o'tadi,
matnni o'zgartira olmaydi). Vebda Firestore + Auth emulyatori, seed va Chromium (Playwright),
32/32: anonim 390 px — bosh sahifada 4 ta "Mijozlar fikri", spam yo'q; mahsulotda "4.5 · 2 ta
sharh" va 2 sharh; yashirilgan sharh REST orqali anonimga 403 → mijoz buyurtma sahifasida 2 ta
"Sharh yozish", yulduzsiz yuborib bo'lmaydi, 4 yulduz yubordi (`authorName: "Ali V."`), tugma
"Sizning sharhingiz"ga aylandi, 5 ga tahrirladi; xuddi shu id bilan ikkinchi yaratish REST'da
403; mahsulot sahifasida sharh ko'rindi, reyting hali 0/0 → admin "Mijozlar fikriga" qo'shdi
→ mahsulot 5 · 1; yashirdi → 0 · 0; qaytardi → 5 · 1; boshqa sharhni o'chirdi → o'sha mahsulot
qayta sanaldi; qo'lda buzilgan `reviewCount` "qayta hisoblash" bilan tuzaldi; filtr ishlaydi
→ dark rejim 390 px: bosh sahifada yangi sharh (5 karta), mahsulotda "5.0 · 1", gorizontal
skroll yo'q, sahifa xatolarisiz.

**Sinalmagan:** mobil ilova (APK) — sharh ro'yxati, yulduz tanlagich dialogi, buyurtma
ekranidagi tugmalar, bosh ekrandagi blok va admin "Sharhlar" ekrani faqat type-check/lint'dan
o'tdi, telefonda ko'rilmagan. Jonli (`kids-wear-007`) bazada sinalmagan; yangi kompozit
indekslar (`firestore.indexes.json`) emulyatorda tekshirilmaydi — deploy'dan keyin
qurilishini kutish kerak. `scripts/seed.ts` (jonli seed) dagi soxta reytinglar o'zgartirilmadi
— admin "qayta hisoblash" ni bossa ular haqiqiy (sharhsiz bo'lsa 0) qiymatga tushadi.
Cheklovlar: yangi sharh admin harakatigacha reytingga kirmaydi; uzun buyurtmada (20 dan ortiq
qator) keyingi mahsulotlarga sharh yozib bo'lmaydi; admin ro'yxati oxirgi 200 ta sharhni
ko'rsatadi; muallif ismi mijoz yozgan matn (faqat uzunligi tekshiriladi).

