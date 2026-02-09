import { useMemo, useState, useEffect } from "react";
import { useAllVideos } from "@/hooks/useVideos";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface DayData {
  date: string;
  count: number;
  level: number;
}

interface BangHeatmapProps {
  onDateClick?: (date: string) => void;
  highlightedDate?: string | null;
}

// Pre-calculate the grid structure (7 years)
const getYears = () => {
  const today = new Date();
  const startYear = today.getFullYear() - 6;
  const currentYear = today.getFullYear();
  const years: number[] = [];
  for (let y = startYear; y <= currentYear; y++) {
    years.push(y);
  }
  return years;
};

const YEARS = getYears();
const CELL_SIZE = 12;
const GAP = 2;
const DAYS_PER_ROW = 61;

// Pre-build skeleton structure
const buildSkeletonDays = () => {
  const today = new Date();
  const allDays: { key: string; dateStr: string; isYearStart: boolean; year: number; isFuture: boolean }[] = [];

  for (const year of YEARS) {
    const daysInYear = (year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)) ? 366 : 365;
    for (let dayIndex = 0; dayIndex < daysInYear; dayIndex++) {
      const date = new Date(year, 0, 1 + dayIndex);
      const dateStr = date.toISOString().split("T")[0];
      allDays.push({
        key: `${year}-${dayIndex}`,
        dateStr,
        isYearStart: dayIndex === 0,
        year,
        isFuture: date > today,
      });
    }
  }

  // Split into rows
  const rows: typeof allDays[] = [];
  for (let i = 0; i < allDays.length; i += DAYS_PER_ROW) {
    rows.push(allDays.slice(i, i + DAYS_PER_ROW));
  }

  // Find which row each year starts on
  const yearStartRows = new Map<number, number>();
  rows.forEach((row, rowIndex) => {
    row.forEach((day) => {
      if (day.isYearStart && !yearStartRows.has(day.year)) {
        yearStartRows.set(day.year, rowIndex);
      }
    });
  });

  return { rows, yearStartRows, allDays };
};

const { rows: SKELETON_ROWS, yearStartRows: YEAR_START_ROWS } = buildSkeletonDays();

export function BangHeatmap({ onDateClick, highlightedDate }: BangHeatmapProps) {
  const { data: videos, isLoading } = useAllVideos();
  const [isAnimated, setIsAnimated] = useState(false);

  // Trigger animation after data loads
  useEffect(() => {
    if (videos && !isAnimated) {
      // Small delay to ensure DOM is ready, then trigger animation
      const timeout = setTimeout(() => setIsAnimated(true), 50);
      return () => clearTimeout(timeout);
    }
  }, [videos, isAnimated]);

  const dataMap = useMemo(() => {
    if (!videos) return new Map<string, DayData>();

    // Aggregate bangs by date
    const bangsByDate = new Map<string, number>();
    let maxCount = 0;

    for (const video of videos) {
      const date = new Date(video.publishedAt).toISOString().split("T")[0];
      const current = (bangsByDate.get(date) || 0) + video.bang_count;
      bangsByDate.set(date, current);
      if (current > maxCount) maxCount = current;
    }

    // Build data map
    const data = new Map<string, DayData>();
    const today = new Date();

    for (const year of YEARS) {
      const daysInYear = (year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)) ? 366 : 365;
      for (let day = 0; day < daysInYear; day++) {
        const date = new Date(year, 0, 1 + day);
        const dateStr = date.toISOString().split("T")[0];
        const count = bangsByDate.get(dateStr) || 0;
        const isFuture = date > today;

        let level = -1;
        if (!isFuture) {
          if (count === 0) {
            level = 0;
          } else if (maxCount > 0) {
            const ratio = count / maxCount;
            if (ratio <= 0.25) level = 1;
            else if (ratio <= 0.5) level = 2;
            else if (ratio <= 0.75) level = 3;
            else level = 4;
          }
        }

        data.set(dateStr, { date: dateStr, count, level });
      }
    }

    return data;
  }, [videos]);

  const getLevelColor = (level: number, animated: boolean, isFuture: boolean) => {
    if (isFuture) return "bg-transparent"; // Future days always invisible
    if (!animated) return "bg-secondary/40"; // Start as 0-bang day color
    switch (level) {
      case -1: return "bg-transparent";
      case 0: return "bg-secondary/40";
      case 1: return "bg-primary/30";
      case 2: return "bg-primary/50";
      case 3: return "bg-primary/75";
      case 4: return "bg-primary";
      default: return "bg-secondary/40";
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  // Generate a seeded random delay based on the key
  const getRandomDelay = (key: string) => {
    let hash = 0;
    for (let i = 0; i < key.length; i++) {
      hash = ((hash << 5) - hash) + key.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash % 800); // 0-800ms random delay
  };

  return (
    <TooltipProvider delayDuration={100}>
      <div className="w-full">
        {/* Grid */}
        <div className="flex">
          {/* Year labels column */}
          <div className="flex flex-col pr-3" style={{ gap: `${GAP}px` }}>
            {SKELETON_ROWS.map((_, rowIndex) => {
              const yearForRow = Array.from(YEAR_START_ROWS.entries()).find(([_, startRow]) => startRow === rowIndex);
              return (
                <div
                  key={rowIndex}
                  className="text-xs text-muted-foreground text-right flex items-center justify-end"
                  style={{ height: `${CELL_SIZE}px`, width: "32px" }}
                >
                  {yearForRow ? yearForRow[0] : ""}
                </div>
              );
            })}
          </div>

          {/* Days grid */}
          <div className="flex flex-col" style={{ gap: `${GAP}px` }}>
            {SKELETON_ROWS.map((row, rowIndex) => (
              <div key={rowIndex} className="flex" style={{ gap: `${GAP}px` }}>
                {row.map((day) => {
                  const dayData = dataMap.get(day.dateStr);
                  const level = dayData?.level ?? (day.isFuture ? -1 : 0);
                  const count = dayData?.count ?? 0;
                  const delay = getRandomDelay(day.key);

                  const cell = (
                    <div
                      className={`rounded-sm ${isAnimated ? "transition-colors" : ""} ${getLevelColor(level, isAnimated, day.isFuture)} ${
                        level >= 0 ? "hover:ring-1 hover:ring-foreground/50 cursor-pointer" : ""
                      } ${highlightedDate === day.dateStr ? "ring-2 ring-foreground" : ""}`}
                      style={{
                        width: `${CELL_SIZE}px`,
                        height: `${CELL_SIZE}px`,
                        ...(isAnimated && {
                          transitionDuration: "300ms",
                          transitionDelay: `${delay}ms`,
                        }),
                      }}
                      onClick={() => {
                        if (level >= 0 && count > 0 && onDateClick) {
                          onDateClick(day.dateStr);
                        }
                      }}
                    />
                  );

                  // Only show tooltip for non-future days
                  if (level >= 0) {
                    return (
                      <Tooltip key={day.key}>
                        <TooltipTrigger asChild>
                          {cell}
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="font-medium">{formatDate(day.dateStr)}</p>
                          <p className="text-muted-foreground">{count} {count === 1 ? "bang" : "bangs"}</p>
                        </TooltipContent>
                      </Tooltip>
                    );
                  }

                  return <div key={day.key}>{cell}</div>;
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
