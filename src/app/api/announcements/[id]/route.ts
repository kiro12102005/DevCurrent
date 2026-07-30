import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/session";

async function isAdmin(): Promise<boolean> {
  const adminEmail = process.env.ADMIN_EMAIL;
  const user = await getCurrentUser();
  return Boolean(adminEmail && user && user.email === adminEmail);
}

// Lets the operator retract a mistaken/typoed announcement - it was already
// push-broadcast on creation, so this only stops it from showing in the
// in-app list going forward.
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "権限がありません" }, { status: 403 });
  }

  const { id } = await params;
  await prisma.announcement.delete({ where: { id } }).catch(() => {});
  return NextResponse.json({ ok: true });
}
