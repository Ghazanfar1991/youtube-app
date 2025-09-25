
const express = require("express");
const cors = require("cors");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env.local") });

const os = require("os");
const fs = require("fs");
const fsp = fs.promises;
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
  ytDlpBinary
);

// Point to your ffmpeg; ENV wins if set
const ffmpegBinary =
  process.env.FFMPEG_PATH || "C:\\ffmpeg\\bin\\ffmpeg.exe"; // <- set this to your real ffmpeg on Windows
console.log("FFmpeg configured at:", ffmpegBinary);

const cookieEnv = {
  file: process.env.YT_DLP_COOKIES_FILE || process.env.YTDLP_COOKIES_FILE,
  fromBrowser:
    process.env.YT_DLP_COOKIES_FROM_BROWSER ||
    process.env.YTDLP_COOKIES_FROM_BROWSER,
  browserProfile:
    process.env.YT_DLP_BROWSER_PROFILE || process.env.YTDLP_BROWSER_PROFILE,
};

let cookieSourceLabel;
const cookieArgs = (() => {
  if (cookieEnv.file) {
    cookieSourceLabel = `file ${cookieEnv.file}`;
    return ["--cookies", cookieEnv.file];
  }
  if (cookieEnv.fromBrowser) {
    const spec = cookieEnv.browserProfile
      ? `${cookieEnv.fromBrowser}:${cookieEnv.browserProfile}`
      : cookieEnv.fromBrowser;
    cookieSourceLabel = `browser ${spec}`;
    return ["--cookies-from-browser", spec];
  }
  return [];
})();

if (cookieSourceLabel) {
  console.log("yt-dlp cookies configured from", cookieSourceLabel);
} else {
  console.warn("yt-dlp cookies not configured; some videos may require login.");
}

const AUTH_HELP_MESSAGE =
  "YouTube requires authentication. Configure yt-dlp cookies (set YT_DLP_COOKIES_FROM_BROWSER or YT_DLP_COOKIES_FILE).";
const requiresLogin = (stderr) =>
  typeof stderr === "string" && /sign in to confirm you.?re not a bot/i.test(stderr);

// ---------- utilities ----------
// ---------- utilities ----------
const formatBytes = (bytes) => {
  if (!Number.isFinite(bytes) || bytes <= 0) return "Unknown";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.min(
    units.length - 1,
    Math.floor(Math.log(bytes) / Math.log(1024))
  );
  const v = bytes / Math.pow(1024, i);
  return `${v.toFixed(v >= 10 ? 0 : 1)} ${units[i]}`;
};
const pickNumber = (...vals) =>
  vals.find((v) => Number.isFinite(v) && v > 0);
const normaliseLanguage = (v) => {
  if (!v) return undefined;
  if (typeof v === "string")
    return v.trim() ? v.trim().toUpperCase() : undefined;
  if (Array.isArray(v))
    for (const e of v) {
      const x = normaliseLanguage(e);
      if (x) return x;
    }
  return undefined;
};
const extractAudioTrackMeta = (fmt) => {
  if (!fmt || typeof fmt !== "object") return null;
  const track =
    (fmt.audioTrack && typeof fmt.audioTrack === "object"
      ? fmt.audioTrack
      : fmt.audio_track && typeof fmt.audio_track === "object"
      ? fmt.audio_track
      : null);
  if (!track) return null;

  const type = typeof track.type === "string" ? track.type : undefined;
  const name = typeof track.name === "string" ? track.name : undefined;
  const lowerType = type ? type.toLowerCase() : "";
  const lowerName = name ? name.toLowerCase() : "";
  const combined = `${lowerType} ${lowerName}`;

  const isDefault = Boolean(
    track.audio_is_default || track.default || track.is_default || track.isDefault
  );
  const isOriginal =
    isDefault || combined.includes("original") || combined.includes("main");
  const isDub =
    combined.includes("dub") ||
    combined.includes("translation") ||
    combined.includes("voice") ||
    combined.includes("interpre");
  const isDescription =
    combined.includes("description") ||
    combined.includes("described") ||
    combined.includes("commentary") ||
    combined.includes("narration");

  return {
    type,
    name,
    lowerType,
    lowerName,
    isDefault,
    isOriginal,
    isDub,
    isDescription,
  };
};
const displayVideoLabel = (fmt) => {
  const p = [];
  if (fmt.height) {
    let s = `${fmt.height}p`;
    if (fmt.fps && fmt.fps !== 30) s += `@${fmt.fps}`;
    p.push(s);
  } else if (fmt.resolution && fmt.resolution !== "audio only")
    p.push(fmt.resolution);
  if (
    fmt.dynamic_range &&
    String(fmt.dynamic_range).toLowerCase() !== "sdr"
  )
    p.push(String(fmt.dynamic_range).toUpperCase());
  if (fmt.format_note && fmt.format_note !== "default")
    p.push(fmt.format_note);
  return p.join(" • ") || fmt.format_id || "Unknown quality";
};
const buildAudioLabel = (fmt, trackMeta) => {
  const lang = normaliseLanguage([
    fmt.language_preference,
    fmt.language,
    fmt.language_alt,
    trackMeta && trackMeta.language,
  ]);
  const q = fmt.abr ? `${fmt.abr} kbps` : fmt.asr ? `${fmt.asr} Hz` : null;
  const trackTag = trackTagForDisplay(trackMeta);
  return [lang, trackTag, q].filter(Boolean).join(" • ") || "Audio";
};



const buildAudioTrackIndex = (info) => {
  const map = new Map();
  if (!info || !Array.isArray(info.audioTracks)) return map;

  info.audioTracks.forEach((track) => {
    if (!track) return;
    const id =
      track.id ||
      track.audioTrackId ||
      track.audio_track_id ||
      track.format_id ||
      track.uid;
    if (!id) return;

    const lowerKind = (track.kind || track.type || "").toLowerCase();
    map.set(String(id), {
      id: String(id),
      kind: track.kind || track.type || null,
      name: track.name || track.displayName || null,
      displayName: track.displayName || track.name || null,
      isDefault: Boolean(track.default || track.isDefault || track.is_default),
      isOriginal:
        Boolean(track.original || track.isOriginal || track.is_original) ||
        lowerKind.includes("original"),
      isDub:
        lowerKind.includes("dub") ||
        lowerKind.includes("translation") ||
        lowerKind.includes("interpre") ||
        lowerKind.includes("voice"),
      isDescription:
        lowerKind.includes("description") ||
        lowerKind.includes("described") ||
        lowerKind.includes("commentary") ||
        lowerKind.includes("narration"),
      language: normaliseLanguage([
        track.language,
        track.languageCode,
        track.language_name,
      ]),
    });
  });

  return map;
};

const extractAudioTrackInfo = (fmt, trackIndex) => {
  const rawTrack =
    (fmt.audioTrack && typeof fmt.audioTrack === "object" && fmt.audioTrack) ||
    (fmt.audio_track && typeof fmt.audio_track === "object" && fmt.audio_track) ||
    null;
  const rawId =
    (rawTrack && (rawTrack.id || rawTrack.audioTrackId)) ||
    fmt.audioTrackId ||
    fmt.audio_track_id ||
    (typeof rawTrack === "string" ? rawTrack : null);
  const mapped = rawId ? trackIndex.get(String(rawId)) : undefined;

  const kind =
    (rawTrack && (rawTrack.kind || rawTrack.type)) ||
    (mapped && mapped.kind) ||
    null;
  const name = (rawTrack && rawTrack.name) || (mapped && mapped.name) || null;
  const displayName =
    (rawTrack && rawTrack.displayName) ||
    (mapped && mapped.displayName) ||
    name ||
    kind ||
    null;

  const descriptor = `${kind || ""} ${name || ""} ${displayName || ""}`.toLowerCase();
  const isDub =
    /dub|translation|interpre|voice/.test(descriptor) ||
    Boolean(mapped && mapped.isDub);
  const isDescription =
    /description|described|commentary|narration/.test(descriptor) ||
    Boolean(mapped && mapped.isDescription);

  return {
    id: rawId ? String(rawId) : mapped && mapped.id ? mapped.id : undefined,
    kind,
    name,
    displayName,
    isDefault:
      Boolean(rawTrack && (rawTrack.default || rawTrack.is_default)) ||
      Boolean(mapped && mapped.isDefault),
    isOriginal:
      Boolean(rawTrack && (rawTrack.original || rawTrack.is_original)) ||
      Boolean(mapped && mapped.isOriginal) ||
      descriptor.includes("original") ||
      descriptor.includes("main"),
    isDub,
    isDescription,
    language:
      normaliseLanguage([
        fmt.audio_track_language,
        fmt.audioTrackLanguage,
        mapped && mapped.language,
      ]) || undefined,
  };
};

const trackTagForDisplay = (meta) => {
  if (!meta) return null;
  if (meta.isDub) return meta.displayName || meta.name || meta.kind || "Dub";
  if (meta.isDescription)
    return meta.displayName || meta.name || meta.kind || "Description";
  if (!meta.isOriginal && (meta.displayName || meta.name || meta.kind)) {
    return meta.displayName || meta.name || meta.kind;
  }
  return null;
};

const scoreAudioCandidate = (fmt, trackMeta, primaryLang) => {
  let score = 0;
  if (trackMeta?.isDefault) score += 500;
  if (trackMeta?.isOriginal) score += 400;
  if (trackMeta?.isDub) score -= 1200;
  if (trackMeta?.isDescription) score -= 900;

  if (primaryLang) {
    if (fmt.language === primaryLang) score += 200;
    else if (trackMeta?.language === primaryLang) score += 180;
  }
  if (fmt.language) score += 70;

  const bitrate = fmt.audioBitrate ?? fmt.bitrate ?? 0;
  score += bitrate / 1000;
  return score;
};


const yt = (videoId, extraArgs = []) =>
  new Promise((resolve, reject) => {
    const args = [
      `https://www.youtube.com/watch?v=${videoId}`,
      ...cookieArgs,
      ...extraArgs,
      "--no-check-certificates",
      "--no-warnings",
      "--no-playlist",
      "--add-header",
      "referer: https://www.youtube.com/",
      "--add-header",
      "user-agent: Mozilla/5.0",
    ];
    execFile(ytDlpPath, args, { windowsHide: true }, (err, stdout, stderr) => {
      if (err) {
        err.stderr = stderr;
        return reject(err);
      }
      resolve(stdout);
    });
  });

const looksLikeItagPair = (s) => /^[0-9]+(\+[0-9]+)?$/.test(s);

async function validateItags(videoId, itagExpr) {
  try {
    const raw = await yt(videoId, ["--dump-single-json", "--skip-download"]);
    const info = JSON.parse(raw);
    const set = new Set((info.formats || []).map((f) => String(f.format_id)));
    for (const p of itagExpr.split("+"))
      if (!set.has(p)) return { ok: false, reason: `itag ${p} not present` };
    return { ok: true };
  } catch {
    return { ok: false, reason: "probe_failed" };
  }
}

// Build neutral selector & sorter (no bracket filters → avoids None.lower)
function buildSelector({
  container = "mp4",
  maxHeight = 1080,
  minHeight = 480,
  kind = "video",
}) {
  const h = Number.isFinite(+maxHeight) ? +maxHeight : 1080;
  const minH = Number.isFinite(+minHeight) ? +minHeight : 480;

  if (kind === "audio") {
    return { format: "ba/bestaudio", sort: null };
  }

  // Always best video + best audio with progressive fallback
  const format = "bv*+ba/b";

  // Height filter: prefer within range [minH..h].
  // We'll bias the sorter to cap at h and not dip below minH unless nothing else exists.
  // yt-dlp doesn’t support >= in sorter; we’ll use res:h then fps,br.
  const sort = `res:${h},fps,br`; // cap at h; yt-dlp will pick closest <= h
  void minH; // min height currently unused but kept for future tuning

  return { format, sort };
}

// ---------- /streams ----------
// ---------- /streams ----------
app.get("/streams/:id", async (req, res) => {
  try {
    const raw = await yt(req.params.id, ["--dump-single-json", "--skip-download"]);
    const info = JSON.parse(raw);
    const trackIndex = buildAudioTrackIndex(info);
    const formats = Array.isArray(info.formats) ? info.formats : [];

    const mapped = formats
      .filter((f) => f && f.url)
      .map((f, idx) => {
        const bytes = pickNumber(f.filesize, f.filesize_approx);
        const audioTrackInfo = extractAudioTrackInfo(f, trackIndex);
const language = normaliseLanguage([
  f.language_preference,
  f.language,
  f.language_alt,
  audioTrackInfo && audioTrackInfo.language,
]);


        return {
          id: `${f.format_id}-${idx}`,
          formatId: f.format_id,
          container: (f.ext || "mp4").toLowerCase(),
          label: displayVideoLabel(f),
          audioLabel: buildAudioLabel(f, audioTrackInfo),
          sizeDisplay: bytes ? formatBytes(bytes) : "Unknown",
          sizeBytes: bytes,
          bitrate: f.tbr ? Math.round(f.tbr * 1000) : undefined,
          audioBitrate: f.abr ? Math.round(f.abr * 1000) : undefined,
          fps: typeof f.fps === "number" ? f.fps : undefined,
          hasVideo: f.vcodec && f.vcodec !== "none",
          hasAudio: f.acodec && f.acodec !== "none",
          height: typeof f.height === "number" ? f.height : undefined,
          language,
          audioTrackInfo,
          isDefaultAudioTrack: Boolean(audioTrackInfo?.isDefault),
          languagePreference: Number.isFinite(f.language_preference)
            ? f.language_preference
            : undefined,
          preference: Number.isFinite(f.preference) ? f.preference : undefined,
          sourcePreference: Number.isFinite(f.source_preference)
            ? f.source_preference
            : undefined,
        };
      });

    const progressive = mapped.filter((x) => x.hasVideo && x.hasAudio);
    const videoOnly = mapped.filter((x) => x.hasVideo && !x.hasAudio);
    const audioOnly = mapped.filter((x) => !x.hasVideo && x.hasAudio);


audioOnly.forEach((fmt) => {
  fmt.audioScore = scoreAudioCandidate(fmt, fmt.audioTrackInfo, primaryLang);
});
audioOnly.sort((a, b) => {
  const diff = (b.audioScore ?? 0) - (a.audioScore ?? 0);
  if (diff !== 0) return diff;
  return (b.audioBitrate ?? b.bitrate ?? 0) - (a.audioBitrate ?? a.bitrate ?? 0);
});

const pickBestAudio = (preferredLanguages = []) => {
  const ranked = audioOnly;
  const tests = [
    (fmt, langs) =>
      langs.includes(fmt.language) &&
      fmt.audioTrackInfo?.isOriginal &&
      !fmt.audioTrackInfo.isDub &&
      !fmt.audioTrackInfo.isDescription,
    (fmt, langs) =>
      langs.includes(fmt.language) &&
      fmt.audioTrackInfo?.isDefault &&
      !fmt.audioTrackInfo.isDub &&
      !fmt.audioTrackInfo.isDescription,
    (fmt, langs) =>
      langs.includes(fmt.language) &&
      !fmt.audioTrackInfo?.isDub &&
      !fmt.audioTrackInfo?.isDescription,
    (fmt) =>
      fmt.audioTrackInfo?.isOriginal &&
      !fmt.audioTrackInfo.isDub &&
      !fmt.audioTrackInfo.isDescription,
    (fmt) =>
      fmt.audioTrackInfo?.isDefault &&
      !fmt.audioTrackInfo.isDub &&
      !fmt.audioTrackInfo.isDescription,
    (fmt) => !fmt.audioTrackInfo?.isDub && !fmt.audioTrackInfo?.isDescription,
  ];

  const langs = preferredLanguages.filter(Boolean);
  for (const check of tests) {
    const match = ranked.find((fmt) => check(fmt, langs));
    if (match) return match;
  }
  return ranked[0];
};


videoOnly.forEach((v) => {
  const a = pickBestAudio([v.language, primaryLang]);
  if (!a) return;

});


    const sortVideo = (a, b) =>
      (b.height ?? 0) - (a.height ?? 0) ||
      (b.fps ?? 0) - (a.fps ?? 0) ||
      (b.bitrate ?? 0) - (a.bitrate ?? 0);

      const sortAudio = (a, b) =>
  (b.audioBitrate ?? b.bitrate ?? 0) -
  (a.audioBitrate ?? a.bitrate ?? 0);

progressive.sort(sortVideo);
videoOnly.sort(sortVideo);
audioOnly.sort(sortAudio);

const primaryLang = normaliseLanguage([
  info.original_language,
  info.language,
  info.language_preference,
]);

const pickAudio = (targetLang) => {
  if (!audioOnly.length) return null;

  if (targetLang) {
    const match = audioOnly.find((a) => a.language === targetLang);
    if (match) return match;
  }

  if (primaryLang) {
    const match = audioOnly.find((a) => a.language === primaryLang);
    if (match) return match;
  }

  return audioOnly[0];
};

    const videoOptions = [
      ...progressive.map((f) => ({
        id: f.id,
        label: f.label,
        size: f.sizeDisplay,
        bitrate: f.bitrate,
        audioBitrate: f.audioBitrate,
        fps: f.fps,
        height: f.height,
        language: f.language,
        extension: f.container,
        downloadFormat: f.formatId,
        videoFormatId: f.formatId,
        audioFormatId: null,
        requiresMerge: false,
      })),
    ];

videoOnly.forEach((v) => {
  const a = pickAudio(v.language);
  if (!a) return;

  const combinedBytes = (v.sizeBytes || 0) + (a.sizeBytes || 0);
  const combinedSize =
    combinedBytes > 0 ? formatBytes(combinedBytes) : "Varies";
  const extension =
    v.container === "webm" && a.container === "webm" ? "webm" : "mp4";

  videoOptions.push({
    id: `${v.id}-merged-${a.id}`,
    label: v.label,
    size: combinedSize,
    bitrate: v.bitrate,
    audioBitrate: a.audioBitrate ?? a.bitrate,
    fps: v.fps,
    height: v.height,
    language: a.language,
    extension,
    downloadFormat: `${v.formatId}+${a.formatId}`,
    videoFormatId: v.formatId,
    audioFormatId: a.formatId,
    requiresMerge: true,
  });
});


    const audioOptions = audioOnly.map((f) => ({
      id: f.id,
      label: f.audioLabel,
      size: f.sizeDisplay,
      bitrate: f.bitrate,
      audioBitrate: f.audioBitrate,
      language: f.language,
      extension: f.container,
      downloadFormat: f.formatId,
      videoFormatId: null,
      audioFormatId: f.formatId,
    }));

    const thumbs = Array.isArray(info.thumbnails) ? info.thumbnails : [];
    const thumbnailUrl = thumbs.length
      ? thumbs[thumbs.length - 1].url
      : info.thumbnail ?? "";

    res.json({
      id: req.params.id,
      title: info.title,
      thumbnailUrl,
      channel: info.uploader,
      durationSeconds: info.duration,
      videoStreams: videoOptions,
      audioStreams: audioOptions,
    });
  } catch (error) {
    if (requiresLogin(error && (error.stderr || error.message))) {
      console.warn("yt-dlp metadata requires authentication.");
      return res.status(403).json({ error: AUTH_HELP_MESSAGE });
    }
    console.error("yt-dlp metadata error:", error);
    res.status(500).json({ error: "Failed to retrieve video info." });
  }
});


// ---------- /download ----------
app.get("/download", async (req, res) => {
  console.log("Download request:", req.method, req.query);
  if (req.method === "HEAD") return res.status(200).end();

  const { id, format, type = "video", ext, title, maxHeight, minHeight } =
    req.query;
  if (!id) return res.status(400).json({ error: "Missing id query parameter." });

  const rawExt =
    typeof ext === "string" && ext.trim().length ? ext.trim().toLowerCase() : "mp4";
  const extension = rawExt.replace(/[^a-z0-9]/gi, "") || "mp4";

  const rawTitle =
    typeof title === "string" && title.trim().length ? title.trim() : String(id);
  const safeTitle = rawTitle
    .replace(/[^a-z0-9_\- ]/gi, "")
    .replace(/\s+/g, "_")
    .slice(0, 128) || "video";
  const fileName = `${safeTitle}.${extension}`;

  const tempDir = await fsp.mkdtemp(path.join(os.tmpdir(), "yt-dlp-"));
  const outputPath = path.join(tempDir, fileName);

  // sanitize client format; strip trailing "-10" etc
  let requested = (format ?? "").toString().trim().replace(/-\d+$/i, "");
  const kind = String(type).toLowerCase() === "audio" ? "audio" : "video";

  // Validate client itags if present
  let useClient = looksLikeItagPair(requested);
  if (/undefined|null/i.test(requested) || requested === "") useClient = false;
  if (useClient) {
    const probe = await validateItags(id, requested);
    if (!probe.ok) {
      console.warn(
        `[download] itag(s) invalid (${probe.reason}), falling back`
      );
      useClient = false;
    }
  }

  // Build selector/sorter
  const { format: safeFmt, sort: sortKey } = buildSelector({
    container: extension,
    maxHeight: maxHeight ?? 1080,
    minHeight: minHeight ?? 480,
    kind,
  });

  // If we’re falling back, consider adding height filter to progressive fallback (avoid 360p when 720p progressive exists)
  let formatSelector = useClient ? requested : safeFmt;
  // Note: we can’t edit the “/b” inside expression safely here; so we rely mainly on sorter to bias res<=h

  const commonArgs = [
    `https://www.youtube.com/watch?v=${id}`,
    ...cookieArgs,
    "-f",
    formatSelector,
    "-o",
    outputPath,
    "--no-check-certificates",
    "--no-warnings",
    "--no-playlist",
    "--quiet",
    "--add-header",
    "referer: https://www.youtube.com/",
    "--add-header",
    "user-agent: Mozilla/5.0",
    "--restrict-filenames",
    "-N",
    "8",
  ];
  if (sortKey) commonArgs.push("-S", sortKey);

  const runOnce = (strategy /* 'mp4' | 'webm' | 'mp4-recode' */) => {
    const args = [...commonArgs];
    if (kind === "audio") {
      args.push("--extract-audio", "--audio-format", extension); // mp3/m4a/opus/wav
    } else {
      if (strategy === "mp4-recode") {
        args.push("--recode-video", "mp4"); // ensures >360p MP4 even if sources are WebM
      } else if (strategy === "mp4") {
        args.push("--merge-output-format", "mp4"); // remux only (fast), works if streams are mp4-compatible
      } else if (strategy === "webm") {
        args.push("--merge-output-format", "webm"); // no transcode for webm
      }
    }
    if (ffmpegBinary) args.push("--ffmpeg-location", ffmpegBinary);

    console.log("[download] using format:", formatSelector);
    if (sortKey) console.log("[download] using sort:", sortKey);
    console.log("[download] args:", args.join(" "));

    return new Promise((resolve) => {
      const child = execFile(
        ytDlpPath,
        args,
        ffmpegBinary
          ? {
              windowsHide: true,
              env: { ...process.env, FFMPEG_BINARY: ffmpegBinary },
            }
          : { windowsHide: true }
      );

      let stderr = "";
      child.stderr.on("data", (d) => {
        const s = d.toString();
        stderr += s;
        console.error("yt-dlp stderr:", s);
      });
      child.on("close", (code) => resolve({ code, stderr }));

      // If client disconnects early, let’s just stop the process and ignore ECONNABORTED
      const onClose = () => {
        try {
          child.kill("SIGTERM");
        } catch {}
      };
      req.once("close", onClose);
    });
  };

  try {
    let attempt;

    if (kind === "audio") {
      attempt = await runOnce("mp4"); // strategy irrelevant here
    } else {
      if (extension === "webm") {
        attempt = await runOnce("webm");
        if (attempt.code !== 0) {
          console.warn("[download] webm failed; retrying as mp4-recode");
          attempt = await runOnce("mp4-recode");
        }
      } else {
        // MP4 requested: try remux; if codecs don’t fit, transcode
        attempt = await runOnce("mp4");
        if (attempt.code !== 0) {
          console.warn("[download] mp4 remux failed; retrying with mp4-recode");
          attempt = await runOnce("mp4-recode");
        }
      }
    }

    if (attempt.code !== 0) {
      const authRequired = requiresLogin(attempt.stderr);
      try {
        await fsp.rm(tempDir, { recursive: true, force: true });
      } catch {}
      if (authRequired) return res.status(403).send(AUTH_HELP_MESSAGE);
      return res
        .status(500)
        .send("Download failed. No compatible streams or mux/transcode error.");
    }

    const contentTypes = {
      mp4: "video/mp4",
      mkv: "video/x-matroska",
      webm: "video/webm",
      m4a: "audio/mp4",
      mp3: "audio/mpeg",
      wav: "audio/wav",
      opus: "audio/ogg",
    };
    const ct = contentTypes[extension] || "application/octet-stream";
    res.setHeader("Content-Type", ct);
    res.setHeader("Content-Disposition", `inline; filename="${fileName}"`);

    res.sendFile(outputPath, async (err) => {
      try {
        await fsp.rm(tempDir, { recursive: true, force: true });
      } catch {}
      if (err) {
        // ECONNABORTED = client cancelled; not a server failure
        if (err.code !== "ECONNABORTED" && !res.headersSent) {
          console.error("sendFile error:", err);
          res.status(500).send("Download failed.");
        }
      }
    });
  } catch (error) {
    const authRequired = requiresLogin(error && (error.stderr || error.message));
    try {
      await fsp.rm(tempDir, { recursive: true, force: true });
    } catch {}
    if (authRequired) {
      console.warn("yt-dlp run requires authentication.");
      return res.status(403).json({ error: AUTH_HELP_MESSAGE });
    }
    console.error("yt-dlp run error:", error);
    res.status(500).json({ error: "Download failed." });
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`YouTube downloader backend listening on http://localhost:${PORT}`);
});
