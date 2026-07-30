import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/auth/password";
import { createSession } from "@/lib/auth/session";
import { recordAndCheckAbuse } from "@/lib/abuseAlert";

const requestSchema = z.object({
  email: z.string().trim().toLowerCase().email("有効なメールアドレスを入力してください"),
  password: z.string().min(1, "パスワードを入力してください"),
});

export async function POST(req: Request) {
  recordAndCheckAbuse(req, "/api/auth/login");
  const body = await req.json().catch(() => null);
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "不正なリクエストです" }, { status: 400 });
  }
  const { email, password } = parsed.data;

  const user = await prisma.user.findUnique({ where: { email } });
  // same error for "no such user" and "wrong password" - don't leak which one it was
  const invalidMessage = "メールアドレスまたはパスワードが正しくありません";
  if (!user) {
    return NextResponse.json({ error: invalidMessage }, { status: 401 });
  }

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    return NextResponse.json({ error: invalidMessage }, { status: 401 });
  }

  await createSession({ userId: user.id, email: user.email }, req);

  return NextResponse.json({ user: { id: user.id, email: user.email } });
}
