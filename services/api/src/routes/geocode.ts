import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { db } from '../db';
import { geocodeCache } from '../db/schema';
import { eq, and, gt } from 'drizzle-orm';
import { validateBody } from '../middleware/validate';
import { AppError } from '../middleware/errorHandler';
import { config } from '../config';
import { parseGoogleMapsUrl, isGoogleMapsHost, isShortGoogleLink, type ParsedRouteStop } from '../utils/googleMapsRoute';

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
  const result = await geocodeWithCache(fullQuery, config.GEOCODING_PROVIDER);
  if (!result) {
    throw AppError.notFound('Location not found');
  }
  res.json({ ...result, cached: result.cached === true });
});

// Cache-first lookup shared by the single and batch (route) endpoints.
async function geocodeWithCache(fullQuery: string, provider: string): Promise<{ latitude: string; longitude: string; cached?: boolean } | null> {
  const cacheKey = fullQuery.toLowerCase().trim();

  const cached = await db.select().from(geocodeCache).where(and(eq(geocodeCache.query, cacheKey), gt(geocodeCache.expiresAt, new Date()))).limit(1);
  if (cached.length > 0) {
    return { latitude: cached[0].latitude, longitude: cached[0].longitude, cached: true };
  }

  let result: { latitude: string; longitude: string } | null = null;

  if (provider === 'google' && config.GOOGLE_GEOCODING_API_KEY) {
    result = await geocodeWithGoogle(fullQuery);
  }

  if (!result) {
    result = await geocodeWithNominatim(fullQuery);
  }

  if (!result) {
    return null;
  }

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + CACHE_TTL_DAYS);

  await db.insert(geocodeCache).values({
    id: crypto.randomUUID(),
    query: cacheKey,
    latitude: result.latitude,
    longitude: result.longitude,
    provider,
    expiresAt,
  }).onConflictDoUpdate({
    target: geocodeCache.query,
    set: { latitude: result.latitude, longitude: result.longitude, provider, expiresAt },
  });

  return { ...result, cached: false };
}

// Resolve a short link (maps.app.goo.gl / goo.gl) to its final URL.
// Manual redirect following keeps us from fetching arbitrary hosts (SSRF).
const SHORT_LINK_HOSTS = new Set(['maps.app.goo.gl', 'goo.gl', 'maps.google.com', 'www.google.com']);

async function resolveShortLink(rawUrl: string): Promise<string | null> {
  let current = rawUrl.trim();
  for (let hop = 0; hop < 5; hop++) {
    let host: string;
    try {
      host = new URL(current).hostname.toLowerCase();
    } catch {
      return null;
    }
    if (!SHORT_LINK_HOSTS.has(host) && !/^(maps\.)?google\./.test(host)) return null;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    try {
      const response = await fetch(current, { redirect: 'manual', signal: controller.signal });
      clearTimeout(timer);
      const location = response.headers.get('location');
      response.body?.cancel().catch(() => {});
      if (!location) return current; // No redirect — this is the final URL
      current = new URL(location, current).toString();
    } catch {
      clearTimeout(timer);
      return null;
    }
  }
  return null;
}

// Import a route from a Google Maps link: parse the stops, geocode any that
// are place names, return the ordered list.
const routeImportSchema = z.object({
  url: z.string().min(10).max(2000),
});

const routeImportRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many route imports. Try again later.' },
  keyGenerator: (req) => req.user?.userId || req.ip || 'unknown',
});

const MAX_ROUTE_STOPS = 20;
// Nominatim's usage policy asks for ~1 request/second.
const GEOCODE_DELAY_MS = 1100;

router.post('/route', routeImportRateLimit, validateBody(routeImportSchema), async (req: Request, res: Response) => {
  const { url } = req.body as { url: string };

  if (!isGoogleMapsHost(url)) {
    throw AppError.badRequest('Please paste a Google Maps link');
  }

  let parseTarget = url.trim();
  if (isShortGoogleLink(parseTarget)) {
    const resolved = await resolveShortLink(parseTarget);
    if (!resolved) {
      throw AppError.badRequest('Could not resolve the short link. Try copying the full link from Google Maps.');
    }
    parseTarget = resolved;
  }

  let stops = parseGoogleMapsUrl(parseTarget);
  if (stops.length === 0) {
    throw AppError.badRequest('No stops found in the link. Use a directions link with at least origin and destination.');
  }

  const truncated = stops.length > MAX_ROUTE_STOPS;
  if (truncated) stops = stops.slice(0, MAX_ROUTE_STOPS);

  const failed: string[] = [];
  let geocoded = 0;
  let madeNetworkCall = false;

  for (let i = 0; i < stops.length; i++) {
    const stop = stops[i];
    if (stop.latitude != null && stop.longitude != null) continue;
    // Space out uncached lookups to respect the provider's rate policy.
    if (madeNetworkCall) await new Promise((resolve) => setTimeout(resolve, GEOCODE_DELAY_MS));
    const result = await geocodeWithCache(stop.name, config.GEOCODING_PROVIDER);
    madeNetworkCall = true;
    if (result) {
      stop.latitude = parseFloat(result.latitude);
      stop.longitude = parseFloat(result.longitude);
      if (!result.cached) geocoded++;
    } else {
      failed.push(stop.name);
    }
  }

  res.json({ stops, truncated, geocoded, failed });
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