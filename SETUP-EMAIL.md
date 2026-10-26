# Email setup (optional, free)

Without this the portal still works: it creates the private link and you copy and send it yourself.

1. In the terminal, inside lds-portal:
   npm install nodemailer
   npm install -D @types/nodemailer

2. Add these lines to .env.local (then restart npm run dev):

   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your.address@gmail.com
   SMTP_PASS=your-16-letter-app-password
   MAIL_FROM="Learnware Dev and Standards <your.address@gmail.com>"
   # Optional: where new inquiry notifications should be delivered.
   # Defaults to SMTP_USER when omitted.
   MAIL_NOTIFY_TO=your.address@gmail.com
   NEXT_PUBLIC_SITE_URL=http://localhost:3000

   Gmail: turn on 2-Step Verification, then create an "App password" at
   myaccount.google.com/apppasswords and paste it as SMTP_PASS (not your normal password).
   Free Gmail allows about 500 emails per day.
   If MFI has its own mail server, use its SMTP host, port, user and password instead.

3. When you put the site online, change NEXT_PUBLIC_SITE_URL to the real address,
   so the links in the emails open the live site.

## Inbox setup

The admin Inbox stores public inquiries and replies as ticket email threads.

1. Open Supabase SQL Editor and run `sql/14_email_inbox.sql`.
2. Restart the Next.js server after changing `.env.local`.
3. Give staff the `Inbox` permission in Admin > Users and Roles.
4. Open `/admin/inbox`, choose a ticket, and send a reply. The reply is sent through the SMTP account above and saved in the thread.

### Import customer replies from Gmail

SMTP sends mail but does not read replies. To import replies into the matching ticket thread, use the **Sync Gmail** button on the Inbox page. Add these server-only values to `.env.local` (for the same Gmail account, `IMAP_USER` and `IMAP_PASS` can be omitted and the SMTP values are reused):

```env
IMAP_HOST=imap.gmail.com
IMAP_PORT=993
IMAP_USER=your.address@gmail.com
IMAP_PASS=your-16-character-app-password
IMAP_MAILBOX=INBOX
```

Gmail requires IMAP to be enabled and an app password when two-step verification is enabled. The sync reads the last 30 days, matches subjects containing the ticket number, skips duplicate copies, and does not mark Gmail messages as read.
