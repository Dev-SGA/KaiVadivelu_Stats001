import { Fragment, type ReactNode } from "react";

type MetricFlowProps = {
  items: ReactNode[];
  className?: string;
};

export function MetricFlow({ items, className }: MetricFlowProps) {
  return (
    <div className={className ? `metric-flow ${className}` : "metric-flow"}>
      {items.map((item, index) => (
        <Fragment key={index}>
          {index > 0 ? <span className="metric-flow__arrow" aria-hidden="true" /> : null}
          {item}
        </Fragment>
      ))}
    </div>
  );
}
