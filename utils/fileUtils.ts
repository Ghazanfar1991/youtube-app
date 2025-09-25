export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
};

export const urlToBase64 = async (url: string): Promise<string> => {
  const convertResponseToB64 = (response: Response): Promise<string> => {
    return new Promise(async (resolve, reject) => {
        const blob = await response.blob();
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = (error) => reject(error);
    });
  }

  const response = await fetch(url);
  
  if (!response.ok) {
    // If maxresdefault fails, it might be because the video doesn't have a 1080p thumbnail.
    // Try falling back to the standard high-quality thumbnail.
    if(url.includes('maxresdefault.jpg')) {
      const fallbackUrl = url.replace('maxresdefault.jpg', 'hqdefault.jpg');
      const fallbackResponse = await fetch(fallbackUrl);
      if (!fallbackResponse.ok) {
        throw new Error(`Failed to fetch image from primary and fallback URLs.`);
      }
      return convertResponseToB64(fallbackResponse);
    }
    throw new Error(`Failed to fetch image from ${url}`);
  }
  
  return convertResponseToB64(response);
};

export const parseBase64 = (base64String: string): { mimeType: string; data: string } | null => {
  const match = base64String.match(/^data:(.+);base64,(.+)$/);
  if (!match || match.length !== 3) {
    console.error("Invalid base64 string format");
    return null;
  }
  return { mimeType: match[1], data: match[2] };
};
