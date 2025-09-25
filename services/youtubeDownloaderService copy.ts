import { extractYouTubeVideoId, getYouTubeThumbnailUrl } from "../utils/youtubeUtils";

interface RawStream {
  id?: string;
  url: string;
  qualityLabel?: string;
  label?: string;
  container?: string;
  format?: string;
  size?: string;
  bitrate?: number;
  audioBitrate?: number;
  fps?: number;
  hasAudio?: boolean;
  hasVideo?: boolean;
  isVideoOnly?: boolean;
  height?: number;
}

export interface DownloadOption {
  id: string;
  url: string;
  label: string;
  format: string;
  size: string;
  bitrate?: number;
  audioBitrate?: number;
  fps?: number;
  isVideoOnly?: boolean;
  hasAudio?: boolean;
  height?: number;
  type: "video" | "audio";
}

export interface DownloadMetadata {
  title: string;
  thumbnail: string;
  channel?: string;
  duration?: string;
  videoWithAudio: DownloadOption[];
  videoOnly: DownloadOption[];
  audio: DownloadOption[];
}

const API_BASE = import.meta.env.VITE_PIPED_API_BASE || "http://localhost:4000";

const normaliseLabel = (stream: RawStream, fallback: string) => {
  const source = [stream.qualityLabel, stream.label].find(
    (value) => typeof value === "string" && value.trim().length > 0,
  );
  return source ?? fallback;
};

const normaliseSize = (stream: RawStream) =>
  stream.size && stream.size.trim().length > 0 ? stream.size : "Unknown";

const buildVideoOption = (stream: RawStream, index: number): DownloadOption => ({
  id: stream.id ?? `video-${index}`,
  url: stream.url,
  label: normaliseLabel(stream, "Video"),
  format: (stream.container || stream.format || "video").toUpperCase(),
  size: normaliseSize(stream),
  bitrate: stream.bitrate,
  audioBitrate: stream.audioBitrate,
  fps: stream.fps,
  isVideoOnly: stream.hasAudio === false || stream.isVideoOnly,
  hasAudio: stream.hasAudio !== false,
  height: stream.height,
  type: "video",
});

const buildAudioOption = (stream: RawStream, index: number): DownloadOption => ({
  id: stream.id ?? `audio-${index}`,
  url: stream.url,
  label: normaliseLabel(stream, "Audio"),
  format: (stream.container || stream.format || "audio").toUpperCase(),
  size: normaliseSize(stream),
  bitrate: stream.bitrate,
  audioBitrate: stream.audioBitrate,
  type: "audio",
});

const sortVideoOptions = (a: DownloadOption, b: DownloadOption) =>
  (b.height ?? 0) - (a.height ?? 0) ||
  (b.fps ?? 0) - (a.fps ?? 0) ||
  (b.bitrate ?? 0) - (a.bitrate ?? 0);

const sortAudioOptions = (a: DownloadOption, b: DownloadOption) =>
  (b.audioBitrate ?? b.bitrate ?? 0) - (a.audioBitrate ?? a.bitrate ?? 0);

const formatDuration = (input?: number | string) => {
  const numeric = Number(input);
  if (Number.isFinite(numeric) && numeric > 0) {
    const hours = Math.floor(numeric / 3600);
    const minutes = Math.floor((numeric % 3600) / 60);
    const seconds = Math.floor(numeric % 60);

    const parts = [
      hours > 0 ? String(hours) : null,
      hours > 0 ? String(minutes).padStart(2, "0") : String(minutes),
      String(seconds).padStart(2, "0"),
    ].filter(Boolean);

    return parts.join(":");
  }

  if (typeof input === "string" && input.trim().length > 0) {
    return input;
  }

  return undefined;
};

export async function fetchDownloadMetadata(videoUrl: string): Promise<DownloadMetadata> {
  const videoId = extractYouTubeVideoId(videoUrl);
  if (!videoId) {
    throw new Error("Unable to parse the YouTube video ID.");
  }

  const response = await fetch(`${API_BASE}/streams/${videoId}`);
  if (!response.ok) {
    throw new Error("Unable to fetch download options.");
  }

  const payload = await response.json();

  const fallbackVideoStreams: RawStream[] = payload.videoStreams || [];
  const videoWithAudioStreams: RawStream[] =
    payload.videoWithAudioStreams ||
    fallbackVideoStreams.filter((stream) => stream.hasAudio !== false && stream.hasVideo !== false);
  const videoOnlyStreams: RawStream[] =
    payload.videoOnlyStreams ||
    fallbackVideoStreams.filter((stream) => stream.hasAudio === false || stream.isVideoOnly);

  const audioStreams: RawStream[] = payload.audioStreams || [];

  const videoWithAudioOptions = videoWithAudioStreams.map(buildVideoOption);
  const videoOnlyOptions = videoOnlyStreams.map(buildVideoOption);
  const audioOptions = audioStreams.map(buildAudioOption);

  videoWithAudioOptions.sort(sortVideoOptions);
  videoOnlyOptions.sort(sortVideoOptions);
  audioOptions.sort(sortAudioOptions);

  return {
    title: payload.title ?? "YouTube Video",
    thumbnail: payload.thumbnailUrl ?? payload.thumbnail ?? getYouTubeThumbnailUrl(videoId),
    channel: payload.channel ?? payload.uploader,
    duration: formatDuration(payload.durationSeconds ?? payload.duration),
    videoWithAudio: videoWithAudioOptions,
    videoOnly: videoOnlyOptions,
    audio: audioOptions,
  };
}
