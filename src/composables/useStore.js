import { reactive, ref } from 'vue'
import { SENTENCES, defaultWords } from '../data/words'

const KEY = 'km-tr-en-v5'

function load() {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    const data = JSON.parse(raw)
    if (data && Array.isArray(data.w) && data.w.length) return data
  } catch {
    /* bozuk kayıt yok sayılır */
  }
  return null
}

export const state = reactive(load() || { w: defaultWords(), st: 0, v: 0 })
export const screen = ref('home')
export const quizDir = ref('te')
export const toastText = ref('')

let toastTimer = 0

function migrate() {
  const upgrade = state.v !== 2
  const defaults = defaultWords()
  const byPair = new Map(defaults.map((word) => [`${word.t}\0${word.e}`, word.p]))
  const byTurkish = new Map()
  defaults.forEach((word) => {
    const list = byTurkish.get(word.t)
    if (list) list.push(word)
    else byTurkish.set(word.t, [word])
  })
  state.w.forEach((word) => {
    const sentence = SENTENCES[word.t]
    if (sentence && (upgrade || !word.c)) {
      word.c = sentence[0]
      word.ce = sentence[1]
    }
    if (!word.p) {
      const exact = byPair.get(`${word.t}\0${word.e}`)
      if (exact) word.p = exact
      else {
        const matches = byTurkish.get(word.t) || []
        if (matches.length === 1) word.p = matches[0].p
      }
    }
  })
  state.v = 2
}

migrate()

export function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
  } catch {
    /* gizli modda depolama kapalı olabilir */
  }
}

save()

export function toast(message) {
  toastText.value = message
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => {
    toastText.value = ''
  }, 2000)
}

export function say(text, lang = 'tr-TR') {
  try {
    if (typeof speechSynthesis === 'undefined') return
    speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = lang
    utterance.rate = 0.8
    speechSynthesis.speak(utterance)
  } catch {
    /* ses yoksa oyun devam eder */
  }
}

export function home() {
  try {
    if (typeof speechSynthesis !== 'undefined') speechSynthesis.cancel()
  } catch {
    /* yoksay */
  }
  screen.value = 'home'
}

export function tl(value) {
  return String(value).trim().toLocaleLowerCase('tr').replace(/\s+/g, ' ')
}

export function shuffle(list) {
  return list
    .map((item) => [Math.random(), item])
    .sort((a, b) => a[0] - b[0])
    .map((item) => item[1])
}

export function pick(count) {
  return state.w
    .map((word) => [(word.L ? 20 : 0) + word.s + Math.random() * 3, word])
    .sort((a, b) => a[0] - b[0])
    .slice(0, count)
    .map((item) => item[1])
}

export function need(count) {
  if (state.w.length < count) {
    toast(`En az ${count} kelime gerekli`)
    return false
  }
  return true
}

export function mark(word, ok) {
  if (ok) {
    word.s = Math.min(5, word.s + 1)
    state.st += 1
    if (word.s >= 5 && !word.L) {
      word.L = 1
      toast(`🎓 Öğrenildi: ${word.t}`)
    }
  } else {
    word.s = Math.max(-3, word.s - 1)
  }
  save()
}

export function startCards() {
  if (!need(1)) return
  screen.value = 'cards'
}

export function startQuiz(dir) {
  if (!need(4)) return
  quizDir.value = dir
  screen.value = 'quiz'
}

export function startWrite() {
  if (!need(1)) return
  screen.value = 'write'
}

export function startDrag() {
  if (!need(4)) return
  screen.value = 'dnd'
}

export function startFill() {
  if (!state.w.some((word) => word.c)) {
    toast('Cümlesi olan kelime yok')
    return
  }
  if (!need(4)) return
  screen.value = 'fill'
}

export function startWords() {
  screen.value = 'words'
}

export function choicesFor(word) {
  const others = shuffle(state.w.filter((item) => item !== word)).slice(0, 3)
  return shuffle([word, ...others])
}
