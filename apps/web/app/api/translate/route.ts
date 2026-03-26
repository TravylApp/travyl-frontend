import { NextRequest } from 'next/server'
import { errorResponse, jsonResponse, requireParam, MissingParamError, CACHE_24H } from '../lib/response'

// ─── Language resolution ─────────────────────────────────────────────────────

const LANG_MAP: Record<string, string> = {
  japan: 'ja', japanese: 'ja', france: 'fr', french: 'fr', spain: 'es', spanish: 'es',
  italy: 'it', italian: 'it', germany: 'de', german: 'de', portugal: 'pt', portuguese: 'pt',
  brazil: 'pt', china: 'zh', chinese: 'zh', korea: 'ko', korean: 'ko',
  thailand: 'th', thai: 'th', vietnam: 'vi', vietnamese: 'vi', indonesia: 'id', indonesian: 'id',
  turkey: 'tr', turkish: 'tr', greece: 'el', greek: 'el', netherlands: 'nl', dutch: 'nl',
  sweden: 'sv', swedish: 'sv', norway: 'no', norwegian: 'no', denmark: 'da', danish: 'da',
  finland: 'fi', finnish: 'fi', poland: 'pl', polish: 'pl', czech: 'cs', romania: 'ro', romanian: 'ro',
  hungary: 'hu', hungarian: 'hu', croatia: 'hr', croatian: 'hr', russia: 'ru', russian: 'ru',
  ukraine: 'uk', arabic: 'ar', egypt: 'ar', morocco: 'ar', hindi: 'hi', india: 'hi',
  mexico: 'es', argentina: 'es', colombia: 'es', peru: 'es', chile: 'es',
  austria: 'de', switzerland: 'de', belgium: 'fr', canada: 'fr',
  ireland: 'en', uk: 'en', australia: 'en', 'united states': 'en', 'united kingdom': 'en',
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

// ─── MyMemory API fallback ───────────────────────────────────────────────────

async function translatePhrase(phrase: string, targetLang: string): Promise<string | null> {
  try {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(phrase)}&langpair=en|${encodeURIComponent(targetLang)}`
    const res = await fetch(url, CACHE_24H)
    if (!res.ok) return null

    const data = await res.json()
    if (data.responseStatus !== 200 || !data.responseData?.translatedText) return null
    return data.responseData.translatedText
  } catch {
    return null
  }
}

// ─── Route handler ───────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const lang = requireParam(req.nextUrl.searchParams, 'lang', 'e.g. ?lang=ja')
    const langCode = resolveLanguageCode(lang)

    // No translation needed for English
    if (langCode === 'en') return jsonResponse({ phrases: {} })

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

    if (Object.keys(phrases).length === 0) {
      return errorResponse(`Translation failed for language: ${lang}`, 502)
    }

    return jsonResponse({ phrases })
  } catch (err) {
    if (err instanceof MissingParamError) return errorResponse(err.message, 400)
    return errorResponse('Translation service unavailable', 500)
  }
}
