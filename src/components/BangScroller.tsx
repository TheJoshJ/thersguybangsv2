import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useAllVideos } from "@/hooks/useVideos";

type RowItem =
  | { type: "date"; date: string }
  | { type: "bang"; date: string; timestamp: number; transcript: string; videoTitle: string; videoId: string; bangCount: number; bangNumberStart: number; bangNumberEnd: number };

interface BangScrollerProps {
  scrollToDate?: string | null;
  onVisibleDateChange?: (date: string) => void;
  onVisibleBangNumberChange?: (bangNumber: number) => void;
  onTotalBangCountChange?: (total: number) => void;
}

export function BangScroller({ scrollToDate, onVisibleDateChange, onVisibleBangNumberChange, onTotalBangCountChange }: BangScrollerProps) {
  const { data: videos } = useAllVideos();
  const containerRef = useRef<HTMLDivElement>(null);
  const lastReportedDate = useRef<string | null>(null);
  const lastReportedBangNumber = useRef<number | null>(null);
  const isTeleporting = useRef(false);
  const [isVisible, setIsVisible] = useState(false);

  // Animate in when data loads
  useEffect(() => {
    if (videos && videos.length > 0 && !isVisible) {
      const timeout = setTimeout(() => setIsVisible(true), 100);
      return () => clearTimeout(timeout);
    }
  }, [videos, isVisible]);

  // Build flat list with date headers and bang entries
  const { rows, dateIndexMap, totalBangCount } = useMemo(() => {
    if (!videos) return { rows: [], dateIndexMap: new Map<string, number>(), totalBangCount: 0 };

    // First, collect all bangs with dates
    const allBangs: { date: string; timestamp: number; transcript: string; videoTitle: string; videoId: string }[] = [];
    for (const video of videos) {
      const date = new Date(video.publishedAt).toISOString().split("T")[0];
      for (const bang of video.bangs || []) {
        allBangs.push({
          date,
          timestamp: bang.timestamp,
          transcript: bang.transcript,
          videoTitle: video.title,
          videoId: video.videoId,
        });
      }
    }

    // Count actual "bang" occurrences in each transcript
    const countBangs = (text: string) => {
      const matches = text.toLowerCase().match(/bang/g);
      return matches ? matches.length : 1; // At least 1 if it's in the bangs array
    };

    // Sort by date descending (newest first)
    allBangs.sort((a, b) => b.date.localeCompare(a.date));

    // Calculate total bangs by counting occurrences in each transcript
    let totalBangCount = 0;
    const bangCounts = allBangs.map(bang => {
      const count = countBangs(bang.transcript);
      totalBangCount += count;
      return count;
    });

    // Group by date and create flat list with headers
    const rows: RowItem[] = [];
    const dateIndexMap = new Map<string, number>();
    let currentDate = "";
    let runningBangCount = totalBangCount;

    for (let i = 0; i < allBangs.length; i++) {
      const bang = allBangs[i];
      const bangCount = bangCounts[i];

      if (bang.date !== currentDate) {
        currentDate = bang.date;
        dateIndexMap.set(currentDate, rows.length);
        rows.push({ type: "date", date: currentDate });
      }

      // Number range for this transcript (newest has highest numbers)
      const bangNumberEnd = runningBangCount;
      const bangNumberStart = runningBangCount - bangCount + 1;
      runningBangCount -= bangCount;

      rows.push({ type: "bang", ...bang, bangCount, bangNumberStart, bangNumberEnd });
    }

    return { rows, dateIndexMap, totalBangCount };
  }, [videos]);

  // Notify parent of total bang count
  useEffect(() => {
    if (totalBangCount > 0 && onTotalBangCountChange) {
      onTotalBangCountChange(totalBangCount);
    }
  }, [totalBangCount, onTotalBangCountChange]);

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => containerRef.current,
    estimateSize: (index) => (rows[index]?.type === "date" ? 40 : 70),
    overscan: 30, // Increased buffer to reduce flashing
  });

  // Track visible date and bang number as user scrolls
  const updateVisibleInfo = useCallback(() => {
    if (!containerRef.current || isTeleporting.current) return;

    const items = virtualizer.getVirtualItems();
    if (items.length === 0) return;

    const scrollTop = containerRef.current.scrollTop;
    const viewportHeight = containerRef.current.clientHeight;
    const viewportTop = scrollTop;
    const viewportBottom = scrollTop + viewportHeight;

    // Filter to only items actually within the visible viewport (not just rendered/overscan)
    // Account for the 96px padding at top
    const padding = 96;
    let latestDate: string | null = null;
    let highestBangNumber: number | null = null;

    for (const item of items) {
      const itemTop = item.start + padding;
      const itemBottom = itemTop + item.size;

      // Check if item is actually visible in viewport
      if (itemBottom > viewportTop && itemTop < viewportBottom) {
        const row = rows[item.index];
        if (row) {
          const date = row.date;
          if (date && (!latestDate || date > latestDate)) {
            latestDate = date;
          }
          if (row.type === "bang" && (!highestBangNumber || row.bangNumberEnd > highestBangNumber)) {
            highestBangNumber = row.bangNumberEnd;
          }
        }
      }
    }

    if (latestDate && latestDate !== lastReportedDate.current) {
      lastReportedDate.current = latestDate;
      onVisibleDateChange?.(latestDate);
    }

    if (highestBangNumber && highestBangNumber !== lastReportedBangNumber.current) {
      lastReportedBangNumber.current = highestBangNumber;
      onVisibleBangNumberChange?.(highestBangNumber);
    }
  }, [virtualizer, rows, onVisibleDateChange, onVisibleBangNumberChange]);

  // Listen for scroll events - update every frame for smooth counter
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let rafId: number | null = null;
    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        rafId = requestAnimationFrame(() => {
          updateVisibleInfo();
          ticking = false;
        });
        ticking = true;
      }
    };

    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      container.removeEventListener("scroll", handleScroll);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [updateVisibleInfo]);

  // Scroll to date when prop changes (from heatmap click)
  useEffect(() => {
    if (scrollToDate && dateIndexMap.has(scrollToDate)) {
      const targetIndex = dateIndexMap.get(scrollToDate)!;
      const container = containerRef.current;
      if (!container) return;

      // Get current visible range
      const visibleItems = virtualizer.getVirtualItems();
      const currentStartIndex = visibleItems[0]?.index ?? 0;
      const distance = Math.abs(targetIndex - currentStartIndex);

      // Suspend heatmap updates during teleport
      isTeleporting.current = true;

      // For long distances, teleport close then smooth scroll the last bit
      if (distance > 50) {
        // Jump to slightly before target (so we can scroll "into" it)
        const jumpToIndex = Math.max(0, targetIndex - 5);
        virtualizer.scrollToIndex(jumpToIndex, { align: "start", behavior: "auto" });

        // Then smooth scroll the remaining distance after a frame
        requestAnimationFrame(() => {
          virtualizer.scrollToIndex(targetIndex, { align: "start", behavior: "smooth" });
        });
      } else {
        // Short distance - just smooth scroll
        virtualizer.scrollToIndex(targetIndex, { align: "start", behavior: "smooth" });
      }

      // Find the highest bang number for the target date
      let targetBangNumber: number | null = null;
      for (let i = targetIndex; i < rows.length; i++) {
        const row = rows[i];
        if (row.type === "bang") {
          targetBangNumber = row.bangNumberEnd;
          break;
        }
      }

      // Update counter immediately on click (don't wait for scroll)
      if (targetBangNumber !== null) {
        lastReportedBangNumber.current = targetBangNumber;
        onVisibleBangNumberChange?.(targetBangNumber);
      }

      // Update the visible date after teleport completes
      const delay = distance > 50 ? 400 : 300;
      const timeout = setTimeout(() => {
        lastReportedDate.current = scrollToDate;
        onVisibleDateChange?.(scrollToDate);

        // Keep teleporting flag on a bit longer to prevent scroll events from overriding
        setTimeout(() => {
          isTeleporting.current = false;
        }, 100);
      }, delay);
      return () => clearTimeout(timeout);
    }
  }, [scrollToDate, dateIndexMap, virtualizer, onVisibleDateChange, onVisibleBangNumberChange, rows]);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatTimestamp = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div
      className={`h-full relative transition-opacity duration-500 ${
        isVisible ? "opacity-100" : "opacity-0"
      }`}
    >
      {/* Fade overlay at top */}
      <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-background to-transparent z-10 pointer-events-none" />

      {/* Fade overlay at bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-background to-transparent z-10 pointer-events-none" />

      {/* Scrolling container */}
      <div
        ref={containerRef}
        className="h-full overflow-y-auto hide-scrollbar"
      >
        {/* Virtualized content */}
        <div
          className="relative px-4"
          style={{
            height: `${virtualizer.getTotalSize()}px`,
            paddingTop: "96px",
            paddingBottom: "96px",
          }}
        >
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const row = rows[virtualRow.index];
          if (!row) return null;

          if (row.type === "date") {
            return (
              <div
                key={virtualRow.key}
                className="absolute top-0 left-0 right-0 px-4"
                style={{
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start + 96}px)`,
                }}
              >
                <div className="text-xs text-primary font-medium uppercase tracking-widest pt-4">
                  {formatDate(row.date)}
                </div>
              </div>
            );
          }

          return (
            <div
              key={virtualRow.key}
              className="absolute top-0 left-0 right-0 px-4"
              style={{
                height: `${virtualRow.size}px`,
                transform: `translateY(${virtualRow.start + 96}px)`,
              }}
            >
              <div className="py-2 flex gap-3">
                <span className="text-xs text-muted-foreground/40 tabular-nums shrink-0 pt-0.5">
                  #{row.bangNumberEnd}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    <span className="text-foreground">"{row.transcript}"</span>
                  </p>
                  <p className="text-xs text-muted-foreground/60 mt-1">
                    {formatTimestamp(row.timestamp)} · {row.videoTitle}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
        </div>
      </div>
    </div>
  );
}
