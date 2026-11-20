"use client";

import { useId, useState } from "react";
import { formatCount, progressMetrics, type MatchStats, type ProgressMetric } from "@/lib/stats";

type Focus = "quantity" | "quality";
type Pt = [number, number];

const COLORS: Record<Focus, string> = { quantity: "#5aa2e0", quality: "#3fb56b" };
const PHASE_LABEL = { "build-up": "Build-Up", defensive: "Defensive Phase" } as const;
const NICE_STEPS = [1, 2, 3, 4, 5, 6, 8, 10, 12, 15, 20, 25, 30, 40, 50, 60, 80, 100, 150, 200, 250, 500, 1000];
const INK = "#04141f";

const W = 470;
const H = 268;
const TICKS = 4;

/** Axis maximum with TICKS evenly spaced "round" gridlines. */
function niceScale(max: number): { top: number; step: number } {
  const target = Math.max(max, 1) * 1.12;
  const step = NICE_STEPS.find((candidate) => candidate * TICKS >= target) ?? Math.ceil(target / TICKS);
  return { top: step * TICKS, step };
}

function pctLabel(value: number): string {
  return `${Math.round(value)}%`;
}

function countLabel(value: number): string {
  return formatCount(Math.round(value * 10) / 10);
}

/** Monotone cubic curve (Fritsch–Carlson): smooth, but never overshoots the recorded values. */
function smoothPath(pts: Pt[]): string {
  if (pts.length < 3) return pts.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x} ${y}`).join(" ");
  const n = pts.length;
  const dx = pts.slice(0, -1).map((p, i) => pts[i + 1][0] - p[0]);
  const slope = pts.slice(0, -1).map((p, i) => (pts[i + 1][1] - p[1]) / dx[i]);
  const m = pts.map((_, i) =>
    i === 0 ? slope[0] : i === n - 1 ? slope[n - 2] : slope[i - 1] * slope[i] <= 0 ? 0 : (slope[i - 1] + slope[i]) / 2,
  );
  for (let i = 0; i < n - 1; i += 1) {
    if (slope[i] === 0) {
      m[i] = 0;
      m[i + 1] = 0;
      continue;
    }
    const a = m[i] / slope[i];
    const b = m[i + 1] / slope[i];
    const s = a * a + b * b;
    if (s > 9) {
      const t = 3 / Math.sqrt(s);
      m[i] = t * a * slope[i];
      m[i + 1] = t * b * slope[i];
    }
  }
  let d = `M${pts[0][0]} ${pts[0][1]}`;
  for (let i = 0; i < n - 1; i += 1) {
    const [x0, y0] = pts[i];
    const [x1, y1] = pts[i + 1];
    d += ` C${x0 + dx[i] / 3} ${y0 + (m[i] * dx[i]) / 3} ${x1 - dx[i] / 3} ${y1 - (m[i + 1] * dx[i]) / 3} ${x1} ${y1}`;
  }
  return d;
}

/** Average and best match of a series. */
function seriesStats(values: number[]) {
  const n = values.length;
  const avg = n > 0 ? values.reduce((sum, value) => sum + value, 0) / n : 0;
  const best = values.indexOf(Math.max(...values));
  return { avg, best };
}

function Delta({ value, unit, tone }: { value: number; unit: string; tone: "neutral" | "quality" }) {
  const rounded = Math.round(value * 10) / 10;
  const direction = rounded === 0 ? "flat" : rounded > 0 ? "up" : "down";
  const arrow = direction === "up" ? "▲" : direction === "down" ? "▼" : "■";
  const sign = rounded > 0 ? "+" : "";
  const toneClass = tone === "quality" && direction !== "flat" ? ` prog-delta--${direction}` : "";
  return (
    <span className={`prog-delta${toneClass}`}>
      <span aria-hidden="true">{arrow}</span> {sign}
      {formatCount(rounded)}
      {unit}
    </span>
  );
}

function TrendChart({ metric, focus }: { metric: ProgressMetric; focus: Focus }) {
  const uid = useId().replace(/:/g, "");
  const [hover, setHover] = useState<number | null>(null);

  const { points } = metric;
  const count = points.length;
  const hasQuality = metric.qualityLabel != null;
  const emphasized: Focus = hasQuality ? focus : "quantity";

  const margin = { top: 24, right: hasQuality ? 42 : 12, bottom: 56, left: 36 };
  const innerW = W - margin.left - margin.right;
  const innerH = H - margin.top - margin.bottom;
  const baseY = margin.top + innerH;
  const padX = count > 1 ? Math.min(22, innerW / (count * 2)) : 0;
  const colW = count > 1 ? (innerW - 2 * padX) / (count - 1) : innerW;

  const { top: quantityTop, step } = niceScale(Math.max(...points.map((point) => point.quantity)));
  const xAt = (index: number) =>
    count === 1 ? margin.left + innerW / 2 : margin.left + padX + (index * (innerW - 2 * padX)) / (count - 1);
  const yQuantity = (value: number) => margin.top + innerH * (1 - value / quantityTop);
  const yQuality = (value: number) => margin.top + innerH * (1 - value / 100);

  const series = [
    { key: "quantity" as const, values: points.map((point) => point.quantity), y: yQuantity, format: countLabel },
    ...(hasQuality
      ? [{ key: "quality" as const, values: points.map((point) => point.quality ?? 0), y: yQuality, format: pctLabel }]
      : []),
  ];
  const strongSeries = series.find((s) => s.key === emphasized) ?? series[0];
  const drawOrder = [...series].sort((a, b) => Number(a.key === emphasized) - Number(b.key === emphasized));
  const avg = strongSeries.values.reduce((sum, value) => sum + value, 0) / Math.max(count, 1);
  const avgY = strongSeries.y(avg);
  const strongColor = COLORS[emphasized];
  /** Pick the gap (and small vertical offset) where the AVG pill sits clear of every curve and value label. */
  const avgSpot = (() => {
    if (count < 2) return { x: margin.left + 33, y: avgY };
    let best = { x: (xAt(0) + xAt(1)) / 2, y: avgY, score: -Infinity };
    for (let i = 0; i < count - 1; i += 1) {
      for (const offset of [0, 14, -14, 26]) {
        const pillY = avgY + offset;
        if (pillY < margin.top + 8 || pillY > baseY - 8) continue;
        const clearance = Math.min(
          ...series.flatMap((s) => {
            const a = s.y(s.values[i]) - pillY;
            const b = s.y(s.values[i + 1]) - pillY;
            if (a * b <= 0) return [0];
            const labels = s.key === emphasized ? [Math.abs(a - 19), Math.abs(b - 19)] : [];
            return [Math.abs(a), Math.abs(b), ...labels];
          }),
        );
        const score = Math.min(clearance, 24) - (offset === 0 ? 0 : 3);
        if (score > best.score) best = { x: (xAt(i) + xAt(i + 1)) / 2, y: pillY, score };
      }
    }
    return best;
  })();

  const hovered = hover != null ? points[hover] : null;
  const tipFlip = hover != null && xAt(hover) > W * 0.55;

  return (
    <div className="prog-chart">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="prog-chart__svg"
        role="img"
        aria-label={`${metric.title} by match`}
        onPointerLeave={() => setHover(null)}
      >
        <defs>
          {series.map((s) => (
            <linearGradient key={s.key} id={`${uid}-${s.key}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={COLORS[s.key]} stopOpacity={0.34} />
              <stop offset="70%" stopColor={COLORS[s.key]} stopOpacity={0.06} />
              <stop offset="100%" stopColor={COLORS[s.key]} stopOpacity={0} />
            </linearGradient>
          ))}
          <linearGradient id={`${uid}-band`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ffffff" stopOpacity={0} />
            <stop offset="100%" stopColor="#ffffff" stopOpacity={0.07} />
          </linearGradient>
        </defs>

        {hover != null ? (
          <rect
            x={Math.max(margin.left, xAt(hover) - colW / 2)}
            y={margin.top}
            width={Math.min(xAt(hover) + colW / 2, W - margin.right) - Math.max(margin.left, xAt(hover) - colW / 2)}
            height={innerH}
            fill={`url(#${uid}-band)`}
          />
        ) : null}

        {Array.from({ length: TICKS + 1 }, (_, tick) => {
          const y = baseY - (innerH / TICKS) * tick;
          return (
            <g key={tick}>
              <line
                x1={margin.left}
                x2={W - margin.right}
                y1={y}
                y2={y}
                stroke="#ffffff"
                strokeOpacity={tick === 0 ? 0.22 : 0.06}
              />
              <text
                x={margin.left - 9}
                y={y}
                dy="0.35em"
                textAnchor="end"
                className="prog-axis"
                fill={COLORS.quantity}
                opacity={emphasized === "quantity" ? 0.9 : 0.4}
              >
                {formatCount(step * tick)}
              </text>
              {hasQuality ? (
                <text
                  x={W - margin.right + 9}
                  y={y}
                  dy="0.35em"
                  textAnchor="start"
                  className="prog-axis"
                  fill={COLORS.quality}
                  opacity={emphasized === "quality" ? 0.9 : 0.4}
                >
                  {tick * 25}%
                </text>
              ) : null}
            </g>
          );
        })}

        <line
          x1={margin.left}
          x2={W - margin.right}
          y1={avgY}
          y2={avgY}
          stroke={strongColor}
          strokeOpacity={0.55}
          strokeDasharray="2 6"
          strokeLinecap="round"
        />

        {hover != null ? (
          <line
            x1={xAt(hover)}
            x2={xAt(hover)}
            y1={margin.top - 6}
            y2={baseY}
            stroke="#ffffff"
            strokeOpacity={0.28}
            strokeDasharray="3 4"
          />
        ) : null}

        {drawOrder.map((s) => {
          const strong = s.key === emphasized;
          const color = COLORS[s.key];
          const pts: Pt[] = s.values.map((value, index) => [xAt(index), s.y(value)]);
          const line = smoothPath(pts);
          const area = `${line} L${pts[pts.length - 1][0]} ${baseY} L${pts[0][0]} ${baseY} Z`;
          return (
            <g key={s.key}>
              {strong ? <path d={area} fill={`url(#${uid}-${s.key})`} /> : null}
              {strong ? (
                <path d={line} fill="none" stroke={color} strokeWidth={9} strokeOpacity={0.14} strokeLinecap="round" />
              ) : null}
              <path
                d={line}
                fill="none"
                stroke={color}
                strokeWidth={strong ? 3 : 1.75}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray={strong ? undefined : "5 6"}
                strokeOpacity={strong ? 1 : 0.5}
              />
              {pts.map(([px, py], index) => {
                const isLast = index === count - 1;
                const isHover = hover === index;
                if (!strong) {
                  return (
                    <circle
                      key={index}
                      cx={px}
                      cy={py}
                      r={isHover ? 4.5 : 3}
                      fill={INK}
                      stroke={color}
                      strokeOpacity={isHover ? 1 : 0.6}
                      strokeWidth={1.75}
                    />
                  );
                }
                const lit = isLast || isHover;
                const labelBelow = py - 18 < margin.top - 8;
                return (
                  <g key={index}>
                    {lit ? <circle cx={px} cy={py} r={12} fill={color} opacity={0.16} /> : null}
                    <circle
                      cx={px}
                      cy={py}
                      r={isHover ? 6.5 : isLast ? 5.5 : 4.5}
                      fill={lit ? color : INK}
                      stroke={lit ? "#ffffff" : color}
                      strokeWidth={lit ? 2.25 : 2.5}
                    />
                    <text
                      x={px}
                      y={labelBelow ? py + 22 : py - 15}
                      textAnchor="middle"
                      className={`prog-value${lit ? " prog-value--strong" : ""}`}
                      fill={lit ? "#ffffff" : color}
                      stroke={INK}
                      strokeWidth={4}
                      paintOrder="stroke"
                    >
                      {s.format(s.values[index])}
                    </text>
                  </g>
                );
              })}
            </g>
          );
        })}

        <g transform={`translate(${avgSpot.x - 29} ${avgSpot.y - 8})`}>
          <rect width={58} height={16} rx={8} fill={INK} stroke={strongColor} strokeOpacity={0.45} />
          <text x={29} y={8} dy="0.35em" textAnchor="middle" className="prog-avg" fill={strongColor}>
            AVG {strongSeries.format(avg)}
          </text>
        </g>

        {points.map((point, index) => {
          const cx = xAt(index);
          const active = hover === index;
          return (
            <g key={point.id}>
              <line x1={cx} x2={cx} y1={baseY} y2={baseY + 5} stroke="#ffffff" strokeOpacity={0.25} />
              <circle
                cx={cx}
                cy={baseY + 29}
                r={20}
                fill={active ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.045)"}
                stroke={active ? strongColor : "rgba(255,255,255,0.1)"}
                strokeWidth={active ? 1.5 : 1}
              />
              {point.logo ? (
                <image
                  href={point.logo}
                  x={cx - 13}
                  y={baseY + 16}
                  width={26}
                  height={26}
                  preserveAspectRatio="xMidYMid meet"
                  opacity={hover == null || active ? 1 : 0.5}
                />
              ) : null}
              <rect
                data-hit=""
                x={cx - colW / 2}
                y={margin.top - 10}
                width={colW}
                height={H - margin.top + 10}
                fill="transparent"
                onPointerEnter={() => setHover(index)}
                onPointerDown={() => setHover(index)}
              >
                <title>{point.label}</title>
              </rect>
            </g>
          );
        })}
      </svg>

      {hovered && hover != null ? (
        <div
          className={`prog-tip${tipFlip ? " prog-tip--flip" : ""}`}
          style={{ left: `${(xAt(hover) / W) * 100}%` }}
          role="status"
        >
          <div className="prog-tip__head">
            {hovered.logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={hovered.logo} alt="" className="prog-tip__logo" />
            ) : null}
            <div>
              <p className="prog-tip__title">{hovered.label}</p>
              <p className="prog-tip__sub">
                Match {hover + 1} of {count}
              </p>
            </div>
          </div>
          {series.map((s) => {
            const value = s.values[hover];
            const diff = value - seriesStats(s.values).avg;
            const tone = Math.abs(diff) < 0.05 ? "flat" : diff > 0 ? "up" : "down";
            return (
              <p key={s.key} className={`prog-tip__row${s.key === emphasized ? " is-strong" : ""}`}>
                <span className="prog-tip__dot" style={{ background: COLORS[s.key] }} />
                {s.key === "quantity" ? metric.quantityLabel : metric.qualityLabel}
                <strong>{s.format(value)}</strong>
                <span className={`prog-tip__vs prog-tip__vs--${tone}`}>
                  {diff >= 0 ? "+" : "−"}
                  {s.key === "quality" ? `${Math.abs(Math.round(diff))} pts` : countLabel(Math.abs(diff))}
                </span>
              </p>
            );
          })}
          <p className="prog-tip__detail">
            {hovered.qualityDetail ? `${hovered.qualityDetail} · ` : ""}± vs average
          </p>
        </div>
      ) : null}
    </div>
  );
}

function MetricCard({
  metric,
  focus,
  onFocus,
}: {
  metric: ProgressMetric;
  focus: Focus;
  onFocus: (focus: Focus) => void;
}) {
  const hasQuality = metric.qualityLabel != null;
  const emphasized: Focus = hasQuality ? focus : "quantity";
  const isRate = emphasized === "quality";
  const { points } = metric;
  const last = points[points.length - 1];
  const previous = points.length > 1 ? points[points.length - 2] : null;
  const values = points.map((point) => (isRate ? point.quality ?? 0 : point.quantity));
  const format = isRate ? pctLabel : countLabel;
  const stats = seriesStats(values);
  const bestPoint = points[stats.best];

  const delta = previous
    ? isRate
      ? { value: Math.round(last.quality ?? 0) - Math.round(previous.quality ?? 0), unit: " pts", tone: "quality" as const }
      : { value: last.quantity - previous.quantity, unit: "", tone: "neutral" as const }
    : null;
  return (
    <article className={`prog-card prog-card--${metric.phase}`}>
      <header className="prog-card__head">
        <div>
          <p className="prog-card__phase">{PHASE_LABEL[metric.phase]}</p>
          <h3 className="prog-card__title">{metric.title}</h3>
        </div>
        <div className="prog-card__kpi" aria-live="polite">
          <span className="prog-card__kpi-value" style={{ color: COLORS[emphasized] }}>
            {format(values[values.length - 1])}
          </span>
          <span className="prog-card__kpi-meta">
            <span className="prog-card__kpi-label">
              {last.logo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={last.logo} alt={last.label} title={last.label} className="prog-card__kpi-logo" />
              ) : null}
              Last match
            </span>
            {delta ? <Delta value={delta.value} unit={delta.unit} tone={delta.tone} /> : null}
          </span>
        </div>
      </header>

      <dl className="prog-stats">
        <div className="prog-stat">
          <dt>Average</dt>
          <dd>{format(stats.avg)}</dd>
        </div>
        <div className="prog-stat">
          <dt>Best</dt>
          <dd>
            {format(values[stats.best])}
            {bestPoint?.logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={bestPoint.logo} alt={bestPoint.label} title={bestPoint.label} className="prog-stat__logo" />
            ) : null}
          </dd>
        </div>
      </dl>

      {hasQuality ? (
        <div className="prog-legend" role="group" aria-label={`${metric.title} highlight`}>
          {(["quantity", "quality"] as const).map((key) => (
            <button
              key={key}
              type="button"
              className={`prog-legend__item${emphasized === key ? " is-active" : ""}`}
              aria-pressed={emphasized === key}
              onClick={() => onFocus(key)}
            >
              <span className={`prog-legend__swatch prog-legend__swatch--${key}`} />
              {key === "quantity" ? metric.quantityLabel : `${metric.qualityLabel} %`}
            </button>
          ))}
        </div>
      ) : (
        <div className="prog-legend">
          <span className="prog-legend__item is-active is-static">
            <span className="prog-legend__swatch prog-legend__swatch--quantity" />
            {metric.quantityLabel}
          </span>
        </div>
      )}

      <TrendChart metric={metric} focus={focus} />
    </article>
  );
}

export function ProgressView({ matches, initialFocus = "quantity" }: { matches: MatchStats[]; initialFocus?: Focus }) {
  const [focus, setFocus] = useState<Focus>(initialFocus);
  const metrics = progressMetrics(matches);

  return (
    <section className="progress" aria-label="Progress across matches">
      <div className="progress__toolbar">
        <div>
          <h2 className="board__heading">Progress</h2>
          <p className="progress__sub">
            Match-by-match trend · {matches.length} {matches.length === 1 ? "match" : "matches"}
          </p>
        </div>
        <div className="progress__focus" role="group" aria-label="Highlight">
          <span className="progress__focus-label">Highlight</span>
          <div className="match-nav__pills">
            {(["quantity", "quality"] as const).map((key) => (
              <button
                key={key}
                type="button"
                className={`match-nav__pill${focus === key ? " is-active" : ""}`}
                aria-pressed={focus === key}
                onClick={() => setFocus(key)}
              >
                {key === "quantity" ? "Quantity" : "Quality"}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="progress__grid">
        {metrics.map((metric) => (
          <MetricCard key={metric.id} metric={metric} focus={focus} onFocus={setFocus} />
        ))}
      </div>

      <p className="progress__note">
        Quantity is the raw count per match; quality is the success rate. The dotted line marks the average of the
        highlighted series. Only metrics recorded in every match are shown.
      </p>
    </section>
  );
}
