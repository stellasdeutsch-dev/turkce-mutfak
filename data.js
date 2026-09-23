/* Все турецкие слова и фразы сайта.
   Каждая запись с id и tr получает файл audio/<id>.mp3,
   запись с ex — ещё и audio/<id>-ex.mp3 (см. tools/gen-audio.py). */
window.KITCHEN = {
  words: [
    { id: "buzdolabi", tr: "buzdolabı", ru: "холодильник", pr: "буздолабы", note: "buz «лёд» + dolap «шкаф». Буквально — ледяной шкаф.", ex: ["Süt buzdolabında.", "Молоко в холодильнике."] },
    { id: "ocak", tr: "ocak", ru: "плита", pr: "оджак", note: "Ещё значит «январь» и «очаг». Контекст спасёт.", ex: ["Ocağı kapat!", "Выключи плиту!"] },
    { id: "firin", tr: "fırın", ru: "духовка", pr: "фырын", note: "Пекарня — тоже fırın. Туда ходят за симитом.", ex: ["Börek fırında.", "Бёрек в духовке."] },
    { id: "davlumbaz", tr: "davlumbaz", ru: "вытяжка", pr: "давлумбаз", note: "Звучит как заклинание. Работает как вытяжка.", ex: ["Davlumbazı aç.", "Включи вытяжку."] },
    { id: "evye", tr: "evye", ru: "кухонная мойка", pr: "эвье", note: "В жизни почти все говорят lavabo. Evye — если хочешь блеснуть.", ex: ["Tabaklar evyede.", "Тарелки в мойке."] },
    { id: "musluk", tr: "musluk", ru: "кран", pr: "муслук", note: "Musluğu — k на конце превращается в ğ.", ex: ["Musluğu kapat.", "Закрой кран."] },
    { id: "tezgah", tr: "tezgâh", ru: "столешница", pr: "тезгях", note: "На базаре tezgâh — прилавок. Одно слово, два места.", ex: ["Bıçak tezgâhta.", "Нож на столешнице."] },
    { id: "dolap", tr: "dolap", ru: "шкаф", pr: "долап", note: "Dolabı — p превращается в b. Турки не любят глухие между гласными.", ex: ["Bardaklar dolapta.", "Стаканы в шкафу."] },
    { id: "masa", tr: "masa", ru: "стол", pr: "маса", note: "Masayı kurmak — «собрать стол». То есть накрыть.", ex: ["Masayı kur!", "Накрой на стол!"] },
    { id: "sandalye", tr: "sandalye", ru: "стул", pr: "сандальйе", note: "Из итальянского. Турки много чего взяли с моря.", ex: ["Sandalyeye otur.", "Садись на стул."] },
    { id: "caydanlik", tr: "çaydanlık", ru: "чайник для кипятка", pr: "чайданлык", note: "Нижний этаж. Кипяток. Сверху стоит demlik с заваркой.", ex: ["Çaydanlık ocakta.", "Чайник на плите."] },
    { id: "demlik", tr: "demlik", ru: "заварочный чайник", pr: "демлик", note: "Верхний этаж. От demlemek — заваривать.", ex: ["Çayı demlikte demle.", "Завари чай в заварнике."] },
    { id: "tencere", tr: "tencere", ru: "кастрюля", pr: "тенджере", note: "Самая частая фраза с ней: «tencerede ne var?» — что там в кастрюле?", ex: ["Tencerede çorba var.", "В кастрюле суп."] },
    { id: "tava", tr: "tava", ru: "сковорода", pr: "тава", note: "Menemen, yumurta, balık — всё на tava.", ex: ["Menemen tavada pişer.", "Менемен готовят на сковороде."] },
    { id: "bicak", tr: "bıçak", ru: "нож", pr: "бычак", note: "Bıçağı — k снова превращается в ğ.", ex: ["Bıçak çok keskin.", "Нож очень острый."] },
    { id: "kesme-tahtasi", tr: "kesme tahtası", ru: "разделочная доска", pr: "кесме тахтасы", note: "kesmek «резать» + tahta «доска». Доска-для-резания.", ex: ["Soğanı kesme tahtasında doğra.", "Режь лук на доске."] },
    { id: "tabak", tr: "tabak", ru: "тарелка", pr: "табак", note: "Не табак. Тарелка. Пустой её соседям не возвращают.", ex: ["Tabakları yıka.", "Помой тарелки."] },
    { id: "cay-bardagi", tr: "çay bardağı", ru: "стаканчик для чая", pr: "чай бардаы", note: "Форма тюльпана. Ручки нет. Держат за ободок.", ex: ["Bir çay bardağı daha!", "Ещё стаканчик!"] },
    { id: "cezve", tr: "cezve", ru: "турка", pr: "джезве", note: "Турецкий кофе варят только в ней. И медленно.", ex: ["Cezvede kahve yap.", "Свари кофе в турке."] },
    { id: "mikrodalga", tr: "mikrodalga", ru: "микроволновка", pr: "микродалга", note: "mikro + dalga «волна». Честно.", ex: ["Yemeği mikrodalgada ısıt.", "Разогрей еду в микроволновке."] },
    { id: "bulasik-makinesi", tr: "bulaşık makinesi", ru: "посудомойка", pr: "булашык макинеси", note: "bulaşık — грязная посуда. Машина-для-грязной-посуды.", ex: ["Bulaşık makinesi dolu.", "Посудомойка полная."] },
    { id: "cop-kutusu", tr: "çöp kutusu", ru: "мусорное ведро", pr: "чёп кутусу", note: "çöp «мусор» + kutu «коробка».", ex: ["Çöpü çıkar.", "Вынеси мусор."] },
    { id: "ekmek", tr: "ekmek", ru: "хлеб", pr: "экмек", note: "Хлеб кладут к любому блюду. К любому.", ex: ["Ekmek taze mi?", "Хлеб свежий?"] },
    { id: "tuz", tr: "tuz", ru: "соль", pr: "туз", note: "Tuzluk — солонка. Суффикс -lık разберём ниже.", ex: ["Tuzu uzatır mısın?", "Передашь соль?"] },
    { id: "kasik", tr: "kaşık", ru: "ложка", pr: "кашык", note: "Çay kaşığı — чайная ложка. Та самая, которой звенят.", ex: ["Bir kaşık şeker.", "Одна ложка сахара."] },
    { id: "catal", tr: "çatal", ru: "вилка", pr: "чатал", note: "Çatal — ещё и развилка дороги. Похоже, правда?", ex: ["Çatal nerede?", "Где вилка?"] }
  ],

  phrases: [
    { id: "afiyet-olsun", tr: "Afiyet olsun!", ru: "Приятного аппетита!", note: "Тому, кто ест." },
    { id: "elinize-saglik", tr: "Elinize sağlık!", ru: "Здоровья вашим рукам!", note: "Тому, кто готовил. Обязательно." },
    { id: "ellerine-saglik", tr: "Ellerine sağlık!", ru: "Здоровья твоим рукам!", note: "То же, но на «ты»." },
    { id: "cayi-demle", tr: "Çayı demle.", ru: "Завари чай.", note: "Команда номер один в любой турецкой кухне." },
    { id: "suyu-kaynat", tr: "Suyu kaynat.", ru: "Вскипяти воду.", note: "kaynamak — кипеть." },
    { id: "sogani-dogra", tr: "Soğanı doğra.", ru: "Нарежь лук.", note: "Doğramak — резать мелко." },
    { id: "bulasiklari-yika", tr: "Bulaşıkları yıka.", ru: "Помой посуду.", note: "Самая нелюбимая фраза в общаге." },
    { id: "sut-tasti", tr: "Süt taştı!", ru: "Молоко убежало!", note: "taşmak — переливаться через край." },
    { id: "ne-pisiriyorsun", tr: "Ne pişiriyorsun?", ru: "Что готовишь?", note: "Лучший способ начать разговор на кухне." },
    { id: "cay-ister-misin", tr: "Çay ister misin?", ru: "Будешь чай?", note: "Правильный ответ всегда «evet»." },
    { id: "cok-guzel-olmus", tr: "Çok güzel olmuş!", ru: "Очень вкусно получилось!", note: "Güzel — не только «красивый»." },
    { id: "menemen", tr: "Menemen soğanlı mı, soğansız mı?", ru: "Менемен с луком или без?", note: "Вопрос, который делит страну пополам." }
  ],

  // местный падеж: где лежит?
  places: [
    { id: "p-buzdolabi", base: "buzdolabı", form: "buzdolabında", suf: "nda", ru: "в холодильнике", why: "Слово уже с окончанием -ı (buz-dolab-ı). Между ним и -da встаёт буфер n." },
    { id: "p-dolap", base: "dolap", form: "dolapta", suf: "ta", ru: "в шкафу", why: "p — глухая. После глухих d становится t: -ta." },
    { id: "p-masa", base: "masa", form: "masada", suf: "da", ru: "на столе", why: "Последняя гласная a → -da." },
    { id: "p-firin", base: "fırın", form: "fırında", suf: "da", ru: "в духовке", why: "Последняя гласная ı — задняя → -da." },
    { id: "p-tezgah", base: "tezgâh", form: "tezgâhta", suf: "ta", ru: "на столешнице", why: "h — глухая → -ta. Гласная â — задняя → a." },
    { id: "p-tencere", base: "tencere", form: "tencerede", suf: "de", ru: "в кастрюле", why: "Последняя гласная e — передняя → -de." },
    { id: "p-ocak", base: "ocak", form: "ocakta", suf: "ta", ru: "на плите", why: "k — глухая → -ta. И k здесь не смягчается: суффикс на согласную." },
    { id: "p-tava", base: "tava", form: "tavada", suf: "da", ru: "на сковороде", why: "Последняя гласная a → -da." }
  ],
  things: [
    { id: "t-sut", tr: "Süt", ru: "Молоко" },
    { id: "t-tuz", tr: "Tuz", ru: "Соль" },
    { id: "t-ekmek", tr: "Ekmek", ru: "Хлеб" },
    { id: "t-corba", tr: "Çorba", ru: "Суп" },
    { id: "t-borek", tr: "Börek", ru: "Бёрек" },
    { id: "t-bicak", tr: "Bıçak", ru: "Нож" }
  ],

  // суффикс -lık: «штука для …»
  lik: [
    { id: "l-tuz", base: "tuz", baseRu: "соль", form: "tuzluk", ru: "солонка", v: "u" },
    { id: "l-seker", base: "şeker", baseRu: "сахар", form: "şekerlik", ru: "сахарница", v: "i" },
    { id: "l-ekmek", base: "ekmek", baseRu: "хлеб", form: "ekmeklik", ru: "хлебница", v: "i" },
    { id: "l-sebze", base: "sebze", baseRu: "овощи", form: "sebzelik", ru: "ящик для овощей", v: "i" },
    { id: "l-yumurta", base: "yumurta", baseRu: "яйцо", form: "yumurtalık", ru: "подставка для яиц. И… яичник", v: "ı" },
    { id: "l-biber", base: "biber", baseRu: "перец", form: "biberlik", ru: "перечница", v: "i" }
  ],

  // составные слова: кто + что
  compounds: [
    { id: "c-buzdolabi", a: "buz", aRu: "лёд", b: "dolap", bRu: "шкаф", form: "buzdolabı", ru: "холодильник", glue: "p → b, + ı" },
    { id: "c-cay-bardagi", a: "çay", aRu: "чай", b: "bardak", bRu: "стакан", form: "çay bardağı", ru: "чайный стаканчик", glue: "k → ğ, + ı" },
    { id: "c-kesme-tahtasi", a: "kesme", aRu: "резание", b: "tahta", bRu: "доска", form: "kesme tahtası", ru: "разделочная доска", glue: "+ sı (после гласной)" },
    { id: "c-bulasik-makinesi", a: "bulaşık", aRu: "грязная посуда", b: "makine", bRu: "машина", form: "bulaşık makinesi", ru: "посудомойка", glue: "+ si (после гласной)" },
    { id: "c-cop-kutusu", a: "çöp", aRu: "мусор", b: "kutu", bRu: "коробка", form: "çöp kutusu", ru: "мусорное ведро", glue: "+ su (после гласной)" },
    { id: "c-mutfak-dolabi", a: "mutfak", aRu: "кухня", b: "dolap", bRu: "шкаф", form: "mutfak dolabı", ru: "кухонный шкаф", glue: "p → b, + ı" }
  ],

  // отдельные слова для кнопок озвучки
  extra: [
    { id: "x-mutfak", tr: "mutfak" },
    { id: "x-mutfakta", tr: "mutfakta" },
    { id: "x-kolay", tr: "Mutfakta Türkçe? Kolay." },
    { id: "x-cay", tr: "çay" },
    { id: "x-buz", tr: "buz" },
    { id: "x-bardak", tr: "bardak" },
    { id: "x-kesme", tr: "kesme" },
    { id: "x-tahta", tr: "tahta" },
    { id: "x-bulasik", tr: "bulaşık" },
    { id: "x-makine", tr: "makine" },
    { id: "x-cop", tr: "çöp" },
    { id: "x-kutu", tr: "kutu" },
    { id: "x-seker", tr: "şeker" },
    { id: "x-sebze", tr: "sebze" },
    { id: "x-yumurta", tr: "yumurta" },
    { id: "x-biber", tr: "biber" },
    { id: "x-ne-yapiyorsun", tr: "Ne yapıyorsun?" },
    { id: "x-abi-o-demlik", tr: "Abi, o demlik." },
    { id: "x-al-ye", tr: "Al, ye." },
    { id: "x-ocagi-kapat", tr: "Ocağı kapat." },
    { id: "x-tesekkur", tr: "Teşekkür ederim." },
    { id: "x-kolay-gelsin", tr: "Kolay gelsin!" },
    { id: "x-nerede", tr: "nerede?" },
    { id: "x-demlige-koy", tr: "Çayı demliğe koy." },
    { id: "x-demle-15", tr: "On beş dakika demle." },
    { id: "x-bardaga-koy", tr: "Bardağa koy." },
    { id: "x-tavsan-kani", tr: "Tavşan kanı." },
    { id: "x-acik-mi-koyu-mu", tr: "Açık mı, koyu mu?" },
    { id: "x-acik", tr: "Açık." },
    { id: "x-koyu", tr: "Koyu." },
    { id: "x-su-kaynadi", tr: "Su kaynadı!" },
    { id: "x-menemen", tr: "menemen" },
    { id: "x-simit", tr: "simit" },
    { id: "x-lokum", tr: "lokum" },
    { id: "x-kahvalti", tr: "kahvaltı" }
  ]
};
