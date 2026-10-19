import Link from "next/link";
import { ConnectBackend } from "@/components/admin/connect-backend";
import { ProductForm } from "@/components/admin/catalog/product-form";
import { PageHeader } from "@/components/patterns/page-header";
import { adminGuardCap } from "@/server/admin/context";
import { getCatalogFormData } from "@/server/catalog/products";

export const metadata = { title: "New product" };
export const dynamic = "force-dynamic";

export default async function NewProductPage() {
  const gate = await adminGuardCap("catalog.write");
  if (gate.preview) return <ConnectBackend missing={gate.missing} />;

  const { categories, warehouses } = await getCatalogFormData();

  return (
    <>
      <PageHeader
        title="New product"
        description="Fill in the essentials, then Create — or Create & publish to put it live immediately."
        action={
          <Link href="/admin/catalog" className="text-sm text-muted-foreground hover:underline">
            ← Back to catalog
          </Link>
        }
      />
      <ProductForm mode="create" categories={categories} warehouses={warehouses} />
    </>
  );
}
