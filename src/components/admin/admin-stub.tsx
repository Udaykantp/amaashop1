import { Hammer } from "lucide-react";
import { EmptyState } from "@/components/patterns/empty-state";
import { PageHeader } from "@/components/patterns/page-header";

export function AdminStub({
  title,
  description,
  phase,
}: {
  title: string;
  description: string;
  phase: string;
}) {
  return (
    <>
      <PageHeader title={title} description={description} />
      <EmptyState icon={Hammer} title="Being built">
        Lands in <strong>{phase}</strong>. The schema and server modules behind it already exist —
        see <code className="rounded bg-muted px-1">docs/BUILD-PLAN.md</code>.
      </EmptyState>
    </>
  );
}
