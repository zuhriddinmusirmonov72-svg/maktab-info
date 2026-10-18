import { normalizeText } from '../utils/text.js';
import config from '../config.js';
import logger from '../logger.js';

// ================================================================
// RUXSAT BERILGAN MAVZULAR — kamida BITTA bo'lishi SHART
// ================================================================
const EDUCATION_KEYWORDS = [
  // --- Maktab ---
  'maktab', "o'quvchi", "o'qituvchi", 'sinf', 'sinfxona',
  'darslik', 'dars', 'imtihon', 'olimpiada', 'muallim',
  "ta'lim", "ta'til", 'qabul', 'abituriyent',
  'kollej', 'universitet', 'talaba', 'grant', 'stipendiya',
  'dtm', 'davlat test markazi', 'pedagogika', 'metodik',
  'bakalavr', 'magistratura', 'doktorantura',
  'onlayn dars', 'masofaviy',
  'sinf rahbari', 'direktor maktab', 'maktab direktori',

  // --- Yoshlar sport yutuqlari ---
  'o\'quvchi chempion', "o'quvchi g'olib", "o'quvchi yutuq",
  'maktab o\'quvchisi', 'maktab jamoasi',
  'yoshlar olimpiadasi', 'yoshlar chempionati', 'yoshlar turniri',
  'o\'quvchilar musobaqasi', 'o\'quvchilar turniri',
  'o\'quvchilar bellashuvi', 'maktab musobaqasi',
  'yosh sportchi', 'yosh chempion', 'yosh g\'olib',
  'yoshlar sport', 'maktab sport', 'maktablararo',
  'o\'quvchi medal', 'o\'quvchi sovrin',
  'talabalar sport', 'talabalar musobaqasi',
  'universiada', 'yoshlar o\'yinlari',

  // --- Prezident / qonun (faqat ta'lim bilan bog'liq) ---
  "ta'lim qonuni", "ta'lim to'g'risida",
  "ta'lim sohasida", "ta'lim tizimini",
  "ta'lim islohoti", "ta'lim sifati",
  'maktabga oid qonun', 'maktab uchun qonun',
  "o'qituvchilar uchun qonun", "o'qituvchilarga imtiyoz",
  "o'qituvchi maoshi", "o'qituvchi lavozim",
  'maktabni rivojlantirish', 'ta\'limni rivojlantirish',
  "ta'lim loyihasi", "ta'lim dasturi",
  'prezident maktab', 'prezident ta\'lim',
  "maktab qurilishi", "yangi maktab",
  "maktab ta'miri", "maktab jihozi",

  // --- Imtihon / DTM / grant ---
  'dtm natija', 'test natija', 'imtihon natija',
  'grant uchun', 'stipendiya uchun',
  'hujjat topshirish', 'ariza topshirish',
  'qabul kvota', 'o\'qishga kirish',

  // --- Kirill ---
  'мактаб', 'ўқувчи', 'ўқитувчи', 'синф', 'дарслик',
  'имтиҳон', 'олимпиада', 'таълим', 'таътил', 'қабул',
  'коллеж', 'университет', 'талаба', 'грант', 'стипендия',
  'давлат тест маркази', 'педагогика',
  'ёшлар спорт', 'мактаб жамоаси', 'ёш чемпион',
  'ёшлар чемпионати', 'ўқувчилар мусобақаси',
  'таълим қонуни', 'таълим тизими', 'таълим ислоҳоти',
  'президент мактаб', 'президент таълим',
  'янги мактаб', 'мактаб қурилиши',

  // --- Russian ---
  'школа', 'ученик', 'учитель', 'класс', 'учебник',
  'экзамен', 'олимпиада', 'образование', 'каникулы',
  'абитуриент', 'студент', 'колледж', 'университет',
  'грант', 'стипендия', 'педагогика',
  'молодёжный спорт', 'школьные соревнования',
  'закон об образовании', 'реформа образования',
];

// ================================================================
// BLOKLASH — bu so'zlardan BIRI bo'lsa, hech qachon o'tmaydi
// ================================================================
const EXCLUDED_KEYWORDS = [
  // === SIYOSAT (ta'limga aloqasiz) ===
  'zelenkiy', 'zelenskyy', 'zelenskiy', 'zelensky',
  'трамп', 'tramp', 'trump', 'байден', 'biden',
  'путин', 'putin', 'лукашенко',
  'нато', 'nato', 'украина урушi', 'ukraine war',
  'саммит', 'sammit', 'дипломатия',
  'рубио', 'с5+1', 'мюнхен конференция',
  // Prezident xabarlari FAQAT ta'lim bilan bog'liq bo'lsa o'tadi
  // Umumiy siyosiy xabarlar bloklangan:
  'ташқи сиёсат', 'tashqi siyosat',
  'парламент сайлов', 'parlament saylov',
  'сайловлар', 'saylovlar',

  // === XORIJIY MOJARO / URUSH ===
  'don tranzit', 'don eksport', 'don bozor',
  'bug\'doy', 'arpa eksport', 'fermер daromad',
  'ukrainaning arzon', 'mahalliy fermerlar daromad',

  // === SPORT (yoshlar/maktab emas — professional) ===
  'superliga', 'premier league', 'la liga', 'bundesliga',
  'serie a', 'uefa', 'fifa', 'formula 1',
  'nfl', 'nba', 'apl',
  'messi', 'ronaldo', 'роналду', 'messidan',
  'барселона', 'реал мадрид', 'ливерпуль', 'манчестер',
  'арсенал', 'челси', 'интер майами', 'астон вилла',
  'ньюкасл', 'ипсвич', 'женоа', 'лечче', 'удинезе',
  'жонли матн', 'таркиблар',
  'бетис', 'ювентус', 'болонья',
  'профессионал бокс', 'nokaut boks', 'ринг',
  'conor mcgregor', 'макгрегор',

  // === ESTRADA / KINO ===
  'тўй маросим', 'nikoh toyi', 'актёр', 'актриса',
  "qo'shiqchi konsert", 'artist konsert', 'клип чиқди',
  'tiktok', 'блогер', 'influencer',
  'шакира', 'shakira', 'бритни', 'britney',
  'диёра келдиёрова', 'юлдуз усмон',

  // === JINOYAT / AVARIA ===
  'narkotik', 'гашиш', 'gashish', 'giyohvand',
  'qamalda', 'jinoyat', 'ҳибс',
  'avaria', 'ҳайдовчи рулда', 'ағдариб',
  'йўл ҳодиса', 'дамас ағдарил',
  'ухлаб қолиб', 'машина ағдарил',

  // === TEXNOLOGIYA (ta'lim emas) ===
  'iphone', 'samsung', 'xiaomi', 'huawei',
  'smartfon yangi', 'gadget', 'blockchain', 'bitcoin',
  'chatgpt yangi', 'startap', 'бизнес инвестиция',

  // === TIBBIYOT (ta'lim emas) ===
  'shifokor bemor', 'kasallik davolash', 'shifoxona',
  'operatsiya', 'исириқ тутатиш', 'шамоллашда',

  // === BOSHQA KERAKSIZ ===
  'казино', 'casino', 'stavka',
  'вирусли видео', 'ҳайратга солди',
  'олтин топилди', 'доллар курс',
  'кальмар ўйини', 'ресторан', 'кафе',
  'аэропорт рейс', 'туризм сайёҳ',
  'кичик товламачи', 'эҳсонни менсимаган',
  'москвада осмон', 'аэропортда тиз',
  'энергетика инқироз', 'нарх-наво',
  'электрон чиқинди', 'BYDда',
];

// ================================================================
// Ball hisoblash
// ================================================================
export function calculateRelevanceScore(article) {
  const fullText = `${article.title || ''} ${article.description || ''} ${article.content || ''}`;
  const lowerText = fullText.toLowerCase();

  // 1. BLOKLASH tekshiruvi
  for (const kw of EXCLUDED_KEYWORDS) {
    if (lowerText.includes(kw.toLowerCase())) {
      logger.debug(`BLOCKED by "${kw}": ${article.title}`);
      return 0;
    }
  }

  // 2. Ta'lim kaliti MAJBURIY (kamida bitta)
  const hasEducationKeyword = EDUCATION_KEYWORDS.some(kw =>
    lowerText.includes(kw.toLowerCase())
  );

  if (!hasEducationKeyword) {
    logger.debug(`BLOCKED — no education keyword: ${article.title}`);
    return 0;
  }

  // 3. Ball hisoblash
  let score = 40; // Bazaviy ball

  // Qancha ko'p ta'lim so'zi — shuncha yuqori ball
  for (const kw of EDUCATION_KEYWORDS) {
    if (lowerText.includes(kw.toLowerCase())) {
      score += 4;
    }
  }

  // Maktab nomi bo'lsa qo'shimcha
  if (config.school && config.school.name) {
    const schoolName = normalizeText(config.school.name);
    if (normalizeText(lowerText).includes(schoolName)) score += 30;
  }

  return Math.min(score, 100);
}

// ================================================================
// Relevantligini tekshirish
// ================================================================
export function isRelevant(article, minScore = 40) {
  const score = calculateRelevanceScore(article);
  if (score < minScore) {
    logger.info(`REJECTED (score ${score}): ${article.title}`);
    return false;
  }
  logger.info(`ACCEPTED (score ${score}): ${article.title}`);
  return true;
}

export function filterRelevantArticles(articles, minScore = 40) {
  return articles
    .map(article => ({ ...article, relevanceScore: calculateRelevanceScore(article) }))
    .filter(article => article.relevanceScore >= minScore)
    .sort((a, b) => b.relevanceScore - a.relevanceScore);
}

export default { calculateRelevanceScore, isRelevant, filterRelevantArticles };
