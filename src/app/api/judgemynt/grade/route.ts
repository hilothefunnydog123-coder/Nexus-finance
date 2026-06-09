import { NextRequest, NextResponse } from 'next/server'
import { rateLimit } from '@/lib/ratelimit'

const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent'

// Server-only. The browser never receives the flaws or the answer key.
const CHALLENGES: Record<
  string,
  { level: number; brief: string; original: string; knownFlaws: string[]; ideal: string }
> = {
  // ---- LEVEL 1 · DETECTION (catch what's wrong) ----
  essay: {
    level: 1,
    brief:
      "This AI wrote a paragraph for a school essay. It looks fine, but it has hidden problems that would get you in trouble. Find them and rewrite it so it's actually trustworthy.",
    original:
      "Social media is extremely harmful to teenagers. In fact, 73% of students say it ruins their grades, which proves it's dangerous. Everyone agrees that social media is bad because it is harmful to young people. That is why it should clearly be limited for all teens.",
    knownFlaws: [
      'The "73% of students" statistic is fabricated / has no source — inventing or citing unverifiable numbers is the main flaw.',
      'Circular reasoning: it claims social media is bad because it is harmful, which proves nothing.',
      'Unsupported absolute claim ("everyone agrees") that should be removed or backed with real evidence.',
    ],
    ideal:
      'A strong fix removes or sources the fake stat, replaces the circular logic with a real reason, drops the "everyone agrees" absolute, and stays clear and concise.',
  },
  summary: {
    level: 1,
    brief:
      "The AI wrote a quick summary for a science presentation. One 'fact' in here is actually false — a famous myth. Catch it, fix it, and tighten the summary.",
    original:
      'The Great Wall of China is one of the most impressive structures ever built over many centuries. It is the only man-made object visible from space with the naked eye, which shows how enormous it is. Honestly, summaries like this are always fun to write. It remains a major landmark today.',
    knownFlaws: [
      'False claim stated as fact: the Great Wall is NOT the only man-made object visible from space with the naked eye — this is a well-known myth.',
      'Overconfident tone presenting the myth as settled truth.',
      'Irrelevant filler ("summaries like this are always fun to write") that does not belong in a tight summary.',
    ],
    ideal:
      'A strong fix catches and corrects the false "visible from space" claim, removes the filler, and keeps the summary accurate and tight.',
  },
  news: {
    level: 1,
    brief:
      "This AI 'news summary' is supposed to be neutral. It isn't — it slips opinion in as fact and frames things unfairly. Catch what's wrong and rewrite it as a fair, factual summary.",
    original:
      "The city council's reckless new budget shamelessly slashed funding for parks, proving once again that the council doesn't care about families. Officials claim the cuts are temporary. The plan passed 5-2.",
    knownFlaws: [
      'Editorializing — loaded words ("reckless", "shamelessly", "doesn\'t care") present opinion as fact in a supposedly neutral summary.',
      'Unsupported mind-reading conclusion ("proving the council doesn\'t care about families").',
      'Biased framing of the officials\' explanation ("claim") instead of reporting their stated reason neutrally.',
    ],
    ideal:
      'A fair rewrite reports the vote and the cut neutrally, drops the loaded language, and presents the council\'s stated reason without spin.',
  },

  // ---- LEVEL 2 · CORRECTION (fix flawed AI work) ----
  email: {
    level: 2,
    brief:
      'You need to ask your teacher for a 2-day extension on an assignment. The AI wrote this email. Fix it so it actually gets a yes — clear, specific, and human.',
    original:
      'Dear Esteemed Educator, I am writing to humbly express my sincere hope that you might find it within your considerable generosity to perhaps consider the possibility of allowing some additional time for the completion of the assigned work, as certain circumstances have arisen. I deeply appreciate your boundless understanding in this matter. Yours most respectfully.',
    knownFlaws: [
      'It buries the actual ask under generic filler — the main point (the extension) is unclear.',
      'Over-formal, robotic, AI-sounding tone that does not fit a quick note to a teacher.',
      'It proposes no specific new date, leaving the teacher to do the work.',
    ],
    ideal:
      'A strong fix leads with the clear ask, proposes a specific new date, cuts the filler, gives a brief honest reason, and sounds like a real person.',
  },
  cover: {
    level: 2,
    brief:
      "The AI wrote this line for a cover letter. It's generic filler that says nothing. Rewrite it so it's specific, honest, and actually makes someone want to hire you.",
    original:
      'I am a passionate, hardworking team player who is excited to leverage my skills and hit the ground running to bring value to your dynamic organization.',
    knownFlaws: [
      'Pure cliché filler ("passionate", "team player", "hit the ground running", "bring value") that conveys zero real information.',
      'No specifics — nothing about what the person has actually done or can do.',
      'Hollow, AI-sounding tone no real person would say out loud.',
    ],
    ideal:
      'A strong fix replaces the clichés with one concrete, specific thing the person has actually done or can do, in a real human voice.',
  },
  explain: {
    level: 2,
    brief:
      'The AI tried to explain how interest works to a beginner. It sounds smart but it is confusing — and one part is flat-out wrong. Fix it so it is clear and correct.',
    original:
      'Interest is the time-value coefficient applied to principal over compounding intervals. Simple interest grows exponentially, while compound interest grows linearly, making simple interest the more aggressive option for long-term growth.',
    knownFlaws: [
      'Factual error — it is reversed: compound interest grows exponentially, simple interest grows linearly.',
      'Jargon-heavy and confusing for a beginner ("time-value coefficient", "compounding intervals").',
      'The reversed claim makes the practical takeaway ("simple interest the more aggressive option") backwards and harmful.',
    ],
    ideal:
      'A strong fix corrects the simple/compound reversal, explains it in plain beginner language, and gives the right takeaway.',
  },

  // ---- LEVEL 3 · DIRECTION (judge & direct AI to excellent) ----
  code: {
    level: 3,
    brief:
      'The AI wrote this function to average a list of numbers. It has a subtle bug and a case it does not handle. Find both and fix the code.',
    original:
      'function average(nums) {\n  let total = 0;\n  for (let i = 1; i <= nums.length; i++) {\n    total += nums[i];\n  }\n  return total / nums.length;\n}',
    knownFlaws: [
      'Off-by-one bug: the loop runs i=1 to i<=length, skipping nums[0] and reading nums[length] (undefined). It should be i=0; i<length.',
      'No handling for an empty array — dividing by length 0 returns NaN.',
      'It silently returns wrong results (NaN from undefined) instead of a correct average.',
    ],
    ideal:
      'A correct fix loops from 0 to length-1 and guards the empty-array case (e.g., return 0 or handle it explicitly).',
  },
  prompt: {
    level: 3,
    brief:
      "Someone gave an AI a lazy prompt and got this weak result. You can't edit the result — instead, write a BETTER instruction that would get a genuinely great answer. You are graded on your direction, not your writing.",
    original:
      "PROMPT GIVEN: 'write about dogs'\nAI OUTPUT: 'Dogs are animals. They are pets. People like dogs because they are friendly and fun. There are many kinds of dogs. Dogs are good.'",
    knownFlaws: [
      'The original prompt gave no audience, purpose, format, length, or angle — so the output is generic.',
      'A strong instruction must add specifics: who it is for, what it is for, tone, length, and a clear angle.',
      'Just asking for "more detail" is not direction — good direction constrains the task toward a specific, excellent result.',
    ],
    ideal:
      'A great answer is a rewritten instruction that specifies audience, purpose, format, tone, length, and a clear angle — enough that an AI would produce something genuinely good.',
  },
  data: {
    level: 3,
    brief:
      'This AI analysis jumps to a huge conclusion from weak data. Catch the reasoning errors and rewrite the conclusion so it is honest about what the data actually shows.',
    original:
      'In our survey, 8 out of 10 people who drink coffee reported feeling productive. This proves coffee causes productivity. Therefore, companies should require all employees to drink coffee to boost performance.',
    knownFlaws: [
      'Correlation treated as causation — the data shows an association, not that coffee causes productivity.',
      'Tiny, self-selected sample (10 people) cannot support a sweeping "proves" claim.',
      'The recommendation ("require all employees to drink coffee") massively overreaches what the data supports.',
    ],
    ideal:
      'A strong fix softens "proves" to a cautious association, notes the sample and causation limits, and drops the overreaching recommendation.',
  },
}

interface GradeResult {
  score: number
  verdict: string
  dimensions: { detection: number; reasoning: number; execution: number }
  flaws: { flaw: string; caught: boolean }[]
  analysis: string
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

function clampScore(v: unknown): number {
  return Math.max(0, Math.min(100, Math.round(Number(v) || 0)))
}

async function callGemini(prompt: string, tokens = 1300): Promise<string> {
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
    return NextResponse.json({ error: 'Write your answer first.' }, { status: 400 })

  const prompt = `You are the Examiner for Judgemynt — a credentialing platform that scores a person's JUDGMENT in the age of AI. You do NOT grade writing for style or polish. You grade whether they could spot what was wrong with a flawed piece of AI output and fix it well.

THE TASK THE PERSON WAS GIVEN:
"${challenge.brief}"

THE FLAWED AI OUTPUT (or scenario) THEY WORKED ON:
"""${challenge.original}"""

THE HIDDEN FLAWS (answer key — the person could NOT see this):
${challenge.knownFlaws.map((f, i) => `${i + 1}. ${f}`).join('\n')}
What an excellent answer looks like: ${challenge.ideal}

THE PERSON'S ANSWER:
"""${submission}"""

Grade rigorously. Reward catching the real flaws far more than nice wording. Someone who left a fabricated stat, a false fact, a logic error, or a buried point in place must score LOW no matter how polished their text reads. Someone who caught the real problems should score HIGH even if their prose is plain.

Also score three judgment dimensions, each 0-100:
- "detection": how many of the real flaws they actually noticed.
- "reasoning": the quality of their judgment — did they understand WHY it was wrong, not just reword it.
- "execution": how good and correct their final fixed version is.

Return ONLY valid raw JSON, no markdown, no backticks:
{
  "score": <integer 0-100, overall>,
  "verdict": "<punchy 3-5 word verdict>",
  "dimensions": { "detection": <0-100>, "reasoning": <0-100>, "execution": <0-100> },
  "flaws": [ { "flaw": "<short name, 6 words max>", "caught": <true|false> } ],
  "analysis": "<2-3 sentence expert analysis of their judgment on this challenge>",
  "nailed": "<one sentence on what they did genuinely well, or empty string>",
  "missed": "<one sentence on the most important thing they missed, or empty string>",
  "tip": "<one concrete sentence to sharpen their judgment next time>"
}
The "flaws" array must have exactly ${challenge.knownFlaws.length} items, one per hidden flaw, in order.`

  const raw = await callGemini(prompt)
  const parsed = extractJson(raw)
  if (!parsed) return NextResponse.json({ error: 'Examiner hiccup — submit again.' }, { status: 502 })

  const rawFlaws = Array.isArray(parsed.flaws) ? (parsed.flaws as Record<string, unknown>[]) : []
  const dim = (parsed.dimensions as Record<string, unknown>) || {}
  const result: GradeResult = {
    score: clampScore(parsed.score),
    verdict: String(parsed.verdict || 'Judged'),
    dimensions: {
      detection: clampScore(dim.detection),
      reasoning: clampScore(dim.reasoning),
      execution: clampScore(dim.execution),
    },
    flaws: rawFlaws.map((f) => ({ flaw: String(f.flaw || 'Flaw'), caught: Boolean(f.caught) })),
    analysis: String(parsed.analysis || ''),
    nailed: String(parsed.nailed || ''),
    missed: String(parsed.missed || ''),
    tip: String(parsed.tip || ''),
  }

  return NextResponse.json(result)
}
