// api/gemini.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI } from '@google/genai';
// Optional exact-pixel normalization (recommended)
import sharp from 'sharp';

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.warn('GEMINI_API_KEY not set on server');
}

const ai = new GoogleGenAI({ apiKey: apiKey || '' });

// --- helpers ---------------------------------------------------------------

function parseDataUrl(dataUrl?: string | null) {
  if (!dataUrl) return null;
  const m = dataUrl.match(/^data:(.+?);base64,(.+)$/);
  if (!m) return null;
  return { mimeType: m[1], dataB64: m[2] };
}

function normalizeAspectRatio(ar?: string): '16:9' | '9:16' {
  return ar === '9:16' || ar === '16:9' ? ar : '16:9';
}

/**
 * Ensure exact 1920x1080 PNG (non-destructive: uses cover+center).
 * If sharp not desired, return input unchanged.
 */
async function normalizeTo1920x1080PNG(imageB64: string): Promise<string> {
  try {
    const buf = Buffer.from(imageB64, 'base64');
    const out = await sharp(buf)
      .resize(1920, 1080, { fit: 'cover', position: 'centre' })
      .png()
      .toBuffer();
    return out.toString('base64');
  } catch {
    // If anything fails, just return original
    return imageB64;
  }
}

/**
 * Build the prompt block according to inputs, aligned with:
 * https://ai.google.dev/gemini-api/docs/image-generation (Gemini Flash Image) :contentReference[oaicite:2]{index=2}
 */
function buildInstruction({
  prompt,
  hasReference,
  hasUser,
  ar,
  textOnly,
}: {
  prompt: string;
  hasReference: boolean;
  hasUser: boolean;
  ar: '16:9' | '9:16';
  textOnly: boolean;
}) {
  const baseRules = `
You are an expert YouTube thumbnail designer.

HARD RULES:
- OUTPUT: Create a YouTube thumbnail in EXACT ${ar} aspect ratio. Do NOT distort people or objects. If inputs aren't ${ar}, extend canvas or crop safely (no stretching).
- EDIT SCOPE: Change only what the instructions request. Keep other regions, colors, faces, lighting and composition intact unless asked.
- SAFE AREA: Keep faces and any text inside a ~90% safe margin to avoid edge clipping across devices.
- TEXT (ONLY if requested): ≤ 4 bold, high-contrast words, no paragraphs, legible at small sizes.

ROLE DEFINITIONS:
- referenceImage = style/layout/color/lighting inspiration and/or the image to minimally EDIT if the user asks for edits.
- userImage = the person/subject to feature prominently; preserve identity, skin tones and lighting continuity.
`.trim();

  const cases: string[] = [];

  if (hasReference && hasUser) {
    cases.push(`
CASE: Reference + User Image + Text
- Use the userImage as the primary subject.
- Use the referenceImage for layout rhythm, palette and style cues.
- If the instruction says "edit the reference", perform a minimal edit of referenceImage to insert or adjust the userImage as directed.
- Otherwise, generate a NEW thumbnail that clearly follows the referenceImage's style while featuring the userImage as the subject.
`.trim());
  } else if (hasReference && !hasUser) {
    cases.push(`
CASE: Reference Image + Text
- Treat this primarily as an EDIT of the provided referenceImage if the instruction implies changes to that image.
- If the instruction is general (design a new one in this style), follow the style of the referenceImage and produce a new thumbnail consistent with it.
- Maintain original composition unless the user asks for layout changes.
`.trim());
  } else if (!hasReference && hasUser) {
    cases.push(`
CASE: User Image + Text
- Feature the userImage as the main subject and design the rest of the thumbnail per instructions (background, colors, graphics) without distorting the subject.
`.trim());
  } else if (textOnly) {
    cases.push(`
CASE: Text Only (no images provided) — Thumbnail Mode
- Strong focal subject with clear foreground/background separation.
- High contrast, limited palette (2–3 key colors), avoid clutter.
- If the prompt implies text, keep it short and very legible.
`.trim());
  }

  return `${baseRules}\n\n${cases.join('\n\n')}\n\nUSER INSTRUCTION (authoritative):\n"${prompt}"`;
}

// --- HTTP handler ----------------------------------------------------------

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

    // ---------------------------------------------------------------------
    // OP: generateThumbnail (handles TTI, single-image edit, or multi-image)
    // Per docs, we use Gemini Flash Image via generateContent with contents
    // as [text, image?, image?]. :contentReference[oaicite:3]{index=3}
    // ---------------------------------------------------------------------
    if (op === 'generateThumbnail') {
      const { prompt, referenceImage, userImage, aspectRatio } = payload ?? {};
      if (!prompt) return res.status(400).json({ error: 'Missing prompt' });

      const ar = normalizeAspectRatio(aspectRatio);
      const hasReference = !!referenceImage;
      const hasUser = !!userImage;
      const textOnly = !hasReference && !hasUser;

      // Build instruction aligned with Google’s examples (text first, then images). :contentReference[oaicite:4]{index=4}
      const instruction = buildInstruction({ prompt, hasReference, hasUser, ar, textOnly });

      const parts: any[] = [{ text: instruction }];

      if (hasReference) {
        const ref = parseDataUrl(referenceImage);
        if (!ref) return res.status(400).json({ error: 'Could not parse reference image data.' });
        parts.push({ inlineData: { mimeType: ref.mimeType, data: ref.dataB64 } });
      }
      if (hasUser) {
        const usr = parseDataUrl(userImage);
        if (!usr) return res.status(400).json({ error: 'Could not parse user image data.' });
        parts.push({ inlineData: { mimeType: usr.mimeType, data: usr.dataB64 } });
      }

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image-preview', // official “Nano Banana” usage in docs
        contents: parts,                          // text + image(s) order per docs
      });                                         // :contentReference[oaicite:5]{index=5}

      let imageB64: string | null = null;
      let replyText = 'OK';

      const cand = response.candidates?.[0];
      for (const p of cand?.content?.parts ?? []) {
        if ((p as any).inlineData) {
          imageB64 = (p as any).inlineData.data as string;
        } else if ((p as any).text) {
          replyText = (p as any).text as string;
        }
      }

      if (!imageB64) {
        return res.status(422).json({
          error: 'The model did not return an image. The prompt may have been blocked or produced text only.',
          debug: response,
        });
      }

      // (Recommended) force exact 1920x1080 PNG for thumbnails
      const normalized = await normalizeTo1920x1080PNG(imageB64);
      const dataUrl = `data:image/png;base64,${normalized}`;

      return res.status(200).json({
        imageUrl: dataUrl,
        responseText: replyText,
      });
    }

    // ---------------------------------------------------------------------
    // OP: editFaceImage — specific “edit only” flow with single user image
    // ---------------------------------------------------------------------
    if (op === 'editFaceImage') {
      const { base64Image, prompt } = payload ?? {};
      if (!base64Image || !prompt) {
        return res.status(400).json({ error: 'Missing base64Image or prompt' });
      }

      const parsed = parseDataUrl(base64Image);
      if (!parsed) return res.status(400).json({ error: 'Could not parse image data.' });

      const ar: '16:9' = '16:9';
      const instruction = `
You are an expert YouTube thumbnail editor.

HARD RULES:
- OUTPUT: Thumbnail in EXACT ${ar}. Extend canvas or crop safely as needed; never stretch the subject.
- EDIT SCOPE: Modify ONLY what the instruction asks. Preserve identity, skin tones, lighting and composition.

USER INSTRUCTION:
${prompt}
`.trim();

      const parts = [
        { text: instruction },
        { inlineData: { mimeType: parsed.mimeType, data: parsed.dataB64 } },
      ];

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image-preview',
        contents: parts,
      }); // per docs, no extra config fields. :contentReference[oaicite:6]{index=6}

      let imageB64: string | null = null;
      let replyText = 'Image edited successfully.';

      const cand = response.candidates?.[0];
      for (const p of cand?.content?.parts ?? []) {
        if ((p as any).inlineData) {
          imageB64 = (p as any).inlineData.data as string;
        } else if ((p as any).text) {
          replyText = (p as any).text as string;
        }
      }

      if (!imageB64) {
        return res.status(422).json({
          error: 'The model did not return an image. The prompt may have been blocked or produced text only.',
          debug: response,
        });
      }

      const normalized = await normalizeTo1920x1080PNG(imageB64);
      return res.status(200).json({
        imageUrl: `data:image/png;base64,${normalized}`,
        responseText: replyText,
      });
    }

    // ---------------------------------------------------------------------
    // OP: getSummaryFromTranscript (unchanged, standard Gemini text)
    // ---------------------------------------------------------------------
    if (op === 'getSummaryFromTranscript') {
      const { transcript } = payload ?? {};
      if (!transcript) return res.status(400).json({ error: 'Missing transcript' });

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash', // text model
        contents: `Summarize the following transcript. Provide a short "TL;DR", then key bullet points:\n\n${transcript}`,
      });

      const text = (response as any).text?.trim?.() ?? '';
      try {
        const parsed = JSON.parse(text);
        return res.status(200).json(parsed);
      } catch {
        return res.status(200).json({
          tldr: 'The model returned a response, but it was not valid JSON.',
          points: [text],
        });
      }
    }

    // ---------------------------------------------------------------------
    // OP: answerQuestionFromTranscript (unchanged, standard Gemini chat)
    // ---------------------------------------------------------------------
    if (op === 'answerQuestionFromTranscript') {
      const { transcript, question, history } = payload ?? {};
      if (!transcript || !question) return res.status(400).json({ error: 'Missing transcript/question' });

      const chat = ai.chats.create({
        model: 'gemini-2.5-flash',
        config: {
          systemInstruction:
            `Answer based ONLY on the provided transcript. Be concise.\n\nTRANSCRIPT:\n${transcript}`,
        },
      });

      if (Array.isArray(history) && history.length) {
        chat.history = history.map((m: any) => ({
          role: m.sender === 'user' ? 'user' : 'model',
          parts: [{ text: m.text }],
        }));
      }

      const response = await chat.sendMessage({ message: question });
      return res.status(200).json({ text: (response as any).text });
    }

    // ---------------------------------------------------------------------
    // OP: generateContentIdeas (unchanged, standard Gemini text)
    // ---------------------------------------------------------------------
    if (op === 'generateContentIdeas') {
      const { topic } = payload ?? {};
      if (!topic) return res.status(400).json({ error: 'Missing topic' });

      const strategistPrompt =
        `You are an expert YouTube content strategist. Based on the topic below, return JSON with:\n` +
        `- "titles": 5-7 click-worthy titles\n- "description": 2-3 paragraph SEO description\n- "keywords": 10-15 relevant keywords/hashtags\n\n` +
        `TOPIC: "${topic}"`;

      // Keep simple; if you need strict JSON schema, add response schema later.
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: strategistPrompt,
      });

      const text = (response as any).text?.trim?.() ?? '';
      try {
        return res.status(200).json(JSON.parse(text));
      } catch {
        return res.status(422).json({ error: 'Invalid JSON from model', raw: text });
      }
    }

    return res.status(400).json({ error: `Unknown op: ${op}` });
  } catch (err: any) {
    console.error(err);
    return res.status(500).json({ error: 'Server error', detail: err?.message });
  }
}
