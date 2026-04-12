import { sleep } from "workflow";

async function createUser(email: string) {
  // TODO: replace with real user creation logic (e.g. Prisma insert)
  return { id: crypto.randomUUID(), email };
}

async function sendWelcomeEmail(user: { id: string; email: string }) {
  // TODO: replace with real email sending logic
  console.log(`Sending welcome email to ${user.email}`);
}

async function sendOnboardingEmail(user: { id: string; email: string }) {
  // TODO: replace with real email sending logic
  console.log(`Sending onboarding email to ${user.email}`);
}

export async function handleUserSignup(email: string) {
  "use workflow";

  const user = await createUser(email);
  await sendWelcomeEmail(user);

  await sleep("5s");

  await sendOnboardingEmail(user);
  return { userId: user.id, status: "onboarded" };
}
