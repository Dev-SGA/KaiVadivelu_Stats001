import Image from "next/image";
import { BRAND, LOGO_DIMENSIONS, type LogoSize, type LogoVariant } from "@/lib/brand";

type SgaLogoProps = {
  variant?: LogoVariant;
  size?: LogoSize;
  className?: string;
  priority?: boolean;
};

export function SgaLogo({
  variant = "horizontal",
  size,
  className,
  priority = false,
}: SgaLogoProps) {
  const dims = LOGO_DIMENSIONS[variant];
  const sizeClass = size ?? dims.className;
  const src = BRAND.logos[variant];

  return (
    <Image
      src={src}
      alt={`${BRAND.name} — ${BRAND.legal}`}
      width={dims.width}
      height={dims.height}
      className={`sga-logo sga-logo--${variant} sga-logo--${sizeClass}${className ? ` ${className}` : ""}`}
      priority={priority}
    />
  );
}
