import Image from "next/image";
import Link from "next/link";

const LOGO_VARIANTS = {
  header: "https://ik.imagekit.io/kxh5yidni/Amaashop/Amaashop-new-logo-removebg-preview.png",
  footer: "https://ik.imagekit.io/kxh5yidni/Amaashop/Amaashop-new-logo-removebg-preview.png",
} as const;

export function Logo({
  variant = "header",
  className,
  imgClassName,
}: {
  variant?: keyof typeof LOGO_VARIANTS;
  className?: string;
  /** Overrides the default responsive sizing on the logo image. */
  imgClassName?: string;
}) {
  return (
    <Link href="/" className={className ?? "flex shrink-0 items-center"} aria-label="AmaaShop home">
      <Image
        src={LOGO_VARIANTS[variant]}
        alt="AmaaShop"
        width={260}
        height={115}
        className={
          imgClassName ??
          (variant === "header" ? "h-12 w-auto md:h-14 lg:h-16" : "h-11 w-auto")
        }
        priority={variant === "header"}
      />
    </Link>
  );
}
