"use client";

import { useState } from "react";

export type Phase = "build-up" | "defensive" | "stats";

export type Topic = {
  id: string;
  title: string;
  phase: Phase;
  content: React.ReactNode;
};

const PHASE_LABEL: Record<Phase, string> = {
  "build-up": "Build-Up",
  defensive: "Defensive Phase",
  stats: "Summary",
};

type TopicsBoardProps = {
  topics: Topic[];
  /** Minutes played, when shorter than a full match. */
  minutes?: number;
  projected?: boolean;
  onProjectedChange?: (projected: boolean) => void;
};

export function TopicsBoard({ topics, minutes, projected = false, onProjectedChange }: TopicsBoardProps) {
  const [openIds, setOpenIds] = useState<Set<string>>(() => new Set());
  const allOpen = openIds.size === topics.length;

  function toggle(id: string) {
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setOpenIds(allOpen ? new Set() : new Set(topics.map((topic) => topic.id)));
  }

  return (
    <div className="board">
      <div className="board__toolbar">
        <h2 className="board__heading">
          Match breakdown
          {minutes ? <span className="board__minutes">{projected ? "Proj. 90'" : `${minutes}'`}</span> : null}
        </h2>
        <div className="board__actions">
          {minutes && minutes < 90 && onProjectedChange ? (
            <div className="match-nav__pills season-mode" role="group" aria-label="Minutes projection">
              <button
                type="button"
                className={`match-nav__pill${projected ? "" : " is-active"}`}
                aria-pressed={!projected}
                onClick={() => onProjectedChange(false)}
              >
                {minutes}'
              </button>
              <button
                type="button"
                className={`match-nav__pill${projected ? " is-active" : ""}`}
                aria-pressed={projected}
                onClick={() => onProjectedChange(true)}
              >
                90'
              </button>
            </div>
          ) : null}
          <button type="button" className="btn btn--ghost" onClick={toggleAll}>
            {allOpen ? "Collapse all" : "Expand all"}
          </button>
        </div>
      </div>

      <div className="topic-list">
        {topics.map((topic) => {
          const open = openIds.has(topic.id);
          const panelId = `topic-panel-${topic.id}`;

          return (
            <article
              key={topic.id}
              id={`topic-${topic.id}`}
              className={`topic topic--${topic.phase}${open ? " is-open" : ""}`}
            >
              <button
                type="button"
                className="topic__trigger"
                onClick={() => toggle(topic.id)}
                aria-expanded={open}
                aria-controls={panelId}
              >
                <span className="topic__trigger-text">
                  <span className="topic__phase">{PHASE_LABEL[topic.phase]}</span>
                  <span className="topic__title">{topic.title}</span>
                </span>
                <span className="topic__chevron" aria-hidden="true" />
              </button>
              {open ? (
                <div id={panelId} className="topic__body">
                  {topic.content}
                </div>
              ) : null}
            </article>
          );
        })}
      </div>
    </div>
  );
}
