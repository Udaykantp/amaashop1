import { Spinner } from "@/components/ui/spinner";

/**
 * Automatic Next.js loading UI for the whole /admin segment — shown inside
 * the admin shell (sidebar/header stay put) while a page's server data is
 * being fetched, so navigating between admin pages never flashes blank.
 */
export default function AdminLoading() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <Spinner size="lg" className="text-[hsl(var(--ws))]" label="Loading" />
    </div>
  );
}
