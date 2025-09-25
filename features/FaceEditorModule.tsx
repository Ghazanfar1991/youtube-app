import React, { useState, useCallback, useContext, useRef, useMemo, useEffect } from 'react';
import { HistoryContext } from '../contexts/HistoryContext';
import { AuthContext } from '../contexts/AuthContext';
import { ToastContext } from '../contexts/ToastContext';
import { editFaceImage } from '../services/geminiService';
import { fileToBase64 } from '../utils/fileUtils';
import { GeneratedThumbnailHistoryItem } from '../types';
import { Page } from '../App';
import { ThumbnailContext } from '../contexts/ThumbnailContext';
import { ImagePreviewModal } from '../components/ImagePreviewModal';
import { BeforeAfterSliderModal } from '../components/BeforeAfterSliderModal';

interface FaceEditorModuleProps {
    onNavigate: (page: Page) => void;
}

const FaceEditorModule: React.FC<FaceEditorModuleProps> = ({ onNavigate }) => {
    const { history, addHistoryItem, toggleFavorite } = useContext(HistoryContext);
    const thumbnailHistory = useMemo(() => history.filter((item): item is GeneratedThumbnailHistoryItem => item.type === 'thumbnail'), [history]);
    
    const { useCredits } = useContext(AuthContext);
    const { showToast } = useContext(ToastContext);
    const { setUserImage, initialFaceEditItem, setInitialFaceEditItem } = useContext(ThumbnailContext);

    const [originalImage, setOriginalImage] = useState<string | null>(null);
    const [editedImage, setEditedImage] = useState<string | null>(null);
    const [prompt, setPrompt] = useState<string>('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [selectedHistoryForPreview, setSelectedHistoryForPreview] = useState<GeneratedThumbnailHistoryItem | null>(null);
    const [isSliderModalOpen, setIsSliderModalOpen] = useState(false);

    const inputRef = useRef<HTMLInputElement>(null);
    
    useEffect(() => {
        if (initialFaceEditItem) {
            setOriginalImage(initialFaceEditItem.originalImageUrl || initialFaceEditItem.imageUrl);
            setEditedImage(initialFaceEditItem.originalImageUrl ? initialFaceEditItem.imageUrl : null);
            setPrompt(initialFaceEditItem.prompt.startsWith("Edited: ") ? initialFaceEditItem.prompt.substring(8) : initialFaceEditItem.prompt);
            setInitialFaceEditItem(null); // Consume it
        }
    }, [initialFaceEditItem, setInitialFaceEditItem]);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
          fileToBase64(file).then(base64 => {
              setOriginalImage(base64);
              setEditedImage(null);
          }).catch(() => {
              setError('Failed to read file.');
              showToast({ message: 'Failed to read file.', variant: 'destructive' });
          });
        }
    };

    const handleGenerate = useCallback(async () => {
        if (!originalImage) {
            setError('Please upload an image to edit.'); return;
        }
        if (!prompt.trim()) {
            setError('A text prompt is required to edit the image.'); return;
        }
        try { useCredits(1); } catch (err) {
            const msg = err instanceof Error ? err.message : "An unknown error occurred.";
            setError(msg); showToast({ message: msg, variant: 'destructive' }); return;
        }
        setIsLoading(true); setError(null);
        try {
            const result = await editFaceImage(originalImage, prompt);
            setEditedImage(result.imageUrl);
            const newHistoryItem = {
                type: 'thumbnail' as const,
                imageUrl: result.imageUrl,
                originalImageUrl: originalImage,
                prompt: `Edited: ${prompt}`,
            };
            addHistoryItem(newHistoryItem);
            showToast({ message: "Image edited! 1 credit used.", variant: 'default' });
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Failed to edit image.';
            setError(msg); showToast({ message: msg, variant: 'destructive' });
        } finally { setIsLoading(false); }
    }, [prompt, originalImage, addHistoryItem, showToast, useCredits]);

    const handleDownload = (imageUrl: string, prompt: string) => {
        const link = document.createElement('a');
        link.href = imageUrl;
        const filename = prompt.replace(/[^a-z0-9]/gi, '_').toLowerCase().slice(0, 30);
        link.download = `thumbgenius-${filename || 'edited'}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleUseAsUserImage = (imageUrl: string | null) => {
        if (!imageUrl) return;
        setUserImage(imageUrl);
        setSelectedHistoryForPreview(null); // close modal
        showToast({ message: "Image set as 'Face/Logo' in Generator." });
        onNavigate('generator');
    };
    
    const handleLoadFromHistory = (item: GeneratedThumbnailHistoryItem | null) => {
        if (!item) return;
        setOriginalImage(item.originalImageUrl || item.imageUrl);
        setEditedImage(item.originalImageUrl ? item.imageUrl : null);
        setPrompt(item.prompt.startsWith("Edited: ") ? item.prompt.substring(8) : item.prompt);
        setSelectedHistoryForPreview(null); // close modal
    };


    return (
        <>
        <div className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Controls */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-white dark:bg-gray-900/50 p-6 rounded-xl">
                        <h2 className="text-2xl font-bold mb-1 text-gray-900 dark:text-white">Face Editor</h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Upload a face and use AI to perfect it.</p>
                        
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Upload Image</label>
                            <div
                                onClick={() => inputRef.current?.click()}
                                className="relative aspect-square w-full rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-primary/70 dark:hover:border-primary/70 bg-gray-100/50 dark:bg-gray-800/50 flex items-center justify-center cursor-pointer transition-colors"
                            >
                                <input ref={inputRef} onChange={handleFileChange} className="hidden" type="file" accept="image/*" />
                                {originalImage ? (
                                    <>
                                        <img alt="Original" className="object-cover w-full h-full rounded-lg" src={originalImage} />
                                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity text-white text-sm">Click to change</div>
                                    </>
                                ) : (
                                    <div className="text-center text-gray-500 dark:text-gray-400">
                                        <span className="material-symbols-outlined text-4xl">add_photo_alternate</span>
                                        <p className="text-sm mt-1">Click to upload</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="mt-6">
                            <label htmlFor="edit-prompt" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Editing Prompt</label>
                            <textarea
                                id="edit-prompt"
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                disabled={isLoading || !originalImage}
                                rows={3}
                                placeholder='e.g., "make the expression more shocked", "add a neon rim light around me"'
                                className="form-input block w-full rounded-lg border-gray-300 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 focus:ring-primary focus:border-primary text-gray-900 dark:text-white disabled:opacity-50"
                            />
                        </div>

                        <button onClick={handleGenerate} disabled={isLoading || !originalImage} className="mt-6 w-full bg-primary text-white font-bold text-sm py-3 px-4 rounded-lg hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-50">
                            <span className="material-symbols-outlined text-base">{isLoading ? 'hourglass_top' : 'auto_fix_high'}</span>
                            {isLoading ? 'Enhancing...' : 'Enhance Image (1 Credit)'}
                        </button>
                        {error && <p className="text-sm text-center text-red-500 pt-2">{error}</p>}
                    </div>
                </div>

                {/* Preview */}
                <div className="lg:col-span-2 space-y-6">
                     <div className="bg-white dark:bg-gray-900/50 p-6 rounded-xl">
                        <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
                            Comparison
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <h4 className="text-sm font-semibold text-center mb-2 text-gray-600 dark:text-gray-400">Before</h4>
                                <div className="aspect-video w-full rounded-lg bg-gray-200 dark:bg-gray-800 overflow-hidden flex items-center justify-center">
                                    {originalImage ? (
                                        <img src={originalImage} alt="Original" className="h-full w-full object-cover" />
                                    ) : (
                                        <span className="material-symbols-outlined text-4xl text-gray-400 dark:text-gray-600">image</span>
                                    )}
                                </div>
                            </div>
                             <div>
                                <h4 className="text-sm font-semibold text-center mb-2 text-gray-600 dark:text-gray-400">After</h4>
                                <div 
                                    className="aspect-video w-full rounded-lg bg-gray-200 dark:bg-gray-800 overflow-hidden flex items-center justify-center cursor-pointer group"
                                    onClick={() => editedImage && setIsSliderModalOpen(true)}
                                >
                                    {editedImage ? (
                                        <div className="relative w-full h-full">
                                            <img src={editedImage} alt="Edited" className="h-full w-full object-cover" />
                                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-2">
                                               <span className="material-symbols-outlined text-white text-4xl">compare</span>
                                               <p className="text-white ml-2">Click to compare</p>
                                            </div>
                                        </div>
                                    ) : (
                                         <span className="material-symbols-outlined text-4xl text-gray-400 dark:text-gray-600">auto_awesome</span>
                                    )}
                                </div>
                            </div>
                        </div>
                     </div>
                </div>
            </div>

            {/* History */}
             <div className="bg-white dark:bg-gray-900/50 p-6 rounded-xl">
                <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
                    Load from History
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Click any thumbnail from your history to view options or load it into the editor.</p>
                 {thumbnailHistory.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                        {thumbnailHistory.map((item) => (
                            <div key={item.id} onClick={() => setSelectedHistoryForPreview(item)} className="aspect-video rounded-lg overflow-hidden cursor-pointer group relative" title={item.prompt}>
                                <div className="w-full h-full bg-center bg-no-repeat bg-cover group-hover:scale-105 transition-transform duration-300" style={{ backgroundImage: `url("${item.imageUrl}")` }}></div>
                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-2">
                                   <span className="material-symbols-outlined text-white text-4xl">zoom_in</span>
                                </div>
                            </div>
                        ))}
                    </div>
                 ) : (
                    <div className="text-center text-sm text-gray-500 dark:text-gray-400 py-8">
                        <p>Generate some thumbnails first to see them here.</p>
                    </div>
                 )}
            </div>
        </div>
        <ImagePreviewModal
            imageUrl={selectedHistoryForPreview?.imageUrl || null}
            onClose={() => setSelectedHistoryForPreview(null)}
            isFavorite={selectedHistoryForPreview?.isFavorite}
            onToggleFavorite={() => selectedHistoryForPreview && toggleFavorite(selectedHistoryForPreview.id)}
            onDownload={() => selectedHistoryForPreview && handleDownload(selectedHistoryForPreview.imageUrl, selectedHistoryForPreview.prompt)}
            onUseAsUserImage={() => handleUseAsUserImage(selectedHistoryForPreview?.imageUrl)}
            onLoadInEditor={() => handleLoadFromHistory(selectedHistoryForPreview)}
        />
        <BeforeAfterSliderModal
            isOpen={isSliderModalOpen}
            onClose={() => setIsSliderModalOpen(false)}
            originalImage={originalImage}
            editedImage={editedImage}
        />
        </>
    );
};

export default FaceEditorModule;