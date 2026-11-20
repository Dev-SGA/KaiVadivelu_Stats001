"use client";

import { useId, useState } from "react";
import { formatCount, progressMetrics, type MatchStats, type ProgressMetric } from "@/lib/stats";

type Focus = "quantity" | "quality";

const COLORS: Record<Focus, string> = { quantity: "#5aa2e0", quality: "#3fb56b" };
const PHASE_LABEL = { "build-up": "Build-Up", defensive: "Defensive Phase" } as const;
const NICE_STEPS = [1, 2, 3, 4, 5, 6, 8, 10, 12, 15, 20, 25, 30, 40, 50, 60, 80, 100, 150, 200, 250, 500, 1000];

const W = 560;
const H = 316;
const TICKS = 4;

/** Axis maximum with TICKS evenly spaced "round" gridlines. */
function niceScale(max: number): { top: number; step: number } {
  const target = Math.max(max, 1) * 1.1;
  const step = NICE_STEPS.find((candidate) => candidate * TICKS >= target) ?? Math.ceil(target / TICKS);
  return { top: step * TICKS, step };
}

function pctLabel(value: number): string {
  return `${Math.round(value)}%`;
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

function ValueTag({
  x,
  y,
  text,
  color,
  strong,
}: {
  x: number;
  y: number;
  text: string;
  color: string;
  strong: boolean;
}) {
  const width = text.length * (strong ? 9 : 7.4) + 16;
  const height = strong ? 24 : 19;
  return (
    <g style={{ opacity: strong ? 1 : 0.72, transition: "opacity 200ms ease" }}>
      <rect
        x={x - width / 2}
        y={y - height / 2}
        width={width}
        height={height}
        rx={height / 2}
        fill="#06202f"
        stroke={color}
        strokeOpacity={strong ? 0.95 : 0.5}
      />
      <text
        x={x}
        y={y}
        dy="0.35em"
        textAnchor="middle"
        fontSize={strong ? 13 : 11}
        fontWeight={800}
        fill={color}
      >
        {text}
      </text>
    </g>
  );
}

function TrendChart({ metric, focus }: { metric: ProgressMetric; focus: Focus }) {
  const uid = useId().replace(/:/g, "");
  const [hover, setHover] = useState<number | null>(null);

  const { points } = metric;
  const count = points.length;
  const hasQuality = metric.qualityLabel != null;
  const emphasized: Focus = hasQuality ? focus : "quantity";

  const margin = { top: 36, right: hasQuality ? 50 : 24, bottom: 70, left: 46 };
  const innerW = W - margin.left - margin.right;
  const innerH = H - margin.top - margin.bottom;
  const baseY = margin.top + innerH;

  const { top: quantityTop, step } = niceScale(Math.max(...points.map((point) => point.quantity)));
  const xAt = (index: number) => margin.left + ((index + 0.5) / count) * innerW;
  const yQuantity = (value: number) => margin.top + innerH * (1 - value / quantityTop);
  const yQuality = (value: number) => margin.top + innerH * (1 - value / 100);

  const series = [
    {
      key: "quantity" as const,
      values: points.map((point) => point.quantity),
      y: yQuantity,
      format: (value: number) => formatCount(value),
    },
    ...(hasQuality
      ? [
          {
            key: "quality" as const,
            values: points.map((point) => point.quality ?? 0),
            y: yQuality,
            format: pctLabel,
          },
        ]
      : []),
  ];
  const drawOrder = [...series].sort((a, b) => Number(a.key === emphasized) - Number(b.key === emphasized));

  const linePath = (s: (typeof series)[number]) =>
    s.values.map((value, index) => `${index === 0 ? "M" : "L"}${xAt(index)} ${s.y(value)}`).join(" ");

  const areaPath = (s: (typeof series)[number]) =>
    `${linePath(s)} L${xAt(count - 1)} ${baseY} L${xAt(0)} ${baseY} Z`;

  const hovered = hover != null ? points[hover] : null;

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
              <stop offset="0%" stopColor={COLORS[s.key]} stopOpacity={0.32} />
              <stop offset="100%" stopColor={COLORS[s.key]} stopOpacity={0} />
            </linearGradient>
          ))}
        </defs>

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
                strokeOpacity={tick === 0 ? 0.28 : 0.09}
                strokeDasharray={tick === 0 ? undefined : "3 5"}
              />
              <text
                x={margin.left - 10}
                y={y}
                dy="0.35em"
                textAnchor="end"
                fontSize={11}
                fontWeight={700}
                fill={COLORS.quantity}
                opacity={emphasized === "quantity" ? 0.95 : 0.55}
              >
                {formatCount(step * tick)}
              </text>
              {hasQuality ? (
                <text
                  x={W - margin.right + 10}
                  y={y}
                  dy="0.35em"
                  textAnchor="start"
                  fontSize={11}
                  fontWeight={700}
                  fill={COLORS.quality}
                  opacity={emphasized === "quality" ? 0.95 : 0.55}
                >
                  {tick * 25}%
                </text>
              ) : null}
            </g>
          );
        })}

        <text
          x={margin.left - 36}
          y={margin.top - 18}
          fontSize={10}
          fontWeight={800}
          letterSpacing="0.12em"
          fill={COLORS.quantity}
          opacity={0.9}
        >
          {metric.quantityLabel.toUpperCase()}
        </text>

        {hover != null ? (
          <line x1={xAt(hover)} x2={xAt(hover)} y1={margin.top} y2={baseY} stroke="#ffffff" strokeOpacity={0.22} />
        ) : null}

        {drawOrder.map((s) => {
          const strong = s.key === emphasized;
          const color = COLORS[s.key];
          return (
            <g key={s.key}>
              {strong ? <path d={areaPath(s)} fill={`url(#${uid}-${s.key})`} /> : null}
              <path
                d={linePath(s)}
                fill="none"
                stroke={color}
                strokeWidth={strong ? 3.5 : 2}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray={strong ? undefined : "6 6"}
                style={{ opacity: strong ? 1 : 0.55, transition: "opacity 200ms ease, stroke-width 200ms ease" }}
              />
              {s.values.map((value, index) => {
                const otherValue = series.find((other) => other.key !== s.key);
                const px = xAt(index);
                const py = s.y(value);
                const other = otherValue ? otherValue.y(otherValue.values[index]) : null;
                const above = other == null || py < other || (py === other && s.key === "quantity");
                const offset = strong ? 21 : 18;
                return (
                  <g key={index}>
                    <circle
                      cx={px}
                      cy={py}
                      r={strong ? 6.5 : 4.5}
                      fill={strong ? color : "#06202f"}
                      stroke={strong ? "#ffffff" : color}
                      strokeWidth={strong ? 2.5 : 2}
                      style={{ transition: "r 200ms ease" }}
                    />
                    <ValueTag
                      x={px}
                      y={above ? py - offset : py + offset}
                      text={s.format(value)}
                      color={color}
                      strong={strong}
                    />
                  </g>
                );
              })}
            </g>
          );
        })}

        {points.map((point, index) => {
          const cx = xAt(index);
          return (
            <g key={point.id}>
              {point.logo ? (
                <image href={point.logo} x={cx - 12} y={baseY + 14} width={24} height={24} preserveAspectRatio="xMidYMid meet" />
              ) : null}
              <text
                x={cx}
                y={baseY + (point.logo ? 54 : 30)}
                textAnchor="middle"
                fontSize={12}
                fontWeight={700}
                fill="#ffffff"
                opacity={hover === index ? 1 : 0.78}
              >
                {point.shortLabel}
              </text>
              <rect
                x={margin.left + (index * innerW) / count}
                y={margin.top - 8}
                width={innerW / count}
                height={innerH + 16}
                fill="transparent"
                onPointerEnter={() => setHover(index)}
                onPointerDown={() => setHover(index)}
              />
            </g>
          );
        })}
      </svg>

      {hovered && hover != null ? (
        <div
          className="prog-tip"
          style={{ left: `clamp(92px, ${(xAt(hover) / W) * 100}%, calc(100% - 92px))` }}
          role="status"
        >
          <p className="prog-tip__title">{hovered.label}</p>
          <p className="prog-tip__row">
            <span className="prog-tip__dot" style={{ background: COLORS.quantity }} />
            {metric.quantityLabel}
            <strong>{formatCount(hovered.quantity)}</strong>
          </p>
          {hasQuality && hovered.quality != null ? (
            <>
              <p className="prog-tip__row">
                <span className="prog-tip__dot" style={{ background: COLORS.quality }} />
                {metric.qualityLabel}
                <strong>{pctLabel(hovered.quality)}</strong>
              </p>
              {hovered.qualityDetail ? <p className="prog-tip__detail">{hovered.qualityDetail}</p> : null}
            </>
          ) : null}
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
  const { points } = metric;
  const last = points[points.length - 1];
  const previous = points.length > 1 ? points[points.length - 2] : null;

  const latest = emphasized === "quality" ? pctLabel(last.quality ?? 0) : formatCount(last.quantity);
  const latestLabel = emphasized === "quality" ? metric.qualityLabel : metric.quantityLabel;
  const delta = previous
    ? emphasized === "quality"
      ? {
          value: Math.round(last.quality ?? 0) - Math.round(previous.quality ?? 0),
          unit: " pts",
          tone: "quality" as const,
        }
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
            {latest}
          </span>
          <span className="prog-card__kpi-meta">
            <span className="prog-card__kpi-label">
              {latestLabel} · {last.shortLabel}
            </span>
            {delta ? (
              <>
                <Delta value={delta.value} unit={delta.unit} tone={delta.tone} />
                <span className="prog-card__kpi-vs">vs {previous!.shortLabel}</span>
              </>
            ) : null}
          </span>
        </div>
      </header>

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
        Quantity is the raw count per match; quality is the success rate. Only metrics recorded in every match are
        shown.
      </p>
    </section>
  );
}
