const ytdl = require("ytdl-core");

/** @typedef {"video+audio" | "video-only" | "audio-only"} FormatType */

const ALLOWED_HOSTNAMES = new Set([
  "www.youtube.com",
  "youtube.com",
  "youtu.be",
  "m.youtube.com",
]);

const formatBytes = (bytes) => {
  if (!Number.isFinite(bytes) || bytes <= 0) return null;
  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  const value = bytes / Math.pow(1024, index);
  return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[index]}`;
};

const readBody = async (req) => {
  if (req.body) return req.body;
  const buffers = [];
  for await (const chunk of req) {
    buffers.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }
  const raw = Buffer.concat(buffers).toString("utf8");
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
};

module.exports = async (req, res) => {
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
  const body = req.method === "POST" ? await readBody(req) : {};
  const payloadUrl = typeof body?.url === "string" ? body.url : undefined;
  const targetUrl = (payloadUrl ?? queryUrl ?? "").trim();

  if (!targetUrl) {
    res.status(400).json({ error: "Missing YouTube URL" });
    return;
  }

  try {
    const candidateUrl = new URL(targetUrl);
    if (!ALLOWED_HOSTNAMES.has(candidateUrl.hostname)) {
      res.status(400).json({ error: "Only public YouTube URLs are supported" });
      return;
    }
  } catch {
    res.status(400).json({ error: "Invalid URL" });
    return;
  }

  if (!ytdl.validateURL(targetUrl)) {
    res.status(400).json({ error: "Unable to validate YouTube URL" });
    return;
  }

  try {
    const info = await ytdl.getInfo(targetUrl);
    const durationSeconds = Number(info.videoDetails.lengthSeconds ?? 0);

    const formats = info.formats
      .filter((format) => format.url && (format.hasVideo || format.hasAudio))
      .map((format) => {
        /** @type {FormatType} */
        const type =
          format.hasVideo && format.hasAudio
            ? "video+audio"
            : format.hasVideo
            ? "video-only"
            : "audio-only";

        const contentLength = format.contentLength ? parseInt(format.contentLength, 10) : null;
        const estimated =
          contentLength ??
          (durationSeconds && format.bitrate
            ? Math.round((format.bitrate / 8) * durationSeconds)
            : null);

        return {
          itag: format.itag,
          mimeType: format.mimeType ?? null,
          container:
            format.container ??
            (format.mimeType ? format.mimeType.split(";")[0].split("/")[1] : null),
          qualityLabel: format.qualityLabel ?? null,
          audioQuality: format.audioQuality ?? format.audioTrack?.audioQuality ?? null,
          audioBitrate: format.audioBitrate ?? null,
          bitrate: format.bitrate ?? null,
          fps: format.fps ?? null,
          hasAudio: format.hasAudio,
          hasVideo: format.hasVideo,
          language: format.language ?? format.audioTrack?.displayName ?? null,
          approxFileSizeBytes: estimated,
          approxFileSizeText: estimated ? formatBytes(estimated) : null,
          formatType: type,
          isLive: info.videoDetails.isLiveContent,
          url: format.url,
        };
      })
      .sort((a, b) => {
        const order = { "video+audio": 0, "video-only": 1, "audio-only": 2 };
        if (a.formatType !== b.formatType) {
          return order[a.formatType] - order[b.formatType];
        }
        const qualityA = parseInt(a.qualityLabel ?? "0", 10);
        const qualityB = parseInt(b.qualityLabel ?? "0", 10);
        return qualityB - qualityA;
      });

    res.status(200).json({
      video: {
        id: info.videoDetails.videoId,
        title: info.videoDetails.title,
        author: info.videoDetails.author.name,
        channelId: info.videoDetails.channelId,
        lengthSeconds: durationSeconds,
        viewCount: Number(info.videoDetails.viewCount ?? 0),
        thumbnail:
          info.videoDetails.thumbnails.sort((a, b) => (b.width ?? 0) - (a.width ?? 0))[0]?.url ??
          null,
        publishDate: info.videoDetails.publishDate ?? null,
      },
      formats,
    });
  } catch (error) {
    console.error("YouTube info fetch failed:", error);
    res.status(500).json({ error: "Failed to retrieve video metadata" });
  }
};


