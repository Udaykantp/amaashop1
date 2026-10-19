/**
 * Decorative transition from the page background into the dark footer —
 * an SVG wave rather than a hard edge, so the footer reads as one
 * continuous surface instead of a bar bolted onto the bottom of the page.
 */
export function WaveDivider() {
  return (
    <svg
      viewBox="0 0 1440 60"
      preserveAspectRatio="none"
      className="block h-8 w-full text-neutral-900 lg:h-12"
      aria-hidden="true"
    >
      <path
        fill="currentColor"
        d="M0,32 C240,60 480,4 720,20 C960,36 1200,58 1440,28 L1440,60 L0,60 Z"
      />
    </svg>
  );
}
