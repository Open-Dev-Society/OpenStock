import { serve } from "inngest/next";
import { inngest } from "@/lib/inngest/client";
import {
    sendWeeklyNewsSummary,
    sendSignUpEmail,
    checkStockAlerts,
    checkInactiveUsers,
    run4hBacktestFunction,
    nightly4hResearchFunction
} from "@/lib/inngest/functions";

export const { GET, POST, PUT } = serve({
    client: inngest,
    functions: [
        sendSignUpEmail,
        sendWeeklyNewsSummary,
        checkStockAlerts,
        checkInactiveUsers,
        run4hBacktestFunction,
        nightly4hResearchFunction
    ],
})