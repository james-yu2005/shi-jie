'use client'

// ---------------------------------------------------------------------------
// Placeholder dictionary — replace with a real dictionary lookup later
// ---------------------------------------------------------------------------
const DICT: Record<string, { pinyin: string; english: string }> = {
  我: { pinyin: 'wǒ', english: 'I / me' },
  你: { pinyin: 'nǐ', english: 'you' },
  他: { pinyin: 'tā', english: 'he / him' },
  她: { pinyin: 'tā', english: 'she / her' },
  去: { pinyin: 'qù', english: 'to go' },
  来: { pinyin: 'lái', english: 'to come' },
  吃: { pinyin: 'chī', english: 'to eat' },
  喝: { pinyin: 'hē', english: 'to drink' },
  在: { pinyin: 'zài', english: 'at / in (location)' },
  是: { pinyin: 'shì', english: 'to be' },
  有: { pinyin: 'yǒu', english: 'to have' },
  和: { pinyin: 'hé', english: 'and' },
  的: { pinyin: 'de', english: 'particle (possessive)' },
  了: { pinyin: 'le', english: 'particle (completed action)' },
  很: { pinyin: 'hěn', english: 'very' },
  大: { pinyin: 'dà', english: 'big / large' },
  小: { pinyin: 'xiǎo', english: 'small / little' },
  好: { pinyin: 'hǎo', english: 'good / well' },
  不: { pinyin: 'bù', english: 'not / no' },
  人: { pinyin: 'rén', english: 'person / people' },
  们: { pinyin: 'men', english: 'plural marker' },
  这: { pinyin: 'zhè', english: 'this' },
  那: { pinyin: 'nà', english: 'that' },
  成都: { pinyin: 'Chéngdū', english: 'Chengdu (city)' },
  北京: { pinyin: 'Běijīng', english: 'Beijing (capital)' },
  上海: { pinyin: 'Shànghǎi', english: 'Shanghai (city)' },
  火锅: { pinyin: 'huǒguō', english: 'hot pot' },
  茶: { pinyin: 'chá', english: 'tea' },
  饺子: { pinyin: 'jiǎozi', english: 'dumplings' },
  朋友: { pinyin: 'péngyǒu', english: 'friend(s)' },
  一起: { pinyin: 'yīqǐ', english: 'together' },
  公园: { pinyin: 'gōngyuán', english: 'park' },
  市场: { pinyin: 'shìchǎng', english: 'market' },
  太极拳: { pinyin: 'tàijíquán', english: 'Tai Chi' },
}

const PUNCTUATION_RE = /^[，。！？、；：""''（）【】…—～\s]+$/

interface Props {
  word: string
}

export default function WordChunk({ word }: Props) {
  if (PUNCTUATION_RE.test(word)) {
    return <span className="text-slate-300 select-none">{word}</span>
  }

  const entry = DICT[word]
  const pinyin = entry?.pinyin ?? '—'
  const english = entry?.english ?? 'hover a word to see its definition'

  return (
    <span className="relative group inline-block cursor-pointer select-none">
      {/* Word with dashed underline */}
      <span className="px-0.5 rounded border-b-2 border-dashed border-emerald-400 group-hover:bg-emerald-50 group-hover:border-emerald-500 transition-colors duration-100 text-slate-800">
        {word}
      </span>

      {/* Tooltip */}
      <span
        className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50
                   opacity-0 group-hover:opacity-100 transition-opacity duration-150"
        role="tooltip"
      >
        <span className="flex flex-col items-center drop-shadow-lg">
          <span className="bg-slate-800 text-white text-xs rounded-xl px-3 py-2 whitespace-nowrap min-w-[80px] text-center">
            <span className="block text-emerald-300 font-semibold tracking-wide">
              {pinyin}
            </span>
            <span className="block text-slate-300 mt-0.5">{english}</span>
          </span>
          {/* Caret */}
          <span className="w-2.5 h-2.5 bg-slate-800 rotate-45 rounded-sm -mt-1.5" />
        </span>
      </span>
    </span>
  )
}
