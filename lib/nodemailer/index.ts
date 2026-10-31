import nodemailer from 'nodemailer';
import {
    WELCOME_EMAIL_TEMPLATE,
    NEWS_SUMMARY_EMAIL_TEMPLATE,
    STOCK_ALERT_UPPER_EMAIL_TEMPLATE,
    STOCK_ALERT_LOWER_EMAIL_TEMPLATE,
} from "@/lib/nodemailer/templates";
import { formatPrice, sanitizeEmailIntro } from "@/lib/utils";
import { escapeAll, fillTemplate, getEmailTranslator } from "@/lib/nodemailer/i18n";

type EmailSendResult =
    | { status: 'skipped' }
    | { status: 'sent'; messageId: string };

const hasEmailConfig = Boolean(process.env.NODEMAILER_EMAIL && process.env.NODEMAILER_PASSWORD);

if (!hasEmailConfig) {
    console.warn('⚠️ Email credentials are not configured. Welcome and news summary emails are disabled until NODEMAILER_EMAIL and NODEMAILER_PASSWORD are set.');
}

export const transporter = hasEmailConfig
    ? nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.NODEMAILER_EMAIL!,
            pass: process.env.NODEMAILER_PASSWORD!,
        },
        // Keep the pool small because email volume is low in this app.
        pool: true,
        maxConnections: 1,
        maxMessages: 3,
    })
    : null;

if (transporter) {
    transporter.verify((error) => {
        if (error) {
            console.error('❌ Nodemailer transporter verification failed:', error);
        } else {
            console.log('✅ Nodemailer transporter is ready to send emails');
        }
    });
}

export const sendWelcomeEmail = async ({ email, name, intro, locale }: WelcomeEmailData & { locale?: string }) => {
    try {
        if (!transporter) {
            console.warn('⚠️ Welcome email skipped: email credentials are not configured.');
            return { status: 'skipped' } satisfies EmailSendResult;
        }

        const { lang, t } = await getEmailTranslator(locale);
        const htmlTemplate = fillTemplate(WELCOME_EMAIL_TEMPLATE, {
            ...escapeAll({
                title: t('welcome.title'),
                logoAlt: t('common.logoAlt'),
                dashboardAlt: t('welcome.dashboardAlt'),
                heading: t('welcome.heading', { name }),
                featuresLabel: t('welcome.featuresLabel'),
                featureWatchlist: t('welcome.featureWatchlist'),
                featureSearch: t('welcome.featureSearch'),
                featureDashboard: t('welcome.featureDashboard'),
                closing: t('welcome.closing'),
                cta: t('welcome.cta'),
                initiative: t('welcome.initiative'),
                unsubscribe: t('common.unsubscribe'),
                visitOpenstock: t('common.visitOpenstock'),
            }),
            lang,
            intro: sanitizeEmailIntro(intro),
        });

        const mailOptions = {
            from: `"Openstock" <${process.env.NODEMAILER_EMAIL}>`,
            to: email,
            subject: t('welcome.subject'),
            text: t('welcome.text'),
            html: htmlTemplate,
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('✅ Welcome email sent successfully:', info.messageId);
        return { status: 'sent', messageId: info.messageId } satisfies EmailSendResult;
    } catch (error) {
        console.error('❌ Failed to send welcome email:', error);
        throw error;
    }
}

export const sendNewsSummaryEmail = async (
    { email, date, newsContent }: { email: string; date: string; newsContent: string }
) => {
    try {
        if (!transporter) {
            console.warn('⚠️ News summary email skipped: email credentials are not configured.');
            return { status: 'skipped' } satisfies EmailSendResult;
        }

        const htmlTemplate = NEWS_SUMMARY_EMAIL_TEMPLATE
            .replace('{{date}}', date)
            .replace('{{newsContent}}', newsContent);

        const mailOptions = {
            from: `"Openstock" <${process.env.NODEMAILER_EMAIL}>`,
            to: email,
            subject: `📈 Market News Summary Today - ${date}`,
            text: `Today's market news summary from Openstock`,
            html: htmlTemplate,
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('✅ News summary email sent successfully:', info.messageId);
        return { status: 'sent', messageId: info.messageId } satisfies EmailSendResult;
    } catch (error) {
        console.error('❌ Failed to send news summary email:', error);
        throw error;
    }
};

export const sendStockAlertEmail = async (
    { email, symbol, currentPrice, targetPrice, condition, locale }:
    { email: string; symbol: string; currentPrice: number; targetPrice: number; condition: 'ABOVE' | 'BELOW'; locale?: string }
) => {
    try {
        if (!transporter) {
            console.warn('⚠️ Stock alert email skipped: email credentials are not configured.');
            return { status: 'skipped' } satisfies EmailSendResult;
        }

        const isUpper = condition === 'ABOVE';
        // Binance pairs are quoted in USDT, everything else Finnhub prices here is USD
        const money = (value: number) => symbol.startsWith('BINANCE:')
            ? `${value.toLocaleString('en-US', { maximumFractionDigits: value < 1 ? 6 : 2 })} USDT`
            : formatPrice(value);
        const { lang, t } = await getEmailTranslator(locale);
        const dir = isUpper ? 'Above' : 'Below';
        const values = { symbol, price: money(currentPrice), target: money(targetPrice) };
        const htmlTemplate = fillTemplate(isUpper ? STOCK_ALERT_UPPER_EMAIL_TEMPLATE : STOCK_ALERT_LOWER_EMAIL_TEMPLATE, {
            ...escapeAll({
                symbol,
                currentPrice: values.price,
                targetPrice: values.target,
                timestamp: new Date().toLocaleString(lang, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'UTC', timeZoneName: 'short' }),
                title: t(`stockAlert.title${dir}`, values),
                logoAlt: t('common.logoAlt'),
                heading: t(`stockAlert.heading${dir}`),
                currentPriceLabel: t('stockAlert.currentPrice'),
                details: t('stockAlert.details'),
                targetPriceLabel: t('stockAlert.targetPriceLabel'),
                triggerLabel: t('stockAlert.triggerLabel'),
                trigger: t(`stockAlert.trigger${dir}`, values),
                calloutTitle: t(`stockAlert.calloutTitle${dir}`),
                calloutBody: t(`stockAlert.calloutBody${dir}`, values),
                cta: t('stockAlert.cta'),
                footer: t('stockAlert.footer'),
                unsubscribe: t('common.unsubscribe'),
                visitOpenstock: t('common.visitOpenstock'),
            }),
            company: '', // Alerts don't store the company name
            lang,
        });

        const mailOptions = {
            from: `"Openstock" <${process.env.NODEMAILER_EMAIL}>`,
            to: email,
            subject: t(`stockAlert.subject${dir}`, values),
            text: t(`stockAlert.text${dir}`, values),
            html: htmlTemplate,
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('✅ Stock alert email sent successfully:', info.messageId);
        return { status: 'sent', messageId: info.messageId } satisfies EmailSendResult;
    } catch (error) {
        console.error('❌ Failed to send stock alert email:', error);
        throw error;
    }
};
