const ANSWER_MODES = new Set(['quiz', 'write', 'drag', 'fill'])
const MODE_LABELS = [
  ['quiz', 'Quiz'],
  ['write', 'Yazarak'],
  ['drag', 'Sürükle-bırak'],
  ['fill', 'Cümle'],
]

function eventTime(event) {
  return Number(event.clientAt) || Number(event.at) || 0
}

function startOfDay(ms) {
  const date = new Date(ms)
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
}

function shiftDay(stamp, days) {
  const date = new Date(stamp)
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days).getTime()
}

function isAnswer(event) {
  return ANSWER_MODES.has(event.mode) && typeof event.ok === 'boolean'
}

export function buildStats(words, events, stars = 0, now = Date.now()) {
  const list = Array.isArray(words) ? words : []
  const cutoff = now - 90 * 24 * 60 * 60 * 1000
  const history = (Array.isArray(events) ? events : []).filter((event) => eventTime(event) >= cutoff)
  const answers = history.filter(isAnswer)
  const attempted = new Set(answers.map((event) => event.wordId))
  const today = startOfDay(now)
  const weekStart = shiftDay(today, -6)

  const learnedWords = list.filter((word) => word.L)
  const learning = list.filter((word) => !word.L && word.s > 0).length
  const negative = list.filter((word) => !word.L && word.s < 0).length
  const untouched = list.filter((word) => !word.L && !word.s && !attempted.has(word.id)).length

  const correct = answers.filter((event) => event.ok).length
  const todayAnswers = answers.filter((event) => eventTime(event) >= today)
  const todayCorrect = todayAnswers.filter((event) => event.ok).length
  const todayLearned = learnedWords.filter((word) => word.learnedAt && word.learnedAt >= today).length

  const answerDays = new Set(answers.map((event) => startOfDay(eventTime(event))))
  const yesterday = shiftDay(today, -1)
  let cursor = answerDays.has(today) ? today : answerDays.has(yesterday) ? yesterday : 0
  let streak = 0
  while (cursor && answerDays.has(cursor)) {
    streak += 1
    cursor = shiftDay(cursor, -1)
  }

  const days = []
  for (let index = 6; index >= 0; index -= 1) {
    const stamp = shiftDay(today, -index)
    const count = learnedWords.filter((word) => word.learnedAt && startOfDay(word.learnedAt) === stamp).length
    days.push({
      key: stamp,
      label: new Date(stamp).toLocaleDateString('tr-TR', { weekday: 'short' }),
      count,
    })
  }
  const peak = Math.max(1, ...days.map((day) => day.count))
  days.forEach((day) => {
    day.height = `${Math.round((day.count / peak) * 100)}%`
  })

  const learnedIn7 = learnedWords.filter((word) => word.learnedAt && word.learnedAt >= weekStart).length
  const learnedDays = new Set(
    learnedWords.filter((word) => word.learnedAt).map((word) => startOfDay(word.learnedAt)),
  )
  const daysWithData = [...new Set([...answerDays, ...learnedDays])].filter(
    (stamp) => stamp >= weekStart && stamp <= today,
  ).length
  const speedReady = daysWithData >= 2
  const rate = learnedIn7 / 7
  const remaining = list.length - learnedWords.length
  const rateText = rate.toLocaleString('tr-TR', { maximumFractionDigits: 1 })

  const hardest = list
    .filter((word) => word.L || word.s || attempted.has(word.id))
    .slice()
    .sort((a, b) => (a.s || 0) - (b.s || 0) || a.t.localeCompare(b.t, 'tr'))
    .slice(0, 5)
    .map((word) => ({
      id: word.id || word.t,
      label: `${word.t} = ${word.e}`,
      score: word.s || 0,
    }))

  const recent = learnedWords
    .filter((word) => word.learnedAt)
    .slice()
    .sort((a, b) => b.learnedAt - a.learnedAt)
    .slice(0, 5)
    .map((word) => ({
      id: word.id || word.t,
      label: `${word.t} = ${word.e}`,
      when: new Date(word.learnedAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' }),
    }))

  return {
    total: list.length,
    learned: learnedWords.length,
    learning,
    untouched,
    negative,
    stars,
    hasHistory: history.length > 0,
    accuracyText: answers.length ? `${Math.round((correct / answers.length) * 100)}% · ${correct} doğru / ${answers.length} soru` : '',
    todayQuestions: todayAnswers.length,
    todayLearned,
    todayAccuracy: todayAnswers.length ? `${Math.round((todayCorrect / todayAnswers.length) * 100)}%` : '—',
    speedReady,
    speedText: speedReady
      ? `Son 7 günde ${learnedIn7} kelime öğrenildi · günde ${rateText} kelime`
      : 'Öğrenme hızı daha fazla çalışınca görünecek',
    days,
    streak,
    modes: MODE_LABELS.map(([mode, label]) => {
      const rows = answers.filter((event) => event.mode === mode)
      return {
        key: mode,
        label,
        ok: rows.filter((event) => event.ok).length,
        bad: rows.filter((event) => !event.ok).length,
      }
    }),
    hardest,
    recent,
    tempo: speedReady && rate > 0 && remaining > 0 ? `Bu hızla kalan kelimeler yaklaşık ${Math.ceil(remaining / rate)} gün` : '',
    cards: history.filter((event) => event.mode === 'cards').length,
  }
}
