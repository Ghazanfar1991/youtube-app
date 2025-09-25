import { extractYouTubeVideoId, getYouTubeThumbnailUrl } from "../utils/youtubeUtils";

export interface DownloadOption {
  id: string;
  label: string;
  format: string;
  size: string;
  bitrate?: number;
  audioBitrate?: number;
  fps?: number;
  height?: number;
  language?: string;
  requiresMerge?: boolean;
  type: "video" | "audio";
  extension: string;
  downloadFormat: string;
  downloadUrl: string;
}

export interface DownloadMetadata {
  id: string;
  title: string;
  thumbnail: string;
  channel?: string;
  duration?: string;
  video: DownloadOption[];
  audio: DownloadOption[];
}

const API_BASE = import.meta.env.VITE_PIPED_API_BASE || "http://localhost:4000";

const formatDuration = (input?: number | string) => {
  const numeric = Number(input);
  if (Number.isFinite(numeric) && numeric > 0) {
    const hours = Math.floor(numeric / 3600);
    const minutes = Math.floor((numeric % 3600) / 60);
    const seconds = Math.floor(numeric % 60);
    const parts = [
      hours > 0 ? hours : null,
      hours > 0 ? String(minutes).padStart(2, "0") : minutes,
      String(seconds).padStart(2, "0"),
    ].filter((part) => part !== null) as Array<number | string>;
    return parts.join(":");
  }
  if (typeof input === "string" && input.trim().length > 0) return input.trim();
  return undefined;
};

const normalise = (value: string | undefined, fallback: string) =>
  value && value.trim().length ? value.trim() : fallback;

const buildUrl = (videoId: string, title: string, source: any, type: "video" | "audio") => {
  const extension = source.extension || (type === "audio" ? "m4a" : "mp4");
  const params = new URLSearchParams({
    id: videoId,
    format: source.downloadFormat, // e.g. "303-1+251-10" straight from the backend
    ext: extension,
    title,
  });
  if (type === "audio") params.append("type", "audio");
  return `${API_BASE}/download?${params.toString()}`;
};
const buildDownloadUrl = (videoId: string, title: string, source: any, kind: "video" | "audio") => {
  const params = new URLSearchParams({
    id: videoId,
    format: source.downloadFormat, // already canonical, e.g. “303-1+251-10”
    ext: source.extension || (kind === "audio" ? "m4a" : "mp4"),
    title,
  });
  if (kind === "audio") params.append("type", "audio");
  return `${API_BASE}/download?${params.toString()}`;
};


const mapVideo = (videoId: string, title: string, source: any): DownloadOption => {
  const extension = source.extension || "mp4";
  return {
    id: source.id,
    label: normalise(source.label, "Video"),
    format: extension.toUpperCase(),
    size: normalise(source.size, "Unknown"),
    bitrate: source.bitrate,
    audioBitrate: source.audioBitrate,
    fps: source.fps,
    height: source.height,
    language: source.language,
    requiresMerge: !!source.requiresMerge,
    type: "video",
    extension,
    downloadFormat: source.downloadFormat,
    downloadUrl: buildUrl(videoId, title, source, "video"),
  };
};

const mapAudio = (videoId: string, title: string, source: any): DownloadOption => {
  const extension = source.extension || "m4a";
  return {
    id: source.id,
    label: normalise(source.label, "Audio"),
    format: extension.toUpperCase(),
    size: normalise(source.size, "Unknown"),
    bitrate: source.bitrate,
    audioBitrate: source.audioBitrate,
    language: source.language,
    type: "audio",
    extension,
    downloadFormat: source.downloadFormat,
    downloadUrl: buildUrl(videoId, title, source, "audio"),
  };
};

export async function fetchDownloadMetadata(videoUrl: string): Promise<DownloadMetadata> {
  const videoId = extractYouTubeVideoId(videoUrl);
  if (!videoId) throw new Error("Unable to parse the YouTube video ID.");

  const response = await fetch(`${API_BASE}/streams/${videoId}`);
  if (!response.ok) throw new Error("Unable to fetch download options.");

  const payload = await response.json();
  const title = payload.title ?? "YouTube Video";

  const video = (payload.videoStreams || []).map((option: any) =>
    mapVideo(videoId, title, option),
  );

  const audio = (payload.audioStreams || []).map((option: any) =>
    mapAudio(videoId, title, option),
  );

  return {
    id: videoId,
    title,
    thumbnail: payload.thumbnailUrl ?? getYouTubeThumbnailUrl(videoId),
    channel: payload.channel,
    duration: formatDuration(payload.durationSeconds ?? payload.duration),
    video,
    audio,
  };
}
