"use client";

import { useEffect } from "react";
import { markStaffMessagesRead } from "@/app/admin/inbox/actions";

export default function StaffAutoRead({ ids }: { ids: string[] }) {
  useEffect(() => {
    if (ids.length === 0) return;
    const formData = new FormData();
    formData.set("ids", ids.join(","));
    void markStaffMessagesRead(formData);
  }, [ids]);
  return null;
}
