import OpenAI from "openai";

const client = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

type BidContext = {
  menuName: string;
  bidAmount: number;
  success: boolean;
  /** 1-based miss in this chat (1 or 2). Ignored on success. */
  chatAttempt: number;
  lastReply?: string | null;
};

/** Strip $ / NZD amounts so the model cannot leak a secret asking price. */
function stripMoneyMentions(text: string): string {
  return text
    .replace(/\bNZD\s*\$?\s*\d+(\.\d{1,2})?\b/gi, "a bit more")
    .replace(/\$\s*\d+(\.\d{1,2})?\b/g, "a bit more")
    .replace(
      /\b(live|current|asking)\s+(price|rate)\b[^.!?\n]*/gi,
      "that bid needs a little lift",
    )
    .replace(/\s{2,}/g, " ")
    .trim();
}

const FAIL_FALLBACKS_1 = [
  (name: string) =>
    `Oof — ${name} slipped through that time. Bump it up a notch and give it another go.`,
  (name: string) =>
    `Almost had ${name}! The bar’s cheering you on — try a cheeky bit higher.`,
  (name: string) =>
    `Nice try on ${name}, but that one’s still playing hard to get. Nudge the bid up.`,
];

const FAIL_FALLBACKS_2 = [
  (name: string) =>
    `Still shy of the mark on ${name}. One braver bid and you might be sipping soon.`,
  (name: string) =>
    `${name} is teasing you now. Dig a little deeper — you’ve got this.`,
  (name: string) =>
    `Close again! ${name} likes confidence. Swing a touch higher this time.`,
];

function pickFallback(
  list: Array<(name: string) => string>,
  name: string,
  salt: number,
) {
  return list[Math.abs(salt) % list.length](name);
}

function fallbackMessage(ctx: BidContext): string {
  if (ctx.success) {
    return `Legend! $${ctx.bidAmount.toFixed(2)} locks in your ${ctx.menuName}. The room just got a little thirstier.`;
  }
  if (ctx.chatAttempt >= 2) {
    return pickFallback(FAIL_FALLBACKS_2, ctx.menuName, ctx.bidAmount * 100);
  }
  return pickFallback(FAIL_FALLBACKS_1, ctx.menuName, ctx.bidAmount * 100);
}

export async function generateBidChatReply(ctx: BidContext): Promise<string> {
  if (!client) return fallbackMessage(ctx);

  if (ctx.success) {
    const system = `You are a warm, witty Kiwi bartender. 1–2 short sentences.
Congratulate locking in ${ctx.menuName} at $${ctx.bidAmount.toFixed(2)}.
Light celebration, friendly — never rude. Do not invent any other price.`;
    try {
      const res = await client.chat.completions.create({
        model: "gpt-4o-mini",
        temperature: 0.85,
        max_tokens: 70,
        messages: [
          { role: "system", content: system },
          {
            role: "user",
            content: `I won ${ctx.menuName} at $${ctx.bidAmount.toFixed(2)}.`,
          },
        ],
      });
      return res.choices[0]?.message?.content?.trim() || fallbackMessage(ctx);
    } catch (err) {
      console.error("OpenAI error", err);
      return fallbackMessage(ctx);
    }
  }

  const attempt = ctx.chatAttempt <= 1 ? 1 : 2;
  const last = (ctx.lastReply || "").trim();

  const system = `You are a warm, witty Kiwi bartender helping a guest bid on liquor.
Tone: funny, encouraging, light jokes — never rude, never mocking, never disrespectful.
Reply in 1–2 short sentences only.

STRICT RULES:
- Do NOT reveal, guess, or invent any live/current/asking price or "$X" target.
- Do NOT say "meet or beat", "at least $…", or "three tries".
- Do NOT repeat stock lines or the previous assistant reply.
- Nudge them to bid a little HIGHER than $${ctx.bidAmount.toFixed(2)} on ${ctx.menuName}.
- This is miss #${attempt} of a short round — vary the joke and wording.
${last ? `- Previous reply (do not reuse): "${last}"` : ""}`;

  try {
    const res = await client.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.9,
      max_tokens: 80,
      messages: [
        { role: "system", content: system },
        {
          role: "user",
          content: `My bid of $${ctx.bidAmount.toFixed(2)} on ${ctx.menuName} was too low (miss ${attempt}). Give a fresh, kind, funny nudge — different from any previous line.`,
        },
      ],
    });
    const raw =
      res.choices[0]?.message?.content?.trim() || fallbackMessage(ctx);
    const cleaned = stripMoneyMentions(raw) || fallbackMessage(ctx);
    // If model echoed the last reply, swap to a fallback
    if (
      last &&
      cleaned.toLowerCase().slice(0, 40) === last.toLowerCase().slice(0, 40)
    ) {
      return fallbackMessage({
        ...ctx,
        bidAmount: ctx.bidAmount + attempt + Date.now() / 1e8,
      });
    }
    return cleaned;
  } catch (err) {
    console.error("OpenAI error", err);
    return fallbackMessage(ctx);
  }
}
