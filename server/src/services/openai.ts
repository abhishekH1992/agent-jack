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
  if (ctx.failCount >= 2) {
    return `Alright, cards on the table — ${ctx.menuName} is sitting at $${ctx.currentPrice.toFixed(2)} right now. Meet that (or beat it) and it's yours.`;
  }
  return `Close, but not quite! ${ctx.menuName} needs at least $${ctx.currentPrice.toFixed(2)}. Dig a little deeper — your mates are watching.`;
}

export async function generateBidChatReply(ctx: BidContext): Promise<string> {
  if (!client) return fallbackMessage(ctx);

  const system = `You are a witty bartender at a lively NZ restaurant with dynamic liquor pricing.
Speak in short, funny, encouraging lines (1-3 sentences).
Never invent prices — only use the numbers given.
Currency is NZD with $ prefix.
Current price: $${ctx.currentPrice.toFixed(2)}. Min: $${ctx.lowestPrice.toFixed(2)}. Max: $${ctx.highestPrice.toFixed(2)}.
Item: ${ctx.menuName}.
${ctx.failCount >= 2 && !ctx.success ? "The user failed twice — you MUST clearly tell them the current price in a funny way." : ""}
${ctx.success ? "Their bid succeeded — congratulate briefly and hint demand is rising." : "Their bid was too low — nudge them higher without being mean."}`;

  try {
    const res = await client.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.9,
      max_tokens: 120,
      messages: [
        { role: "system", content: system },
        {
          role: "user",
          content: `I bid $${ctx.bidAmount.toFixed(2)}. Success: ${ctx.success}. Fail count: ${ctx.failCount}.`,
        },
      ],
    });
    return res.choices[0]?.message?.content?.trim() || fallbackMessage(ctx);
  } catch (err) {
    console.error("OpenAI error", err);
    return fallbackMessage(ctx);
  }
}
