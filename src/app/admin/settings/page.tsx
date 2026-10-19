import { ConnectBackend } from "@/components/admin/connect-backend";
import { PageHeader } from "@/components/patterns/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { adminGuardCap } from "@/server/admin/context";
import { Collections, db } from "@/server/firestore";
import type { SiteDoc } from "@/server/models";

export const metadata = { title: "Settings" };
export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const gate = await adminGuardCap("settings.write");
  if (gate.preview) return <ConnectBackend missing={gate.missing} />;

  const sitesSnap = await db().collection(Collections.sites).orderBy("isPrimary", "desc").get();
  const sites = sitesSnap.docs.map((d) => ({ id: d.id, ...(d.data() as SiteDoc) }));

  return (
    <>
      <PageHeader title="Settings" description="Sites and platform configuration." />
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="font-serif text-base font-medium">Sites</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Domain</TableHead>
                <TableHead>Primary</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sites.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.name}</TableCell>
                  <TableCell className="font-mono text-xs">{s.domain}</TableCell>
                  <TableCell>{s.isPrimary ? "Yes" : "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <p className="mt-3 text-xs text-muted-foreground">
            The “4 websites” allocation/transfer view and CMS-lite land in Phase 6.
          </p>
        </CardContent>
      </Card>
    </>
  );
}
