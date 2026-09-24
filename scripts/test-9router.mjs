import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, "../.env");
const envText = readFileSync(envPath, "utf8");

// Parse .env
for (const line of envText.split("\n")) {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    const key = match[1].trim();
    const val = match[2].trim();
    if (!process.env[key]) process.env[key] = val;
  }
}

process.env.AI_PROVIDER = "9router";
process.env.NINEROUTER_URL = process.env.NINEROUTER_URL || "http://localhost:20128/v1";
process.env.NINEROUTER_KEY = process.env.NINEROUTER_KEY || "sk-0881d6aee36a48c7-21gy8f-af3d3174";
process.env.NINEROUTER_MODEL = "gemini";

console.log("🤖 9Router Provider Test");
console.log("   URL:", process.env.NINEROUTER_URL);
console.log("   Model:", process.env.NINEROUTER_MODEL);
console.log("   Key:", process.env.NINEROUTER_KEY.slice(0, 10) + "...");

const prompt = "Explain the advantage of a 4-hour timeframe for EMA crossovers in one short sentence.";

// Call 9router directly using the same logic as OpenStock callOpenAICompatible
const normalizedBase = process.env.NINEROUTER_URL.replace(/\/+$/, "").replace(/\/v1$/, "");
const url = `${normalizedBase}/v1/chat/completions`;

try {
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.NINEROUTER_KEY}`,
    },
    body: JSON.stringify({
      model: process.env.NINEROUTER_MODEL,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      stream: false,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error("❌ 9Router error:", res.status, err);
    process.exit(1);
  }

  const data = await res.json();
  const answer = data?.choices?.[0]?.message?.content;
  console.log("\n✅ 9Router Gemini Response:\n" + answer);
} catch (e) {
  console.error("❌ Fetch error:", e.message);
  process.exit(1);
}
