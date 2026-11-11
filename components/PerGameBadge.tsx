import { perGame } from "@/lib/stats";

type PerGameBadgeProps = {
  total: number;
  games: number;
  className?: string;
  /** Smaller inline caption for stat cards */
  subtle?: boolean;
};

export function PerGameBadge({ total, games, className, subtle }: PerGameBadgeProps) {
  if (games <= 0) return null;
  const avg = perGame(total, games);

  if (subtle) {
    return (
      <span className={`per-game-badge-subtle${className ? ` ${className}` : ""}`}>
        {avg} per game · {games} matches
      </span>
    );
  }

  return (
    <div className={`per-game-badge${className ? ` ${className}` : ""}`}>
      <span className="per-game-badge__avg">{avg}</span>
      <span className="per-game-badge__text">
        <span className="per-game-badge__label">avg per game</span>
        <span className="per-game-badge__games">{games} matches</span>
      </span>
    </div>
  );
}
