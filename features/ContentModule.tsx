




import React, { useState, useCallback, useContext, useRef, useEffect, useMemo } from 'react';
import { GeneratedThumbnailHistoryItem } from '../types';
import { generateThumbnail } from '../services/geminiService';
import { fileToBase64, urlToBase64 } from '../utils/fileUtils';
import { extractYouTubeVideoId, getYouTubeThumbnailUrl } from '../utils/youtubeUtils';
import { ToastContext } from '../contexts/ToastContext';
import { ThumbnailContext } from '../contexts/ThumbnailContext';
import { ImagePreviewModal } from '../components/ImagePreviewModal';
import { AuthContext } from '../contexts/AuthContext';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/Tabs';
import ContentIdeationModule from './ContentIdeationModule';
import { HistoryContext } from '../contexts/HistoryContext';
import { Star } from '../components/icons';

const getImageDimensions = (base64String: string): Promise<{ width: number; height: number }> => {
    return new Promise((resolve, reject) => {
        const img = new window.Image();
        img.onload = () => {
            resolve({ width: img.width, height: img.height });
        };
        img.onerror = (err) => {
            reject(err);
        };
        img.src = base64String;
    });
};

const ThumbnailGenerator: React.FC = () => {
    const { history, addHistoryItem, toggleFavorite } = useContext(HistoryContext);
    const thumbnailHistory = useMemo(() => history.filter((item): item is GeneratedThumbnailHistoryItem => item.type === 'thumbnail'), [history]);
    
    const { referenceImage, setReferenceImage, userImage, setUserImage, initialPrompt, setInitialPrompt } = useContext(ThumbnailContext);
    const { useCredits } = useContext(AuthContext);
    const [prompt, setPrompt] = useState<string>('');
    const [youtubeUrl, setYoutubeUrl] = useState('');
  
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedHistoryImage, setSelectedHistoryImage] = useState<GeneratedThumbnailHistoryItem | null>(null);

    const { showToast } = useContext(ToastContext);

    const refInputRef = useRef<HTMLInputElement>(null);
    const userInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (initialPrompt) {
            setPrompt(initialPrompt);
            setInitialPrompt(null); // Consume the initial prompt
        }
    }, [initialPrompt, setInitialPrompt]);

    const handleGenerate = useCallback(async () => {
        if (!prompt.trim() && !referenceImage && !userImage) {
          setError('A text prompt or an image is required.');
          return;
        }
        if ((referenceImage || userImage) && !prompt.trim()) {
          setError('A text prompt is required when providing an image for editing.');
          return;
        }

        try {
          useCredits(1);
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : "An unknown error occurred.";
          setError(`${errorMessage} Please upgrade or buy more credits.`);
          showToast({ message: errorMessage, variant: 'destructive' });
          return;
        }

        setIsLoading(true);
        setError(null);

        try {
          let determinedAspectRatio: '16:9' | '9:16' = '16:9';

          if (prompt.toLowerCase().includes('short')) {
              determinedAspectRatio = '9:16';
          } 
          else if (referenceImage) {
              try {
                  const dimensions = await getImageDimensions(referenceImage);
                  if (dimensions.height > dimensions.width) {
                      determinedAspectRatio = '9:16';
                  }
              } catch (e) {
                  console.error("Could not determine image dimensions, defaulting to 16:9");
              }
          }

          const result = await generateThumbnail({
            prompt,
            referenceImage,
            userImage,
            aspectRatio: determinedAspectRatio,
          });
          
          // Fix: Storing the object in a variable before passing it to the function avoids an issue with TypeScript's excess property checking on union types.
          const newHistoryItem = {
            type: 'thumbnail' as const,
            imageUrl: result.imageUrl,
            prompt,
          };
          addHistoryItem(newHistoryItem);

          setReferenceImage(result.imageUrl);
          setUserImage(null);
          showToast({ message: "Thumbnail generated successfully! 1 credit used.", variant: 'default' });
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : 'Failed to generate thumbnail.';
          setError(errorMessage);
          showToast({ message: errorMessage, variant: 'destructive' });
        } finally {
          setIsLoading(false);
        }
    }, [prompt, referenceImage, userImage, addHistoryItem, showToast, setReferenceImage, setUserImage, useCredits]);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>, setter: React.Dispatch<React.SetStateAction<string | null>>) => {
        const file = event.target.files?.[0];
        if (file) {
          fileToBase64(file).then(setter).catch(err => {
              setError('Failed to read file.');
              showToast({ message: 'Failed to read file.', variant: 'destructive' });
          });
        }
    };
    
    const handleHistorySelect = (item: GeneratedThumbnailHistoryItem) => {
        setReferenceImage(item.imageUrl);
        setPrompt(item.prompt);
    };

    const handleFetchFromUrl = async () => {
        const videoId = extractYouTubeVideoId(youtubeUrl);
        if (!videoId) {
            setError("Invalid YouTube URL provided.");
            showToast({ message: "Invalid YouTube URL provided.", variant: 'destructive' });
            return;
        }
        setIsLoading(true);
        setError(null);
        try {
            const thumbnailUrl = getYouTubeThumbnailUrl(videoId);
            const base64Image = await urlToBase64(thumbnailUrl);
            setReferenceImage(base64Image);
            showToast({ message: "Thumbnail fetched successfully!", variant: 'default' });
        } catch (err) {
            const errorMessage = "Failed to fetch thumbnail from URL.";
            setError(errorMessage);
            showToast({ message: errorMessage, variant: 'destructive' });
        } finally {
            setIsLoading(false);
        }
    };

    const handleDownload = (imageUrl: string, prompt: string) => {
        const link = document.createElement('a');
        link.href = imageUrl;
        const filename = prompt.replace(/[^a-z0-9]/gi, '_').toLowerCase().slice(0, 30);
        link.download = `thumbgenius-${filename || 'generated'}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-1 space-y-8">
                    <div className="bg-white dark:bg-gray-900/50 p-6 rounded-xl">
                        <h2 className="text-2xl font-bold mb-1 text-gray-900 dark:text-white">
                            Thumbnail Generator
                        </h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                            Generate high-quality thumbnails for your videos.
                        </p>
                        <div className="space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Reference Image</label>
                                <div
                                    onClick={() => refInputRef.current?.click()}
                                    className="relative aspect-video w-full rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-primary/70 dark:hover:border-primary/70 bg-gray-100/50 dark:bg-gray-800/50 flex items-center justify-center cursor-pointer transition-colors"
                                    >
                                    <input ref={refInputRef} onChange={(e) => handleFileChange(e, setReferenceImage)} className="hidden" type="file" accept="image/*"/>
                                    {referenceImage ? (
                                        <>
                                        <img alt="Reference Image preview" className="object-cover w-full h-full rounded-lg" src={referenceImage}/>
                                        <button
                                            onClick={(e) => {
                                            e.stopPropagation();
                                            setReferenceImage(null);
                                            if (refInputRef.current) refInputRef.current.value = "";
                                            }}
                                            className="absolute top-2 right-2 bg-black/50 text-white p-1 rounded-full hover:bg-black/70 transition-colors z-10"
                                            aria-label="Remove Reference Image"
                                        >
                                            <span className="material-symbols-outlined !text-base">close</span>
                                        </button>
                                        </>
                                    ) : (
                                        <div className="text-center text-gray-500 dark:text-gray-400">
                                        <span className="material-symbols-outlined text-4xl">image</span>
                                        <p className="text-sm mt-1">Click to upload</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div>
                               <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Your Face/Logo (Optional)</label>
                                <div
                                    onClick={() => userInputRef.current?.click()}
                                    className="relative aspect-video w-full rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-primary/70 dark:hover:border-primary/70 bg-gray-100/50 dark:bg-gray-800/50 flex items-center justify-center cursor-pointer transition-colors"
                                    >
                                    <input ref={userInputRef} onChange={(e) => handleFileChange(e, setUserImage)} className="hidden" type="file" accept="image/*"/>
                                    {userImage ? (
                                        <>
                                        <img alt="User Image preview" className="object-cover w-full h-full rounded-lg" src={userImage}/>
                                        <button
                                            onClick={(e) => {
                                            e.stopPropagation();
                                            setUserImage(null);
                                            if (userInputRef.current) userInputRef.current.value = "";
                                            }}
                                            className="absolute top-2 right-2 bg-black/50 text-white p-1 rounded-full hover:bg-black/70 transition-colors z-10"
                                            aria-label="Remove User Image"
                                        >
                                            <span className="material-symbols-outlined !text-base">close</span>
                                        </button>
                                        </>
                                    ) : (
                                        <div className="text-center text-gray-500 dark:text-gray-400">
                                        <span className="material-symbols-outlined text-4xl">image</span>
                                        <p className="text-sm mt-1">Click to upload</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white dark:bg-gray-900/50 p-6 rounded-xl">
                        <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
                            Extract from URL
                        </h3>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2" htmlFor="video-url">YouTube Video URL</label>
                            <div className="flex">
                                <input 
                                    className="form-input flex-grow w-full rounded-l-lg border-gray-300 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 focus:ring-primary focus:border-primary text-gray-900 dark:text-white" 
                                    id="video-url" 
                                    placeholder="Paste YouTube video link..." 
                                    type="url"
                                    value={youtubeUrl}
                                    onChange={e => setYoutubeUrl(e.target.value)}
                                    disabled={isLoading}
                                />
                                <button onClick={handleFetchFromUrl} disabled={isLoading || !youtubeUrl.trim()} className="inline-flex items-center px-4 rounded-r-lg border border-l-0 border-gray-300 dark:border-gray-700 bg-primary/20 dark:bg-primary/30 text-primary hover:bg-primary/30 dark:hover:bg-primary/40 disabled:opacity-50 disabled:cursor-not-allowed">
                                    <span className="material-symbols-outlined text-base">file_download</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="lg:col-span-2 space-y-8">
                    <div className="bg-white dark:bg-gray-900/50 p-6 rounded-xl">
                        <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
                            Generated Thumbnail
                        </h3>
                        <div className="aspect-[16/9] w-full rounded-lg bg-gray-200 dark:bg-gray-800 overflow-hidden flex items-center justify-center">
                            {referenceImage ? (
                                <div className="w-full h-full bg-center bg-no-repeat bg-cover" style={{ backgroundImage: `url("${referenceImage}")` }}></div>
                            ) : (
                                <span className="material-symbols-outlined text-4xl text-gray-400 dark:text-gray-600">preview</span>
                            )}
                        </div>

                        <div className="mt-6">
                            <label htmlFor="prompt" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Prompt</label>
                            <textarea
                                id="prompt"
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                disabled={isLoading}
                                rows={3}
                                placeholder='Describe your thumbnail… e.g., "Shocked face, big bold text: AI TOOLS, neon rim light"'
                                className="form-input block w-full rounded-lg border-gray-300 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 focus:ring-primary focus:border-primary text-gray-900 dark:text-white"
                            />
                        </div>

                        <button onClick={handleGenerate} disabled={isLoading} className="mt-6 w-full bg-primary text-white font-bold text-sm py-3 px-4 rounded-lg hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-50">
                            <span className="material-symbols-outlined text-base">{isLoading ? 'hourglass_top' : 'auto_awesome'}</span>
                            {isLoading ? 'Generating...' : 'Generate Thumbnail (1 Credit)'}
                        </button>
                         {error && <p className="text-sm text-center text-red-500 pt-2">{error}</p>}
                    </div>

                    <div className="bg-white dark:bg-gray-900/50 p-6 rounded-xl">
                        <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
                            History
                        </h3>
                         {thumbnailHistory.length > 0 ? (
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                {thumbnailHistory.map((item) => (
                                    <div key={item.id} className="aspect-video rounded-lg overflow-hidden cursor-pointer group relative" title={item.prompt}>
                                        <div onClick={() => setSelectedHistoryImage(item)} className="w-full h-full">
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
                                <p>Your generated thumbnails will appear here.</p>
                            </div>
                         )}
                    </div>
                </div>
            </div>
            <ImagePreviewModal
                imageUrl={selectedHistoryImage?.imageUrl || null}
                onClose={() => setSelectedHistoryImage(null)}
                isFavorite={selectedHistoryImage?.isFavorite}
                onToggleFavorite={() => selectedHistoryImage && toggleFavorite(selectedHistoryImage.id)}
                onDownload={() => {
                    if (selectedHistoryImage) {
                        handleDownload(selectedHistoryImage.imageUrl, selectedHistoryImage.prompt);
                    }
                }}
            />
        </>
    );
};


const ContentModule: React.FC = () => {
    const { initialIdeationItem } = useContext(ThumbnailContext);
    const [activeTab, setActiveTab] = useState('generator');

    useEffect(() => {
        if (initialIdeationItem) {
            setActiveTab('ideation');
        }
    }, [initialIdeationItem]);
    
    return (
        <div>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="mb-6 bg-gray-200/50 dark:bg-gray-900/50 border border-black/10 dark:border-white/10">
                    <TabsTrigger value="generator">Thumbnail Generator</TabsTrigger>
                    <TabsTrigger value="ideation">Content Ideation</TabsTrigger>
                </TabsList>
                <TabsContent value="generator">
                    <ThumbnailGenerator />
                </TabsContent>
                <TabsContent value="ideation">
                    <ContentIdeationModule />
                </TabsContent>
            </Tabs>
        </div>
    );
};


export default ContentModule;