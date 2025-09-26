import React, { useContext } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Wand2, Scissors, Star, Download, Image } from '../components/icons';
import { Page } from '../App';
import { AuthContext } from '../contexts/AuthContext';
import { HistoryItem, GeneratedThumbnailHistoryItem, IdeationHistoryItem, ExtractedThumbnailHistoryItem } from '../types';
import { ThumbnailContext } from '../contexts/ThumbnailContext';
import { HistoryContext } from '../contexts/HistoryContext';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/Tabs';

const StatCard: React.FC<{ label: string; value: string | number }> = ({ label, value }) => (
  <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-white/10 dark:bg-gray-800">
    <div className="px-5 py-4 sm:px-6 sm:py-5">
      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-gray-900 dark:text-white">{value}</p>
    </div>
  </div>
);


const ThumbnailHistoryCard: React.FC<{ 
    item: GeneratedThumbnailHistoryItem | ExtractedThumbnailHistoryItem; 
    onClick: () => void;
    onToggleFavorite: (id: string) => void;
}> = ({ item, onClick, onToggleFavorite }) => {
    
    const displayText = item.type === 'thumbnail' ? item.prompt : item.videoUrl;

    return (
        <div className="group relative">
            <div 
                className="aspect-video w-full rounded-lg overflow-hidden border-2 border-transparent group-hover:border-primary transition-all cursor-pointer"
                onClick={onClick}
            >
                <img src={item.imageUrl} alt={displayText} className="w-full h-full object-cover" />
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
            className="relative group flex flex-col cursor-pointer hover:border-primary transition-colors"
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

interface DashboardProps {
    onNavigate: (page: Page) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
    const { activeAccount } = useContext(AuthContext);
    const { history, favorites, toggleFavorite } = useContext(HistoryContext);
    const { setReferenceImage, setInitialIdeationItem, setInitialExtractedItem, setInitialUrl } = useContext(ThumbnailContext);

    if (!activeAccount) {
        return <div>Loading...</div>;
    }

    const handleHistoryClick = (item: HistoryItem) => {
        switch (item.type) {
            case 'thumbnail':
                setReferenceImage(item.imageUrl);
                onNavigate('generator');
                break;
            case 'ideation':
                setInitialIdeationItem(item);
                onNavigate('generator');
                break;
            case 'extracted':
                setInitialUrl(item.videoUrl); // This pre-fills and auto-runs
                onNavigate('extractor');
                break;
        }
    };
    
    const renderItems = (items: HistoryItem[]) => (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mt-4">
            {items.map(item => {
                if (item.type === 'thumbnail' || item.type === 'extracted') {
                    return <ThumbnailHistoryCard key={item.id} item={item} onClick={() => handleHistoryClick(item)} onToggleFavorite={toggleFavorite} />;
                }
                if (item.type === 'ideation') {
                    return <IdeationHistoryCard key={item.id} item={item} onToggleFavorite={toggleFavorite} onClick={() => handleHistoryClick(item)} />;
                }
                return null;
            })}
        </div>
    );

    const recentHistory = history.slice(0, 8);

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
                    Welcome back, {activeAccount.name.split(' ')[0]}!
                </h1>
                <p className="mt-2 text-gray-600 dark:text-gray-400">Here's a summary of your account. Let's create something amazing today.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 ">
                <StatCard label="Credits Remaining" value={activeAccount.credits}   />
                <StatCard label="Current Plan" value={activeAccount.plan} />
                <StatCard label="Items Generated" value={history.length} />
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-6">
                    <Button onClick={() => onNavigate('generator')} size="lg" className="w-full sm:w-auto flex-1 bg-primary text-white hover:bg-primary/90">
                        <Wand2 className="w-5 h-5 mr-2" />
                        Generate New Thumbnail
                    </Button>
                    <Button onClick={() => onNavigate('extractor')} size="lg" className="w-full sm:w-auto flex-1 bg-primary text-white hover:bg-primary/90">
                        <Scissors className="w-5 h-5 mr-2" />
                        Extract from YouTube
                    </Button>
                    <Button onClick={() => onNavigate('face-editor')} size="lg" className="w-full sm:w-auto flex-1 bg-primary text-white hover:bg-primary/90">
                        <Image className="w-5 h-5 mr-2" />
                        Face Editor
                    </Button>
                
                </CardContent>
            </Card>

            <div>
                <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">Your Workspace</h2>
                 <Tabs defaultValue="history" className="mt-4">
                    <TabsList className="bg-gray-200/50 dark:bg-gray-900/50 border border-black/10 dark:border-white/10">
                        <TabsTrigger value="history">Recent Activity</TabsTrigger>
                        <TabsTrigger value="favorites">Favorites ({favorites.length})</TabsTrigger>
                    </TabsList>
                    <TabsContent value="history">
                        {recentHistory.length > 0 ? (
                           <>
                           {renderItems(recentHistory)}
                           <div className="text-center mt-8">
                             <Button onClick={() => onNavigate('history')} variant="outline" className="dark:text-white dark:border-gray-600 dark:hover:bg-gray-800">View All History</Button>
                           </div>
                           </>
                        ) : (
                            <Card className="mt-4">
                                <CardContent className="p-10 text-center">
                                    <p className="text-gray-500 dark:text-gray-400">You haven't generated anything yet.</p>
                                    <Button onClick={() => onNavigate('generator')} className="mt-4 bg-primary text-white">Generate Your First Item</Button>
                                </CardContent>
                            </Card>
                        )}
                    </TabsContent>
                     <TabsContent value="favorites">
                        {favorites.length > 0 ? (
                            <>
                            {renderItems(favorites)}
                            {history.length > favorites.length && (
                                <div className="text-center mt-8">
                                    <Button onClick={() => onNavigate('history')} variant="outline" className="dark:text-white dark:border-gray-600 dark:hover:bg-gray-800">View All History</Button>
                                </div>
                            )}
                            </>
                        ) : (
                            <Card className="mt-4">
                                <CardContent className="p-10 text-center">
                                    <p className="text-gray-500 mt-4 dark:text-gray-400">Your favorite items will appear here.</p>
                                    <p className="text-sm mt-1 text-gray-500/80">Click the star on any generated item to save it.</p>
                                </CardContent>
                            </Card>
                        )}
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}

export default Dashboard;
