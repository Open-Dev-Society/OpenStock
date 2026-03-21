import {Inngest} from "inngest"

export const inngest = new Inngest({
    id: "openStock",
    ai: {gemini: {apiKey: process.env.GEMINI_API_KEY}},
    // Add signing key for Vercel deployment
    signingKey: process.env.INNGEST_SIGNING_KEY,
})