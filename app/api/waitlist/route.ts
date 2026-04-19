import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { cloudCount, cloudWriteText, getCloudStoreKind } from "../../_lib/cloudStore";
import { getSiteMetrics, refreshWaitlistCount } from "../../_lib/siteMetrics";

const LOCAL_FILE = path.join(process.cwd(), "waitlist.txt");
const CLOUD_STORE = getCloudStoreKind();

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function emailToPath(email: string) {
  return `waitlist/${email}.txt`;
}

async function emailExists(email: string): Promise<boolean> {
  if (CLOUD_STORE) {
    return (await cloudCount(emailToPath(email))) > 0;
  }

  try {
    const text = await fs.readFile(LOCAL_FILE, "utf8");
    return text.split("\n").some((l) => l.split("\t")[0].trim() === email);
  } catch {
    return false;
  }
}

async function saveEmail(email: string): Promise<void> {
  const timestamp = new Date().toISOString();
  if (CLOUD_STORE) {
    await cloudWriteText(emailToPath(email), timestamp);
    return;
  }

  await fs.appendFile(LOCAL_FILE, `${email}\t${timestamp}\n`, "utf8");
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
