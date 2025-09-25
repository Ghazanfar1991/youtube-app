import React, { useContext, useMemo, useState } from 'react';
import { Page } from '../App';
import { HistoryContext } from '../contexts/HistoryContext';
import { ThumbnailContext } from '../contexts/ThumbnailContext';
import { HistoryItem, GeneratedThumbnailHistoryItem, IdeationHistoryItem, ExtractedThumbnailHistoryItem } from '../types';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/Tabs';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Star } from '../components/icons';
import { Button } from '../components/ui/Button';
import { ImagePreviewModal } from '../components/ImagePreviewModal';
import { extractYouTubeVideoId } from '../utils/youtubeUtils';

interface HistoryPageProps {
    onNavigate: (page: Page) => void;
}

const ThumbnailHistoryCard: React.FC<{ 
    item: GeneratedThumbnailHistoryItem | ExtractedThumbnailHistoryItem; 
    onClick: () => void;
    onToggleFavorite: (id: string) => void;
}> = ({ item, onClick, onToggleFavorite }) => {
    
    let displayText = '';
    let itemTypeLabel = '';

    if (item.type === 'thumbnail') {
        if (item.originalImageUrl) {
            displayText = item.prompt.replace('Edited: ', '');
            itemTypeLabel = 'Face Edit';
        } else {
            displayText = item.prompt;
            itemTypeLabel = 'Generated';
        }
    } else {
        displayText = item.videoUrl;
        itemTypeLabel = 'Extracted';
    }

    return (
        <div className="group relative">
            <div 
                className="aspect-video w-full rounded-lg overflow-hidden border-2 border-transparent group-hover:border-primary transition-all cursor-pointer"
                onClick={onClick}
            >
                <img src={item.imageUrl} alt={displayText} className="w-full h-full object-cover" />
                <div className="absolute top-1 left-1 bg-black/60 text-white text-[10px] font-semibold px-1.5 py-0.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">{itemTypeLabel}</div>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 line-clamp-2 h-10" title={displayText}>{displayText}</p>
             <button 
              onClick={(e) => { e.stopPropagation(); onToggleFavorite(item.id); }}
              className={`absolute top-1 right-1 z-10 p-1.5 rounded-full transition-colors ${item.isFavorite ? 'text-yellow-400 bg-black/60' : 'text-white bg-black/50 opacity-0 group-hover:opacity-100 hover:bg-black/70'}`}
              aria-label={item.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
            >
              <Star className="w-4 h-4" />
            </button>
        </div>
    );
};

const IdeationHistoryCard: React.FC<{ 
    item: IdeationHistoryItem; 
    onToggleFavorite: (id: string) => void; 
    onClick: () => void;
}> = ({ item, onToggleFavorite, onClick }) => {
    return (
        <Card 
            className="relative group flex flex-col cursor-pointer hover:border-primary transition-colors h-full"
            onClick={onClick}
        >
            <CardHeader>
                <CardTitle className="text-base">Content Ideas</CardTitle>
                <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2" title={item.topic}>Topic: {item.topic}</p>
            </CardHeader>
            <CardContent className="flex-grow">
                <p className="font-semibold text-sm text-gray-800 dark:text-gray-200">Top Title Suggestion:</p>
                <p className="text-sm text-gray-600 dark:text-gray-300 italic line-clamp-2">"{item.ideas.titles[0]}"</p>
            </CardContent>
             <button 
              onClick={(e) => { e.stopPropagation(); onToggleFavorite(item.id); }}
              className={`absolute top-2 right-2 z-10 p-1.5 rounded-full transition-colors ${item.isFavorite ? 'text-yellow-400 bg-gray-200 dark:bg-gray-800' : 'text-gray-400 bg-gray-100 dark:bg-gray-800/50 opacity-0 group-hover:opacity-100 hover:text-yellow-400'}`}
              aria-label={item.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
            >
              <Star className="w-4 h-4" />
            </button>
        </Card>
    );
};

const HistoryGrid: React.FC<{
    items: HistoryItem[];
    onItemClick: (item: HistoryItem) => void;
    toggleFavorite: (id: string) => void;
    emptyStateMessage: string;
    onNavigate: (page: Page) => void;
}> = ({ items, onItemClick, toggleFavorite, emptyStateMessage, onNavigate }) => {
    if (items.length === 0) {
        return (
            <Card className="mt-4">
                <CardContent className="p-10 text-center">
                    <p className="text-gray-500 dark:text-gray-400">{emptyStateMessage}</p>
                     <Button onClick={() => onNavigate('generator')} className="mt-4 bg-primary text-white">Start Creating</Button>
                </CardContent>
            </Card>
        );
    }
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mt-4">
            {items.map(item => {
                if (item.type === 'thumbnail' || item.type === 'extracted') {
                    return <ThumbnailHistoryCard key={item.id} item={item} onClick={() => onItemClick(item)} onToggleFavorite={toggleFavorite} />;
                }
                if (item.type === 'ideation') {
                    return <IdeationHistoryCard key={item.id} item={item} onToggleFavorite={toggleFavorite} onClick={() => onItemClick(item)} />;
                }
                return null;
            })}
        </div>
    );
}

const HistoryPage: React.FC<HistoryPageProps> = ({ onNavigate }) => {
    const { history, toggleFavorite } = useContext(HistoryContext);
    const { 
        setReferenceImage, 
        setUserImage,
        setInitialPrompt,
        setInitialIdeationItem, 
        setInitialUrl,
        setInitialFaceEditItem
    } = useContext(ThumbnailContext);

    const [selectedImage, setSelectedImage] = useState<GeneratedThumbnailHistoryItem | ExtractedThumbnailHistoryItem | null>(null);

    const handleLoadInEditor = (item: HistoryItem) => {
        switch (item.type) {
            case 'thumbnail':
                if (item.originalImageUrl) { // It's a face edit
                    setInitialFaceEditItem(item);
                    onNavigate('face-editor');
                } else { // It's a standard generation
                    setReferenceImage(item.imageUrl);
                    setInitialPrompt(item.prompt);
                    onNavigate('generator');
                }
                break;
            case 'ideation':
                setInitialIdeationItem(item);
                onNavigate('generator');
                break;
            case 'extracted':
                setInitialUrl(item.videoUrl);
                onNavigate('extractor');
                break;
        }
    };
    
    const onItemClick = (item: HistoryItem) => {
        if (item.type === 'ideation') {
            handleLoadInEditor(item);
        } else {
            setSelectedImage(item);
        }
    };
    
    const handleDownload = (item: GeneratedThumbnailHistoryItem | ExtractedThumbnailHistoryItem) => {
        const link = document.createElement('a');
        link.href = item.imageUrl;

        let filename = 'thumbgenius-download';
        if (item.type === 'thumbnail') {
            filename = item.prompt.replace(/[^a-z0-9]/gi, '_').toLowerCase().slice(0, 30) || 'thumbnail';
        } else if (item.type === 'extracted') {
            const videoId = extractYouTubeVideoId(item.videoUrl);
            filename = `extracted-${videoId || 'thumbnail'}`;
        }
        
        link.download = `${filename}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const generatedItems = useMemo(() => history.filter((item): item is GeneratedThumbnailHistoryItem => item.type === 'thumbnail' && !item.originalImageUrl), [history]);
    const editedItems = useMemo(() => history.filter((item): item is GeneratedThumbnailHistoryItem => item.type === 'thumbnail' && !!item.originalImageUrl), [history]);
    const extractedItems = useMemo(() => history.filter((item): item is ExtractedThumbnailHistoryItem => item.type === 'extracted'), [history]);
    const ideationItems = useMemo(() => history.filter((item): item is IdeationHistoryItem => item.type === 'ideation'), [history]);

    return (
        <>
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
                    Your History
                </h1>
                <p className="mt-2 text-gray-600 dark:text-gray-400">
                    Browse, manage, and reuse all of your past creations.
                </p>
            </div>

            <Tabs defaultValue="all">
                <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 bg-gray-200/50 dark:bg-gray-900/50 border border-black/10 dark:border-white/10 h-auto p-1">
                    <TabsTrigger value="all">All ({history.length})</TabsTrigger>
                    <TabsTrigger value="generated">Generated ({generatedItems.length})</TabsTrigger>
                    <TabsTrigger value="edited">Edited ({editedItems.length})</TabsTrigger>
                    <TabsTrigger value="extracted">Extracted ({extractedItems.length})</TabsTrigger>
                    <TabsTrigger value="ideation">Ideation ({ideationItems.length})</TabsTrigger>
                </TabsList>
                <TabsContent value="all">
                    <HistoryGrid items={history} onItemClick={onItemClick} toggleFavorite={toggleFavorite} emptyStateMessage="Your history is empty." onNavigate={onNavigate} />
                </TabsContent>
                 <TabsContent value="generated">
                    <HistoryGrid items={generatedItems} onItemClick={onItemClick} toggleFavorite={toggleFavorite} emptyStateMessage="You haven't generated any thumbnails yet." onNavigate={onNavigate} />
                </TabsContent>
                 <TabsContent value="edited">
                    <HistoryGrid items={editedItems} onItemClick={onItemClick} toggleFavorite={toggleFavorite} emptyStateMessage="You haven't edited any faces yet." onNavigate={onNavigate} />
                </TabsContent>
                <TabsContent value="extracted">
                    <HistoryGrid items={extractedItems} onItemClick={onItemClick} toggleFavorite={toggleFavorite} emptyStateMessage="You haven't extracted any thumbnails yet." onNavigate={onNavigate} />
                </TabsContent>
                <TabsContent value="ideation">
                    <HistoryGrid items={ideationItems} onItemClick={onItemClick} toggleFavorite={toggleFavorite} emptyStateMessage="You haven't generated any content ideas yet." onNavigate={onNavigate} />
                </TabsContent>
            </Tabs>
        </div>
        <ImagePreviewModal
            imageUrl={selectedImage?.imageUrl || null}
            onClose={() => setSelectedImage(null)}
            isFavorite={selectedImage?.isFavorite}
            onToggleFavorite={() => selectedImage && toggleFavorite(selectedImage.id)}
            onDownload={() => selectedImage && handleDownload(selectedImage)}
            onLoadInEditor={selectedImage ? () => {
                handleLoadInEditor(selectedImage);
                setSelectedImage(null);
            } : undefined}
            onUseAsReference={
                (selectedImage?.type === 'thumbnail' && !selectedImage.originalImageUrl) || selectedImage?.type === 'extracted'
                ? () => {
                    if (selectedImage) {
                        setReferenceImage(selectedImage.imageUrl);
                        onNavigate('generator');
                        setSelectedImage(null);
                    }
                } : undefined
            }
            onUseAsUserImage={
                selectedImage?.type === 'thumbnail' && selectedImage.originalImageUrl
                ? () => {
                    if (selectedImage) {
                        setUserImage(selectedImage.imageUrl);
                        onNavigate('generator');
                        setSelectedImage(null);
                    }
                } : undefined
            }
        />
        </>
    );
};

export default HistoryPage;