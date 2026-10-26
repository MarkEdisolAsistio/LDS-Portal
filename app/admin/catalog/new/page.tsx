import Link from "next/link";
import { getMe, can } from "@/lib/permissions";
import { getCategories } from "@/lib/lookups";
import { ProductFields } from "@/components/product-fields";
import { createProduct } from "../actions";

export default async function NewProduct({
  searchParams,
}: {
  searchParams: Promise<{ msg?: string }>;
}) {
  const { msg } = await searchParams;

  const me = await getMe();
  if (!me || !can(me, "catalog", "edit")) {
    return <p className="text-slate-600">You do not have access to this section.</p>;
  }
  const categories = await getCategories();

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <Link href="/admin/catalog" className="text-sm text-slate-500 underline">
          Back to catalog
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">New product</h1>
        <p className="text-slate-600">You can add photos on the next screen.</p>
      </div>

      {msg && (
        <p role="alert" className="rounded bg-red-50 p-3 text-sm text-red-700">
          {msg === "invalid" ? "Please enter a title and choose a category." : "Could not save. Check the terminal for details."}
        </p>
      )}

      <form action={createProduct} className="space-y-4 rounded-lg border border-slate-200 bg-white p-5">
        <ProductFields categories={categories} />
        <button className="rounded bg-[#0d5a89] px-5 py-2 text-white hover:bg-[#0b446a]">
          Create product
        </button>
      </form>
    </div>
  );
}
