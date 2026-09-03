import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { db } from '../db';
import { geocodeCache } from '../db/schema';
import { eq, and, gt } from 'drizzle-orm';
import { validateBody } from '../middleware/validate';
import { AppError } from '../middleware/errorHandler';
import { config } from '../config';

import rateLimit from 'express-rate-limit';

const router = Router();

const geocodeRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { error: 'Geocoding rate limit exceeded. Try again later.' },
  keyGenerator: (req) => req.user?.userId || req.ip || 'unknown',
});

const geocodeSchema = z.object({
  query: z.string().min(1).max(200),
  city: z.string().max(100).optional(),
});

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
const NOMINATIM_REVERSE_URL = 'https://nominatim.openstreetmap.org/reverse';
const CACHE_TTL_DAYS = config.GEOCODING_CACHE_TTL_DAYS;

async function geocodeWithNominatim(query: string): Promise<{ latitude: string; longitude: string } | null> {
  const params = new URLSearchParams({
    q: query,
    format: 'json',
    limit: '1',
    addressdetails: '1',
  });

  const response = await fetch(`${NOMINATIM_URL}?${params}`, {
    headers: {
      'User-Agent': `CurioCity/1.0 (${config.NOMINATIM_EMAIL || 'curiocity@example.com'})`,
    },
  });

  if (!response.ok) return null;
  const data = await response.json();
  if (data.length === 0) return null;

  return { latitude: data[0].lat, longitude: data[0].lon };
}

async function geocodeWithGoogle(query: string): Promise<{ latitude: string; longitude: string } | null> {
  if (!config.GOOGLE_GEOCODING_API_KEY) return null;

  const params = new URLSearchParams({
    address: query,
    key: config.GOOGLE_GEOCODING_API_KEY,
  });

  const response = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?${params}`);
  if (!response.ok) return null;

  const data = await response.json();
  if (data.status !== 'OK' || data.results.length === 0) return null;

  const location = data.results[0].geometry.location;
  return { latitude: location.lat.toString(), longitude: location.lng.toString() };
}

router.post('/', geocodeRateLimit, validateBody(geocodeSchema), async (req: Request, res: Response) => {
  const { query, city } = req.body;
  const fullQuery = city ? `${query}, ${city}` : query;
  const cacheKey = fullQuery.toLowerCase().trim();

  const cached = await db.select().from(geocodeCache).where(and(eq(geocodeCache.query, cacheKey), gt(geocodeCache.expiresAt, new Date()))).limit(1);
  if (cached.length > 0) {
    return res.json({ latitude: cached[0].latitude, longitude: cached[0].longitude, cached: true });
  }

  let result: { latitude: string; longitude: string } | null = null;

  if (config.GEOCODING_PROVIDER === 'google' && config.GOOGLE_GEOCODING_API_KEY) {
    result = await geocodeWithGoogle(fullQuery);
  }

  if (!result) {
    result = await geocodeWithNominatim(fullQuery);
  }

  if (!result) {
    throw AppError.notFound('Location not found');
  }

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + CACHE_TTL_DAYS);

  await db.insert(geocodeCache).values({
    id: crypto.randomUUID(),
    query: cacheKey,
    latitude: result.latitude,
    longitude: result.longitude,
    provider: config.GEOCODING_PROVIDER,
    expiresAt,
  }).onConflictDoUpdate({
    target: geocodeCache.query,
    set: { latitude: result.latitude, longitude: result.longitude, provider: config.GEOCODING_PROVIDER, expiresAt },
  });

  res.json({ ...result, cached: false });
});

const reverseGeocodeSchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
});

router.get('/reverse', geocodeRateLimit, async (req: Request, res: Response) => {
  const { lat, lng } = req.query as any;
  if (lat == null || lng == null) throw AppError.badRequest('lat and lng are required');

  try {
    const response = await fetch(`${NOMINATIM_REVERSE_URL}?format=json&lat=${lat}&lon=${lng}&zoom=10`, {
      headers: {
        'User-Agent': `CurioCity/1.0 (${config.NOMINATIM_EMAIL || 'curiocity@example.com'})`,
      },
    });
    if (!response.ok) return res.json({ city: null, country: null });
    const data = await response.json();
    const addr = data.address || {};
    res.json({
      city: addr.city || addr.town || addr.village || null,
      country: addr.country || null,
    });
  } catch {
    res.json({ city: null, country: null });
  }
});

export { router as geocodeRouter };