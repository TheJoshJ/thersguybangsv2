import { useState } from "react";
import { YoutubeEmbed } from "./YoutubeEmbed";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatTimestamp } from "@/utils/formatTimestamp";
import type { TimestampEntry } from "@/hooks/useVideos";

interface RecordHighlightsProps {
  bangData: TimestampEntry[];
  id: string;
}

export function RecordHighlights({
  bangData,
  id,
}: RecordHighlightsProps) {
  const [videoStartTime, setVideoStartTime] = useState<number>(0);

  return (
    <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
      {/* Video Embed */}
      <div className="w-full">
        <YoutubeEmbed id={id} start={videoStartTime} />
      </div>

      {/* Scrollable List */}
      <div className="w-full flex flex-col h-[300px] md:h-[350px]">
        <h3 className="text-sm font-medium mb-2 text-muted-foreground">
          Bangs ({bangData.length})
        </h3>
        <ScrollArea className="overflow-auto rounded-md h-full bg-secondary/30">
          <div className="p-2">
            {bangData.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">
                No bangs in this video
              </p>
            ) : (
              bangData.map((instance, index) => (
                <div
                  className="flex flex-row my-2 py-2 gap-2 sm:gap-4 border-l-2 border-primary/50 pl-3 cursor-pointer hover:bg-secondary/50 rounded-r"
                  key={index}
                  onClick={() => {
                    setVideoStartTime(instance.timestamp);
                  }}
                >
                  <div className="w-[15%] sm:w-[12%] text-right text-xs sm:text-sm text-muted-foreground">
                    {formatTimestamp(instance.timestamp)}
                  </div>
                  <div className="w-[85%] sm:w-[88%] italic text-xs sm:text-sm">
                    "{instance.transcript}"
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
