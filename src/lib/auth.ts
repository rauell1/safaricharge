import { type NextAuthOptions } from 'next-auth';
import EmailProvider from 'next-auth/providers/email';
import { PrismaAdapter } from '@next-auth/prisma-adapter';
import { prisma } from '@/lib/prisma';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    EmailProvider({
      server: '', // not used — we override sendVerificationRequest
      from: process.env.EMAIL_FROM ?? 'SafariCharge <noreply@safaricharge.ke>',
      async sendVerificationRequest({ identifier: email, url }) {
        const siteName = 'SafariCharge';
        await resend.emails.send({
          from: process.env.EMAIL_FROM ?? 'SafariCharge <noreply@safaricharge.ke>',
          to: email,
          subject: `Your ${siteName} magic link`,
          html: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Sign in to ${siteName}</title>
</head>
<body style="margin:0;padding:0;background:#0d1117;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#e6edf3">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
    <tr>
      <td align="center" style="padding:48px 16px">
        <table width="560" cellpadding="0" cellspacing="0" role="presentation" style="max-width:560px;width:100%;background:#161b22;border:1px solid #30363d;border-radius:16px;overflow:hidden">
          <!-- Header -->
          <tr>
            <td style="padding:32px 40px 24px;border-bottom:1px solid #21262d">
              <table cellpadding="0" cellspacing="0" role="presentation">
                <tr>
                  <td style="background:rgba(16,185,129,0.12);border-radius:10px;width:36px;height:36px;text-align:center;vertical-align:middle">
                    <span style="font-size:18px">&#9728;</span>
                  </td>
                  <td style="padding-left:10px;font-size:15px;font-weight:600;color:#ffffff">${siteName}</td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:36px 40px">
              <h1 style="margin:0 0 12px;font-size:22px;font-weight:700;color:#ffffff;line-height:1.3">Your magic link</h1>
              <p style="margin:0 0 28px;font-size:14px;color:#8b949e;line-height:1.6">
                Click the button below to sign in to ${siteName}. This link expires in <strong style="color:#e6edf3">10 minutes</strong> and can only be used once.
              </p>
              <table cellpadding="0" cellspacing="0" role="presentation">
                <tr>
                  <td style="border-radius:12px;background:#10b981">
                    <a href="${url}" style="display:inline-block;padding:14px 32px;font-size:14px;font-weight:600;color:#000000;text-decoration:none;border-radius:12px">Sign in to ${siteName}</a>
                  </td>
                </tr>
              </table>
              <p style="margin:28px 0 0;font-size:12px;color:#484f58;line-height:1.5">
                If the button doesn&rsquo;t work, copy and paste this link:<br />
                <a href="${url}" style="color:#3fb950;word-break:break-all">${url}</a>
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:20px 40px 28px;border-top:1px solid #21262d">
              <p style="margin:0;font-size:12px;color:#484f58">
                If you didn&rsquo;t request this email, you can safely ignore it.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
        });
      },
    }),
  ],
  session: { strategy: 'database' },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  callbacks: {
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
      }
      return session;
    },
  },
};
