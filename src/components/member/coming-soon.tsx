import { Hammer } from "lucide-react";
import { PageHeader } from "@/components/patterns/page-header";
import { EmptyState } from "@/components/patterns/empty-state";

/** Honest placeholder for member sections not yet in this build phase. */
export function ComingSoon({
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
        This section lands in <strong>{phase}</strong>. The data model and engine behind it are
        already in the schema — see <code className="rounded bg-muted px-1">docs/BUILD-PLAN.md</code>.
      </EmptyState>
    </>
  );
}
