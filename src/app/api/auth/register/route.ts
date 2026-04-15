import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { hashPassword, isValidPassword } from '@/lib/password';

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export async function POST(request: Request) {
  try {
    const parsed = registerSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid email or password.' }, { status: 400 });
    }

    const email = parsed.data.email.trim().toLowerCase();
    const password = parsed.data.password;

    if (!isValidPassword(password)) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters long.' },
        { status: 400 }
      );
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing?.passwordHash) {
      return NextResponse.json({ error: 'An account already exists for this email.' }, { status: 409 });
    }

    const passwordHash = hashPassword(password);

    if (existing) {
      await prisma.user.update({
        where: { id: existing.id },
        data: { passwordHash, emailVerified: existing.emailVerified ?? new Date() },
      });
    } else {
      await prisma.user.create({
        data: {
          email,
          passwordHash,
          emailVerified: new Date(),
        },
      });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Could not create account.' }, { status: 500 });
  }
}
