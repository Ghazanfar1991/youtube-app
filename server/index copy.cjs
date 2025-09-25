const express = require("express");
const cors = require("cors");
const path = require("path");
const { execFile } = require("child_process");

const app = express();
app.use(cors());

const ytDlpBinary = process.platform === "win32" ? "yt-dlp.exe" : "yt-dlp";
const ytDlpPath = path.join(
  __dirname,
  "..",
  "node_modules",
  "youtube-dl-exec",
  "bin",
  ytDlpBinary,
);

const formatSize = (entry) => {
  const bytes = entry.filesize || entry.filesize_approx;
  if (!bytes) return "Unknown";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const exponent = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  const value = bytes / Math.pow(1024, exponent);
  return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[exponent]}`;
};

const buildVideoLabel = (fmt) => {
  const parts = [];

  if (fmt.height) {
    let quality = `${fmt.height}p`;
    if (fmt.fps && fmt.fps !== 30) {
      quality += `${fmt.fps}`;
    }
    parts.push(quality);
  } else if (fmt.resolution && fmt.resolution !== "audio only") {
    parts.push(fmt.resolution);
  }

  if (fmt.dynamic_range && fmt.dynamic_range.toLowerCase() !== "sdr") {
    parts.push(fmt.dynamic_range.toUpperCase());
  }

  if (fmt.format_note && fmt.format_note !== "default") {
    parts.push(fmt.format_note);
  }

  return parts.join(" • ") || fmt.format_id || "Unknown quality";
};

const buildAudioLabel = (fmt) => {
  const language = [fmt.language_preference, fmt.language, fmt.language_alt]
    .find(Boolean);
  const quality = fmt.abr ? `${fmt.abr} kbps` : fmt.asr ? `${fmt.asr} Hz` : null;

  return [language?.toUpperCase(), quality].filter(Boolean).join(" • ") || "Audio";
};

const audioStreams = mapped.filter((fmt) => !fmt.hasVideo && fmt.hasAudio);


const runYtDlp = (videoId) =>
  new Promise((resolve, reject) => {
    const args = [
      `https://www.youtube.com/watch?v=${videoId}`,
      "--dump-single-json",
      "--skip-download",
      "--no-check-certificates",
      "--no-warnings",
      "--no-prefer-free-formats",
      "--add-header",
      "referer: https://www.youtube.com/",
      "--add-header",
      "user-agent: Mozilla/5.0",
    ];

    execFile(ytDlpPath, args, { windowsHide: true }, (error, stdout, stderr) => {
      if (error) {
        error.stderr = stderr;
        return reject(error);
      }

      try {
        resolve(JSON.parse(stdout));
      } catch (parseError) {
        reject(parseError);
      }
    });
  });

app.get("/streams/:id", async (req, res) => {
  try {
    const info = await runYtDlp(req.params.id);
    const formats = Array.isArray(info.formats) ? info.formats : [];

    const mapped = formats
      .filter((fmt) => fmt && fmt.url)
      .map((fmt, index) => {
        const hasVideo = fmt.vcodec && fmt.vcodec !== "none";
        const hasAudio = fmt.acodec && fmt.acodec !== "none";

        return {
          id: `${fmt.format_id}-${index}`,
          url: fmt.url,
          qualityLabel: hasVideo ? buildVideoLabel(fmt) : buildAudioLabel(fmt),
          container: fmt.ext ? fmt.ext.toUpperCase() : "UNKNOWN",
          size: formatSize(fmt),
          fps: typeof fmt.fps === "number" ? fmt.fps : undefined,
          bitrate: fmt.tbr ? Math.round(fmt.tbr * 1000) : undefined,
          audioBitrate: fmt.abr ? Math.round(fmt.abr * 1000) : undefined,
          hasVideo,
          hasAudio,
          height: typeof fmt.height === "number" ? fmt.height : undefined,
        };
      });

    const videoWithAudioStreams = mapped.filter((fmt) => fmt.hasVideo && fmt.hasAudio);
    const videoOnlyStreams = mapped.filter((fmt) => fmt.hasVideo && !fmt.hasAudio);
    const audioStreams = mapped.filter((fmt) => !fmt.hasVideo && fmt.hasAudio);

    const sortVideo = (a, b) =>
      (b.height ?? 0) - (a.height ?? 0) ||
      (b.fps ?? 0) - (a.fps ?? 0) ||
      (b.bitrate ?? 0) - (a.bitrate ?? 0);

    const sortAudio = (a, b) =>
      (b.audioBitrate ?? b.bitrate ?? 0) - (a.audioBitrate ?? a.bitrate ?? 0);

    videoWithAudioStreams.sort(sortVideo);
    videoOnlyStreams.sort(sortVideo);
    audioStreams.sort(sortAudio);

    const thumbnails = Array.isArray(info.thumbnails) ? info.thumbnails : [];
    const thumbnailUrl = thumbnails.length ? thumbnails[thumbnails.length - 1].url : info.thumbnail ?? "";

    res.json({
      title: info.title,
      thumbnailUrl,
      channel: info.uploader,
      durationSeconds: info.duration,
      videoWithAudioStreams,
      videoOnlyStreams,
      audioStreams,
    });
  } catch (error) {
    console.error("yt-dlp error:", error);
    res.status(500).json({ error: "Failed to retrieve video info." });
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`YouTube downloader backend listening on http://localhost:${PORT}`);
});
