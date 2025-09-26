// api/gemini.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI, Modality, Type } from '@google/genai';

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  // Do not throw at import time; return 500 at runtime for clearer error
  console.warn('GEMINI_API_KEY not set on server');
}

const ai = new GoogleGenAI({ apiKey: apiKey || '' });

// Helper: base64 "data:*/*;base64,AAAA" → {mimeType, data}
function parseBase64(dataUrl?: string | null) {
  if (!dataUrl) return null;
  const match = dataUrl.match(/^data:(.+?);base64,(.+)$/);
  if (!match) return null;
  return { mimeType: match[1], data: match[2] };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST');
      return res.status(405).json({ error: 'Method Not Allowed' });
    }
    if (!apiKey) {
      return res.status(500).json({ error: 'Server misconfig: GEMINI_API_KEY not set' });
    }

    const { op, payload } = req.body ?? {};
    if (!op) return res.status(400).json({ error: 'Missing op' });

    // ---------- OP: generateThumbnail ----------
    if (op === 'generateThumbnail') {
      const { prompt, referenceImage, userImage, aspectRatio } = payload ?? {};
      if (!prompt || !aspectRatio) return res.status(400).json({ error: 'Missing prompt/aspectRatio' });

      // Text-to-image branch
      if (!referenceImage && !userImage) {
        const response = await ai.models.generateImages({
          model: 'imagen-4.0-generate-001',
          prompt,
          config: {
            numberOfImages: 1,
            outputMimeType: 'image/png',
            aspectRatio,
          },
        });

        if (!response.generatedImages?.length) {
          return res.status(500).json({ error: 'Image generation failed to produce an image.' });
        }
        const base64ImageBytes = response.generatedImages[0].image.imageBytes;
        return res.status(200).json({
          imageUrl: `data:image/png;base64,${base64ImageBytes}`,
          responseText: `Image generated from prompt: "${prompt}"`,
        });
      }

      // Edit/composition branch with Gemini
      const parts: any[] = [];
      if (referenceImage) {
        const p = parseBase64(referenceImage);
        if (!p) return res.status(400).json({ error: 'Could not parse reference image data.' });
        parts.push({ inlineData: { mimeType: p.mimeType, data: p.data } });
      }
      if (userImage) {
        const p = parseBase64(userImage);
        if (!p) return res.status(400).json({ error: 'Could not parse user image data.' });
        parts.push({ inlineData: { mimeType: p.mimeType, data: p.data } });
      }

      let detailedPrompt =
        `You are an expert YouTube thumbnail designer using the 'nano-banana' model. Follow these rules strictly:
1. Output Aspect Ratio: The final output image MUST have a 16:9 aspect ratio.
2. Precision Editing: Only change elements mentioned in the user's prompt; keep the rest intact.
`;
      if (referenceImage && userImage) {
        detailedPrompt +=
          `3. Design and Composition: Use the user image as the main subject. Take color/layout/style cues from the reference thumbnail. Follow the user's text prompt.\n`;
      } else if (referenceImage) {
        detailedPrompt +=
          `3. Editing Context: The user provided a reference thumbnail. The following text prompt instructs how to EDIT that image.\n`;
      }
      detailedPrompt += `\nUser's instruction: "${payload.prompt}"`;

      parts.push({ text: detailedPrompt });

      if (parts.length <= 1) {
        return res.status(400).json({ error: 'Image editing requires an image and a text prompt.' });
      }

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image-preview',
        contents: { parts },
        config: { responseModalities: [Modality.IMAGE, Modality.TEXT] },
      });

      let newImageUrl: string | null = null;
      let newResponseText = 'Image edited successfully.';

      const candidate = response.candidates?.[0];
      for (const part of candidate?.content?.parts ?? []) {
        if ((part as any).inlineData) {
          const b64 = (part as any).inlineData.data;
          const mime = (part as any).inlineData.mimeType;
          newImageUrl = `data:${mime};base64,${b64}`;
        } else if ((part as any).text) {
          newResponseText = (part as any).text;
        }
      }

      if (!newImageUrl) {
        return res.status(422).json({
          error: 'The model did not return an image. The prompt may have been blocked for safety reasons.',
          debug: response,
        });
      }

      return res.status(200).json({ imageUrl: newImageUrl, responseText: newResponseText });
    }

    // ---------- OP: editFaceImage ----------
    if (op === 'editFaceImage') {
      const { base64Image, prompt } = payload ?? {};
      const parsed = parseBase64(base64Image);
      if (!parsed) return res.status(400).json({ error: 'Could not parse image data.' });

      const parts = [
        { inlineData: { mimeType: parsed.mimeType, data: parsed.data } },
        { text: prompt },
      ];

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image-preview',
        contents: { parts },
        config: { responseModalities: [Modality.IMAGE, Modality.TEXT] },
      });

      let newImageUrl: string | null = null;
      let newResponseText = 'Image edited successfully.';
      const candidate = response.candidates?.[0];
      for (const part of candidate?.content?.parts ?? []) {
        if ((part as any).inlineData) {
          const b64 = (part as any).inlineData.data;
          const mime = (part as any).inlineData.mimeType;
          newImageUrl = `data:${mime};base64,${b64}`;
        } else if ((part as any).text) {
          newResponseText = (part as any).text;
        }
      }

      if (!newImageUrl) {
        return res.status(422).json({
          error: 'The model did not return an image. The prompt may have been blocked for safety reasons.',
          debug: response,
        });
      }

      return res.status(200).json({ imageUrl: newImageUrl, responseText: newResponseText });
    }

    // ---------- OP: getSummaryFromTranscript ----------
    if (op === 'getSummaryFromTranscript') {
      const { transcript } = payload ?? {};
      if (!transcript) return res.status(400).json({ error: 'Missing transcript' });

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Summarize the following transcript. Provide a short "TL;DR" summary, followed by a few key bullet points. The transcript is:\n\n${transcript}`,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              tldr: { type: Type.STRING },
              points: { type: Type.ARRAY, items: { type: Type.STRING } },
            }
          }
        }
      });

      const jsonText = (response as any).text?.trim?.() ?? '';
      try {
        const parsed = JSON.parse(jsonText);
        return res.status(200).json(parsed);
      } catch (e) {
        return res.status(200).json({
          tldr: 'The model returned a response, but it could not be parsed as valid JSON.',
          points: [jsonText],
        });
      }
    }

    // ---------- OP: answerQuestionFromTranscript ----------
    if (op === 'answerQuestionFromTranscript') {
      const { transcript, question, history } = payload ?? {};
      if (!transcript || !question) return res.status(400).json({ error: 'Missing transcript/question' });

      const chat = ai.chats.create({
        model: 'gemini-2.5-flash',
        config: {
          systemInstruction:
            `You are an AI assistant that answers questions about a provided YouTube video transcript. ` +
            `Be concise and base your answers strictly on the transcript. Here is the transcript:\n\n${transcript}`,
        },
      });

      if (Array.isArray(history) && history.length) {
        chat.history = history.map((msg: any) => ({
          role: msg.sender === 'user' ? 'user' : 'model',
          parts: [{ text: msg.text }],
        }));
      }

      const response = await chat.sendMessage({ message: question });
      return res.status(200).json({ text: (response as any).text });
    }

    // ---------- OP: generateContentIdeas ----------
    if (op === 'generateContentIdeas') {
      const { topic } = payload ?? {};
      if (!topic) return res.status(400).json({ error: 'Missing topic' });

      const prompt =
        `You are an expert YouTube content strategist. Based on the following video topic, generate a list of viral-style titles, an SEO-optimized description, and a list of relevant keywords/hashtags.\n\n` +
        `Video Topic: "${topic}"`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              titles: { type: Type.ARRAY, items: { type: Type.STRING } },
              description: { type: Type.STRING },
              keywords: { type: Type.ARRAY, items: { type: Type.STRING } },
            }
          }
        }
      });

      const jsonText = (response as any).text?.trim?.() ?? '';
      try {
        return res.status(200).json(JSON.parse(jsonText));
      } catch (e) {
        return res.status(422).json({ error: 'Invalid JSON from model', raw: jsonText });
      }
    }

    return res.status(400).json({ error: `Unknown op: ${op}` });
  } catch (err: any) {
    console.error(err);
    return res.status(500).json({ error: 'Server error', detail: err?.message });
  }
}
