import { headers } from "next/headers";

// Sends email through any SMTP mailbox (Gmail app password, your company mail server, Brevo, ...).
// Settings come from .env.local. When they are missing, the portal still works:
// staff copy the private link and send it themselves.

export function isMailConfigured(): boolean {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

export function isImapConfigured(): boolean {
  return Boolean(
    (process.env.IMAP_HOST ?? "imap.gmail.com") &&
      (process.env.IMAP_USER ?? process.env.SMTP_USER) &&
      (process.env.IMAP_PASS ?? process.env.SMTP_PASS),
  );
}

export type IncomingMail = {
  from: string;
  to: string;
  subject: string;
  text: string;
  receivedAt: string;
};

export async function fetchInboxMail(): Promise<
  { ok: true; messages: IncomingMail[] } | { ok: false; reason: string }
> {
  if (!isImapConfigured()) return { ok: false, reason: "not_configured" };

  try {
    const { ImapFlow } = await import("imapflow");
    const { simpleParser } = await import("mailparser");
    const client = new ImapFlow({
      host: process.env.IMAP_HOST ?? "imap.gmail.com",
      port: Number(process.env.IMAP_PORT ?? 993),
      secure: true,
      auth: {
        user: process.env.IMAP_USER ?? process.env.SMTP_USER!,
        pass: process.env.IMAP_PASS ?? process.env.SMTP_PASS!,
      },
      logger: false,
    });

    const messages: IncomingMail[] = [];
    await client.connect();
    const lock = await client.getMailboxLock(process.env.IMAP_MAILBOX ?? "INBOX", { readOnly: true });
    try {
      const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const found = await client.search({ since }, { uid: true });
      const uids = Array.isArray(found) ? found.slice(-100) : [];
      if (uids.length > 0) {
        const fetched = await client.fetchAll(uids, { source: true }, { uid: true });
        for (const item of fetched) {
          if (!item.source) continue;
          const parsed = await simpleParser(item.source);
          const firstAddress = (value: unknown) => {
            if (!value) return "";
            const first = Array.isArray(value) ? value[0] : (value as { value?: Array<{ address?: string }> }).value?.[0];
            return (first as { address?: string } | undefined)?.address ?? "";
          };
          const from = firstAddress(parsed.from);
          const to = firstAddress(parsed.to);
          if (!from) continue;
          messages.push({
            from,
            to,
            subject: parsed.subject ?? "",
            text: (parsed.text ?? "").trim().slice(0, 8000),
            receivedAt: (parsed.date ?? new Date()).toISOString(),
          });
        }
      }
    } finally {
      lock.release();
    }
    await client.logout();
    return { ok: true, messages };
  } catch (e) {
    console.error("fetchInboxMail failed:", e instanceof Error ? e.message : e);
    return { ok: false, reason: "sync_failed" };
  }
}

export async function siteUrl(): Promise<string> {
  const fixed = process.env.NEXT_PUBLIC_SITE_URL;
  if (fixed) return fixed.replace(/\/+$/, "");
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

export async function sendMail(opts: {
  to: string;
  subject: string;
  text: string;
  html: string;
  attachments?: { filename: string; content: Buffer; contentType?: string }[];
}): Promise<{ ok: true } | { ok: false; reason: string }> {
  if (!isMailConfigured()) return { ok: false, reason: "not_configured" };
  try {
    const nodemailer = await import("nodemailer");
    const port = Number(process.env.SMTP_PORT ?? 587);
    const transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: port === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
    await transport.sendMail({
      from: mailFromAddress(),
      to: opts.to,
      subject: opts.subject,
      text: opts.text,
      html: opts.html,
      attachments: opts.attachments,
    });
    return { ok: true };
  } catch (e) {
    console.error("sendMail failed:", e instanceof Error ? e.message : e);
    return { ok: false, reason: "send_failed" };
  }
}

function mailFromAddress(): string {
  const configured = process.env.MAIL_FROM?.trim() ?? "";
  const configuredAddress = configured.match(/<([^>]+)>/)?.[1] ?? (configured.includes("@") ? configured : "");
  const address = configuredAddress || process.env.SMTP_USER || "";
  return `Learnware Dev and Standards <${address}>`;
}

export function staffWelcomeEmail(args: { name: string; username: string; temporaryPassword: string; resetLink: string }) {
  const { name, username, temporaryPassword, resetLink } = args;
  const text = [
    `Dear, ${name}`,
    "",
    "Welcome to LDS Department. Your LDS Portal account has been created.",
    "",
    `Username: ${username}`,
    `Temporary password: ${temporaryPassword}`,
    "",
    "Reset your password:",
    resetLink,
    "",
    "Please reset your temporary password after signing in.",
    "",
    "Best regards,",
    "Learnware Development and Standards",
  ].join("\n");
  const html = `<p>Dear, ${esc(name)}</p><p>Welcome to LDS Department. Your LDS Portal account has been created.</p><p><strong>Username:</strong> ${esc(username)}<br><strong>Temporary password:</strong> ${esc(temporaryPassword)}</p><p><a href="${esc(resetLink)}">Reset your password</a></p><p>Please reset your temporary password after signing in.</p><p>Best regards,<br>Learnware Development and Standards</p>`;
  return { subject: "LDS Portal Account", text, html };
}

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// Email asking the client to fill in (or fix and resend) a form.
export function clientFormEmail(args: {
  formTitle: string;
  projectCode: string;
  link: string;
  message?: string;
  returnNote?: string;
}) {
  const { formTitle, projectCode, link, message, returnNote } = args;
  const subject = returnNote
    ? `LDS: please review and resubmit - ${formTitle} (${projectCode})`
    : `LDS: please complete - ${formTitle} (${projectCode})`;

  const lines: string[] = ["Hello,", ""];
  if (returnNote) {
    lines.push(`We could not accept your ${formTitle} yet. Please see our note and update the form:`, "", returnNote, "");
  } else {
    lines.push(`Please fill in the ${formTitle} for your request ${projectCode}.`, "");
    if (message) lines.push(message, "");
  }
  lines.push("Open your form here (no account needed):", link, "", "The link stays valid for 30 days. You can print the form after you submit it.", "", "Learnware Development Section");

  const html =
    `<p>Hello,</p>` +
    (returnNote
      ? `<p>We could not accept your <strong>${esc(formTitle)}</strong> yet. Please see our note and update the form:</p><blockquote style="border-left:4px solid #f59e0b;margin:0;padding:8px 12px;background:#fffbeb">${esc(returnNote).replace(/\n/g, "<br>")}</blockquote>`
      : `<p>Please fill in the <strong>${esc(formTitle)}</strong> for your request <strong>${esc(projectCode)}</strong>.</p>` +
        (message ? `<p>${esc(message).replace(/\n/g, "<br>")}</p>` : "")) +
    `<p><a href="${esc(link)}" style="display:inline-block;background:#0f172a;color:#fff;padding:10px 18px;border-radius:6px;text-decoration:none">Open the form</a></p>` +
    `<p style="color:#64748b;font-size:13px">No account needed. The link stays valid for 30 days. You can print the form after you submit it.<br>${esc(link)}</p>` +
    `<p>Learnware Development Section</p>`;

  return { subject, text: lines.join("\n"), html };
}
