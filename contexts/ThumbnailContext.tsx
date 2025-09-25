import React, { createContext, useState, ReactNode } from 'react';
import { IdeationHistoryItem, ExtractedThumbnailHistoryItem, GeneratedThumbnailHistoryItem } from '../types';

interface ThumbnailContextType {
    referenceImage: string | null;
    userImage: string | null;
    setReferenceImage: (url: string | null) => void;
    setUserImage: (url: string | null) => void;
    initialPrompt: string | null;
    setInitialPrompt: (prompt: string | null) => void;
    initialUrl: string | null;
    setInitialUrl: (url: string | null) => void;
    initialIdeationItem: IdeationHistoryItem | null;
    setInitialIdeationItem: (item: IdeationHistoryItem | null) => void;
    initialExtractedItem: ExtractedThumbnailHistoryItem | null;
    setInitialExtractedItem: (item: ExtractedThumbnailHistoryItem | null) => void;
    initialFaceEditItem: GeneratedThumbnailHistoryItem | null;
    setInitialFaceEditItem: (item: GeneratedThumbnailHistoryItem | null) => void;
}

export const ThumbnailContext = createContext<ThumbnailContextType>({
    referenceImage: null,
    userImage: null,
    setReferenceImage: () => {},
    setUserImage: () => {},
    initialPrompt: null,
    setInitialPrompt: () => {},
    initialUrl: null,
    setInitialUrl: () => {},
    initialIdeationItem: null,
    setInitialIdeationItem: () => {},
    initialExtractedItem: null,
    setInitialExtractedItem: () => {},
    initialFaceEditItem: null,
    setInitialFaceEditItem: () => {},
});

interface ThumbnailProviderProps {
    children: ReactNode;
}

export const ThumbnailProvider: React.FC<ThumbnailProviderProps> = ({ children }) => {
    const [referenceImage, setReferenceImage] = useState<string | null>(null);
    const [userImage, setUserImage] = useState<string | null>(null);
    const [initialPrompt, setInitialPrompt] = useState<string | null>(null);
    const [initialUrl, setInitialUrl] = useState<string | null>(null);
    const [initialIdeationItem, setInitialIdeationItem] = useState<IdeationHistoryItem | null>(null);
    const [initialExtractedItem, setInitialExtractedItem] = useState<ExtractedThumbnailHistoryItem | null>(null);
    const [initialFaceEditItem, setInitialFaceEditItem] = useState<GeneratedThumbnailHistoryItem | null>(null);

    return (
        <ThumbnailContext.Provider value={{ 
            referenceImage, 
            userImage, 
            setReferenceImage, 
            setUserImage,
            initialPrompt,
            setInitialPrompt,
            initialUrl,
            setInitialUrl,
            initialIdeationItem,
            setInitialIdeationItem,
            initialExtractedItem,
            setInitialExtractedItem,
            initialFaceEditItem,
            setInitialFaceEditItem,
        }}>
            {children}
        </ThumbnailContext.Provider>
    );
};