'use server'

import OpenAI from 'openai'
import { Jieba } from '@node-rs/jieba'
import { dict } from '@node-rs/jieba/dict'

// Initialise jieba once per server process (expensive native load)
const jieba = new Jieba()
jieba.loadDict(dict)

// ---------------------------------------------------------------------------
// Scenarios
// ---------------------------------------------------------------------------

const SCENARIOS = [
  'Eating spicy hotpot at a crowded restaurant in Chengdu',
  'Shopping at a bustling night market in Taipei',
  'Practicing tai chi in a Beijing park at dawn',
  'Drinking tea at a traditional teahouse in Hangzhou',
  'Hiking on the Great Wall near Beijing at sunrise',
  'Watching a live kung fu performance at Shaolin Temple',
  'Eating Peking duck at a famous old restaurant in Beijing',
  'Taking a high-speed train through the Chinese countryside',
  'Visiting a giant panda breeding base in Chengdu',
  'Walking across the glass-floor bridge at Zhangjiajie',
  'Bargaining for silk scarves at a Beijing market stall',
  'Eating xiaolongbao soup dumplings in a Shanghai noodle shop',
  'Cycling along the Li River in Guilin at sunset',
  'Watching a traditional dragon boat race at a festival',
  'Learning to make jiaozi dumplings in a cooking class',
  'Strolling through the Forbidden City on a sunny afternoon',
  'Watching the sunrise over the Yellow Mountains (Huangshan)',
  'Eating street food skewers at a Chengdu night market',
  'Taking photos of the neon-lit Bund waterfront in Shanghai at night',
  'Exploring a narrow hutong alleyway in old Beijing',
]

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

// ---------------------------------------------------------------------------
// Ollama helper
// ---------------------------------------------------------------------------

async function callOllama(
  messages: { role: string; content: string }[],
): Promise<string> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 120_000)

  try {
    const res = await fetch('http://localhost:11434/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'qwen2.5-coder:latest',
        messages,
        stream: false,
        options: { temperature: 0.7 },
      }),
      signal: controller.signal,
    })

    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(`Ollama returned HTTP ${res.status}: ${text.slice(0, 200)}`)
    }

    const data = await res.json()
    return data.message?.content ?? ''
  } finally {
    clearTimeout(timeoutId)
  }
}

// ---------------------------------------------------------------------------
// Types exported for the client
// ---------------------------------------------------------------------------

export type ChallengeResult =
  | {
      success: true
      scenario: string
      imageBase64: string
      referenceSentence: string
      segmentedWords: string[]
    }
  | { success: false; error: string }

export type GradeResult =
  | {
      success: true
      score: number
      explanation: string
      grammar_fixes: string
      natural_version: string
    }
  | { success: false; error: string }

// ---------------------------------------------------------------------------
// Server Actions
// ---------------------------------------------------------------------------

export async function generateChallenge(): Promise<ChallengeResult> {
  const scenario = pickRandom(SCENARIOS)

  // --- DALL-E 3 image ---
  let imageBase64: string
  try {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not set in environment variables.')
    }
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    const imageRes = await openai.images.generate({
      model: 'dall-e-3',
      prompt: `A photorealistic, vibrant scene of: ${scenario}. High quality, natural lighting, cinematic composition.`,
      size: '1024x1024',
      response_format: 'b64_json',
    })
    imageBase64 = imageRes.data?.[0]?.b64_json ?? ''
    if (!imageBase64) throw new Error('DALL-E 3 returned no image data.')
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return { success: false, error: `Image generation failed: ${msg}` }
  }

  // --- Ollama reference sentence ---
  let referenceSentence: string
  try {
    referenceSentence = (
      await callOllama([
        {
          role: 'system',
          content:
            '你是一位经验丰富的中文写作专家。请用自然流畅的简体中文写一句描述性句子。只返回中文句子本身，不要任何其他内容、标点符号之外的字符或解释。',
        },
        {
          role: 'user',
          content: `请用一句自然的中文描述这个场景：${scenario}`,
        },
      ])
    ).trim()
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    if (msg.toLowerCase().includes('abort') || msg.includes('ECONNREFUSED') || msg.includes('fetch')) {
      return {
        success: false,
        error:
          'Cannot connect to Ollama. Make sure it is running: ollama serve (port 11434)',
      }
    }
    return { success: false, error: `Ollama error: ${msg}` }
  }

  // --- Segment with jieba ---
  const segmentedWords = jieba.cut(referenceSentence, false)

  return {
    success: true,
    scenario,
    imageBase64,
    referenceSentence,
    segmentedWords,
  }
}

export async function gradeSubmission(
  userText: string,
  scenario: string,
): Promise<GradeResult> {
  const trimmed = userText.trim()
  if (!trimmed) {
    return { success: false, error: 'Please write something before submitting.' }
  }

  try {
    const raw = await callOllama([
      {
        role: 'system',
        content:
          'You are a professional Chinese language teacher. Evaluate the student\'s Chinese writing and return ONLY a valid JSON object — no markdown fences, no explanations, no extra text whatsoever.',
      },
      {
        role: 'user',
        content: `Scene (English): ${scenario}
Student's Chinese text: ${trimmed}

Return ONLY this JSON (integers, no markdown):
{
  "score": <integer 0-100>,
  "explanation": "<English: what was good and what needs improvement, 2-3 sentences>",
  "grammar_fixes": "<English: specific grammar or vocabulary corrections; write 'No errors found' if perfect>",
  "natural_version": "<Simplified Chinese: how a native speaker would naturally express this scene>"
}`,
      },
    ])

    // Strip markdown code fences if the model added them anyway
    const cleaned = raw
      .replace(/```json\s*/gi, '')
      .replace(/```\s*/g, '')
      .trim()

    const jsonMatch = cleaned.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error(
        `Model did not return valid JSON. Response preview: ${raw.slice(0, 300)}`,
      )
    }

    const parsed = JSON.parse(jsonMatch[0])

    return {
      success: true,
      score: Math.min(100, Math.max(0, Math.round(Number(parsed.score) || 0))),
      explanation: String(parsed.explanation ?? ''),
      grammar_fixes: String(parsed.grammar_fixes ?? ''),
      natural_version: String(parsed.natural_version ?? ''),
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    if (msg.toLowerCase().includes('abort') || msg.includes('ECONNREFUSED')) {
      return {
        success: false,
        error: 'Ollama is offline or timed out. Please ensure it is running.',
      }
    }
    return { success: false, error: `Grading failed: ${msg}` }
  }
}
