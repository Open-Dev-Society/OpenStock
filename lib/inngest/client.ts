import {Inngest} from "inngest"

export const inngest = new Inngest({
    id: "openStock",
    ai: {gemini: {apiKey: process.env.GEMINI_API_KEY}},
    signingKey: process.env.INNGEST_SIGNING_KEY,
    baseUrl: process.env.INNGEST_BASE_URL,
    isDev: process.env.NODE_ENV !== "production" || !!process.env.INNGEST_BASE_URL,
})