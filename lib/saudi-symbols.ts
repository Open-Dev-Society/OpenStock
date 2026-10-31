// Arabic search for Tadawul companies.
//
// Finnhub's symbol search is Latin-only: it has no index of Arabic names, so a reader who types
// "أرامكو" gets nothing and has to know the ticker. This table closes that gap for the Saudi
// market. It is static on purpose — no API quota, no network, and it works when Finnhub is down.
//
// Coverage: the 270 main-market (TASI) companies, each with its Arabic names. The tickers and the
// English names come from the live Tadawul listing (TradingView's TADAWUL feed); the Arabic names
// come from the Arabic Wikipedia list of Tadawul companies, plus names for listings that postdate
// it, plus the short forms readers actually type ("أرامكو", "الراجحي").
// The parallel market (Nomu, tickers 9xxx) is deliberately not included yet.

export type SaudiSymbol = {
    /** Ticker exactly as the quote feed expects it. */
    symbol: string;
    /** English name, as the exchange lists it. */
    name: string;
    /** Arabic names a reader might type, including common short forms. */
    aliases: string[];
};

export const SAUDI_SYMBOLS: readonly SaudiSymbol[] = [
    { symbol: "1010.SR", name: "Riyad Bank", aliases: ["بنك الرياض", "الرياض"] },
    { symbol: "1020.SR", name: "Bank Aljazira", aliases: ["بنك الجزيرة", "الجزيرة"] },
    { symbol: "1030.SR", name: "Saudi Investment Bank", aliases: ["البنك السعودي للاستثمار", "الإستثمار", "الاستثمار", "بنك الاستثمار"] },
    { symbol: "1050.SR", name: "Banque Saudi Fransi", aliases: ["البنك السعودي الفرنسي", "السعودي الفرنسي"] },
    { symbol: "1060.SR", name: "Saudi Awwal Bank", aliases: ["البنك السعودي البريطاني", "ساب", "الأول", "البنك السعودي الأول"] },
    { symbol: "1080.SR", name: "Arab National Bank", aliases: ["البنك العربي الوطني", "العربي"] },
    { symbol: "1111.SR", name: "Saudi Tadawul Group Holding Company", aliases: ["مجموعة تداول السعودية القابضة", "تداول السعودية"] },
    { symbol: "1120.SR", name: "Al Rajhi Bank", aliases: ["مصرف الراجحي", "الراجحي", "بنك الراجحي"] },
    { symbol: "1140.SR", name: "Bank Albilad", aliases: ["بنك البلاد", "البلاد"] },
    { symbol: "1150.SR", name: "Alinma Bank", aliases: ["مصرف الإنماء", "الإنماء"] },
    { symbol: "1180.SR", name: "Saudi National Bank", aliases: ["البنك الأهلي التجاري", "الأهلي", "البنك الأهلي", "الأهلي السعودي"] },
    { symbol: "1182.SR", name: "Amlak International for Real Estate Finance Company", aliases: ["شركة أملاك العالمية للتمويل العقاري", "أملاك"] },
    { symbol: "1183.SR", name: "SHL Finance Co.", aliases: ["الشركة السعودية لتمويل المساكن", "سهل"] },
    { symbol: "1201.SR", name: "Takween Advanced Industries Co.", aliases: ["شركة تكوين المتطورة للصناعات", "تكوين"] },
    { symbol: "1202.SR", name: "Middle East Paper Co.", aliases: ["شركة الشرق الأوسط لصناعة وإنتاج الورق", "مبكو"] },
    { symbol: "1210.SR", name: "Basic Chemical Industries Co.", aliases: ["شركة الصناعات الكيميائية الأساسية", "بي سي آي"] },
    { symbol: "1211.SR", name: "Saudi Arabian Mining Co.", aliases: ["شركة التعدين العربية السعودية", "معادن"] },
    { symbol: "1212.SR", name: "Astra Industrial Group", aliases: ["مجموعة أسترا الصناعية", "أسترا الصناعية"] },
    { symbol: "1213.SR", name: "Naseej International Trading Co.", aliases: ["شركة نسيج العالمية التجارية", "نسيج"] },
    { symbol: "1214.SR", name: "Al Hassan Ghazi Ibrahim Shaker Co.", aliases: ["شركة الحسن غازي إبراهيم شاكر", "شاكر"] },
    { symbol: "1301.SR", name: "United Wire Factories Co.", aliases: ["شركة اتحاد مصانع الأسلاك", "أسلاك"] },
    { symbol: "1302.SR", name: "Bawan Co.", aliases: ["شركة بوان", "بوان"] },
    { symbol: "1303.SR", name: "Electrical Industries Co.", aliases: ["شركة الصناعات الكهربائية", "الصناعات الكهربائية"] },
    { symbol: "1304.SR", name: "Al Yamamah Steel Industries Co.", aliases: ["شركة اليمامة للصناعات الحديدية", "اليمامة للحديد"] },
    { symbol: "1320.SR", name: "Saudi Steel Pipe Co.", aliases: ["الشركة السعودية لأنابيب الصلب", "أنابيب السعودية"] },
    { symbol: "1321.SR", name: "East Pipes Integrated Company for Industry", aliases: ["شركة أنابيب الشرق المتكاملة للصناعة", "أنابيب الشرق"] },
    { symbol: "1322.SR", name: "Al Masane Al Kobra Mining Co.", aliases: ["المصانع الكبرى للتعدين"] },
    { symbol: "1323.SR", name: "United Carton Industries Company", aliases: ["المتحدة للكرتون"] },
    { symbol: "1324.SR", name: "Saleh Abdulaziz Al Rashed & Sons Co.", aliases: ["صالح عبدالعزيز الراشد وأولاده"] },
    { symbol: "1325.SR", name: "Watani Iron Steel Co", aliases: ["الوطنية للحديد والصلب"] },
    { symbol: "1810.SR", name: "Seera Holding Group", aliases: ["مجموعة سيرا القابضة", "سيرا"] },
    { symbol: "1820.SR", name: "BAAN Holding Group Company", aliases: ["مجموعة عبد المحسن الحكير للسياحة والتنمية", "مجموعة الحكير"] },
    { symbol: "1830.SR", name: "Leejam Sports Co.", aliases: ["شركة لجام للرياضة", "وقت اللياقة"] },
    { symbol: "1831.SR", name: "Maharah Human Resources Co.", aliases: ["شركة مهارة للموارد البشرية", "مهارة"] },
    { symbol: "1832.SR", name: "Sadr Logistics Co.", aliases: ["شركة صدر للخدمات اللوجستية", "الصمعاني"] },
    { symbol: "1833.SR", name: "Almawarid Manpower Company", aliases: ["الموارد للقوى العاملة"] },
    { symbol: "1834.SR", name: "Saudi Manpower Solutions Company", aliases: ["سماسكو", "حلول القوى العاملة"] },
    { symbol: "1835.SR", name: "Tamkeen Human Resources Company", aliases: ["تمكين للموارد البشرية"] },
    { symbol: "2001.SR", name: "Methanol Chemicals Co.", aliases: ["شركة كيمائيات الميثانول", "كيمانول"] },
    { symbol: "2010.SR", name: "Saudi Basic Industries Corp.", aliases: ["الشركة السعودية للصناعات الأساسية", "سابك"] },
    { symbol: "2020.SR", name: "SABIC Agri-Nutrients Co.", aliases: ["شركة سابك للمغذيات الزراعية", "سافكو"] },
    { symbol: "2030.SR", name: "Saudi Arabia Refineries Co.", aliases: ["شركة المصافي العربية السعودية", "المصافي"] },
    { symbol: "2040.SR", name: "Saudi Ceramic Co.", aliases: ["شركة الخزف السعودي", "الخزف السعودي"] },
    { symbol: "2050.SR", name: "Savola Group", aliases: ["مجموعة صافولا"] },
    { symbol: "2060.SR", name: "National Industrialization Co.", aliases: ["شركة التصنيع الوطنية", "التصنيع"] },
    { symbol: "2070.SR", name: "Saudi Pharmaceutical Industries & Medical Appliances Corp.", aliases: ["الشركة السعودية للصناعات الدوائية والمستلزمات الطبية", "الدوائية"] },
    { symbol: "2080.SR", name: "National Gas & Industrialization Co.", aliases: ["شركة الغاز والتصنيع الأهلية", "الغاز"] },
    { symbol: "2081.SR", name: "Alkhorayef Water & Power Technologies", aliases: ["شركة الخريف لتقنية المياه والطاقة", "المياه"] },
    { symbol: "2082.SR", name: "ACWA Power", aliases: ["شركة أعمال المياه والطاقة الدولية", "أكوا باور"] },
    { symbol: "2083.SR", name: "Power and Water Utility Company for Jubail and Yanbu (Marafiq)", aliases: ["مرافق"] },
    { symbol: "2084.SR", name: "Miahona Co.", aliases: ["مياهنا"] },
    { symbol: "2090.SR", name: "National Gypsum Co.", aliases: ["شركة الجبس الأهلية", "جبسكو"] },
    { symbol: "2100.SR", name: "Wafrah for Industry & Development", aliases: ["شركة وفرة للصناعة والتنمية", "وفرة"] },
    { symbol: "2110.SR", name: "Saudi Cable Co.", aliases: ["شركة الكابلات السعودية", "الكابلات السعودية"] },
    { symbol: "2120.SR", name: "Saudi Advanced Industries Co.", aliases: ["الشركة السعودية للصناعات المتطورة", "متطورة"] },
    { symbol: "2130.SR", name: "Saudi Industrial Development Co.", aliases: ["الشركة السعودية للتنمية الصناعية", "صدق"] },
    { symbol: "2140.SR", name: "AYYAN Investment Company", aliases: ["شركة أيان للاستثمار", "أيان"] },
    { symbol: "2150.SR", name: "National Co. for Glass Industries", aliases: ["شركة الصناعات الزجاجية الوطنية", "زجاج"] },
    { symbol: "2160.SR", name: "Saudi Arabian Amiantit Co.", aliases: ["شركة أميانتيت العربية السعودية", "أميانتيت"] },
    { symbol: "2170.SR", name: "Alujain Corporation", aliases: ["شركة اللجين القابضة", "اللجين"] },
    { symbol: "2180.SR", name: "Filing & Packing Materials Manufacturing Co.", aliases: ["شركة تصنيع مواد التعبئة والتغليف", "فيبكو"] },
    { symbol: "2190.SR", name: "Sustained Infrastructure Holding Company", aliases: ["الشركة السعودية للخدمات الصناعية", "سيسكو"] },
    { symbol: "2200.SR", name: "Arabian Pipes Co.", aliases: ["الشركة العربية للأنابيب", "أنابيب"] },
    { symbol: "2220.SR", name: "National Metal Manufacturing & Casting Co.", aliases: ["الشركة الوطنية لتصنيع وسبك المعادن", "معدنية"] },
    { symbol: "2222.SR", name: "Saudi Arabian Oil Co.", aliases: ["شركة الزيت العربية السعودية", "أرامكو السعودية", "أرامكو", "ارامكو"] },
    { symbol: "2223.SR", name: "Saudi Aramco Base Oil Company - Luberef", aliases: ["لوبريف", "أرامكو لزيوت الأساس"] },
    { symbol: "2230.SR", name: "Saudi Chemical Co.", aliases: ["الشركة الكيميائية السعودية القابضة", "الكيميائية"] },
    { symbol: "2240.SR", name: "Advanced Building Industries Co.", aliases: ["شركة الزامل للاستثمار الصناعي", "الزامل للصناعة"] },
    { symbol: "2250.SR", name: "Saudi Industrial Investment Group", aliases: ["المجموعة السعودية للاستثمار الصناعي", "المجموعة السعودية"] },
    { symbol: "2270.SR", name: "Saudia Dairy & Foodstuff Co.", aliases: ["الشركة السعودية لمنتجات الألبان والأغذية", "سدافكو"] },
    { symbol: "2280.SR", name: "Almarai Company", aliases: ["شركة المراعي", "المراعي"] },
    { symbol: "2281.SR", name: "Tanmiah Food Company", aliases: ["شركة التنمية الغذائية", "تنمية"] },
    { symbol: "2282.SR", name: "Naqi Water Company", aliases: ["نقي للمياه", "نقي"] },
    { symbol: "2283.SR", name: "First Milling Co.", aliases: ["المطاحن الأولى"] },
    { symbol: "2284.SR", name: "Modern Mills for Food Products Co.", aliases: ["المطاحن الحديثة"] },
    { symbol: "2285.SR", name: "Arabian Mills for Food Products Company", aliases: ["المطاحن العربية"] },
    { symbol: "2286.SR", name: "Fourth Milling Company", aliases: ["المطاحن الرابعة"] },
    { symbol: "2287.SR", name: "Arabian Company for Agricultural and Industrial Investment", aliases: ["الاستثمار الزراعي والصناعي"] },
    { symbol: "2288.SR", name: "Nofoth Food Products Co", aliases: ["نفوذ للمنتجات الغذائية", "نفوذ"] },
    { symbol: "2290.SR", name: "Yanbu National Petrochemical Co.", aliases: ["شركة ينبع الوطنية للبتروكيماويات", "ينساب"] },
    { symbol: "2300.SR", name: "Saudi Paper Manufacturing Co.", aliases: ["الشركة السعودية لصناعة الورق", "صناعة الورق"] },
    { symbol: "2310.SR", name: "Sahara International Petrochemical Company", aliases: ["شركة الصحراء العالمية للبتروكيماويات", "سبكيم العالمية", "سبكيم"] },
    { symbol: "2320.SR", name: "Al-Babtain Power & Telecommunication Co.", aliases: ["شركة البابطين للطاقة والإتصالات", "البابطين"] },
    { symbol: "2330.SR", name: "Advanced Petrochemical Co.", aliases: ["الشركة المتقدمة للبتروكيماويات", "المتقدمة"] },
    { symbol: "2340.SR", name: "ARTEX Industrial Investment Company", aliases: ["شركة العبد اللطيف للاستثمار الصناعي", "العبداللطيف"] },
    { symbol: "2350.SR", name: "Saudi Kayan Petrochemical Co.", aliases: ["شركة كيان السعودية للبتروكيماويات", "كيان السعودية", "كيان"] },
    { symbol: "2360.SR", name: "Saudi Vitrified Clay Pipes Co.", aliases: ["الشركة السعودية لإنتاج الأنابيب الفخارية", "الفخارية"] },
    { symbol: "2370.SR", name: "Middle East Specialized Cables Co.", aliases: ["شركة الشرق الأوسط للكابلات المتخصصة", "مسك"] },
    { symbol: "2380.SR", name: "Rabigh Refining & Petrochemical Co. Class A", aliases: ["شركة رابغ للتكرير والبتروكيماويات", "بترو رابغ"] },
    { symbol: "2381.SR", name: "Arabian Drilling Co.", aliases: ["شركة الحفر العربية", "الحفر العربية"] },
    { symbol: "2382.SR", name: "Ades Holding Company", aliases: ["أديس القابضة", "أديس"] },
    { symbol: "3002.SR", name: "Najran Cement Co.", aliases: ["شركة أسمنت نجران", "أسمنت نجران"] },
    { symbol: "3003.SR", name: "City Cement Co.", aliases: ["شركة أسمنت المدينة", "أسمنت المدينة"] },
    { symbol: "3004.SR", name: "Northern Region Cement Co.", aliases: ["شركة أسمنت المنطقة الشمالية", "أسمنت الشمالية"] },
    { symbol: "3005.SR", name: "Umm Al-Qura Cement Company", aliases: ["شركة إسمنت أم القرى", "إسمنت أم القرى"] },
    { symbol: "3007.SR", name: "Zahrat Al Waha For Trading Co.", aliases: ["شركة زهرة الواحة للتجارة", "الواحة"] },
    { symbol: "3008.SR", name: "Al Kathiri Holding Company", aliases: ["شركة الكثيري القابضة", "الكثيري"] },
    { symbol: "3010.SR", name: "Arabian Cement Co.", aliases: ["شركة الأسمنت العربية", "أسمنت العربية"] },
    { symbol: "3020.SR", name: "Yamamah Saudi Cement Co.", aliases: ["شركة أسمنت اليمامة", "أسمنت اليمامة"] },
    { symbol: "3030.SR", name: "Saudi Cement Co.", aliases: ["شركة الأسمنت السعودية", "أسمنت السعودية"] },
    { symbol: "3040.SR", name: "Qassim Cement Co.", aliases: ["شركة أسمنت القصيم", "أسمنت القصيم"] },
    { symbol: "3050.SR", name: "Southern Province Cement Co.", aliases: ["شركة أسمنت المنطقة الجنوبية", "أسمنت الجنوب"] },
    { symbol: "3060.SR", name: "Yanbu Cement Co.", aliases: ["شركة أسمنت ينبع", "أسمنت ينبع"] },
    { symbol: "3080.SR", name: "Eastern Province Cement Co.", aliases: ["شركة أسمنت المنطقة الشرقية", "أسمنت الشرقية"] },
    { symbol: "3090.SR", name: "Tabuk Cement Co.", aliases: ["شركة أسمنت تبوك", "أسمنت تبوك"] },
    { symbol: "3091.SR", name: "Al Jouf Cement Co.", aliases: ["شركة أسمنت الجوف", "أسمنت الجوف"] },
    { symbol: "3092.SR", name: "Riyadh Cement Co.", aliases: ["شركة أسمنت الرياض", "أسمنت الرياض"] },
    { symbol: "4001.SR", name: "Abdullah Al Othaim Markets Co.", aliases: ["شركة أسواق عبد الله العثيم", "أسواق ع العثيم", "العثيم", "أسواق العثيم"] },
    { symbol: "4002.SR", name: "Mouwasat Medical Services Co.", aliases: ["شركة المواساة للخدمات الطبية", "المواساة"] },
    { symbol: "4003.SR", name: "United Electronics Co.", aliases: ["الشركة المتحدة للإلكترونيات", "إكسترا"] },
    { symbol: "4004.SR", name: "Dallah Healthcare Co.", aliases: ["شركة دله للخدمات الصحية", "دله الصحية"] },
    { symbol: "4005.SR", name: "National Medical Care Co.", aliases: ["الشركة الوطنية للرعاية الطبية", "رعاية"] },
    { symbol: "4006.SR", name: "Saudi Marketing Co.", aliases: ["الشركة السعودية للتسويق", "أسواق المزرعة"] },
    { symbol: "4007.SR", name: "Al Hammadi Holding", aliases: ["شركة الحمادي للتنمية والإستثمار", "الحمادي"] },
    { symbol: "4008.SR", name: "Saudi Co. for Hardware", aliases: ["الشركة السعودية للعدد والأدوات", "ساكو"] },
    { symbol: "4009.SR", name: "Middle East Healthcare Company", aliases: ["شركة الشرق الأوسط للرعاية الصحية", "المستشفى السعودي الألماني"] },
    { symbol: "4011.SR", name: "Lazurde Company for Jewelry", aliases: ["شركة لازوردي للمجوهرات", "لازوردي"] },
    { symbol: "4012.SR", name: "Thob Al-Aseel Co.", aliases: ["شركة ثوب الأصيل", "الأصيل"] },
    { symbol: "4013.SR", name: "Dr. Sulaiman Al-Habib Medical Services Group Co.", aliases: ["مجموعة الدكتور سليمان الحبيب للخدمات الطبية", "سليمان الحبيب", "الحبيب"] },
    { symbol: "4014.SR", name: "Scientific and Medical Equipment House", aliases: ["بيت المعدات العلمية والطبية"] },
    { symbol: "4015.SR", name: "Jamjoom Pharmaceuticals Factory Co.", aliases: ["جمجوم فارما", "مصنع جمجوم"] },
    { symbol: "4016.SR", name: "Middle East Pharmaceutical Industries Company", aliases: ["أفالون فارما", "الشرق الأوسط للصناعات الدوائية"] },
    { symbol: "4017.SR", name: "Dr. Soliman Abdul Kader Fakeeh Hospital Co.", aliases: ["مستشفى د سليمان فقيه", "فقيه"] },
    { symbol: "4018.SR", name: "Almoosa Health Co.", aliases: ["الموسى الصحية"] },
    { symbol: "4019.SR", name: "Specialized Medical Company", aliases: ["الرعاية الطبية المتخصصة"] },
    { symbol: "4020.SR", name: "Saudi Real Estate Co.", aliases: ["الشركة العقارية السعودية", "العقارية"] },
    { symbol: "4021.SR", name: "Canadian Medical Center Co.", aliases: ["المركز الطبي الكندي"] },
    { symbol: "4030.SR", name: "National Shipping Co. of Saudi Arabia", aliases: ["الشركة الوطنية السعودية للنقل البحري", "البحري"] },
    { symbol: "4031.SR", name: "Saudi Ground Services Co.", aliases: ["الشركة السعودية للخدمات الأرضية", "الخدمات الأرضية"] },
    { symbol: "4040.SR", name: "Saudi Public Transport Co.", aliases: ["الشركة السعودية للنقل الجماعي", "سابتكو"] },
    { symbol: "4050.SR", name: "Saudi Automotive Services Co.", aliases: ["الشركة السعودية لخدمات السيارات والمعدات", "ساسكو"] },
    { symbol: "4051.SR", name: "Baazeem Trading Co.", aliases: ["شركة باعظيم التجارية", "باعظيم"] },
    { symbol: "4061.SR", name: "Anaam International Holding Group", aliases: ["مجموعة أنعام الدولية القابضة", "أنعام القابضة"] },
    { symbol: "4070.SR", name: "Tihama Advertising & Public Relations Co.", aliases: ["شركة تهامة للإعلان والعلاقات العامة", "تهامة"] },
    { symbol: "4071.SR", name: "Arabian Contracting Services Co.", aliases: ["العربية للخدمات التعاقدية", "العربي"] },
    { symbol: "4072.SR", name: "MBC Group Company", aliases: ["مجموعة إم بي سي", "إم بي سي"] },
    { symbol: "4080.SR", name: "Sinad Holding Company", aliases: ["شركة سناد القابضة", "سناد القابضة"] },
    { symbol: "4081.SR", name: "Nayifat Finance Company", aliases: ["شركة النايفات للتمويل", "النايفات"] },
    { symbol: "4082.SR", name: "Morabaha Marina Financing Company", aliases: ["مرابحة مارينا"] },
    { symbol: "4083.SR", name: "United International Holding Co.", aliases: ["المتحدة الدولية القابضة"] },
    { symbol: "4084.SR", name: "Derayah Financial Company", aliases: ["دراية المالية", "دراية"] },
    { symbol: "4090.SR", name: "Taiba Investment Company", aliases: ["شركة طيبة للإستثمار", "طيبة"] },
    { symbol: "4100.SR", name: "Makkah Construction & Development Co.", aliases: ["شركة مكة للإنشاء والتعمير", "مكة"] },
    { symbol: "4110.SR", name: "Batic Investments and Logistics Co.", aliases: ["شركة باتك للاستثمار والأعمال اللوجستية", "باتك"] },
    { symbol: "4130.SR", name: "Saudi Darb Investment Co.", aliases: ["شركة الباحة للإستثمار والتنمية", "الباحة"] },
    { symbol: "4140.SR", name: "Saudi Industrial Export Co.", aliases: ["الشركة السعودية للصادرات الصناعية", "صادرات"] },
    { symbol: "4141.SR", name: "Al-Omran Industrial & Trading Co.", aliases: ["شركة العمران للصناعة والتجارة", "العمران"] },
    { symbol: "4142.SR", name: "Riyadh Cables Group Co.", aliases: ["كابلات الرياض"] },
    { symbol: "4143.SR", name: "Al Taiseer Group Talco Industrial Co.", aliases: ["التيسير تالكو"] },
    { symbol: "4144.SR", name: "Raoom trading Company", aliases: ["رؤوم للتجارة"] },
    { symbol: "4145.SR", name: "Obeikan Glass Co", aliases: ["عبيكان للزجاج"] },
    { symbol: "4146.SR", name: "Gas Arabian Services Co", aliases: ["الغاز العربية للخدمات"] },
    { symbol: "4147.SR", name: "Consolidated Grunenfelder Saady Holding Co.", aliases: ["جرونينفلدر سعدي القابضة"] },
    { symbol: "4148.SR", name: "Alwasail Industrial Company", aliases: ["الوسائل الصناعية"] },
    { symbol: "4150.SR", name: "Arriyadh Development Co.", aliases: ["شركة الرياض للتعمير", "التعمير"] },
    { symbol: "4160.SR", name: "THIMAR Development Holding Co.", aliases: ["شركة ثمار التنمية القابضة", "ثمار"] },
    { symbol: "4161.SR", name: "BinDawood Holding Company", aliases: ["شركة بن داود القابضة", "بن داود"] },
    { symbol: "4162.SR", name: "Almunajem Foods Company", aliases: ["المنجم للأغذية"] },
    { symbol: "4163.SR", name: "Al Dawaa Medical Services Co.", aliases: ["الدواء للخدمات الطبية", "الدواء"] },
    { symbol: "4164.SR", name: "Nahdi Medical Company", aliases: ["النهدي الطبية", "النهدي"] },
    { symbol: "4165.SR", name: "Al Majed for Oud Company", aliases: ["الماجد للعود"] },
    { symbol: "4170.SR", name: "Tourism Enterprise Co.", aliases: ["شركة المشروعات السياحية", "شمس"] },
    { symbol: "4180.SR", name: "Fitaihi Holding Group", aliases: ["مجموعة فتيحي القابضة", "مجموعة فتيحي"] },
    { symbol: "4190.SR", name: "Jarir Marketing Co.", aliases: ["شركة جرير للتسويق", "جرير"] },
    { symbol: "4191.SR", name: "Abdullah Saad Mohammed Abo Moati for Bookstores Co.", aliases: ["شركة عبد الله سعد محمد أبو معطي للمكتبات", "أبو معطي"] },
    { symbol: "4192.SR", name: "Al-Saif Stores for Development & Investment Co.", aliases: ["متاجر السيف"] },
    { symbol: "4193.SR", name: "Nice One Beauty Digital Marketing Co.", aliases: ["نايس ون"] },
    { symbol: "4194.SR", name: "Marketing Home Group for Trading Co.", aliases: ["ماركتنغ هوم"] },
    { symbol: "4200.SR", name: "Aldrees Petroleum & Transport Services Co.", aliases: ["شركة الدريس للخدمات البترولية والنقليات", "الدريس"] },
    { symbol: "4210.SR", name: "Saudi Research and Media Group", aliases: ["المجموعة السعودية للأبحاث والتسويق", "الأبحاث والتسويق"] },
    { symbol: "4220.SR", name: "Emaar, The Economic City", aliases: ["إعمار المدينة الاقتصادية", "إعمار"] },
    { symbol: "4230.SR", name: "Red Sea International Co.", aliases: ["شركة البحر الأحمر العالمية", "البحر الأحمر"] },
    { symbol: "4240.SR", name: "AFG International Company", aliases: ["شركة فواز عبد العزيز الحكير وشركاه", "الحكير"] },
    { symbol: "4250.SR", name: "Jabal Omar Development Co.", aliases: ["شركة جبل عمر للتطوير", "جبل عمر"] },
    { symbol: "4260.SR", name: "United International Transportation Co. Ltd.", aliases: ["الشركة المتحدة الدولية للمواصلات", "بدجت السعودية"] },
    { symbol: "4261.SR", name: "Theeb Rent a Car Company", aliases: ["شركة ذيب لتأجير السيارات", "ذيب"] },
    { symbol: "4262.SR", name: "Lumi Rental Company", aliases: ["لومي للتأجير", "لومي"] },
    { symbol: "4263.SR", name: "SAL Saudi Logistics Services Company", aliases: ["سال", "الشركة السعودية للخدمات اللوجستية"] },
    { symbol: "4264.SR", name: "Flynas Co.", aliases: ["طيران ناس", "فلاي ناس"] },
    { symbol: "4265.SR", name: "Cherry Trading Co.", aliases: ["تشيري للتجارة"] },
    { symbol: "4270.SR", name: "Saudi Printing & Packaging Co.", aliases: ["الشركة السعودية للطباعة والتغليف", "طباعة وتغليف"] },
    { symbol: "4280.SR", name: "Kingdom Holding Co.", aliases: ["شركة المملكة القابضة", "المملكة"] },
    { symbol: "4290.SR", name: "Al Khaleej Training & Education Co.", aliases: ["شركة الخليج للتدريب والتعليم", "الخليج للتدريب"] },
    { symbol: "4291.SR", name: "National Co. for Learning & Education", aliases: ["الشركة الوطنية للتربية والتعليم", "الوطنية للتعليم"] },
    { symbol: "4292.SR", name: "Ataa Educational Company", aliases: ["شركة عطاء التعليمية", "عطاء"] },
    { symbol: "4300.SR", name: "Dar Al Arkan Real Estate Development Co.", aliases: ["شركة دار الأركان للتطوير العقاري", "دار الأركان"] },
    { symbol: "4310.SR", name: "Knowledge Economic City", aliases: ["مدينة المعرفة الاقتصادية", "مدينة المعرفة"] },
    { symbol: "4320.SR", name: "Alandalus Property Co.", aliases: ["شركة الأندلس العقارية", "الأندلس"] },
    { symbol: "4321.SR", name: "Arabian Centres Co.", aliases: ["شركة المراكز العربية", "المراكز"] },
    { symbol: "4322.SR", name: "Retal Urban Development Company", aliases: ["ريتال للتطوير العمراني"] },
    { symbol: "4323.SR", name: "Sumou Real Estate Co.", aliases: ["سمو العقارية"] },
    { symbol: "4324.SR", name: "Banan Real Estate Company", aliases: ["بنان العقارية"] },
    { symbol: "4325.SR", name: "Umm Al Qura for Development and Construction Company", aliases: ["أم القرى للتنمية والتعمير"] },
    { symbol: "4326.SR", name: "Dar Al Majed Real Estate Co.", aliases: ["دار الماجد العقارية"] },
    { symbol: "4327.SR", name: "Alramz Real Estate Co.", aliases: ["الرمز العقارية"] },
    { symbol: "4328.SR", name: "Ladun Investment Company", aliases: ["لدن للاستثمار"] },
    { symbol: "4330.SR", name: "Riyad REIT", aliases: ["صندوق الرياض ريت", "الرياض ريت"] },
    { symbol: "4331.SR", name: "AlJazira REIT Fund", aliases: ["صندوق بنك الجزيرة موطن ريت", "بنك الجزيرة موطن ريت"] },
    { symbol: "4332.SR", name: "Jadwa REIT Al-Haramain Fund", aliases: ["صندوق جدوى ريت الحرمين", "جدوى ريت الحرمين"] },
    { symbol: "4333.SR", name: "Taleem REIT Fund", aliases: ["صندوق تعليم ريت", "تعليم ريت"] },
    { symbol: "4334.SR", name: "AL Maather REIT Fund", aliases: ["صندوق المعذر ريت", "المعذر ريت"] },
    { symbol: "4335.SR", name: "Musharaka REIT Fund", aliases: ["صندوق مشاركة ريت", "مشاركة ريت"] },
    { symbol: "4336.SR", name: "Mulkia Gulf Real Estate REIT Fund", aliases: ["صندوق ملكية عقارات الخليج ريت", "ملكية ريت"] },
    { symbol: "4337.SR", name: "Al Aziziah REIT Fund", aliases: ["صندوق المشاعر ريت", "مشاعر ريت"] },
    { symbol: "4338.SR", name: "AlAhli REIT Fund 1", aliases: ["صندوق الأهلي ريت 1", "الأهلي ريت 1"] },
    { symbol: "4339.SR", name: "Derayah REIT Fund", aliases: ["صندوق دراية ريت", "دراية ريت"] },
    { symbol: "4340.SR", name: "Al Rajhi REIT Fund", aliases: ["صندوق الراجحي ريت", "الراجحي ريت"] },
    { symbol: "4342.SR", name: "Jadwa REIT Saudi Fund", aliases: ["صندوق جدوى ريت السعودية", "جدوى ريت السعودية"] },
    { symbol: "4344.SR", name: "SEDCO Capital REIT Fund", aliases: ["صندوق سدكو كابيتال ريت", "سدكو كابيتال ريت"] },
    { symbol: "4345.SR", name: "Alinma Retail REIT Fund", aliases: ["صندوق سويكورب وابل ريت", "سويكورب وابل ريت"] },
    { symbol: "4346.SR", name: "MEFIC REIT Fund", aliases: ["صندوق ميفك ريت", "ميفك ريت"] },
    { symbol: "4347.SR", name: "Bonyan REIT Fund", aliases: ["صندوق بنيان ريت", "بنيان ريت"] },
    { symbol: "4348.SR", name: "Alkhabeer REIT Fund", aliases: ["صندوق الخبير ريت", "الخبير ريت"] },
    { symbol: "4349.SR", name: "Alinma Hospitality REIT Fund", aliases: ["الإنماء للضيافة"] },
    { symbol: "4350.SR", name: "Alistithmar AREIC Diversified REIT Fund", aliases: ["الاستثمار المتنوع"] },
    { symbol: "5110.SR", name: "Saudi Energy Co.", aliases: ["الشركة السعودية للكهرباء", "كهرباء السعودية", "الكهرباء"] },
    { symbol: "6001.SR", name: "Halwani Brothers Company", aliases: ["شركة حلواني إخوان", "حلواني إخوان", "حلواني"] },
    { symbol: "6002.SR", name: "Herfy Food Services Co.", aliases: ["شركة هرفي للخدمات الغذائية", "هرفي للأغذية"] },
    { symbol: "6004.SR", name: "CATRION Catering Holding Company", aliases: ["شركة الخطوط السعودية للتموين", "التموين"] },
    { symbol: "6010.SR", name: "National Agricultural Development Co.", aliases: ["الشركة الوطنية للتنمية الزراعية", "نادك"] },
    { symbol: "6012.SR", name: "Raydan Food Co.", aliases: ["شركة ريدان الغذائية", "ريدان"] },
    { symbol: "6013.SR", name: "Development Works Food Co.", aliases: ["شركة الأعمال التطويرية الغذائية", "التطويرية الغذائية"] },
    { symbol: "6014.SR", name: "AlAmar Foods Co.", aliases: ["الأمار للأغذية"] },
    { symbol: "6016.SR", name: "Shatirah House Restaurant Burgerizzr Co.", aliases: ["برقرزيزر", "شطيرة هاوس"] },
    { symbol: "6017.SR", name: "Jahez International Company for Information Systems Technology", aliases: ["جاهز"] },
    { symbol: "6018.SR", name: "Sport Clubs Co.", aliases: ["أندية الرياضة"] },
    { symbol: "6019.SR", name: "Al Masar Al Shamil Education Co.", aliases: ["المسار الشامل للتعليم"] },
    { symbol: "6020.SR", name: "Al Gassim Investment Holding Co.", aliases: ["شركة القصيم القابضة للاستثمار", "جاكو"] },
    { symbol: "6022.SR", name: "Armah Sports Company", aliases: ["أرماح الرياضية", "أرماح"] },
    { symbol: "6040.SR", name: "Tabuk Agricultural Development Co.", aliases: ["شركة تبوك للتنمية الزراعية", "تبوك الزراعية"] },
    { symbol: "6050.SR", name: "Saudi Fisheries Co.", aliases: ["الشركة السعودية للأسماك", "الأسماك"] },
    { symbol: "6060.SR", name: "Ash-Sharqiyah Development Co.", aliases: ["شركة الشرقية للتنمية", "الشرقية للتنمية"] },
    { symbol: "6070.SR", name: "Al-Jouf Agriculture Development Co.", aliases: ["شركة الجوف الزراعية", "الجوف"] },
    { symbol: "6090.SR", name: "Jazan Development and Investment Company", aliases: ["شركة جازان للطاقة والتنمية", "جازادكو"] },
    { symbol: "7010.SR", name: "Saudi Telecom Co.", aliases: ["شركة الإتصالات السعودية", "اس تي سي", "الاتصالات السعودية", "stc"] },
    { symbol: "7020.SR", name: "Etihad Etisalat Co.", aliases: ["شركة اتحاد إتصالات", "إتحاد إتصالات", "موبايلي"] },
    { symbol: "7030.SR", name: "Mobile Telecommunications Company Saudi Arabia", aliases: ["شركة الاتصالات المتنقلة السعودية", "زين السعودية", "زين"] },
    { symbol: "7040.SR", name: "Etihad Atheeb Telecommunication Co.", aliases: ["شركة اتحاد عذيب للإتصالات", "عذيب للإتصالات"] },
    { symbol: "7200.SR", name: "Al Moammar Information Systems Company", aliases: ["شركة المعمر لأنظمة المعلومات", "ام آي اس"] },
    { symbol: "7201.SR", name: "Arab Sea Information Systems Co.", aliases: ["شركة بحر العرب لأنظمة المعلومات", "بحر العرب"] },
    { symbol: "7202.SR", name: "Arabian Internet and Communications Services Company", aliases: ["حلول", "العربية لخدمات الإنترنت والاتصالات"] },
    { symbol: "7203.SR", name: "Elm Company", aliases: ["علم"] },
    { symbol: "7204.SR", name: "Perfect Presentation for Commercial Services Co.", aliases: ["العرض المثالي"] },
    { symbol: "7205.SR", name: "Dar Albalad For Business Solutions Company", aliases: ["دار البلد"] },
    { symbol: "7211.SR", name: "Saudi Azm for Communication and Information Technology Co.", aliases: ["سعودي عزم"] },
    { symbol: "8010.SR", name: "Company for Cooperative Insurance", aliases: ["الشركة التعاونية للتأمين", "التعاونية"] },
    { symbol: "8012.SR", name: "AlJazira Takaful Taawuni Co.", aliases: ["شركة الجزيرة تكافل تعاوني", "جزيرة تكافل"] },
    { symbol: "8020.SR", name: "Malath Cooperative Insurance Co.", aliases: ["شركة ملاذ للتأمين التعاوني", "ملاذ للتأمين"] },
    { symbol: "8030.SR", name: "Mediterranean & Gulf Cooperative Insurance & Reinsurance Co.", aliases: ["شركة المتوسط والخليج للتأمين وإعادة التأمين التعاوني", "ميدغلف للتأمين"] },
    { symbol: "8040.SR", name: "Mutakamela Insurance Company", aliases: ["شركة أليانز السعودي الفرنسي للتأمين التعاوني", "أليانز إس إف"] },
    { symbol: "8050.SR", name: "SALAMA Cooperative Insurance Co.", aliases: ["شركة سلامة للتأمين التعاوني", "سلامة"] },
    { symbol: "8060.SR", name: "Walaa Cooperative Insurance Co.", aliases: ["شركة ولاء للتأمين التعاوني", "ولاء"] },
    { symbol: "8070.SR", name: "Arabian Shield Cooperative Insurance Co.", aliases: ["شركة الدرع العربي للتأمين التعاوني", "الدرع العربي"] },
    { symbol: "8100.SR", name: "Saudi Arabian Cooperative Insurance Co.", aliases: ["الشركة العربية السعودية للتأمين التعاوني", "سايكو"] },
    { symbol: "8120.SR", name: "Gulf Union Alahlia Cooperative Insurance Co.", aliases: ["شركة اتحاد الخليج للتأمين التعاوني", "اتحاد الخليج"] },
    { symbol: "8150.SR", name: "Allied Cooperative Insurance Group", aliases: ["المجموعة المتحدة للتأمين التعاوني", "أسيج"] },
    { symbol: "8160.SR", name: "Arabia Insurance Cooperative Co.", aliases: ["شركة التأمين العربية التعاونية", "التأمين العربية"] },
    { symbol: "8170.SR", name: "Al-Etihad Cooperative Insurance Co.", aliases: ["شركة الاتحاد للتأمين التعاوني", "الاتحاد"] },
    { symbol: "8180.SR", name: "Al Sagr Cooperative Insurance Co.", aliases: ["شركة الصقر للتأمين التعاوني", "الصقر للتأمين"] },
    { symbol: "8200.SR", name: "Saudi Reinsurance Company", aliases: ["الشركة السعودية لإعادة التأمين التعاوني", "الإعادة السعودية"] },
    { symbol: "8210.SR", name: "Bupa Arabia for Cooperative Insurance Co.", aliases: ["شركة بوبا العربية للتأمين التعاوني", "بوبا العربية"] },
    { symbol: "8230.SR", name: "Al Rajhi Co. for Cooperative Insurance", aliases: ["شركة الراجحي للتأمين التعاوني", "تكافل الراجحي"] },
    { symbol: "8240.SR", name: "Chubb Arabia Cooperative Insurance Company", aliases: ["شركة تشب العربية للتأمين التعاوني", "تْشب"] },
    { symbol: "8250.SR", name: "Gulf Insurance Group - GIG", aliases: ["شركة أكسا للتأمين التعاوني", "اكسا التعاونية"] },
    { symbol: "8260.SR", name: "Gulf General Cooperative Insurance Co.", aliases: ["الشركة الخليجية العامة للتأمين التعاوني", "الخليجية العامة"] },
    { symbol: "8280.SR", name: "LIVA Insurance Company", aliases: ["الشركة العالمية للتأمين التعاوني", "العالمية"] },
    { symbol: "8300.SR", name: "Wataniya Insurance Co.", aliases: ["الشركة الوطنية للتأمين", "الوطنية"] },
    { symbol: "8310.SR", name: "Amana Cooperative Insurance Co.", aliases: ["شركة أمانة للتأمين التعاوني", "أمانة للتأمين"] },
    { symbol: "8311.SR", name: "Saudi Enaya Cooperative Insurance Company", aliases: ["شركة عناية السعودية للتأمين التعاوني", "عناية"] },
    { symbol: "8313.SR", name: "Rasan Information Technology Co.", aliases: ["رسن لتقنية المعلومات", "رسن"] },];

const ARABIC = /[\u0600-\u06FF]/;
const MARKS = /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED\u0640]/g;

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

type IndexEntry = { entry: SaudiSymbol; keys: string[] };

const INDEX: IndexEntry[] = SAUDI_SYMBOLS.map((entry) => ({
    entry,
    keys: [entry.name, ...entry.aliases].map(normalizeArabic).filter(Boolean),
}));

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
