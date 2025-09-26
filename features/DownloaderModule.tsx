import React, { useMemo, useState } from "react";
import type { Page } from "../App";

type FormatType = "video+audio" | "video-only" | "audio-only";

interface FormatSummary {
  itag: number;
  mimeType: string | null;
  container: string | null;
  qualityLabel: string | null;
  audioQuality: string | null;
  audioBitrate: number | null;
  bitrate: number | null;
  fps: number | null;
  hasAudio: boolean;
  hasVideo: boolean;
  language: string | null;
  approxFileSizeBytes: number | null;
  approxFileSizeText: string | null;
  formatType: FormatType;
  isLive: boolean;
  url: string;
}

interface VideoSummary {
  id: string;
  title: string;
  author: string;
  channelId: string;
  lengthSeconds: number;
  viewCount: number;
  thumbnail: string | null;
  publishDate: string | null;
}

interface DownloaderResponse {
  video: VideoSummary;
  formats: FormatSummary[];
  proxyInstance?: string;
}

interface DownloaderModuleProps {
  onNavigate?: (page: Page) => void;
}

const CATEGORY_TABS: Array<{ key: FormatType | "all"; label: string }> = [
  { key: "video+audio", label: "Video + Audio" },
  { key: "video-only", label: "Video Only" },
  { key: "audio-only", label: "Audio Only" },
  { key: "all", label: "Everything" },
];

const formatDuration = (seconds: number) => {
  if (!Number.isFinite(seconds) || seconds <= 0) return "Live";
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  return [hrs, mins, secs]
    .filter((value, index) => value > 0 || index > 0)
    .map((value, index) => value.toString().padStart(index > 0 ? 2 : 1, "0"))
    .join(":");
};

const formatViews = (views: number) => {
  if (!views) return "0 views";
  if (views >= 1_000_000) return `${(views / 1_000_000).toFixed(1)}M views`;
  if (views >= 1_000) return `${(views / 1_000).toFixed(1)}K views`;
  return `${views.toLocaleString()} views`;
};

const sanitizeFileName = (title: string) =>
  title.replace(/[<>:"/\\|?*\x00-\x1F]/g, "").trim() || "youtube-download";

const DownloaderModule: React.FC<DownloaderModuleProps> = ({ onNavigate }) => {
  const [videoUrl, setVideoUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<DownloaderResponse | null>(null);
  const [activeTab, setActiveTab] = useState<FormatType | "all">("video+audio");

  const filteredFormats = useMemo(() => {
    if (!data) return [];
    return data.formats.filter((format) => {
      if (activeTab === "all") return true;
      return format.formatType === activeTab;
    });
  }, [data, activeTab]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const trimmed = videoUrl.trim();
    if (!trimmed) {
      setError("Paste a YouTube URL to get started.");
      return;
    }

    try {
      setIsLoading(true);
      const response = await fetch("/api/youtube/info", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: trimmed }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body?.error ?? "Unable to fetch video details.");
      }

      const result = (await response.json()) as DownloaderResponse;
      setData(result);
    } catch (err: any) {
      setData(null);
      setError(err?.message ?? "Unexpected error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section className="space-y-8">
      <header className="rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-gray-900/60 p-6 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">YouTube Downloader</h2>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
              Paste a public YouTube link to fetch every available quality along with estimated sizes and language tracks.
            </p>
          </div>
          {onNavigate && (
            <button
              className="hidden md:inline-flex items-center gap-2 rounded-md border border-primary/30 px-3 py-2 text-sm font-medium text-primary hover:bg-primary/10"
              onClick={() => onNavigate("dashboard")}
            >
              <span className="material-symbols-outlined text-base">arrow_back</span>
              Back to dashboard
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4 md:flex-row">
          <label className="flex-1">
            <span className="sr-only">YouTube URL</span>
            <input
              value={videoUrl}
              onChange={(event) => setVideoUrl(event.target.value)}
              placeholder="https://www.youtube.com/watch?v=..."
              className="w-full rounded-lg border border-black/10 bg-white/60 px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring focus:ring-primary/20 dark:border-white/10 dark:bg-gray-950/60"
              type="url"
              required
            />
          </label>
          <button
            type="submit"
            disabled={isLoading}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:bg-primary/50"
          >
            <span className="material-symbols-outlined text-base">
              {isLoading ? "hourglass_top" : "download"}
            </span>
            {isLoading ? "Fetching…" : "Fetch formats"}
          </button>
        </form>
        {error && (
          <p className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-400/60 dark:bg-red-400/10 dark:text-red-200">
            {error}
          </p>
        )}
      </header>

      {data && (
        <div className="space-y-6">
          <div className="rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-gray-900/60 p-6 shadow-sm">
            <div className="flex flex-col gap-4 md:flex-row md:items-center">
              {data.video.thumbnail && (
                <img
                  src={data.video.thumbnail}
                  alt={data.video.title}
                  className="h-32 w-56 rounded-lg object-cover shadow-sm"
                />
              )}
              {data.proxyInstance && (
  <p className="text-xs text-gray-500 dark:text-gray-400">
    Streams served via {data.proxyInstance}
  </p>
)}
              <div className="space-y-2">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">{data.video.title}</h3>
                <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-gray-600 dark:text-gray-300">
                  <span className="inline-flex items-center gap-1">
                    <span className="material-symbols-outlined text-base">person</span>
                    {data.video.author}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <span className="material-symbols-outlined text-base">schedule</span>
                    {formatDuration(data.video.lengthSeconds)}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <span className="material-symbols-outlined text-base">visibility</span>
                    {formatViews(data.video.viewCount)}
                  </span>
                  {data.video.publishDate && (
                    <span className="inline-flex items-center gap-1">
                      <span className="material-symbols-outlined text-base">calendar_today</span>
                      {data.video.publishDate}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-gray-900/60 p-6 shadow-sm">
            <div className="flex flex-wrap items-center gap-3">
              {CATEGORY_TABS.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                    activeTab === tab.key
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-black/10 text-gray-600 hover:border-primary/40 hover:text-primary dark:border-white/10 dark:text-gray-300"
                  }`}
                  type="button"
                >
                  {tab.label}
                </button>
              ))}
              <p className="ml-auto text-xs text-gray-500 dark:text-gray-400">
                Links open directly from YouTube. Large downloads may take time to start.
              </p>
            </div>

            <div className="mt-4 overflow-auto rounded-lg border border-black/10 dark:border-white/10">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-gray-50 text-gray-600 dark:bg-gray-900/70 dark:text-gray-300">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Quality</th>
                    <th className="px-4 py-3 font-semibold">Type</th>
                    <th className="px-4 py-3 font-semibold">Codec</th>
                    <th className="px-4 py-3 font-semibold">Language</th>
                    <th className="px-4 py-3 font-semibold">Size</th>
                    <th className="px-4 py-3 font-semibold"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5 dark:divide-white/10">
                  {filteredFormats.map((format) => (
                    <tr key={format.itag} className="hover:bg-black/5 dark:hover:bg-white/5">
                      <td className="px-4 py-3 text-gray-900 dark:text-white">
                        <div className="flex flex-col">
                          <span className="font-medium">
                            {format.qualityLabel ?? "Audio"}
                            {format.fps ? ` • ${format.fps}fps` : ""}
                          </span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {format.hasVideo && format.hasAudio
                              ? "Video + Audio"
                              : format.hasVideo
                              ? "Video only"
                              : "Audio only"}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-700 dark:text-gray-200">
                        {format.formatType === "video+audio"
                          ? "Progressive"
                          : format.formatType === "video-only"
                          ? "Video stream"
                          : "Audio stream"}
                      </td>
                      <td className="px-4 py-3 text-gray-700 dark:text-gray-200">
                        {format.mimeType?.split(";")[0] ?? format.container ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-gray-700 dark:text-gray-200">
                        {format.language ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-gray-700 dark:text-gray-200">
                        {format.approxFileSizeText ?? "Calculating…"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <a
                          href={format.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-2 text-xs font-semibold text-white transition hover:bg-primary/90"
                          download={
                            format.hasVideo
                              ? `${sanitizeFileName(data.video.title)}.${format.container ?? "mp4"}`
                              : `${sanitizeFileName(data.video.title)}.${format.container ?? "mp3"}`
                          }
                        >
                          <span className="material-symbols-outlined text-base">download</span>
                          Download
                        </a>
                      </td>
                    </tr>
                  ))}
                  {filteredFormats.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-6 text-center text-sm text-gray-500 dark:text-gray-400">
                        No formats found in this category. Try another tab.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default DownloaderModule;
