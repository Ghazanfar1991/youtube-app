export interface DownloadOption {
  id: string;
  label: string;
  downloadUrl: string;
  format?: string;
  size?: string;
  bitrate?: number;
  audioBitrate?: number;
  fps?: number;
  language?: string;
  requiresMerge?: boolean;
}

interface DownloadMetadata {
  id: string;
  title: string;
  thumbnail: string;
  channel?: string;
  duration?: string;
  video: DownloadOption[];
  audio: DownloadOption[];
}

const API_BASE =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') || '';

export async function fetchDownloadMetadata(url: string): Promise<DownloadMetadata> {
  const endpoint = `${API_BASE}/api/youtube-download?url=${encodeURIComponent(url)}`;
  const response = await fetch(endpoint);

  const contentType = response.headers.get('content-type');
  const payload = contentType?.includes('application/json')
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    const message =
      typeof payload === 'string'
        ? payload
        : payload?.error || 'Failed to fetch download options';
    throw new Error(message);
  }

  if (typeof payload === 'string') {
    throw new Error('Unexpected response from downloader service.');
  }

  return payload;
}
