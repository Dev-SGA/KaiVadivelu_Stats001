import { GameStatsReport } from "@/components/GameStatsReport";
import { getStatsReport } from "@/lib/stats";

export default function HomePage() {
  const report = getStatsReport();
  return <GameStatsReport report={report} />;
}
