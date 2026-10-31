// Arabic search and Arabic names for Tadawul companies.
//
// Finnhub's symbol search is Latin-only: it has no index of Arabic names, so a reader who types
// "أرامكو" gets nothing and has to know the ticker. This table closes that gap for the Saudi
// market. It is static on purpose — no API quota, no network, and it works when Finnhub is down.
//
// Coverage: all 388 listed stocks — the 270 main-market (TASI) companies and the 118 parallel-
// market (Nomu) companies. Tickers, English names and the Arabic trading names come from the live
// TADAWUL listing (TradingView's Saudi feed, read in both locales); the fuller Arabic legal names
// come from the Arabic Wikipedia list, and the short forms readers actually type ("أرامكو",
// "الراجحي", "فلاي ناس") sit alongside them.
//
// `nameAr` is the name the Arabic interface shows for a Tadawul row; the rest of the interface
// gets its names from the quote feed, which only answers in English.
//
// To regenerate after a listing change: pull the TADAWUL symbols, join the `ar` and `en`
// descriptions by ticker, and keep the tests below green — they fail if a company loses its
// Arabic name.

export type SaudiSymbol = {
    /** Ticker exactly as the quote feed expects it. */
    symbol: string;
    /** English name, as the exchange lists it. */
    name: string;
    /** Arabic trading name, shown by the Arabic interface. */
    nameAr: string;
    /** Other Arabic names a reader might type, including common short forms. */
    aliases: string[];
};

export const SAUDI_SYMBOLS: readonly SaudiSymbol[] = [
    { symbol: "1010.SR", name: "Riyad Bank", nameAr: "الرياض", aliases: ["بنك الرياض"] },
    { symbol: "1020.SR", name: "Bank Aljazira", nameAr: "الجزيرة", aliases: ["بنك الجزيرة"] },
    { symbol: "1030.SR", name: "Saudi Investment Bank", nameAr: "الإستثمار", aliases: ["البنك السعودي للاستثمار", "الاستثمار", "بنك الاستثمار"] },
    { symbol: "1050.SR", name: "Banque Saudi Fransi", nameAr: "بي اس اف", aliases: ["البنك السعودي الفرنسي", "السعودي الفرنسي"] },
    { symbol: "1060.SR", name: "Saudi Awwal Bank", nameAr: "الأول", aliases: ["البنك السعودي البريطاني", "ساب", "البنك السعودي الأول"] },
    { symbol: "1080.SR", name: "Arab National Bank", nameAr: "العربي", aliases: ["البنك العربي الوطني"] },
    { symbol: "1111.SR", name: "Saudi Tadawul Group Holding Company", nameAr: "مجموعة تداول", aliases: ["مجموعة تداول السعودية القابضة", "تداول السعودية", "تداول"] },
    { symbol: "1120.SR", name: "Al Rajhi Bank", nameAr: "الراجحي", aliases: ["مصرف الراجحي", "بنك الراجحي"] },
    { symbol: "1140.SR", name: "Bank Albilad", nameAr: "البلاد", aliases: ["بنك البلاد"] },
    { symbol: "1150.SR", name: "Alinma Bank", nameAr: "الإنماء", aliases: ["مصرف الإنماء"] },
    { symbol: "1180.SR", name: "Saudi National Bank", nameAr: "الأهلي", aliases: ["البنك الأهلي التجاري", "البنك الأهلي", "الأهلي السعودي"] },
    { symbol: "1182.SR", name: "Amlak International for Real Estate Finance Company", nameAr: "أملاك", aliases: ["شركة أملاك العالمية للتمويل العقاري"] },
    { symbol: "1183.SR", name: "SHL Finance Co.", nameAr: "سهل", aliases: ["الشركة السعودية لتمويل المساكن"] },
    { symbol: "1201.SR", name: "Takween Advanced Industries Co.", nameAr: "تكوين", aliases: ["شركة تكوين المتطورة للصناعات"] },
    { symbol: "1202.SR", name: "Middle East Paper Co.", nameAr: "مبكو", aliases: ["شركة الشرق الأوسط لصناعة وإنتاج الورق"] },
    { symbol: "1210.SR", name: "Basic Chemical Industries Co.", nameAr: "بي سي آي", aliases: ["شركة الصناعات الكيميائية الأساسية"] },
    { symbol: "1211.SR", name: "Saudi Arabian Mining Co.", nameAr: "معادن", aliases: ["شركة التعدين العربية السعودية"] },
    { symbol: "1212.SR", name: "Astra Industrial Group", nameAr: "أسترا الصناعية", aliases: ["مجموعة أسترا الصناعية"] },
    { symbol: "1213.SR", name: "Naseej International Trading Co.", nameAr: "نسيج", aliases: ["شركة نسيج العالمية التجارية"] },
    { symbol: "1214.SR", name: "Al Hassan Ghazi Ibrahim Shaker Co.", nameAr: "شاكر", aliases: ["شركة الحسن غازي إبراهيم شاكر"] },
    { symbol: "1301.SR", name: "United Wire Factories Co.", nameAr: "أسلاك", aliases: ["شركة اتحاد مصانع الأسلاك"] },
    { symbol: "1302.SR", name: "Bawan Co.", nameAr: "بوان", aliases: ["شركة بوان"] },
    { symbol: "1303.SR", name: "Electrical Industries Co.", nameAr: "الصناعات الكهربائية", aliases: ["شركة الصناعات الكهربائية"] },
    { symbol: "1304.SR", name: "Al Yamamah Steel Industries Co.", nameAr: "اليمامة للحديد", aliases: ["شركة اليمامة للصناعات الحديدية"] },
    { symbol: "1320.SR", name: "Saudi Steel Pipe Co.", nameAr: "أنابيب السعودية", aliases: ["الشركة السعودية لأنابيب الصلب"] },
    { symbol: "1321.SR", name: "East Pipes Integrated Company for Industry", nameAr: "أنابيب الشرق", aliases: ["شركة أنابيب الشرق المتكاملة للصناعة"] },
    { symbol: "1322.SR", name: "Al Masane Al Kobra Mining Co.", nameAr: "أماك", aliases: ["المصانع الكبرى للتعدين"] },
    { symbol: "1323.SR", name: "United Carton Industries Company", nameAr: "يو سي آي سي", aliases: ["المتحدة للكرتون"] },
    { symbol: "1324.SR", name: "Saleh Abdulaziz Al Rashed & Sons Co.", nameAr: "صالح الراشد", aliases: ["صالح عبدالعزيز الراشد وأولاده"] },
    { symbol: "1325.SR", name: "Watani Iron Steel Co", nameAr: "حدید وطني", aliases: ["الوطنية للحديد والصلب"] },
    { symbol: "1810.SR", name: "Seera Holding Group", nameAr: "سيرا", aliases: ["مجموعة سيرا القابضة"] },
    { symbol: "1820.SR", name: "BAAN Holding Group Company", nameAr: "بان", aliases: ["مجموعة عبد المحسن الحكير للسياحة والتنمية", "مجموعة الحكير"] },
    { symbol: "1830.SR", name: "Leejam Sports Co.", nameAr: "لجام للرياضة", aliases: ["شركة لجام للرياضة", "وقت اللياقة"] },
    { symbol: "1831.SR", name: "Maharah Human Resources Co.", nameAr: "مهارة", aliases: ["شركة مهارة للموارد البشرية"] },
    { symbol: "1832.SR", name: "Sadr Logistics Co.", nameAr: "صدر", aliases: ["شركة صدر للخدمات اللوجستية", "الصمعاني"] },
    { symbol: "1833.SR", name: "Almawarid Manpower Company", nameAr: "الموارد", aliases: ["الموارد للقوى العاملة"] },
    { symbol: "1834.SR", name: "Saudi Manpower Solutions Company", nameAr: "سماسكو", aliases: ["حلول القوى العاملة"] },
    { symbol: "1835.SR", name: "Tamkeen Human Resources Company", nameAr: "تمكين", aliases: ["تمكين للموارد البشرية"] },
    { symbol: "2001.SR", name: "Methanol Chemicals Co.", nameAr: "كيمانول", aliases: ["شركة كيمائيات الميثانول"] },
    { symbol: "2010.SR", name: "Saudi Basic Industries Corp.", nameAr: "سابك", aliases: ["الشركة السعودية للصناعات الأساسية"] },
    { symbol: "2020.SR", name: "SABIC Agri-Nutrients Co.", nameAr: "سابك للمغذيات الزراعية", aliases: ["شركة سابك للمغذيات الزراعية", "سافكو"] },
    { symbol: "2030.SR", name: "Saudi Arabia Refineries Co.", nameAr: "المصافي", aliases: ["شركة المصافي العربية السعودية"] },
    { symbol: "2040.SR", name: "Saudi Ceramic Co.", nameAr: "الخزف السعودي", aliases: ["شركة الخزف السعودي"] },
    { symbol: "2050.SR", name: "Savola Group", nameAr: "مجموعة صافولا", aliases: [] },
    { symbol: "2060.SR", name: "National Industrialization Co.", nameAr: "التصنيع", aliases: ["شركة التصنيع الوطنية"] },
    { symbol: "2070.SR", name: "Saudi Pharmaceutical Industries & Medical Appliances Corp.", nameAr: "الدوائية", aliases: ["الشركة السعودية للصناعات الدوائية والمستلزمات الطبية"] },
    { symbol: "2080.SR", name: "National Gas & Industrialization Co.", nameAr: "الغاز القابضة", aliases: ["شركة الغاز والتصنيع الأهلية", "الغاز"] },
    { symbol: "2081.SR", name: "Alkhorayef Water & Power Technologies", nameAr: "الخريف", aliases: ["شركة الخريف لتقنية المياه والطاقة", "المياه"] },
    { symbol: "2082.SR", name: "ACWA Power", nameAr: "أكوا", aliases: ["شركة أعمال المياه والطاقة الدولية", "أكوا باور"] },
    { symbol: "2083.SR", name: "Power and Water Utility Company for Jubail and Yanbu (Marafiq)", nameAr: "مرافق", aliases: [] },
    { symbol: "2084.SR", name: "Miahona Co.", nameAr: "مياهنا", aliases: [] },
    { symbol: "2090.SR", name: "National Gypsum Co.", nameAr: "جبسكو", aliases: ["شركة الجبس الأهلية"] },
    { symbol: "2100.SR", name: "Wafrah for Industry & Development", nameAr: "وفرة", aliases: ["شركة وفرة للصناعة والتنمية"] },
    { symbol: "2110.SR", name: "Saudi Cable Co.", nameAr: "الكابلات السعودية", aliases: ["شركة الكابلات السعودية"] },
    { symbol: "2120.SR", name: "Saudi Advanced Industries Co.", nameAr: "متطورة", aliases: ["الشركة السعودية للصناعات المتطورة"] },
    { symbol: "2130.SR", name: "Saudi Industrial Development Co.", nameAr: "صدق", aliases: ["الشركة السعودية للتنمية الصناعية"] },
    { symbol: "2140.SR", name: "AYYAN Investment Company", nameAr: "أيان", aliases: ["شركة أيان للاستثمار"] },
    { symbol: "2150.SR", name: "National Co. for Glass Industries", nameAr: "زجاج", aliases: ["شركة الصناعات الزجاجية الوطنية"] },
    { symbol: "2160.SR", name: "Saudi Arabian Amiantit Co.", nameAr: "أميانتيت", aliases: ["شركة أميانتيت العربية السعودية"] },
    { symbol: "2170.SR", name: "Alujain Corporation", nameAr: "اللجين", aliases: ["شركة اللجين القابضة"] },
    { symbol: "2180.SR", name: "Filing & Packing Materials Manufacturing Co.", nameAr: "فيبكو", aliases: ["شركة تصنيع مواد التعبئة والتغليف"] },
    { symbol: "2190.SR", name: "Sustained Infrastructure Holding Company", nameAr: "سيسكو القابضة", aliases: ["الشركة السعودية للخدمات الصناعية", "سيسكو"] },
    { symbol: "2200.SR", name: "Arabian Pipes Co.", nameAr: "أنابيب", aliases: ["الشركة العربية للأنابيب"] },
    { symbol: "2220.SR", name: "National Metal Manufacturing & Casting Co.", nameAr: "معدنية", aliases: ["الشركة الوطنية لتصنيع وسبك المعادن"] },
    { symbol: "2222.SR", name: "Saudi Arabian Oil Co.", nameAr: "أرامكو السعودية", aliases: ["شركة الزيت العربية السعودية", "أرامكو", "ارامكو"] },
    { symbol: "2223.SR", name: "Saudi Aramco Base Oil Company - Luberef", nameAr: "لوبريف", aliases: ["أرامكو لزيوت الأساس"] },
    { symbol: "2230.SR", name: "Saudi Chemical Co.", nameAr: "الكيميائية", aliases: ["الشركة الكيميائية السعودية القابضة"] },
    { symbol: "2240.SR", name: "Advanced Building Industries Co.", nameAr: "صناعات", aliases: ["شركة الزامل للاستثمار الصناعي", "الزامل للصناعة"] },
    { symbol: "2250.SR", name: "Saudi Industrial Investment Group", nameAr: "المجموعة السعودية", aliases: ["المجموعة السعودية للاستثمار الصناعي"] },
    { symbol: "2270.SR", name: "Saudia Dairy & Foodstuff Co.", nameAr: "سدافكو", aliases: ["الشركة السعودية لمنتجات الألبان والأغذية"] },
    { symbol: "2280.SR", name: "Almarai Company", nameAr: "المراعي", aliases: ["شركة المراعي"] },
    { symbol: "2281.SR", name: "Tanmiah Food Company", nameAr: "تنمية", aliases: ["شركة التنمية الغذائية"] },
    { symbol: "2282.SR", name: "Naqi Water Company", nameAr: "نقي", aliases: ["نقي للمياه"] },
    { symbol: "2283.SR", name: "First Milling Co.", nameAr: "المطاحن الأولى", aliases: [] },
    { symbol: "2284.SR", name: "Modern Mills for Food Products Co.", nameAr: "المطاحن الحديثة", aliases: [] },
    { symbol: "2285.SR", name: "Arabian Mills for Food Products Company", nameAr: "المطاحن العربية", aliases: [] },
    { symbol: "2286.SR", name: "Fourth Milling Company", nameAr: "المطاحن الرابعة", aliases: [] },
    { symbol: "2287.SR", name: "Arabian Company for Agricultural and Industrial Investment", nameAr: "إنتاج", aliases: ["الاستثمار الزراعي والصناعي"] },
    { symbol: "2288.SR", name: "Nofoth Food Products Co", nameAr: "نفوذ", aliases: ["نفوذ للمنتجات الغذائية"] },
    { symbol: "2290.SR", name: "Yanbu National Petrochemical Co.", nameAr: "ينساب", aliases: ["شركة ينبع الوطنية للبتروكيماويات"] },
    { symbol: "2300.SR", name: "Saudi Paper Manufacturing Co.", nameAr: "صناعة الورق", aliases: ["الشركة السعودية لصناعة الورق"] },
    { symbol: "2310.SR", name: "Sahara International Petrochemical Company", nameAr: "سبكيم العالمية", aliases: ["شركة الصحراء العالمية للبتروكيماويات", "سبكيم"] },
    { symbol: "2320.SR", name: "Al-Babtain Power & Telecommunication Co.", nameAr: "البابطين", aliases: ["شركة البابطين للطاقة والإتصالات"] },
    { symbol: "2330.SR", name: "Advanced Petrochemical Co.", nameAr: "المتقدمة", aliases: ["الشركة المتقدمة للبتروكيماويات"] },
    { symbol: "2340.SR", name: "ARTEX Industrial Investment Company", nameAr: "ارتيكس", aliases: ["شركة العبد اللطيف للاستثمار الصناعي", "العبداللطيف"] },
    { symbol: "2350.SR", name: "Saudi Kayan Petrochemical Co.", nameAr: "كيان السعودية", aliases: ["شركة كيان السعودية للبتروكيماويات", "كيان"] },
    { symbol: "2360.SR", name: "Saudi Vitrified Clay Pipes Co.", nameAr: "الفخارية", aliases: ["الشركة السعودية لإنتاج الأنابيب الفخارية"] },
    { symbol: "2370.SR", name: "Middle East Specialized Cables Co.", nameAr: "مسك", aliases: ["شركة الشرق الأوسط للكابلات المتخصصة"] },
    { symbol: "2380.SR", name: "Rabigh Refining & Petrochemical Co. Class A", nameAr: "بترو رابغ", aliases: ["شركة رابغ للتكرير والبتروكيماويات"] },
    { symbol: "2381.SR", name: "Arabian Drilling Co.", nameAr: "الحفر العربية", aliases: ["شركة الحفر العربية"] },
    { symbol: "2382.SR", name: "Ades Holding Company", nameAr: "أديس", aliases: ["أديس القابضة"] },
    { symbol: "3002.SR", name: "Najran Cement Co.", nameAr: "أسمنت نجران", aliases: ["شركة أسمنت نجران"] },
    { symbol: "3003.SR", name: "City Cement Co.", nameAr: "أسمنت المدينة", aliases: ["شركة أسمنت المدينة"] },
    { symbol: "3004.SR", name: "Northern Region Cement Co.", nameAr: "أسمنت الشمالية", aliases: ["شركة أسمنت المنطقة الشمالية"] },
    { symbol: "3005.SR", name: "Umm Al-Qura Cement Company", nameAr: "أسمنت ام القرى", aliases: ["شركة إسمنت أم القرى", "إسمنت أم القرى"] },
    { symbol: "3007.SR", name: "Zahrat Al Waha For Trading Co.", nameAr: "الواحة", aliases: ["شركة زهرة الواحة للتجارة"] },
    { symbol: "3008.SR", name: "Al Kathiri Holding Company", nameAr: "الكثيري", aliases: ["شركة الكثيري القابضة"] },
    { symbol: "3010.SR", name: "Arabian Cement Co.", nameAr: "أسمنت العربية", aliases: ["شركة الأسمنت العربية"] },
    { symbol: "3020.SR", name: "Yamamah Saudi Cement Co.", nameAr: "أسمنت اليمامة", aliases: ["شركة أسمنت اليمامة"] },
    { symbol: "3030.SR", name: "Saudi Cement Co.", nameAr: "أسمنت السعودية", aliases: ["شركة الأسمنت السعودية"] },
    { symbol: "3040.SR", name: "Qassim Cement Co.", nameAr: "أسمنت القصيم", aliases: ["شركة أسمنت القصيم"] },
    { symbol: "3050.SR", name: "Southern Province Cement Co.", nameAr: "أسمنت الجنوب", aliases: ["شركة أسمنت المنطقة الجنوبية"] },
    { symbol: "3060.SR", name: "Yanbu Cement Co.", nameAr: "أسمنت ينبع", aliases: ["شركة أسمنت ينبع"] },
    { symbol: "3080.SR", name: "Eastern Province Cement Co.", nameAr: "أسمنت الشرقية", aliases: ["شركة أسمنت المنطقة الشرقية"] },
    { symbol: "3090.SR", name: "Tabuk Cement Co.", nameAr: "أسمنت تبوك", aliases: ["شركة أسمنت تبوك"] },
    { symbol: "3091.SR", name: "Al Jouf Cement Co.", nameAr: "أسمنت الجوف", aliases: ["شركة أسمنت الجوف"] },
    { symbol: "3092.SR", name: "Riyadh Cement Co.", nameAr: "أسمنت الرياض", aliases: ["شركة أسمنت الرياض"] },
    { symbol: "4001.SR", name: "Abdullah Al Othaim Markets Co.", nameAr: "أسواق ع العثيم", aliases: ["شركة أسواق عبد الله العثيم", "العثيم", "أسواق العثيم"] },
    { symbol: "4002.SR", name: "Mouwasat Medical Services Co.", nameAr: "المواساة", aliases: ["شركة المواساة للخدمات الطبية"] },
    { symbol: "4003.SR", name: "United Electronics Co.", nameAr: "إكسترا", aliases: ["الشركة المتحدة للإلكترونيات"] },
    { symbol: "4004.SR", name: "Dallah Healthcare Co.", nameAr: "دله الصحية", aliases: ["شركة دله للخدمات الصحية"] },
    { symbol: "4005.SR", name: "National Medical Care Co.", nameAr: "رعاية", aliases: ["الشركة الوطنية للرعاية الطبية"] },
    { symbol: "4006.SR", name: "Saudi Marketing Co.", nameAr: "أسواق المزرعة", aliases: ["الشركة السعودية للتسويق"] },
    { symbol: "4007.SR", name: "Al Hammadi Holding", nameAr: "الحمادي", aliases: ["شركة الحمادي للتنمية والإستثمار"] },
    { symbol: "4008.SR", name: "Saudi Co. for Hardware", nameAr: "ساكو", aliases: ["الشركة السعودية للعدد والأدوات"] },
    { symbol: "4009.SR", name: "Middle East Healthcare Company", nameAr: "السعودي الألماني الصحية", aliases: ["شركة الشرق الأوسط للرعاية الصحية", "المستشفى السعودي الألماني"] },
    { symbol: "4011.SR", name: "Lazurde Company for Jewelry", nameAr: "لازوردي", aliases: ["شركة لازوردي للمجوهرات"] },
    { symbol: "4012.SR", name: "Thob Al-Aseel Co.", nameAr: "الأصيل", aliases: ["شركة ثوب الأصيل"] },
    { symbol: "4013.SR", name: "Dr. Sulaiman Al-Habib Medical Services Group Co.", nameAr: "سليمان الحبيب", aliases: ["مجموعة الدكتور سليمان الحبيب للخدمات الطبية", "الحبيب"] },
    { symbol: "4014.SR", name: "Scientific and Medical Equipment House", nameAr: "دار المعدات", aliases: ["بيت المعدات العلمية والطبية"] },
    { symbol: "4015.SR", name: "Jamjoom Pharmaceuticals Factory Co.", nameAr: "جمجوم فارما", aliases: ["مصنع جمجوم"] },
    { symbol: "4016.SR", name: "Middle East Pharmaceutical Industries Company", nameAr: "أفالون فارما", aliases: ["الشرق الأوسط للصناعات الدوائية"] },
    { symbol: "4017.SR", name: "Dr. Soliman Abdul Kader Fakeeh Hospital Co.", nameAr: "فقيه الطبية", aliases: ["مستشفى د سليمان فقيه", "فقيه"] },
    { symbol: "4018.SR", name: "Almoosa Health Co.", nameAr: "الموسى", aliases: ["الموسى الصحية"] },
    { symbol: "4019.SR", name: "Specialized Medical Company", nameAr: "اس ام سي للرعاية الصحية", aliases: ["الرعاية الطبية المتخصصة"] },
    { symbol: "4020.SR", name: "Saudi Real Estate Co.", nameAr: "العقارية", aliases: ["الشركة العقارية السعودية"] },
    { symbol: "4021.SR", name: "Canadian Medical Center Co.", nameAr: "المركز الكندي الطبي", aliases: ["المركز الطبي الكندي"] },
    { symbol: "4030.SR", name: "National Shipping Co. of Saudi Arabia", nameAr: "البحري", aliases: ["الشركة الوطنية السعودية للنقل البحري"] },
    { symbol: "4031.SR", name: "Saudi Ground Services Co.", nameAr: "الخدمات الأرضية", aliases: ["الشركة السعودية للخدمات الأرضية"] },
    { symbol: "4040.SR", name: "Saudi Public Transport Co.", nameAr: "سابتكو", aliases: ["الشركة السعودية للنقل الجماعي"] },
    { symbol: "4050.SR", name: "Saudi Automotive Services Co.", nameAr: "ساسكو", aliases: ["الشركة السعودية لخدمات السيارات والمعدات"] },
    { symbol: "4051.SR", name: "Baazeem Trading Co.", nameAr: "باعظيم", aliases: ["شركة باعظيم التجارية"] },
    { symbol: "4061.SR", name: "Anaam International Holding Group", nameAr: "أنعام القابضة", aliases: ["مجموعة أنعام الدولية القابضة"] },
    { symbol: "4070.SR", name: "Tihama Advertising & Public Relations Co.", nameAr: "تهامة", aliases: ["شركة تهامة للإعلان والعلاقات العامة"] },
    { symbol: "4071.SR", name: "Arabian Contracting Services Co.", nameAr: "العربية", aliases: ["العربية للخدمات التعاقدية", "العربي"] },
    { symbol: "4072.SR", name: "MBC Group Company", nameAr: "مجموعة إم بي سي", aliases: ["إم بي سي"] },
    { symbol: "4080.SR", name: "Sinad Holding Company", nameAr: "سناد القابضة", aliases: ["شركة سناد القابضة"] },
    { symbol: "4081.SR", name: "Nayifat Finance Company", nameAr: "النايفات", aliases: ["شركة النايفات للتمويل"] },
    { symbol: "4082.SR", name: "Morabaha Marina Financing Company", nameAr: "مرنة", aliases: ["مرابحة مارينا"] },
    { symbol: "4083.SR", name: "United International Holding Co.", nameAr: "تسهيل", aliases: ["المتحدة الدولية القابضة"] },
    { symbol: "4084.SR", name: "Derayah Financial Company", nameAr: "دراية", aliases: ["دراية المالية"] },
    { symbol: "4090.SR", name: "Taiba Investment Company", nameAr: "طيبة", aliases: ["شركة طيبة للإستثمار"] },
    { symbol: "4100.SR", name: "Makkah Construction & Development Co.", nameAr: "مكة", aliases: ["شركة مكة للإنشاء والتعمير"] },
    { symbol: "4110.SR", name: "Batic Investments and Logistics Co.", nameAr: "باتك", aliases: ["شركة باتك للاستثمار والأعمال اللوجستية"] },
    { symbol: "4130.SR", name: "Saudi Darb Investment Co.", nameAr: "درب السعودية", aliases: ["شركة الباحة للإستثمار والتنمية", "الباحة"] },
    { symbol: "4140.SR", name: "Saudi Industrial Export Co.", nameAr: "صادرات", aliases: ["الشركة السعودية للصادرات الصناعية"] },
    { symbol: "4141.SR", name: "Al-Omran Industrial & Trading Co.", nameAr: "العمران", aliases: ["شركة العمران للصناعة والتجارة"] },
    { symbol: "4142.SR", name: "Riyadh Cables Group Co.", nameAr: "كابلات الرياض", aliases: [] },
    { symbol: "4143.SR", name: "Al Taiseer Group Talco Industrial Co.", nameAr: "تالكو", aliases: ["التيسير تالكو"] },
    { symbol: "4144.SR", name: "Raoom trading Company", nameAr: "رؤوم", aliases: ["رؤوم للتجارة"] },
    { symbol: "4145.SR", name: "Obeikan Glass Co", nameAr: "أو جي سي", aliases: ["عبيكان للزجاج"] },
    { symbol: "4146.SR", name: "Gas Arabian Services Co", nameAr: "جاز", aliases: ["الغاز العربية للخدمات"] },
    { symbol: "4147.SR", name: "Consolidated Grunenfelder Saady Holding Co.", nameAr: "سي جي إس", aliases: ["جرونينفلدر سعدي القابضة"] },
    { symbol: "4148.SR", name: "Alwasail Industrial Company", nameAr: "الوسائل الصناعية", aliases: [] },
    { symbol: "4150.SR", name: "Arriyadh Development Co.", nameAr: "التعمير", aliases: ["شركة الرياض للتعمير"] },
    { symbol: "4160.SR", name: "THIMAR Development Holding Co.", nameAr: "ثمار", aliases: ["شركة ثمار التنمية القابضة"] },
    { symbol: "4161.SR", name: "BinDawood Holding Company", nameAr: "بن داود", aliases: ["شركة بن داود القابضة"] },
    { symbol: "4162.SR", name: "Almunajem Foods Company", nameAr: "المنجم", aliases: ["المنجم للأغذية"] },
    { symbol: "4163.SR", name: "Al Dawaa Medical Services Co.", nameAr: "الدواء", aliases: ["الدواء للخدمات الطبية"] },
    { symbol: "4164.SR", name: "Nahdi Medical Company", nameAr: "النهدي", aliases: ["النهدي الطبية"] },
    { symbol: "4165.SR", name: "Al Majed for Oud Company", nameAr: "الماجد للعود", aliases: [] },
    { symbol: "4170.SR", name: "Tourism Enterprise Co.", nameAr: "شمس", aliases: ["شركة المشروعات السياحية"] },
    { symbol: "4180.SR", name: "Fitaihi Holding Group", nameAr: "مجموعة فتيحي", aliases: ["مجموعة فتيحي القابضة"] },
    { symbol: "4190.SR", name: "Jarir Marketing Co.", nameAr: "جرير", aliases: ["شركة جرير للتسويق"] },
    { symbol: "4191.SR", name: "Abdullah Saad Mohammed Abo Moati for Bookstores Co.", nameAr: "أبو معطي", aliases: ["شركة عبد الله سعد محمد أبو معطي للمكتبات"] },
    { symbol: "4192.SR", name: "Al-Saif Stores for Development & Investment Co.", nameAr: "السيف غاليري", aliases: ["متاجر السيف"] },
    { symbol: "4193.SR", name: "Nice One Beauty Digital Marketing Co.", nameAr: "نايس ون", aliases: [] },
    { symbol: "4194.SR", name: "Marketing Home Group for Trading Co.", nameAr: "محطة البناء", aliases: ["ماركتنغ هوم"] },
    { symbol: "4200.SR", name: "Aldrees Petroleum & Transport Services Co.", nameAr: "الدريس", aliases: ["شركة الدريس للخدمات البترولية والنقليات"] },
    { symbol: "4210.SR", name: "Saudi Research and Media Group", nameAr: "الأبحاث والإعلام", aliases: ["المجموعة السعودية للأبحاث والتسويق", "الأبحاث والتسويق"] },
    { symbol: "4220.SR", name: "Emaar, The Economic City", nameAr: "إعمار", aliases: ["إعمار المدينة الاقتصادية"] },
    { symbol: "4230.SR", name: "Red Sea International Co.", nameAr: "البحر الأحمر", aliases: ["شركة البحر الأحمر العالمية"] },
    { symbol: "4240.SR", name: "AFG International Company", nameAr: "إیه إف جي ریتیل", aliases: ["شركة فواز عبد العزيز الحكير وشركاه", "الحكير"] },
    { symbol: "4250.SR", name: "Jabal Omar Development Co.", nameAr: "جبل عمر", aliases: ["شركة جبل عمر للتطوير"] },
    { symbol: "4260.SR", name: "United International Transportation Co. Ltd.", nameAr: "بدجت السعودية", aliases: ["الشركة المتحدة الدولية للمواصلات"] },
    { symbol: "4261.SR", name: "Theeb Rent a Car Company", nameAr: "ذيب", aliases: ["شركة ذيب لتأجير السيارات"] },
    { symbol: "4262.SR", name: "Lumi Rental Company", nameAr: "لومي", aliases: ["لومي للتأجير"] },
    { symbol: "4263.SR", name: "SAL Saudi Logistics Services Company", nameAr: "سال", aliases: ["الشركة السعودية للخدمات اللوجستية"] },
    { symbol: "4264.SR", name: "Flynas Co.", nameAr: "طيران ناس", aliases: ["فلاي ناس"] },
    { symbol: "4265.SR", name: "Cherry Trading Co.", nameAr: "شري", aliases: ["تشيري للتجارة"] },
    { symbol: "4270.SR", name: "Saudi Printing & Packaging Co.", nameAr: "طباعة وتغليف", aliases: ["الشركة السعودية للطباعة والتغليف"] },
    { symbol: "4280.SR", name: "Kingdom Holding Co.", nameAr: "المملكة", aliases: ["شركة المملكة القابضة"] },
    { symbol: "4290.SR", name: "Al Khaleej Training & Education Co.", nameAr: "الخليج للتدريب", aliases: ["شركة الخليج للتدريب والتعليم"] },
    { symbol: "4291.SR", name: "National Co. for Learning & Education", nameAr: "الوطنية للتعليم", aliases: ["الشركة الوطنية للتربية والتعليم"] },
    { symbol: "4292.SR", name: "Ataa Educational Company", nameAr: "عطاء", aliases: ["شركة عطاء التعليمية"] },
    { symbol: "4300.SR", name: "Dar Al Arkan Real Estate Development Co.", nameAr: "دار الأركان", aliases: ["شركة دار الأركان للتطوير العقاري"] },
    { symbol: "4310.SR", name: "Knowledge Economic City", nameAr: "مدينة المعرفة", aliases: ["مدينة المعرفة الاقتصادية"] },
    { symbol: "4320.SR", name: "Alandalus Property Co.", nameAr: "الأندلس", aliases: ["شركة الأندلس العقارية"] },
    { symbol: "4321.SR", name: "Arabian Centres Co.", nameAr: "سينومي سنترز", aliases: ["شركة المراكز العربية", "المراكز"] },
    { symbol: "4322.SR", name: "Retal Urban Development Company", nameAr: "رتال", aliases: ["ريتال للتطوير العمراني"] },
    { symbol: "4323.SR", name: "Sumou Real Estate Co.", nameAr: "سمو", aliases: ["سمو العقارية"] },
    { symbol: "4324.SR", name: "Banan Real Estate Company", nameAr: "بنان", aliases: ["بنان العقارية"] },
    { symbol: "4325.SR", name: "Umm Al Qura for Development and Construction Company", nameAr: "مسار", aliases: ["أم القرى للتنمية والتعمير"] },
    { symbol: "4326.SR", name: "Dar Al Majed Real Estate Co.", nameAr: "الماجدية", aliases: ["دار الماجد العقارية"] },
    { symbol: "4327.SR", name: "Alramz Real Estate Co.", nameAr: "الرمز", aliases: ["الرمز العقارية"] },
    { symbol: "4328.SR", name: "Ladun Investment Company", nameAr: "لدن", aliases: ["لدن للاستثمار"] },
    { symbol: "4330.SR", name: "Riyad REIT", nameAr: "الرياض ريت", aliases: ["صندوق الرياض ريت"] },
    { symbol: "4331.SR", name: "AlJazira REIT Fund", nameAr: "الجزيرة ريت", aliases: ["صندوق بنك الجزيرة موطن ريت", "بنك الجزيرة موطن ريت"] },
    { symbol: "4332.SR", name: "Jadwa REIT Al-Haramain Fund", nameAr: "جدوى ريت الحرمين", aliases: ["صندوق جدوى ريت الحرمين"] },
    { symbol: "4333.SR", name: "Taleem REIT Fund", nameAr: "تعليم ريت", aliases: ["صندوق تعليم ريت"] },
    { symbol: "4334.SR", name: "AL Maather REIT Fund", nameAr: "المعذر ريت", aliases: ["صندوق المعذر ريت"] },
    { symbol: "4335.SR", name: "Musharaka REIT Fund", nameAr: "مشاركة ريت", aliases: ["صندوق مشاركة ريت"] },
    { symbol: "4336.SR", name: "Mulkia Gulf Real Estate REIT Fund", nameAr: "ملكية ريت", aliases: ["صندوق ملكية عقارات الخليج ريت"] },
    { symbol: "4337.SR", name: "Al Aziziah REIT Fund", nameAr: "العزيزية ريت", aliases: ["صندوق المشاعر ريت", "مشاعر ريت"] },
    { symbol: "4338.SR", name: "AlAhli REIT Fund 1", nameAr: "الأهلي ريت 1", aliases: ["صندوق الأهلي ريت 1"] },
    { symbol: "4339.SR", name: "Derayah REIT Fund", nameAr: "دراية ريت", aliases: ["صندوق دراية ريت"] },
    { symbol: "4340.SR", name: "Al Rajhi REIT Fund", nameAr: "الراجحي ريت", aliases: ["صندوق الراجحي ريت"] },
    { symbol: "4342.SR", name: "Jadwa REIT Saudi Fund", nameAr: "جدوى ريت السعودية", aliases: ["صندوق جدوى ريت السعودية"] },
    { symbol: "4344.SR", name: "SEDCO Capital REIT Fund", nameAr: "سدكو كابيتال ريت", aliases: ["صندوق سدكو كابيتال ريت"] },
    { symbol: "4345.SR", name: "Alinma Retail REIT Fund", nameAr: "الإنماء ريت للتجزئة", aliases: ["صندوق سويكورب وابل ريت", "سويكورب وابل ريت"] },
    { symbol: "4346.SR", name: "MEFIC REIT Fund", nameAr: "ميفك ريت", aliases: ["صندوق ميفك ريت"] },
    { symbol: "4347.SR", name: "Bonyan REIT Fund", nameAr: "بنيان ريت", aliases: ["صندوق بنيان ريت"] },
    { symbol: "4348.SR", name: "Alkhabeer REIT Fund", nameAr: "الخبير ريت", aliases: ["صندوق الخبير ريت"] },
    { symbol: "4349.SR", name: "Alinma Hospitality REIT Fund", nameAr: "الإنماء ريت الفندقي", aliases: ["الإنماء للضيافة"] },
    { symbol: "4350.SR", name: "Alistithmar AREIC Diversified REIT Fund", nameAr: "الإستثمار ريت", aliases: ["الاستثمار المتنوع"] },
    { symbol: "5110.SR", name: "Saudi Energy Co.", nameAr: "السعودية للطاقة", aliases: ["الشركة السعودية للكهرباء", "كهرباء السعودية", "الكهرباء"] },
    { symbol: "6001.SR", name: "Halwani Brothers Company", nameAr: "حلواني إخوان", aliases: ["شركة حلواني إخوان", "حلواني"] },
    { symbol: "6002.SR", name: "Herfy Food Services Co.", nameAr: "هرفي للأغذية", aliases: ["شركة هرفي للخدمات الغذائية"] },
    { symbol: "6004.SR", name: "CATRION Catering Holding Company", nameAr: "كاتريون", aliases: ["شركة الخطوط السعودية للتموين", "التموين"] },
    { symbol: "6010.SR", name: "National Agricultural Development Co.", nameAr: "نادك", aliases: ["الشركة الوطنية للتنمية الزراعية"] },
    { symbol: "6012.SR", name: "Raydan Food Co.", nameAr: "ريدان", aliases: ["شركة ريدان الغذائية"] },
    { symbol: "6013.SR", name: "Development Works Food Co.", nameAr: "التطويرية الغذائية", aliases: ["شركة الأعمال التطويرية الغذائية"] },
    { symbol: "6014.SR", name: "AlAmar Foods Co.", nameAr: "الآمار", aliases: ["الأمار للأغذية"] },
    { symbol: "6016.SR", name: "Shatirah House Restaurant Burgerizzr Co.", nameAr: "برغرايززر", aliases: ["برقرزيزر", "شطيرة هاوس"] },
    { symbol: "6017.SR", name: "Jahez International Company for Information Systems Technology", nameAr: "جاهز", aliases: [] },
    { symbol: "6018.SR", name: "Sport Clubs Co.", nameAr: "الأندية للرياضة", aliases: ["أندية الرياضة"] },
    { symbol: "6019.SR", name: "Al Masar Al Shamil Education Co.", nameAr: "المسار الشامل", aliases: ["المسار الشامل للتعليم"] },
    { symbol: "6020.SR", name: "Al Gassim Investment Holding Co.", nameAr: "جاكو", aliases: ["شركة القصيم القابضة للاستثمار"] },
    { symbol: "6022.SR", name: "Armah Sports Company", nameAr: "أرماح", aliases: ["أرماح الرياضية"] },
    { symbol: "6040.SR", name: "Tabuk Agricultural Development Co.", nameAr: "تبوك الزراعية", aliases: ["شركة تبوك للتنمية الزراعية"] },
    { symbol: "6050.SR", name: "Saudi Fisheries Co.", nameAr: "الأسماك", aliases: ["الشركة السعودية للأسماك"] },
    { symbol: "6060.SR", name: "Ash-Sharqiyah Development Co.", nameAr: "الشرقية للتنمية", aliases: ["شركة الشرقية للتنمية"] },
    { symbol: "6070.SR", name: "Al-Jouf Agriculture Development Co.", nameAr: "الجوف", aliases: ["شركة الجوف الزراعية"] },
    { symbol: "6090.SR", name: "Jazan Development and Investment Company", nameAr: "جازادكو", aliases: ["شركة جازان للطاقة والتنمية"] },
    { symbol: "7010.SR", name: "Saudi Telecom Co.", nameAr: "اس تي سي", aliases: ["شركة الإتصالات السعودية", "الاتصالات السعودية", "stc"] },
    { symbol: "7020.SR", name: "Etihad Etisalat Co.", nameAr: "إتحاد إتصالات", aliases: ["شركة اتحاد إتصالات", "موبايلي"] },
    { symbol: "7030.SR", name: "Mobile Telecommunications Company Saudi Arabia", nameAr: "زين السعودية", aliases: ["شركة الاتصالات المتنقلة السعودية", "زين"] },
    { symbol: "7040.SR", name: "Etihad Atheeb Telecommunication Co.", nameAr: "قو للإتصالات", aliases: ["شركة اتحاد عذيب للإتصالات", "عذيب للإتصالات"] },
    { symbol: "7200.SR", name: "Al Moammar Information Systems Company", nameAr: "ام آي اس", aliases: ["شركة المعمر لأنظمة المعلومات"] },
    { symbol: "7201.SR", name: "Arab Sea Information Systems Co.", nameAr: "بحر العرب", aliases: ["شركة بحر العرب لأنظمة المعلومات"] },
    { symbol: "7202.SR", name: "Arabian Internet and Communications Services Company", nameAr: "سلوشنز", aliases: ["حلول", "العربية لخدمات الإنترنت والاتصالات"] },
    { symbol: "7203.SR", name: "Elm Company", nameAr: "علم", aliases: [] },
    { symbol: "7204.SR", name: "Perfect Presentation for Commercial Services Co.", nameAr: "توبي", aliases: ["العرض المثالي"] },
    { symbol: "7205.SR", name: "Dar Albalad For Business Solutions Company", nameAr: "دي بي اس", aliases: ["دار البلد"] },
    { symbol: "7211.SR", name: "Saudi Azm for Communication and Information Technology Co.", nameAr: "عزم", aliases: ["سعودي عزم"] },
    { symbol: "8010.SR", name: "Company for Cooperative Insurance", nameAr: "التعاونية", aliases: ["الشركة التعاونية للتأمين"] },
    { symbol: "8012.SR", name: "AlJazira Takaful Taawuni Co.", nameAr: "جزيرة تكافل", aliases: ["شركة الجزيرة تكافل تعاوني"] },
    { symbol: "8020.SR", name: "Malath Cooperative Insurance Co.", nameAr: "ملاذ للتأمين", aliases: ["شركة ملاذ للتأمين التعاوني"] },
    { symbol: "8030.SR", name: "Mediterranean & Gulf Cooperative Insurance & Reinsurance Co.", nameAr: "ميدغلف للتأمين", aliases: ["شركة المتوسط والخليج للتأمين وإعادة التأمين التعاوني"] },
    { symbol: "8040.SR", name: "Mutakamela Insurance Company", nameAr: "متكاملة", aliases: ["شركة أليانز السعودي الفرنسي للتأمين التعاوني", "أليانز إس إف"] },
    { symbol: "8050.SR", name: "SALAMA Cooperative Insurance Co.", nameAr: "سلامة", aliases: ["شركة سلامة للتأمين التعاوني"] },
    { symbol: "8060.SR", name: "Walaa Cooperative Insurance Co.", nameAr: "ولاء", aliases: ["شركة ولاء للتأمين التعاوني"] },
    { symbol: "8070.SR", name: "Arabian Shield Cooperative Insurance Co.", nameAr: "الدرع العربي", aliases: ["شركة الدرع العربي للتأمين التعاوني"] },
    { symbol: "8100.SR", name: "Saudi Arabian Cooperative Insurance Co.", nameAr: "سايكو", aliases: ["الشركة العربية السعودية للتأمين التعاوني"] },
    { symbol: "8120.SR", name: "Gulf Union Alahlia Cooperative Insurance Co.", nameAr: "إتحاد الخليج الأهلية", aliases: ["شركة اتحاد الخليج للتأمين التعاوني", "اتحاد الخليج"] },
    { symbol: "8150.SR", name: "Allied Cooperative Insurance Group", nameAr: "أسيج", aliases: ["المجموعة المتحدة للتأمين التعاوني"] },
    { symbol: "8160.SR", name: "Arabia Insurance Cooperative Co.", nameAr: "التأمين العربية", aliases: ["شركة التأمين العربية التعاونية"] },
    { symbol: "8170.SR", name: "Al-Etihad Cooperative Insurance Co.", nameAr: "الاتحاد", aliases: ["شركة الاتحاد للتأمين التعاوني"] },
    { symbol: "8180.SR", name: "Al Sagr Cooperative Insurance Co.", nameAr: "الصقر للتأمين", aliases: ["شركة الصقر للتأمين التعاوني"] },
    { symbol: "8200.SR", name: "Saudi Reinsurance Company", nameAr: "الإعادة السعودية", aliases: ["الشركة السعودية لإعادة التأمين التعاوني"] },
    { symbol: "8210.SR", name: "Bupa Arabia for Cooperative Insurance Co.", nameAr: "بوبا العربية", aliases: ["شركة بوبا العربية للتأمين التعاوني"] },
    { symbol: "8230.SR", name: "Al Rajhi Co. for Cooperative Insurance", nameAr: "تكافل الراجحي", aliases: ["شركة الراجحي للتأمين التعاوني"] },
    { symbol: "8240.SR", name: "Chubb Arabia Cooperative Insurance Company", nameAr: "تْشب", aliases: ["شركة تشب العربية للتأمين التعاوني"] },
    { symbol: "8250.SR", name: "Gulf Insurance Group - GIG", nameAr: "جي آي جي", aliases: ["شركة أكسا للتأمين التعاوني", "اكسا التعاونية"] },
    { symbol: "8260.SR", name: "Gulf General Cooperative Insurance Co.", nameAr: "الخليجية العامة", aliases: ["الشركة الخليجية العامة للتأمين التعاوني"] },
    { symbol: "8280.SR", name: "LIVA Insurance Company", nameAr: "ليفا", aliases: ["الشركة العالمية للتأمين التعاوني", "العالمية"] },
    { symbol: "8300.SR", name: "Wataniya Insurance Co.", nameAr: "الوطنية", aliases: ["الشركة الوطنية للتأمين"] },
    { symbol: "8310.SR", name: "Amana Cooperative Insurance Co.", nameAr: "أمانة للتأمين", aliases: ["شركة أمانة للتأمين التعاوني"] },
    { symbol: "8311.SR", name: "Saudi Enaya Cooperative Insurance Company", nameAr: "عناية", aliases: ["شركة عناية السعودية للتأمين التعاوني"] },
    { symbol: "8313.SR", name: "Rasan Information Technology Co.", nameAr: "رسن", aliases: ["رسن لتقنية المعلومات"] },
    { symbol: "9510.SR", name: "National Building & Marketing Co.", nameAr: "الوطنية للبناء والتسويق", aliases: [] },
    { symbol: "9514.SR", name: "Mohammed Hassan Al Naqool Sons Co. Ltd", nameAr: "الناقول", aliases: [] },
    { symbol: "9515.SR", name: "Fesh Fash Snack Food Production Co.", nameAr: "فش فاش", aliases: [] },
    { symbol: "9516.SR", name: "Natural Gas Distribution Company", nameAr: "غاز", aliases: [] },
    { symbol: "9517.SR", name: "MOBI Industry Company", nameAr: "موبي للصناعة", aliases: [] },
    { symbol: "9521.SR", name: "INMAR Company For Real Estate Development and Investment", nameAr: "إنمار", aliases: [] },
    { symbol: "9522.SR", name: "Alhasoob Co.", nameAr: "الحاسوب", aliases: [] },
    { symbol: "9523.SR", name: "Group Five Pipe Saudi Ltd.", nameAr: "جروب فايف", aliases: [] },
    { symbol: "9524.SR", name: "Advance International Company for Communication and Information Technology", nameAr: "آيكتك", aliases: [] },
    { symbol: "9527.SR", name: "AME Company for Medical Supplies", nameAr: "ألف ميم ياء", aliases: [] },
    { symbol: "9530.SR", name: "Arabian International Healthcare Holding Co.", nameAr: "طبية", aliases: [] },
    { symbol: "9532.SR", name: "Al-Jouf Healthy Water Bottling Company", nameAr: "حلوة", aliases: [] },
    { symbol: "9533.SR", name: "Saudi Parts Center Co", nameAr: "المركز الآلي", aliases: [] },
    { symbol: "9536.SR", name: "Arabian Food & Dairy Factories Co.", nameAr: "فاديكو", aliases: [] },
    { symbol: "9538.SR", name: "Naseej for Technology Co.", nameAr: "نسيج للتقنية", aliases: [] },
    { symbol: "9539.SR", name: "Aqaseem Factory for Chemicals and Plastics Co.", nameAr: "أقاسيم", aliases: [] },
    { symbol: "9540.SR", name: "National Environmental Recycling Co.", nameAr: "تدوير", aliases: [] },
    { symbol: "9541.SR", name: "Academy of Learning Co.", nameAr: "أكاديمية التعلم", aliases: [] },
    { symbol: "9542.SR", name: "KEIR International Co.", nameAr: "كير", aliases: [] },
    { symbol: "9543.SR", name: "Saudi Networkers Services Co., Ltd.", nameAr: "نت وركرس", aliases: [] },
    { symbol: "9544.SR", name: "Future Care Trading Co.", nameAr: "الرعاية المستقبلية", aliases: [] },
    { symbol: "9545.SR", name: "International Human Resources Company", nameAr: "الدولية", aliases: [] },
    { symbol: "9546.SR", name: "Naba Alsaha Medical Services Co.", nameAr: "نبع الصحة", aliases: [] },
    { symbol: "9548.SR", name: "Arabian Plastic Industrial Co.", nameAr: "ابيكو", aliases: [] },
    { symbol: "9549.SR", name: "Abdulaziz and Mansour Ibrahim Albabtin Co.", nameAr: "البابطين الغذائية", aliases: [] },
    { symbol: "9550.SR", name: "Sure Global Technology Company", nameAr: "شور", aliases: [] },
    { symbol: "9551.SR", name: "Knowledge Tower Trading Co.", nameAr: "برج المعرفة", aliases: [] },
    { symbol: "9552.SR", name: "Saudi Top for Trading Company", nameAr: "قمة السعودية", aliases: [] },
    { symbol: "9553.SR", name: "Molan Steel Company", nameAr: "ملان", aliases: [] },
    { symbol: "9555.SR", name: "Leen Alkhair Trading Co", nameAr: "لين الخير", aliases: [] },
    { symbol: "9557.SR", name: "Edarat Communication and Information Technology Co.", nameAr: "إدارات", aliases: [] },
    { symbol: "9558.SR", name: "Alqemam for Computer Systems Co.", nameAr: "القمم", aliases: [] },
    { symbol: "9559.SR", name: "Balady Poultry Trading Co.", nameAr: "بلدي", aliases: [] },
    { symbol: "9560.SR", name: "WAJA company", nameAr: "وجا", aliases: [] },
    { symbol: "9561.SR", name: "Knowledge Net Company", nameAr: "نولجنت", aliases: [] },
    { symbol: "9562.SR", name: "Food Gate Trading Company", nameAr: "بوابة الأطعمة", aliases: [] },
    { symbol: "9563.SR", name: "Bena Steel Industries Company", nameAr: "بناء", aliases: [] },
    { symbol: "9564.SR", name: "Horizon Food Company", nameAr: "آفاق الغذاء", aliases: [] },
    { symbol: "9565.SR", name: "Meyar Company", nameAr: "معيار", aliases: [] },
    { symbol: "9566.SR", name: "Saudi Lime Industries Company", nameAr: "الصناعات الجيرية", aliases: [] },
    { symbol: "9567.SR", name: "Ghida Al-Sultan Co.", nameAr: "غذاء السلطان", aliases: [] },
    { symbol: "9568.SR", name: "Mayar Holding Co.", nameAr: "ميار", aliases: [] },
    { symbol: "9569.SR", name: "Almuneef Co. for Trading Industry Agriculture & Contraracting", nameAr: "آل منيف", aliases: [] },
    { symbol: "9570.SR", name: "Tam Development Company", nameAr: "تام التنموية", aliases: [] },
    { symbol: "9571.SR", name: "Munawla Cargo Company", nameAr: "مناوله", aliases: [] },
    { symbol: "9572.SR", name: "Al Razi Medical Company", nameAr: "الرازي", aliases: [] },
    { symbol: "9574.SR", name: "Professional Medical Expertise Co.", nameAr: "بروميديكس", aliases: [] },
    { symbol: "9575.SR", name: "Marble Design Company", nameAr: "ماربل ديزاين", aliases: [] },
    { symbol: "9576.SR", name: "Paper Home Company", nameAr: "منزل الورق", aliases: [] },
    { symbol: "9577.SR", name: "DAR ALMARKABAH For Renting Cars Company", nameAr: "دار المركبة", aliases: [] },
    { symbol: "9578.SR", name: "Atlas Elevators General Trading and Contracting Company", nameAr: "مصاعد أطلس", aliases: [] },
    { symbol: "9579.SR", name: "Rimath Hospitality Company", nameAr: "رماث", aliases: [] },
    { symbol: "9580.SR", name: "Al Rashid Industrial Co", nameAr: "الراشد للصناعة", aliases: [] },
    { symbol: "9581.SR", name: "Clean life company", nameAr: "كلين لايف", aliases: [] },
    { symbol: "9583.SR", name: "United Mining Industries Company", nameAr: "المتحدة للتعدين", aliases: [] },
    { symbol: "9584.SR", name: "Riyal Investment and Development Company", nameAr: "ريال", aliases: [] },
    { symbol: "9585.SR", name: "Mulkia Investment Company", nameAr: "ملكية", aliases: [] },
    { symbol: "9586.SR", name: "Osool & Bakheet Investment Company", nameAr: "أصول وبخيت", aliases: [] },
    { symbol: "9587.SR", name: "Lana Medical Co.", nameAr: "لانا", aliases: [] },
    { symbol: "9588.SR", name: "Riyadh Steel Company", nameAr: "حديد الرياض", aliases: [] },
    { symbol: "9589.SR", name: "Fad International Company", nameAr: "فاد", aliases: [] },
    { symbol: "9591.SR", name: "View United Real Estate Development Company", nameAr: "فيو", aliases: [] },
    { symbol: "9592.SR", name: "Almujtama Alraida Medical Co.", nameAr: "المجتمع الطبية", aliases: [] },
    { symbol: "9594.SR", name: "Almodawat Specialized Medical Hospital Company", nameAr: "المداواة", aliases: [] },
    { symbol: "9595.SR", name: "WSM for Information Technology Co.", nameAr: "وسم", aliases: [] },
    { symbol: "9596.SR", name: "Quara Finance Company", nameAr: "كوارا", aliases: [] },
    { symbol: "9597.SR", name: "Leaf Global Environmental Services Company", nameAr: "الليف", aliases: [] },
    { symbol: "9598.SR", name: "Al Mohafaza Company for Education", nameAr: "المحافظة للتعليم", aliases: [] },
    { symbol: "9599.SR", name: "Taqat Mineral Trading Co", nameAr: "طاقات", aliases: [] },
    { symbol: "9600.SR", name: "Qomel Company", nameAr: "كومل", aliases: [] },
    { symbol: "9601.SR", name: "Mohammed Hadi Al Rasheed and Partners Co.", nameAr: "الرشيد", aliases: [] },
    { symbol: "9602.SR", name: "Yaqeen Capital Company", nameAr: "يقين", aliases: [] },
    { symbol: "9603.SR", name: "Horizon Educational Company", nameAr: "الأفق التعليمية", aliases: [] },
    { symbol: "9604.SR", name: "Miral Dental Clinics Co.", nameAr: "ميرال", aliases: [] },
    { symbol: "9605.SR", name: "Neft Alsharq Co. for Chemical Industries", nameAr: "نفط الشرق", aliases: [] },
    { symbol: "9606.SR", name: "Altharwah Albashariyyah Co.", nameAr: "ثروة", aliases: [] },
    { symbol: "9607.SR", name: "ASG Plastic Factory Company", nameAr: "عسق", aliases: [] },
    { symbol: "9608.SR", name: "Al Ashghal Almoysra Company", nameAr: "الأشغال الميسرة", aliases: [] },
    { symbol: "9609.SR", name: "Naas Petrol Factory Company", nameAr: "بترول ناس", aliases: [] },
    { symbol: "9610.SR", name: "First Avenue Real Estate Development Company", nameAr: "الجادة الأولى", aliases: [] },
    { symbol: "9611.SR", name: "United Arab Float Glass Co.", nameAr: "المتحدة للزجاج المسطح", aliases: [] },
    { symbol: "9612.SR", name: "SAMA Healthy Water Factory company", nameAr: "مياه سما", aliases: [] },
    { symbol: "9613.SR", name: "Shalfa Facilities Management Co.", nameAr: "شلفا", aliases: [] },
    { symbol: "9614.SR", name: "Purity For Information Technology Co.", nameAr: "نقاوة", aliases: [] },
    { symbol: "9615.SR", name: "Mufeed Company", nameAr: "مفيد", aliases: [] },
    { symbol: "9617.SR", name: "Arabica Star Company", nameAr: "ارابيكا ستار", aliases: [] },
    { symbol: "9618.SR", name: "Al-Fakhera Men Tailoring Co.", nameAr: "الفاخرة", aliases: [] },
    { symbol: "9619.SR", name: "Multi Business Group for Projects Company", nameAr: "الأعمال المتعددة", aliases: [] },
    { symbol: "9620.SR", name: "Balsm Alofoq Medical Company", nameAr: "بلسم الطبية", aliases: [] },
    { symbol: "9621.SR", name: "Digital Research Company", nameAr: "دي آر سي", aliases: [] },
    { symbol: "9622.SR", name: "Shmoh Almadi Co.", nameAr: "شموع الماضي", aliases: [] },
    { symbol: "9623.SR", name: "Albattal Factory for Chemical Industries Co.", nameAr: "مصنع البتال", aliases: [] },
    { symbol: "9624.SR", name: "Alshehili Company for metal industries", nameAr: "الشهيلي المعدنية", aliases: [] },
    { symbol: "9625.SR", name: "Itmam Consultancy Co.", nameAr: "إتمام", aliases: [] },
    { symbol: "9626.SR", name: "Basma Adeem Medical Co.", nameAr: "سمايل كير", aliases: [] },
    { symbol: "9627.SR", name: "Twareat Medical Care Co.", nameAr: "طوارئيات", aliases: [] },
    { symbol: "9628.SR", name: "Lamasat Company Limited", nameAr: "لمسات", aliases: [] },
    { symbol: "9630.SR", name: "Ratio Specialty Company For Trading", nameAr: "ريشيو", aliases: [] },
    { symbol: "9631.SR", name: "Hedab Alkhaleej Trading Co.", nameAr: "هضاب الخليج", aliases: [] },
    { symbol: "9632.SR", name: "Future Vision for Health Training Co.", nameAr: "رؤية المستقبل", aliases: [] },
    { symbol: "9633.SR", name: "Service Equipment Co.", nameAr: "آلات الصيانة", aliases: [] },
    { symbol: "9634.SR", name: "Adeer Real Estate Co.", nameAr: "أدير", aliases: [] },
    { symbol: "9635.SR", name: "Dkhoun National Trading Co.", nameAr: "دخون", aliases: [] },
    { symbol: "9636.SR", name: "Al Kuzama Trading Company", nameAr: "الخزامى", aliases: [] },
    { symbol: "9637.SR", name: "Axelerated Solutions for Information & Communication Tech", nameAr: "الحلول المتسارعة", aliases: [] },
    { symbol: "9639.SR", name: "Anmat Technology for Trading Co.", nameAr: "أنماط", aliases: [] },
    { symbol: "9640.SR", name: "ASAS Makeen Real Estate Development and Investment Company", nameAr: "أساس مكين", aliases: [] },
    { symbol: "9641.SR", name: "Hawyia Auctions Co.", nameAr: "هوية", aliases: [] },
    { symbol: "9642.SR", name: "Time Entertainment Co.", nameAr: "تايم", aliases: [] },
    { symbol: "9644.SR", name: "Naf Company for Feed for Industry", nameAr: "ناف", aliases: [] },
    { symbol: "9645.SR", name: "National Signage Industria Co.", nameAr: "ساين وورلد", aliases: [] },
    { symbol: "9647.SR", name: "Wajd Life Trading Co.", nameAr: "وجد الحياة", aliases: [] },
    { symbol: "9648.SR", name: "Hamad Mohammed Bin Saedan Real Estate Co.", nameAr: "حمد بن سعيدان العقارية", aliases: [] },
    { symbol: "9649.SR", name: "Jamjoom Fashion Trading Co.", nameAr: "جمجوم فاشن", aliases: [] },
    { symbol: "9650.SR", name: "Sahat Almajd Trading Co.", nameAr: "ساحة المجد", aliases: [] },
    { symbol: "9651.SR", name: "Abdulaziz Altwijri Trading Co.", nameAr: "التويجري", aliases: [] },
    { symbol: "9653.SR", name: "Khaled Dhafer & Bros for Logistic Services Co.", nameAr: "خالد ظافر وإخوانه", aliases: [] },
    { symbol: "9655.SR", name: "MSGA Investment Company", nameAr: "مسقا", aliases: [] },];

const ARABIC = /[\u0600-\u06FF]/;
const MARKS = /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED\u0640]/g;

const BY_SYMBOL = new Map(SAUDI_SYMBOLS.map((entry) => [entry.symbol, entry]));

/** The English name for a Tadawul ticker, or null when it is not a Saudi symbol. */
export const saudiSymbolName = (symbol: string): string | null =>
    BY_SYMBOL.get((symbol || '').trim().toUpperCase())?.name ?? null;

/** The Arabic name for a Tadawul ticker, or null when it is not a Saudi symbol. */
export const saudiSymbolNameAr = (symbol: string): string | null =>
    BY_SYMBOL.get((symbol || '').trim().toUpperCase())?.nameAr ?? null;

type IndexEntry = { entry: SaudiSymbol; keys: string[] };

const INDEX: IndexEntry[] = SAUDI_SYMBOLS.map((entry) => ({
    entry,
    keys: [entry.name, entry.nameAr, ...entry.aliases].map(normalizeArabic).filter(Boolean),
}));

/** Folds the spelling variants a reader may use, so one search finds them all. */
export function normalizeArabic(value: string): string {
    return value
        .trim()
        .toLowerCase()
        .replace(MARKS, '')
        .replace(/[أإآٱ]/g, 'ا')
        .replace(/ى/g, 'ي')
        .replace(/ؤ/g, 'و')
        .replace(/ئ/g, 'ي')
        .replace(/ة/g, 'ه')
        .replace(/[^\p{L}\p{N} ]/gu, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

// A longer query that still matches is a more specific match, so length breaks ties.
const score = (key: string, query: string): number => {
    if (key === query) return 100;
    if (key.startsWith(query)) return 60 + query.length;
    if (key.includes(` ${query}`)) return 50 + query.length;
    if (key.includes(query)) return 30 + query.length;
    // The reader typed more than the stored name, e.g. "شركة الاتصالات السعودية".
    if (query.includes(key)) return 20 + key.length;
    return 0;
};

/**
 * Matches an Arabic query against the Saudi table. A Latin query returns nothing: Finnhub already
 * covers that half, and answering here would shadow its results.
 */
export function searchSaudiSymbols(query: string, limit = 5): SaudiSymbol[] {
    const raw = typeof query === 'string' ? query.trim() : '';
    if (!ARABIC.test(raw)) return [];
    const q = normalizeArabic(raw);
    if (q.length < 2) return [];

    const hits: { entry: SaudiSymbol; score: number }[] = [];
    for (const { entry, keys } of INDEX) {
        let best = 0;
        for (const key of keys) {
            const value = score(key, q);
            if (value > best) best = value;
        }
        if (best > 0) hits.push({ entry, score: best });
    }

    return hits
        .sort((a, b) => b.score - a.score)
        .slice(0, limit)
        .map((hit) => hit.entry);
}
