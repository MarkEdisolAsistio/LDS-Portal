"use client";

import { useEffect } from "react";
import { markThreadRead } from "@/app/admin/inbox/actions";

export default function InboxAutoRead({ ids }: { ids: string[] }) {
  useEffect(() => {
    if (ids.length === 0) return;
    const formData = new FormData();
    formData.set("ids", ids.join(","));
    void markThreadRead(formData);
  }, [ids]);

  return null;
}
