"use client";

import { Pencil } from "lucide-react";
import { useState } from "react";
import { updateMemberPhoneAction } from "@/actions/admin";
import { useAdminAction } from "@/components/admin/use-admin-action";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/** Inline "Phone" row on the member detail page — editable when the admin has `member.edit`. */
export function MemberPhoneField({
  userId,
  phone,
  canEdit,
}: {
  userId: string;
  phone: string | null;
  canEdit: boolean;
}) {
  const { pending, run } = useAdminAction();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(phone ?? "");

  if (!canEdit) {
    return <>{phone ?? "—"}</>;
  }

  if (!editing) {
    return (
      <span className="inline-flex items-center gap-1.5">
        <span>{phone ?? "—"}</span>
        <button
          type="button"
          onClick={() => {
            setValue(phone ?? "");
            setEditing(true);
          }}
          className="text-muted-foreground hover:text-foreground"
          aria-label={phone ? "Edit phone number" : "Add phone number"}
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5">
      <Input
        autoFocus
        value={value}
        onChange={(e) => setValue(e.target.value)}
        type="tel"
        inputMode="numeric"
        maxLength={10}
        placeholder="9876543210"
        className="h-7 w-32 text-xs"
      />
      <Button
        size="sm"
        className="h-7 px-2 text-xs"
        disabled={pending || value.trim().length === 0}
        onClick={() =>
          run(() => updateMemberPhoneAction(userId, value), {
            onSuccess: () => setEditing(false),
          })
        }
      >
        Save
      </Button>
      <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" disabled={pending} onClick={() => setEditing(false)}>
        Cancel
      </Button>
    </span>
  );
}
