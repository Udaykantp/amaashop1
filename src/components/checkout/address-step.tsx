"use client";

export interface AddressValues {
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  zip: string;
}

const FIELD_CLASS =
  "h-11 w-full rounded-lg border border-neutral-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500";

export function AddressStep({
  values,
  onChange,
}: {
  values: AddressValues;
  onChange: (field: keyof AddressValues, value: string) => void;
}) {
  return (
    <div className="animate-page-enter rounded-xl border border-neutral-100 bg-white p-4 lg:p-6">
      <h2 className="mb-3 text-base font-bold text-neutral-800 lg:text-lg">Shipping Address</h2>
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 lg:gap-4">
        <div className="lg:col-span-2">
          <label className="mb-1 block text-sm font-medium text-neutral-700">Full Name *</label>
          <input
            required
            type="text"
            autoComplete="name"
            value={values.name}
            onChange={(e) => onChange("name", e.target.value)}
            className={FIELD_CLASS}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700">Email *</label>
          <input
            required
            type="email"
            inputMode="email"
            autoComplete="email"
            value={values.email}
            onChange={(e) => onChange("email", e.target.value)}
            className={FIELD_CLASS}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700">Phone *</label>
          <input
            required
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            value={values.phone}
            onChange={(e) => onChange("phone", e.target.value)}
            className={FIELD_CLASS}
          />
        </div>
        <div className="lg:col-span-2">
          <label className="mb-1 block text-sm font-medium text-neutral-700">Street Address *</label>
          <input
            required
            type="text"
            autoComplete="street-address"
            value={values.address}
            onChange={(e) => onChange("address", e.target.value)}
            className={FIELD_CLASS}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700">City *</label>
          <input
            required
            type="text"
            autoComplete="address-level2"
            value={values.city}
            onChange={(e) => onChange("city", e.target.value)}
            className={FIELD_CLASS}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700">ZIP Code *</label>
          <input
            required
            type="text"
            inputMode="numeric"
            autoComplete="postal-code"
            value={values.zip}
            onChange={(e) => onChange("zip", e.target.value)}
            className={FIELD_CLASS}
          />
        </div>
      </div>
    </div>
  );
}

export function isAddressComplete(values: AddressValues): boolean {
  return Object.values(values).every((v) => v.trim().length > 0);
}
