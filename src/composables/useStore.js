import { reactive, ref } from 'vue'
import {
  addDoc,
  collection,
  deleteDoc,
  deleteField,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  startAfter,
  Timestamp,
  updateDoc,
  where,
} from 'firebase/firestore'
import { signInAnonymously } from 'firebase/auth'
import { auth, db } from '../firebase'
import { SENTENCES, defaultWords } from '../data/words'

const KEY = 'km-tr-en-v5'
const USER_WRITE_MS = 700

const notebookIds = new Map(defaultWords().map((word, index) => [word.t, notebookDocId(index)]))

function notebookDocId(index) {
  return `n${String(index + 1).padStart(4, '0')}`
}

export function wordDocId(turkish) {
  const known = notebookIds.get(turkish)
  if (known) return known
  let a = 2166136261
  let b = 5381
  const text = String(turkish).trim().toLocaleLowerCase('tr')
  for (let i = 0; i < text.length; i += 1) {
    const code = text.charCodeAt(i)
    a ^= code
    a = Math.imul(a, 16777619)
    b = Math.imul(b, 33) ^ code
  }
  return `u${(a >>> 0).toString(16)}${(b >>> 0).toString(16)}`
}

function load() {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    const data = JSON.parse(raw)
    if (data && Array.isArray(data.w) && data.w.length) {
      if (!Array.isArray(data.events)) data.events = []
      return data
    }
  } catch {
    /* bozuk kayıt yok sayılır */
  }
  return null
}

export const state = reactive(load() || { w: defaultWords(), st: 0, v: 0, events: [] })
export const screen = ref('home')
export const quizDir = ref('te')
export const toastText = ref('')
export const cloudOn = ref(false)
export const cloudError = ref('')

let toastTimer = 0
let currentUid = ''
let writeTimer = 0
let flushing = null
let userDirty = false
let localEdits = 0
let bootPromise = null
const pendingDeletes = new Set()

export let seedRan = false
export let lastCloudError = ''

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
  if (!Array.isArray(state.events)) state.events = []
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
    if (!word.id && word.t) word.id = wordDocId(word.t)
    if (!word.c) word.c = ''
    if (!word.ce) word.ce = ''
    if (word.s == null) word.s = 0
    if (!word.L) word.L = 0
    if (typeof word.learnedAt !== 'number') word.learnedAt = null
  })
  state.v = 2
}

migrate()

function persistLocal() {
  try {
    if (typeof localStorage === 'undefined') return
    localStorage.setItem(KEY, JSON.stringify(state))
  } catch {
    /* gizli modda depolama kapalı olabilir */
  }
}

function reportCloudError(error) {
  const code = error?.code || 'error'
  const message = error?.message || String(error)
  lastCloudError = `${code}: ${message}`
  cloudError.value = lastCloudError
  console.error(error)
}

function toMillis(value) {
  if (!value) return null
  if (typeof value === 'number') return value
  if (typeof value.toMillis === 'function') return value.toMillis()
  if (typeof value.seconds === 'number') {
    return value.seconds * 1000 + Math.floor((value.nanoseconds || 0) / 1e6)
  }
  return null
}

function copyCloudWord(word, scores) {
  return {
    id: word.id,
    t: word.t,
    e: word.e,
    p: word.p || '',
    c: word.c || '',
    ce: word.ce || '',
    s: scores ? Number(scores.s) || 0 : 0,
    L: scores && scores.L ? 1 : 0,
    learnedAt: scores ? toMillis(scores.learnedAt) : null,
  }
}

function buildUserPayload() {
  const progress = {}
  state.w.forEach((word) => {
    if (!word.id) return
    const s = Number(word.s) || 0
    const learned = word.L ? 1 : 0
    if (!s && !learned && !word.learnedAt) return
    const entry = { s, L: learned }
    if (learned && word.learnedAt) entry.learnedAt = Timestamp.fromMillis(Number(word.learnedAt))
    progress[word.id] = entry
  })
  return { stars: Number(state.st) || 0, progress }
}

function scheduleCloudUser() {
  userDirty = true
  if (!cloudOn.value || !currentUid) return
  clearTimeout(writeTimer)
  writeTimer = setTimeout(() => {
    void flushUserDoc()
  }, USER_WRITE_MS)
}

async function flushUserDoc() {
  if (!cloudOn.value || !currentUid) return
  if (flushing) return flushing
  userDirty = false
  const payload = buildUserPayload()
  flushing = setDoc(doc(db, 'users', currentUid), payload, { merge: true })
    .catch((error) => {
      userDirty = true
      reportCloudError(error)
      toast('Buluta yazılamadı')
    })
    .finally(() => {
      flushing = null
      if (userDirty) scheduleCloudUser()
    })
  return flushing
}

export function save() {
  persistLocal()
  scheduleCloudUser()
}

async function pushWordDoc(word) {
  if (!cloudOn.value || !word?.id) return
  try {
    await setDoc(doc(db, 'words', word.id), {
      tr: word.t,
      en: word.e,
      pronunciation: word.p || '',
      sentenceTr: word.c || '',
      sentenceEn: word.ce || '',
      createdAt: serverTimestamp(),
    })
  } catch (error) {
    reportCloudError(error)
    toast('Buluta yazılamadı')
  }
}

async function seedCatalog() {
  const words = defaultWords()
  const seeded = await runTransaction(db, async (tx) => {
    const head = await tx.get(doc(db, 'words', notebookDocId(0)))
    if (head.exists()) return false
    words.forEach((word, index) => {
      tx.set(doc(db, 'words', notebookDocId(index)), {
        tr: word.t,
        en: word.e,
        pronunciation: word.p || '',
        sentenceTr: '',
        sentenceEn: '',
        createdAt: serverTimestamp(),
      })
    })
    return true
  })
  if (seeded) seedRan = true
  return seeded
}

async function loadWordDocs() {
  try {
    const snap = await getDocs(query(collection(db, 'words'), orderBy('createdAt')))
    return snap.docs
  } catch (error) {
    if (error?.code === 'permission-denied') throw error
    const snap = await getDocs(collection(db, 'words'))
    return snap.docs.slice().sort((a, b) => {
      const left = toMillis(a.data().createdAt) || 0
      const right = toMillis(b.data().createdAt) || 0
      if (left !== right) return left - right
      return a.id.localeCompare(b.id)
    })
  }
}

function mapWordDoc(snapshot) {
  const data = snapshot.data() || {}
  if (!data.tr || !data.en) return null
  return {
    id: snapshot.id,
    t: data.tr,
    e: data.en,
    p: data.pronunciation || '',
    c: data.sentenceTr || '',
    ce: data.sentenceEn || '',
  }
}

async function loadEvents(uid) {
  const since = Timestamp.fromMillis(Date.now() - 90 * 24 * 60 * 60 * 1000)
  const events = []
  let cursor = null
  for (let page = 0; page < 8; page += 1) {
    const parts = [where('at', '>=', since), orderBy('at', 'asc'), limit(300)]
    if (cursor) parts.push(startAfter(cursor))
    const snap = await getDocs(query(collection(db, 'users', uid, 'events'), ...parts))
    snap.docs.forEach((item) => {
      const data = item.data() || {}
      const event = {
        wordId: data.wordId || '',
        mode: data.mode || 'quiz',
        at: toMillis(data.at) || Date.now(),
      }
      if (typeof data.ok === 'boolean') event.ok = data.ok
      events.push(event)
    })
    if (snap.size < 300) break
    cursor = snap.docs[snap.docs.length - 1]
  }
  return events
}

function adoptCloud(cloudWords, progress, stars, events, hasUser) {
  const byId = new Map(cloudWords.map((word) => [word.id, word]))
  const byTr = new Map(cloudWords.map((word) => [word.t, word]))
  const missing = []

  const useCloudEvents = hasUser || events.length > 0
  const keptEvents = useCloudEvents ? events : (state.events || [])

  if (localEdits === 0 && hasUser) {
    state.w = cloudWords.map((word) => copyCloudWord(word, progress[word.id]))
    state.st = Number(stars) || 0
    state.events = keptEvents
    return missing
  }

  if (localEdits === 0 && !hasUser) {
    const localById = new Map(state.w.map((word) => [word.id, word]))
    const localByTr = new Map(state.w.map((word) => [word.t, word]))
    state.w = cloudWords.map((word) => {
      const local = localById.get(word.id) || localByTr.get(word.t)
      return copyCloudWord(word, local ? { s: local.s, L: local.L, learnedAt: local.learnedAt } : null)
    })
    localByTr.forEach((local, turkish) => {
      if (byTr.has(turkish) || pendingDeletes.has(local.id)) return
      if (!local.id) local.id = wordDocId(local.t)
      state.w.unshift(local)
      missing.push(local)
    })
    state.events = keptEvents
    return missing
  }

  state.w.forEach((word) => {
    const remote = byId.get(word.id) || byTr.get(word.t)
    if (remote) {
      word.id = remote.id
      word.e = remote.e
      word.p = remote.p || word.p || ''
      if (remote.c) word.c = remote.c
      if (remote.ce) word.ce = remote.ce
      return
    }
    if (!word.id && word.t) word.id = wordDocId(word.t)
    if (word.t && !pendingDeletes.has(word.id)) missing.push(word)
  })
  const have = new Set(state.w.map((word) => word.t))
  cloudWords.forEach((remote) => {
    if (have.has(remote.t) || pendingDeletes.has(remote.id)) return
    state.w.push(copyCloudWord(remote, hasUser ? progress[remote.id] : null))
  })
  state.events = keptEvents
  return missing
}

async function bootOnce() {
  const editsAtStart = localEdits
  try {
    try {
      const cred = await signInAnonymously(auth)
      currentUid = cred.user.uid
    } catch (error) {
      reportCloudError(error)
    }
    let docs = await loadWordDocs()
    if (!docs.length) {
      await seedCatalog()
      docs = await loadWordDocs()
    }
    const cloudWords = docs.map(mapWordDoc).filter(Boolean)
    if (!cloudWords.length) throw new Error('Kelime listesi boş')

    let userData = null
    let events = []
    let historyFailed = false
    if (currentUid) {
      const userSnap = await getDoc(doc(db, 'users', currentUid))
      userData = userSnap.exists() ? userSnap.data() || {} : null
      try {
        events = await loadEvents(currentUid)
      } catch (error) {
        historyFailed = true
        reportCloudError(error)
        toast('Geçmiş alınamadı')
        events = Array.isArray(state.events) ? state.events.slice() : []
      }
    }

    const progress = userData?.progress || {}
    const missing = adoptCloud(cloudWords, progress, userData?.stars, events, !!userData)
    cloudOn.value = true
    if (currentUid && !historyFailed) {
      lastCloudError = ''
      cloudError.value = ''
    }
    if (!currentUid) toast('Giriş kapalı, puanlar bu cihazda')
    persistLocal()
    for (const word of missing) {
      if (!pendingDeletes.has(word.id)) await pushWordDoc(word)
    }
    for (const id of pendingDeletes) {
      await deleteCloudWord(id)
    }
    pendingDeletes.clear()
    if (!userData || localEdits !== editsAtStart || userDirty) scheduleCloudUser()
  } catch (error) {
    cloudOn.value = false
    reportCloudError(error)
    toast('Bulut açılamadı')
  }
}

function boot() {
  if (!bootPromise) bootPromise = bootOnce()
  return bootPromise
}

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

async function appendEvent(word, mode, ok) {
  const event = {
    wordId: word.id || '',
    mode,
    at: Date.now(),
  }
  if (typeof ok === 'boolean') event.ok = ok
  if (!Array.isArray(state.events)) state.events = []
  state.events.push(event)
  persistLocal()
  if (!cloudOn.value || !currentUid || !word.id) return
  const payload = {
    wordId: word.id,
    mode,
    at: serverTimestamp(),
  }
  if (typeof ok === 'boolean') payload.ok = ok
  try {
    await addDoc(collection(db, 'users', currentUid, 'events'), payload)
  } catch (error) {
    reportCloudError(error)
    toast('Buluta yazılamadı')
  }
}

export function mark(word, ok, mode) {
  localEdits += 1
  if (ok) {
    word.s = Math.min(5, word.s + 1)
    state.st += 1
    if (word.s >= 5 && !word.L) {
      word.L = 1
      word.learnedAt = Date.now()
      toast(`🎓 Öğrenildi: ${word.t}`)
    }
  } else {
    word.s = Math.max(-3, word.s - 1)
  }
  save()
  if (mode) void appendEvent(word, mode, ok)
}

export function addCatalogWord(fields) {
  localEdits += 1
  const word = {
    id: wordDocId(fields.t),
    t: fields.t,
    e: fields.e,
    p: '',
    c: fields.c || '',
    ce: fields.ce || '',
    s: 0,
    L: 0,
    learnedAt: null,
  }
  state.w.unshift(word)
  save()
  void pushWordDoc(word)
  return word
}

async function deleteCloudWord(id) {
  if (!cloudOn.value || !currentUid || !id) {
    if (id) pendingDeletes.add(id)
    return
  }
  try {
    await deleteDoc(doc(db, 'words', id))
    try {
      await updateDoc(doc(db, 'users', currentUid), {
        [`progress.${id}`]: deleteField(),
      })
    } catch (error) {
      if (error?.code !== 'not-found') throw error
    }
  } catch (error) {
    reportCloudError(error)
    toast('Buluta yazılamadı')
  }
}

export async function removeCatalogWord(word) {
  localEdits += 1
  const index = state.w.indexOf(word)
  if (index >= 0) state.w.splice(index, 1)
  if (word?.id) pendingDeletes.add(word.id)
  save()
  await deleteCloudWord(word?.id)
  pendingDeletes.delete(word?.id)
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

export function startStats() {
  screen.value = 'stats'
}

export function choicesFor(word) {
  const others = shuffle(state.w.filter((item) => item !== word)).slice(0, 3)
  return shuffle([word, ...others])
}

persistLocal()

if (typeof window !== 'undefined') {
  void boot()
  window.addEventListener('pagehide', () => {
    void flushUserDoc()
  })
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') void flushUserDoc()
  })
  if (import.meta.env.DEV) {
    window.__kmCloud = {
      status() {
        return {
          on: cloudOn.value,
          seeded: seedRan,
          error: lastCloudError,
          uid: currentUid,
          words: state.w.length,
          events: (state.events || []).length,
          stars: state.st,
        }
      },
    }
  }
}
