# سياق المشروع — OpenStock نسخة السوق السعودي (Tadawul-only)

> هذا الملف لبدء أي محادثة جديدة بدون شرح من الصفر: اقرأه أولاً ثم تابع العمل.

## ما هو المشروع
- فورك من `Open-Dev-Society/OpenStock` (Next.js 15 + Turbopack + MongoDB + Better Auth) معدل ليعمل **فقط على السوق السعودي (تداول)**.
- المسار المحلي: `/Users/mishalajmi/Documents/Default Project/OpenStock`
- التشغيل: `npm run dev` ← http://localhost:3000 (قاعدة البيانات Atlas).
- الفحوصات: `npm test` (vitest) + `npx tsc --noEmit`. البناء الكامل `npm run build` يعمل.

## ملف الإعداد (.env) — غير موجود بالgit لأنه أسرار
المتغيرات المطلوبة (القيم عند صاحب المشروع فقط):
- `MONGODB_URI` (Atlas Cluster0, قاعدة `openstock`)
- `BETTER_AUTH_SECRET` + `BETTER_AUTH_URL=http://localhost:3000`
- `NEXT_PUBLIC_FINNHUB_API_KEY` (مجاني — لا يغطي تداول، للبحث الاحتياطي فقط)
- `TWELVEDATA_API_KEY` (مجاني — يغطي رمز تجريبي واحد: 7203؛ اللحظي الكامل يحتاج Pro ~$99/شهر)
- ملاحظة: كلمات مرور TradingView/TickerChart **ممنوع** استخدامها بالكود نهائياً (شاركها المستخدم بالدردشة سابقاً — يجب اعتبارها مكشوفة).

## طبقة البيانات (مهم)
| المصدر | الاستخدام | ملاحظة |
|---|---|---|
| Yahoo Finance (مجاني، بدون مفتاح) | شموع تداول + كل الداشبورد + الفرز | متأخر ~15-20 دقيقة لتداول. `^TASI.SR` تاريخه السنوي/الشهري معطوب عند ياهو |
| Twelve Data | لحظي لرمز 7203 فقط (Pro يفتح الكل) | `lib/actions/twelvedata.actions.ts` — الرموز المقفلة تُحفظ ساعة لتوفير الحصة |
| Finnhub | لا يغطي `.SR` على المجاني | البحث يبدأ محلياً ثم Finnhub احتياط |
| TradingView | ودجت المالية/الفنية/النبذة فقط | الشموع والأسعار محظورة لتداول بالمجاني |

## ملفات أساسية أُنشئت
- `lib/yahoo.ts` — رموز `.SR`/`TADAWUL:`/`^TASI.SR`، بناء روابط Yahoo، parse، إعادة تجميع يومي/أسبوعي/شهري من الساعي (لتاسي)، `validCandles` (يمنع crash التواريخ).
- `lib/twelvedata.ts` + `lib/actions/twelvedata.actions.ts` — أسعار لحظية مع قفل الخطط.
- `lib/tadawul-companies.ts` — دليل 386 شركة (إنجليزي + عربي من تصدير TickerChart + عدد الأسهم `sh`). التحديث: `scripts/fetch-tadawul-list.mjs`.
- `lib/tadawul-search.ts` — بحث محلي (رقم/إنجليزي/عربي).
- `lib/indicators.ts` — MA/EMA/BB/RSI/MACD/CCI/Stoch/ADX + ZigZag وترقيم إليوت تلقائي (1-5/A-B-C بقواعد مبسطة).
- `lib/drawings.ts` — ترند/فيبو (16 مستوى: ارتداد+امتداد)/جان + 13 أداة نماذج (XABCD/Cypher/رأس وكتفين/مثلث/دفعات/إليوت يدوية/دورات/جيبي) + حفظ localStorage.
- `lib/setup-scan.ts` + `lib/actions/screener.actions.ts` — ماسح 386 شركة (6 إشارات) + فلتر RSI + تحديث حي.
- `lib/i18n.ts` + `lib/i18n-server.ts` — عربي/إنجليزي، RTL، أي مفتاح ناقص يفشل البناء عمداً. `tx()` آمنة (fallback إنجليزي).
- `components/stocks/TadawulChart.tsx` — الشارت المخصص (lightweight-charts v5): فريمات 1m→M + عربي، مؤشرات 9 بلوحات، رسم تفاعلي، توسيع ملء شاشة، زوم/طول، OHLC علوي + تلميح، حد 5 شموع أدنى للزوم، `?tf=` بالرابط.
- صفحات: `/dashboard` (تاسي + متابعة طرفية + متحركين + أسعار)، `/companies` (386)، `/screener` (فرص + فلتر RSI + حي)، `/watchlist` (قوائم مسماة: توجد `mishal watch list`)، `/stocks/[symbol]` (نمط محطة: شارت + بطاقة + متابعة يمين).
- `database/models/watchlist-list.model.ts` + `watchlist-lists.actions.ts` — قوائم مسماة. التثبيت: `scripts/seed-mishal-list.mjs`.

## قرارات ثابتة (لا تعيد نقاشها)
- بيانات لحظية حقيقية = Twelve Data Pro فقط (~$99/شهر). لا API في TradingView/TickerChart/البنوك/الوسطاء مهما كانت الباقة — كلها مغلقة على منصاتها.
- خطة الأرشيف المقترحة: شهر Pro واحد → سحب تاريخ 386 شركة لقاعدة البيانات → إلغاء → الشارت من القاعدة + الذيل من ياهو. (لم تُنفذ بعد)
- EODHD: المفتاح المجاني يعطي سنة واحدة فقط (لا يملأ فجوة تاسي 2023-2024). الكامل يحتاج Historian $19.99/شهر. (لم يُشترك بعد)
- TickerChart: ملفات MetaStock (EMASTER) مقروءة الأسماء العربية فقط؛ ملفات `.DAT` مشفرة/غير قياسية - لا تضيع وقت عليها.
- Finnhub 403 على `.SR` و`company-news` سلوك متوقع (مجاني)، والكود يتعامل معه.

## عادات العمل المتفق عليها
- الردود عربية قصيرة ومباشرة، بدون مبالغة.
- أي مزاعم سعرية/توقعات مرفوضة بصراحة (شاشة فنية ≠ توصية).
- تحقق دائماً: tests + tsc قبل التسليم. أرقام الأسعار تُفحص من المصدر مباشرة.
- أسرار `.env` لا تُكتب بالردود ولا بالملفات.
