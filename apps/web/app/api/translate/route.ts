import { NextRequest, NextResponse } from 'next/server'

/** Common travel phrases as fallback when LibreTranslate is unavailable */
const PHRASES: Record<string, Record<string, string>> = {
  es: {
    greeting: 'Hola',
    thanks: 'Gracias',
    please: 'Por favor',
    sorry: 'Lo siento',
    yes: 'Si',
    no: 'No',
    help: 'Ayuda',
    how_much: 'Cuanto cuesta?',
    where_is: 'Donde esta?',
    excuse_me: 'Disculpe',
  },
  fr: {
    greeting: 'Bonjour',
    thanks: 'Merci',
    please: "S'il vous plait",
    sorry: 'Desole',
    yes: 'Oui',
    no: 'Non',
    help: 'Aidez-moi',
    how_much: 'Combien ca coute?',
    where_is: 'Ou est?',
    excuse_me: 'Excusez-moi',
  },
  it: {
    greeting: 'Ciao',
    thanks: 'Grazie',
    please: 'Per favore',
    sorry: 'Mi dispiace',
    yes: 'Si',
    no: 'No',
    help: 'Aiuto',
    how_much: 'Quanto costa?',
    where_is: "Dov'e?",
    excuse_me: 'Mi scusi',
  },
  ja: {
    greeting: 'Konnichiwa',
    thanks: 'Arigatou gozaimasu',
    please: 'Onegaishimasu',
    sorry: 'Sumimasen',
    yes: 'Hai',
    no: 'Iie',
    help: 'Tasukete',
    how_much: 'Ikura desu ka?',
    where_is: 'Doko desu ka?',
    excuse_me: 'Sumimasen',
  },
  de: {
    greeting: 'Hallo',
    thanks: 'Danke',
    please: 'Bitte',
    sorry: 'Entschuldigung',
    yes: 'Ja',
    no: 'Nein',
    help: 'Hilfe',
    how_much: 'Wie viel kostet das?',
    where_is: 'Wo ist?',
    excuse_me: 'Entschuldigen Sie',
  },
  pt: {
    greeting: 'Ola',
    thanks: 'Obrigado',
    please: 'Por favor',
    sorry: 'Desculpe',
    yes: 'Sim',
    no: 'Nao',
    help: 'Socorro',
    how_much: 'Quanto custa?',
    where_is: 'Onde fica?',
    excuse_me: 'Com licenca',
  },
  nl: {
    greeting: 'Hallo',
    thanks: 'Dank u',
    please: 'Alstublieft',
    sorry: 'Sorry',
    yes: 'Ja',
    no: 'Nee',
    help: 'Help',
    how_much: 'Hoeveel kost het?',
    where_is: 'Waar is?',
    excuse_me: 'Pardon',
  },
  ko: {
    greeting: 'Annyeonghaseyo',
    thanks: 'Gamsahamnida',
    please: 'Juseyo',
    sorry: 'Joesonghamnida',
    yes: 'Ne',
    no: 'Aniyo',
    help: 'Dowajuseyo',
    how_much: 'Eolmayeyo?',
    where_is: 'Eodiyeyo?',
    excuse_me: 'Sillyehamnida',
  },
  zh: {
    greeting: 'Ni hao',
    thanks: 'Xie xie',
    please: 'Qing',
    sorry: 'Dui bu qi',
    yes: 'Shi',
    no: 'Bu shi',
    help: 'Jiu ming',
    how_much: 'Duo shao qian?',
    where_is: 'Zai na li?',
    excuse_me: 'Qing wen',
  },
  ar: {
    greeting: 'Marhaba',
    thanks: 'Shukran',
    please: 'Min fadlak',
    sorry: 'Ana aasif',
    yes: 'Na\'am',
    no: 'La',
    help: 'Musaada',
    how_much: 'Bikam?',
    where_is: 'Ayna?',
    excuse_me: 'Afwan',
  },
  tr: {
    greeting: 'Merhaba',
    thanks: 'Tesekkur ederim',
    please: 'Lutfen',
    sorry: 'Ozur dilerim',
    yes: 'Evet',
    no: 'Hayir',
    help: 'Yardim edin',
    how_much: 'Ne kadar?',
    where_is: 'Nerede?',
    excuse_me: 'Bakar misiniz',
  },
  th: {
    greeting: 'Sawasdee',
    thanks: 'Khob khun',
    please: 'Garunaa',
    sorry: 'Kor thot',
    yes: 'Chai',
    no: 'Mai chai',
    help: 'Chuay duay',
    how_much: 'Tao rai?',
    where_is: 'Yuu tee nai?',
    excuse_me: 'Kor thot',
  },
  id: {
    greeting: 'Halo',
    thanks: 'Terima kasih',
    please: 'Tolong',
    sorry: 'Maaf',
    yes: 'Ya',
    no: 'Tidak',
    help: 'Tolong',
    how_much: 'Berapa harganya?',
    where_is: 'Di mana?',
    excuse_me: 'Permisi',
  },
}

export async function GET(req: NextRequest) {
  const text = req.nextUrl.searchParams.get('text')
  const from = req.nextUrl.searchParams.get('from') ?? 'en'
  const to = req.nextUrl.searchParams.get('to')

  if (!text || !to) {
    return NextResponse.json(
      { error: 'Missing text or to parameter' },
      { status: 400 }
    )
  }

  try {
    const res = await fetch('https://libretranslate.com/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: text, source: from, target: to }),
    })

    if (!res.ok) {
      throw new Error(`LibreTranslate returned ${res.status}`)
    }

    const data = await res.json()

    return NextResponse.json({
      translated: data.translatedText,
      from,
      to,
    })
  } catch {
    // Fallback: return common travel phrases for the target language
    const phrases = PHRASES[to]

    if (phrases) {
      return NextResponse.json({
        translated: null,
        from,
        to,
        fallback: true,
        phrases,
      })
    }

    return NextResponse.json(
      { error: `Translation service unavailable and no fallback phrases for language: ${to}` },
      { status: 500 }
    )
  }
}
