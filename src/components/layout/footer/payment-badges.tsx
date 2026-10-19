/**
 * Text badges, not brand logo images — deliberately, since we don't hold
 * licensing for Visa/Mastercard/UPI marks. These reflect the exact payment
 * methods `PaymentStep` actually offers at checkout, not aspirational ones.
 */
const METHODS = ["Visa", "Mastercard", "UPI", "Cash on Delivery"];

export function PaymentBadges() {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {METHODS.map((method) => (
        <span
          key={method}
          className="rounded-md border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-medium text-neutral-300"
        >
          {method}
        </span>
      ))}
    </div>
  );
}
