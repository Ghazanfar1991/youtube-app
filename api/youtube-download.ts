// api/youtube-download.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';

const API_HOST = 'youtube-media-downloader.p.rapidapi.com';
const API_BASE = `https://${API_HOST}/v2`;

const formatBytes = (bytes?: number) => {
  if (!bytes || !Number.isFinite(bytes) || bytes <= 0) return undefined;
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const order = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  return `${(bytes / 1024 ** order).toFixed(order === 0 ? 0 : 1)} ${units[order]}`;
};

const extractVideoIdFromUrl = (value: string) => {
  const patterns = [
    /(?:v=|\/)([0-9A-Za-z_-]{11})(?:[?&].*)?$/,
    /^([0-9A-Za-z_-]{11})$/,
  ];
  for (const regex of patterns) {
    const match = value.match(regex);
    if (match && match[1]) return match[1];
  }
  return null;
};

const parseJson = async (response: Response) => {
  const contentType = response.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) return response.json();
  const text = await response.text();
  throw new Error(text || `Unexpected response (${response.status})`);
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const raw = typeof req.query.url === 'string' ? req.query.url : '';
  const trimmed = raw.trim();
  const videoId = extractVideoIdFromUrl(trimmed);
  if (!videoId) return res.status(400).json({ error: 'Invalid YouTube URL' });

  const apiKey = process.env.RAPIDAPI_KEY;
  if (!apiKey) return res.status(500).json({ error: 'Server is missing RAPIDAPI_KEY' });

  const headers = {
    'x-rapidapi-key': apiKey,
    'x-rapidapi-host': API_HOST,
    Accept: 'application/json',
  };

  try {
    const [detailsResponse, streamsResponse] = await Promise.all([
      fetch(`${API_BASE}/video/details?videoId=${encodeURIComponent(videoId)}`, { headers }),
      fetch(`${API_BASE}/video/streams?videoId=${encodeURIComponent(videoId)}`, { headers }),
    ]);

    if (!detailsResponse.ok) {
      const detailBody = await parseJson(detailsResponse).catch((err) => ({ error: err.message }));
      const message = detailBody?.error ?? `RapidAPI video/details failed (${detailsResponse.status})`;
      return res.status(detailsResponse.status).json({ error: message });
    }
    if (!streamsResponse.ok) {
      const streamBody = await parseJson(streamsResponse).catch((err) => ({ error: err.message }));
      const message = streamBody?.error ?? `RapidAPI video/streams failed (${streamsResponse.status})`;
      return res.status(streamsResponse.status).json({ error: message });
    }

    const details = await parseJson(detailsResponse);
    const streams = await parseJson(streamsResponse);

    const rawVideo = Array.isArray(streams?.video) ? streams.video : streams?.streams ?? [];
    const rawAudio = Array.isArray(streams?.audio)
      ? streams.audio
      : (rawVideo as any[]).filter((entry) => entry?.mimeType?.startsWith?.('audio'));

    const videoOptions = (rawVideo as any[])
      .filter((entry) => entry?.url || entry?.downloadUrl)
      .map((entry, index) => ({
        id: `video-${index}`,
        label: entry.qualityLabel || entry.quality || entry.mimeType || 'Video',
        downloadUrl: entry.url || entry.downloadUrl,
        format: entry.mimeType?.split(';')[0],
        size: formatBytes(Number(entry.contentLength ?? entry.size)),
        bitrate: entry.bitrate,
        audioBitrate: entry.audioBitrate,
        fps: entry.fps,
        language: entry.audioLanguage || entry.language,
        requiresMerge: false,
      }));

    const audioOptions = (rawAudio as any[])
      .filter((entry) => entry?.url || entry?.downloadUrl)
      .map((entry, index) => ({
        id: `audio-${index}`,
        label: entry.audioQuality || entry.mimeType || 'Audio',
        downloadUrl: entry.url || entry.downloadUrl,
        format: entry.mimeType?.split(';')[0],
        size: formatBytes(Number(entry.contentLength ?? entry.size)),
        bitrate: entry.bitrate,
        audioBitrate: entry.averageBitrate ?? entry.bitrate,
        language: entry.audioLanguage || entry.language,
        requiresMerge: false,
      }));

    const thumbnail =
      details?.thumbnail ||
      details?.thumbnails?.slice?.(-1)?.[0]?.url ||
      details?.videoDetails?.thumbnails?.slice?.(-1)?.[0]?.url ||
      '';

    res.status(200).json({
      id: videoId,
      title: details?.title ?? details?.videoDetails?.title ?? videoId,
      thumbnail,
      channel: details?.author ?? details?.channelTitle ?? details?.videoDetails?.author,
      duration: details?.lengthText ?? details?.duration ?? details?.videoDetails?.lengthText,
      video: videoOptions,
      audio: audioOptions,
    });
  } catch (error: any) {
    console.error('[youtube-download] unexpected error', error);
    res.status(500).json({ error: error?.message ?? 'Unable to contact RapidAPI service' });
  }
}
