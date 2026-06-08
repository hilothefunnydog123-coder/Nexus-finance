import { NextRequest, NextResponse } from 'next/server'
import { rateLimit } from '@/lib/ratelimit'

const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent'

// Server-only. The browser never receives the flaws or the answer key.
const CHALLENGES: Record<string, { brief: string; original: string; knownFlaws: string[]; ideal: string }> = {
  essay: {
    brief: "This AI wrote a paragraph for a school essay. It looks fine — but it has hidden problems that would get you in trouble. Find them and rewrite it so it's actually trustworthy.",
    original:
      "Social media is extremely harmful to teenagers. In fact, 73% of students say it ruins their grades, which proves it's dangerous. Everyone agrees that social media is bad because it is harmful to young people. That is why it should clearly be limited for all teens.",
    knownFlaws: [
      'The "73% of students" statistic is fabricated / has no source — inventing or citing unverifiable numbers is the main flaw.',
      'Circular reasoning: it claims social media is bad because it is harmful, which proves nothing.',
      'Unsupported absolute claim ("everyone agrees") that should be removed or backed with real evidence.',
    ],
    ideal:
      'A strong fix removes or properly sources the fake stat, replaces the circular logic with a real reason or evidence, drops the "everyone agrees" absolute, and stays clear and concise.',
  },
  email: {
    brief:
      "You need to ask your teacher for a 2-day extension on an assignment. The AI wrote this email. Fix it so it actually gets a yes — clear, specific, and human.",
    original:
      "Dear Esteemed Educator, I am writing to humbly express my sincere hope that you might find it within your considerable generosity to perhaps consider the possibility of allowing some additional time for the completion of the assigned work, as certain circumstances have arisen. I deeply appreciate your boundless understanding in this matter. Yours most respectfully.",
    knownFlaws: [
      'It buries the actual ask under generic filler — the main point (the extension) is unclear.',
      'Over-formal, robotic, AI-sounding tone that does not fit a quick note to a teacher.',
      'It proposes no specific new date, leaving the teacher to do the work.',
    ],
    ideal:
      'A strong fix leads with the clear ask, proposes a specific new date, cuts the filler, gives a brief honest reason, and sounds like a real person.',
  },
  summary: {
    brief:
      "The AI wrote a quick summary for a science presentation. One 'fact' in here is actually false — a famous myth. Catch it, fix it, and tighten the summary.",
    original:
      "The Great Wall of China is one of the most impressive structures ever built over many centuries. It is the only man-made object visible from space with the naked eye, which shows how enormous it is. Honestly, summaries like this are always fun to write. It remains a major landmark today.",
    knownFlaws: [
      'False claim presented as fact: the Great Wall is NOT the only man-made object visible from space with the naked eye — this is a well-known myth.',
      'Overconfident tone stating the myth as settled truth with no doubt.',
      'Irrelevant filler sentence ("summaries like this are always fun to write") that does not belong in a tight summary.',
    ],
    ideal:
      'A strong fix catches and corrects the false "visible from space" claim, removes the filler line, and keeps the summary accurate and tight.',
  },
}

interface GradeResult {
  score: number
  verdict: string
  flaws: { flaw: string; caught: boolean }[]
  nailed: string
  missed: string
  tip: string
}

function extractJson(text: string): Record<string, unknown> | null {
  const cleaned = text.replace(/```json/gi, '').replace(/```/g, '').trim()
  const start = cleaned.indexOf('{')
  const end = cleaned.lastIndexOf('}')
  if (start === -1 || end === -1) return null
  try {
    return JSON.parse(cleaned.slice(start, end + 1)) as Record<string, unknown>
  } catch {
    return null
  }
}

async function callGemini(prompt: string, tokens = 1024): Promise<string> {
  const key = process.env.GEMINI_API_KEY
  if (!key) return ''
  const res = await fetch(`${GEMINI_URL}?key=${key}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      // gemini-2.5-flash is a thinking model; disable thinking so output tokens go to the JSON, not internal reasoning.
      generationConfig: { maxOutputTokens: tokens, temperature: 0.2, thinkingConfig: { thinkingBudget: 0 } },
    }),
  })
  if (!res.ok) return ''
  const json = await res.json()
  return json.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? ''
}

export async function POST(req: NextRequest) {
  const rl = rateLimit(req, { limit: 15, windowMs: 60000, tag: 'judgemynt' })
  if (!rl.ok)
    return NextResponse.json(
      { error: 'Too many submissions — wait a moment.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } }
    )

  const { challengeId, submission } = await req.json()
  const challenge = CHALLENGES[challengeId]
  if (!challenge) return NextResponse.json({ error: 'Unknown challenge.' }, { status: 400 })
  if (!submission || typeof submission !== 'string' || submission.trim().length < 5)
    return NextResponse.json({ error: 'Write your improved version first.' }, { status: 400 })

  const prompt = `You are the grader for Judgemynt, a platform that scores a person's JUDGMENT in the age of AI. You are NOT grading their writing for style or polish. You are grading whether they could spot what was wrong with a flawed piece of AI output and fix it well.

THE TASK THE PERSON WAS GIVEN:
"${challenge.brief}"

THE FLAWED AI OUTPUT THEY HAD TO FIX:
"""${challenge.original}"""

THE HIDDEN FLAWS (answer key — the person could NOT see this):
${challenge.knownFlaws.map((f, i) => `${i + 1}. ${f}`).join('\n')}
What an excellent fix looks like: ${challenge.ideal}

THE PERSON'S SUBMISSION:
"""${submission}"""

Grade them. For EACH hidden flaw, decide whether their submission actually caught and fixed it. Reward catching the flaws far more than nice wording. Someone who left the fake stat, the false fact, or the buried ask in place should score LOW no matter how polished their text reads. Someone who caught the real problems should score HIGH even if their prose is plain.

Return ONLY valid raw JSON, no markdown, no backticks:
{
  "score": <integer 0-100>,
  "verdict": "<punchy 3-5 word verdict, e.g. 'Sharp eye for fakes'>",
  "flaws": [ { "flaw": "<short name of the flaw, 6 words max>", "caught": <true|false> } ],
  "nailed": "<one sentence on what they did genuinely well, or empty string if nothing>",
  "missed": "<one sentence on the most important thing they missed, or empty string if nothing>",
  "tip": "<one concrete sentence to sharpen their judgment next time>"
}
The "flaws" array must have exactly ${challenge.knownFlaws.length} items, one per hidden flaw, in the same order.`

  const raw = await callGemini(prompt)
  const parsed = extractJson(raw)
  if (!parsed) return NextResponse.json({ error: 'Grader hiccup — submit again.' }, { status: 502 })

  const rawFlaws = Array.isArray(parsed.flaws) ? (parsed.flaws as Record<string, unknown>[]) : []
  const result: GradeResult = {
    score: Math.max(0, Math.min(100, Math.round(Number(parsed.score) || 0))),
    verdict: String(parsed.verdict || 'Judged'),
    flaws: rawFlaws.map((f) => ({ flaw: String(f.flaw || 'Flaw'), caught: Boolean(f.caught) })),
    nailed: String(parsed.nailed || ''),
    missed: String(parsed.missed || ''),
    tip: String(parsed.tip || ''),
  }

  return NextResponse.json(result)
}
