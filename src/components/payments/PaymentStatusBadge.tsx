import React from "react";
import { Badge, BadgeProps } from "@/components/ui/Badge";
import type { PaymentStatus } from "@/types/payment";

const STATUS_META: Record<PaymentStatus, { variant: NonNullable<BadgeProps["variant"]>; label: string; title: string }> = {
  PAID: { variant: "success", label: "PAID", title: "Monthly fee paid" },
  UNPAID: { variant: "danger", label: "UNPAID", title: "Came to class this month, fee not paid yet" },
  WAIVED: { variant: "info", label: "WAIVED", title: "Fee waived for this month" },
  NO_CLASS: {
    variant: "neutral",
    label: "NO CLASS · NO FEE",
    title: "Not marked Present or Late on any day this month, so no fee is due",
  },
};

/** Old records may still say PARTIALLY_PAID; part payments were removed, so show them as unpaid. */
function toStatus(status: string | undefined): PaymentStatus {
  return status && status in STATUS_META ? (status as PaymentStatus) : "UNPAID";
}

export const PaymentStatusBadge: React.FC<{
  status: string | undefined;
  size?: BadgeProps["size"];
  dot?: boolean;
  className?: string;
}> = ({ status, size = "sm", dot = true, className }) => {
  const meta = STATUS_META[toStatus(status)];
  return (
    <Badge variant={meta.variant} size={size} dot={dot} title={meta.title} className={className}>
      {meta.label}
    </Badge>
  );
};
