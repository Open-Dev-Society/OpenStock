import { transporter } from "@/lib/nodemailer";
import { escapeHtml } from "@/lib/utils";
import { getEmailTranslator } from "@/lib/nodemailer/i18n";


// Better Auth hands us an already-encoded URL (callbackURL=http%3A%2F%2F...).
// encodeURI would turn those % into %25 and the link fails with INVALID_CALLBACKURL,
// so only encode characters that are unsafe and leave existing escapes alone.
const encodeUnsafeUrlChars = (url: string) =>
    url.replace(/[^A-Za-z0-9\-._~:/?#[\]@!$&'()*+,;=%]/g, encodeURIComponent);

export const sendPasswordResetEmail = async (
    { email, name, resetUrl, locale }: { email: string; name?: string | null; resetUrl: string; locale?: string }
) => {
    try {
        if (!transporter || !process.env.NODEMAILER_EMAIL || !process.env.NODEMAILER_PASSWORD) {
            throw new Error('Email credentials not configured');
        }

        const { lang, t } = await getEmailTranslator(locale);
        const firstName = name?.trim().split(' ')[0];
        const greeting = escapeHtml(firstName ? t('resetPassword.greeting', { name: firstName }) : t('resetPassword.greetingNoName'));
        const escapedResetUrl = escapeHtml(encodeUnsafeUrlChars(resetUrl));
        const html = `
            <div lang="${lang}" style="background:#000;padding:32px;font-family:Arial,sans-serif;color:#fff;">
                <div style="max-width:560px;margin:0 auto;border:1px solid #333;border-radius:12px;padding:32px;background:#111;">
                    <h1 style="margin:0 0 16px;font-size:28px;">${escapeHtml(t('resetPassword.heading'))}</h1>
                    <p style="margin:0 0 16px;color:#d4d4d8;">${greeting}</p>
                    <p style="margin:0 0 24px;color:#d4d4d8;line-height:1.6;">
                        ${escapeHtml(t('resetPassword.body'))}
                    </p>
                    <a
                        href="${escapedResetUrl}"
                        style="display:inline-block;background:#facc15;color:#111827;padding:12px 20px;border-radius:9999px;text-decoration:none;font-weight:700;"
                    >
                        ${escapeHtml(t('resetPassword.cta'))}
                    </a>
                    <p style="margin:24px 0 0;color:#a1a1aa;line-height:1.6;">
                        ${escapeHtml(t('resetPassword.ignore'))}
                    </p>
                </div>
            </div>
        `;

        const info = await transporter.sendMail({
            from: `"Openstock" <${process.env.NODEMAILER_EMAIL}>`,
            to: email,
            subject: t('resetPassword.subject'),
            text: t('resetPassword.text', { url: encodeUnsafeUrlChars(resetUrl) }),
            html,
        });

        console.log('Password reset email sent successfully:', info.messageId);
        return info;
    } catch (error) {
        console.error('Failed to send password reset email:', error);
        throw error;
    }
};
