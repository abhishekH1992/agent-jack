import OpenAI from "openai";

const client = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

type BidContext = {
  menuName: string;
  currentPrice: number;
  lowestPrice: number;
  highestPrice: number;
  bidAmount: number;
  success: boolean;
  failCount: number;
};

function fallbackMessage(ctx: BidContext): string {
  if (ctx.success) {
    return `Nice! $${ctx.bidAmount.toFixed(2)} locks in your ${ctx.menuName}. The crowd just noticed — price is climbing.`;
  }
  // Reveal live price only after 3 failed attempts
  if (ctx.failCount >= 3) {
    return `Alright, cards on the table — ${ctx.menuName} is sitting at $${ctx.currentPrice.toFixed(2)} right now. Meet that (or beat it) and it's yours.`;
  }
  if (ctx.failCount === 2) {
    return `Still short on ${ctx.menuName}. Dig a bit deeper — one more miss and I might spill what the room’s asking.`;
  }
  return `Close, but not quite! ${ctx.menuName} needs a stronger bid. Dig a little deeper — your mates are watching.`;
}

export async function generateBidChatReply(ctx: BidContext): Promise<string> {
  if (!client) return fallbackMessage(ctx);

  const revealLive = ctx.failCount >= 3 && !ctx.success;

  const system = `You are a witty bartender at a lively NZ restaurant with dynamic liquor pricing.
Speak in short, funny, encouraging lines (1-3 sentences).
Currency is NZD with $ prefix.
Item: ${ctx.menuName}.
Bid range (ok to mention): Min $${ctx.lowestPrice.toFixed(2)}, Max $${ctx.highestPrice.toFixed(2)}.
${
  revealLive
    ? `The user failed 3 times — you MUST clearly tell them the live/current price is $${ctx.currentPrice.toFixed(2)} and invite them to meet or beat it.`
    : `Do NOT reveal or hint at the exact live/current price. Never say numbers for the current asking price. Only nudge them to bid higher within the min/max range.`
}
${ctx.success ? "Their bid succeeded — congratulate briefly and hint demand is rising. Do not invent a new live price." : "Their bid was too low — nudge them higher without being mean."}`;

  try {
    const res = await client.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.9,
      max_tokens: 120,
      messages: [
        { role: "system", content: system },
        {
          role: "user",
          content: `I bid $${ctx.bidAmount.toFixed(2)}. Success: ${ctx.success}. Fail count: ${ctx.failCount}.${
            revealLive
              ? ` Live price to offer: $${ctx.currentPrice.toFixed(2)}.`
              : ""
          }`,
        },
      ],
    });
    return res.choices[0]?.message?.content?.trim() || fallbackMessage(ctx);
  } catch (err) {
    console.error("OpenAI error", err);
    return fallbackMessage(ctx);
  }
}
