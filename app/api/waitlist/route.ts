import { NextRequest, NextResponse } from "next/server";
import { put, head } from "@vercel/blob";
import { promises as fs } from "fs";
import path from "path";

const BLOB_NAME = "waitlist.txt";
const LOCAL_FILE = path.join(process.cwd(), "waitlist.txt");
const IS_VERCEL = !!process.env.VERCEL;

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function readEmails(): Promise<string[]> {
  if (IS_VERCEL) {
    try {
      const existing = await head(BLOB_NAME);
      const res = await fetch(existing.url);
      const text = await res.text();
      return text.split("\n").map((l) => l.split("\t")[0].trim()).filter(Boolean);
    } catch {
      return [];
    }
  } else {
    try {
      const text = await fs.readFile(LOCAL_FILE, "utf8");
      return text.split("\n").map((l) => l.split("\t")[0].trim()).filter(Boolean);
    } catch {
      return [];
    }
  }
}

async function appendEmail(email: string, emails: string[]): Promise<void> {
  const timestamp = new Date().toISOString();
  const line = `${email}\t${timestamp}\n`;

  if (IS_VERCEL) {
    const allEmails = [...emails, email];
    const content = allEmails.map((e) => `${e}\t${timestamp}`).join("\n") + "\n";
    await put(BLOB_NAME, content, { access: "public", allowOverwrite: true });
  } else {
    await fs.appendFile(LOCAL_FILE, line, "utf8");
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
    const emails = await readEmails();

    if (emails.includes(email)) {
      return NextResponse.json({ message: "Already on the waitlist!" });
    }

    await appendEmail(email, emails);
    return NextResponse.json({ message: "You're on the waitlist!" });
  } catch (err) {
    console.error("Waitlist save error:", err);
    return NextResponse.json({ error: "Failed to save. Please try again." }, { status: 500 });
  }
}
