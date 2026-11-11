import { BRAND } from "@/lib/brand";
import { clipRef, combinedPassResults, formatCount, matchSummary, perGame, type ClipRef, type GameStats, type PassResultBreakdown } from "@/lib/stats";

type StatsGamePdfSheetProps = {
  stats: GameStats;
  photoUrl: string;
  logoUrl: string;
  clubLogoUrl: string;
  opponentLogoUrl: string;
};

type PrintTone = "green" | "yellow" | "blue" | "mint" | "grey" | "pass-progressive" | "pass-lost";

type Tone = "blue" | "red" | "burnt" | "warn" | "pass-progressive" | "pass-neutral" | "pass-lost";

function PdfPlay({ clip }: { clip?: ClipRef }) {
  if (!clip?.hasClip) return null;
  const icon = (
    // eslint-disable-next-line @next/next/no-img-element
    <img src="/brand/play-icon.png" alt="" className="spdf-play__icon" width={14} height={14} />
  );
  if (!clip.href) return <span className="spdf-play spdf-play--pending">{icon}</span>;
  return (
    <a className="spdf-play" href={clip.href} data-pdf-link={clip.href} target="_blank" rel="noreferrer" aria-label="Open video">
      {icon}
    </a>
  );
}

function pct(value: number, total: number): number {
  return total > 0 ? Math.round((value / total) * 100) : 0;
}

function StatTiles({
  items,
}: {
  items: { label: string; value: number; tone?: Tone; detail?: string; emphasizeDetail?: boolean }[];
}) {
  return (
    <ul className="spdf-stats">
      {items.map((item) => (
        <li key={item.label} className={`spdf-stat${item.emphasizeDetail ? " spdf-stat--lost-plays" : ""}`}>
          <span className={`spdf-stat__value${item.tone ? ` spdf-stat__value--${item.tone}` : ""}`}>{formatCount(item.value)}</span>
          <span className="spdf-stat__label">{item.label}</span>
          {item.detail ? (
            <span className={`spdf-stat__detail${item.emphasizeDetail ? " spdf-stat__detail--lost-plays" : ""}`}>{item.detail}</span>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

function PassResultPanel({
  title,
  breakdown,
  videos,
  wide = false,
  compact = false,
}: {
  title: string;
  breakdown: PassResultBreakdown;
  videos?: GameStats["videos"];
  wide?: boolean;
  compact?: boolean;
}) {
  const total = breakdown.progressive + breakdown.neutral + breakdown.lost;
  const turnovers = Math.min(breakdown.turnovers ?? 0, breakdown.lost);
  const bar = [
    { key: "progressive", value: breakdown.progressive, tone: "pass-progressive", host: false },
    { key: "inaccurate", value: breakdown.lost, tone: "pass-inaccurate", host: true },
    { key: "other", value: breakdown.neutral, tone: "pass-neutral", host: false },
  ].filter((segment) => segment.value > 0);
  const legend = [
    {
      key: "progressive",
      label: "Progressive Pass",
      value: breakdown.progressive,
      tone: "pass-progressive",
      nested: false,
      clip: clipRef(videos, "Progressive Passes", "Progressive Pass"),
    },
    {
      key: "inaccurate",
      label: "Inaccurate Pass",
      value: breakdown.lost,
      tone: "pass-inaccurate",
      nested: false,
      clip: clipRef(videos, "Inaccurate Passes", "Inaccurate Pass"),
    },
    {
      key: "turnover",
      label: "Turnover Pass",
      value: turnovers,
      tone: "pass-turnover",
      nested: true,
      clip: clipRef(videos, "Turnover Passes", "Turnover Pass"),
    },
    { key: "other", label: "Other", value: breakdown.neutral, tone: "pass-neutral", nested: false, clip: undefined },
  ].filter((segment) => segment.value > 0);

  return (
    <div className={`spdf-pass-panel${wide ? " spdf-pass-panel--wide" : ""}${compact ? " spdf-pass-panel--total" : ""}`}>
      <div className="spdf-pass-panel__head">
        <p className="spdf-pass-panel__title">{title}</p>
        <span className="spdf-pass-panel__total">{formatCount(total)} passes</span>
      </div>
      {compact ? (
        <div className="spdf-pass-panel__meter" style={{ gridTemplateColumns: bar.map((segment) => `${segment.value}fr`).join(" ") }}>
          {bar.map((segment) => (
            <span key={segment.key} className={`spdf-pass-panel__seg spdf-pass-panel__seg--${segment.tone}`} />
          ))}
          {legend
            .filter((segment) => !segment.nested)
            .map((segment) => (
            <div key={`${segment.key}-caption`} className="spdf-pass-panel__cap">
              <span className="spdf-pass-panel__cap-label">
                <span className={`spdf-pass-panel__dot spdf-pass-panel__dot--${segment.tone}`} />
                {segment.label}
              </span>
              <strong>
                {formatCount(segment.value)} · {pct(segment.value, total)}%
              </strong>
            </div>
          ))}
        </div>
      ) : (
        <>
          <div className="spdf-pass-panel__track">
            {bar.map((segment) => (
              <span
                key={segment.key}
                className={`spdf-pass-panel__seg spdf-pass-panel__seg--${segment.tone}${segment.host ? " spdf-pass-panel__seg--host" : ""}`}
                style={{ width: `${pct(segment.value, total)}%` }}
              >
                {segment.host && turnovers > 0 ? (
                  <span className="spdf-pass-panel__seg-inner spdf-pass-panel__seg--pass-turnover" style={{ width: `${pct(turnovers, segment.value)}%` }} />
                ) : null}
              </span>
            ))}
          </div>
          <ul className="spdf-pass-panel__legend">
            {legend.map((segment) => (
              <li key={segment.key} className={segment.nested ? "is-nested" : undefined}>
                <span className={`spdf-pass-panel__dot spdf-pass-panel__dot--${segment.tone}`} />
                <span className="spdf-pass-panel__legend-label">
                  {segment.label}
                  <PdfPlay clip={segment.clip} />
                </span>
                <strong>
                  {segment.nested ? formatCount(segment.value) : `${formatCount(segment.value)} · ${pct(segment.value, total)}%`}
                </strong>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

type PdfPossessionSegTone =
  | "retained"
  | "lost-plays"
  | "dispossessed"
  | "wrong-pass"
  | "lost-yellow-deep"
  | "lost-yellow-mid"
  | "lost-yellow-light";

function PdfPossessionStatCard({
  label,
  value,
  share,
  tone,
  perGameLabel,
}: {
  label: string;
  value: number;
  share: number;
  tone: "retained" | "lost-plays" | "turnovers";
  perGameLabel?: string;
}) {
  return (
    <div className={`spdf-possession-stat spdf-possession-stat--${tone}`}>
      <span className="spdf-possession-stat__label">{label}</span>
      <span className="spdf-possession-stat__value">{formatCount(value)}</span>
      <span className="spdf-possession-stat__pct">{share}% of possessions</span>
      {perGameLabel ? <span className="spdf-possession-stat__per">{perGameLabel}</span> : null}
    </div>
  );
}

function PdfPossessionSplit({
  title,
  rows,
}: {
  title: string;
  rows: { label: string; value: number; tone: "lost-yellow-deep" | "lost-yellow-mid"; clip?: ClipRef }[];
}) {
  const scale = Math.max(
    rows.reduce((sum, row) => sum + row.value, 0),
    1,
  );

  return (
    <div className="spdf-pass-panel spdf-possession-split">
      <p className="spdf-pass-panel__title">{title}</p>
      <ul className="spdf-possession-rows">
        {rows.map((row) => (
          <li key={row.label} className="spdf-possession-row">
            <span className="spdf-possession-row__label">
              {row.label}
              <PdfPlay clip={row.clip} />
            </span>
            <span className="spdf-possession-row__track">
              <span className={`spdf-possession-row__fill spdf-pass-panel__seg--${row.tone}`} style={{ width: `${pct(row.value, scale)}%` }} />
            </span>
            <strong>{formatCount(row.value)}</strong>
          </li>
        ))}
      </ul>
    </div>
  );
}

function PdfSection({
  title,
  kpi,
  unit,
  aside,
  children,
  footer,
  size = "md",
  className,
  panelOnly,
}: {
  title: string;
  kpi: number;
  unit: string;
  aside?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: "md" | "lg";
  className?: string;
  panelOnly?: boolean;
}) {
  return (
    <section
      className={`spdf-section spdf-section--build-up spdf-section--${size}${panelOnly ? " spdf-section--panel-only" : ""}${className ? ` ${className}` : ""}`}
    >
      <div className="spdf-section__top">
        <p className="spdf-section__phase">Build-Up</p>
        <h3 className="spdf-section__title">{title}</h3>
      </div>
      <div className="spdf-section__content">
        {panelOnly ? null : (
          <div className={`spdf-section__kpi${aside ? " spdf-section__kpi--aside" : ""}`}>
            <span className="spdf-section__value">{formatCount(kpi)}</span>
            {aside ? <span className="spdf-section__aside">{aside}</span> : null}
            <span className="spdf-section__unit">{unit}</span>
          </div>
        )}
        <div className="spdf-section__panel">{children}</div>
      </div>
      {footer ? <div className="spdf-section__footer">{footer}</div> : null}
    </section>
  );
}

function PdfSide({
  photoUrl,
  logoUrl,
  clubLogoUrl,
  name,
  club,
}: {
  photoUrl: string;
  logoUrl: string;
  clubLogoUrl: string;
  name: string;
  club: string;
}) {
  return (
    <aside className="spdf-side">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={logoUrl} alt="" className="spdf-side__logo" />
      {photoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={photoUrl} alt="" className="spdf-side__photo" />
      ) : (
        <div className="spdf-side__photo spdf-side__photo--placeholder" />
      )}
      <div className="spdf-side__identity">
        <p className="spdf-side__label">Athlete</p>
        <h2 className="spdf-side__name">{name}</h2>
        <p className="spdf-side__club">
          {clubLogoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={clubLogoUrl} alt="" className="spdf-side__club-logo" />
          ) : null}
          {club}
        </p>
      </div>
      <p className="spdf-side__slogan">{BRAND.slogan}</p>
    </aside>
  );
}

function PdfHeader({ title, subtitle, opponentLogoUrl }: { title: string; subtitle: string; opponentLogoUrl: string }) {
  return (
    <header className="spdf-head">
      <div>
        <p className="spdf-head__eyebrow">{BRAND.legal}</p>
        <h1 className="spdf-head__title">{title}</h1>
      </div>
      <div className="spdf-head__meta">
        <span className="spdf-head__match">
          {opponentLogoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={opponentLogoUrl} alt="" className="spdf-head__logo" />
          ) : null}
          <span>{subtitle}</span>
        </span>
      </div>
    </header>
  );
}

function SummaryMeter({
  segments,
}: {
  segments: { label: string; value: string; share: number; tone: PrintTone; clip?: ClipRef }[];
}) {
  const total = segments.reduce((sum, segment) => sum + segment.share, 0);

  return (
    <div className="spdf-summary-meter">
      <div className="spdf-pressure__track">
        {total === 0 ? (
          <span className="spdf-pressure__seg spdf-pressure__seg--grey" style={{ width: "100%" }} />
        ) : (
          segments.map((segment) => (
            <span
              key={segment.label}
              className={`spdf-pressure__seg spdf-pressure__seg--${segment.tone}`}
              style={{ width: `${(segment.share / total) * 100}%` }}
            />
          ))
        )}
      </div>
      <ul className="spdf-pressure__legend">
        {segments.map((segment) => (
          <li key={segment.label}>
            <span className={`spdf-pressure__dot spdf-pressure__dot--${segment.tone}`} />
            <span>
              {segment.label}
              <PdfPlay clip={segment.clip} />
            </span>
            <strong className={`spdf-tone spdf-tone--${segment.tone}`}>{segment.value}</strong>
          </li>
        ))}
      </ul>
    </div>
  );
}

function SummaryStatCard({
  title,
  total,
  totalLabel,
  rate,
  rateLabel,
  perGameLabel,
  segments,
}: {
  title: string;
  total: number;
  totalLabel: string;
  rate?: number;
  rateLabel?: string;
  perGameLabel?: string;
  segments: { label: string; value: string; share: number; tone: PrintTone; clip?: ClipRef }[];
}) {
  return (
    <section className="spdf-section spdf-section--build-up spdf-section--summary">
      <h3 className="spdf-section__title">{title}</h3>
      <div className={`spdf-summary-kpis${rate == null ? " spdf-summary-kpis--single" : ""}`}>
        <div className="spdf-summary-kpi">
          <span className="spdf-summary-kpi__value">{formatCount(total)}</span>
          <span className="spdf-summary-kpi__label">{totalLabel}</span>
          {perGameLabel ? <span className="spdf-summary-kpi__per">{perGameLabel}</span> : null}
        </div>
        {rate != null ? (
          <div className="spdf-summary-kpi spdf-summary-kpi--rate">
            <span className="spdf-summary-kpi__value">{rate}%</span>
            <span className="spdf-summary-kpi__label">{rateLabel}</span>
          </div>
        ) : null}
      </div>
      <SummaryMeter segments={segments} />
    </section>
  );
}

function GoalsAssistsCard({ goals, assists, games }: { goals: number; assists: number; games?: number }) {
  const items = [
    { label: "Goals", value: goals },
    { label: "Assists", value: assists },
  ];

  return (
    <section className="spdf-section spdf-section--build-up spdf-section--summary spdf-section--goals">
      <h3 className="spdf-section__title">Goals &amp; Assists</h3>
      <div className="spdf-summary-kpis">
        {items.map((item) => (
          <div key={item.label} className="spdf-summary-kpi">
            <span className="spdf-summary-kpi__value">{formatCount(item.value)}</span>
            <span className="spdf-summary-kpi__label">{item.label}</span>
            {games ? <span className="spdf-summary-kpi__per">{perGame(item.value, games)} per game</span> : null}
          </div>
        ))}
      </div>
    </section>
  );
}

function SummaryPdfPage({
  stats,
  photoUrl,
  logoUrl,
  clubLogoUrl,
  opponentLogoUrl,
}: StatsGamePdfSheetProps) {
  const summary = matchSummary(stats);
  if (!summary) return null;
  const games = stats.meta.games;

  return (
    <article className="stats-pdf" aria-hidden="true">
      <PdfSide
        photoUrl={photoUrl}
        logoUrl={logoUrl}
        clubLogoUrl={clubLogoUrl}
        name={stats.player.name}
        club={stats.player.club}
      />
      <div className="spdf-main spdf-main--stats">
        <PdfHeader title={stats.meta.title} subtitle={stats.meta.subtitle} opponentLogoUrl={opponentLogoUrl} />
        <div className="spdf-summary">
          <SummaryStatCard
            title="General passing"
            total={summary.totalPasses}
            totalLabel="Total passes"
            rate={summary.accuracy}
            rateLabel="Accurate"
            perGameLabel={games ? `${perGame(summary.totalPasses, games)} per game` : undefined}
            segments={[
              { label: "Accurate", value: formatCount(summary.accurate), share: summary.accurate, tone: "pass-progressive" },
              {
                label: "Inaccurate",
                value: formatCount(summary.inaccurate),
                share: summary.inaccurate,
                tone: "grey",
                clip: clipRef(stats.videos, "Inaccurate Passes", "Inaccurate Pass"),
              },
            ]}
          />
          <SummaryStatCard
            title="Progressive passes"
            total={summary.progressive}
            totalLabel="Progressive passes"
            rate={summary.progressiveShare}
            rateLabel="% of passes"
            perGameLabel={games ? `${perGame(summary.progressive, games)} per game` : undefined}
            segments={[
              {
                label: "Progressive",
                value: formatCount(summary.progressive),
                share: summary.progressive,
                tone: "pass-progressive",
                clip: clipRef(stats.videos, "Progressive Passes", "Progressive Pass"),
              },
              {
                label: "Other passes",
                value: formatCount(summary.totalPasses - summary.progressive),
                share: summary.totalPasses - summary.progressive,
                tone: "grey",
              },
            ]}
          />
          {summary.offensiveWon + summary.offensiveLost > 0 ? (
          <SummaryStatCard
            title="Offensive duels"
            total={summary.offensiveWon + summary.offensiveLost}
            totalLabel="Total duels"
            rate={summary.offensiveWinRate}
            rateLabel="Won rate"
            perGameLabel={
              games ? `${perGame(summary.offensiveWon + summary.offensiveLost, games)} per game` : undefined
            }
            segments={[
              {
                label: "Won",
                value: formatCount(summary.offensiveWon),
                share: summary.offensiveWon,
                tone: "pass-progressive",
                clip: clipRef(stats.videos, "Off. Duels Won", "Off Duels Won"),
              },
              {
                label: "Lost",
                value: formatCount(summary.offensiveLost),
                share: summary.offensiveLost,
                tone: "grey",
                clip: clipRef(stats.videos, "Off. Duels Lost", "Off Duels Lost"),
              },
            ]}
          />
          ) : null}
          <SummaryStatCard
            title="Defensive duels"
            total={summary.defensiveWon + summary.defensiveLost}
            totalLabel="Total duels"
            rate={summary.defensiveWinRate}
            rateLabel="Won rate"
            perGameLabel={
              games ? `${perGame(summary.defensiveWon + summary.defensiveLost, games)} per game` : undefined
            }
            segments={[
              {
                label: "Won",
                value: formatCount(summary.defensiveWon),
                share: summary.defensiveWon,
                tone: "pass-progressive",
                clip: clipRef(stats.videos, "Def. Duels Won", "Def Duels Won"),
              },
              {
                label: "Lost",
                value: formatCount(summary.defensiveLost),
                share: summary.defensiveLost,
                tone: "grey",
                clip: clipRef(stats.videos, "Def. Duels Lost", "Def Duels Lost"),
              },
            ]}
          />
          <SummaryStatCard
            title="Tackles"
            total={summary.regains}
            totalLabel="Total tackles"
            perGameLabel={games ? `${perGame(summary.regains, games)} per game` : undefined}
            segments={[
              {
                label: "Interceptions",
                value: formatCount(summary.interceptions),
                share: summary.interceptions,
                tone: "blue",
                clip: clipRef(stats.videos, "Interceptions"),
              },
              {
                label: "Recoveries",
                value: formatCount(summary.recoveries),
                share: summary.recoveries,
                tone: "mint",
                clip: clipRef(stats.videos, "Recoveries"),
              },
            ]}
          />
          <GoalsAssistsCard goals={summary.goals} assists={summary.assists} games={games} />
        </div>
        <footer className="spdf-foot">
          <span>{BRAND.name}</span>
          <span>
            {stats.player.name} · {stats.meta.subtitle}
          </span>
        </footer>
      </div>
    </article>
  );
}

function PageSection({
  title,
  kpi,
  unit,
  note,
  children,
}: {
  title: string;
  kpi: number;
  unit: string;
  note?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="spdf-section spdf-section--build-up spdf-p2-section">
      <div className="spdf-p2-head">
        <p className="spdf-p2-head__phase">Build-Up</p>
        <h3 className="spdf-p2-head__title">{title}</h3>
      </div>
      <div className="spdf-p2-body">
        <div className="spdf-p2-kpi">
          <span className="spdf-p2-kpi__value">{formatCount(kpi)}</span>
          <span className="spdf-p2-kpi__unit">{unit}</span>
          {note ? <span className="spdf-p2-kpi__note">{note}</span> : null}
        </div>
        <div className="spdf-p2-content">{children}</div>
      </div>
    </section>
  );
}

function PassResultsRow({ breakdown, videos }: { breakdown: PassResultBreakdown; videos?: GameStats["videos"] }) {
  const total = breakdown.progressive + breakdown.neutral + breakdown.lost;
  const turnovers = Math.min(breakdown.turnovers ?? 0, breakdown.lost);
  const items = [
    {
      key: "progressive",
      label: "Progressive Pass",
      value: breakdown.progressive,
      tone: "pass-progressive",
      clip: clipRef(videos, "Progressive Passes", "Progressive Pass"),
      nested: false,
    },
    {
      key: "inaccurate",
      label: "Inaccurate Pass",
      value: breakdown.lost,
      tone: "pass-inaccurate",
      clip: clipRef(videos, "Inaccurate Passes", "Inaccurate Pass"),
      nested: false,
    },
    {
      key: "turnover",
      label: "Turnover Pass",
      value: turnovers,
      tone: "pass-turnover",
      clip: clipRef(videos, "Turnover Passes", "Turnover Pass"),
      nested: true,
    },
    { key: "other", label: "Other", value: breakdown.neutral, tone: "pass-neutral", clip: undefined, nested: false },
  ];
  const bar = [
    { key: "progressive", value: breakdown.progressive, tone: "pass-progressive", host: false },
    { key: "inaccurate", value: breakdown.lost, tone: "pass-inaccurate", host: true },
    { key: "other", value: breakdown.neutral, tone: "pass-neutral", host: false },
  ].filter((segment) => segment.value > 0);

  return (
    <div className="spdf-p2-pass">
      <div className="spdf-p2-pass__track">
        {bar.map((segment) => (
          <span
            key={segment.key}
            className={`spdf-pass-panel__seg spdf-pass-panel__seg--${segment.tone}${segment.host ? " spdf-pass-panel__seg--host" : ""}`}
            style={{ width: `${pct(segment.value, total)}%` }}
          >
            {segment.host && turnovers > 0 ? (
              <span
                className="spdf-pass-panel__seg-inner spdf-pass-panel__seg--pass-turnover"
                style={{ width: `${pct(turnovers, segment.value)}%` }}
              />
            ) : null}
          </span>
        ))}
      </div>
      <ul className="spdf-p2-pass__legend">
        {items.map((item) => (
          <li key={item.key} className={`spdf-p2-pass__item${item.nested ? " is-nested" : ""}`}>
            <span className="spdf-p2-pass__label">
              <span className={`spdf-pass-panel__dot spdf-pass-panel__dot--${item.tone}`} />
              {item.label}
              <PdfPlay clip={item.clip} />
            </span>
            <strong className="spdf-p2-pass__value">
              {formatCount(item.value)}
              {item.nested ? null : <em> · {pct(item.value, total)}%</em>}
            </strong>
          </li>
        ))}
      </ul>
    </div>
  );
}

function RunCard({ title, total, received, clip }: { title: string; total: number; received: number; clip?: ClipRef }) {
  const missed = Math.max(total - received, 0);
  return (
    <div className="spdf-p2-run">
      <div className="spdf-p2-run__top">
        <span className="spdf-p2-run__title">
          {title}
          <PdfPlay clip={clip} />
        </span>
        <span className="spdf-p2-run__figure">
          <strong>{formatCount(received)}</strong>/{formatCount(total)} <em>received</em>
        </span>
      </div>
      <div className="spdf-p2-run__track">
        {received > 0 ? (
          <span className="spdf-pass-panel__seg spdf-pass-panel__seg--pass-progressive" style={{ width: `${pct(received, total)}%` }} />
        ) : null}
        <span className="spdf-pass-panel__seg spdf-pass-panel__seg--pass-neutral" style={{ width: `${total === 0 ? 100 : pct(missed, total)}%` }} />
      </div>
      <ul className="spdf-p2-run__legend">
        <li>
          <span className="spdf-pass-panel__dot spdf-pass-panel__dot--pass-progressive" />
          Received the ball <strong>{formatCount(received)}</strong>
        </li>
        <li>
          <span className="spdf-pass-panel__dot spdf-pass-panel__dot--pass-neutral" />
          Not received <strong>{formatCount(missed)}</strong>
        </li>
      </ul>
    </div>
  );
}

export function StatsGamePdfSheet({ stats, photoUrl, logoUrl, clubLogoUrl, opponentLogoUrl }: StatsGamePdfSheetProps) {
  const { player, meta, passesUnderPressure, passResults, possessions, attackingMovement } = stats;
  const games = meta.games;
  const turnovers = (possessions.passTurnover ?? 0) + (possessions.duelTurnover ?? 0);
  const retained = Math.max(possessions.total - possessions.lostPlays, 0);

  return (
    <>
      <SummaryPdfPage
        stats={stats}
        photoUrl={photoUrl}
        logoUrl={logoUrl}
        clubLogoUrl={clubLogoUrl}
        opponentLogoUrl={opponentLogoUrl}
      />
      <article className="stats-pdf" aria-hidden="true">
        <PdfSide photoUrl={photoUrl} logoUrl={logoUrl} clubLogoUrl={clubLogoUrl} name={player.name} club={player.club} />

        <div className="spdf-main">
          <PdfHeader title={meta.title} subtitle={meta.subtitle} opponentLogoUrl={opponentLogoUrl} />

          <div className="spdf-p2-stack">
            <PageSection title="Pass Results" kpi={passesUnderPressure.total} unit="Passes">
              <PassResultsRow breakdown={combinedPassResults(passResults)} videos={stats.videos} />
            </PageSection>

            {attackingMovement ? (
              <PageSection
                title="Attacking Movement"
                kpi={attackingMovement.overlaps.total + attackingMovement.underlaps.total}
                unit="Runs"
                note={`${attackingMovement.overlaps.received + attackingMovement.underlaps.received} received`}
              >
                <div className="spdf-p2-runs">
                  <RunCard
                    title="Overlaps"
                    total={attackingMovement.overlaps.total}
                    received={attackingMovement.overlaps.received}
                    clip={clipRef(stats.videos, "Overlaps", "Overlap")}
                  />
                  <RunCard
                    title="Underlaps"
                    total={attackingMovement.underlaps.total}
                    received={attackingMovement.underlaps.received}
                    clip={clipRef(stats.videos, "Underlaps", "Underlap")}
                  />
                </div>
              </PageSection>
            ) : null}

            <PageSection title="Possessions" kpi={possessions.total} unit="Total possessions">
              <div className="spdf-p2-poss">
                <PdfPossessionStatCard label="Retained" value={retained} share={pct(retained, possessions.total)} tone="retained" />
                <PdfPossessionStatCard
                  label="Lost plays"
                  value={possessions.lostPlays}
                  share={pct(possessions.lostPlays, possessions.total)}
                  tone="lost-plays"
                  perGameLabel={games ? `${perGame(possessions.lostPlays, games)} per game` : undefined}
                />
                <PdfPossessionStatCard
                  label="Turnovers"
                  value={turnovers}
                  share={pct(turnovers, possessions.total)}
                  tone="turnovers"
                  perGameLabel={games ? `${perGame(turnovers, games)} per game` : undefined}
                />
                <PdfPossessionSplit
                  title="Lost play breakdown"
                  rows={[
                    {
                      label: "Lost Duels",
                      value: possessions.lostBalls,
                      tone: "lost-yellow-deep",
                      clip: clipRef(stats.videos, "Off. Duels Lost", "Off Duels Lost"),
                    },
                    {
                      label: "Inaccurate Pass",
                      value: possessions.wrongPasses,
                      tone: "lost-yellow-mid",
                      clip: clipRef(stats.videos, "Inaccurate Passes", "Inaccurate Pass"),
                    },
                  ]}
                />
                <PdfPossessionSplit
                  title="Turnover breakdown"
                  rows={[
                    {
                      label: "Turnover Duel",
                      value: possessions.duelTurnover ?? 0,
                      tone: "lost-yellow-deep",
                      clip: clipRef(stats.videos, "Turnover Duels", "Turnover Duel"),
                    },
                    {
                      label: "Turnover Pass",
                      value: possessions.passTurnover ?? 0,
                      tone: "lost-yellow-mid",
                      clip: clipRef(stats.videos, "Turnover Passes", "Turnover Pass"),
                    },
                  ]}
                />
              </div>
            </PageSection>
          </div>

          <footer className="spdf-foot">
            <span>{BRAND.name}</span>
            <span>
              {player.name} · {meta.subtitle}
            </span>
          </footer>
        </div>
      </article>
    </>
  );
}
