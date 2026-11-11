"use client";

import { useEffect, useMemo, useState } from "react";
import { AthleteProfileCard } from "@/components/AthleteProfileCard";
import { ExportPdfButton } from "@/components/ExportPdfButton";
import { VideoLinksProvider } from "@/components/VideoLinksContext";
import { MetricFlow } from "@/components/MetricFlow";
import { SgaBrand } from "@/components/SgaBrand";
import { SgaCornerBrand } from "@/components/SgaCornerBrand";
import { AttackingMovementBoard, PossessionBoard, StatsHeroSideboard } from "@/components/ChicagoExploreViews";
import { CountLine } from "@/components/CountLine";
import { TopicsBoard, type Topic } from "@/components/TopicsBoard";
import { BRAND } from "@/lib/brand";
import {
  clipRef,
  combinedPassResults,
  formatCount,
  matchSummary,
  perGameMatch,
  projectedMatch,
  seasonMatch,
  toGameStats,
  type ClipRef,
  type GameStats,
  type MatchStats,
  type PassResultBreakdown,
  type StatsReport,
} from "@/lib/stats";

type GameStatsReportProps = {
  report: StatsReport;
};

const PASS_PLAY_TIPS = {
  progressive:
    "Progressive Pass — Finding a teammate with a clear opportunity to progress the ball, create a scoring opportunity, or a pass that breaks defensive lines.",
  neutral:
    "Other — Finding a teammate without a clear opportunity to progress the ball, but with a clear option to maintain possession.",
  lost: "Inaccurate Pass — Losing possession through an inaccurate pass or finding a teammate who is immediately under pressure and at high risk of losing possession.",
} as const;

function PassPlayTip({ label, tip, clip }: { label: string; tip: string; clip?: ClipRef }) {
  const className = `pass-play-tip legend__label${clip?.href ? " pass-play-tip--clip" : ""}`;
  const icon = clip?.hasClip ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/brand/play-icon.png"
      alt=""
      className={`play-icon${clip.href ? "" : " play-icon--pending"}`}
      width={14}
      height={14}
    />
  ) : null;
  if (clip?.href) {
    return (
      <a className={className} href={clip.href} target="_blank" rel="noreferrer" data-tip={tip} aria-label={`${label}. ${tip}`}>
        <span className="pass-play-tip__label">
          {label}
          {icon}
        </span>
      </a>
    );
  }
  return (
    <button type="button" className={className} data-tip={tip} aria-label={`${label}. ${tip}`}>
      <span className="pass-play-tip__label">
        {label}
        {icon}
      </span>
    </button>
  );
}

function ClipLegendLabel({ label, clip }: { label: string; clip?: ClipRef }) {
  if (clip?.href) {
    return (
      <a className="legend__label clip-link" href={clip.href} target="_blank" rel="noreferrer">
        {label}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/play-icon.png" alt="" className="play-icon" width={14} height={14} />
      </a>
    );
  }
  return (
    <span className="legend__label">
      {label}
      {clip?.hasClip ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src="/brand/play-icon.png" alt="" className="play-icon play-icon--pending" width={14} height={14} />
      ) : null}
    </span>
  );
}

function percent(value: number, total: number): number {
  return total > 0 ? Math.round((value / total) * 100) : 0;
}

function PassResultsMeter({
  title,
  breakdown,
  games,
  videos,
}: {
  title: string;
  breakdown: PassResultBreakdown;
  games?: number;
  videos?: MatchStats["videos"];
}) {
  const total = breakdown.progressive + breakdown.neutral + breakdown.lost;
  const turnovers = Math.min(breakdown.turnovers ?? 0, breakdown.lost);
  const progressivePct = percent(breakdown.progressive, total);
  const neutralPct = percent(breakdown.neutral, total);

  return (
    <div className="metric-card">
      <h3 className="metric-card__title">{title}</h3>
      {games ? (
        <CountLine value={total} unit="passes" games={games} />
      ) : (
        <p className="metric-card__headline">
          <span>{formatCount(total)} passes</span>
        </p>
      )}
      <div
        className="meter"
        role="img"
        aria-label={`Progressive Pass: ${breakdown.progressive}. Inaccurate Pass: ${breakdown.lost}. Turnover Pass: ${turnovers}. Other: ${breakdown.neutral}.`}
      >
        <span className="meter__seg meter__seg--pass-progressive" style={{ width: `${progressivePct}%` }} />
        <span className="meter__seg meter__seg--pass-inaccurate meter__seg--host" style={{ width: `${percent(breakdown.lost, total)}%` }}>
          {turnovers > 0 ? (
            <span className="meter__seg-inner meter__seg--pass-turnover" style={{ width: `${percent(turnovers, breakdown.lost)}%` }} />
          ) : null}
        </span>
        <span className="meter__seg meter__seg--pass-neutral" style={{ width: `${neutralPct}%` }} />
      </div>
      <ul className="legend">
        <li>
          <span className="legend__dot legend__dot--pass-progressive" />
          <PassPlayTip
            label="Progressive Pass"
            tip={PASS_PLAY_TIPS.progressive}
            clip={clipRef(videos, "Progressive Passes", "Progressive Pass")}
          />
          <strong>
            {formatCount(breakdown.progressive)} · {progressivePct}%
          </strong>
        </li>
        <li>
          <span className="legend__dot legend__dot--pass-inaccurate" />
          <PassPlayTip
            label="Inaccurate Pass"
            tip={PASS_PLAY_TIPS.lost}
            clip={clipRef(videos, "Inaccurate Passes", "Inaccurate Pass")}
          />
          <strong>
            {formatCount(breakdown.lost)} · {percent(breakdown.lost, total)}%
          </strong>
        </li>
        {turnovers > 0 ? (
          <li className="legend__nested">
            <span className="legend__dot legend__dot--pass-turnover" />
            <ClipLegendLabel label="Turnover Pass" clip={clipRef(videos, "Turnover Passes", "Turnover Pass")} />
            <strong>{formatCount(turnovers)}</strong>
          </li>
        ) : null}
        <li>
          <span className="legend__dot legend__dot--pass-neutral" />
          <PassPlayTip label="Other" tip={PASS_PLAY_TIPS.neutral} />
          <strong>
            {formatCount(breakdown.neutral)} · {neutralPct}%
          </strong>
        </li>
      </ul>
    </div>
  );
}

type SeasonMode = "total" | "perGame";

function SeasonModeToggle({ mode, onChange }: { mode: SeasonMode; onChange: (mode: SeasonMode) => void }) {
  const items: { id: SeasonMode; label: string }[] = [
    { id: "total", label: "Total" },
    { id: "perGame", label: "Per game" },
  ];

  return (
    <div className="match-nav__pills season-mode" role="group" aria-label="Season numbers">
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          className={`match-nav__pill${item.id === mode ? " is-active" : ""}`}
          aria-pressed={item.id === mode}
          onClick={() => onChange(item.id)}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

function MatchSwitcher({
  matches,
  activeId,
  onChange,
  children,
}: {
  matches: MatchStats[];
  activeId: string;
  onChange: (id: string) => void;
  children?: React.ReactNode;
}) {
  const index = matches.findIndex((match) => match.id === activeId);

  return (
    <div className="match-nav">
      <div className="match-nav__session" role="group" aria-label="Matches">
        <button
          type="button"
          className="match-nav__arrow"
          onClick={() => onChange(matches[index - 1].id)}
          disabled={index <= 0}
          aria-label="Previous match"
        >
          <span aria-hidden="true">‹</span>
        </button>
        <div className="match-nav__pills">
          {matches.map((match) => (
            <button
              key={match.id}
              type="button"
              className={`match-nav__pill${match.id === activeId ? " is-active" : ""}`}
              aria-pressed={match.id === activeId}
              onClick={() => onChange(match.id)}
            >
              {match.logo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={match.logo} alt="" className="club-logo club-logo--pill" />
              ) : null}
              {match.shortLabel}
            </button>
          ))}
        </div>
        <button
          type="button"
          className="match-nav__arrow"
          onClick={() => onChange(matches[index + 1].id)}
          disabled={index < 0 || index === matches.length - 1}
          aria-label="Next match"
        >
          <span aria-hidden="true">›</span>
        </button>
      </div>
      {children}
    </div>
  );
}

function buildTopics(match: MatchStats): Topic[] {
  const { passResults, possessions, games, videos } = match;
  const scope = match.id === "season" ? "season" : "match";
  const topics: Topic[] = [];
  const summary = matchSummary(match);

  if (summary) {
    topics.push({
      id: "stats",
      title: "Stats",
      phase: "stats",
      content: <StatsHeroSideboard summary={summary} games={games} videos={videos} />,
    });
  }

  topics.push(
    {
      id: "pass-results",
      title: "Pass Results",
      phase: "build-up",
      content: (
        <>
          <PassResultsMeter
            title="Total passes"
            breakdown={combinedPassResults(passResults)}
            games={games}
            videos={videos}
          />
          {passResults.underPressure && passResults.notUnderPressure ? (
            <MetricFlow
              items={[
                <PassResultsMeter
                  key="up"
                  title="Under pressure"
                  breakdown={passResults.underPressure}
                  games={games}
                  videos={videos}
                />,
                <PassResultsMeter
                  key="nop"
                  title="Not under pressure"
                  breakdown={passResults.notUnderPressure}
                  games={games}
                  videos={videos}
                />,
              ]}
            />
          ) : null}
        </>
      ),
    },
    ...(match.attackingMovement
      ? [
          {
            id: "attacking-movement",
            title: "Attacking Movement",
            phase: "build-up" as const,
            content: <AttackingMovementBoard movement={match.attackingMovement} games={games} videos={videos} />,
          },
        ]
      : []),
    {
      id: "possessions",
      title: "Possessions",
      phase: "build-up",
      content: <PossessionBoard possessions={possessions} scopeLabel={scope} games={games} videos={videos} />,
    },
  );

  return topics;
}

export function GameStatsReport({ report }: GameStatsReportProps) {
  const { player, meta, matches } = report;
  const [seasonMode, setSeasonMode] = useState<SeasonMode>("total");
  const options = useMemo(() => {
    const season = seasonMatch(matches);
    return [...matches, seasonMode === "perGame" ? perGameMatch(season) : { ...season, games: undefined }];
  }, [matches, seasonMode]);
  const initialMatchId = matches.find((match) => match.kind === "session")?.id ?? matches[0]?.id ?? "";
  const [matchId, setMatchId] = useState(initialMatchId);
  const match = options.find((item) => item.id === matchId) ?? options[0];
  const [projected, setProjected] = useState(false);
  useEffect(() => setProjected(false), [match.id]);
  const displayMatch = match.minutes && projected ? projectedMatch(match) : match;
  const exportStats: GameStats = useMemo(() => toGameStats(report, displayMatch), [report, displayMatch]);
  const topics = useMemo(() => buildTopics(displayMatch), [displayMatch]);

  return (
    <VideoLinksProvider
      initialPassesUnderPressureVideoLink={match.passesUnderPressure.videoLink}
      initialPassResultsVideoLink={match.passResults.videoLink}
      initialPossessionsVideoLink={match.possessions.videoLink}
    >
      <SgaCornerBrand />

      <div className="shell">
        <header className="report-header">
          <SgaBrand />
          <div className="report-header__intro">
            <p className="report-header__eyebrow">{BRAND.legal}</p>
            <h1 className="report-header__title">{meta.title}</h1>
            <p className="report-header__meta">
              {match.logo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={match.logo} alt="" className="club-logo club-logo--meta" />
              ) : null}
              {match.label}
            </p>
          </div>
        </header>

        <div className="report-grid">
          <AthleteProfileCard name={player.name} club={player.club} clubLogo={player.clubLogo} photoSrc={player.photo}>
            <ExportPdfButton stats={exportStats} />
          </AthleteProfileCard>

          <main className="report-main">
            <div className="view-panel">
              <MatchSwitcher matches={options} activeId={match.id} onChange={setMatchId}>
                {match.id === "season" ? <SeasonModeToggle mode={seasonMode} onChange={setSeasonMode} /> : null}
              </MatchSwitcher>
              <TopicsBoard
                topics={topics}
                minutes={match.minutes}
                projected={projected}
                onProjectedChange={setProjected}
              />
            </div>
          </main>
        </div>

        <footer className="footer">
          <p className="footer__slogan">{BRAND.slogan}</p>
          <p className="footer__rights">All rights reserved.</p>
        </footer>
      </div>
    </VideoLinksProvider>
  );
}
