"use client";

import { useState } from "react";
import { sendStaffMessage } from "@/app/admin/inbox/actions";

type StaffMember = { id: string; full_name: string };

export default function StaffMessageComposer({ staff, currentUserId }: { staff: StaffMember[]; currentUserId: string }) {
  const [open, setOpen] = useState(false);
  const recipients = staff.filter((person) => person.id !== currentUserId);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} aria-label="New message" title="New message" className="inline-flex items-center gap-2 rounded-lg bg-[#0d5a89] px-3 py-2 text-sm text-white hover:bg-[#0b446a]">
        <span aria-hidden="true" className="text-lg leading-none">✉</span>
        <span>New message</span>
      </button>

      {open && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}>
        <section role="dialog" aria-modal="true" aria-labelledby="new-staff-message-title" className="w-full max-w-lg rounded-xl bg-white p-5 shadow-xl">
          <div className="flex items-center justify-between gap-3">
            <h2 id="new-staff-message-title" className="text-lg font-semibold">New staff message</h2>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close new message" className="rounded p-1 text-xl leading-none text-slate-500 hover:bg-slate-100">×</button>
          </div>
          <form action={sendStaffMessage} className="mt-4 space-y-3">
            <label className="block text-sm text-slate-700">To<select name="recipient_id" required className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"><option value="">Choose staff</option><option value="all">LDS team</option>{recipients.map((person) => <option key={person.id} value={person.id}>{person.full_name}</option>)}</select></label>
            <label className="block text-sm text-slate-700">Subject<input name="subject" required maxLength={200} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></label>
            <label className="block text-sm text-slate-700">Message<textarea name="body" required maxLength={8000} rows={5} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></label>
            <div className="flex justify-end gap-2 pt-2"><button type="button" onClick={() => setOpen(false)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">Cancel</button><button className="rounded-lg bg-[#0d5a89] px-4 py-2 text-sm text-white hover:bg-[#0b446a]">Send message</button></div>
          </form>
        </section>
      </div>}
    </>
  );
}
