import { useState, useMemo } from "react";
import { useAllVideos, VideoRecord } from "@/hooks/useVideos";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { formatTimestamp } from "@/utils/formatTimestamp";
import {
  ArrowUpDown,
  Play,
  ArrowLeft,
  Trophy,
  Film,
  Clock,
} from "lucide-react";
import { Link } from "react-router-dom";

type SortField = "date" | "bangs";
type SortDirection = "asc" | "desc";

export function Stats() {
  const { data: videos, isLoading, isError } = useAllVideos();

  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [sortField, setSortField] = useState<SortField>("bangs");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [selectedVideo, setSelectedVideo] = useState<VideoRecord | null>(null);
  const [videoStartTime, setVideoStartTime] = useState(0);

  // Filter and sort videos
  const filteredVideos = useMemo(() => {
    if (!videos) return [];

    let result = [...videos];

    if (sourceFilter !== "all") {
      result = result.filter((v) => v.source === sourceFilter);
    }

    result.sort((a, b) => {
      if (sortField === "date") {
        const dateA = new Date(a.publishedAt).getTime();
        const dateB = new Date(b.publishedAt).getTime();
        return sortDirection === "desc" ? dateB - dateA : dateA - dateB;
      } else {
        return sortDirection === "desc"
          ? b.bang_count - a.bang_count
          : a.bang_count - b.bang_count;
      }
    });

    return result;
  }, [videos, sourceFilter, sortField, sortDirection]);

  const totalVideos = videos?.length || 0;

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((d) => (d === "desc" ? "asc" : "desc"));
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <Skeleton className="h-12 w-48" />
          <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
            <Skeleton className="xl:col-span-2 h-[600px]" />
            <Skeleton className="xl:col-span-3 h-[600px]" />
          </div>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center p-8 border border-destructive/50 bg-destructive/10 rounded-lg">
          <Trophy className="h-12 w-12 text-destructive mx-auto mb-4" />
          <p className="text-destructive text-lg">Failed to load video data</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-4">
        {/* Header */}
        <header className="flex items-center justify-between">
          <h1 className="text-lg font-bold text-foreground">
            Bang Archive
          </h1>
          <Link to="/">
            <Button variant="ghost" size="sm" className="gap-1">
              <ArrowLeft className="h-4 w-4" />
              Home
            </Button>
          </Link>
        </header>

        {/* Main Content */}
        <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
          {/* Left Panel - Video List */}
          <div className="xl:col-span-2 bg-card border border-border rounded-xl overflow-hidden flex flex-col h-[600px] xl:h-[680px]">
            {/* Filters */}
            <div className="p-4 border-b border-border">
              <div className="flex gap-2">
                <Select value={sourceFilter} onValueChange={setSourceFilter}>
                  <SelectTrigger className="flex-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sources</SelectItem>
                    <SelectItem value="video">Videos Only</SelectItem>
                    <SelectItem value="vod">VODs Only</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => toggleSort("bangs")}
                  className={sortField === 'bangs' ? 'text-primary border-primary' : ''}
                >
                  <Trophy className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => toggleSort("date")}
                  className={sortField === 'date' ? 'text-primary border-primary' : ''}
                >
                  <ArrowUpDown className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Video List */}
            <ScrollArea className="flex-1 min-h-0">
              <div className="divide-y divide-border">
                {filteredVideos.map((video, index) => (
                  <button
                    key={video.videoId}
                    className={`w-full text-left px-4 py-3 transition-colors ${
                      selectedVideo?.videoId === video.videoId
                        ? "bg-primary/10 border-l-2 border-l-primary"
                        : "hover:bg-accent border-l-2 border-l-transparent"
                    }`}
                    onClick={() => {
                      setSelectedVideo(video);
                      setVideoStartTime(0);
                    }}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
                        index < 3
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-accent text-muted-foreground'
                      }`}>
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className={`font-medium line-clamp-1 text-sm mb-1 ${
                          selectedVideo?.videoId === video.videoId
                            ? "text-foreground"
                            : "text-foreground/80"
                        }`}>
                          {video.title}
                        </h3>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-[10px] px-2 py-0">
                            {video.source === "video" ? "VIDEO" : "VOD"}
                          </Badge>
                          <span className="text-muted-foreground text-xs">
                            {formatDate(video.publishedAt)}
                          </span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className={`text-lg font-bold tabular-nums ${
                          video.bang_count > 20
                            ? 'text-primary'
                            : 'text-muted-foreground'
                        }`}>
                          {video.bang_count}
                        </div>
                        <div className="text-muted-foreground text-[10px] uppercase tracking-wider">
                          bangs
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
                {filteredVideos.length === 0 && (
                  <div className="p-8 text-center text-muted-foreground">
                    No videos found
                  </div>
                )}
              </div>
            </ScrollArea>

            {/* Footer */}
            <div className="p-3 border-t border-border text-center text-xs text-muted-foreground shrink-0">
              Showing {filteredVideos.length} of {totalVideos} videos
            </div>
          </div>

          {/* Right Panel - Video Detail */}
          <div className="xl:col-span-3 bg-card border border-border rounded-xl overflow-hidden h-[600px] xl:h-[680px]">
            {selectedVideo ? (
              <div className="h-full flex flex-col">
                {/* Video Header */}
                <div className="px-4 py-3 border-b border-border">
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <h2 className="text-base font-bold text-foreground line-clamp-1">
                        {selectedVideo.title}
                      </h2>
                      <div className="flex items-center gap-2 text-xs">
                        <Badge variant="secondary" className="text-[10px] px-2 py-0">
                          {selectedVideo.source === "video" ? "Video" : "VOD"}
                        </Badge>
                        <span className="text-muted-foreground">
                          {formatDate(selectedVideo.publishedAt)}
                        </span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-xl font-black text-primary tabular-nums">
                        {selectedVideo.bang_count}
                      </span>
                      <span className="text-primary/60 text-xs ml-1">bangs</span>
                    </div>
                  </div>
                </div>

                {/* YouTube Embed */}
                <div className="px-4 py-2">
                  <div className="aspect-[2/1] bg-black rounded-lg overflow-hidden">
                    <iframe
                      key={`${selectedVideo.videoId}-${videoStartTime}`}
                      src={`https://www.youtube.com/embed/${selectedVideo.videoId}?start=${videoStartTime}&autoplay=1`}
                      title={selectedVideo.title}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      className="w-full h-full"
                    />
                  </div>
                </div>

                {/* Timestamps */}
                <div className="flex-1 min-h-0 px-4 py-2">
                  <div className="flex items-center gap-2 mb-2">
                    <Play className="h-3 w-3 text-primary" />
                    <h3 className="font-medium text-sm text-foreground">
                      Bang Moments
                    </h3>
                    <Badge variant="secondary" className="text-[10px] px-2 py-0">
                      {selectedVideo.bangs?.length || 0}
                    </Badge>
                  </div>
                  <ScrollArea className="h-[220px] xl:h-[260px]">
                    <div className="space-y-2 pr-4">
                      {selectedVideo.bangs?.length > 0 ? (
                        selectedVideo.bangs.map((bang, idx) => (
                          <button
                            key={idx}
                            onClick={() => setVideoStartTime(bang.timestamp)}
                            className="w-full text-left p-2 rounded-lg bg-secondary border border-border hover:border-primary/50 transition-colors"
                          >
                            <div className="flex items-start gap-2">
                              <Badge variant="outline" className="font-mono text-[10px] shrink-0">
                                {formatTimestamp(bang.timestamp)}
                              </Badge>
                              <p className="text-xs text-muted-foreground line-clamp-1">
                                "{bang.transcript}"
                              </p>
                            </div>
                          </button>
                        ))
                      ) : (
                        <div className="text-center py-8 text-muted-foreground">
                          <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                          <p>No timestamps available</p>
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center">
                <div className="text-center p-8">
                  <div className="bg-accent p-6 rounded-xl inline-block mb-6">
                    <Film className="h-12 w-12 text-muted-foreground" />
                  </div>
                  <h3 className="text-xl font-semibold text-foreground mb-2">
                    Select a Video
                  </h3>
                  <p className="text-muted-foreground text-sm max-w-xs mx-auto">
                    Choose a video from the list to watch and explore all the bang moments
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Stats;
