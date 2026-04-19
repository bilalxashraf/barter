import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

const DATA_FILE = path.join(process.cwd(), "waitlist.txt");

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
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
    // Read existing emails to deduplicate
    let existing = "";
    try {
      existing = await fs.readFile(DATA_FILE, "utf8");
    } catch {
      // File doesn't exist yet — that's fine
    }

    const emails = existing
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);

    if (emails.includes(email)) {
      return NextResponse.json({ message: "Already on the waitlist!" });
    }

    const timestamp = new Date().toISOString();
    await fs.appendFile(DATA_FILE, `${email}\t${timestamp}\n`, "utf8");

    return NextResponse.json({ message: "You're on the waitlist!" });
  } catch (err) {
    console.error("Waitlist write error:", err);
    return NextResponse.json({ error: "Failed to save. Please try again." }, { status: 500 });
  }
}
