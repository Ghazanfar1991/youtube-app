import React, { useState, useContext, useCallback } from "react";
import { Page } from "../App";
import { ToastContext } from "../contexts/ToastContext";
import { AuthContext } from "../contexts/AuthContext";
import { fetchDownloadMetadata, DownloadOption } from "../services/youtubeDownloaderService";
import { extractYouTubeVideoId, getYouTubeThumbnailUrl } from "../utils/youtubeUtils";

interface ModuleProps {
    onNavigate: (page: Page) => void;
}

const YouTubeDownloaderModule: React.FC<ModuleProps> = ({ onNavigate }) => {
  const [url, setUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [metadata, setMetadata] = useState<{
    title: string;
    thumbnail: string;
    channel?: string;
    duration?: string;
    videoWithAudio: DownloadOption[];
    videoOnly: DownloadOption[];
    audio: DownloadOption[];
  } | null>(null);
  const { showToast } = useContext(ToastContext);
  const { activeAccount, login } = useContext(AuthContext);

  const resetState = () => setMetadata(null);

  const handleFetch = useCallback(async () => {
    if (!url.trim()) return;

    setIsLoading(true);
    resetState();

    try {
      const data = await fetchDownloadMetadata(url.trim());
      if (!data.thumbnail) {
        const id = extractYouTubeVideoId(url.trim());
        data.thumbnail = id ? getYouTubeThumbnailUrl(id) : "";
      }
      setMetadata(data);
      showToast({ message: "Download options ready.", variant: "default" });
    } catch (error: any) {
      showToast({
        message: error?.message || "Unable to load video details.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [showToast, url]);

  const handleDownload = (option: DownloadOption) => {
    const link = document.createElement("a");
    link.href = option.url;
    link.rel = "noopener noreferrer";
    link.target = "_blank";
    link.download = "";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const renderOptionCard = (option: DownloadOption, categoryLabel: string) => {
    const bitrateSource = option.audioBitrate ?? option.bitrate;
    const infoParts = [
      option.format,
      option.size,
      option.fps ? `${option.fps} fps` : undefined,
      bitrateSource ? `${Math.round(bitrateSource / 1000)} kbps` : undefined,
    ].filter(Boolean);

    return (
      <div
        key={option.id}
        className="bg-white dark:bg-gray-900/60 border border-black/5 dark:border-white/10 rounded-xl p-4 flex flex-col gap-3 shadow-sm"
      >
        <div className="space-y-1">
          <p className="text-sm font-semibold text-gray-900 dark:text-white">
            {option.label}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            <span className="font-semibold text-primary">{categoryLabel}</span>
            {infoParts.length > 0 ? ` • ${infoParts.join(" • ")}` : ""}
          </p>
        </div>

        <button
          onClick={() => handleDownload(option)}
          className="inline-flex items-center justify-center gap-2 h-10 rounded-lg bg-primary text-white text-xs font-semibold tracking-wide hover:bg-primary/90 transition-colors"
        >
          <span className="material-symbols-outlined text-sm">download</span>
          Download
        </button>
      </div>
    );
  };

  const videoWithAudio = metadata?.videoWithAudio ?? [];
  const videoOnly = metadata?.videoOnly ?? [];
  const audioOnly = metadata?.audio ?? [];

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1 space-y-8">
                <div className="bg-white dark:bg-gray-900/50 p-6 rounded-xl">
                    <h2 className="text-2xl font-bold mb-1 text-gray-900 dark:text-white">
                        YouTube Video Downloader
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                        Fetch every available quality (video or audio) and download instantly.
                    </p>
                    <form
                        onSubmit={(e) => {
                            e.preventDefault();
                            handleFetch();
                        }}
                        className="space-y-4"
                    >
                        <div>
                            <label htmlFor="downloader-url" className="sr-only">
                                YouTube video URL
                            </label>
                            <input
                                id="downloader-url"
                                type="text"
                                value={url}
                                onChange={(e) => setUrl(e.target.value)}
                                placeholder="Paste YouTube video URL"
                                disabled={isLoading}
                                className="form-input w-full rounded-lg border-gray-300 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 h-12 px-4 placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:border-primary focus:ring-primary text-gray-900 dark:text-white"
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={isLoading || !url.trim()}
                            className="w-full flex items-center justify-center rounded-lg h-12 px-6 bg-primary text-white text-sm font-bold tracking-wide shadow-sm hover:bg-primary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-50"
                        >
                            <span className="material-symbols-outlined text-base mr-2">
                                {isLoading ? "hourglass_top" : "download"}
                            </span>
                            <span>{isLoading ? "Fetching..." : "Get Download Options"}</span>
                        </button>
                    </form>
                </div>
                {!activeAccount && (
                    <div className="bg-primary/10 dark:bg-primary/20 border border-primary/30 rounded-xl p-4 text-sm text-primary flex items-center justify-between">
                        <span>Connect your account to keep downloads synced.</span>
                        <button
                            onClick={login}
                            className="inline-flex items-center gap-2 px-3 py-2 bg-primary text-white rounded-lg text-xs font-semibold tracking-wide hover:bg-primary/90 transition-colors"
                        >
                            <span className="material-symbols-outlined text-sm">login</span>
                            Log In
                        </button>
                    </div>
                )}
            </div>

            <div className="lg:col-span-2 space-y-8">
                <div className="bg-white dark:bg-gray-900/50 p-6 rounded-xl">
                    <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
                        Download Options
                    </h3>

{metadata ? (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row gap-4">
                                                <div className="relative shrink-0 w-full sm:w-48 aspect-video overflow-hidden rounded-lg bg-gray-200 dark:bg-gray-800">
                                    {metadata.thumbnail ? (
                                        <img
                                            src={metadata.thumbnail}
                                            alt={metadata.title}
                                            className="h-full w-full object-cover"
                                        />
                                    ) : (
                                        <div className="h-full w-full flex items-center justify-center text-gray-500">
                                            <span className="material-symbols-outlined text-4xl">movie</span>
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1">
                                    <p className="text-lg font-semibold text-gray-900 dark:text-white">
                                        {metadata.title}
                                    </p>
                                    {metadata.channel && (
                                        <p className="text-sm text-gray-500 dark:text-gray-400">
                                            {metadata.channel}
                                        </p>
                                    )}
                                    {metadata.duration && (
                                        <p className="text-xs text-gray-400 mt-1">
                                            Duration: {metadata.duration}
                                        </p>
                                    )}
                                </div>
                            </div>

              {videoWithAudio.length > 0 && (
                <section>
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 uppercase tracking-wide">
                    Video + Audio
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                    {videoWithAudio.map((option) => renderOptionCard(option, "Video + Audio"))}
                  </div>
                </section>
              )}

              {videoOnly.length > 0 && (
                <section>
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 uppercase tracking-wide">
                    Video Only (no audio)
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                    {videoOnly.map((option) => renderOptionCard(option, "Video Only"))}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    These downloads contain video only. Combine with an audio track in an editor if needed.
                  </p>
                </section>
              )}

              {audioOnly.length > 0 && (
                <section>
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 uppercase tracking-wide">
                    Audio Only
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                    {audioOnly.map((option) => renderOptionCard(option, "Audio Only"))}
                  </div>
                </section>
              )}

              {videoWithAudio.length === 0 && videoOnly.length === 0 && audioOnly.length === 0 && (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  No downloadable streams were returned for this video.
                </p>
              )}
            </div>
          ) : (
                        <div className="text-center text-sm text-gray-500 dark:text-gray-400 py-8">
                            <span className="material-symbols-outlined text-4xl mb-2">download_for_offline</span>
                            <p>Paste a YouTube URL to see every available quality.</p>
                        </div>
                    )}
                </div>

                <div className="bg-white dark:bg-gray-900/40 p-6 rounded-xl border border-dashed border-gray-300 dark:border-gray-700">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                        Need to work with thumbs or faces instead?{" "}
                        <button
                            onClick={() => onNavigate("extractor")}
                            className="text-primary font-semibold hover:underline"
                        >
                            Open Thumbnail Extractor
                        </button>{" "}
                        or{" "}
                        <button
                            onClick={() => onNavigate("face-editor")}
                            className="text-primary font-semibold hover:underline"
                        >
                            Face Editor
                        </button>
                        .
                    </p>
                </div>
            </div>
        </div>
    );
};

export default YouTubeDownloaderModule;
