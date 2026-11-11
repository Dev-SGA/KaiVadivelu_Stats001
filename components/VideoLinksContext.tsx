"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { GameStats } from "@/lib/stats";

type VideoLinksContextValue = {
  passesUnderPressureVideoLink: string;
  setPassesUnderPressureVideoLink: (value: string) => void;
  passResultsVideoLink: string;
  setPassResultsVideoLink: (value: string) => void;
  possessionsVideoLink: string;
  setPossessionsVideoLink: (value: string) => void;
  mergeIntoStats: (stats: GameStats) => GameStats;
};

const VideoLinksContext = createContext<VideoLinksContextValue | null>(null);

type VideoLinksProviderProps = {
  initialPassesUnderPressureVideoLink: string;
  initialPassResultsVideoLink: string;
  initialPossessionsVideoLink: string;
  children: ReactNode;
};

export function VideoLinksProvider({
  initialPassesUnderPressureVideoLink,
  initialPassResultsVideoLink,
  initialPossessionsVideoLink,
  children,
}: VideoLinksProviderProps) {
  const [passesUnderPressureVideoLink, setPassesUnderPressureVideoLink] = useState(initialPassesUnderPressureVideoLink);
  const [passResultsVideoLink, setPassResultsVideoLink] = useState(initialPassResultsVideoLink);
  const [possessionsVideoLink, setPossessionsVideoLink] = useState(initialPossessionsVideoLink);

  useEffect(() => {
    setPassesUnderPressureVideoLink(initialPassesUnderPressureVideoLink);
    setPassResultsVideoLink(initialPassResultsVideoLink);
    setPossessionsVideoLink(initialPossessionsVideoLink);
  }, [initialPassesUnderPressureVideoLink, initialPassResultsVideoLink, initialPossessionsVideoLink]);

  const value = useMemo<VideoLinksContextValue>(
    () => ({
      passesUnderPressureVideoLink,
      setPassesUnderPressureVideoLink,
      passResultsVideoLink,
      setPassResultsVideoLink,
      possessionsVideoLink,
      setPossessionsVideoLink,
      mergeIntoStats(stats) {
        return {
          ...stats,
          passesUnderPressure: { ...stats.passesUnderPressure, videoLink: passesUnderPressureVideoLink },
          passResults: { ...stats.passResults, videoLink: passResultsVideoLink },
          possessions: { ...stats.possessions, videoLink: possessionsVideoLink },
        };
      },
    }),
    [passesUnderPressureVideoLink, passResultsVideoLink, possessionsVideoLink],
  );

  return <VideoLinksContext.Provider value={value}>{children}</VideoLinksContext.Provider>;
}

export function useVideoLinks(): VideoLinksContextValue {
  const ctx = useContext(VideoLinksContext);
  if (!ctx) {
    throw new Error("useVideoLinks must be used within VideoLinksProvider");
  }
  return ctx;
}
