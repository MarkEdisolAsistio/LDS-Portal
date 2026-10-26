import { createAdminClient } from "@/lib/supabase/admin";

// Small read-only lists. They use the server-side key so every signed-in role
// (and visitors on the public form) can see category and staff names.

export type Category = { id: number; name: string };
export type Staff = { id: string; name: string; active: boolean };

export async function getCategories(): Promise<Category[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("categories")
    .select("id, name")
    .order("sort_order");
  return (data ?? []) as unknown as Category[];
}

export async function getStaff(): Promise<Staff[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("profiles")
    .select("id, full_name, is_active")
    .order("full_name");
  return ((data ?? []) as unknown as {
    id: string;
    full_name: string;
    is_active: boolean;
  }[]).map((p) => ({ id: p.id, name: p.full_name, active: p.is_active }));
}

export async function getProduct(
  id: string
): Promise<{ id: string; title: string; category_id: number; is_purchasable: boolean } | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("products")
    .select("id, title, category_id, is_purchasable")
    .eq("id", id)
    .maybeSingle();
  return (
    (data as unknown as {
      id: string;
      title: string;
      category_id: number;
      is_purchasable: boolean;
    } | null) ?? null
  );
}
