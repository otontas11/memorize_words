const VOWELS = new Set(['a', 'e', 'ı', 'i', 'o', 'ö', 'u', 'ü'])
const SOFT = { p: 'b', ç: 'c', t: 'd', k: 'ğ' }

// Two-syllable nouns that drop the second vowel before a vowel suffix.
const VOWEL_DROP = new Set(['isim', 'ağız', 'burun', 'resim'])

// Polysyllabic words that keep p/ç/t/k before a vowel suffix.
const NO_SOFTEN = new Set([
  'ceket',
  'tişört',
  'saat',
  'bisiklet',
  'market',
  'bilet',
  'paket',
  'sepet',
  'millet',
  'devlet',
  'sanat',
  'fiyat',
  'robot',
  'internet',
  'spor',
])

// Compound dictionary forms whose last piece already carries -(s)I.
const COMPOUND_STEM = {
  'kalem kutusu': 'kalem kutu',
  'doğum günü': 'doğum gün',
}

export const POSSESSIVE = {
  arkadaş: ['arkadaşım', 'arkadaşı'],
  isim: ['ismim', 'ismi'],
  öğretmen: ['öğretmenim', 'öğretmeni'],
  hafta: ['haftam', 'haftası'],
  çanta: ['çantam', 'çantası'],
  kitap: ['kitabım', 'kitabı'],
  bilgisayar: ['bilgisayarım', 'bilgisayarı'],
  defter: ['defterim', 'defteri'],
  'kalem kutusu': ['kalem kutum', 'kalem kutusu'],
  kalemtıraş: ['kalemtıraşım', 'kalemtıraşı'],
  'doğum günü': ['doğum günüm', 'doğum günü'],
  hediye: ['hediyem', 'hediyesi'],
  ceket: ['ceketim', 'ceketi'],
  tişört: ['tişörtüm', 'tişörtü'],
  albüm: ['albümüm', 'albümü'],
  'erkek kardeş': ['erkek kardeşim', 'erkek kardeşi'],
  aile: ['ailem', 'ailesi'],
  büyükbaba: ['büyükbabam', 'büyükbabası'],
  fotoğraf: ['fotoğrafım', 'fotoğrafı'],
  ev: ['evim', 'evi'],
  'evcil hayvan': ['evcil hayvanım', 'evcil hayvanı'],
  muz: ['muzum', 'muzu'],
  kahve: ['kahvem', 'kahvesi'],
  üzüm: ['üzümüm', 'üzümü'],
  patates: ['patatesim', 'patatesi'],
  'pastel boya': ['pastel boyam', 'pastel boyası'],
  'kurşun kalem': ['kurşun kalemim', 'kurşun kalemi'],
  silgi: ['silgim', 'silgisi'],
  kol: ['kolum', 'kolu'],
  mont: ['montum', 'montu'],
  elbise: ['elbisem', 'elbisesi'],
  kulak: ['kulağım', 'kulağı'],
  göz: ['gözüm', 'gözü'],
  yüz: ['yüzüm', 'yüzü'],
  el: ['elim', 'eli'],
  kafa: ['kafam', 'kafası'],
  bacak: ['bacağım', 'bacağı'],
  ağız: ['ağzım', 'ağzı'],
  burun: ['burnum', 'burnu'],
  atkı: ['atkım', 'atkısı'],
  gömlek: ['gömleğim', 'gömleği'],
  şemsiye: ['şemsiyem', 'şemsiyesi'],
  'kız evlat': ['kız evladım', 'kız evladı'],
  büyükanne: ['büyükannem', 'büyükannesi'],
  'kız kardeş': ['kız kardeşim', 'kız kardeşi'],
  'erkek evlat': ['erkek evladım', 'erkek evladı'],
  gaga: ['gagam', 'gagası'],
  pati: ['patim', 'patisi'],
  kuyruk: ['kuyruğum', 'kuyruğu'],
  havuç: ['havucum', 'havucu'],
  kiraz: ['kirazım', 'kirazı'],
  yumurta: ['yumurtam', 'yumurtası'],
  armut: ['armudum', 'armudu'],
  çilek: ['çileğim', 'çileği'],
  domates: ['domatesim', 'domatesi'],
  kedi: ['kedim', 'kedisi'],
  kalem: ['kalemim', 'kalemi'],
  okul: ['okulum', 'okulu'],
}

function lastVowel(word) {
  for (let i = word.length - 1; i >= 0; i -= 1) {
    if (VOWELS.has(word[i])) return word[i]
  }
  return ''
}

function vowelCount(word) {
  let count = 0
  for (const ch of word) if (VOWELS.has(ch)) count += 1
  return count
}

function harmonyI(vowel) {
  if (vowel === 'a' || vowel === 'ı') return 'ı'
  if (vowel === 'e' || vowel === 'i') return 'i'
  if (vowel === 'o' || vowel === 'u') return 'u'
  return 'ü'
}

function endsWithVowel(word) {
  return VOWELS.has(word[word.length - 1])
}

function dropVowel(stem) {
  if (!VOWEL_DROP.has(stem)) return stem
  const chars = [...stem]
  let vowels = 0
  let dropAt = -1
  for (let i = 0; i < chars.length; i += 1) {
    if (!VOWELS.has(chars[i])) continue
    vowels += 1
    if (vowels >= 2 && 'ıiuü'.includes(chars[i])) dropAt = i
  }
  if (dropAt < 0) return stem
  chars.splice(dropAt, 1)
  return chars.join('')
}

function soften(stem) {
  const last = stem[stem.length - 1]
  if (!SOFT[last] || NO_SOFTEN.has(stem) || vowelCount(stem) < 2) return stem
  if (last === 'k' && stem[stem.length - 2] === 'n') return `${stem.slice(0, -1)}g`
  return stem.slice(0, -1) + SOFT[last]
}

function possessStem(stem, person) {
  if (person !== 1 && person !== 3) return null
  let base = dropVowel(stem)
  if (!endsWithVowel(base)) base = soften(base)
  const vowel = lastVowel(base)
  if (!vowel) return null
  const suffixVowel = harmonyI(vowel)
  if (endsWithVowel(base)) {
    if (person === 1) return `${base}m`
    return `${base}s${suffixVowel}`
  }
  if (person === 1) return `${base}${suffixVowel}m`
  return base + suffixVowel
}

export function possess(phrase, person) {
  const source = COMPOUND_STEM[phrase] || phrase
  const parts = String(source).split(' ')
  const form = possessStem(parts[parts.length - 1], person)
  if (!form) return null
  parts[parts.length - 1] = form
  return parts.join(' ')
}

export function capitalizeTr(text) {
  const value = String(text)
  if (!value) return value
  const first = value.charAt(0)
  let upper = first
  if (first === 'i') upper = 'İ'
  else if (first === 'ı') upper = 'I'
  else upper = first.toLocaleUpperCase('tr')
  return upper + value.slice(1)
}

export function framePerson(frame) {
  if (frame.startsWith('Benim bir ___')) return 1
  if (frame.startsWith('Onun bir ___')) return 3
  if (frame.startsWith('Bir ___') || frame.startsWith('___')) return 0
  return null
}

export function realizeSentence(frame, noun) {
  const person = framePerson(frame)
  if (person === null || !noun || !String(frame).includes('___')) return null
  let surface = person ? possess(noun, person) : noun
  if (!surface) return null
  const approved = POSSESSIVE[noun]
  if (person) {
    const expected = approved ? approved[person === 1 ? 0 : 1] : ''
    if (!expected || surface !== expected) return null
  }
  if (frame.startsWith('___')) surface = capitalizeTr(surface)
  const spoken = frame.replace('___', surface)
  if (!spoken || spoken.includes('___')) return null
  if (person === 0) {
    const expect = frame.startsWith('___') ? `${capitalizeTr(noun)} var.` : `Bir ${noun} var.`
    if (spoken !== expect) return null
  }
  return spoken
}

function boundaryOk(sentence, at, length) {
  if (at < 0) return false
  const after = sentence[at + length] || ''
  const leftOk = at === 0 || sentence[at - 1] === ' '
  const rightOk = after === '' || after === ' ' || after === '.' || after === ',' || after === '!' || after === '?'
  return leftOk && rightOk
}

function findToken(spoken, noun) {
  const person = spoken.startsWith('Benim ') ? 1 : spoken.startsWith('Onun ') ? 3 : 0
  const surface = person ? possess(noun, person) : noun
  if (!surface) return null
  const candidates = person ? [surface] : [surface, capitalizeTr(surface)]
  for (const candidate of candidates) {
    let from = 0
    while (from <= spoken.length) {
      const at = spoken.indexOf(candidate, from)
      if (at < 0) break
      if (boundaryOk(spoken, at, candidate.length)) return candidate
      from = at + candidate.length
    }
  }
  return null
}

export function sentenceView(sentence, noun) {
  if (!sentence || !noun) return null
  let spoken = sentence
  if (sentence.includes('___')) {
    spoken = realizeSentence(sentence, noun)
    if (!spoken) return null
  }
  const token = findToken(spoken, noun)
  if (!token) return null
  if ((spoken.startsWith('Benim ') || spoken.startsWith('Onun ')) && token.toLocaleLowerCase('tr') === String(noun).toLocaleLowerCase('tr')) {
    return null
  }
  const at = spoken.indexOf(token)
  return {
    before: spoken.slice(0, at),
    after: spoken.slice(at + token.length),
    token,
    spoken,
  }
}

const CHECKS = [
  ['isim', 1, 'ismim'],
  ['isim', 3, 'ismi'],
  ['kitap', 1, 'kitabım'],
  ['kitap', 3, 'kitabı'],
  ['kedi', 1, 'kedim'],
  ['kedi', 3, 'kedisi'],
  ['kalem', 1, 'kalemim'],
  ['kalem', 3, 'kalemi'],
  ['ev', 1, 'evim'],
  ['ev', 3, 'evi'],
  ['okul', 1, 'okulum'],
  ['okul', 3, 'okulu'],
  ['ağız', 3, 'ağzı'],
  ['burun', 3, 'burnu'],
  ['ceket', 1, 'ceketim'],
  ['tişört', 1, 'tişörtüm'],
  ['mont', 3, 'montu'],
  ['kalem kutusu', 1, 'kalem kutum'],
  ['doğum günü', 1, 'doğum günüm'],
]

for (const [word, person, expected] of CHECKS) {
  const got = possess(word, person)
  if (got !== expected) {
    throw new Error(`${word} (${person}): ${got} !== ${expected}`)
  }
}
