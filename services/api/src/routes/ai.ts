import { Router, Request, Response } from 'express';
import { z } from 'zod';
import Anthropic from '@anthropic-ai/sdk';
import { db } from '../db';
import { guides, guideStops, users } from '../db/schema';
import { eq, asc } from 'drizzle-orm';
import { authenticate, requireRole } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { AppError } from '../middleware/errorHandler';
import { config } from '../config';
import rateLimit from 'express-rate-limit';

const router = Router();

const anthropic = new Anthropic({ apiKey: config.ANTHROPIC_API_KEY });

const aiRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: config.AI_RATE_LIMIT_PER_HOUR,
  message: { error: 'AI generation rate limit exceeded. Try again later.' },
  keyGenerator: (req) => req.user?.userId || req.ip,
  handler: (req, res) => res.status(429).json({ error: 'AI generation rate limit exceeded. Try again later.' }),
  skip: () => false,
});

const generateDescriptionsSchema = z.object({
  city: z.string().min(1).max(100),
  category: z.enum(['food', 'architecture', 'history', 'art', 'nature', 'characters', 'general']),
  stops: z.array(z.object({ name: z.string().min(1).max(200) })).min(1).max(20),
});

router.post('/generate-descriptions', authenticate, aiRateLimit, validateBody(generateDescriptionsSchema), async (req: Request, res: Response) => {
  const { city, category, stops } = req.body;
  const userId = req.user!.userId;

  const userRows = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!userRows.length) throw AppError.notFound('User not found');

  const stopNames = stops.map((s: any) => s.name).join('\n');

  try {
    const response = await anthropic.messages.create({
      model: config.ANTHROPIC_MODEL,
      max_tokens: 1000,
      messages: [{
        role: 'user',
        content: `You are a brilliant travel writer specialising in ${category.toLowerCase()} curiosities.
For each stop, write ONE fascinating sentence (max 20 words) — a surprising fact, hidden story, or sensory detail a curious traveller would love to discover and remember.

City: ${city}
Category: ${category}
Stops:
${stopNames}

Respond ONLY with valid JSON, no markdown:
{"stops":[{"name":"exact stop name","desc":"one sentence"}]}`,
      }],
    });

    const content = response.content[0].type === 'text' ? response.content[0].text : '';
    const parsed = JSON.parse(content.replace(/```json|```/g, '').trim());
    if (parsed && typeof parsed === 'object') {
      delete (parsed as any).__proto__;
      delete (parsed as any).constructor;
    }

    if (!parsed.stops || !Array.isArray(parsed.stops)) throw new Error('Invalid AI response format');
    res.json({ stops: parsed.stops });
  } catch (err) {
    console.error('AI generation error:', err);
    throw AppError.internal('Failed to generate descriptions');
  }
});

const translateSchema = z.object({
  guideId: z.string().uuid(),
  targetLanguage: z.enum(['en', 'it', 'es', 'fr', 'de', 'ja', 'ko', 'zh']),
});

const formatDescriptionSchema = z.object({
  rawText: z.string().min(1).max(5000),
  city: z.string().min(1).max(100),
  category: z.string().min(1).max(50),
});

router.post('/format-description', authenticate, aiRateLimit, validateBody(formatDescriptionSchema), async (req: Request, res: Response) => {
  const { rawText, city, category } = req.body;

  try {
    const response = await anthropic.messages.create({
      model: config.ANTHROPIC_MODEL,
      max_tokens: 500,
      messages: [{
        role: 'user',
        content: `You are a travel guide editor. Take this raw text and format it into a compelling, concise teaser description for a ${category} walking guide in ${city}. Keep it under 150 words. Make it engaging, vivid, and inviting for curious travellers. Remove any irrelevant content. Return ONLY the formatted text, no JSON, no markdown.

Raw text:
${rawText}`,
      }],
    });

    const content = response.content[0].type === 'text' ? response.content[0].text : '';
    res.json({ description: content.trim() });
  } catch (err) {
    console.error('AI format error:', err);
    throw AppError.internal('Failed to format description');
  }
});

router.post('/translate', authenticate, requireRole('creator', 'admin'), aiRateLimit, validateBody(translateSchema), async (req: Request, res: Response) => {
  const { guideId, targetLanguage } = req.body;

  const guideRows = await db.select().from(guides).where(eq(guides.id, guideId)).limit(1);
  if (!guideRows.length) throw AppError.notFound('Guide not found');
  const guide: any = guideRows[0];

  if (guide.creatorId !== req.user!.userId && req.user!.role !== 'admin') throw AppError.forbidden('Not authorized to translate this guide');

  // Fetch stops from guide_stops table (not from guide object)
  const stops = await db.select().from(guideStops).where(eq(guideStops.guideId, guideId)).orderBy(asc(guideStops.stopOrder));

  const languageNames: Record<string, string> = { en: 'English', it: 'Italian', es: 'Spanish', fr: 'French', de: 'German', ja: 'Japanese', ko: 'Korean', zh: 'Chinese' };

  try {
    const response = await anthropic.messages.create({
      model: config.ANTHROPIC_MODEL,
      max_tokens: 2000,
      messages: [{
        role: 'user',
        content: `Translate this guide to ${languageNames[targetLanguage]}. Keep the tone engaging and natural. Return ONLY valid JSON:
{
  "title": "translated title",
  "description": "translated description",
  "stops": [
    {"name": "stop 1 name", "desc": "stop 1 description"},
    {"name": "stop 2 name", "desc": "stop 2 description"}
  ]
}

Guide:
Title: ${guide.title}
Description: ${guide.description}
Stops: ${JSON.stringify(stops.map((s: any) => ({ name: s.name, description: s.description })))}`,
      }],
    });

    const content = response.content[0].type === 'text' ? response.content[0].text : '';
    const parsed = JSON.parse(content.replace(/```json|```/g, '').trim());
    if (parsed && typeof parsed === 'object') {
      delete (parsed as any).__proto__;
      delete (parsed as any).constructor;
    }
    res.json({ translation: parsed });
  } catch (err) {
    console.error('Translation error:', err);
    throw AppError.internal('Failed to translate guide');
  }
});

export { router as aiRouter };