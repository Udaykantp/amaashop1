import Decimal from "decimal.js";

/**
 * Money helpers. Every rupee value in the platform is a Decimal — never a JS
 * `number` — so rounding is explicit and arithmetic is exact. Firestore has no
 * native decimal type, so `Money` is persisted as a fixed 2dp string
 * ("1234.50") via `moneyToFirestore`/`moneyFromFirestore` and kept as a
 * `Decimal.js` instance everywhere in memory. Use these helpers rather than
 * the operators directly so rounding policy stays in one place.
 */

export type Money = Decimal;
export const Money = Decimal;

/** Round-half-up to paise (2 dp) — the rounding mode used across the platform. */
const ROUNDING = Decimal.ROUND_HALF_UP;

export function money(value: Decimal.Value): Money {
  return new Decimal(value).toDecimalPlaces(2, ROUNDING);
}

export const ZERO: Money = money(0);

export function add(...values: Decimal.Value[]): Money {
  return money(values.reduce<Money>((acc, v) => acc.plus(v), new Decimal(0)));
}

export function sub(a: Decimal.Value, b: Decimal.Value): Money {
  return money(new Decimal(a).minus(b));
}

export function mul(a: Decimal.Value, b: Decimal.Value): Money {
  return money(new Decimal(a).times(b));
}

/** Apply a rate expressed in basis points (500 bps = 5%). */
export function applyBps(amount: Decimal.Value, bps: number): Money {
  return money(new Decimal(amount).times(bps).dividedBy(10_000));
}

export function isNegative(a: Money): boolean {
  return a.isNegative();
}

export function gte(a: Decimal.Value, b: Decimal.Value): boolean {
  return new Decimal(a).gte(b);
}

/**
 * Split `total` into `weights.length` parts proportional to `weights`, such
 * that the parts sum EXACTLY to `total` (the rounding remainder lands on the
 * last non-zero-weight part). Used by the commission engine to divide a
 * repurchase pool across levels without losing or minting paise.
 */
export function allocate(total: Decimal.Value, weights: number[]): Money[] {
  const t = money(total);
  const weightTotal = weights.reduce((s, w) => s + w, 0);
  if (weightTotal <= 0) return weights.map(() => ZERO);

  const parts: Money[] = [];
  let allocated = new Decimal(0);
  let lastIdx = -1;
  weights.forEach((w, i) => {
    if (w > 0) lastIdx = i;
  });

  weights.forEach((w, i) => {
    if (i === lastIdx) {
      parts.push(money(t.minus(allocated)));
    } else {
      const part = money(t.times(w).dividedBy(weightTotal));
      parts.push(part);
      allocated = allocated.plus(part);
    }
  });
  return parts;
}

/** Format for UI: "₹1,234.50". Display only — never feed back into arithmetic. */
export function formatINR(value: Decimal.Value): string {
  const n = new Decimal(value).toNumber();
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
  }).format(n);
}

/** Firestore has no Decimal type — persist as a fixed 2dp string. */
export function moneyToFirestore(value: Decimal.Value): string {
  return money(value).toFixed(2);
}

/** Inverse of `moneyToFirestore`. Missing/undefined reads back as zero. */
export function moneyFromFirestore(value: string | null | undefined): Money {
  return value == null ? ZERO : money(value);
}
