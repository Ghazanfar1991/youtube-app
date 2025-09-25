import { ContentIdeas } from './services/geminiService';

export interface VideoFormat {
  quality: string;
  type: string;
  size: string;
  url: string;
}

export interface TranscriptLine {
  timestamp: string;
  text: string;
}

export interface ChatMessage {
  sender: 'user' | 'ai';
  text: string;
}

// This is the main user object used throughout the app.
export interface UserAccount {
  id: string;
  name: string;
  email: string;
  provider: 'google' | 'email';
  picture?: string; // Optional, Google users have it
  accessToken?: string; // Optional, Google users have it
  plan: 'Free' | 'Pro' | 'Max';
  credits: number;
  planRenewalDate?: number; // timestamp for next credit refresh
}

// This is ONLY for storing email/password combos in local storage for the demo.
// WARNING: Storing plain text passwords is not secure. This is for demonstration purposes only.
export interface EmailUserCredentials {
  id: string;
  email: string;
  password_hash: string; // In a real app, this would be a securely hashed password.
}


export interface YouTubeAnalyticsData {
  views: number;
  watchTimeHours: number;
  subscribers: number;
  lastFetched: number;
}

// --- Unified History Types ---

// Base interface for all history items
interface BaseHistoryItem {
  id: string;
  timestamp: number;
  isFavorite: boolean;
}

// Specific type for generated thumbnails
export interface GeneratedThumbnailHistoryItem extends BaseHistoryItem {
  type: 'thumbnail';
  imageUrl: string;
  prompt: string;
  originalImageUrl?: string;
}

// Specific type for generated content ideas
export interface IdeationHistoryItem extends BaseHistoryItem {
  type: 'ideation';
  topic: string;
  ideas: ContentIdeas;
}

// Specific type for extracted thumbnails
export interface ExtractedThumbnailHistoryItem extends BaseHistoryItem {
  type: 'extracted';
  imageUrl: string;
  videoUrl: string;
}


// Union type for the unified history
export type HistoryItem = GeneratedThumbnailHistoryItem | IdeationHistoryItem | ExtractedThumbnailHistoryItem;