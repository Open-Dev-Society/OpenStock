import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/nodemailer', () => ({
    transporter: {
        sendMail: vi.fn(),
    },
}));

import { transporter } from '@/lib/nodemailer';
import { sendPasswordResetEmail } from '@/lib/nodemailer/reset-password';

describe('sendPasswordResetEmail', () => {
    const originalEnv = { ...process.env };
    const sendMailMock = vi.mocked(transporter!.sendMail);

    beforeEach(() => {
        process.env = {
            ...originalEnv,
            NODEMAILER_EMAIL: 'sender@example.com',
            NODEMAILER_PASSWORD: 'secret',
        };
        sendMailMock.mockReset();
        sendMailMock.mockResolvedValue({ messageId: 'msg-123' } as never);
    });

    afterEach(() => {
        process.env = { ...originalEnv };
    });

    it('escapes interpolated values before building the HTML email', async () => {
        await sendPasswordResetEmail({
            email: 'user@example.com',
            name: '<Admin&Co.>',
            resetUrl: 'https://example.com/reset-password?token=a b&next=<script>',
        });

        expect(sendMailMock).toHaveBeenCalledTimes(1);
        const [mailOptions] = sendMailMock.mock.calls[0];

        expect(mailOptions.html).toContain('Hi &lt;Admin&amp;Co.&gt;,');
        expect(mailOptions.html).toContain('href="https://example.com/reset-password?token=a%20b&amp;next=%3Cscript%3E"');
        expect(mailOptions.html).not.toContain('<script>');
        expect(mailOptions.text).toContain('https://example.com/reset-password?token=a%20b&next=%3Cscript%3E');
    });

    it('throws when reset email credentials are missing', async () => {
        delete process.env.NODEMAILER_EMAIL;
        delete process.env.NODEMAILER_PASSWORD;

        await expect(
            sendPasswordResetEmail({
                email: 'user@example.com',
                name: 'User',
                resetUrl: 'https://example.com/reset-password?token=test',
            })
        ).rejects.toThrow('Email credentials not configured');
    });
});
