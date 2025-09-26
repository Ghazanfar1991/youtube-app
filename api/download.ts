import type { VercelRequest, VercelResponse } from '@vercel/node';

const RAPIDAPI_HOST = 'ytgrabber.p.rapidapi.com';

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
  thumbnails: Array<{ url: string; width?: number; height?: number }>;
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

const parseFileSize = (value: unknown): number | undefined => {
  if (typeof value !== 'string') return undefined;
  const match = value.trim().match(/^([\d.,]+)\s*(B|KB|MB|GB|TB)$/i);
  if (!match) return undefined;
  const amount = Number.parseFloat(match[1].replace(',', '.'));
  const unit = match[2].toUpperCase();
  const unitIndex = ['B', 'KB', 'MB', 'GB', 'TB'].indexOf(unit);
  if (unitIndex === -1 || Number.isNaN(amount)) return undefined;
  return Math.round(amount * 1024 ** unitIndex);
};

const toBoolean = (value: unknown, fallback: boolean): boolean => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'string') {
    const normalised = value.toLowerCase();
    if (['true', 'yes', '1'].includes(normalised)) return true;
    if (['false', 'no', '0'].includes(normalised)) return false;
  }
  return fallback;
};

const deduceHasAudio = (item: Record<string, unknown>, mime?: string): boolean => {
  if ('audio' in item) {
    return toBoolean(item.audio, mime ? /audio/i.test(mime) : true);
  }
  if ('hasAudio' in item) {
    return toBoolean(item.hasAudio, mime ? /audio/i.test(mime) : true);
  }
  if (mime) {
    return !/video\/(x-)?webm/i.test(mime) || /audio/i.test(mime);
  }
  const quality = typeof item.quality === 'string' ? item.quality : '';
  return !/no audio| without audio/i.test(quality);
};

const mapDownloads = (raw: unknown): DownloadVariant[] => {
  if (!Array.isArray(raw)) return [];

  return raw
    .map((entry, index) => {
      if (!entry || typeof entry !== 'object') return null;

      const item = entry as Record<string, unknown>;
      const url =
        typeof item.url === 'string'
          ? item.url
          : typeof item.link === 'string'
          ? item.link
          : typeof item.download_url === 'string'
          ? item.download_url
          : undefined;

      if (!url) return null;

      const mime =
        typeof item.type === 'string'
          ? item.type
          : typeof item.mime === 'string'
          ? item.mime
          : typeof item.mimetype === 'string'
          ? item.mimetype
          : undefined;

      const quality =
        typeof item.quality === 'string'
          ? item.quality
          : typeof item.label === 'string'
          ? item.label
          : typeof item.resolution === 'string'
          ? item.resolution
          : undefined;

      const contentLength =
        parseFileSize(item.size) ??
        parseFileSize(item.fileSize) ??
        parseFileSize(item.filesize);

      const bitrate =
        typeof item.bitrate === 'number'
          ? item.bitrate
          : typeof item.bitrate === 'string'
          ? Number.parseInt(item.bitrate, 10)
          : undefined;

      return {
        itag:
          typeof item.itag === 'number'
            ? item.itag
            : typeof item.itag === 'string'
            ? Number.parseInt(item.itag, 10)
            : index,
        qualityLabel: quality,
        mimeType: mime,
        hasAudio: deduceHasAudio(item, mime),
        url,
        bitrate: Number.isFinite(bitrate) ? bitrate : undefined,
        contentLength: Number.isFinite(contentLength) ? contentLength : undefined,
      };
    })
    .filter((entry): entry is DownloadVariant => Boolean(entry));
};

const secondsToDuration = (value?: string | number): string | undefined => {
  if (typeof value === 'string' && value.includes(':')) return value;
  const total =
    typeof value === 'number'
      ? value
      : typeof value === 'string'
      ? Number.parseInt(value, 10)
      : NaN;
  if (!Number.isFinite(total) || total <= 0) return undefined;
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
    const response = await fetch(
      `https://${RAPIDAPI_HOST}/app/get/${encodeURIComponent(videoId)}`,
      {
        headers: {
          'x-rapidapi-key': rapidApiKey,
          'x-rapidapi-host': RAPIDAPI_HOST,
        },
      }
    );

    if (!response.ok) {
      const message = await response.text();
      return res
        .status(response.status)
        .json({ error: 'Failed to retrieve video details', details: message });
    }

    const json = await response.json();
    const data =
      json?.data && typeof json.data === 'object'
        ? (json.data as Record<string, unknown>)
        : (json as Record<string, unknown>);

    const downloads = mapDownloads(
      (data.downloads as unknown) ??
        (data.download as unknown) ??
        (data.links as unknown) ??
        (data.formats as unknown)
    );

    if (!downloads.length) {
      return res
        .status(502)
        .json({ error: 'No downloadable streams were returned by RapidAPI for this video' });
    }

    const thumbnailValue = data.thumbnail ?? data.thumbnail_url ?? data.thumbnails;

    const thumbnails =
      Array.isArray(thumbnailValue)
        ? (thumbnailValue
            .filter((thumb) => thumb && typeof thumb === 'object')
            .map((thumb) => thumb as { url: string; width?: number; height?: number }))
        : typeof thumbnailValue === 'string'
        ? [{ url: thumbnailValue }]
        : [];

    const payloadResponse: DownloadResponse = {
      videoId,
      title: typeof data.title === 'string' ? data.title : json?.title,
      channelName:
        typeof data.author === 'string'
          ? data.author
          : typeof data.channel === 'string'
          ? data.channel
          : json?.channel,
      durationText: secondsToDuration(
        (data.duration as string | number | undefined) ??
          (data.length as string | number | undefined) ??
          (json?.duration as string | number | undefined)
      ),
      thumbnails,
      downloads,
    };

    res.status(200).json(payloadResponse);
  } catch (error) {
    console.error('[youtube-download] error', error);
    res.status(500).json({ error: 'Unexpected error contacting RapidAPI' });
  }
}
