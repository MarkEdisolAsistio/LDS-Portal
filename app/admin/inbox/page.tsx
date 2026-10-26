import Link from "next/link";
import { can, getMe } from "@/lib/permissions";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatDate } from "@/lib/format";
import { isImapConfigured, isMailConfigured } from "@/lib/mail";
import InboxAutoRead from "@/components/inbox-auto-read";
import StaffAutoRead from "@/components/staff-auto-read";
import StaffMessageComposer from "@/components/staff-message-composer";
import { markMessageRead, sendReply, syncMailbox } from "./actions";

type Message = {
  id: string;
  inquiry_id: string | null;
  direction: "inbound" | "outbound";
  from_email: string;
  to_email: string;
  subject: string;
  body_text: string;
  is_read: boolean;
  received_at: string;
  attachments?: Attachment[] | null;
  synthetic?: boolean;
};

type Attachment = { name: string; path: string; size: number; contentType: string; url?: string | null };

type Inquiry = {
  id: string;
  ticket_no: string;
  created_at: string;
  custom_spec: string | null;
  notes: string | null;
  clients: { name: string; email: string } | null;
};

type StaffProfile = { id: string; full_name: string };
type StaffMessage = { id: string; sender_id: string; recipient_id: string; subject: string; body_text: string; is_read: boolean; created_at: string };
type MessageFilter = "newest" | "unread-first" | "unread" | "read" | "oldest";

const card = "rounded-xl border border-slate-200 bg-white p-4 text-slate-800 shadow-sm";
const input = "mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm";
const messageFilterOptions: { value: MessageFilter; label: string }[] = [
  { value: "newest", label: "Newest first" },
  { value: "unread-first", label: "Unread first" },
  { value: "unread", label: "Unread only" },
  { value: "read", label: "Read only" },
  { value: "oldest", label: "Oldest first" },
];
const messages: Record<string, string> = {
  sent: "Reply sent and saved.",
  read: "Message marked as read.",
  mail_not_configured: "SMTP is not configured. Add the values from SETUP-EMAIL.md to .env.local, then restart the dev server.",
  mail_failed: "The reply could not be sent. Check the SMTP settings.",
  saved_mail_failed: "The email was sent, but its copy could not be saved. Check that sql/14_email_inbox.sql is applied.",
  mail_sync_not_configured: "Gmail sync is not configured. Add IMAP values from SETUP-EMAIL.md to .env.local, then restart the dev server.",
  mail_sync_failed: "Gmail could not be synced. Check the IMAP settings and Gmail app password.",
  staff_sent: "Staff message sent.",
  invalid_staff_message: "Choose another staff member and enter a subject and message.",
  staff_not_found: "That staff member is no longer active.",
  no_staff_recipients: "There are no other active staff members to receive this team message.",
  staff_message_failed: "The staff message could not be saved. Apply sql/17_staff_messages.sql in Supabase.",
  forbidden: "You do not have permission to use the Inbox.",
  invalid: "Please enter a reply.",
  not_found: "The ticket or client email could not be found.",
  error: "The message could not be updated.",
  too_many_attachments: "Attach up to 5 files per reply.",
  bad_attachment: "Each attachment must be 10 MB or smaller.",
  attachment_upload_failed: "The attachment upload failed. Apply sql/20_email_attachments.sql in Supabase.",
};

export default async function InboxPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const me = await getMe();
  if (!me || !can(me, "inbox", "view")) return <p className="text-slate-600">You do not have access to the Inbox.</p>;

  const params = await searchParams;
  const staffTab = params.tab === "staff";
  const searchTab = params.tab === "search";
  const customerTab = !staffTab && !searchTab;
  const searchTerm = (params.q ?? "").trim().slice(0, 80);
  const messageFilter: MessageFilter = messageFilterOptions.some((option) => option.value === params.message_filter) ? params.message_filter as MessageFilter : "newest";
  const supabase = createAdminClient();
  const [{ data: messageRows, error }, { data: inquiries }, { data: staffProfiles }, { data: staffMessageRows, error: staffMessageError }] = await Promise.all([
    supabase.from("email_messages").select("id, inquiry_id, direction, from_email, to_email, subject, body_text, is_read, received_at, attachments").order("received_at", { ascending: false }).limit(500),
    supabase.from("inquiries").select("id, ticket_no, created_at, custom_spec, notes, clients(name, email)").order("created_at", { ascending: false }).limit(500),
    supabase.from("profiles").select("id, full_name").eq("is_active", true).order("full_name"),
    staffTab ? supabase.from("staff_messages").select("id, sender_id, recipient_id, subject, body_text, is_read, created_at").or(`sender_id.eq.${me.id},recipient_id.eq.${me.id}`).order("created_at", { ascending: false }).limit(200) : Promise.resolve({ data: [], error: null }),
  ]);
  const storedRows = (messageRows ?? []) as unknown as Message[];
  const tickets = (inquiries ?? []) as unknown as Inquiry[];
  const staff = (staffProfiles ?? []) as unknown as StaffProfile[];
  const staffMessages = (staffMessageRows ?? []) as unknown as StaffMessage[];
  const unreadStaffMessageIds = staffMessages.filter((message) => message.recipient_id === me.id && !message.is_read).map((message) => message.id);
  const visibleStaffMessages = staffMessages
    .filter((message) => messageFilter !== "unread" || !message.is_read)
    .filter((message) => messageFilter !== "read" || message.is_read)
    .sort((a, b) => {
      if (messageFilter === "unread-first" && a.is_read !== b.is_read) return a.is_read ? 1 : -1;
      return messageFilter === "oldest" ? a.created_at.localeCompare(b.created_at) : b.created_at.localeCompare(a.created_at);
    });
  const staffById = new Map(staff.map((person) => [person.id, person]));
  const storedInbound = new Set(storedRows.filter((row) => row.direction === "inbound" && row.inquiry_id).map((row) => row.inquiry_id));
  const fallbackRows: Message[] = tickets
    .filter((ticket) => !storedInbound.has(ticket.id))
    .map((ticket) => ({
      id: ticket.id,
      inquiry_id: ticket.id,
      direction: "inbound",
      from_email: ticket.clients?.email ?? "",
      to_email: process.env.MAIL_NOTIFY_TO ?? process.env.SMTP_USER ?? "",
      subject: `New inquiry - ${ticket.ticket_no}`,
      body_text: [ticket.clients?.name, ticket.custom_spec, ticket.notes].filter(Boolean).join("\n\n"),
      is_read: false,
      received_at: ticket.created_at,
      synthetic: true,
    }));
  const rows = [...storedRows, ...fallbackRows].sort((a, b) => b.received_at.localeCompare(a.received_at));
  const visibleRows = rows
    .filter((row) => messageFilter !== "unread" || (row.direction === "inbound" && !row.is_read))
    .filter((row) => messageFilter !== "read" || row.is_read || row.direction === "outbound")
    .sort((a, b) => {
      const unreadA = a.direction === "inbound" && !a.is_read ? 1 : 0;
      const unreadB = b.direction === "inbound" && !b.is_read ? 1 : 0;
      if (messageFilter === "unread-first" && unreadA !== unreadB) return unreadB - unreadA;
      return messageFilter === "oldest" ? a.received_at.localeCompare(b.received_at) : b.received_at.localeCompare(a.received_at);
    });
  const ticketById = new Map(tickets.map((ticket) => [ticket.id, ticket]));
  const searchResults = searchTerm ? tickets.filter((ticket) => ticket.ticket_no.toLowerCase().includes(searchTerm.toLowerCase())) : [];
  const selected = params.ticket ? ticketById.get(params.ticket) : undefined;
  const thread = selected ? rows.filter((row) => row.inquiry_id === selected.id).reverse() : [];
  const threadWithAttachments = await Promise.all(thread.map(async (message) => {
    const attachments = Array.isArray(message.attachments) ? message.attachments : [];
    const signedAttachments = await Promise.all(attachments.map(async (attachment) => {
      const { data } = await supabase.storage.from("email-attachments").createSignedUrl(attachment.path, 3600);
      return { ...attachment, url: data?.signedUrl ?? null };
    }));
    return { ...message, attachments: signedAttachments };
  }));
  const unreadThreadIds = thread
    .filter((row) => row.direction === "inbound" && !row.is_read && !row.synthetic)
    .map((row) => row.id);
  const notice = params.msg === "synced" ? `Gmail inbox synced. Imported ${params.count ?? "0"} customer replies.` : params.msg ? messages[params.msg] : undefined;

  return (
    <div className="mx-auto max-w-6xl space-y-6 rounded-2xl bg-gradient-to-br from-[#0d4775] via-[#0b5c87] to-[#0a8190] p-6 text-white shadow-xl">
      <div>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div><h1 className="text-2xl font-bold tracking-tight text-white drop-shadow-[0_2px_3px_rgba(0,0,0,0.45)]">Inbox</h1><p className="mt-1 text-sm text-white/90 drop-shadow-[0_1px_2px_rgba(0,0,0,0.35)]">Email conversations attached to LDS inquiries and tickets.</p></div>
          {can(me, "inbox", "edit") && <form action={syncMailbox}><button className="rounded-lg bg-[#0d5a89] px-4 py-2 text-sm text-white hover:bg-[#0b446a]">Sync Gmail</button></form>}
        </div>
        <nav className="mt-4 flex gap-2 border-b-2 border-white/75" aria-label="Inbox sections">
          <Link href="/admin/inbox" className={`border-b-2 px-3 py-2 text-sm ${customerTab ? "border-white font-medium text-white" : "border-transparent text-white/70 hover:text-white"}`}>Customer Inbox</Link>
          <Link href="/admin/inbox?tab=staff" className={`border-b-2 px-3 py-2 text-sm ${staffTab ? "border-white font-medium text-white" : "border-transparent text-white/70 hover:text-white"}`}>Staff Messages</Link>
          <Link href="/admin/inbox?tab=search" className={`border-b-2 px-3 py-2 text-sm ${searchTab ? "border-white font-medium text-white" : "border-transparent text-white/70 hover:text-white"}`}>Search</Link>
        </nav>
      </div>
      {notice && <p role="status" className={`rounded-lg p-3 text-sm ${params.msg === "sent" || params.msg === "read" ? "bg-green-50 text-green-800" : "bg-amber-50 text-amber-900"}`}>{notice}</p>}
      {customerTab && error && <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">Inbox storage is not ready. Apply <code>sql/14_email_inbox.sql</code> in Supabase.</p>}
      {customerTab && !isMailConfigured() && <p className="rounded-lg bg-blue-50 p-3 text-sm text-blue-900">Reading stored messages works now. SMTP must be configured before replies can be sent.</p>}
      {customerTab && isMailConfigured() && !isImapConfigured() && <p className="rounded-lg bg-blue-50 p-3 text-sm text-blue-900">Use Sync Gmail to import customer replies after IMAP is configured in .env.local.</p>}
      {customerTab && <MessageFilterForm filter={messageFilter} onGradient />}

      {searchTab && <section className={card}>
        <h2 className="mb-3 font-medium">Find a request or purchase order</h2>
        <form method="get" className="flex flex-wrap items-end gap-3">
          <input type="hidden" name="tab" value="search" />
          <label className="min-w-72 flex-1 text-sm text-slate-700">REQ or PO number<input name="q" defaultValue={searchTerm} placeholder="REQ_2026_0001 or PO_2026_0001" className={input} autoFocus /></label>
          <button className="rounded-lg bg-[#0d5a89] px-4 py-2 text-sm text-white hover:bg-[#0b446a]">Search</button>
        </form>
        {searchTerm && <div className="mt-5 divide-y divide-slate-100 border-t border-slate-200">{searchResults.length === 0 && <p className="py-4 text-sm text-slate-500">No matching REQ or PO ticket was found.</p>}{searchResults.map((ticket) => <Link key={ticket.id} href={`/admin/inbox?ticket=${ticket.id}`} className="block py-3 hover:bg-slate-50"><p className="font-medium text-blue-700">{ticket.ticket_no}</p><p className="mt-1 text-sm text-slate-600">{ticket.clients?.name ?? "No client name"}{ticket.clients?.email ? ` - ${ticket.clients.email}` : ""}</p><p className="mt-1 truncate text-sm text-slate-500">{ticket.custom_spec || ticket.notes || "No inquiry details"}</p></Link>)}</div>}
      </section>}

      {staffTab && (
        <>
          <StaffAutoRead ids={unreadStaffMessageIds} />
          <MessageFilterForm staffTab filter={messageFilter} />
          {staffMessageError && <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">Staff messaging is not ready. Apply <code>sql/17_staff_messages.sql</code> in Supabase.</p>}
          <section className={card}>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3"><h2 className="font-medium">Staff Messages</h2>{can(me, "inbox", "edit") && <StaffMessageComposer staff={staff} currentUserId={me.id} />}</div>
            <div className="space-y-3">{visibleStaffMessages.length === 0 && <p className="text-sm text-slate-500">No staff messages match this filter.</p>}{visibleStaffMessages.map((message) => { const incoming = message.recipient_id === me.id; const other = staffById.get(incoming ? message.sender_id : message.recipient_id); return <article key={message.id} className={`rounded-lg border p-3 ${incoming && !message.is_read ? "border-blue-200 bg-blue-50" : "border-slate-200"}`}><div className="flex flex-wrap justify-between gap-2 text-xs text-slate-500"><span>{incoming ? "From" : "To"}: {other?.full_name ?? "Staff"}</span><time>{formatDate(message.created_at)}</time></div><h3 className="mt-2 text-sm font-medium">{message.subject}</h3><p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{message.body_text}</p></article>; })}</div>
          </section>
        </>
      )}

      {customerTab && selected && (
        <section className={`${card} space-y-4`}>
          <InboxAutoRead ids={unreadThreadIds} />
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div><Link href={`/admin/inquiries/${selected.id}`} className="font-semibold text-blue-700 underline">{selected.ticket_no}</Link><p className="text-sm text-slate-500">{selected.clients?.name} · {selected.clients?.email}</p></div>
            <Link href="/admin/inbox" className="text-sm text-slate-500 underline">Close thread</Link>
          </div>
          <div className="space-y-3">
            {thread.length === 0 && <p className="text-sm text-slate-500">No messages have been recorded for this ticket yet.</p>}
            {threadWithAttachments.map((message) => (
              <article key={message.id} className={`max-w-2xl rounded-lg border p-3 ${message.direction === "outbound" ? "ml-auto border-slate-200 bg-slate-50" : "border-blue-200 bg-blue-50"}`}>
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500"><span className="font-medium text-slate-700">{message.direction === "inbound" ? (selected.clients?.name || "Customer") : "LDS reply"}</span><time>{formatDate(message.received_at)}</time></div>
                <p className="mt-1 text-xs text-slate-500">{message.direction === "inbound" ? `From: ${message.from_email}` : `To: ${message.to_email}`}</p>
                {message.subject && <h2 className="mt-2 text-sm font-medium">{message.subject}</h2>}
                <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-slate-700">{cleanEmailBody(message.body_text)}</p>
                {message.attachments && message.attachments.length > 0 && <div className="mt-3 border-t border-slate-200/80 pt-3"><p className="text-xs font-medium text-slate-600">Attachments</p><div className="mt-1 flex flex-wrap gap-2">{message.attachments.map((attachment) => attachment.url ? <a key={attachment.path} href={attachment.url} target="_blank" rel="noreferrer" className="rounded border border-slate-300 bg-white px-2 py-1 text-xs text-blue-700 underline">{attachment.name}</a> : <span key={attachment.path} className="rounded border border-slate-200 px-2 py-1 text-xs text-slate-500">{attachment.name}</span>)}</div></div>}
                {message.direction === "inbound" && !message.is_read && !message.synthetic && <form action={markMessageRead} className="mt-3"><input type="hidden" name="id" value={message.id} /><button className="text-xs text-blue-700 underline">Mark as read</button></form>}
              </article>
            ))}
          </div>
          {can(me, "inbox", "edit") && <form action={sendReply} encType="multipart/form-data" className="border-t border-slate-200 pt-4"><input type="hidden" name="inquiry_id" value={selected.id} /><label className="block text-sm text-slate-700">Reply<textarea name="body" rows={5} maxLength={8000} className={input} placeholder="Write a reply to the client…" /></label><div className="mt-3 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 p-4"><div className="flex items-start gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-lg text-blue-700" aria-hidden="true">📎</span><div className="min-w-0 flex-1"><label htmlFor="reply-attachments" className="block text-sm font-medium text-slate-800">Attach files</label><p className="mt-1 text-xs text-slate-500">Add documents or images to this reply. Up to 5 files, 10 MB each.</p><input id="reply-attachments" type="file" name="attachments" multiple accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.txt" className="mt-3 block w-full text-sm text-slate-600 file:mr-3 file:cursor-pointer file:rounded-lg file:border-0 file:bg-[#0d5a89] file:px-3 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-[#0b446a]" /></div></div></div><button className="mt-3 rounded-lg bg-[#0d5a89] px-4 py-2 text-sm text-white hover:bg-[#0b446a]">Send reply</button></form>}
        </section>
      )}

      {customerTab && <section className={card}>
        <div className="mb-3"><h2 className="font-medium">Messages</h2></div>
        <div className="divide-y divide-slate-100">
          {visibleRows.length === 0 && <p className="py-4 text-sm text-slate-500">No messages match this filter.</p>}
          {visibleRows.map((message) => { const ticket = message.inquiry_id ? ticketById.get(message.inquiry_id) : undefined; return <Link key={message.id} href={ticket ? `/admin/inbox?ticket=${ticket.id}&message_filter=${messageFilter}` : `/admin/inbox?message_filter=${messageFilter}`} className="block py-3 hover:bg-slate-50"><div className="flex flex-wrap justify-between gap-2"><span className={`text-sm ${!message.is_read && message.direction === "inbound" ? "font-semibold" : ""}`}>{ticket?.ticket_no ?? "Unlinked email"} - {message.subject || "No subject"}</span><time className="text-xs text-slate-500">{formatDate(message.received_at)}</time></div><p className="mt-1 truncate text-sm text-slate-500">{message.direction === "inbound" ? message.from_email : `To ${message.to_email}`} - {message.body_text}</p></Link>; })}
        </div>
        <div className="hidden">
          {rows.length === 0 && <p className="py-4 text-sm text-slate-500">No messages yet. New public inquiries will appear here after the email migration is installed.</p>}
          {rows.map((message) => { const ticket = message.inquiry_id ? ticketById.get(message.inquiry_id) : undefined; return <Link key={message.id} href={ticket ? `/admin/inbox?ticket=${ticket.id}` : "/admin/inbox"} className="block py-3 hover:bg-slate-50"><div className="flex flex-wrap justify-between gap-2"><span className={`text-sm ${!message.is_read && message.direction === "inbound" ? "font-semibold" : ""}`}>{ticket?.ticket_no ?? "Unlinked email"} · {message.subject || "No subject"}</span><time className="text-xs text-slate-500">{formatDate(message.received_at)}</time></div><p className="mt-1 truncate text-sm text-slate-500">{message.direction === "inbound" ? message.from_email : `To ${message.to_email}`} · {message.body_text}</p></Link>; })}
        </div>
      </section>}
    </div>
  );
}

function MessageFilterForm({ staffTab = false, onGradient = false, filter }: { staffTab?: boolean; onGradient?: boolean; filter: MessageFilter }) {
  const gradient = staffTab || onGradient;
  const labelClass = gradient ? "text-white/90" : "text-slate-500";
  const selectClass = gradient ? "mt-1 block rounded-lg border border-white/70 bg-white/10 px-3 py-2 text-sm text-white [&>option]:text-slate-800" : "mt-1 block rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700";
  const buttonClass = gradient ? "rounded-lg border border-white/70 px-3 py-2 text-sm text-white hover:bg-white/15" : "rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50";
  return <form method="get" className="flex items-end gap-2"><input type="hidden" name="tab" value={staffTab ? "staff" : ""} /><label className={`text-xs ${labelClass}`}>Filter messages<select name="message_filter" defaultValue={filter} className={selectClass}>{messageFilterOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label><button className={buttonClass}>Apply</button></form>;
}

function cleanEmailBody(body: string) {
  const normalized = body.replace(/\r\n/g, "\n").trim();
  const lines = normalized.split("\n");
  const quoteStart = lines.findIndex((line) => /^\s*On .+ wrote:\s*$/i.test(line) || /^\s*>+/.test(line));
  return (quoteStart >= 0 ? lines.slice(0, quoteStart) : lines).join("\n").trim() || normalized;
}
