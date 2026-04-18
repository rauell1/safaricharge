import { type NextAuthOptions } from 'next-auth';
import EmailProvider from 'next-auth/providers/email';
import CredentialsProvider from 'next-auth/providers/credentials';
import { PrismaAdapter } from '@next-auth/prisma-adapter';
import { prisma } from '@/lib/prisma';
import { Resend } from 'resend';
import { verifyPassword } from '@/lib/password';

const resendApiKey = process.env.RESEND_API_KEY;
const resend = resendApiKey ? new Resend(resendApiKey) : null;

// Default sender — override via EMAIL_FROM env var in production
const DEFAULT_FROM = process.env.EMAIL_FROM ?? 'SafariCharge <onboarding@resend.dev>';
// Admin/notifications recipient
const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'royokola3@gmail.com';

async function sendVerificationRequest({
  identifier: email,
  url,
  provider,
}: {
  identifier: string;
  url: string;
  provider: { from: string };
}) {
  if (!resend) {
    throw new Error('RESEND_API_KEY is missing. Magic-link emails are not configured.');
  }

  const { error } = await resend.emails.send({
    from: provider.from ?? DEFAULT_FROM,
    to: email,
    subject: 'Your SafariCharge sign-in link',
    html: `
      <div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;padding:40px 24px;background:#080d18;color:#f1f5f9;border-radius:12px;">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:32px;">
          <div style="width:36px;height:36px;background:rgba(16,185,129,0.15);border-radius:8px;display:flex;align-items:center;justify-content:center;">
            ☀️
          </div>
          <span style="font-weight:600;font-size:15px;color:#f1f5f9;">SafariCharge</span>
        </div>
        <h1 style="font-size:22px;font-weight:700;margin:0 0 12px;color:#f1f5f9;line-height:1.3;">
          Your magic sign-in link
        </h1>
        <p style="font-size:15px;color:#94a3b8;line-height:1.6;margin:0 0 28px;">
          Click the button below to sign in to SafariCharge. This link expires in <strong style="color:#f1f5f9;">10 minutes</strong> and can only be used once.
        </p>
        <a href="${url}" style="display:inline-block;background:#10b981;color:#fff;font-weight:600;font-size:14px;padding:12px 28px;border-radius:8px;text-decoration:none;">
          Sign in to SafariCharge →
        </a>
        <p style="font-size:12px;color:#475569;margin-top:32px;line-height:1.6;">
          If you didn't request this link, you can safely ignore this email.<br/>
          SafariCharge · Nairobi, Kenya
        </p>
      </div>
    `,
  });

  if (error) {
    throw new Error(`Resend failed to send magic link: ${error.message}`);
  }
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    CredentialsProvider({
      name: 'Email & Password',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const email = credentials?.email?.trim().toLowerCase();
        const password = credentials?.password;
        if (!email || !password) return null;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user?.passwordHash) return null;
        if (!verifyPassword(password, user.passwordHash)) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
        };
      },
    }),
    EmailProvider({
      server: '', // not used — we override sendVerificationRequest
      from: DEFAULT_FROM,
      sendVerificationRequest,
    }),
  ],
  // JWT sessions are required because middleware uses `getToken` for route protection.
  // Deploying this change invalidates existing database-backed sessions.
  session: { strategy: 'jwt' },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user?.id) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = (token.id as string) ?? token.sub ?? '';
      }
      return session;
    },
  },
};

// Export admin email constant for use in other API routes
export { ADMIN_EMAIL, DEFAULT_FROM };
