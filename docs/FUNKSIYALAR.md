# KidsWear — funksiyalar xaritasi (rost holat)

> Koddan tuzildi: `apps/web/src/app/router.tsx`, `apps/mobile/src/navigation/RootNavigator.tsx`,
> `packages/*`, `functions/src/index.ts`, `firestore.rules`, `DECISIONS.md`, `docs/`.
> Sana: 2026-10-21. Firebase rejasi: **Spark** (`FIREBASE_PLAN=spark`).

Belgilar: ✅ bor va ishlaydi · 🟡 bor, lekin telefonda/jonli oqimda hali sinalmagan ·
🔒 kod bor, Blaze kutadi · ❌ yo'q.

## 1. Xaridor tomoni

| Funksiya | Veb | Mobil | Izoh |
|---|---|---|---|
| Bosh sahifa | ✅ `/` | ✅ Home | Mobil 1.0.9 telefonda tasdiqlangan |
| Katalog, toifa filtri, saralash, sahifalash | ✅ `/catalog` | ✅ Catalog | Firestore keyset pagination |
| Qidiruv (so'z prefiksi) | ✅ | ✅ | `searchTokens` + `array-contains`; ichki qism (infix) qidiruvi yo'q |
| Mahsulot sahifasi, o'lcham/rang, eski narx | ✅ `/product/:id` | ✅ ProductDetail | |
| Mahsulot rasmi | ✅ | 🟡 | Spark'da `productImages/{id}` (Firestore, siqilgan JPEG). Rasmsiz karta placeholder bilan |
| Reyting yulduzchalari | ✅ ko'rinadi | ✅ ko'rinadi | Faqat `rating`/`reviewCount` maydoni — **sharh yozish yo'q** ❌ |
| Savat (saqlanadi) | ✅ | ✅ | redux-persist |
| Checkout + 50% depozit | ✅ | 🟡 | Mobil to'liq buyurtma oqimi telefonda sinalmagan |
| Promo-kod | ✅ | ✅ | Qoidalarda qayta hisoblanadi |
| Hudud bo'yicha yetkazish narxi (14 hudud) | ✅ | ✅ | Bepul chegarasi bor |
| To'lov: "Sinov rejimi (test)" | ✅ | ✅ | Spark'dagi yagona to'lov |
| To'lov: Payme / Click | 🔒 | 🔒 | Webhook Cloud Function + merchant shartnomasi |
| Buyurtmalar tarixi, holat (real-time) | ✅ `/orders` | ✅ Orders | |
| Sevimlilar | ✅ `/favorites` | ✅ Favorites | `users/{uid}/favorites` |
| Blog | ✅ `/blog` | ✅ Blog | Oddiy paragraflar |
| Aloqa formasi | ✅ `/contact` | ✅ Contact | Firestore `messages` |
| Maxfiylik / shartlar | ✅ | ✅ | `@kidswear/legal` |
| Kirish: email/parol, parolni tiklash | ✅ | ✅ | |
| Google bilan kirish | ✅ | 🟡 | Ilovada telefonda sinalmagan |
| Profil, manzillar | ✅ | ✅ | |
| Avatar yuklash | 🔒 | 🔒 | Hali Storage'ga bog'liq; loyihada bucket yo'q |
| Biometrik qulf (AppLock) | — | ✅ | Faqat mobil |
| 3 til (uz/en/ru), dark/light | ✅ | ✅ | |
| Push bildirishnoma (FCM) | 🔒 | 🔒 | Klient kodi bor; jo'natuvchi Functions + VAPID |
| PWA manifest, favicon, OG, sitemap, robots | ✅ | — | sitemap statik (mahsulotlar yo'q) |

## 2. Admin tomoni (custom claim `role: admin`)

| Funksiya | Veb | Mobil | Izoh |
|---|---|---|---|
| Dashboard | ✅ `/admin` | ✅ AdminHome | |
| Mahsulotlar CRUD + rasm | ✅ | 🟡 | Rasm siqish–yozish oqimi admin bilan jonli sinalmagan |
| Toifalar CRUD | ✅ | ✅ | |
| Buyurtmalar, holatni o'zgartirish | ✅ | ✅ | |
| Hisobot (tushum, o'rtacha chek, 30 kun/12 oy, top mahsulot) | ✅ | ✅ | Klientda hisoblanadi |
| Xabarlar (aloqa formasi) | ✅ | ✅ | |
| Blog yozish | ✅ | ✅ | |
| Promo-kodlar | ✅ | ✅ | |
| Yetkazish narxlari | ✅ | ✅ | |
| Egasini avtomatik admin qilish | ✅ | — | Har deploy'da `OWNER_EMAIL` |

## 3. Server (Cloud Functions) — hammasi 🔒 Blaze

| Funksiya | Fayl | Holat |
|---|---|---|
| `onOrderCreate` — omborni tranzaksiyada kamaytirish, yetmasa bekor qilish, adminlarga push | `functions/src/triggers/onOrderCreate.ts` | 🔒 |
| `onOrderUpdate` — holat o'zgarsa mijozga push | `triggers/onOrderUpdate.ts` | 🔒 |
| `paymeWebhook`, `clickWebhook` | `functions/src/payments/` | 🔒, unit-test bor, sandbox'da sinalmagan |

**Muhim oqibat (Spark):** ombor (`stock`) hozir **kamaymaydi** — buni faqat
`onOrderCreate` qiladi, `firestore.rules` esa `stock`ni tekshirmaydi. Shuningdek,
mahsulot narxini qoidalar tekshirmaydi (DECISIONS: Blaze'da Function bilan).

## 4. Yo'q narsalar (❌)

Sharh/reyting yozish, mahsulot variant bo'yicha ombor (o'lcham×rang), optom narx,
ombor boshqaruvi sahifasi, Telegram bot/guruh, e'lon (broadcast), AI yordamchi,
Play Store chiqarilishi, release kalit bilan imzolangan APK (hozir debug kalit),
mahsulotlar bilan dinamik sitemap, rasm kichik nusxalari (thumbnail), yetim
`productImages` tozalash.

## 5. Fazalar tarixi

| Faza | Mavzu | Holat |
|---|---|---|
| 0 | Monorepo, TS strict, umumiy paketlar | ✅ |
| 1 | Firebase qatlami | ✅ |
| 2 | Autentifikatsiya | ✅ |
| 3 | Biometrik AppLock, profil/manzil | ✅ |
| 4 | Katalog va data qatlami | ✅ |
| 5 | Savat va checkout | ✅ |
| 6 | Rasm va admin | ✅ |
| 7 | Cloud Functions + push | ✅ kod / 🔒 deploy |
| 8a | Brend, huquqiy sahifalar, Netlify, SEO | ✅ |
| 8b | Production Android build + Play Store | ❌ qilinmagan |
| 9 | — | Repoda alohida "Phase 9" yozuvi yo'q (Expo → bare RN ko'chishi shu oraliqda) |
| 10 | UI yangilash + Google Sign-In | ✅ |
| Keyin | Payme/Click kodi, server qidiruvi, emulyator, CI, Spark rasm | ✅ kod |
| 1-guruh (REJA) | Aloqa, blog, promo, yetkazish, sevimlilar, hisobot — veb + mobil | ✅ |
| 2-guruh (REJA) | Telegram, e'lon, Payme/Click jonli, push, AI, Storage | 🔒 Blaze |
| 3-guruh (REJA) | Optom, ombor, TV ekran, Play Store | ❌ |

## 6. Tekshiruv

`npm run type-check && npm run lint && npm test`, qoidalar: `npm run test:rules`
(57 test). CI: `.github/workflows/ci.yml`; deploy: `deploy.yml`; APK: `apk-release.yml`.
