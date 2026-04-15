import { NextResponse } from 'next/server';
import { z } from 'zod';
import { Resend } from 'resend';
import { prisma } from '@/lib/prisma';
import { createPasswordResetToken } from '@/lib/password';
import { DEFAULT_FROM, ADMIN_EMAIL } from '@/lib/auth';

const resend = new Resend(process.env.RESEND_API_KEY);
const PASSWORD_RESET_EXPIRY_MS = 60 * 60 * 1000;
const forgotSchema = z.object({
  email: z.string().email(),
});

export async function POST(request: Request) {
  try {
    const parsed = forgotSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid email address.' }, { status: 400 });
    }

    const email = parsed.data.email.trim().toLowerCase();
    const user = await prisma.user.findUnique({ where: { email } });

    if (user) {
      const { rawToken, tokenHash } = createPasswordResetToken();
      const expires = new Date(Date.now() + PASSWORD_RESET_EXPIRY_MS);

      await prisma.user.update({
        where: { id: user.id },
        data: {
          passwordResetToken: tokenHash,
          passwordResetExpires: expires,
        },
      });

      const baseUrl =
        process.env.NEXTAUTH_URL ||
        (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');
      const resetUrl = `${baseUrl}/reset-password?token=${rawToken}`;

      // Send reset email to the requesting user
      await resend.emails.send({
        from: DEFAULT_FROM,
        to: email,
        subject: 'Reset your SafariCharge password',
        html: `
          <div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;padding:40px 24px;background:#080d18;color:#f1f5f9;border-radius:12px;">
            <div style="display:flex;align-items:center;gap:10px;margin-bottom:32px;">
              <div style="width:36px;height:36px;background:rgba(16,185,129,0.15);border-radius:8px;display:flex;align-items:center;justify-content:center;">
                ☀️
              </div>
              <span style="font-weight:600;font-size:15px;color:#f1f5f9;">SafariCharge</span>
            </div>
            <h1 style="font-size:22px;font-weight:700;margin:0 0 12px;color:#f1f5f9;line-height:1.3;">
              Reset your password
            </h1>
            <p style="font-size:15px;color:#94a3b8;line-height:1.6;margin:0 0 28px;">
              We received a password reset request for your SafariCharge account. Click the button below to set a new password. This link expires in <strong style="color:#f1f5f9;">1 hour</strong>.
            </p>
            <a href="${resetUrl}" style="display:inline-block;background:#10b981;color:#fff;font-weight:600;font-size:14px;padding:12px 28px;border-radius:8px;text-decoration:none;">
              Reset Password →
            </a>
            <p style="font-size:12px;color:#475569;margin-top:32px;line-height:1.6;">
              If you didn't request this, you can safely ignore this email.<br/>
              SafariCharge · Nairobi, Kenya
            </p>
          </div>
        `,
      });

      // Notify admin of the password reset request
      await resend.emails.send({
        from: DEFAULT_FROM,
        to: ADMIN_EMAIL,
        subject: '[SafariCharge] Password reset requested',
        html: `<p>A password reset was requested for: <strong>${email}</strong></p><p>Time: ${new Date().toISOString()}</p>`,
      });
    }

    return NextResponse.json({
      ok: true,
      message: 'If an account exists for this email, a reset link has been sent.',
    });
  } catch {
    return NextResponse.json({ error: 'Could not send reset email.' }, { status: 500 });
  }
}
