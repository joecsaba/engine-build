import { Router, type IRouter } from "express";
import { db, feedbackTable, pool } from "@workspace/db";

const router: IRouter = Router();

async function ensureFeedbackTable() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS feedback (
        id SERIAL PRIMARY KEY,
        name TEXT,
        email TEXT,
        message TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
      )
    `);
  } catch {
  }
}

ensureFeedbackTable();

async function sendEmailViaResend(name: string, email: string, message: string) {
  const apiKey = process.env.RESEND_API_KEY;
  const toEmail = process.env.FEEDBACK_EMAIL;
  if (!apiKey || !toEmail) return;

  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Engine-build.com <onboarding@resend.dev>",
      to: [toEmail],
      subject: `New suggestion from Engine-build.com`,
      html: `
        <h2>New Calculator Suggestion</h2>
        <p><strong>From:</strong> ${name || "Anonymous"} ${email ? `(${email})` : ""}</p>
        <p><strong>Message:</strong></p>
        <blockquote>${message.replace(/\n/g, "<br>")}</blockquote>
        <hr>
        <p style="color:#999;font-size:12px">Sent from Engine-build.com feedback form</p>
      `,
    }),
  });
}

router.post("/feedback", async (req, res) => {
  const { name = "", email = "", message = "" } = req.body ?? {};

  if (!message.trim()) {
    return res.status(400).json({ error: "Message is required" });
  }

  await db.insert(feedbackTable).values({
    name: name.trim() || null,
    email: email.trim() || null,
    message: message.trim(),
  });

  sendEmailViaResend(name.trim(), email.trim(), message.trim()).catch(() => {});

  return res.json({ success: true });
});

export default router;
