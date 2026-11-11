import { formatCount } from "@/lib/stats";

type CountLineProps = {
  value: number;
  unit: string;
  games?: number;
  className?: string;
};

function avgPerGame(total: number, games: number): string {
  const value = games > 0 ? total / games : 0;
  return (Math.round(value * 10) / 10).toFixed(1);
}

/** Season readout: "203 passes | 67.7 avg per game". */
export function CountLine({ value, unit, games, className }: CountLineProps) {
  if (!games || games <= 0) return null;

  return (
    <p className={`count-line${className ? ` ${className}` : ""}`}>
      <span className="count-line__main">
        {formatCount(value)} {unit}
      </span>
      <span className="count-line__sep" aria-hidden="true">
        |
      </span>
      <span className="count-line__avg">{avgPerGame(value, games)} avg per game</span>
    </p>
  );
}
