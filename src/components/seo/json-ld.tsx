/**
 * Renders a JSON-LD payload as an inline script tag. Server-only — never
 * needs hydration. `dangerouslySetInnerHTML` is safe here because every
 * caller passes a JSON.stringify'd plain object, not user-supplied markup.
 */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
