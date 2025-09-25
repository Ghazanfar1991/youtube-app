export const extractYouTubeVideoId = (input: string): string | null => {
    if (!input) return null;

    const trimmed = input.trim();

    // Allow raw 11-character IDs
    if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
        return trimmed;
    }

    try {
        const url = new URL(trimmed);
        const host = url.hostname.replace(/^m\./, "");

        if (host === "youtu.be") {
            const id = url.pathname.split("/").filter(Boolean)[0];
            if (id && id.length === 11) return id;
        }

        if (host.endsWith("youtube.com")) {
            const paramsId = url.searchParams.get("v");
            if (paramsId && paramsId.length === 11) return paramsId;

            const segments = url.pathname.split("/").filter(Boolean);
            if (segments.length >= 2 && ["shorts", "embed", "live"].includes(segments[0])) {
                const id = segments[1];
                if (id.length === 11) return id;
            }

            if (segments.length >= 2) {
                const possible = segments.pop();
                const previous = segments.pop();
                if (possible && possible.length === 11) return possible;
                if (previous && previous.length === 11) return previous;
            }
        }
    } catch {
        // Fall through to regex guess
    }

    const match = trimmed.match(/([a-zA-Z0-9_-]{11})(?![a-zA-Z0-9_-])/);
    return match ? match[1] : null;
};

export const getYouTubeThumbnailUrl = (videoId: string): string => {
    return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
};
