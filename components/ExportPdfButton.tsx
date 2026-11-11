"use client";

import { useState } from "react";
import { createRoot } from "react-dom/client";
import { StatsGamePdfSheet } from "@/components/StatsGamePdfSheet";
import { useVideoLinks } from "@/components/VideoLinksContext";
import { BRAND } from "@/lib/brand";
import { exportStatsSlidesToPdf } from "@/lib/exportPdf";
import type { GameStats } from "@/lib/stats";

type ExportPdfButtonProps = {
  stats: GameStats;
};

export function ExportPdfButton({ stats }: ExportPdfButtonProps) {
  const { mergeIntoStats } = useVideoLinks();
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generatePdf() {
    setError(null);
    setExporting(true);

    const host = document.createElement("div");
    host.className = "stats-pdf-host";
    document.body.appendChild(host);

    const origin = window.location.origin;
    const exportStats = mergeIntoStats(stats);
    const root = createRoot(host);

    try {
      root.render(
        <StatsGamePdfSheet
          stats={exportStats}
          photoUrl={stats.player.photo ? `${origin}${stats.player.photo}` : ""}
          logoUrl={`${origin}${BRAND.logoTrimmed}`}
          clubLogoUrl={stats.player.clubLogo ? `${origin}${stats.player.clubLogo}` : ""}
          opponentLogoUrl={stats.opponentLogo ? `${origin}${stats.opponentLogo}` : ""}
        />,
      );
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      });

      const safeName = stats.player.name
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
      const session = stats.meta.fileSlug?.trim() || stats.meta.session?.trim() || "002";
      const sheets = Array.from(host.querySelectorAll(".stats-pdf")).filter(
        (node): node is HTMLElement => node instanceof HTMLElement,
      );
      if (sheets.length === 0) {
        throw new Error("Could not prepare the PDF layout.");
      }

      await exportStatsSlidesToPdf(sheets, `${safeName || "athlete"}-stats-${session}.pdf`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "PDF export failed.");
    } finally {
      root.unmount();
      host.remove();
      setExporting(false);
    }
  }

  return (
    <div className="export-pdf">
      <button type="button" className="btn btn--primary btn--block" disabled={exporting} onClick={() => void generatePdf()}>
        <svg className="export-pdf__icon" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 3v12m0 0-5-5m5 5 5-5M5 21h14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        {exporting ? "Building PDF…" : "Download PDF report"}
      </button>
      {error ? <p className="export-pdf__error">{error}</p> : null}
    </div>
  );
}
