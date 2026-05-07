import { NextRequest } from 'next/server'
import { errorResponse, jsonResponse, requireParam, MissingParamError, CACHE_24H, rateLimit } from '@/lib/api-utils'

// ─── Language resolution ─────────────────────────────────────────────────────

const LANG_MAP: Record<string, string> = {
  // East Asia
  japan: 'ja', japanese: 'ja',
  china: 'zh', chinese: 'zh', 'hong kong': 'zh', taiwan: 'zh', macau: 'zh',
  korea: 'ko', korean: 'ko', 'south korea': 'ko', 'north korea': 'ko',
  mongolia: 'mn', mongolian: 'mn',

  // Southeast Asia
  thailand: 'th', thai: 'th',
  vietnam: 'vi', vietnamese: 'vi',
  indonesia: 'id', indonesian: 'id',
  malaysia: 'ms', malay: 'ms',
  philippines: 'tl', filipino: 'tl', tagalog: 'tl',
  cambodia: 'km', khmer: 'km',
  laos: 'lo', lao: 'lo',
  myanmar: 'my', burma: 'my', burmese: 'my',
  singapore: 'en', brunei: 'ms',

  // South Asia
  india: 'hi', hindi: 'hi',
  pakistan: 'ur', urdu: 'ur',
  bangladesh: 'bn', bengali: 'bn',
  'sri lanka': 'si', sinhala: 'si',
  nepal: 'ne', nepali: 'ne',
  bhutan: 'dz',

  // Middle East / North Africa
  arabic: 'ar', egypt: 'ar', morocco: 'ar', tunisia: 'ar', algeria: 'ar', libya: 'ar',
  'saudi arabia': 'ar', uae: 'ar', 'united arab emirates': 'ar', qatar: 'ar', bahrain: 'ar',
  kuwait: 'ar', oman: 'ar', yemen: 'ar', jordan: 'ar', lebanon: 'ar', syria: 'ar', iraq: 'ar',
  palestine: 'ar', sudan: 'ar',
  israel: 'he', hebrew: 'he',
  iran: 'fa', persian: 'fa', farsi: 'fa', afghanistan: 'fa',
  turkey: 'tr', turkish: 'tr',

  // Europe — Romance
  france: 'fr', french: 'fr',
  spain: 'es', spanish: 'es',
  italy: 'it', italian: 'it',
  portugal: 'pt', portuguese: 'pt', brazil: 'pt',
  romania: 'ro', romanian: 'ro', moldova: 'ro',

  // Europe — Germanic / Nordic
  germany: 'de', german: 'de', austria: 'de', liechtenstein: 'de',
  switzerland: 'de',
  netherlands: 'nl', dutch: 'nl',
  sweden: 'sv', swedish: 'sv',
  norway: 'no', norwegian: 'no',
  denmark: 'da', danish: 'da',
  finland: 'fi', finnish: 'fi',
  iceland: 'is', icelandic: 'is',

  // Europe — Slavic
  poland: 'pl', polish: 'pl',
  czech: 'cs', 'czech republic': 'cs', czechia: 'cs',
  slovakia: 'sk', slovak: 'sk',
  slovenia: 'sl', slovenian: 'sl',
  croatia: 'hr', croatian: 'hr',
  serbia: 'sr', serbian: 'sr',
  bosnia: 'bs', 'bosnia and herzegovina': 'bs',
  bulgaria: 'bg', bulgarian: 'bg',
  ukraine: 'uk', ukrainian: 'uk',
  russia: 'ru', russian: 'ru', belarus: 'ru', kazakhstan: 'kk', kyrgyzstan: 'ky',

  // Europe — Other
  greece: 'el', greek: 'el', cyprus: 'el',
  hungary: 'hu', hungarian: 'hu',
  albania: 'sq', albanian: 'sq',
  estonia: 'et', estonian: 'et',
  latvia: 'lv', latvian: 'lv',
  lithuania: 'lt', lithuanian: 'lt',
  malta: 'mt', maltese: 'mt',

  // Latin America (Spanish-speaking)
  mexico: 'es', argentina: 'es', colombia: 'es', peru: 'es', chile: 'es', venezuela: 'es',
  ecuador: 'es', uruguay: 'es', paraguay: 'es', bolivia: 'es', 'costa rica': 'es',
  panama: 'es', nicaragua: 'es', honduras: 'es', 'el salvador': 'es', guatemala: 'es',
  'dominican republic': 'es', cuba: 'es', 'puerto rico': 'es',

  // Africa (default to local + en where applicable)
  kenya: 'sw', tanzania: 'sw', uganda: 'sw', swahili: 'sw',
  ethiopia: 'am', amharic: 'am',
  'south africa': 'en', nigeria: 'en', ghana: 'en', zimbabwe: 'en', namibia: 'en',
  rwanda: 'rw', senegal: 'fr', 'ivory coast': 'fr', cameroon: 'fr', madagascar: 'fr',

  // English-speaking — special cases handled by ENGLISH_REGIONAL_PHRASES below
  'united states': 'en', usa: 'en', us: 'en', america: 'en',
  'united kingdom': 'en', uk: 'en', england: 'en', scotland: 'en', wales: 'en', britain: 'en',
  'great britain': 'en',
  ireland: 'en',
  australia: 'en', aus: 'en',
  'new zealand': 'en', nz: 'en',
  canada: 'en', // overrides any prior — Canada ships English content
  jamaica: 'en', barbados: 'en', bahamas: 'en', 'trinidad and tobago': 'en',

  // French-speaking
  belgium: 'fr', luxembourg: 'fr', monaco: 'fr', haiti: 'fr',
}

function resolveLanguageCode(input: string): string {
  const lower = input.toLowerCase().trim()
  if (lower.length === 2) return lower
  return LANG_MAP[lower] || lower
}

// ─── Essential phrases ───────────────────────────────────────────────────────

const ESSENTIAL_PHRASES = [
  'Hello', 'Thank you', 'Excuse me', 'Yes', 'No', 'Please',
  'Goodbye', 'How much?', 'Where is...?', 'Help!',
  "I don't understand", 'Do you speak English?',
] as const

// ─── Curated translations (more accurate than machine translation) ───────────

const CURATED_PHRASES: Record<string, Record<string, string>> = {
  ja: {
    'Hello': 'こんにちは', 'Thank you': 'ありがとうございます', 'Excuse me': 'すみません',
    'Yes': 'はい', 'No': 'いいえ', 'Please': 'お願いします', 'Goodbye': 'さようなら',
    'How much?': 'いくらですか？', 'Where is...?': '…はどこですか？',
    'Help!': '助けてください！', "I don't understand": 'わかりません',
    'Do you speak English?': '英語を話せますか？',
  },
  fr: {
    'Hello': 'Bonjour', 'Thank you': 'Merci', 'Excuse me': 'Excusez-moi',
    'Yes': 'Oui', 'No': 'Non', 'Please': "S'il vous plaît", 'Goodbye': 'Au revoir',
    'How much?': "Combien ça coûte ?", 'Where is...?': 'Où est... ?',
    'Help!': 'Au secours !', "I don't understand": 'Je ne comprends pas',
    'Do you speak English?': 'Parlez-vous anglais ?',
  },
  es: {
    'Hello': 'Hola', 'Thank you': 'Gracias', 'Excuse me': 'Disculpe',
    'Yes': 'Sí', 'No': 'No', 'Please': 'Por favor', 'Goodbye': 'Adiós',
    'How much?': '¿Cuánto cuesta?', 'Where is...?': '¿Dónde está...?',
    'Help!': '¡Ayuda!', "I don't understand": 'No entiendo',
    'Do you speak English?': '¿Habla inglés?',
  },
  it: {
    'Hello': 'Ciao', 'Thank you': 'Grazie', 'Excuse me': 'Mi scusi',
    'Yes': 'Sì', 'No': 'No', 'Please': 'Per favore', 'Goodbye': 'Arrivederci',
    'How much?': 'Quanto costa?', 'Where is...?': "Dov'è...?",
    'Help!': 'Aiuto!', "I don't understand": 'Non capisco',
    'Do you speak English?': 'Parla inglese?',
  },
  de: {
    'Hello': 'Hallo', 'Thank you': 'Danke', 'Excuse me': 'Entschuldigung',
    'Yes': 'Ja', 'No': 'Nein', 'Please': 'Bitte', 'Goodbye': 'Auf Wiedersehen',
    'How much?': 'Wie viel kostet das?', 'Where is...?': 'Wo ist...?',
    'Help!': 'Hilfe!', "I don't understand": 'Ich verstehe nicht',
    'Do you speak English?': 'Sprechen Sie Englisch?',
  },
  pt: {
    'Hello': 'Olá', 'Thank you': 'Obrigado', 'Excuse me': 'Com licença',
    'Yes': 'Sim', 'No': 'Não', 'Please': 'Por favor', 'Goodbye': 'Adeus',
    'How much?': 'Quanto custa?', 'Where is...?': 'Onde fica...?',
    'Help!': 'Socorro!', "I don't understand": 'Não entendo',
    'Do you speak English?': 'Fala inglês?',
  },
  ko: {
    'Hello': '안녕하세요', 'Thank you': '감사합니다', 'Excuse me': '실례합니다',
    'Yes': '네', 'No': '아니요', 'Please': '부탁합니다', 'Goodbye': '안녕히 가세요',
    'How much?': '얼마예요?', 'Where is...?': '…은/는 어디에 있어요?',
    'Help!': '도와주세요!', "I don't understand": '이해하지 못해요',
    'Do you speak English?': '영어 하세요?',
  },
  zh: {
    'Hello': '你好', 'Thank you': '谢谢', 'Excuse me': '请问',
    'Yes': '是', 'No': '不是', 'Please': '请', 'Goodbye': '再见',
    'How much?': '多少钱？', 'Where is...?': '…在哪里？',
    'Help!': '救命！', "I don't understand": '我不懂',
    'Do you speak English?': '你会说英语吗？',
  },
  th: {
    'Hello': 'สวัสดี', 'Thank you': 'ขอบคุณ', 'Excuse me': 'ขอโทษ',
    'Yes': 'ใช่', 'No': 'ไม่', 'Please': 'กรุณา', 'Goodbye': 'ลาก่อน',
    'How much?': 'ราคาเท่าไหร่?', 'Where is...?': '…อยู่ที่ไหน?',
    'Help!': 'ช่วยด้วย!', "I don't understand": 'ไม่เข้าใจ',
    'Do you speak English?': 'คุณพูดภาษาอังกฤษได้ไหม?',
  },
  ar: {
    'Hello': 'مرحبا', 'Thank you': 'شكرا', 'Excuse me': 'عذرا',
    'Yes': 'نعم', 'No': 'لا', 'Please': 'من فضلك', 'Goodbye': 'مع السلامة',
    'How much?': 'بكم هذا؟', 'Where is...?': 'أين...؟',
    'Help!': '!النجدة', "I don't understand": 'لا أفهم',
    'Do you speak English?': 'هل تتكلم الإنجليزية؟',
  },
}

// ─── English regional phrases (for same-language destinations) ───────────────
// Keys are lowercased country/territory names matched against the raw `lang`
// input. Falls back to ENGLISH_DEFAULT when no match — that case still shows
// useful traveler phrases so the section renders on every trip.

const ENGLISH_DEFAULT: Record<string, string> = {
  'Hello': 'Hi',
  'Thank you': 'Thanks',
  'Excuse me': 'Excuse me',
  'Yes': 'Yes',
  'No': 'No',
  'Please': 'Please',
  'Goodbye': 'Bye',
  'How much?': 'How much is it?',
  'Where is...?': 'Where is the nearest...?',
  'Help!': 'I need help!',
  "I don't understand": "Could you say that again?",
  'Do you speak English?': 'Could you help me out?',
}

const ENGLISH_REGIONAL_PHRASES: Record<string, Record<string, string>> = {
  'australia': {
    'Hello': "G'day",
    'Thank you': 'Ta',
    'You\'re welcome': 'No worries',
    'Friend': 'Mate',
    'Afternoon': 'Arvo',
    'Breakfast': 'Brekkie',
    'Petrol station': 'Servo',
    'Liquor store': 'Bottle-o',
    'Restroom': 'Dunny',
    'Awesome': 'Bonza',
    'Goodbye': 'Hooroo',
    'Cheers': 'Cheers, mate',
  },
  'new zealand': {
    'Hello': 'Kia ora',
    'Thanks': 'Chur',
    'Cool': 'Sweet as',
    'Great': 'Choice',
    'Excited': 'Stoked',
    'Flip-flops': 'Jandals',
    'Cooler': 'Chilly bin',
    'Lots': 'Heaps',
    'Friend': 'Bro',
    'Goodbye': 'Catch ya',
    'No problem': 'Sweet bro',
    'Convenience store': 'Dairy',
  },
  'united kingdom': {
    'Hello': 'Hiya',
    'Thanks / Bye': 'Cheers',
    'Restroom': 'The loo',
    'Elevator': 'Lift',
    'French fries': 'Chips',
    'Chips': 'Crisps',
    'Sidewalk': 'Pavement',
    'Truck': 'Lorry',
    'Gas': 'Petrol',
    'Friend': 'Mate',
    'Great': 'Brilliant',
    'Tired': 'Knackered',
  },
  'ireland': {
    'Hello': "How's the craic?",
    'Cheers / Health': 'Sláinte',
    'Fun / Good time': 'Craic',
    'Good / Fine': 'Grand',
    'Small': 'Wee',
    'Cup of tea': 'Cuppa',
    'Cupboard': 'Press',
    'That guy': 'Yer man',
    'Thanks': 'Thanks a million',
    'Goodbye': 'Slán',
    'Awesome': 'Deadly',
    'A lot': 'Loads',
  },
  'scotland': {
    'Hello': 'Hiya',
    'Thanks': 'Cheers',
    'Small': 'Wee',
    'Yes': 'Aye',
    'Do you know?': "D'ye ken?",
    'Cold': 'Baltic',
    'Goodbye': 'Cheerio',
    'Beautiful': 'Bonnie',
    'Friend': 'Pal',
    'A lot': 'A load',
    'Restroom': 'The loo',
    'Cup of tea': 'Cuppa',
  },
  'canada': {
    'Hello': 'Hey there',
    'Thanks': 'Thanks, eh',
    'Right?': 'Eh?',
    'Coffee, 2 cream 2 sugar': 'Double-double',
    'Beanie': 'Toque',
    'One-dollar coin': 'Loonie',
    'Two-dollar coin': 'Toonie',
    'Soda': 'Pop',
    'Restroom': 'Washroom',
    'Goodbye': 'Take \'er easy',
    'Sneakers': 'Runners',
    'Cottage / Cabin': 'Cottage',
  },
}

// Aliases — same content, alternative spellings/inputs
ENGLISH_REGIONAL_PHRASES['uk'] = ENGLISH_REGIONAL_PHRASES['united kingdom']
ENGLISH_REGIONAL_PHRASES['england'] = ENGLISH_REGIONAL_PHRASES['united kingdom']
ENGLISH_REGIONAL_PHRASES['britain'] = ENGLISH_REGIONAL_PHRASES['united kingdom']
ENGLISH_REGIONAL_PHRASES['great britain'] = ENGLISH_REGIONAL_PHRASES['united kingdom']
ENGLISH_REGIONAL_PHRASES['nz'] = ENGLISH_REGIONAL_PHRASES['new zealand']
ENGLISH_REGIONAL_PHRASES['aus'] = ENGLISH_REGIONAL_PHRASES['australia']

function englishPhrasesFor(rawLang: string): Record<string, string> {
  const key = rawLang.toLowerCase().trim()
  return ENGLISH_REGIONAL_PHRASES[key] ?? ENGLISH_DEFAULT
}

// ─── MyMemory API fallback ───────────────────────────────────────────────────

async function translatePhrase(phrase: string, targetLang: string): Promise<string | null> {
  // Per-call timeout so a slow MyMemory response can't hold the route open.
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 5_000)
  try {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(phrase)}&langpair=en|${encodeURIComponent(targetLang)}`
    const res = await fetch(url, { ...CACHE_24H, signal: controller.signal })
    if (!res.ok) return null

    const data = await res.json()
    if (data.responseStatus !== 200 || !data.responseData?.translatedText) return null
    return data.responseData.translatedText
  } catch {
    return null
  } finally {
    clearTimeout(timeout)
  }
}

// ─── Route handler ───────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const rl = rateLimit(req, 'translate', 60, 60000)
  if (rl) return rl
  try {
    const lang = requireParam(req.nextUrl.searchParams, 'lang', 'e.g. ?lang=ja')
    const langCode = resolveLanguageCode(lang)

    // English destinations: show regional flavor (G'day, Cheers, etc) so the
    // Essential Phrases section renders on home-country trips too.
    if (langCode === 'en') return jsonResponse({ phrases: englishPhrasesFor(lang) })

    // Prefer curated phrases when available
    if (CURATED_PHRASES[langCode]) return jsonResponse({ phrases: CURATED_PHRASES[langCode] })

    // Fallback: translate via MyMemory API
    const results = await Promise.allSettled(
      ESSENTIAL_PHRASES.map(async (phrase) => ({
        phrase,
        translated: await translatePhrase(phrase, langCode),
      }))
    )

    const phrases: Record<string, string> = {}
    for (const result of results) {
      if (result.status === 'fulfilled' && result.value.translated) {
        phrases[result.value.phrase] = result.value.translated
      }
    }

    // Translation provider returned nothing usable — gracefully fall back
    // to the default English set so the section still renders. We'd rather
    // show generic phrases than block the UI on a flaky upstream.
    if (Object.keys(phrases).length === 0) {
      return jsonResponse({ phrases: ENGLISH_DEFAULT })
    }

    return jsonResponse({ phrases })
  } catch (err) {
    if (err instanceof MissingParamError) return errorResponse(err.message, 400)
    // Any other unexpected failure: still return content so the section renders.
    return jsonResponse({ phrases: ENGLISH_DEFAULT })
  }
}
