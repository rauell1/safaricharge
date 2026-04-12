import { start } from "workflow/api";
import { handleUserSignup } from "../../../../workflows/user-signup";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const body = await request.json();
  const { email } = body;

  if (!email || typeof email !== "string" || !email.includes("@")) {
    return NextResponse.json({ error: "A valid email address is required" }, { status: 400 });
  }

  await start(handleUserSignup, [email]);

  return NextResponse.json({
    message: "User signup workflow started",
  });
}
