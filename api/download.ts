import type { VercelRequest, VercelResponse } from '@vercel/node';

const RAPIDAPI_HOST = 'youtube-media-downloader.p.rapidapi.com';

type RapidThumbnail = { url: string; width?: number; height?: number };
type RapidStreamingData = {
  formats?: RapidFormat[];
  adaptiveFormats?: RapidFormat[];
};
type RapidFormat = {
  itag?: number;
  mimeType?: string;
  quality?: string;
  qualityLabel?: string;
  bitrate?: number;
  averageBitrate?: number;
  audioQuality?: string;
  audioChannels?: number;
  url?: string;
  downloadUrl?: string;
  href?: string;
  signatureCipher?: string;
  cipher?: string;
  contentLength?: string | number;
  clen?: string;
};

interface DownloadVariant {
  itag?: number;
  qualityLabel?: string;
  mimeType?: string;
  hasAudio: boolean;
  url: string;
  bitrate?: number;
  contentLength?: number;
}

interface DownloadResponse {
  videoId: string;
  title?: string;
  channelName?: string;
  durationText?: string;
  thumbnails: RapidThumbnail[];
  downloads: DownloadVariant[];
}

const YOUTUBE_ID_REGEX =
  /(?:v=|\/)([0-9A-Za-z_-]{11})(?:(?:\?|&|$)|(?:\?.*))/;

const extractVideoId = (input: string): string | null => {
  const trimmed = input.trim();
  if (!trimmed) return null;

  if (/^[0-9A-Za-z_-]{11}$/.test(trimmed)) return trimmed;

  try {
    const url = new URL(trimmed);
    if (url.hostname.includes('youtu.be')) {
      const id = url.pathname.replace('/', '');
      return /^[0-9A-Za-z_-]{11}$/.test(id) ? id : null;
    }

    const idFromQuery = url.searchParams.get('v');
    if (idFromQuery && /^[0-9A-Za-z_-]{11}$/.test(idFromQuery)) {
      return idFromQuery;
    }

    const regexMatch = trimmed.match(YOUTUBE_ID_REGEX);
    return regexMatch ? regexMatch[1] : null;
  } catch {
    const regexMatch = trimmed.match(YOUTUBE_ID_REGEX);
    return regexMatch ? regexMatch[1] : null;
  }
};

const resolveCipherUrl = (cipher?: string): string | null => {
  if (!cipher) return null;
  const params = new URLSearchParams(cipher);
  const url = params.get('url');
  const sp = params.get('sp');
  const sig = params.get('s') ?? params.get('sig');
  if (!url) return null;
  if (sp && sig) {
    return `${url}&${sp}=${sig}`;
  }
  return url;
};

const normaliseFormats = (streamingData?: RapidStreamingData): DownloadVariant[] => {
  if (!streamingData) return [];

  const combined = [
    ...(streamingData.formats ?? []),
    ...(streamingData.adaptiveFormats ?? []),
  ];

  const seen = new Set<string>();
  const variants: DownloadVariant[] = [];

  for (const format of combined) {
    const directUrl =
      format.url ??
      format.downloadUrl ??
      format.href ??
      resolveCipherUrl(format.signatureCipher ?? format.cipher);

    if (!directUrl) continue;

    const contentLengthRaw =
      typeof format.contentLength === 'string'
        ? parseInt(format.contentLength, 10)
        : typeof format.clen === 'string'
        ? parseInt(format.clen, 10)
        : typeof format.contentLength === 'number'
        ? format.contentLength
        : undefined;

    const key = `${format.itag ?? ''}-${directUrl}`;
    if (seen.has(key)) continue;
    seen.add(key);

    variants.push({
      itag: format.itag,
      qualityLabel: format.qualityLabel ?? format.quality,
      mimeType: format.mimeType,
      hasAudio: Boolean(format.audioQuality ?? format.audioChannels),
      url: directUrl,
      bitrate: format.bitrate ?? format.averageBitrate,
      contentLength: Number.isFinite(contentLengthRaw) ? contentLengthRaw : undefined,
    });
  }

  return variants.sort((a, b) => {
    if (a.hasAudio !== b.hasAudio) return a.hasAudio ? -1 : 1;
    return (b.bitrate ?? 0) - (a.bitrate ?? 0);
  });
};

const secondsToDuration = (value?: string): string | undefined => {
  if (!value) return undefined;
  const total = Number.parseInt(value, 10);
  if (!Number.isFinite(total)) return undefined;
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  const parts = [];
  if (hours) parts.push(hours.toString().padStart(2, '0'));
  parts.push(minutes.toString().padStart(2, '0'));
  parts.push(seconds.toString().padStart(2, '0'));
  return parts.join(':');
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let payload: unknown;
  try {
    if (typeof req.body === 'string') {
      payload = JSON.parse(req.body);
    } else if (Buffer.isBuffer(req.body)) {
      payload = JSON.parse(req.body.toString('utf8'));
    } else if (req.body && typeof req.body === 'object') {
      payload = req.body;
    } else {
      payload = {};
    }
  } catch {
    return res.status(400).json({ error: 'Malformed JSON body' });
  }

  const rapidApiKey = process.env.RAPIDAPI_KEY;
  if (!rapidApiKey) {
    return res.status(500).json({ error: 'Missing RapidAPI credentials' });
  }

  const url =
    typeof (payload as { url?: unknown }).url === 'string'
      ? (payload as { url: string }).url.trim()
      : '';
  if (!url) {
    return res.status(400).json({ error: 'Provide a YouTube URL or video ID' });
  }

  const videoId = extractVideoId(url);
  if (!videoId) {
    return res.status(400).json({ error: 'Could not derive a valid YouTube video ID from the input' });
  }

    try {
    const headers = {
      'x-rapidapi-key': rapidApiKey,
      'x-rapidapi-host': RAPIDAPI_HOST,
    };

    const infoRes = await fetch(
      `https://${RAPIDAPI_HOST}/v2/video/info?videoId=${encodeURIComponent(videoId)}`,
      { headers }
    );

    if (!infoRes.ok) {
      const message = await infoRes.text();
      return res
        .status(infoRes.status)
        .json({ error: 'Failed to retrieve video details', details: message });
    }

    const infoJson = await infoRes.json();

    const thumbnails: RapidThumbnail[] =
      infoJson?.videoDetails?.thumbnail?.thumbnails ??
      infoJson?.thumbnails ??
      infoJson?.data?.videoDetails?.thumbnail?.thumbnails ??
      infoJson?.data?.thumbnails ??
      [];

    const streamingData: RapidStreamingData = (() => {
      if (infoJson?.streamingData) return infoJson.streamingData;
      if (infoJson?.data?.streamingData) return infoJson.data.streamingData;
      if (infoJson?.data?.formats || infoJson?.data?.adaptiveFormats) {
        return {
          formats: infoJson.data.formats,
          adaptiveFormats: infoJson.data.adaptiveFormats,
        };
      }
      return {};
    })();

    const downloads = normaliseFormats(streamingData);
    if (!downloads.length) {
      return res
        .status(502)
        .json({ error: 'No downloadable streams were returned by RapidAPI for this video' });
    }

    const videoDetails =
      infoJson?.videoDetails ?? infoJson?.data?.videoDetails ?? infoJson;

    const payloadResponse: DownloadResponse = {
      videoId,
      title: videoDetails?.title,
      channelName: videoDetails?.author ?? videoDetails?.channel?.name,
      durationText: secondsToDuration(videoDetails?.lengthSeconds ?? infoJson?.lengthSeconds),
      thumbnails,
      downloads,
    };

    res.status(200).json(payloadResponse);
  } catch (error) {
    console.error('[youtube-download] error', error);
    res.status(500).json({ error: 'Unexpected error contacting RapidAPI' });
  }
