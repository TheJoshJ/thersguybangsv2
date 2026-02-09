interface YoutubeEmbedProps {
  id: string;
  start?: number;
}

export function YoutubeEmbed({ id, start = 0 }: YoutubeEmbedProps) {
  // Start 2 seconds before the timestamp for context
  const adjustedStart = Math.max(0, start - 2);

  return (
    <div className="relative w-full pt-[56.25%]">
      <iframe
        className="absolute top-0 left-0 w-full h-full rounded-lg"
        src={`https://www.youtube.com/embed/${id}?start=${adjustedStart}&autoplay=0`}
        title="YouTube video player"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
      />
    </div>
  );
}
