import { NextRequest, NextResponse } from "next/server";
import { put, list } from "@vercel/blob";
import { promises as fs } from "fs";
import path from "path";
import { getSiteMetrics, refreshWaitlistCount } from "../../_lib/siteMetrics";

const LOCAL_FILE = path.join(process.cwd(), "waitlist.txt");
const IS_VERCEL = !!process.env.VERCEL;

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function emailToPath(email: string) {
  return `waitlist/${email}.txt`;
}

async function emailExists(email: string): Promise<boolean> {
  if (IS_VERCEL) {
    const { blobs } = await list({ prefix: emailToPath(email) });
    return blobs.length > 0;
  } else {
    try {
      const text = await fs.readFile(LOCAL_FILE, "utf8");
      return text.split("\n").some((l) => l.split("\t")[0].trim() === email);
    } catch {
      return false;
    }
  }
}

async function saveEmail(email: string): Promise<void> {
  const timestamp = new Date().toISOString();
  if (IS_VERCEL) {
    await put(emailToPath(email), timestamp, {
      access: "public",
      addRandomSuffix: false,
    });
  } else {
    await fs.appendFile(LOCAL_FILE, `${email}\t${timestamp}\n`, "utf8");
  }
}

export async function POST(req: NextRequest) {
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
    if (await emailExists(email)) {
      const metrics = await getSiteMetrics();
      return NextResponse.json({ message: "Already on the waitlist!", metrics });
    }
    await saveEmail(email);
    const metrics = await refreshWaitlistCount();
    return NextResponse.json({ message: "You're on the waitlist!", metrics });
  } catch (err) {
    console.error("Waitlist save error:", err);
    return NextResponse.json({ error: "Failed to save. Please try again." }, { status: 500 });
  }
}
