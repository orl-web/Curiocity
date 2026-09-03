import { config } from '../config';
import { db } from '../db';
import { geocodeCache } from '../db/schema';
import { eq, and, gt } from 'drizzle-orm';

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
const CACHE_TTL_DAYS = config.GEOCODING_CACHE_TTL_DAYS;

export async function geocodeAddress(query: string): Promise<{ latitude: string; longitude: string } | null> {
  const cacheKey = query.toLowerCase().trim();

  const cached = await db.select().from(geocodeCache).where(and(eq(geocodeCache.query, cacheKey), gt(geocodeCache.expiresAt, new Date()))).limit(1);
  if (cached.length > 0) return { latitude: cached[0].latitude, longitude: cached[0].longitude };

  let result: { latitude: string; longitude: string } | null = null;

  if (config.GEOCODING_PROVIDER === 'google' && config.GOOGLE_GEOCODING_API_KEY) {
    result = await geocodeWithGoogle(query);
  }
  if (!result) result = await geocodeWithNominatim(query);

  if (result) {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + CACHE_TTL_DAYS);
    await db.insert(geocodeCache).values({ id: crypto.randomUUID(), query: cacheKey, latitude: result.latitude, longitude: result.longitude, provider: config.GEOCODING_PROVIDER, expiresAt }).onConflictDoUpdate({ target: geocodeCache.query, set: { latitude: result.latitude, longitude: result.longitude, provider: config.GEOCODING_PROVIDER, expiresAt } });
  }

  return result;
}

async function geocodeWithNominatim(query: string): Promise<{ latitude: string; longitude: string } | null> {
  const params = new URLSearchParams({ q: query, format: 'json', limit: '1', addressdetails: '1' });
  const response = await fetch(`${NOMINATIM_URL}?${params}`, { headers: { 'User-Agent': `CurioCity/1.0 (${config.NOMINATIM_EMAIL || 'curiocity@example.com'})` } });
  if (!response.ok) return null;
  const data = await response.json();
  if (!data.length) return null;
  return { latitude: data[0].lat, longitude: data[0].lon };
}

async function geocodeWithGoogle(query: string): Promise<{ latitude: string; longitude: string } | null> {
  if (!config.GOOGLE_GEOCODING_API_KEY) return null;
  const params = new URLSearchParams({ address: query, key: config.GOOGLE_GEOCODING_API_KEY });
  const response = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?${params}`);
  if (!response.ok) return null;
  const data = await response.json();
  if (data.status !== 'OK' || !data.results.length) return null;
  const loc = data.results[0].geometry.location;
  return { latitude: loc.lat.toString(), longitude: loc.lng.toString() };
}