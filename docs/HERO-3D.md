# Bosh sahifa hero — yengil 3D bezak

> Kod: `apps/web/src/components/hero3d/`. Sana: 2026-11-05. Faqat veb (`apps/web`); mobil ilovaga tegilmagan.

## Nima

Hero qismida suzib yuruvchi low-poly shakllar: 2 bulut, 2 shar (koral, firuza), 2 yulduzcha va
kichik futbolka. Ranglar `@kidswear/theme` palitrasidan, dark/light uchun alohida to'plam.
Sichqoncha/barmoq harakatiga butun guruh yumshoq og'adi (`PointerRig`, damped). Butun qatlam
`aria-hidden`, `pointer-events: none` — matn va CTA ustida hech narsa bosilmaydi.

Joylashuv: telefon — CTA ostidagi tasma (hero `pb` kattalashgan); planshet/noutbuk (`sm`–`lg`) —
CTA yonida; keng desktop (`xl`) — hero'ning bo'sh o'ng yarmi.

## Unumdorlik qoidalari

| Qoida                  | Qanday                                                                                                                                                                                                               |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| LCP'ga ta'sir qilmasin | Hero matn/CTA 3D'siz darhol chiqadi. `HeroScene` — `React.lazy` + dynamic import                                                                                                                                     |
| Kech yuklash           | IntersectionObserver (hero ko'rindi) → `window.load` → `requestIdleCallback` → import                                                                                                                                |
| Hajm ≤ 200 KB gzip     | `HeroScene` chunk ≈ **197 KB gzip** (three + R3F + drei `Float`)                                                                                                                                                     |
| Tree-shaking           | R3F v9 `extend(THREE)` butun three'ni tortadi (≈ 246 KB). `vite.config.ts` da `three` → `three-slim.ts` alias: faqat kerakli klasslar                                                                                |
| Render to'xtashi       | Hero ekrandan chiqsa yoki tab yashirilsa `frameloop="never"`                                                                                                                                                         |
| DPR                    | `dpr={[1, 1.5]}`                                                                                                                                                                                                     |
| Fallback               | `prefers-reduced-motion`, Data Saver, WebGL yo'q / software render (`failIfMajorPerformanceCaveat`), < 4 yadro yoki < 4 GB xotira → CSS/SVG statik bezak (`HeroDecorFallback`); reduced-motion'da u ham qimirlamaydi |
| Xato                   | `DecorErrorBoundary`: chunk yoki WebGL xatosi sahifani buzmaydi, statik bezak qoladi                                                                                                                                 |

`three-slim.ts` ga yangi klass qo'shmasdan ishlatilsa build "is not exported" bilan yiqiladi —
yangi 3D element qo'shganda ro'yxatni yangilang va chunk hajmini qayta o'lchang.

## Modellar va litsenziya

Barcha modellar **kodda** yasalgan (three.js primitivlari: `IcosahedronGeometry`, `ConeGeometry`,
`CylinderGeometry`, `BoxGeometry` va `geometry.ts` dagi qo'lda yasalgan yulduz prizmasi).
Fallback SVG yo'llari ham shu loyihada chizilgan. Tashqi model, tekstura yoki shrift
**yuklanmaydi** — uchinchi tomon asset litsenziyasi yo'q.

Kutubxonalar: `three` (MIT), `@react-three/fiber` (MIT), `@react-three/drei` (MIT).
