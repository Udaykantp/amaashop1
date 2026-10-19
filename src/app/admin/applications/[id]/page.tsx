import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ApplicationReviewPanel } from "@/components/admin/application-review-panel";
import { ApplicationSourceBadge, ApplicationStatus } from "@/components/admin/application-status";
import { ConnectBackend } from "@/components/admin/connect-backend";
import { PageHeader } from "@/components/patterns/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { adminGuardCap } from "@/server/admin/context";
import { getApplicationDetail } from "@/server/admin/applications";
import { can } from "@/server/rbac";

export const metadata = { title: "Registration" };
export const dynamic = "force-dynamic";

function maskLast4(type: string | null, last4: string | null) {
  if (!last4) return "—";
  const label =
    type === "AADHAAR_LAST4"
      ? "Aadhaar"
      : type === "PAN"
        ? "PAN"
        : type === "VOTER_ID"
          ? "Voter ID"
          : type === "DL"
            ? "Driving licence"
            : "ID";
  return `${label} ••••${last4}`;
}

export default async function AdminApplicationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const gate = await adminGuardCap("application.review");
  if (gate.preview) return <ConnectBackend missing={gate.missing} />;

  const { id } = await params;
  const a = await getApplicationDetail(id);
  if (!a) notFound();

  const canApprove = can(gate.user, "application.review") && gate.user.mfa;

  return (
    <>
      <Link
        href="/admin/applications"
        className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> All registrations
      </Link>
      <PageHeader
        title={a.fullName}
        description={`${a.source === "ADMIN" ? "Enrolled" : "Submitted"} ${new Date(
          a.createdAt,
        ).toLocaleString("en-IN")}${
          a.source === "ADMIN" && a.createdByLabel ? ` by ${a.createdByLabel}` : ""
        }`}
        action={
          <div className="flex items-center gap-2">
            <ApplicationSourceBadge value={a.source} />
            <ApplicationStatus value={a.status} />
          </div>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-sm">Applicant</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5 text-sm">
            <Row k="Mobile" v={<span className="font-mono">{a.phone}</span>} />
            <Row k="Email" v={a.email ?? "—"} />
            <Row k="Age" v={String(a.age)} />
            <Row k="Gender" v={a.gender ?? "—"} />
            <Row k="Family members" v={String(a.familyMemberCount)} />
            <Row k="ID proof" v={maskLast4(a.idProofType, a.idProofLast4)} />
            <Row k="Nominee" v={a.nomineeName ?? "—"} />
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-sm">Address</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5 text-sm">
            <Row k="House / street" v={a.addressLine} />
            <Row k="Village / city" v={a.city} />
            <Row k="District" v={a.district} />
            <Row k="State" v={a.state} />
            <Row k="Pincode" v={a.pincode} />
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-sm">Referral</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5 text-sm">
            <Row k="Entered ref" v={<span className="font-mono">{a.referrerInput}</span>} />
            <Row
              k="Sponsor"
              v={
                a.sponsor ? (
                  <Link
                    href={`/admin/members/${a.sponsor.id}`}
                    className="font-mono text-primary hover:underline"
                  >
                    {a.sponsor.memberCode}
                  </Link>
                ) : (
                  <span className="text-destructive">unresolved</span>
                )
              }
            />
            <Row k="Sponsor name" v={a.sponsorName ?? "—"} />
            <Row
              k="Requested side"
              v={a.preferredLeg ? (a.preferredLeg === "LEFT" ? "Left leg" : "Right leg") : "Any (auto)"}
            />
            <Row k="Confirmed by applicant" v={a.sponsorConfirmed ? "Yes" : "No"} />
            {a.createdMember ? (
              <Row
                k="Created member"
                v={
                  <Link
                    href={`/admin/members/${a.createdMember.id}`}
                    className="font-mono text-primary hover:underline"
                  >
                    {a.createdMember.memberCode}
                  </Link>
                }
              />
            ) : null}
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="font-serif text-base font-medium">Consent &amp; anti-abuse</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5 text-sm">
            <Row k="Source" v={a.source === "ADMIN" ? "Enrolled by admin" : "Public /join form"} />
            {a.source === "ADMIN" ? (
              <Row k="Enrolled by" v={a.createdByLabel ?? "—"} />
            ) : null}
            <Row
              k={a.source === "ADMIN" ? "Terms attested" : "Terms accepted"}
              v={a.termsAcceptedAt ? new Date(a.termsAcceptedAt).toLocaleString("en-IN") : "—"}
            />
            {a.source === "ADMIN" ? (
              <Row k="Captcha" v="Not applicable (operator-entered)" />
            ) : (
              <Row
                k="Captcha verified"
                v={a.captchaVerifiedAt ? new Date(a.captchaVerifiedAt).toLocaleString("en-IN") : "—"}
              />
            )}
            <Row k="IP" v={<span className="font-mono text-xs">{a.consentIp ?? "—"}</span>} />
            <Row
              k="User agent"
              v={<span className="text-xs text-muted-foreground">{a.consentUserAgent ?? "—"}</span>}
            />
            <p className="pt-1 text-xs text-muted-foreground">
              Note: the mobile number is <strong>not</strong> OTP-verified. Confirm identity during
              KYC.
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="font-serif text-base font-medium">Review</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {a.reviewedAt ? (
              <p className="text-sm text-muted-foreground">
                Last decided {new Date(a.reviewedAt).toLocaleString("en-IN")}
                {a.reviewerLabel ? ` by ${a.reviewerLabel}` : ""}.
                {a.reviewNote ? (
                  <>
                    {" "}
                    Note: <span className="text-foreground">{a.reviewNote}</span>
                  </>
                ) : null}
              </p>
            ) : null}
            <ApplicationReviewPanel
              id={a.id}
              sponsorCode={a.sponsorCodeSnapshot}
              requestedSide={a.preferredLeg}
              canApprove={canApprove}
              status={a.status}
              hasMember={Boolean(a.memberProfileId)}
            />
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-muted-foreground">{k}</span>
      <span className="text-right font-medium text-foreground">{v}</span>
    </div>
  );
}
