import { reactive, ref } from 'vue'
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore'
import { db } from '../firebase'
import { SENTENCES, bundledSentencePatch, defaultWords } from '../data/words'

const PROGRESS_KEY = 'km-tr-en-v5'
const CATALOG_KEY = 'km-catalog-v1'
const PENDING_KEY = 'km-pending-v1'

const bundled = defaultWords()
const notebookIds = new Map(bundled.map((word, index) => [word.t, notebookDocId(index)]))
const byPair = new Map(bundled.map((word) => [`${word.t}\0${word.e}`, word.p]))
const byTurkish = new Map()
bundled.forEach((word) => {
  const list = byTurkish.get(word.t)
  if (list) list.push(word)
  else byTurkish.set(word.t, [word])
})

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

function readJson(key) {
  try {
    if (typeof localStorage === 'undefined') return null
    const raw = localStorage.getItem(key)
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

function writeJson(key, value) {
  try {
    if (typeof localStorage === 'undefined') return false
    localStorage.setItem(key, JSON.stringify(value))
    return true
  } catch {
    return false
  }
}

function presentWord(word) {
  const entry = {
    id: word.id || (word.t ? wordDocId(word.t) : ''),
    t: word.t,
    e: word.e,
    p: word.p || '',
    c: word.c || '',
    ce: word.ce || '',
  }
  const sentence = bundledSentence(entry.t)
  if (sentence && !entry.c) {
    entry.c = sentence[0]
    entry.ce = sentence[1]
    if (entry.id) sentenceGaps.add(entry.id)
  }
  if (!entry.p) {
    const exact = byPair.get(`${entry.t}\0${entry.e}`)
    if (exact) entry.p = exact
    else {
      const matches = byTurkish.get(entry.t) || []
      if (matches.length === 1) entry.p = matches[0].p || ''
    }
  }
  return entry
}

function bundledCatalog() {
  return bundled.map((word) => presentWord({ t: word.t, e: word.e, p: word.p }))
}

function sanitizeScores(raw) {
  const scores = {}
  if (!raw || typeof raw !== 'object') return scores
  Object.keys(raw).forEach((id) => {
    const value = raw[id]
    if (!value || typeof value !== 'object') return
    scores[id] = {
      s: Number(value.s) || 0,
      L: value.L ? 1 : 0,
      learnedAt: typeof value.learnedAt === 'number' ? value.learnedAt : null,
    }
  })
  return scores
}

function scoreFrom(word) {
  return {
    s: Number(word.s) || 0,
    L: word.L ? 1 : 0,
    learnedAt: typeof word.learnedAt === 'number' ? word.learnedAt : null,
  }
}

function normalizePending(raw) {
  if (!Array.isArray(raw)) return []
  const ops = []
  raw.forEach((op) => {
    if (!op || typeof op.id !== 'string' || !op.id) return
    if (op.op === 'delete') {
      ops.push({ op: 'delete', id: op.id })
      return
    }
    if (op.op === 'sentences') {
      if (typeof op.c !== 'string') return
      ops.push({ op: 'sentences', id: op.id, c: op.c, ce: op.ce || '' })
      return
    }
    if (op.op !== 'upsert' || !op.t || !op.e) return
    ops.push({
      op: 'upsert',
      id: op.id,
      t: op.t,
      e: op.e,
      p: op.p || '',
      c: op.c || '',
      ce: op.ce || '',
    })
  })
  return ops
}

function rememberLegacyScores(words) {
  words.forEach((word) => {
    const id = word.id || (word.t ? wordDocId(word.t) : '')
    if (!id) return
    scores[id] = scoreFrom(word)
  })
}

function overlayPending(words) {
  const deletes = new Set(pending.filter((op) => op.op === 'delete').map((op) => op.id))
  const upserts = pending.filter((op) => op.op === 'upsert' && !deletes.has(op.id))
  const upsertIds = new Set(upserts.map((op) => op.id))
  const seen = new Set()
  const base = []
  words.forEach((word) => {
    if (!word.id || !word.t || !word.e || deletes.has(word.id) || upsertIds.has(word.id) || seen.has(word.id)) return
    seen.add(word.id)
    base.push(word)
  })
  const extras = []
  upserts.forEach((op) => {
    const entry = presentWord(op)
    if (!entry.id || !entry.t || !entry.e || seen.has(entry.id)) return
    seen.add(entry.id)
    extras.push(entry)
  })
  const patched = [...extras, ...base]
  const sentenceOps = pending.filter((op) => op.op === 'sentences')
  if (sentenceOps.length) {
    const byId = new Map(sentenceOps.map((op) => [op.id, op]))
    patched.forEach((word) => {
      const op = byId.get(word.id)
      if (op && !word.c) {
        word.c = op.c
        word.ce = op.ce || ''
      }
    })
  }
  return patched
}

const sentenceGaps = new Set()
const sentenceFixes = new Set()

function bundledSentence(turkish) {
  const sentence = SENTENCES[turkish]
  if (!sentence || !sentence[0]) return null
  return [sentence[0], sentence[1] || '']
}

let scores = {}
let pending = []
let lastCloudIds = []
let catalogSource = 'bundle'
let hasCatalogCache = false
let downloadToastShown = false
let flushing = null
let refreshFlight = null

function loadLocal() {
  const progress = readJson(PROGRESS_KEY)
  const cached = readJson(CATALOG_KEY)
  pending = normalizePending(readJson(PENDING_KEY))
  scores = {}

  let st = 0
  let events = []
  let legacyWords = null
  if (progress && progress.v === 3 && progress.scores && typeof progress.scores === 'object') {
    scores = sanitizeScores(progress.scores)
    st = Number(progress.st) || 0
    events = Array.isArray(progress.events) ? progress.events : []
  } else if (progress && typeof progress === 'object') {
    st = Number(progress.st) || 0
    events = Array.isArray(progress.events) ? progress.events : []
    if (Array.isArray(progress.w) && progress.w.length) legacyWords = progress.w
  }

  let catalog = null
  if (cached && Array.isArray(cached.words) && cached.words.length) {
    catalog = cached.words.map((word) => presentWord(word)).filter((word) => word.id && word.t && word.e)
    if (catalog.length) {
      hasCatalogCache = true
      if (cached.source === 'cloud') {
        catalogSource = 'cloud'
        lastCloudIds = Array.isArray(cached.cloudIds)
          ? cached.cloudIds.filter((id) => typeof id === 'string' && id)
          : []
      } else {
        catalogSource = 'device'
      }
      if (legacyWords) rememberLegacyScores(legacyWords)
    }
  }

  if (!catalog || !catalog.length) {
    if (legacyWords) {
      catalog = []
      legacyWords.forEach((word) => {
        const entry = presentWord(word)
        if (!entry.id || !entry.t || !entry.e) return
        scores[entry.id] = scoreFrom(word)
        catalog.push(entry)
      })
      if (catalog.length) {
        hasCatalogCache = true
        catalogSource = 'device'
      }
    }
  }

  if (!catalog || !catalog.length) {
    catalog = bundledCatalog()
    hasCatalogCache = false
    catalogSource = 'bundle'
  }

  return {
    catalog: overlayPending(catalog),
    st,
    events,
  }
}

const loaded = loadLocal()

function viewWord(entry) {
  const score = scores[entry.id] || {}
  return {
    id: entry.id,
    t: entry.t,
    e: entry.e,
    p: entry.p || '',
    c: entry.c || '',
    ce: entry.ce || '',
    s: Number(score.s) || 0,
    L: score.L ? 1 : 0,
    learnedAt: typeof score.learnedAt === 'number' ? score.learnedAt : null,
  }
}

export const state = reactive({
  w: loaded.catalog.map((entry) => viewWord(entry)),
  st: loaded.st,
  v: 2,
  events: loaded.events,
})
export const screen = ref('home')
export const quizDir = ref('te')
export const toastText = ref('')
export const cloudOn = ref(false)
export const cloudError = ref('')

let toastTimer = 0
export let seedRan = false
export let lastCloudError = ''

function remember(word) {
  if (!word?.id) return
  scores[word.id] = scoreFrom(word)
}

function progressPayload() {
  state.w.forEach(remember)
  return {
    v: 3,
    st: Number(state.st) || 0,
    events: Array.isArray(state.events) ? state.events : [],
    scores,
  }
}

function catalogPayload() {
  return {
    source: catalogSource === 'cloud' ? 'cloud' : 'device',
    cloudIds: catalogSource === 'cloud' ? lastCloudIds : [],
    words: state.w.map((word) => ({
      id: word.id,
      t: word.t,
      e: word.e,
      p: word.p || '',
      c: word.c || '',
      ce: word.ce || '',
    })),
  }
}

function persistProgress() {
  return writeJson(PROGRESS_KEY, progressPayload())
}

function persistCatalog() {
  const ok = writeJson(CATALOG_KEY, catalogPayload())
  if (ok) hasCatalogCache = true
  return ok
}

function persistPending() {
  return writeJson(PENDING_KEY, pending)
}

function persistAll() {
  const catalogOk = persistCatalog()
  persistPending()
  if (catalogOk) persistProgress()
  return catalogOk
}

const hadCatalogAtBoot = hasCatalogCache
const filledSentences = sentenceGaps.size > 0
const patchedSentences = applyBundledSentencePatches()
if (typeof navigator !== 'undefined' && navigator.onLine === false) queueSentenceGaps()
if (hasCatalogCache || filledSentences || patchedSentences) persistAll()

function reportCloudError(error) {
  const code = error?.code || 'error'
  const message = error?.message || String(error)
  lastCloudError = `${code}: ${message}`
  cloudError.value = lastCloudError
  console.warn(error)
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

function queueUpsert(word) {
  pending = pending.filter((op) => op.id !== word.id)
  pending.push({
    op: 'upsert',
    id: word.id,
    t: word.t,
    e: word.e,
    p: word.p || '',
    c: word.c || '',
    ce: word.ce || '',
  })
}

function queueDelete(id) {
  pending = pending.filter((op) => op.id !== id)
  pending.push({ op: 'delete', id })
}

function queueSentence(id, c, ce, { force = false, clear = false } = {}) {
  if (!id) return
  if (!c && !clear) return
  const current = pending.find((op) => op.id === id)
  if (current?.op === 'delete') return
  if (current?.op === 'upsert') {
    if (force || clear || !current.c) {
      current.c = c || ''
      current.ce = ce || ''
    }
    return
  }
  if (current?.op === 'sentences') {
    current.c = c || ''
    current.ce = ce || ''
    return
  }
  pending.push({ op: 'sentences', id, c: c || '', ce: ce || '' })
}

function queueSentenceGaps() {
  if (!sentenceGaps.size) return false
  const ids = [...sentenceGaps]
  sentenceGaps.clear()
  let queued = false
  ids.forEach((id) => {
    const word = state.w.find((item) => item.id === id)
    if (!word?.c) return
    queueSentence(word.id, word.c, word.ce || '')
    queued = true
  })
  if (queued && catalogSource === 'bundle') catalogSource = 'device'
  return queued
}

function queueSentenceFixes() {
  if (!sentenceFixes.size) return false
  const ids = [...sentenceFixes]
  sentenceFixes.clear()
  let queued = false
  ids.forEach((id) => {
    const word = state.w.find((item) => item.id === id)
    if (!word) return
    queueSentence(word.id, word.c || '', word.ce || '', { force: true, clear: !word.c })
    queued = true
  })
  if (queued && catalogSource === 'bundle') catalogSource = 'device'
  return queued
}

function applyBundledSentencePatches() {
  let changed = false
  state.w.forEach((word) => {
    const patch = bundledSentencePatch(word.t, word.c, word.ce)
    if (!patch) return
    word.c = patch.c
    word.ce = patch.ce
    sentenceFixes.add(word.id)
    changed = true
  })
  if (changed) queueSentenceFixes()
  return changed
}

function replaceWords(entries) {
  state.w.forEach(remember)
  const existing = new Map(state.w.map((word) => [word.id, word]))
  const next = []
  const seen = new Set()
  entries.forEach((entry) => {
    if (!entry?.id || !entry.t || !entry.e || seen.has(entry.id)) return
    seen.add(entry.id)
    const prev = existing.get(entry.id)
    if (prev) {
      prev.t = entry.t
      prev.e = entry.e
      if (entry.p) prev.p = entry.p
      if (entry.c) prev.c = entry.c
      if (entry.ce) prev.ce = entry.ce
      next.push(prev)
      return
    }
    next.push(viewWord(entry))
  })
  state.w.splice(0, state.w.length, ...next)
}

function mergeCloud(cloudWords) {
  const cloudIds = new Set()
  const remote = []
  cloudWords.forEach((word) => {
    const entry = presentWord(word)
    if (!entry.id || !entry.t || !entry.e || cloudIds.has(entry.id)) return
    cloudIds.add(entry.id)
    remote.push(entry)
  })

  const deletes = new Set(pending.filter((op) => op.op === 'delete').map((op) => op.id))
  const knownCloud = new Set(lastCloudIds)
  state.w.forEach((word) => {
    if (!word?.id || cloudIds.has(word.id) || deletes.has(word.id)) return
    if (pending.some((op) => op.op === 'upsert' && op.id === word.id)) return
    if (knownCloud.has(word.id)) return
    if (!knownCloud.size && !String(word.id).startsWith('u')) return
    queueUpsert(word)
  })

  const extras = []
  const seen = new Set()
  pending.forEach((op) => {
    if (op.op !== 'upsert' || deletes.has(op.id) || cloudIds.has(op.id) || seen.has(op.id)) return
    const entry = presentWord(op)
    if (!entry.id || !entry.t || !entry.e) return
    seen.add(entry.id)
    extras.push(entry)
  })

  lastCloudIds = [...cloudIds]
  return [...extras, ...remote.filter((word) => !deletes.has(word.id))]
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

async function seedCatalog() {
  const seeded = await runTransaction(db, async (tx) => {
    const head = await tx.get(doc(db, 'words', notebookDocId(0)))
    if (head.exists()) return false
    bundled.forEach((word, index) => {
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

async function commitOp(op) {
  if (op.op === 'delete') {
    await deleteDoc(doc(db, 'words', op.id))
    return
  }
  if (op.op === 'sentences') {
    await updateDoc(doc(db, 'words', op.id), {
      sentenceTr: op.c || '',
      sentenceEn: op.ce || '',
    })
    return
  }
  await setDoc(doc(db, 'words', op.id), {
    tr: op.t,
    en: op.e,
    pronunciation: op.p || '',
    sentenceTr: op.c || '',
    sentenceEn: op.ce || '',
    createdAt: serverTimestamp(),
  }, { merge: true })
}

async function flushPending() {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return false
  if (flushing) return flushing
  flushing = (async () => {
    try {
      while (pending.length) {
        if (typeof navigator !== 'undefined' && navigator.onLine === false) return false
        const op = pending[0]
        await commitOp(op)
        if (pending[0] === op) pending.shift()
        else pending = pending.filter((item) => item !== op)
        persistPending()
      }
      return true
    } catch (error) {
      console.warn(error)
      return false
    }
  })()
  try {
    return await flushing
  } finally {
    flushing = null
  }
}

async function refreshCatalog() {
  if (refreshFlight) return refreshFlight
  refreshFlight = (async () => {
    try {
      if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        const offline = new Error('offline')
        offline.code = 'offline'
        throw offline
      }
      let docs = await loadWordDocs()
      if (!docs.length) {
        await seedCatalog()
        docs = await loadWordDocs()
      }
      const cloudWords = docs.map(mapWordDoc).filter(Boolean)
      if (!cloudWords.length) throw new Error('Kelime listesi boş')
      const cleared = new Set()
      cloudWords.forEach((word) => {
        if (!word.id) return
        const patch = bundledSentencePatch(word.t, word.c, word.ce)
        if (patch) {
          word.c = patch.c
          word.ce = patch.ce
          if (!patch.c) cleared.add(word.id)
          sentenceFixes.add(word.id)
          return
        }
        if (word.c) {
          sentenceGaps.delete(word.id)
          pending = pending.filter((op) => !(op.op === 'sentences' && op.id === word.id))
          return
        }
        const sentence = bundledSentence(word.t)
        if (!sentence) return
        word.c = sentence[0]
        word.ce = sentence[1]
        sentenceGaps.add(word.id)
      })
      const merged = mergeCloud(cloudWords)
      catalogSource = 'cloud'
      replaceWords(merged)
      cleared.forEach((id) => {
        const word = state.w.find((item) => item.id === id)
        if (!word) return
        word.c = ''
        word.ce = ''
      })
      queueSentenceFixes()
      queueSentenceGaps()
      persistAll()
      cloudOn.value = true
      lastCloudError = ''
      cloudError.value = ''
      try {
        await flushPending()
      } catch (error) {
        console.warn(error)
      }
    } catch (error) {
      cloudOn.value = false
      if (queueSentenceGaps()) persistAll()
      if (!hadCatalogAtBoot && !downloadToastShown) {
        downloadToastShown = true
        reportCloudError(error)
        toast('Kelimeler indirilemedi')
      }
    }
  })()
  try {
    return await refreshFlight
  } finally {
    refreshFlight = null
  }
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

function appendEvent(word, mode, ok) {
  const event = {
    wordId: word.id || '',
    mode,
    at: Date.now(),
  }
  if (typeof ok === 'boolean') event.ok = ok
  if (!Array.isArray(state.events)) state.events = []
  state.events.push(event)
  persistProgress()
}

export function roundPoints(value) {
  return Math.round((Number(value) || 0) * 100) / 100
}

export function formatPoints(value) {
  const n = roundPoints(value)
  if (Number.isInteger(n)) return String(n)
  return n.toFixed(2).replace(/0+$/, '').replace(/\.$/, '')
}

export function buzz() {
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      navigator.vibrate(200)
    }
  } catch {
    /* titreşim yoksa oyun devam eder */
  }
}

export function mark(word, ok, mode) {
  if (ok) {
    word.s = Math.min(5, roundPoints(word.s + 1))
    state.st = roundPoints(state.st + 1)
    if (word.s >= 5 && !word.L) {
      word.L = 1
      word.learnedAt = Date.now()
      toast(`🎓 Öğrenildi: ${word.t}`)
    }
  } else {
    word.s = Math.max(-3, roundPoints(word.s - 1))
  }
  remember(word)
  save()
  if (mode) appendEvent(word, mode, ok)
}

export function awardQuiz(word, points) {
  const gain = roundPoints(points)
  if (gain > 0) {
    word.s = Math.min(5, roundPoints((Number(word.s) || 0) + gain))
    state.st = roundPoints((Number(state.st) || 0) + gain)
    if (word.s >= 5 && !word.L) {
      word.L = 1
      word.learnedAt = Date.now()
      toast(`🎓 Öğrenildi: ${word.t}`)
    }
  }
  remember(word)
  save()
  appendEvent(word, 'quiz', gain === 1)
}

export function save() {
  persistProgress()
}

export async function addCatalogWord(fields) {
  const entry = presentWord({
    id: wordDocId(fields.t),
    t: fields.t,
    e: fields.e,
    p: '',
    c: fields.c || '',
    ce: fields.ce || '',
  })
  const word = viewWord(entry)
  word.s = 0
  word.L = 0
  word.learnedAt = null
  scores[word.id] = { s: 0, L: 0, learnedAt: null }
  state.w.unshift(word)
  queueUpsert(word)
  if (catalogSource === 'bundle') catalogSource = 'device'
  persistAll()
  try {
    const flushed = await flushPending()
    return flushed && !pending.some((op) => op.id === word.id)
  } catch {
    return false
  }
}

export async function removeCatalogWord(word) {
  const index = state.w.indexOf(word)
  if (index >= 0) state.w.splice(index, 1)
  if (word?.id) queueDelete(word.id)
  if (catalogSource === 'bundle') catalogSource = 'device'
  persistAll()
  try {
    await flushPending()
  } catch {
    /* silme kuyrukta durur, kelime cihazda kalkmış kalır */
  }
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

if (typeof window !== 'undefined') {
  void refreshCatalog()
  window.addEventListener('online', () => {
    void refreshCatalog()
  })
  window.addEventListener('pagehide', () => {
    void flushPending()
  })
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') void flushPending()
  })
  if (import.meta.env?.DEV) {
    window.__kmCloud = {
      status() {
        return {
          on: cloudOn.value,
          seeded: seedRan,
          error: lastCloudError,
          words: state.w.length,
          events: (state.events || []).length,
          stars: state.st,
          pending: pending.length,
          cached: hasCatalogCache,
          source: catalogSource,
        }
      },
    }
  }
}
