import { inngest } from "@/lib/inngest/client";
import { NEWS_SUMMARY_EMAIL_PROMPT, PERSONALIZED_WELCOME_EMAIL_PROMPT } from "@/lib/inngest/prompts";
import { sendNewsSummaryEmail, sendWelcomeEmail } from "@/lib/nodemailer";
import { getAllUsersForNewsEmail } from "@/lib/actions/user.actions";
import { getWatchlistSymbolsByEmail } from "@/lib/actions/watchlist.actions";
import { getNews } from "@/lib/actions/finnhub.actions";
import { getFormattedTodayDate } from "@/lib/utils";

/**
 * 注册欢迎邮件发送函数
 * 当用户创建成功时触发，具有 AI 生成内容和 Siray.ai 故障转移机制
 */
export const sendSignUpEmail = inngest.createFunction(
    { id: 'sign-up-email' },
    { event: 'app/user.created' },
    async ({ event, step }) => {
        const userProfile = `
            - 国家: ${event.data.country}
            - 投资目标: ${event.data.investmentGoals}
            - 风险承受能力: ${event.data.riskTolerance}
            - 偏好行业: ${event.data.preferredIndustry}
        `

        const prompt = PERSONALIZED_WELCOME_EMAIL_PROMPT.replace('{{userProfile}}', userProfile)

        let aiResponse;
        try {
            // 主要尝试使用 Google Gemini
            aiResponse = await step.ai.infer('generate-welcome-intro', {
                model: step.ai.models.gemini({ model: 'gemini-2.0-flash-lite' }),
                body: {
                    contents: [
                        {
                            role: 'user',
                            parts: [
                                { text: prompt }
                            ]
                        }]
                }
            });
        } catch (error) {
            console.error("⚠️ Gemini API 失败，正在切换至 Siray.ai 备用方案", error);

            // 故障转移步骤
            aiResponse = await step.run('generate-welcome-intro-fallback', async () => {
                const SIRAY_API_KEY = process.env.SIRAY_API_KEY;
                if (!SIRAY_API_KEY) throw new Error("缺少 Siray API 密钥");

                const res = await fetch('https://api.siray.ai/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${SIRAY_API_KEY}`
                    },
                    body: JSON.stringify({
                        model: 'siray-1.0-ultra',
                        messages: [{ role: 'user', content: prompt }]
                    })
                });

                if (!res.ok) throw new Error(`Siray API 错误: ${res.statusText}`);

                const data = await res.json();
                // 映射到 Gemini 格式以便下游兼容
                return {
                    candidates: [{
                        content: { parts: [{ text: data.choices[0].message.content }] }
                    }]
                };
            });
        }

        await step.run('send-welcome-email', async () => {
            try {
                const part = aiResponse.candidates?.[0]?.content?.parts?.[0];
                const introText = (part && 'text' in part ? part.text : null) || '感谢您加入 OpenStock。您现在可以使用我们的工具来追踪市场并做出更明智的决策。'

                const { data: { email, name } } = event;

                console.log(`📧 正在尝试向 ${email} 发送欢迎邮件`);
                const result = await sendWelcomeEmail({ email, name, intro: introText });
                console.log(`✅ 欢迎邮件已成功发送至: ${email}`);
                return result;
            } catch (error) {
                console.error('❌ 发送欢迎邮件出错:', error);
                throw error;
            }
        })

        return {
            success: true,
            message: '欢迎邮件发送成功'
        }
    }
)

/**
 * 每日新闻摘要发送函数 (针对特定用户)
 * 每周一至周五中午 12 点运行
 */
export const sendDailyNewsSummary = inngest.createFunction(
    { id: 'daily-news-summary' },
    [{ event: 'app/send.daily.news' }, { cron: '0 12 * * 1-5' }],
    async ({ step }) => {
        const users = await step.run('get-all-users', getAllUsersForNewsEmail)
        if (!users || users.length === 0) return { success: false, message: '未找到需要接收邮件的用户' };

        const userNewsSummaries: { user: any; newsContent: string | null }[] = [];

        for (const user of users as any[]) {
            try {
                const articles = await step.run(`fetch-news-${user.email}`, async () => {
                    const symbols = await getWatchlistSymbolsByEmail(user.email);
                    let news = await getNews(symbols);
                    news = (news || []).slice(0, 6);
                    if (!news || news.length === 0) {
                        news = await getNews();
                        news = (news || []).slice(0, 6);
                    }
                    return news;
                });

                if (!articles || articles.length === 0) {
                    userNewsSummaries.push({ user, newsContent: null });
                    continue;
                }

                const prompt = NEWS_SUMMARY_EMAIL_PROMPT.replace('{{newsData}}', JSON.stringify(articles, null, 2));

                const response = await step.ai.infer(`summarize-news-${user.email}`, {
                    model: step.ai.models.gemini({ model: 'gemini-1.5-flash' }),
                    body: {
                        contents: [{ role: 'user', parts: [{ text: prompt }] }]
                    }
                });

                const part = response.candidates?.[0]?.content?.parts?.[0];
                const newsContent = (part && 'text' in part ? part.text : null) || '暂无市场动态。'
                userNewsSummaries.push({ user, newsContent });
            } catch (e) {
                console.error('每日新闻: 准备用户新闻出错', user.email, e);
                userNewsSummaries.push({ user, newsContent: null });
            }
        }

        await step.run('send-news-emails', async () => {
            await Promise.allSettled(
                userNewsSummaries.map(async ({ user, newsContent }) => {
                    if (!newsContent) return false;
                    try {
                        await sendNewsSummaryEmail({ email: user.email, date: getFormattedTodayDate(), newsContent });
                        return true;
                    } catch (error) {
                        console.error(`❌ 向 ${user.email} 发送新闻摘要邮件失败:`, error);
                        throw error;
                    }
                })
            );
        });

        return { success: true, message: '每日新闻摘要邮件处理完成' }
    }
);

/**
 * 每周新闻摘要广播 (通过 ConvertKit 发送给所有订阅者)
 * 每周一上午 9 点运行
 */
export const sendWeeklyNewsSummary = inngest.createFunction(
    { id: 'weekly-news-summary' },
    [{ event: 'app/send.weekly.news' }, { cron: '0 9 * * 1' }],
    async ({ step }) => {
        const articles = await step.run('fetch-general-news', async () => {
            const news = await getNews();
            return (news || []).slice(0, 10);
        });

        if (!articles || articles.length === 0) {
            return { message: '暂无新闻可供总结。' };
        }

        const prompt = NEWS_SUMMARY_EMAIL_PROMPT.replace('{{newsData}}', JSON.stringify(articles, null, 2))
            .replace('daily', 'weekly')
            .replace('Daily', 'Weekly');

        let aiResponse;
        try {
            aiResponse = await step.ai.infer('generate-news-summary', {
                model: step.ai.models.gemini({ model: 'gemini-2.0-flash-lite' }),
                body: { contents: [{ role: 'user', parts: [{ text: prompt }] }] }
            });
        } catch (error) {
            console.error("⚠️ Gemini API 失败 (每周新闻)，正在切换至 Siray.ai 备用方案", error);
            aiResponse = await step.run('generate-news-summary-fallback', async () => {
                const SIRAY_API_KEY = process.env.SIRAY_API_KEY;
                if (!SIRAY_API_KEY) return { candidates: [{ content: { parts: [{ text: "市场正在波动。请登录查看更多细节。" }] } }] };

                const res = await fetch('https://api.siray.ai/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${SIRAY_API_KEY}`
                    },
                    body: JSON.stringify({
                        model: 'siray-1.0-ultra',
                        messages: [{ role: 'user', content: prompt }]
                    })
                });

                if (!res.ok) throw new Error("Siray API Error");
                const data = await res.json();
                return {
                    candidates: [{
                        content: { parts: [{ text: data.choices[0].message.content }] }
                    }]
                };
            });
        }

        const part = aiResponse.candidates?.[0]?.content?.parts?.[0];
        const summaryText = (part && 'text' in part ? part.text : null) || '市场正在波动。请登录查看更多细节。';

        await step.run('send-kit-broadcast', async () => {
            const { kit } = await import("@/lib/kit");
            const date = getFormattedTodayDate();
            const subject = `📈 每周市场动态摘要 - ${date}`;

            const content = `
            <!DOCTYPE html>
            <html>
            <body style="margin: 0; padding: 0; background-color: #000000; font-family: sans-serif;">
                <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #000000; padding: 20px;">
                    <tr>
                        <td align="center">
                            <div style="max-width: 600px; width: 100%; border: 2px dashed #20c997; border-radius: 4px; padding: 2px;"> 
                                <div style="background-color: #000000; padding: 30px 20px;">
                                    <h2 style="color: #ffffff;"><span style="color: #20c997;">📊</span> OpenStock</h2>
                                    <h1 style="color: #ffffff;">每周市场新闻</h1>
                                    <p style="color: #888888;">${date}</p>
                                    <div style="color: #cccccc; text-align: left;">
                                        ${summaryText.replace(/•/g, '<span style="color: #20c997;">•</span>')}
                                    </div>
                                    <p style="margin-top: 40px; color: #666; font-size: 12px;">© ${new Date().getFullYear()} OpenStock</p>
                                </div>
                            </div>
                        </td>
                    </tr>
                </table>
            </body>
            </html>
            `;

            console.log(`📢 正在通过 Kit 发送每周新闻广播`);
            const broadcastResult = await kit.sendBroadcast(subject, content);
            return { success: true, kitResponse: broadcastResult };
        })

        return { success: true, message: '每周新闻广播已发送' }
    }
)

/**
 * 股票价格警报检查
 * 每 5 分钟运行一次
 */
export const checkStockAlerts = inngest.createFunction(
    { id: 'check-stock-alerts' },
    { cron: '*/5 * * * *' },
    async ({ step }) => {
        const activeAlerts = await step.run('fetch-active-alerts', async () => {
            const { connectToDatabase } = await import("@/database/mongoose");
            const { Alert } = await import("@/database/models/alert.model");
            await connectToDatabase();
            const now = new Date();
            return await Alert.find({ active: true, triggered: false, expiresAt: { $gt: now } }).lean();
        });

        if (!activeAlerts || activeAlerts.length === 0) return { message: '没有需要检查的活动警报。' };

        const symbols = [...new Set(activeAlerts.map((a: any) => a.symbol))];

        const prices = await step.run('fetch-prices', async () => {
            const { getQuote } = await import("@/lib/actions/finnhub.actions");
            const priceMap: Record<string, number> = {};
            for (const sym of symbols) {
                try {
                    const quote = await getQuote(sym as string);
                    if (quote && quote.c) priceMap[sym as string] = quote.c;
                } catch (e) {
                    console.error(`获取股票 ${sym} 价格失败`, e);
                }
            }
            return priceMap;
        });

        const triggeredAlerts: any[] = [];
        for (const alert of activeAlerts as any[]) {
            const currentPrice = prices[alert.symbol];
            if (!currentPrice) continue;
            if ((alert.condition === 'ABOVE' && currentPrice >= alert.targetPrice) ||
                (alert.condition === 'BELOW' && currentPrice <= alert.targetPrice)) {
                triggeredAlerts.push({ alert, currentPrice });
            }
        }

        if (triggeredAlerts.length > 0) {
            await step.run('process-triggered-alerts', async () => {
                const { connectToDatabase } = await import("@/database/mongoose");
                const { Alert } = await import("@/database/models/alert.model");
                await connectToDatabase();
                for (const { alert, currentPrice } of triggeredAlerts) {
                    console.log(`🚀 警报触发: ${alert.symbol} 当前价格为 ${currentPrice} (${alert.condition} ${alert.targetPrice})`);
                    await Alert.findByIdAndUpdate(alert._id, { triggered: true, active: false });
                }
            });
        }

        return { processed: activeAlerts.length, triggered: triggeredAlerts.length };
    }
);

/**
 * 沉睡用户唤醒检查
 * 每天上午 10 点运行
 */
export const checkInactiveUsers = inngest.createFunction(
    { id: 'check-inactive-users' },
    { cron: '0 10 * * *' },
    async ({ step }) => {
        const inactiveUsers = await step.run('fetch-inactive-users', async () => {
            const { connectToDatabase } = await import("@/database/mongoose");
            const mongoose = await connectToDatabase();
            const db = mongoose.connection.db;
            if (!db) throw new Error("无数据库连接");

            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

            const users = await db.collection('user').find({
                $and: [
                    { $or: [{ lastActiveAt: { $lt: thirtyDaysAgo } }, { lastActiveAt: { $exists: false }, createdAt: { $lt: thirtyDaysAgo } }] },
                    { $or: [{ lastReengagementSentAt: { $exists: false } }, { lastReengagementSentAt: { $lt: thirtyDaysAgo } }] }
                ]
            }, { projection: { email: 1, name: 1, _id: 1 } }).limit(50).toArray();

            return users.map(u => ({ email: u.email, name: u.name, id: u._id.toString() }));
        });

        if (inactiveUsers.length === 0) return { message: "未发现沉睡用户。" };

        const results = await step.run('send-reengagement-emails', async () => {
            const { kit } = await import("@/lib/kit");
            const { connectToDatabase } = await import("@/database/mongoose");
            const mongoose = await connectToDatabase();
            const db = mongoose.connection.db;
            const sent = [];

            for (const user of inactiveUsers) {
                if (!user.email) continue;
                console.log(`[沉睡用户唤醒] 准备向 ${user.email} 发送逻辑`);
                // 此处可以加入具体的 Kit 广播或标签逻辑
                if (db) {
                    await db.collection('user').updateOne({ _id: new mongoose.Types.ObjectId(user.id) }, { $set: { lastReengagementSentAt: new Date() } });
                }
                sent.push(user.email);
            }
            return sent;
        });

        return { processed: inactiveUsers.length, sent: results };
    }
);