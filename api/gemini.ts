// api/gemini.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI, Modality, Type } from '@google/genai';

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  // Don't crash during import; return 500 at runtime instead
  console.warn('GEMINI_API_KEY not set on server');
}

const ai = new GoogleGenAI({ apiKey: apiKey || '' });

// Helper: data URL → { mimeType, data }
function parseBase64(dataUrl?: string | null) {
  if (!dataUrl) return null;
  const match = dataUrl.match(/^data:(.+?);base64,(.+)$/);
  if (!match) return null;
  return { mimeType: match[1], data: match[2] };
}

// Validate aspect ratio; default to 16:9 (safest for YouTube thumbnails)
function normalizeAspectRatio(ar?: string): '16:9' | '9:16' {
  return ar === '9:16' || ar === '16:9' ? ar : '16:9';
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

    // -----------------------------------------------------------------------
    // OP: generateThumbnail
    // -----------------------------------------------------------------------
    if (op === 'generateThumbnail') {
      const { prompt, referenceImage, userImage, aspectRatio } = payload ?? {};
      if (!prompt) return res.status(400).json({ error: 'Missing prompt' });

      const ar = normalizeAspectRatio(aspectRatio);

      // --- TEXT-TO-IMAGE (no images provided) ------------------------------
      if (!referenceImage && !userImage) {
        // Augment prompt with thumbnail best practices (only for TTI path)
        const ttiPrompt = `
${prompt}

[Thumbnail mode requirements]
- Create a YouTube thumbnail in ${ar} aspect ratio (no distortion).
- Strong focal subject; clear foreground/background separation.
- High contrast, limited palette (2–3 key colors), avoid clutter.
- If (and only if) the prompt implies text, use ≤ 4 bold, high-contrast words (no paragraphs).
- Keep all key elements inside a 90% safe margin to prevent edge clipping.
`.trim();

        const response = await ai.models.generateImages({
          model: 'imagen-4.0-generate-001',
          prompt: ttiPrompt,
          config: {
            numberOfImages: 1,
            outputMimeType: 'image/png',
            aspectRatio: ar,
          },
        });

        if (!response.generatedImages?.length) {
          return res.status(500).json({ error: 'Image generation failed to produce an image.' });
        }

        const base64ImageBytes = response.generatedImages[0].image.imageBytes;
        return res.status(200).json({
          imageUrl: `data:image/png;base64,${base64ImageBytes}`,
          responseText: `Image generated from prompt (thumbnail mode): "${prompt}"`,
        });
      }

      // --- EDIT/COMPOSITION (one or both images provided) -------------------
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

      // Strict, unambiguous instruction block
      let detailedPrompt = `
You are an expert YouTube thumbnail designer.

HARD RULES (must follow exactly):
- OUTPUT SIZE: Return a single PNG in EXACT 16:9 aspect ratio. If inputs are not 16:9, crop or extend canvas, but DO NOT distort subjects.
- EDIT SCOPE: Only change parts explicitly requested by the user. Do NOT modify any other regions, colors, faces, lighting, or composition unless asked.
- IMAGE ROLES:
  • referenceImage = style/layout/color/lighting inspiration ONLY (never copy 1:1 unless user says so).
  • userImage = main subject to place or edit (keep identity, skin tones, lighting continuity).
- SAFETY MARGINS: Keep all critical elements (faces, main text) inside a 90% safe area to avoid edge clipping on different devices.
- TEXT TREATMENT (only if the user explicitly asks for text): Use very short, bold, high-contrast text (≤ 4 words), no paragraphs, avoid busy fonts.

CONDITIONS:
- If BOTH referenceImage and userImage are provided:
  • Use the userImage as the primary subject.
  • Match the color palette, contrast and layout rhythm of the referenceImage without copying exact branding or logos.
- If ONLY referenceImage is provided:
  • Treat this as an EDIT of that image per the user’s instructions. Maintain original composition; only change what’s requested.
- If NO images are provided (not this branch):
  • Produce a high-CTR YouTube thumbnail in 16:9 using thumbnail best practices.

User instruction (authoritative):
"${prompt}"
`.trim();

      parts.push({ text: detailedPrompt });

      if (parts.length <= 1) {
        return res.status(400).json({ error: 'Image editing requires at least one image and a text prompt.' });
      }

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image-preview',
        contents: { parts },
        config: {
          responseModalities: [Modality.IMAGE, Modality.TEXT],
          // Enforce 16:9 and PNG on the edit/composition path
          imageGenerationConfig: {
            numberOfImages: 1,
            aspectRatio: '16:9',
            outputMimeType: 'image/png',
          },
        },
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

    // -----------------------------------------------------------------------
    // OP: editFaceImage
    // -----------------------------------------------------------------------
    if (op === 'editFaceImage') {
      const { base64Image, prompt } = payload ?? {};
      const parsed = parseBase64(base64Image);
      if (!parsed) return res.status(400).json({ error: 'Could not parse image data.' });

      const parts = [
        { inlineData: { mimeType: parsed.mimeType, data: parsed.data } },
        {
          text: `
Edit ONLY what is asked; keep identity, skin tones, and lighting consistent.
Output MUST be a single PNG in EXACT 16:9. If needed, extend canvas or crop (no subject distortion).

Instruction:
${prompt}
          `.trim(),
        },
      ];

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image-preview',
        contents: { parts },
        config: {
          responseModalities: [Modality.IMAGE, Modality.TEXT],
          imageGenerationConfig: {
            numberOfImages: 1,
            aspectRatio: '16:9',
            outputMimeType: 'image/png',
          },
        },
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

    // -----------------------------------------------------------------------
    // OP: getSummaryFromTranscript
    // -----------------------------------------------------------------------
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
            },
          },
        },
      });

      const jsonText = (response as any).text?.trim?.() ?? '';
      try {
        const parsed = JSON.parse(jsonText);
        return res.status(200).json(parsed);
      } catch {
        return res.status(200).json({
          tldr: 'The model returned a response, but it could not be parsed as valid JSON.',
          points: [jsonText],
        });
      }
    }

    // -----------------------------------------------------------------------
    // OP: answerQuestionFromTranscript
    // -----------------------------------------------------------------------
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

    // -----------------------------------------------------------------------
    // OP: generateContentIdeas
    // -----------------------------------------------------------------------
    if (op === 'generateContentIdeas') {
      const { topic } = payload ?? {};
      if (!topic) return res.status(400).json({ error: 'Missing topic' });

      const strategistPrompt =
        `You are an expert YouTube content strategist. Based on the following video topic, ` +
        `generate a list of viral-style titles, an SEO-optimized description, and a list of relevant keywords/hashtags.\n\n` +
        `Video Topic: "${topic}"`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: strategistPrompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              titles: { type: Type.ARRAY, items: { type: Type.STRING } },
              description: { type: Type.STRING },
              keywords: { type: Type.ARRAY, items: { type: Type.STRING } },
            },
          },
        },
      });

      const jsonText = (response as any).text?.trim?.() ?? '';
      try {
        return res.status(200).json(JSON.parse(jsonText));
      } catch {
        return res.status(422).json({ error: 'Invalid JSON from model', raw: jsonText });
      }
    }

    // Unknown op
    return res.status(400).json({ error: `Unknown op: ${op}` });
  } catch (err: any) {
    console.error(err);
    return res.status(500).json({ error: 'Server error', detail: err?.message });
  }
}
