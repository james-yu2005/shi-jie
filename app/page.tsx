'use client'

import { useState, useTransition } from 'react'
import { generateChallenge, gradeSubmission } from './actions'
import WordChunk from './components/WordChunk'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ChallengeData {
  scenario: string
  imageBase64: string
  referenceSentence: string
  segmentedWords: string[]
}

interface GradeData {
  score: number
  explanation: string
  grammar_fixes: string
  natural_version: string
}

// ---------------------------------------------------------------------------
// Score circle SVG
// ---------------------------------------------------------------------------

function ScoreCircle({ score }: { score: number }) {
  const r = 40
  const circ = 2 * Math.PI * r
  const offset = circ - (score / 100) * circ
  const color = score >= 75 ? '#22c55e' : score >= 50 ? '#f59e0b' : '#ef4444'
  return (
    <div className="relative w-28 h-28 flex items-center justify-center shrink-0">
      <svg className="absolute inset-0" width="112" height="112" viewBox="0 0 112 112">
        <circle cx="56" cy="56" r={r} fill="none" stroke="#e5e7eb" strokeWidth="8" />
        <circle
          cx="56" cy="56" r={r}
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform="rotate(-90 56 56)"
        />
      </svg>
      <span className="text-3xl font-bold relative z-10" style={{ color }}>{score}</span>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function Home() {
  const [phase, setPhase] = useState<
    'idle' | 'loading' | 'challenge' | 'grading' | 'results'
  >('idle')
  const [challenge, setChallenge] = useState<ChallengeData | null>(null)
  const [grades, setGrades] = useState<GradeData | null>(null)
  const [userText, setUserText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  // -------------------------------------------------------------------------
  // Handlers
  // -------------------------------------------------------------------------

  const handleStart = () => {
    setError(null)
    setUserText('')
    setGrades(null)
    setChallenge(null)
    setPhase('loading')

    startTransition(async () => {
      const result = await generateChallenge()
      if (!result.success) {
        setError(result.error)
        setPhase('idle')
        return
      }
      setChallenge({
        scenario: result.scenario,
        imageBase64: result.imageBase64,
        referenceSentence: result.referenceSentence,
        segmentedWords: result.segmentedWords,
      })
      setPhase('challenge')
    })
  }

  const handleSubmit = () => {
    if (!challenge || !userText.trim()) return
    setError(null)
    setPhase('grading')

    startTransition(async () => {
      const result = await gradeSubmission(userText, challenge.scenario)
      if (!result.success) {
        setError(result.error)
        setPhase('challenge')
        return
      }
      setGrades({
        score: result.score,
        explanation: result.explanation,
        grammar_fixes: result.grammar_fixes,
        natural_version: result.natural_version,
      })
      setPhase('results')
    })
  }

  // -------------------------------------------------------------------------
  // Render helpers
  // -------------------------------------------------------------------------

  const scoreLabel = (s: number) => {
    if (s >= 80) return '🏆 Excellent!'
    if (s >= 60) return '👍 Good Job!'
    if (s >= 40) return '💪 Keep Practising!'
    return '📚 Room to Improve'
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-emerald-50/40 font-sans">

      {/* ------------------------------------------------------------------ */}
      {/* Sticky header                                                        */}
      {/* ------------------------------------------------------------------ */}
      <header className="sticky top-0 z-30 border-b border-slate-100 bg-white/80 backdrop-blur-md">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-400 to-green-600 flex items-center justify-center text-white font-bold text-base shadow-sm">
              世
            </div>
            <div>
              <span className="font-bold text-lg text-slate-800 leading-none">ShìJiè</span>
              <span className="hidden sm:block text-xs text-slate-400 leading-none mt-0.5">
                描述世界，学习中文
              </span>
            </div>
          </div>
          {phase !== 'idle' && (
            <button
              onClick={handleStart}
              disabled={phase === 'loading' || phase === 'grading'}
              className="text-sm font-medium text-slate-500 hover:text-emerald-600 px-3 py-1.5 rounded-lg hover:bg-emerald-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              ↺ New challenge
            </button>
          )}
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">

        {/* ---------------------------------------------------------------- */}
        {/* Error banner                                                       */}
        {/* ---------------------------------------------------------------- */}
        {error && (
          <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-sm">
            <span className="text-base mt-0.5">⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {/* ================================================================ */}
        {/* IDLE                                                               */}
        {/* ================================================================ */}
        {phase === 'idle' && (
          <div className="flex flex-col items-center justify-center min-h-[65vh] text-center gap-10 py-8">
            <div className="space-y-4">
              <div className="text-7xl">🌏</div>
              <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-800 tracking-tight">
                Describe the World
              </h1>
              <p className="text-lg text-slate-500 max-w-sm mx-auto leading-relaxed">
                You&apos;ll be shown a <strong className="text-slate-700">real-life scene</strong> from China. Write your best Chinese description — then get instant AI feedback.
              </p>
            </div>

            <button
              onClick={handleStart}
              className="group px-12 py-4 bg-gradient-to-r from-emerald-500 to-green-600 text-white text-xl font-bold rounded-full shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all duration-200"
            >
              Start Challenge
              <span className="inline-block ml-2 group-hover:translate-x-1 transition-transform">→</span>
            </button>

            <div className="flex flex-wrap justify-center gap-6 text-sm text-slate-400">
              <span className="flex items-center gap-1.5">🎨 <span>AI-generated scenes</span></span>
              <span className="flex items-center gap-1.5">🤖 <span>Instant grading</span></span>
              <span className="flex items-center gap-1.5">📖 <span>Native speaker tips</span></span>
            </div>
          </div>
        )}

        {/* ================================================================ */}
        {/* LOADING                                                            */}
        {/* ================================================================ */}
        {phase === 'loading' && (
          <div className="flex flex-col items-center justify-center min-h-[65vh] gap-6">
            <div className="relative w-20 h-20">
              <div className="absolute inset-0 rounded-full border-4 border-emerald-100" />
              <div className="absolute inset-0 rounded-full border-4 border-emerald-500 border-t-transparent animate-spin" />
            </div>
            <div className="text-center space-y-1">
              <p className="text-xl font-semibold text-slate-700">Generating your challenge…</p>
              <p className="text-sm text-slate-400">Creating image with DALL-E 3 &amp; reference sentence with Qwen 2.5</p>
            </div>
          </div>
        )}

        {/* ================================================================ */}
        {/* CHALLENGE + GRADING (shared layout)                               */}
        {/* ================================================================ */}
        {(phase === 'challenge' || phase === 'grading') && challenge && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* Image panel */}
            <div className="rounded-2xl overflow-hidden shadow-md bg-white ring-1 ring-slate-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`data:image/png;base64,${challenge.imageBase64}`}
                alt="Challenge scene"
                className="w-full aspect-square object-cover"
              />
            </div>

            {/* Input panel */}
            <div className="bg-white rounded-2xl shadow-md ring-1 ring-slate-100 p-6 flex flex-col gap-4">
              <div>
                <h2 className="text-lg font-bold text-slate-800">Describe this scene</h2>
                <p className="text-sm text-slate-400 mt-1">
                  用中文描述这张图片里发生的事情。写越多越好！
                </p>
              </div>

              <textarea
                value={userText}
                onChange={(e) => setUserText(e.target.value)}
                placeholder="在这里写你的中文描述…"
                disabled={phase === 'grading'}
                className="flex-1 min-h-[200px] p-4 rounded-xl border border-slate-200 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 outline-none resize-none text-lg text-slate-800 placeholder:text-slate-300 disabled:bg-slate-50 disabled:text-slate-400 transition-all leading-relaxed"
              />

              <div className="flex items-center justify-between pt-1">
                <span className="text-xs text-slate-400">{userText.length} characters</span>
                <button
                  onClick={handleSubmit}
                  disabled={!userText.trim() || phase === 'grading'}
                  className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-emerald-500 to-green-600 text-white font-bold rounded-full shadow-md hover:shadow-lg hover:scale-105 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100 transition-all"
                >
                  {phase === 'grading' ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Grading…
                    </>
                  ) : (
                    'Submit →'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ================================================================ */}
        {/* RESULTS                                                            */}
        {/* ================================================================ */}
        {phase === 'results' && challenge && grades && (
          <div className="space-y-6">

            {/* Top row: image + score card */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

              {/* Image with caption */}
              <div className="rounded-2xl overflow-hidden shadow-md bg-white ring-1 ring-slate-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`data:image/png;base64,${challenge.imageBase64}`}
                  alt="Challenge scene"
                  className="w-full aspect-square object-cover"
                />
                <p className="px-4 py-2 text-xs text-slate-400 italic text-center">
                  {challenge.scenario}
                </p>
              </div>

              {/* Score + feedback cards stacked */}
              <div className="flex flex-col gap-4">

                {/* Score */}
                <div className="bg-white rounded-2xl shadow-md ring-1 ring-slate-100 p-5 flex items-center gap-5">
                  <ScoreCircle score={grades.score} />
                  <div className="min-w-0">
                    <p className="text-xl font-bold text-slate-800 mb-1">{scoreLabel(grades.score)}</p>
                    <p className="text-sm text-slate-500 leading-relaxed">{grades.explanation}</p>
                  </div>
                </div>

                {/* Grammar fixes */}
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 shadow-sm">
                  <h3 className="flex items-center gap-2 font-semibold text-amber-800 mb-2 text-sm">
                    <span>✏️</span> Grammar &amp; Vocabulary Fixes
                  </h3>
                  <p className="text-sm text-amber-700 leading-relaxed">{grades.grammar_fixes}</p>
                </div>

                {/* Native version */}
                <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5 shadow-sm">
                  <h3 className="flex items-center gap-2 font-semibold text-blue-800 mb-2 text-sm">
                    <span>💬</span> How a native speaker would say it
                  </h3>
                  <p className="text-xl text-blue-900 font-medium leading-relaxed">
                    {grades.natural_version}
                  </p>
                </div>
              </div>
            </div>

            {/* Interactive reference sentence */}
            <div className="bg-white rounded-2xl shadow-md ring-1 ring-emerald-100 p-6">
              <h3 className="flex items-center gap-2 font-bold text-slate-700 mb-1">
                <span>📖</span> Master Reference Sentence
              </h3>
              <p className="text-xs text-slate-400 mb-5">
                Hover over each word to see its pinyin and English meaning.
              </p>
              <div className="text-2xl leading-[3rem] flex flex-wrap gap-x-0.5 items-baseline">
                {challenge.segmentedWords.map((word, i) => (
                  <WordChunk key={i} word={word} />
                ))}
              </div>
              <p className="mt-4 text-xs text-slate-300 italic">
                Pinyin &amp; definitions: connected to placeholder data — full dictionary coming soon.
              </p>
            </div>

            {/* Try again */}
            <div className="flex justify-center pb-4">
              <button
                onClick={handleStart}
                className="group px-12 py-4 bg-gradient-to-r from-emerald-500 to-green-600 text-white text-lg font-bold rounded-full shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all duration-200"
              >
                Next Challenge
                <span className="inline-block ml-2 group-hover:translate-x-1 transition-transform">→</span>
              </button>
            </div>
          </div>
        )}

      </main>
    </div>
  )
}


