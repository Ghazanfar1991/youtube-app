


import { GoogleGenAI, Modality, GenerateContentResponse, Type, Part, Chat } from "@google/genai";
import { parseBase64 } from "../utils/fileUtils";
import { ChatMessage } from '../types';


// In a real application, this would be secured on a backend server.
// For this example, we're assuming the API key is available in the environment.
const apiKey = import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.GEMINI_API_KEY;
if (!apiKey) {
  throw new Error("API_KEY environment variable not set");
}
const ai = new GoogleGenAI({ apiKey });


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

export const generateThumbnail = async ({ 
  prompt, 
  referenceImage, 
  userImage,
  aspectRatio
}: GenerateThumbnailParams): Promise<GenerateThumbnailResult> => {
  
  if (!referenceImage && !userImage) {
    console.log(`Performing text-to-image generation with Imagen... Aspect Ratio: ${aspectRatio}`);
    const response = await ai.models.generateImages({
      model: 'imagen-4.0-generate-001',
      prompt: prompt,
      config: {
        numberOfImages: 1,
        outputMimeType: 'image/png',
        aspectRatio: aspectRatio,
      },
    });

    if (!response.generatedImages || response.generatedImages.length === 0) {
      throw new Error('Image generation failed to produce an image.');
    }

    const base64ImageBytes = response.generatedImages[0].image.imageBytes;
    const imageUrl = `data:image/png;base64,${base64ImageBytes}`;
    
    return {
      imageUrl,
      responseText: `Image generated from prompt: "${prompt}"`,
    };
  }

  console.log("Performing image editing/combination with Gemini...");
  const parts: any[] = [];

  if (referenceImage) {
    const parsed = parseBase64(referenceImage);
    if (parsed) {
      parts.push({ inlineData: { mimeType: parsed.mimeType, data: parsed.data } });
    } else {
      throw new Error("Could not parse reference image data.");
    }
  }
  if (userImage) {
    const parsed = parseBase64(userImage);
    if (parsed) {
      parts.push({ inlineData: { mimeType: parsed.mimeType, data: parsed.data } });
    } else {
      throw new Error("Could not parse user image data.");
    }
  }
  
  let detailedPrompt = `You are an expert YouTube thumbnail designer using the 'nano-banana' model. Follow these rules strictly:
1.  **Output Aspect Ratio:** The final output image MUST have a 16:9 aspect ratio, suitable for a YouTube thumbnail.
2.  **Precision Editing:** When editing an image, you must ONLY change the specific elements mentioned in the user's prompt. Do NOT alter other parts of the image unless explicitly asked. Maintain the original image's integrity as much as possible.
`;

  if (referenceImage && userImage) {
      detailedPrompt += `3.  **Design and Composition:** The user has provided a reference thumbnail for design inspiration (colors, layout, style) and a separate user image (e.g., a person's face). Your task is to create a NEW thumbnail. Use the user image as the main subject. Take design cues from the reference thumbnail. The final design should be based on the user's text prompt below.
`;
  } else if (referenceImage) {
      detailedPrompt += `3.  **Editing Context:** The user has provided a reference thumbnail. The following text prompt is an instruction to EDIT this specific thumbnail.
`;
  }

  detailedPrompt += `
User's instruction: "${prompt}"`;

  parts.push({ text: detailedPrompt });


  if (parts.length <= 1) {
    throw new Error('Image editing requires an image and a text prompt.');
  }

  const response: GenerateContentResponse = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image-preview',
    contents: { parts },
    config: {
        responseModalities: [Modality.IMAGE, Modality.TEXT],
    },
  });
  
  let newImageUrl: string | null = null;
  let newResponseText: string = "Image edited successfully.";

  if (response.candidates && response.candidates.length > 0) {
      for (const part of response.candidates[0].content.parts) {
          if (part.inlineData) {
              const base64ImageBytes = part.inlineData.data;
              const mimeType = part.inlineData.mimeType;
              newImageUrl = `data:${mimeType};base64,${base64ImageBytes}`;
          } else if (part.text) {
              newResponseText = part.text;
          }
      }
  }

  if (!newImageUrl) {
      console.error("Full API Response:", JSON.stringify(response, null, 2));
      throw new Error('The model did not return an image. The prompt may have been blocked for safety reasons.');
  }

  return {
    imageUrl: newImageUrl,
    responseText: newResponseText,
  };
};

export const editFaceImage = async (base64Image: string, prompt: string): Promise<{ imageUrl: string; responseText: string; }> => {
    console.log("Performing face editing with Gemini...");

    const parsed = parseBase64(base64Image);
    if (!parsed) {
        throw new Error("Could not parse image data.");
    }
    
    const parts: Part[] = [
        { inlineData: { mimeType: parsed.mimeType, data: parsed.data } },
        { text: prompt }
    ];

    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image-preview',
        contents: { parts },
        config: {
            responseModalities: [Modality.IMAGE, Modality.TEXT],
        },
    });

    let newImageUrl: string | null = null;
    let newResponseText: string = "Image edited successfully.";

    if (response.candidates && response.candidates.length > 0) {
        for (const part of response.candidates[0].content.parts) {
            if (part.inlineData) {
                const base64ImageBytes = part.inlineData.data;
                const mimeType = part.inlineData.mimeType;
                newImageUrl = `data:${mimeType};base64,${base64ImageBytes}`;
            } else if (part.text) {
                newResponseText = part.text;
            }
        }
    }

    if (!newImageUrl) {
        console.error("Full API Response:", JSON.stringify(response, null, 2));
        throw new Error('The model did not return an image. The prompt may have been blocked for safety reasons.');
    }

    return {
        imageUrl: newImageUrl,
        responseText: newResponseText,
    };
};

// Fix: Implemented missing function to summarize transcript using Gemini API
export const getSummaryFromTranscript = async (transcript: string): Promise<{tldr: string, points: string[]}> => {
  const model = 'gemini-2.5-flash';
  const prompt = `Summarize the following transcript. Provide a short "TL;DR" summary, followed by a few key bullet points. The transcript is: \n\n${transcript}`;

  const response = await ai.models.generateContent({
    model: model,
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          tldr: {
            type: Type.STRING,
            description: "A short, one or two sentence summary of the transcript."
          },
          points: {
            type: Type.ARRAY,
            description: "A list of key bullet points from the transcript.",
            items: { type: Type.STRING }
          }
        }
      }
    }
  });

  const jsonText = response.text.trim();
  try {
    return JSON.parse(jsonText);
  } catch(e) {
    console.error("Failed to parse summary JSON:", e, "Raw text:", jsonText);
    return {
      tldr: "The model returned a response, but it could not be parsed as valid JSON.",
      points: [jsonText]
    }
  }
};

// Fix: Implemented missing function to answer questions about a transcript using Gemini chat
export const answerQuestionFromTranscript = async (transcript: string, question: string, history: ChatMessage[]): Promise<string> => {
  const model = 'gemini-2.5-flash';
  
  const chat: Chat = ai.chats.create({
    model: model,
    config: {
      systemInstruction: `You are an AI assistant that answers questions about a provided YouTube video transcript. Be concise and base your answers strictly on the transcript. Here is the transcript:\n\n${transcript}`,
    },
  });

  const geminiHistory: { role: 'user' | 'model'; parts: Part[] }[] = history.map(msg => ({
      role: msg.sender === 'user' ? 'user' : 'model',
      parts: [{ text: msg.text }]
  }));
  
  if (geminiHistory.length > 0) {
      chat.history = geminiHistory;
  }
  
  const response = await chat.sendMessage({ message: question });

  return response.text;
};


export interface ContentIdeas {
  titles: string[];
  description: string;
  keywords: string[];
}

export const generateContentIdeas = async (topic: string): Promise<ContentIdeas> => {
    const model = 'gemini-2.5-flash';
    const prompt = `You are an expert YouTube content strategist. Based on the following video topic, generate a list of viral-style titles, an SEO-optimized description, and a list of relevant keywords/hashtags.

Video Topic: "${topic}"`;

    const response = await ai.models.generateContent({
        model: model,
        contents: prompt,
        config: {
            responseMimeType: 'application/json',
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    titles: {
                        type: Type.ARRAY,
                        description: "5-7 viral, click-worthy YouTube titles for the video.",
                        items: { type: Type.STRING }
                    },
                    description: {
                        type: Type.STRING,
                        description: "A 2-3 paragraph, SEO-optimized YouTube description that includes relevant keywords."
                    },
                    keywords: {
                        type: Type.ARRAY,
                        description: "A list of 10-15 relevant keywords and hashtags for the video.",
                        items: { type: Type.STRING }
                    }
                }
            }
        }
    });

    const jsonText = response.text.trim();
    try {
        return JSON.parse(jsonText);
    } catch (e) {
        console.error("Failed to parse content ideas JSON:", e, "Raw text:", jsonText);
        throw new Error("The model returned an invalid response. Please try again.");
    }
};