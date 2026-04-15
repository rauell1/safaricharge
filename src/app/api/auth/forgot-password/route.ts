import { NextResponse } from 'next/server';
import { z } from 'zod';
import { Resend } from 'resend';
import { prisma } from '@/lib/prisma';
import { createPasswordResetToken } from '@/lib/password';

const resend = new Resend(process.env.RESEND_API_KEY);
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
      const expires = new Date(Date.now() + 60 * 60 * 1000);

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

      await resend.emails.send({
        from: process.env.EMAIL_FROM ?? 'SafariCharge <noreply@safaricharge.ke>',
        to: email,
        subject: 'Reset your SafariCharge password',
        html: `<p>We received a password reset request for your SafariCharge account.</p>
<p><a href="${resetUrl}">Reset password</a></p>
<p>This link expires in 1 hour. If you didn’t request this, you can ignore this email.</p>`,
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
