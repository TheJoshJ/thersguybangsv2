import { useState } from "react";
import { useLiveStatus } from "@/hooks/useLiveStatus";
import { BangHeatmap } from "@/components/BangHeatmap";
import { BangScroller } from "@/components/BangScroller";
import { RollingNumber } from "@/components/RollingNumber";

function Home() {
  const { data: liveData } = useLiveStatus();
  // Date clicked on heatmap - triggers scroll in transcript
  const [clickedDate, setClickedDate] = useState<string | null>(null);
  // Date currently visible in transcript - highlights on heatmap
  const [visibleDate, setVisibleDate] = useState<string | null>(null);
  // Total bang count from transcripts
  const [totalBangCount, setTotalBangCount] = useState<number>(0);
  // Highest bang number visible in transcript
  const [visibleBangNumber, setVisibleBangNumber] = useState<number | null>(null);

  // Show visible bang number if scrolling, otherwise show total
  const displayedBangCount = visibleBangNumber ?? totalBangCount;

  return (
    <div className="h-screen flex flex-col p-8 overflow-hidden relative">
      {/* Live indicator */}
      {liveData?.live && (
        <a
          href="https://twitch.tv/thersguy"
          target="_blank"
          rel="noopener noreferrer"
          className="absolute top-4 right-4 flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-500/10 hover:bg-red-500/20 transition-colors z-10"
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
          </span>
          <span className="text-xs font-medium text-red-500">LIVE</span>
        </a>
      )}

      {/* Top: Big number */}
      <section className="border-b border-border pb-8 mb-8">
        <p className="text-xs uppercase tracking-widest text-muted-foreground mb-4">
          Total bangs from the mouth of TheRSGuy
        </p>
        <div className="flex items-baseline gap-4">
          <RollingNumber
            value={displayedBangCount}
            className="text-7xl sm:text-8xl lg:text-9xl font-bold text-foreground tracking-tighter leading-none"
          />
        </div>
      </section>

      {/* Bottom: Heatmap + Scroller side by side */}
      <div className="flex-1 grid grid-cols-2 gap-8 min-h-0">
        {/* Left: Heatmap */}
        <div className="overflow-auto flex flex-col justify-end">
          <p className="text-xs uppercase tracking-widest text-muted-foreground mb-6">
            Click a day to see what he said
          </p>
          <BangHeatmap
            onDateClick={setClickedDate}
            highlightedDate={visibleDate}
          />
        </div>

        {/* Right: Scrolling transcripts */}
        <div className="h-full min-h-0 border-l border-border pl-8">
          <BangScroller
            scrollToDate={clickedDate}
            onVisibleDateChange={setVisibleDate}
            onVisibleBangNumberChange={setVisibleBangNumber}
            onTotalBangCountChange={setTotalBangCount}
          />
        </div>
      </div>
    </div>
  );
}

export default Home;
