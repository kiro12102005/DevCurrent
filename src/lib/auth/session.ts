import "server-only";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { prisma } from "@/lib/prisma";

const SESSION_COOKIE = "session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days

function getSecretKey() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error(
      "AUTH_SECRET is not set. Generate one with: node -e \"console.log(require('crypto').randomBytes(32).toString('base64'))\""
    );
  }
  return new TextEncoder().encode(secret);
}

type SessionPayload = {
  userId: string;
  email: string;
};

async function signSession(payload: SessionPayload): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(getSecretKey());
}

async function verifySession(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    if (typeof payload.userId !== "string" || typeof payload.email !== "string") return null;
    return { userId: payload.userId, email: payload.email };
  } catch {
    return null;
  }
}

// NODE_ENV alone can't tell us whether to mark the cookie Secure: `next start`
// sets NODE_ENV=production even for a plain-HTTP self-hosted deployment (this
// app explicitly supports that - see instrumentation.ts), and a Secure cookie
// is silently dropped by the browser over HTTP, which breaks login entirely
// with no visible error. Derive it from the actual request instead.
function isHttpsRequest(req: Request): boolean {
  const forwardedProto = req.headers.get("x-forwarded-proto");
  if (forwardedProto) return forwardedProto.split(",")[0].trim() === "https";
  return new URL(req.url).protocol === "https:";
}

// Sets the session cookie. Only callable from a Route Handler or Server Function
// (Next.js forbids mutating cookies during Server Component rendering).
export async function createSession(payload: SessionPayload, req: Request): Promise<void> {
  const token = await signSession(payload);
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: isHttpsRequest(req),
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

// Reads + verifies the session cookie only (no DB hit) - use when you just need
// the userId/email and can tolerate slight staleness (e.g. deleted account).
export async function getSessionPayload(): Promise<SessionPayload | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySession(token);
}

// Reads the session and confirms the user still exists in the DB. Use this
// wherever the result gates access to real data (notes, push targeting, etc).
export async function getCurrentUser(): Promise<{ id: string; email: string } | null> {
  const payload = await getSessionPayload();
  if (!payload) return null;
  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: { id: true, email: true },
  });
  return user;
}
