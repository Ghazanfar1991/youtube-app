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
  if (!trimmed) {
    return null;
  }

  if (/^[0-9A-Za-z_-]{11}$/.test(trimmed)) {
    return trimmed;
  }

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
      format.url ?? format.downloadUrl ?? format.href ?? resolveCipherUrl(format.signatureCipher ?? format.cipher);
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
    if (a.hasAudio !== b.hasAudio) {
      return a.hasAudio ? -1 : 1;
    }
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

  const rapidApiKey = process.env.RAPIDAPI_KEY;
  if (!rapidApiKey) {
    return res.status(500).json({ error: 'Missing RapidAPI credentials' });
  }

  const url = typeof req.body?.url === 'string' ? req.body.url.trim() : '';
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

    const [detailsRes, streamsRes] = await Promise.all([
      fetch(`https://${RAPIDAPI_HOST}/v2/video/details?videoId=${encodeURIComponent(videoId)}`, { headers }),
      fetch(`https://${RAPIDAPI_HOST}/v2/video/streaming-data?videoId=${encodeURIComponent(videoId)}`, { headers }),
    ]);

    if (!detailsRes.ok) {
      const message = await detailsRes.text();
      return res.status(detailsRes.status).json({ error: 'Failed to retrieve video details', details: message });
    }
    if (!streamsRes.ok) {
      const message = await streamsRes.text();
      return res.status(streamsRes.status).json({ error: 'Failed to retrieve streaming variants', details: message });
    }

    const detailsJson = await detailsRes.json();
    const streamsJson = await streamsRes.json();

    const thumbnails: RapidThumbnail[] =
      detailsJson?.videoDetails?.thumbnail?.thumbnails ??
      detailsJson?.thumbnails ??
      streamsJson?.thumbnails ??
      [];

    const downloads = normaliseFormats(streamsJson?.streamingData as RapidStreamingData);
    if (!downloads.length) {
      return res.status(502).json({ error: 'No downloadable streams were returned by RapidAPI for this video' });
    }

    const payload: DownloadResponse = {
      videoId,
      title: detailsJson?.videoDetails?.title ?? detailsJson?.title,
      channelName: detailsJson?.videoDetails?.author ?? detailsJson?.channel?.name,
      durationText: secondsToDuration(detailsJson?.videoDetails?.lengthSeconds ?? detailsJson?.lengthSeconds),
      thumbnails,
      downloads,
    };

    res.status(200).json(payload);
  } catch (error) {
    console.error('[youtube-download] error', error);
    res.status(500).json({ error: 'Unexpected error contacting RapidAPI' });
  }
}
