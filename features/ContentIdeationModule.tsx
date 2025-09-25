





import React, { useState, useContext, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { AuthContext } from '../contexts/AuthContext';
import { ToastContext } from '../contexts/ToastContext';
import { generateContentIdeas, ContentIdeas } from '../services/geminiService';
import { HistoryContext } from '../contexts/HistoryContext';
import { Star } from '../components/icons';
import { ThumbnailContext } from '../contexts/ThumbnailContext';

const ContentIdeationModule: React.FC = () => {
    const [topic, setTopic] = useState('');
    const [ideas, setIdeas] = useState<ContentIdeas | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { useCredits } = useContext(AuthContext);
    const { showToast } = useContext(ToastContext);
    const { addHistoryItem, toggleFavorite, history } = useContext(HistoryContext);
    const [currentHistoryId, setCurrentHistoryId] = useState<string | null>(null);
    const { initialIdeationItem, setInitialIdeationItem } = useContext(ThumbnailContext);

    useEffect(() => {
        if (initialIdeationItem) {
            setTopic(initialIdeationItem.topic);
            setIdeas(initialIdeationItem.ideas);
            setCurrentHistoryId(initialIdeationItem.id);
            setInitialIdeationItem(null); // Consume it
        }
    }, [initialIdeationItem, setInitialIdeationItem]);

    const handleGenerate = async () => {
        if (!topic.trim()) {
            setError('Please enter a video topic.');
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
        setIdeas(null);
        setCurrentHistoryId(null);

        try {
            const result = await generateContentIdeas(topic);
            setIdeas(result);
            // Fix: Storing the object in a variable before passing it to the function avoids an issue with TypeScript's excess property checking on union types.
            const newHistoryItem = {
                type: 'ideation' as const,
                topic,
                ideas: result,
            };
            const newId = addHistoryItem(newHistoryItem);
            setCurrentHistoryId(newId);
            showToast({ message: 'Content ideas generated! 1 credit used.' });
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to generate ideas.';
            setError(errorMessage);
            showToast({ message: errorMessage, variant: 'destructive' });
        } finally {
            setIsLoading(false);
        }
    };

    const handleCopyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        showToast({ message: 'Copied to clipboard!' });
    };
    
    const currentHistoryItem = history.find(item => item.id === currentHistoryId);

    return (
        <div className="space-y-8">
            <Card>
                <CardHeader>
                    <CardTitle>AI Content Idea Generator</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                        Describe your video topic, and we'll generate viral titles, an SEO-optimized description, and relevant keywords to help you get discovered.
                    </p>
                    <div className="space-y-4">
                        <textarea
                            value={topic}
                            onChange={(e) => setTopic(e.target.value)}
                            disabled={isLoading}
                            rows={3}
                            placeholder="e.g., 'A review of the newest AI-powered gadgets for 2024'"
                            className="form-input block w-full rounded-lg border-gray-300 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 focus:ring-primary focus:border-primary text-gray-900 dark:text-white"
                        />
                        <Button onClick={handleGenerate} disabled={isLoading} className="w-full sm:w-auto bg-primary text-white hover:bg-primary/90">
                            {isLoading ? 'Generating...' : 'Generate Ideas (1 Credit)'}
                        </Button>
                        {error && <p className="text-sm text-red-500">{error}</p>}
                    </div>
                </CardContent>
            </Card>

            {isLoading && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card className="animate-pulse">
                        <CardHeader><div className="h-6 bg-gray-300 dark:bg-gray-700 rounded w-1/3"></div></CardHeader>
                        <CardContent className="space-y-3">
                            <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-full"></div>
                            <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-5/6"></div>
                            <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-full"></div>
                        </CardContent>
                    </Card>
                    <Card className="animate-pulse">
                         <CardHeader><div className="h-6 bg-gray-300 dark:bg-gray-700 rounded w-1/3"></div></CardHeader>
                        <CardContent><div className="h-20 bg-gray-300 dark:bg-gray-700 rounded"></div></CardContent>
                    </Card>
                </div>
            )}

            {ideas && (
                <div className="relative">
                    <div className="absolute top-4 right-4 z-10">
                        <button 
                          onClick={() => currentHistoryId && toggleFavorite(currentHistoryId)}
                          disabled={!currentHistoryId}
                          className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold transition-colors shadow-sm ${currentHistoryItem?.isFavorite ? 'bg-yellow-400 text-white' : 'bg-white dark:bg-gray-900 border dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                        >
                          <Star className={`w-4 h-4 ${currentHistoryItem?.isFavorite ? 'text-white' : 'text-yellow-400'}`} />
                          {currentHistoryItem?.isFavorite ? 'Favorited' : 'Save to Favorites'}
                        </button>
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <Card>
                            <CardHeader>
                                <CardTitle>Generated Titles</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <ul className="space-y-3">
                                    {ideas.titles.map((title, index) => (
                                        <li key={index} className="flex items-center justify-between gap-2 p-3 rounded-lg bg-gray-100 dark:bg-gray-800/50">
                                            <span className="text-sm text-gray-800 dark:text-gray-200">{title}</span>
                                            <button onClick={() => handleCopyToClipboard(title)} className="text-gray-400 hover:text-primary p-1 rounded-md">
                                                <span className="material-symbols-outlined !text-base">content_copy</span>
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            </CardContent>
                        </Card>

                        <div className="space-y-8">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Generated Description</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    <p className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap">{ideas.description}</p>
                                    <Button onClick={() => handleCopyToClipboard(ideas.description)} variant="outline" size="sm" className="dark:text-white dark:border-gray-600 dark:hover:bg-gray-800">
                                        Copy Description
                                    </Button>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <CardTitle>Keywords & Hashtags</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    <div className="flex flex-wrap gap-2">
                                        {ideas.keywords.map((keyword, index) => (
                                            <span key={index} className="px-2 py-1 text-xs rounded-full bg-primary/10 text-primary-800 dark:bg-primary/20 dark:text-primary-200">
                                                {keyword}
                                            </span>
                                        ))}
                                    </div>
                                    <Button onClick={() => handleCopyToClipboard(ideas.keywords.join(', '))} variant="outline" size="sm" className="dark:text-white dark:border-gray-600 dark:hover:bg-gray-800">
                                        Copy Keywords
                                    </Button>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ContentIdeationModule;