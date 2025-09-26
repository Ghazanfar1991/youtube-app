import React, { useMemo, useState } from 'react';

interface DownloaderModuleProps {
  onNavigate?: (page: string) => void;
}

interface Thumbnail {
  url: string;
  width?: number;
  height?: number;
}

interface DownloadVariant {
  itag?: number;
  qualityLabel?: string;
  mimeType?: string;
  hasAudio: boolean;
  url: string;
  bitrate?: number;
  contentLength?: number;
}

interface DownloadResult {
  videoId: string;
  title?: string;
  channelName?: string;
  durationText?: string;
  thumbnails: Thumbnail[];
  downloads: DownloadVariant[];
}

type FetchState = 'idle' | 'loading' | 'success' | 'error';

const formatBytes = (value?: number): string | undefined => {
  if (!value || value <= 0) return undefined;
  const units = ['B', 'KB', 'MB', 'GB'];
  const exponent = Math.min(
    Math.floor(Math.log(value) / Math.log(1024)),
    units.length - 1,
  );
  const num = value / 1024 ** exponent;
  return `${num.toFixed(num > 100 ? 0 : num > 10 ? 1 : 2)} ${units[exponent]}`;
};

const describeMime = (mime?: string): string | undefined => {
  if (!mime) return undefined;
  const [type, rest] = mime.split(';', 1);
  return type.replace('video/', '').replace('audio/', '').toUpperCase();
};

const DownloaderModule: React.FC<DownloaderModuleProps> = () => {
  const [videoUrl, setVideoUrl] = useState('');
  const [state, setState] = useState<FetchState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<DownloadResult | null>(null);

  const primaryThumbnail = useMemo(() => {
    if (!result?.thumbnails?.length) return null;
    return [...result.thumbnails].sort(
      (a, b) => (b.width ?? 0) - (a.width ?? 0),
    )[0];
  }, [result?.thumbnails]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = videoUrl.trim();
    if (!trimmed) {
      setError('Enter a valid YouTube URL or video ID.');
      return;
    }

    setState('loading');
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: trimmed }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error ?? 'Something went wrong');
      }

      setResult(payload as DownloadResult);
      setState('success');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unexpected error fetching download links.');
      setState('error');
    }
  };

  const resetForm = () => {
    setState('idle');
    setError(null);
    setResult(null);
    setVideoUrl('');
  };

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-black/5 bg-white/70 p-6 shadow-sm backdrop-blur dark:border-white/10 dark:bg-black/40">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
          YouTube Video Downloader
        </h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
          Paste any YouTube video URL to fetch downloadable variants via RapidAPI. All requests are proxied through our serverless function to keep your RapidAPI key safe.
        </p>
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
            Video URL or ID
          </label>
          <input
            value={videoUrl}
            onChange={(event) => setVideoUrl(event.target.value)}
            placeholder="https://www.youtube.com/watch?v=abcdefghi12"
            className="w-full rounded-lg border border-black/10 bg-white px-4 py-3 text-sm text-gray-900 shadow-inner transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40 dark:border-white/10 dark:bg-gray-900 dark:text-gray-100"
          />
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={state === 'loading'}
              className="inline-flex items-center rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {state === 'loading' ? 'Fetching formats…' : 'Get download links'}
            </button>
            {result && (
              <button
                type="button"
                onClick={resetForm}
                className="text-sm font-medium text-primary transition hover:text-primary/80"
              >
                Start over
              </button>
            )}
          </div>
        </form>
        {error && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-200">
            {error}
          </div>
        )}
      </section>

      {state === 'loading' && (
        <div className="rounded-2xl border border-black/5 bg-white/70 p-6 shadow-sm backdrop-blur dark:border-white/10 dark:bg-black/40">
          <div className="animate-pulse space-y-4">
            <div className="h-6 w-3/5 rounded bg-gray-200 dark:bg-gray-700" />
            <div className="h-4 w-full rounded bg-gray-200 dark:bg-gray-700" />
            <div className="h-4 w-5/6 rounded bg-gray-200 dark:bg-gray-700" />
          </div>
        </div>
      )}

      {result && (
        <section className="space-y-6">
          <div className="rounded-2xl border border-black/5 bg-white/70 p-6 shadow-sm backdrop-blur dark:border-white/10 dark:bg-black/40">
            <div className="flex flex-col gap-4 md:flex-row md:items-start">
              {primaryThumbnail && (
                <img
                  src={primaryThumbnail.url}
                  alt={result.title ?? 'Video thumbnail'}
                  className="w-full max-w-xs rounded-lg border border-black/10 object-cover dark:border-white/10"
                />
              )}
              <div className="space-y-2">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {result.title ?? 'Untitled video'}
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  {result.channelName ?? 'Unknown channel'}
                </p>
                {result.durationText && (
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Duration: {result.durationText}
                  </p>
                )}
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  Video ID: {result.videoId}
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {result.downloads.map((variant) => (
              <article
                key={`${variant.itag}-${variant.url}`}
                className="flex flex-col justify-between rounded-xl border border-black/5 bg-white/70 p-4 shadow-sm backdrop-blur transition hover:border-primary/40 hover:shadow-md dark:border-white/10 dark:bg-black/50 dark:hover:border-primary/40"
              >
                <div className="space-y-2">
                  <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                    {variant.qualityLabel ?? 'Unknown quality'}
                  </h3>
                  <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    {describeMime(variant.mimeType) ?? variant.mimeType ?? 'Format unknown'}
                  </p>
                  <ul className="space-y-1 text-xs text-gray-600 dark:text-gray-300">
                    <li>
                      Streams audio: {variant.hasAudio ? 'Yes' : 'Video only'}
                    </li>
                    {variant.contentLength && (
                      <li>Approx. size: {formatBytes(variant.contentLength)}</li>
                    )}
                    {variant.bitrate && (
                      <li>Bitrate: {(variant.bitrate / 1000).toFixed(0)} kbps</li>
                    )}
                  </ul>
                </div>
                <a
                  href={variant.url}
                  rel="noopener noreferrer"
                  target="_blank"
                  className="mt-4 inline-flex items-center justify-center rounded-lg border border-primary bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary/60"
                >
                  Download
                </a>
              </article>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

export default DownloaderModule;
