import { Plus } from "lucide-react";
import Link from "next/link";
import type { ProductStatus } from "@/server/enums";
import { ConnectBackend } from "@/components/admin/connect-backend";
import { CatalogFilters } from "@/components/admin/catalog/catalog-filters";
import { ProductTable } from "@/components/admin/catalog/product-table";
import { PageHeader } from "@/components/patterns/page-header";
import { Button } from "@/components/ui/button";
import { adminGuardCap } from "@/server/admin/context";
import { getCatalogFormData, listProducts, type ProductSort } from "@/server/catalog/products";
import { can } from "@/server/rbac";

export const metadata = { title: "Catalog" };
export const dynamic = "force-dynamic";

const SORTS: ProductSort[] = [
  "updated_desc",
  "updated_asc",
  "name_asc",
  "name_desc",
  "price_asc",
  "price_desc",
  "created_desc",
];
const STATUSES: ProductStatus[] = ["DRAFT", "ACTIVE", "ARCHIVED"];

export default async function AdminCatalogPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const gate = await adminGuardCap("catalog.view");
  if (gate.preview) return <ConnectBackend missing={gate.missing} />;

  const sp = await searchParams;
  const one = (k: string) => (Array.isArray(sp[k]) ? sp[k]![0] : (sp[k] as string | undefined));

  const q = one("q");
  const statusParam = one("status");
  const status = STATUSES.includes(statusParam as ProductStatus)
    ? (statusParam as ProductStatus)
    : ("ALL" as const);
  const categoryId = one("category");
  const sortParam = one("sort");
  const sort = SORTS.includes(sortParam as ProductSort) ? (sortParam as ProductSort) : "updated_desc";
  const page = Math.max(1, Number(one("page")) || 1);

  const [{ list, total, pageCount }, formData] = await Promise.all([
    listProducts({ q, status, categoryId, sort, page, perPage: 20 }),
    getCatalogFormData(),
  ]);

  const canWrite = can(gate.user, "catalog.write");

  return (
    <>
      <PageHeader
        title="Catalog"
        description="Create, edit and publish the products on the storefront — with per-SKU PV/BV, GST and SEO."
        action={
          canWrite ? (
            <Button asChild className="gap-1.5">
              <Link href="/admin/catalog/new">
                <Plus className="h-4 w-4" /> New product
              </Link>
            </Button>
          ) : null
        }
      />

      <CatalogFilters categories={formData.categories} />

      <ProductTable
        rows={list}
        page={page}
        pageCount={pageCount}
        total={total}
        query={{
          q,
          status: status === "ALL" ? undefined : status,
          category: categoryId,
          sort: sort === "updated_desc" ? undefined : sort,
        }}
      />
    </>
  );
}
