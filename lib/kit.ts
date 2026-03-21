const KIT_API_URL = 'https://api.kit.com/v4';

interface KitConfig {
    apiKey: string;
    apiSecret: string;
}

const getConfig = (): KitConfig => {
    const apiKey = process.env.KIT_API_KEY;
    const apiSecret = process.env.KIT_API_SECRET;

    if (!apiKey || !apiSecret) {
        throw new Error("KIT_API_KEY or KIT_API_SECRET is not defined in environment variables.");
    }

    return { apiKey, apiSecret };
};

export const kit = {
    /**
     * Add a subscriber to a form (e.g., Welcome List)
     */
    addSubscriber: async (email: string, firstName: string, fields?: Record<string, string>, formId?: string) => {
        const { apiKey } = getConfig();
        // Default form ID if not provided - user should set this in env or pass it
        const targetFormId = formId || process.env.KIT_WELCOME_FORM_ID;

        if (!targetFormId) {
            console.warn("Skipping Kit subscription: No Form ID provided.");
            return;
        }

        try {
            const response = await fetch(`https://api.convertkit.com/v3/forms/${targetFormId}/subscribe`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    api_key: apiKey,
                    email,
                    first_name: firstName,
                    fields // Pass custom fields (e.g., ai_intro)
                }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(JSON.stringify(error));
            }
            return await response.json();
        } catch (error) {
            console.error("Kit API Error (addSubscriber):", error);
            throw error;
        }
    },

    /**
     * Send a broadcast (Newsletter/Summary)
     * Note: This usually creates a draft or sends to a segment. 
     * For programmatic 1-to-1 emails, Kit is less standard than transactional providers, 
     * usually requiring 'Sequences' or 'Tags'.
     * 
     * As a fallback/placeholder replacement for Nodemailer 'sendMail':
     * We might simpler log this for now as Kit isn't a direct 1:1 SMTP replacement without setup.
     */
    sendBroadcast: async (subject: string, content: string) => {
        const { apiKey, apiSecret } = getConfig();
        try {
            const response = await fetch(`https://api.convertkit.com/v3/broadcasts`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    api_key: apiKey,
                    api_secret: apiSecret,
                    subject,
                    content,
                    public: true, // Send immediately (false = draft)
                    send_at: new Date(Date.now() + 60000).toISOString() // 1 min in future to ensure processing
                }),
            });

            if (!response.ok) {
                const error = await response.json();
                // Handle specific case where broadcast is saved as draft despite unconfirmed email
                if (error.message && error.message.includes('saved as a draft')) {
                    console.warn("⚠️ Kit Alert: Broadcast saved as DRAFT because sender address is unconfirmed.");
                    return { success: true, status: 'draft', message: error.message };
                }
                throw new Error(JSON.stringify(error));
            }
            return await response.json();
        } catch (error: any) {
            // Double check if error was thrown above or network error
            if (error.message && error.message.includes('saved as a draft')) {
                return { success: true, status: 'draft', message: error.message };
            }
            console.error("Kit API Error (sendBroadcast):", error);
            throw error;
        }
    },

    /**
     * List subscribers from Kit (for verification/logging)
     */
    listSubscribers: async () => {
        const { apiKey, apiSecret } = getConfig();
        try {
            const response = await fetch(`https://api.convertkit.com/v3/subscribers?api_secret=${apiSecret}`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' },
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(JSON.stringify(error));
            }
            return await response.json(); // Returns { total_subscribers, page, total_pages, subscribers: [...] }
        } catch (error) {
            console.error("Kit API Error (listSubscribers):", error);
            throw error;
        }
    }
};
