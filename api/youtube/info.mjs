// api/youtube/info.mjs
const DEFAULT_PIPED_INSTANCES = [
  "piped.video",
  "piped.mha.fi",
  "piped.lunar.icu",
  "watch.leptons.xyz"
];

const formatBytes = (bytes) => {
  if (!Number.isFinite(bytes) || bytes <= 0) return null;
  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  const value = bytes / 1024 ** index;
  return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[index]}`;
};

const toNumber = (value) => {
  if (value === undefined || value === null) return null;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const parseVideoId = (input) => {
  const trimmed = input.trim();
  if (!trimmed) return null;

  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return trimmed;

  try {
    const url = new URL(trimmed);
    const host = url.hostname.replace(/^www\./, "");

    if (host === "youtu.be") return url.pathname.replace(/^\/+/, "").substring(0, 11);

    if (host.endsWith("youtube.com")) {
      if (url.searchParams.has("v")) return url.searchParams.get("v").substring(0, 11);
      const pathMatch = url.pathname.match(/\/(shorts|live|embed)\/([a-zA-Z0-9_-]{11})/);
      if (pathMatch) return pathMatch[2];
    }
  } catch {
    return null;
  }

  return null;
};

const sanitizeInstance = (value) =>
  value ? value.replace(/^https?:\/\//, "").replace(/\/+$/, "") : value;

const formatVideoStream = (stream, counter, isLive) => ({
  itag: counter,
  mimeType: stream.mimeType ?? (stream.format ? `video/${stream.format.toLowerCase()}` : null),
  container: stream.format ? stream.format.toLowerCase() : null,
  qualityLabel: stream.quality ?? stream.qualityLabel ?? null,
  audioQuality: stream.audioTrack?.audioQuality ?? null,
  audioBitrate: toNumber(stream.bitrate),
  bitrate: toNumber(stream.bitrate),
  fps: toNumber(stream.fps),
  hasAudio: !stream.videoOnly,
  hasVideo: true,
  language: stream.audioTrack?.audioLocale ?? stream.audioTrack?.displayName ?? null,
  approxFileSizeBytes: toNumber(stream.size) ?? null,
  approxFileSizeText: formatBytes(toNumber(stream.size)),
  formatType: stream.videoOnly ? "video-only" : "video+audio",
  isLive,
  url: stream.url
});

const formatAudioStream = (stream, counter, isLive) => ({
  itag: counter,
  mimeType: stream.mimeType ?? (stream.format ? `audio/${stream.format.toLowerCase()}` : null),
  container: stream.format ? stream.format.toLowerCase() : null,
  qualityLabel: stream.quality ?? null,
  audioQuality: stream.audioTrack?.audioQuality ?? stream.quality ?? null,
  audioBitrate: toNumber(stream.bitrate),
  bitrate: toNumber(stream.bitrate),
  fps: null,
  hasAudio: true,
  hasVideo: false,
  language: stream.audioTrack?.audioLocale ?? stream.audioTrack?.displayName ?? null,
  approxFileSizeBytes: toNumber(stream.size) ?? null,
  approxFileSizeText: formatBytes(toNumber(stream.size)),
  formatType: "audio-only",
  isLive,
  url: stream.url
});

const getInstanceList = () => {
  const envValue = sanitizeInstance(process.env.PIPED_INSTANCE);
  if (envValue) return [envValue, ...DEFAULT_PIPED_INSTANCES.filter((i) => i !== envValue)];
  return DEFAULT_PIPED_INSTANCES;
};

const fetchStreams = async (videoId) => {
  const errors = [];
  for (const host of getInstanceList()) {
    try {
      const rsp = await fetch(`https://${host}/api/v1/streams/${videoId}`, {
        headers: { accept: "application/json" }
      });
      if (!rsp.ok) throw new Error(`HTTP ${rsp.status}`);
      const json = await rsp.json();
      return { host, json };
    } catch (error) {
      errors.push(`${host}: ${error.message}`);
    }
  }
  throw new Error(`All proxy instances failed. Attempted: ${errors.join(" | ")}`);
};

const fetchMetadata = async (videoId, host) => {
  try {
    const rsp = await fetch(`https://${host}/api/v1/videos/${videoId}`, {
      headers: { accept: "application/json" }
    });
    if (!rsp.ok) return null;
    return await rsp.json();
  } catch {
    return null;
  }
};

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  if (req.method !== "GET" && req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const parsedUrl = new URL(req.url ?? "/", "https://placeholder.local");
  const queryUrl = parsedUrl.searchParams.get("url") ?? undefined;
  let body = {};
  if (req.method === "POST") {
    body = req.body ?? {};
    if (!req.body) {
      const chunks = [];
      for await (const chunk of req) chunks.push(chunk);
      if (chunks.length) {
        try {
          body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
        } catch {
          body = {};
        }
      }
    }
  }

  const rawTarget = typeof body?.url === "string" ? body.url : queryUrl;
  const videoId = rawTarget ? parseVideoId(rawTarget) : null;

  if (!videoId) {
    res.status(400).json({ error: "Provide a valid YouTube URL or video ID." });
    return;
  }

  try {
    const { host, json: streamData } = await fetchStreams(videoId);
    const videoMeta = await fetchMetadata(videoId, host);
    const isLive = Boolean(streamData.isLive);
    let counter = 1000;

    const videoFormats = Array.isArray(streamData.videoStreams)
      ? streamData.videoStreams.map((stream) => formatVideoStream(stream, ++counter, isLive))
      : [];

    const audioFormats = Array.isArray(streamData.audioStreams)
      ? streamData.audioStreams.map((stream) => formatAudioStream(stream, ++counter, isLive))
      : [];

    const formats = [...videoFormats, ...audioFormats].sort((a, b) => {
      const order = { "video+audio": 0, "video-only": 1, "audio-only": 2 };
      if (a.formatType !== b.formatType) {
        return order[a.formatType] - order[b.formatType];
      }
      const qualityA = parseInt(a.qualityLabel ?? "0", 10);
      const qualityB = parseInt(b.qualityLabel ?? "0", 10);
      return qualityB - qualityA;
    });

    const fallbackViews = streamData.views ?? streamData.viewCount ?? null;
    const fallbackDuration = streamData.duration ?? null;
    const fallbackPublish = streamData.uploadDate ?? streamData.uploadDate ?? null;

    res.status(200).json({
      video: {
        id: videoId,
        title: streamData.title ?? videoMeta?.title ?? "YouTube video",
        author: streamData.uploader ?? videoMeta?.uploader ?? "Unknown creator",
        channelId: streamData.uploaderId ?? videoMeta?.uploaderId ?? null,
        lengthSeconds: toNumber(videoMeta?.duration) ?? toNumber(fallbackDuration) ?? 0,
        viewCount: toNumber(videoMeta?.views) ?? toNumber(fallbackViews) ?? 0,
        thumbnail: streamData.thumbnailUrl ?? videoMeta?.thumbnailUrl ?? null,
        publishDate: videoMeta?.uploadDate ?? fallbackPublish ?? null
      },
      formats,
      proxyInstance: host
    });
  } catch (error) {
    console.error("Proxy fetch failed:", error);
    res.status(502).json({ error: "All proxy instances failed to respond." });
  }
}
