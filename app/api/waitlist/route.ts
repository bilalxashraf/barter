import { NextRequest, NextResponse } from "next/server";
import { getSiteMetrics, refreshWaitlistCount } from "../../_lib/siteMetrics";
import { saveWaitlistEmail, waitlistHasEmail } from "../../_lib/waitlistStore";

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
    if (await waitlistHasEmail(email)) {
      const metrics = await getSiteMetrics();
      return NextResponse.json({ message: "Already on the waitlist!", metrics });
    }
    await saveWaitlistEmail(email);
    const metrics = await refreshWaitlistCount();
    return NextResponse.json({ message: "You're on the waitlist!", metrics });
  } catch (err) {
    console.error("Waitlist save error:", err);
    return NextResponse.json({ error: "Failed to save. Please try again." }, { status: 500 });
  }
}
