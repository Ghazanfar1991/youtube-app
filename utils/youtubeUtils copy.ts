/**
 * Extracts the YouTube video ID from a variety of URL formats.
 * @param url The YouTube URL.
 * @returns The video ID string, or null if no valid ID is found.
 */
export const extractYouTubeVideoId = (input: string): string | null => {
    if (!input) return null;

    const trimmed = input.trim();

    // Allow raw 11-character IDs
    if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
        return trimmed;
    }

    try {
        const url = new URL(trimmed);

        // Normalise hostname (handle www / m.)
        const host = url.hostname.replace(/^m\./, '');

        if (host === 'youtu.be') {
            const id = url.pathname.split('/').filter(Boolean)[0];
            if (id && id.length === 11) return id;
        }

        if (host.endsWith('youtube.com')) {
            if (url.searchParams.has('v')) {
                const id = url.searchParams.get('v');
                if (id && id.length === 11) return id;
            }

            const segments = url.pathname.split('/').filter(Boolean);
            if (segments.length) {
                const possible = segments[segments.length - 1];
                if (['watch', 'v'].includes(possible) && segments.length > 1) {
                    const id = segments[segments.length - 2];
                    if (id.length === 11) return id;
                }

                // Handle /shorts/<id>, /embed/<id>, /live/<id>
                if (segments.length >= 2 && ['shorts', 'embed', 'live'].includes(segments[0])) {
                    const id = segments[1];
                    if (id.length === 11) return id;
                }
            }
        }
    } catch {
        // Not a parseable URL; fall back to best-effort regex
    }

    const match = trimmed.match(/(?:v=|\/)([a-zA-Z0-9_-]{11})(?![a-zA-Z0-9_-])/);
    return match ? match[1] : null;
};


/**
 * Constructs the URL for the highest resolution YouTube thumbnail.
 * @param videoId The YouTube video ID.
 * @returns The URL string for the max resolution thumbnail.
 */
export const getYouTubeThumbnailUrl = (videoId: string): string => {
  return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
};
