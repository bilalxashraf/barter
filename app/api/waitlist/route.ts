import { NextRequest, NextResponse } from "next/server";

const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function redisCommand(command: string[]): Promise<unknown> {
  const res = await fetch(`${REDIS_URL}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${REDIS_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(command),
  });
  if (!res.ok) throw new Error(`Redis error: ${res.status}`);
  const json = await res.json();
  return json.result;
}

export async function POST(req: NextRequest) {
  if (!REDIS_URL || !REDIS_TOKEN) {
    console.error("Missing UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN");
    return NextResponse.json({ error: "Server misconfigured." }, { status: 500 });
  }

  let body: { email?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const email = (body.email ?? "").trim().toLowerCase();

  if (!email || !isValidEmail(email)) {
    return NextResponse.json({ error: "Please provide a valid email address." }, { status: 422 });
  }

  try {
    // SADD returns 1 if added, 0 if already existed — handles deduplication atomically
    const added = await redisCommand(["SADD", "waitlist", email]);

    if (added === 0) {
      return NextResponse.json({ message: "Already on the waitlist!" });
    }

    // Store join timestamp in a hash for reference
    await redisCommand(["HSET", "waitlist:timestamps", email, new Date().toISOString()]);

    return NextResponse.json({ message: "You're on the waitlist!" });
  } catch (err) {
    console.error("Waitlist save error:", err);
    return NextResponse.json({ error: "Failed to save. Please try again." }, { status: 500 });
  }
}
