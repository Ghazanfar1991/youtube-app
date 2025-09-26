// src/services/geminiServices.ts (CLIENT-SIDE)
// Note: no import of @google/genai here, and NO env vars.

import { ChatMessage } from '../types';

interface GenerateThumbnailParams {
  prompt: string;
  referenceImage?: string | null;
  userImage?: string | null;
  aspectRatio: '16:9' | '9:16';
}
interface GenerateThumbnailResult {
  imageUrl: string;
  responseText: string;
}

async function call(op: string, payload: any) {
  const res = await fetch('/api/gemini', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ op, payload }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error || 'Request failed');
  }
  return data;
}

export const generateThumbnail = async (
  params: GenerateThumbnailParams
): Promise<GenerateThumbnailResult> => {
  return call('generateThumbnail', params);
};

export const editFaceImage = async (
  base64Image: string,
  prompt: string
): Promise<{ imageUrl: string; responseText: string }> => {
  return call('editFaceImage', { base64Image, prompt });
};

export const getSummaryFromTranscript = async (
  transcript: string
): Promise<{ tldr: string; points: string[] }> => {
  return call('getSummaryFromTranscript', { transcript });
};

export const answerQuestionFromTranscript = async (
  transcript: string,
  question: string,
  history: ChatMessage[]
): Promise<string> => {
  const data = await call('answerQuestionFromTranscript', { transcript, question, history });
  return data.text as string;
};

export interface ContentIdeas {
  titles: string[];
  description: string;
  keywords: string[];
}
export const generateContentIdeas = async (topic: string): Promise<ContentIdeas> => {
  return call('generateContentIdeas', { topic });
};
