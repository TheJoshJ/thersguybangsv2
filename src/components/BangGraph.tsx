import { useMemo, useState } from "react";
import { useAllVideos } from "@/hooks/useVideos";

interface DayData {
  date: string;
  count: number;
  level: number;
}

interface MonthLabel {
  label: string;
  weekIndex: number;
}

export function BangGraph() {
  const { data: videos, isLoading } = useAllVideos();
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  // Get available years from 2023 to present
  const availableYears = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const years: number[] = [];
    for (let year = currentYear; year >= 2023; year--) {
      years.push(year);
    }
    return years;
  }, []);

  const { weeks, monthLabels, yearTotal } = useMemo(() => {
    if (!videos) return { weeks: [], monthLabels: [], yearTotal: 0 };

    // Aggregate bangs by date
    const bangsByDate: Record<string, number> = {};
    let yearTotal = 0;

    for (const video of videos) {
      const date = new Date(video.publishedAt).toISOString().split("T")[0];
      const videoYear = new Date(video.publishedAt).getFullYear();
      bangsByDate[date] = (bangsByDate[date] || 0) + video.bang_count;
      if (videoYear === selectedYear) {
        yearTotal += video.bang_count;
      }
    }

    // Generate full year of data (Jan 1 to Dec 31)
    const startDate = new Date(selectedYear, 0, 1); // Jan 1
    const endDate = new Date(selectedYear, 11, 31); // Dec 31

    // Adjust start to previous Sunday if needed
    const dayOfWeek = startDate.getDay();
    if (dayOfWeek !== 0) {
      startDate.setDate(startDate.getDate() - dayOfWeek);
    }

    const days: DayData[] = [];
    const currentDate = new Date(startDate);
    let max = 0;

    // Go through the whole year plus padding to complete weeks
    while (currentDate <= endDate || currentDate.getDay() !== 0) {
      const dateStr = currentDate.toISOString().split("T")[0];
      const count = bangsByDate[dateStr] || 0;
      const isInYear = currentDate.getFullYear() === selectedYear;

      if (count > max && isInYear) max = count;

      days.push({
        date: dateStr,
        count: isInYear ? count : -1, // -1 marks days outside the year
        level: 0,
      });

      currentDate.setDate(currentDate.getDate() + 1);

      // Stop after completing the week containing Dec 31
      if (currentDate.getFullYear() > selectedYear && currentDate.getDay() === 0) {
        break;
      }
    }

    // Calculate levels (0-4) based on count
    for (const day of days) {
      if (day.count === -1) {
        day.level = -1; // Outside year
      } else if (day.count === 0) {
        day.level = 0;
      } else if (max > 0) {
        const ratio = day.count / max;
        if (ratio <= 0.25) day.level = 1;
        else if (ratio <= 0.5) day.level = 2;
        else if (ratio <= 0.75) day.level = 3;
        else day.level = 4;
      }
    }

    // Group into weeks (columns)
    const weeks: DayData[][] = [];
    for (let i = 0; i < days.length; i += 7) {
      weeks.push(days.slice(i, i + 7));
    }

    // Generate month labels
    const monthLabels: MonthLabel[] = [];
    let lastMonth = -1;

    weeks.forEach((week, weekIndex) => {
      if (week.length > 0) {
        const date = new Date(week[0].date);
        const month = date.getMonth();
        // Only show month if it's in the selected year
        if (month !== lastMonth && date.getFullYear() === selectedYear) {
          monthLabels.push({
            label: date.toLocaleDateString("en-US", { month: "short" }),
            weekIndex,
          });
          lastMonth = month;
        }
      }
    });

    return { weeks, monthLabels, yearTotal };
  }, [videos, selectedYear]);

  if (isLoading) {
    return (
      <div className="w-full">
        <div className="h-[120px] bg-secondary/20 rounded animate-pulse" />
      </div>
    );
  }

  const getLevelColor = (level: number) => {
    switch (level) {
      case -1: return "bg-transparent"; // Outside year
      case 0: return "bg-secondary/40";
      case 1: return "bg-primary/30";
      case 2: return "bg-primary/50";
      case 3: return "bg-primary/70";
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

  const cellSize = 8;
  const gap = 2;

  return (
    <div
      className="w-full max-w-150 grid"
      style={{
        gridTemplateColumns: "1fr auto",
        gridTemplateRows: "auto auto auto auto",
      }}
    >

      {/* Row 2: Month labels */}
      <div className="flex text-xs text-muted-foreground mb-1">
        <div className="relative w-full" style={{ height: "16px" }}>
          {monthLabels.map((month, i) => (
            <span
              key={i}
              className="absolute"
              style={{ left: `${month.weekIndex * (cellSize + gap)}px` }}
            >
              {month.label}
            </span>
          ))}
        </div>
      </div>

      {/* Year selector (rows 2-4, column 2) */}
      <div className="row-span-3 flex flex-col gap-1 text-xs pl-4">
        {availableYears.map((year) => (
          <button
            key={year}
            onClick={() => setSelectedYear(year)}
            className={`px-2 py-1 rounded text-right transition-colors ${
              year === selectedYear
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
            }`}
          >
            {year}
          </button>
        ))}
      </div>

      {/* Row 3: Graph */}
      <div className="flex" style={{ gap: `${gap}px` }}>
        {weeks.map((week, weekIndex) => (
          <div key={weekIndex} className="flex flex-col" style={{ gap: `${gap}px` }}>
            {week.map((day, dayIndex) => (
              <div
                key={`${weekIndex}-${dayIndex}`}
                className={`rounded-sm ${getLevelColor(day.level)} ${day.level >= 0 ? "transition-colors hover:ring-1 hover:ring-foreground/50" : ""}`}
                style={{ width: `${cellSize}px`, height: `${cellSize}px` }}
                title={day.level >= 0 ? `${formatDate(day.date)}: ${day.count} bangs` : ""}
              />
            ))}
          </div>
        ))}
      </div>

      {/* Row 4: Legend (justified left) */}
      <div className="flex items-center justify-start gap-2 mt-2 text-xs text-muted-foreground">
        <span>Less</span>
        <div className="flex" style={{ gap: `${gap}px` }}>
          {[0, 1, 2, 3, 4].map((level) => (
            <div
              key={level}
              className={`rounded-sm ${getLevelColor(level)}`}
              style={{ width: `${cellSize}px`, height: `${cellSize}px` }}
            />
          ))}
        </div>
        <span>More</span>
      </div>
    </div>
  );
}
