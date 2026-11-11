import { SgaLogo } from "@/components/SgaLogo";

/** Marca fixa no canto inferior esquerdo. */
export function SgaCornerBrand() {
  return (
    <aside className="brand-corner" aria-hidden="true">
      <span className="brand-corner__stripe" />
      <SgaLogo variant="vertical" size="corner" />
    </aside>
  );
}
