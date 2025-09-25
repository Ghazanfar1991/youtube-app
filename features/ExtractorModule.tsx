import React, { useState, useContext, useCallback, useEffect } from 'react';
import { ExtractedThumbnailHistoryItem } from '../types';
import { urlToBase64 } from '../utils/fileUtils';
import { extractYouTubeVideoId, getYouTubeThumbnailUrl } from '../utils/youtubeUtils';
import { ToastContext } from '../contexts/ToastContext';
import { ThumbnailContext } from '../contexts/ThumbnailContext';
import { AuthContext } from '../contexts/AuthContext';
import { Page } from '../App';
import { ImagePreviewModal } from '../components/ImagePreviewModal';
import { HistoryContext } from '../contexts/HistoryContext';
import { Star } from '../components/icons';

interface ExtractorModuleProps {
    onNavigate: (page: Page) => void;
}

const ExtractorModule: React.FC<ExtractorModuleProps> = ({ onNavigate }) => {
    const [url, setUrl] = useState('');
    const [extractedImage, setExtractedImage] = useState<string | null>(null);
    const [extractedVideoId, setExtractedVideoId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    
    const { history, addHistoryItem, toggleFavorite } = useContext(HistoryContext);
    const extractedHistory = history.filter((item): item is ExtractedThumbnailHistoryItem => item.type === 'extracted');
    
    const { showToast } = useContext(ToastContext);
    const { setReferenceImage, initialUrl, setInitialUrl } = useContext(ThumbnailContext);
    const { activeAccount, login } = useContext(AuthContext);
    const [selectedImage, setSelectedImage] = useState<ExtractedThumbnailHistoryItem | null>(null);

    const handleExtract = useCallback(async (urlToExtract?: string) => {
        const targetUrl = urlToExtract || url;
        if (!targetUrl) return;

        const videoId = extractYouTubeVideoId(targetUrl);
        if (!videoId) {
            showToast({ message: "Invalid YouTube URL provided.", variant: 'destructive' });
            return;
        }

        setIsLoading(true);
        setExtractedImage(null);
        setExtractedVideoId(null);
        try {
            const thumbnailUrl = getYouTubeThumbnailUrl(videoId);
            const base64Image = await urlToBase64(thumbnailUrl);
            setExtractedImage(base64Image);
            setExtractedVideoId(videoId);

            const newHistoryItem = {
                type: 'extracted' as const,
                imageUrl: base64Image,
                videoUrl: targetUrl,
            };
            
            // Check if already in history to avoid duplicates
            if (!history.some(item => item.type === 'extracted' && item.videoUrl === targetUrl)) {
                 addHistoryItem(newHistoryItem);
            }
           
            showToast({ message: "Thumbnail extracted successfully!", variant: 'default' });
        } catch (err) {
            showToast({ message: "Failed to fetch thumbnail from URL.", variant: 'destructive' });
        } finally {
            setIsLoading(false);
        }
    }, [url, addHistoryItem, history, showToast]);

    useEffect(() => {
        if (initialUrl) {
            setUrl(initialUrl); // Set the input field for display
            handleExtract(initialUrl);
            setInitialUrl(null); // Consume the URL
        }
    }, [initialUrl, handleExtract, setInitialUrl]);
    
    const handleDownload = (imageUrl: string, videoId: string | null) => {
        if (!videoId) return;
        const link = document.createElement('a');
        link.href = imageUrl;
        link.download = `thumbnail-${videoId}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleUseAsReference = useCallback((imageUrl?: string | null) => {
        const imageToUse = imageUrl || extractedImage;
        if (imageToUse) {
            setReferenceImage(imageToUse);
            onNavigate('generator');
            showToast({ message: "Image set as reference. Redirecting to generator..." });
        }
    }, [extractedImage, setReferenceImage, onNavigate, showToast]);

    return (
        <>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Panel - Input */}
                <div className="lg:col-span-1 space-y-8">
                    <div className="bg-white dark:bg-gray-900/50 p-6 rounded-xl">
                        <h2 className="text-2xl font-bold mb-1 text-gray-900 dark:text-white">
                            Thumbnail Extractor
                        </h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                            Extract the thumbnail from any YouTube video.
                        </p>
                        <form onSubmit={(e) => { e.preventDefault(); handleExtract(); }} className="space-y-4">
                            <div>
                                <label htmlFor="youtube-url" className="sr-only">YouTube video URL</label>
                                <input
                                    id="youtube-url"
                                    type="text"
                                    value={url}
                                    onChange={(e) => setUrl(e.target.value)}
                                    disabled={isLoading}
                                    placeholder="Paste YouTube video URL"
                                    className="form-input w-full rounded-lg border-gray-300 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 h-12 px-4 placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:border-primary focus:ring-primary text-gray-900 dark:text-white"
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={isLoading || !url.trim()}
                                className="w-full flex items-center justify-center rounded-lg h-12 px-6 bg-primary text-white text-sm font-bold tracking-wide shadow-sm hover:bg-primary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-50"
                            >
                                <span className="material-symbols-outlined text-base mr-2">{isLoading ? 'hourglass_top' : 'file_download'}</span>
                                <span>{isLoading ? 'Extracting...' : 'Extract Thumbnail'}</span>
                            </button>
                        </form>
                    </div>
                </div>

                {/* Right Panel - Preview and History */}
                <div className="lg:col-span-2 space-y-8">
                    <div className="bg-white dark:bg-gray-900/50 p-6 rounded-xl">
                        <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
                            Extracted Thumbnail
                        </h3>
                        <div className="aspect-video w-full rounded-lg bg-gray-200 dark:bg-gray-800 overflow-hidden flex items-center justify-center">
                             {extractedImage ? (
                                <img src={extractedImage} alt="Extracted Thumbnail" className="h-full w-full object-cover" />
                            ) : (
                                <div className="text-center text-gray-500 dark:text-gray-400">
                                    <span className="material-symbols-outlined text-4xl">photo_library</span>
                                    <p>Your extracted image will appear here</p>
                                </div>
                            )}
                        </div>
                        {extractedImage && (
                            <div className="mt-6 flex flex-wrap items-center gap-4">
                                <button
                                    onClick={() => handleUseAsReference()}
                                    className="inline-flex items-center justify-center gap-2 rounded-lg h-12 px-6 bg-primary/20 text-primary text-sm font-bold tracking-wide hover:bg-primary/30 dark:bg-primary/30 dark:hover:bg-primary/40 transition-colors"
                                >
                                    <span className="material-symbols-outlined text-base">wallpaper</span>
                                    Use as Reference
                                </button>
                                {activeAccount ? (
                                    <button
                                        onClick={() => handleDownload(extractedImage, extractedVideoId)}
                                        className="inline-flex items-center justify-center gap-2 rounded-lg h-12 px-6 bg-primary/20 text-primary text-sm font-bold tracking-wide hover:bg-primary/30 dark:bg-primary/30 dark:hover:bg-primary/40 transition-colors"
                                    >
                                        <span className="material-symbols-outlined text-base">download</span>
                                        Download Image
                                    </button>
                                ) : (
                                    <button
                                        onClick={login}
                                        className="inline-flex items-center justify-center gap-2 rounded-lg h-12 px-6 bg-primary/20 text-primary text-sm font-bold tracking-wide hover:bg-primary/30 dark:bg-primary/30 dark:hover:bg-primary/40 transition-colors"
                                    >
                                        <span className="material-symbols-outlined text-base">login</span>
                                        Connect Account to Download
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                    
                    <div className="bg-white dark:bg-gray-900/50 p-6 rounded-xl">
                        <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
                            Extraction History
                        </h3>
                        {extractedHistory.length > 0 ? (
                           <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                               {extractedHistory.map((item) => (
                                   <div key={item.id} className="aspect-video rounded-lg overflow-hidden cursor-pointer group relative" title={item.videoUrl}>
                                        <div onClick={() => setSelectedImage(item)} className="w-full h-full">
                                            <div className="w-full h-full bg-center bg-no-repeat bg-cover group-hover:scale-105 transition-transform duration-300" style={{ backgroundImage: `url("${item.imageUrl}")` }}></div>
                                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-2">
                                            <span className="material-symbols-outlined text-white text-4xl">zoom_in</span>
                                            </div>
                                        </div>
                                         <button 
                                          onClick={() => toggleFavorite(item.id)}
                                          className={`absolute top-1 right-1 z-10 p-1.5 rounded-full transition-colors ${item.isFavorite ? 'text-yellow-400 bg-black/60' : 'text-white bg-black/50 hover:bg-black/70'}`}
                                          aria-label={item.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                                        >
                                          <Star className="w-4 h-4" />
                                        </button>
                                   </div>
                               ))}
                           </div>
                        ) : (
                           <div className="text-center text-sm text-gray-500 dark:text-gray-400 py-8">
                               <span className="material-symbols-outlined text-4xl mb-2">history</span>
                               <p>Your extracted thumbnails will appear here.</p>
                           </div>
                        )}
                    </div>
                </div>
            </div>
            <ImagePreviewModal
                imageUrl={selectedImage?.imageUrl || null}
                onClose={() => setSelectedImage(null)}
                isFavorite={selectedImage?.isFavorite}
                onToggleFavorite={() => selectedImage && toggleFavorite(selectedImage.id)}
                onDownload={() => {
                    if (selectedImage) {
                        if (activeAccount) {
                            handleDownload(selectedImage.imageUrl, extractYouTubeVideoId(selectedImage.videoUrl));
                        } else {
                            login();
                        }
                    }
                }}
                onUseAsReference={() => handleUseAsReference(selectedImage?.imageUrl)}
            />
        </>
    );
};

export default ExtractorModule;