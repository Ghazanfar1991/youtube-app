import React, { createContext, useState, ReactNode, useMemo, useContext } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { HistoryItem } from '../types';

interface HistoryContextType {
    history: HistoryItem[];
    favorites: HistoryItem[];
    addHistoryItem: (item: Omit<HistoryItem, 'id' | 'timestamp' | 'isFavorite'>) => string;
    toggleFavorite: (id: string) => void;
    clearHistory: () => void;
}

export const HistoryContext = createContext<HistoryContextType>({
    history: [],
    favorites: [],
    addHistoryItem: () => '',
    toggleFavorite: () => {},
    clearHistory: () => {},
});

export const HistoryProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [history, setHistory] = useLocalStorage<HistoryItem[]>('thumbgeniusUnifiedHistory', []);

    const favorites = useMemo(() => history.filter(item => item.isFavorite), [history]);

    const addHistoryItem = (itemData: Omit<HistoryItem, 'id' | 'timestamp' | 'isFavorite'>): string => {
        const id = new Date().toISOString();
        const newItem: HistoryItem = {
            ...itemData,
            id,
            timestamp: Date.now(),
            isFavorite: false,
        } as HistoryItem;

        setHistory(prev => [newItem, ...prev].slice(0, 50)); // Keep history to a reasonable size of 50 items
        return id;
    };

    const toggleFavorite = (id: string) => {
        setHistory(prev => prev.map(item =>
            item.id === id ? { ...item, isFavorite: !item.isFavorite } : item
        ));
    };
    
    const clearHistory = () => {
        setHistory([]);
    };

    return (
        <HistoryContext.Provider value={{ history, favorites, addHistoryItem, toggleFavorite, clearHistory }}>
            {children}
        </HistoryContext.Provider>
    );
};
