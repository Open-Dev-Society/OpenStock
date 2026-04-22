import { transporter } from "@/lib/nodemailer";

export const sendPasswordResetEmail = async (
    { email, name, resetUrl }: { email: string; name?: string | null; resetUrl: string }
) => {
    try {
        if (!process.env.NODEMAILER_EMAIL || !process.env.NODEMAILER_PASSWORD) {
            throw new Error('Email credentials not configured');
        }

        const firstName = name?.trim().split(' ')[0] || 'there';
        const html = `
            <div style="background:#000;padding:32px;font-family:Arial,sans-serif;color:#fff;">
                <div style="max-width:560px;margin:0 auto;border:1px solid #333;border-radius:12px;padding:32px;background:#111;">
                    <h1 style="margin:0 0 16px;font-size:28px;">Reset your password</h1>
                    <p style="margin:0 0 16px;color:#d4d4d8;">Hi ${firstName},</p>
                    <p style="margin:0 0 24px;color:#d4d4d8;line-height:1.6;">
                        We received a request to reset your Openstock password. Use the button below to choose a new one.
                    </p>
                    <a
                        href="${resetUrl}"
                        style="display:inline-block;background:#facc15;color:#111827;padding:12px 20px;border-radius:9999px;text-decoration:none;font-weight:700;"
                    >
                        Reset password
                    </a>
                    <p style="margin:24px 0 0;color:#a1a1aa;line-height:1.6;">
                        If you did not request this, you can safely ignore this email.
                    </p>
                </div>
            </div>
        `;

        const info = await transporter.sendMail({
            from: `"Openstock" <${process.env.NODEMAILER_EMAIL}>`,
            to: email,
            subject: 'Reset your Openstock password',
            text: `Reset your password: ${resetUrl}`,
            html,
        });

        console.log('Password reset email sent successfully:', info.messageId);
        return info;
    } catch (error) {
        console.error('Failed to send password reset email:', error);
        throw error;
    }
};
