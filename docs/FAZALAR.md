# KidsWear — fazalar (atoyo'dan farq asosida)

> Manbalar: `docs/FUNKSIYALAR.md` (KidsWear, koddan) va atoyo-e-commerce
> `docs/FUNKSIYALAR-XARITASI.md` (commit 4e9f0bc, 2026-10-22). Tuzildi: 2026-10-22.
> Tartib: Blaze'siz fazalar birinchi. Bir vaqtda bitta ishchi, har faza — yangi sessiya,
> branch + PR, nazoratchi tekshiradi. Har ishchi: `npm run type-check && npm run lint && npm test`
> (+ qoidalar o'zgarsa `npm run test:rules`).

**Merge qoidasi (egasi, 2026-10-22, "A variant" — shu sessiyada tasdiqlangan):** Faza 2, 5, 6, 8, 9, 10, 11, 13 — nazoratchi
CI yashil va diff tekshirilgach o'zi merge qiladi. Faza 3, 4, 7, 12 — nazoratchi tekshiradi, egasi
merge qiladi; keyingi faza shundan keyin boshlanadi. Faza 14–20 — Blaze yoqilmaguncha boshlanmaydi.

Model tanlash: arxitektura, ma'lumot modeli, xavfsizlik qoidalari, to'lov, maxfiy kalitlar → **Opus**;
oddiy UI, matn, mexanik ish → **Sonnet**.

## Asosiy farq (arxitektura)

atoyo'da hamma yozuv server (Next.js API, Cloud Run) orqali o'tadi; KidsWear — Vite SPA +
Firestore qoidalari, Spark'da server yo'q. Shuning uchun Blaze'siz fazalarda himoya
**Firestore qoidalari** bilan, server ishi esa **admin klienti** yoki **GitHub Actions**
(Admin SDK, deploy paytida) bilan qilinadi.

## Chiqarib tashlanganlar (bolalar kiyimi do'koniga mos emas)

| atoyo funksiyasi | Sabab |
|---|---|
| O'rnatib berish xizmati (`installService`) | Santexnikaga xos |
| Material / brend / ishlab chiqaruvchi davlat filtrlari | Kiyim uchun o'rniga o'lcham, yosh, jins, narx oralig'i (Faza 9) |
| 1C narxnoma o'giruvchi | KidsWear 1C ishlatmaydi; CSV import yetarli (Faza 6) |
| Haqiqiy 3D model | atoyo'da ham sinovda, kiyim uchun foydasi kam, qimmat |
| Desktop Electron (chek chop, shtrix-skaner) | Oflayn kassa uchun; KidsWear onlayn do'kon |
| Stikerlar tizimi, Kotlin Glance widget | Kichik foyda; bot bo'lmaguncha ma'nosiz |
| "To'lovlar" (loyiha xarajatlari) sahifasi | atoyo'ning ichki buxgalteriyasi |
| Jumboq (secrets uchun savol) | KidsWear'da sir saqlovchi kolleksiya yo'q |
| Typesense | atoyo'da ham ishlamaydi; prefiks qidiruv + normalizatsiya yetarli |
| Next.js SSR | Arxitekturani butunlay almashtirish; SEO deploy'da statik fayllar bilan (Faza 10) |
| Payme Subscribe (karta ulash), Uzum Pay | Payme/Click jonli bo'lmaguncha erta |
| Instagram / Facebook / YouTube avto-post | Meta/Google ruxsati kerak; Faza 20 dan keyin, ixtiyoriy |

## Hozirgi holat (2026-10-22)

Faza 1–9 tugadi: 7 — PR #19 (egasi merge qildi, 2026-10-30), 8 — PR #21, 9 — PR #22 (2026-10-31). Keyingi: Faza 10 — SEO va a11y.

## Fazalar ro'yxati

| # | Faza | Blaze | Hajm | Bog'liq | Model | Holat |
|---|---|---|---|---|---|---|
| 1 | Mahsulot kartasi bugfix (APK 1.0.10 skrinshotlari) | yo'q | S | — | Sonnet | ✅ PR #7 merge, 2026-10-21; telefonda sinalmagan |
| 2 | Mahsulot turlari (o'lcham×rang: zaxira, narx, kod) | yo'q | L | — | Opus | ✅ PR #9 merge, 2026-10-22; mobil telefonda sinalmagan |
| 3 | Ombor: zaxira kamayishi, jurnal, mijoz bekor qilishi | yo'q | M | 2 | Opus | ✅ PR #11 egasi merge qildi, 2026-10-22; mobil telefonda sinalmagan |
| 4 | Kartaga o'tkazma + chek yuklash + admin tasdiq | yo'q | M | 3 | Opus | ✅ PR #13 egasi merge qildi, 2026-10-22; telefonda va haqiqiy o'tkazma bilan sinalmagan |
| 5 | Sharhlar va reyting, "Mijozlar fikri" | yo'q | M | 3 | Opus | ✅ PR #15 merge, 2026-10-22; mobil telefonda sinalmagan |
| 6 | Katalog boshqaruvi: chernovik, o'chirilganlar, ommaviy amal, CSV | yo'q | M | 2 | Sonnet | ✅ PR #17 merge (nazoratchi), 2026-10-25; CI yashil; admin UI brauzerda/emulyatorda va telefonda sinalmagan |
| 7 | Foyda hisoboti (yopiq tannarx) + foydalanuvchilar ro'yxati | yo'q | M | 2, 3 | Opus | ✅ PR #19 egasi merge qildi, 2026-10-30; vebda emulyatorda 13/13 oqim; mobil telefonda sinalmagan |
| 8 | Kontent: FAQ, Yetkazib berish sahifasi, checkout ko'rsatmalari | yo'q | S | — | Sonnet | ✅ PR #21 merge (nazoratchi), 2026-10-30; vebda emulyatorda FAQ/Yetkazish sahifasi sinaldi; mobil telefonda sinalmagan |
| 9 | Qidiruv va filtrlar: kirill→lotin, o'lcham/yosh/narx, o'xshashlar | yo'q | M | 2 | Sonnet | ✅ PR #22 merge (nazoratchi), 2026-10-31; CI yashil; vebda emulyatorda 10/10 oqim; mobil telefonda va indekslar jonli bazada sinalmagan |
| 10 | SEO va a11y: dinamik sitemap, JSON-LD, kontrast testi | yo'q | M | 9 | Sonnet | ⏳ |
| 11 | Ilova yangilanish banneri + do'kon TV ekrani `/tv` | yo'q | S | — | Sonnet | ⏳ |
| 12 | Xavfsizlik: CSP sarlavhalari + shifrlangan zaxira nusxa | yo'q | M | — | Opus | ⏳ |
| 13 | Play Store (eski 8b): release kalit, AAB CI, listing | yo'q* | M | 1 | Opus | ⏳ |
| 14 | 🔒 Blaze asosi: Functions, Storage, server narx tekshiruvi | **ha** | L | 3, 4 | Opus | 🔒 |
| 15 | 🔒 Telegram admin guruh: buyurtma, tugmalar, buyruqlar, xatolar | **ha** | L | 14 | Opus | 🔒 |
| 16 | 🔒 Bildirishnomalar jonli (push, email) + e'lon (broadcast) | **ha** | M | 14 | Sonnet | 🔒 |
| 17 | 🔒 Payme / Click jonli | **ha** | M | 14 | Opus | 🔒 |
| 18 | 🔒 AI yordamchi + rasm bo'yicha qidiruv | **ha** | L | 14 | Opus | 🔒 |
| 19 | 🔒 Optom narx, rollar/huquqlar, mehmon 1-klik buyurtma | **ha** | L | 14 | Opus | 🔒 |
| 20 | 🔒 Telegram kanal avto-post + mijoz boti | **ha** | L | 15 | Opus | 🔒 |

\* Faza 13 Blaze kutmaydi, lekin egasining Google Play Console hisobi (bir martalik 25 $) kerak.
Hajm: S — 1 kun, M — 2–3 kun, L — 4+ kun ishchi vaqti.

## Fazalar tafsiloti

### Faza 1 — Mahsulot kartasi bugfix ✅ (2026-10-21)
- **Maqsad:** APK 1.0.10 dagi karta nuqsonlari (rasm eni, yurakcha/nishon, placeholder, karta eni).
- **Natija:** PR #7 merge qilindi, CI yashil. Veb Chromium'da tekshirildi; mobil telefonda hali sinalmagan — keyingi APK'da egasi tasdiqlashi kerak.

### Faza 2 — Mahsulot turlari ✅ (2026-10-22)
- **Natija:** PR #9 merge, CI yashil, qoidalar 57 → 61 test. Vebda emulyator + Playwright bilan oqim sinaldi (admin 3×2 tur → mijoz tanlash → savat → buyurtma). Mobil faqat type-check/lint'dan o'tgan — telefonda sinalmagan. Spark'da zaxira hali kamaymaydi (Faza 3).
- **Maqsad:** bolalar kiyimida asosiy narsa — o'lcham. Zaxira va narx har o'lcham×rang uchun alohida bo'lsin.
- **Ishlar:** `@kidswear/core` da `variants` (dekart ko'paytma, har turga zaxira/narx/kod, o'chirilgan turlar); eski mahsulotlar uchun moslik (turlarsiz = bitta tur); admin forma (veb+mobil) turlar jadvali; mahsulot sahifasida mavjud bo'lmagan tur tanlanmaydi; savat va buyurtma qatorida `variantId`; qoidalar va testlar.
- **Tayyor:** admin 3 o'lcham × 2 rang yaratadi, har biriga zaxira beradi; mijoz faqat bor turni savatga qo'shadi; eski mahsulotlar buzilmaydi; qoidalar testlari yashil.
- **Model:** Opus — ma'lumot modeli, migratsiya va qoidalar keyingi fazalarning hammasiga ta'sir qiladi.

### Faza 3 — Ombor ✅ (2026-10-22)
- **Natija:** PR #11, egasi merge qildi. CI yashil, qoidalar 61 → 71 test. Admin tasdiqlaganda zaxira tranzaksiyada kamayadi + `stockMoves` jurnali, `stockApplied` bilan idempotent; mijoz faqat `pending` ni bekor qiladi; eng kam summa qoidalarda. Vebda emulyatorda 25/25 oqim. Cheklov: zaxira checkout'da emas, tasdiqda yechiladi. Mobil telefonda sinalmagan.
- **Maqsad:** Spark'da zaxira hozir **kamaymaydi** (faqat Blaze'dagi `onOrderCreate` qiladi). Buni Blaze'siz hal qilish.
- **Ishlar:** admin buyurtmani `processing` ga o'tkazganda admin klienti tranzaksiyada tur zaxirasini kamaytiradi (yetmasa — ogohlantirish); `stockMoves` jurnali (kirim, chiqim, sotuv, qaytish); admin "Ombor" sahifasi: kirim/chiqim, inventarizatsiya; mijoz `pending` buyurtmani bekor qila oladi (qoidada faqat o'z buyurtmasi, faqat `pending`→`cancelled`); bekor/qaytarilganda zaxira qaytadi; eng kam buyurtma summasi va "bepul yetkazishga X so'm qoldi".
- **Tayyor:** buyurtma tasdiqlanganda zaxira kamayadi va jurnalga yoziladi; ikki marta kamaymaydi (idempotent); mijoz faqat o'z kutilayotgan buyurtmasini bekor qiladi; qoidalar testlari.
- **Model:** Opus — tranzaksiya, idempotentlik va qoidalar.

### Faza 4 — Kartaga o'tkazma + chek ✅ (2026-10-22)
- **Natija:** PR #13, egasi merge qildi. CI yashil, qoidalar 71 → 84 test. Chek siqilgan JPEG sifatida `receipts/{orderId}_r1…r5` (≤5), faqat egasi va admin o'qiydi; admin tasdig'i tranzaksiyada chek + buyurtma `deposit_paid`. Vebda emulyatorda 32/32 oqim. Egasi qiladigan: admin panelda karta ma'lumotini kiritib o'tkazmani yoqish. Telefonda va haqiqiy o'tkazma bilan sinalmagan.
- **Maqsad:** Spark'da haqiqiy pul olish (hozir faqat "Sinov rejimi").
- **Ishlar:** `settings/payment` (karta raqami, egasi) admin sozlaydi; checkout'da "Kartaga o'tkazma" usuli; mijoz chek rasmini yuklaydi — `productImages` kabi siqilgan JPEG Firestore `receipts/{id}` ga (faqat egasi va admin o'qiydi, PDF yo'q — Storage kelganda); admin buyurtma sahifasida chekni ko'rib ✅/❌; `deposit_paid` ga faqat admin o'tkazadi; buyurtmaga 5 tadan ko'p chek yo'q.
- **Tayyor:** mijoz chek yuklaydi, admin tasdiqlaydi, holat real-time o'zgaradi; boshqa foydalanuvchi chekni o'qiy olmaydi; qoidalar testlari.
- **Model:** Opus — to'lov va shaxsiy ma'lumot.

### Faza 5 — Sharhlar ✅ (2026-10-22)
- **Natija:** PR #15 merge, CI yashil, qoidalar 84 → 97 test. Sharh `reviews/{orderId}_{productId}`: faqat `delivered` buyurtma egasi, buyurtmaning birinchi 20 qatoridagi mahsulotga; 7 kun tahrir; admin yashiradi/featured qiladi, reyting admin moderatsiyasida qayta hisoblanadi. Vebda emulyatorda 32/32 oqim. Sinalmagan: telefonda, jonli bazada, kompozit indekslar (emulyator tekshirmaydi).
- **Maqsad:** reyting hozir faqat ko'rinadi, yozib bo'lmaydi.
- **Ishlar:** `reviews` kolleksiyasi; faqat `delivered` buyurtmasi bor xaridor yozadi (qoidada buyurtmani `get` bilan tekshirish), bitta mahsulotga bitta sharh; admin yashiradi; `rating`/`reviewCount` admin moderatsiyasida qayta hisoblanadi; bosh sahifada "Mijozlar fikri" (admin tanlaganlar); veb+mobil.
- **Tayyor:** xarid qilmagan sharh yoza olmaydi (test); reyting yangilanadi; ikkala platformada.
- **Model:** Opus — qoidalarda boshqa hujjatga tayangan tekshiruv.

### Faza 6 — Katalog boshqaruvi ✅ kod (2026-10-25)
- **Natija (rost holat):** PR #17, nazoratchi merge qildi (CI yashil). `type-check`, `lint`, `npm test` (265 test, shundan Faza 6 — 11 yangi unit), `test:rules` (97 → 98) yashil. «50 qatorli CSV import → eksport bir xil» testi bor va o'tadi (CRLF, vergul/qo'shtirnoq/ko'p qatorli matn, turlar bilan). Qoidalar o'zgarmadi (`products` allaqachon admin-write); bitta qoida testi qo'shildi.
- **Qilindi:** `isDraft` va `deletedAt` (ixtiyoriy maydonlar); chernovik/o'chirilgan mahsulot har doim `isActive:false` (yagona vitrina filtri o'zgarmadi) + vitrina o'qishlarida qayta tekshiruv; o'chirish = «O'chirilganlar» (tiklash — nofaol holda qaytadi; 30 kundan eskilarini admin tugma bilan tozalaydi); veb admin: tanlash, ommaviy yashirish/toifaga ko'chirish/o'chirish, «rasmsizlarni yashirish», CSV eksport (BOM bilan) va import (oldindan ko'rish, xatolarda hech narsa import qilinmaydi, mavjud id o'tkazib yuboriladi, `isActive:false`). Tafsilot: DECISIONS.md «Catalog admin on Spark».
- **Sinalmagan:** veb admin UI brauzerda/emulyatorda qo'lda yurgizilmadi (faqat type-check/lint); Firestore ma'lumot qatlami (`trashProduct`, `bulkUpdateProducts`, `importProducts`) jonli yoki emulyator bazada ishga tushirilmadi — faqat sof funksiyalar va qoidalar sinaldi; telefonda hech narsa sinalmagan; kompozit indekslar kerak emas (yangi so'rov yo'q).
- **Qolgan/cheklov:** mobil adminga (2026-10-29) chernovik kaliti/belgisi, «O'chirilganlar» (tiklash, butunlay o'chirish, muddati o'tganlarni tozalash), uzun bosib tanlash + ommaviy yashirish/ko'chirish/o'chirish va «Rasmsizlarni yashirish» qo'shildi (veb bilan bir xil umumiy hook'lar; mobil CSV yo'q — shart emas); mobil UI telefonda/emulyatorda sinalmagan (faqat type-check/lint; mobil komponent testlari repoda yo'q); `products` o'qish ochiq, chernovikni id bilan xom Firestore API orqali o'qish mumkin; tozalangan mahsulot rasmlari (`productImages`) qoladi (Faza 14); `.xlsx` yo'q, faqat CSV.
- **Maqsad:** ko'p mahsulot bilan ishlashni tezlashtirish.
- **Ishlar:** chernovik (`isDraft`, vitrinada ko'rinmaydi); o'chirish = "O'chirilganlar"ga (tiklash mumkin, 30 kun keyin admin qo'lda yoki deploy paytida tozalanadi); ommaviy yashirish/ko'chirish/o'chirish; rasmsizlarni yashirish; CSV/Excel eksport va import (har tur alohida qator, import `isActive:false`).
- **Tayyor:** 50 qatorli CSV import va qayta eksport bir xil; o'chirilgan mahsulot tiklanadi.
- **Model:** Sonnet — admin UI va mexanik o'zgartirish; qoidalar o'zgarishi kichik.

### Faza 7 — Foyda hisoboti va foydalanuvchilar 🟡 kod (2026-10-25)
- **Natija (rost holat):** PR #19, merge qilinmagan (egasi qiladi). `type-check`, `lint` (0 xato; 1 eski ogohlantirish `ProductFormDialog`), `npm test` (265 → 286; yangi unit: tannarx, foyda, foydalanuvchilar), `test:rules` (98 → 109) yashil. Qoidalar testlari ataylab buzib tekshirildi: `productCosts` o'qishini ochganda 3 test qizardi.
- **Qilindi:** tannarx `productCosts/{productId}` (umumiy `cost` + har tur uchun `variants`), faqat admin o'qiydi/yozadi — mijoz va anonim `get`, `list`, `collectionGroup` bilan ham o'qiy olmaydi, yoza olmaydi (qoidalar testi). `products` ga tannarx qo'yilmadi. **CSV ga tannarx qo'shilmadi** (fayl paneldan tashqariga chiqadi va import formati ham shu — sabab DECISIONS.md «Profit report & users on Spark»). Admin buyurtmani tasdiqlaganda (Faza 3 tranzaksiyasi ichida) `orderCosts/{orderId}` bir marta yoziladi — o'sha paytdagi tannarx snapshot'i; qayta tasdiq/bekor/qayta tasdiqda o'zgarmaydi (qoidada update/delete yo'q). Tannarxi yo'q qator `null` — 0 deb hisoblanmaydi; bunday buyurtma tushumda bor, foydada yo'q va alohida ko'rsatiladi. Eski (Faza 7 dan oldin tasdiqlangan) buyurtmalarga admin tugma bilan HOZIRGI tannarxni `backfilled: true` belgisi bilan yozadi. Hisobot: davr (shu oy / 30 kun / 12 oy / hammasi / ixtiyoriy sana), tushum, tannarx, foyda (yetkazishsiz, chegirmadan keyin), marja, oylar jadvali. «Foydalanuvchilar» (`/admin/users`): ro'yxat, buyurtmalar soni, jami xarid, oxirgi buyurtma, qidiruv, saralash, sahifalash (klientda). Mobil: hisobot ekranida foyda kartasi (faqat ko'rish).
- **Sinaldi:** Firestore + Auth emulyatori, seed, Vite (emulyator rejimi) + Playwright, admin sifatida: tannarx kiritish → `productCosts` yozildi, `products` da tannarx yo'q; buyurtma «Tayyorlanmoqda» → `orderCosts` 280 000 va zaxira 18→15 bir tranzaksiyada; tannarxni o'zgartirib bekor → qayta tasdiq → jo'natildi: snapshot o'zgarmadi, zaxira bir marta olindi; hisobot foyda 287 000 / tannarx 280 000 / «1 ta tannarxsiz»; backfill → `backfilled: true`, `missingLines: 2`; foydalanuvchilar qatori (2 buyurtma, 1 092 000); sahifada JS xatosi yo'q — 13/13. Alohida: haqiqiy mijoz hisobi bilan klient SDK orqali 7 urinish (get/list/collectionGroup/yozish) — hammasi `permission-denied`.
- **Sinalmagan:** jonli bazada; telefonda (mobil foyda kartasi faqat type-check/lint); Blaze `onOrderCreate` bilan birga (snapshot keyin admin holatni tasdiqlaganda yoziladi — kodda bor, sinalmagan); ko'p foydalanuvchi/buyurtma bilan tezlik.
- **Qolgan/cheklov:** mobilda tannarx kiritish, backfill va foydalanuvchilar ro'yxati yo'q (vebda); mahsulot bo'yicha foyda jadvali yo'q (chegirmani qatorlarga bo'lish taxmin bo'lardi); foydalanuvchilar va `orderCosts` butun kolleksiya o'qiladi — katta hajmda server hisoblagichlari kerak (Faza 14+).
- **Maqsad:** tushum emas, foyda; mijozlarni ko'rish.
- **Model:** Opus — narx maxfiyligi qoidalari.

### Faza 8 — Kontent sahifalari
- **Maqsad:** atoyo'dagi `/savol-javob`, `/yetkazib-berish`.
- **Ishlar:** FAQ (admin tahrirlaydi, uz/en/ru); "Yetkazib berish" sahifasi `settings/delivery` dan yasaladi; yetkazish matni bitta funksiyada (veb, mobil, checkout, savat, footer bir xil); mobil ekranlar.
- **Tayyor:** narx sozlamada o'zgarsa hamma joyda o'zgaradi; ikkala platformada.
- **Model:** Sonnet — matn va UI.
- **Natija (2026-10-30):** `deliveryText()` (`packages/core/src/delivery.ts`) — yetkazish matnining yagona manbai (uz/en/ru, narx formati tashqaridan beriladi); veb va mobil savat, checkout, `/delivery` sahifasi va veb footer shuni ishlatadi (`useDeliveryText`); eski `cart.freeDeliveryLeft/Reached/minOrderLeft` kalitlari o'chirildi. `faqs` kolleksiyasi (ommaga o'qish, faqat admin yozadi) + admin veb `/admin/faq` (uz/en/ru). Mobilda `Faq` va `Delivery` ekranlari (Profil ro'yxatida havola), checkout'da «Bilib qoʻying» kartasi. Testlar: `deliveryText` 8 ta, FAQ qoidalari 3 ta (unit 294, qoidalar 112 — yashil). Vebda Firestore+Auth emulyatori + Playwright: `/faq` (2 savol, ochilishi), `/delivery` (oraliq narx, bepul chegara, minimal buyurtma, hududlar), footer matni, admin yangi savol qo'shdi → `/faq` da 3 ta. **Sinalmagan:** mobil ekranlar (faqat type-check/lint), checkout hint kartasi brauzerda ko'rilmadi, jonli bazada sinalmagan.

### Faza 9 — Qidiruv va filtrlar
- **Ishlar:** `buildSearchTokens` da kirill→lotin va o'zbek apostroflari; filtrlar: o'lcham, yosh, jins, narx oralig'i (indekslar); faqat mahsuloti bor toifalar chiplari; mahsulot sahifasida "O'xshashlar".
- **Tayyor:** "куртка" lotin nomli mahsulotni topadi; filtrlar birga ishlaydi; indekslar `firestore.indexes.json` da.
- **Model:** Sonnet — mavjud qidiruv ustidagi mexanik kengaytma.
- **Natija (2026-10-31, rost holat):** `type-check`, `lint` (0 xato; 1 eski ogohlantirish), `npm test` (312 test, 34 fayl; Faza 8 da 294), `test:rules` yashil (qoidalar o'zgarmadi).
- **Qilindi:** `buildSearchTokens`/`searchQueryToken` da kirill→lotin transliteratsiya (ў қ ғ ҳ ham) va apostroflar (ʻ ʼ ʹ ‘ ’ ′ ´ ` ') olib tashlanadi, shuning uchun «o'g'il», «ʻogʻil», «ogil» bir xil token; «куртка» → `kurtka`. Eski mahsulotlar: admin «Qidiruv tokenlarini qayta hisoblash» tugmasi (`/admin/products`) yoki `scripts/backfill-search-tokens.ts`. Filtrlar — o'lcham, jins, yosh oralig'i, narx oralig'i — `useProducts({ filters })` orqali veb va mobilda bitta hook; `Product` ga ixtiyoriy `gender` (`boys|girls|unisex`), `ageFromMonths`, `ageToMonths` (admin formada veb+mobil). Faqat mahsuloti bor toifalar chiplari (`useCategoriesWithProducts`, count aggregation). «O'xshashlar» (`pickSimilar`, `useSimilarProducts`) veb+mobil. Matnlar uz/en/ru. 24 yangi kompozit indeks `firestore.indexes.json` da. Tafsilot: DECISIONS.md «Search & filters (Phase 9)».
- **Sinaldi:** Firestore+Auth emulyatori, seed, Vite + Playwright (veb): bo'sh toifa yashirin, «куртка» 3 ta lotin nomli kurtkani topdi, `ko'ylak` topdi, jins/narx/(yosh+jins+o'lcham) filtrlari toraytiradi, mahsulot sahifasida «O'xshashlar» — 10/10, JS xatosi yo'q.
- **Sinalmagan:** mobil ekranlar (faqat type-check/lint); jonli baza; yangi indekslar deploy qilinmagan (`firebase deploy --only firestore:indexes`) — emulyator indeksni tekshirmaydi, shuning uchun yangi so'rov birikmalari jonli bazada indeks qurilguncha xato beradi; mavjud mahsulotlarda `gender`/yosh yo'q — admin to'ldirmaguncha ular jins/yosh filtrida ko'rinmaydi; «tokenlarni qayta hisoblash» jonli bazada ishga tushirilmagan (eski mahsulotlar qayta hisoblanmaguncha kirillcha qidiruvda topilmaydi, eski kirill tokenlari ham endi mos kelmaydi).
- **Cheklov:** narx va yosh filtri xotirada (Firestore'da bitta so'rovda ikki oraliq/qo'shimcha array-contains bo'lmaydi) — sahifa to'lmasa hook keyingi sahifalarni (8 tagacha) o'zi yuklaydi; qidiruv bilan birga o'lcham ham xotirada; o'lchamlar ro'yxati 200 tagacha faol mahsulotdan yig'iladi; «O'xshashlar» faqat shu toifadan (60 tagacha nomzod) tanlanadi.

### Faza 10 — SEO va a11y
- **Ishlar:** deploy'da (Actions, Admin SDK) mahsulot va blog bilan `sitemap.xml`; JSON-LD (Product, Article, FAQPage); sahifa sarlavhalari/OG; a11y: aria-label, fokus, modalda Escape, WCAG AA kontrast testi (dark/light tokenlari uchun).
- **Tayyor:** sitemap'da hamma faol mahsulot; kontrast testi CI'da.
- **Model:** Sonnet.

### Faza 11 — Ilova yangilanishi va TV
- **Ishlar:** `apk-release.yml` yangi versiyani `settings/app` ga yozadi; ilova eski bo'lsa banner + yuklash havolasi; `/tv` — do'kon ekrani (karusel, narx, QR, wakeLock).
- **Tayyor:** eski APK banner ko'rsatadi; `/tv` to'liq ekranda aylanadi.
- **Model:** Sonnet.

### Faza 12 — Xavfsizlik va zaxira
- **Ishlar:** `firebase.json`/`netlify.toml` da CSP va boshqa sarlavhalar (nonce'siz, Firebase/Google domenlari); GitHub Actions kunlik Firestore eksporti — repo ochiq bo'lishi mumkinligi uchun **shifrlab** (kalit secret'da) artifact sifatida, 30 kun; tiklash skripti.
- **Tayyor:** sayt CSP bilan ishlaydi (Google kirish ham); zaxira shifrlangan, tiklash emulyatorda sinalgan.
- **Model:** Opus — xavfsizlik va shaxsiy ma'lumot.

### Faza 13 — Play Store
- **Ishlar:** release keystore GitHub secret'da (repoga tushmaydi); CI'da imzolangan AAB; versionCode siyosati; `store/` listing, skrinshotlar, maxfiylik havolasi; SHA-1 Firebase'ga.
- **Tayyor:** imzolangan AAB artifact; listing to'liq. Yuklashni egasi qiladi.
- **Model:** Opus — imzolash kalitlari.

### Faza 14–20 — 🔒 Blaze ochilgach
- **14:** Functions va Storage deploy; `PRODUCT_IMAGE_BACKEND='storage'`, avatar, chek PDF, kichik rasm nusxalari, yetim rasmlarni tozalash; `onOrderCreate` da narxni server qayta hisoblaydi.
- **15:** Telegram admin guruh (topic, holat tugmalari, xodim buyruqlari, xatolar topic'i).
- **16:** push jonli, email; e'lon (bot obunachilari, email, push).
- **17:** Payme/Click merchant kalitlari, sandbox to'plami.
- **18:** AI yordamchi (bitta miya: sayt/ilova, tool use, mavzu chegarasi, oylik $ chegarasi) + rasm bo'yicha qidiruv.
- **19:** optom narx (yopiq), rollar/huquqlar, mehmon 1-klik buyurtma (server rate limit).
- **20:** Telegram kanal avto-post navbati, mijoz boti.
Har biri boshlanishidan oldin Blaze yoqilganini egasi tasdiqlaydi.

*Oxirgi yangilanish: 2026-10-31 (Faza 9 — PR ochildi)*
