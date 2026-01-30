import { Inngest } from "inngest"

/**
 * Inngest 客户端配置
 */
export const inngest = new Inngest({
    id: "openStock",
    ai: { gemini: { apiKey: process.env.GEMINI_API_KEY } }, // AI 推理配置 (使用 Gemini)
    // 用于 Vercel 等服务的签名密钥，确保请求来源安全
    signingKey: process.env.INNGEST_SIGNING_KEY,
})