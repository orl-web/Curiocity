import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../db';
import { guides, guideStops, guideCosts, guideNearby, guideResources, guideDrafts, guideVersions, userSavedGuides, users } from '../db/schema';
import { eq, and, desc, asc, like, or, inArray, sql, count } from 'drizzle-orm';
import { authenticate, optionalAuth } from '../middleware/auth';
import { validateBody, validateQuery, validateParams } from '../middleware/validate';
import { AppError } from '../middleware/errorHandler';
import { config } from '../config';
import { geocodeAddress } from '../utils/geocode';

const router = Router();

const sanitizeXml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

const categorySchema = z.enum(['food', 'architecture', 'history', 'art', 'nature', 'characters', 'general']);
const priceModelSchema = z.enum(['free', 'paid', 'ad']);

const createGuideSchema = z.object({
  title: z.string().min(1).max(200), city: z.string().min(1).max(100), category: categorySchema,
  duration: z.string().max(20).optional(), distance: z.string().max(20).optional(),
  priceModel: priceModelSchema.default('free'), description: z.string().optional(),
  stops: z.array(z.object({ name: z.string().min(1).max(200), description: z.string().optional(), photoUrl: z.string().url().optional().or(z.literal('')), videoUrl: z.string().url().optional().or(z.literal('')), customAudioUrl: z.string().url().optional().or(z.literal('')), links: z.array(z.object({ title: z.string(), url: z.string().url() })).default([]) })).min(2).max(20),
  costs: z.object({ tickets: z.number().optional(), meals: z.number().optional(), transport: z.number().optional() }).optional(),
  nearby: z.array(z.object({ direction: z.string(), name: z.string(), distance: z.string() })).optional(),
  resources: z.array(z.object({ icon: z.string(), title: z.string(), url: z.string().url() })).optional(),
});

const updateGuideSchema = createGuideSchema.partial();

const querySchema = z.object({ category: categorySchema.optional(), city: z.string().optional(), priceModel: priceModelSchema.optional(), search: z.string().optional(), creatorId: z.string().uuid().optional(), savedBy: z.string().uuid().optional(), createdBy: z.string().uuid().optional(), limit: z.coerce.number().min(1).max(50).default(20), offset: z.coerce.number().min(0).default(0), sort: z.enum(['newest', 'popular', 'rating', 'title']).default('newest'), lat: z.coerce.number().min(-90).max(90).optional(), lng: z.coerce.number().min(-180).max(180).optional(), radius: z.coerce.number().min(1).max(500).default(10).optional() });

const idParamSchema = z.object({ id: z.string().uuid() });
const saveDraftSchema = z.object({ title: z.string().max(200).optional(), city: z.string().max(100).optional(), category: categorySchema.optional(), duration: z.string().max(20).optional(), distance: z.string().max(20).optional(), priceModel: priceModelSchema.default('free'), description: z.string().optional(), stops: z.array(z.object({ name: z.string().max(200), description: z.string().optional(), photoUrl: z.string().optional(), videoUrl: z.string().optional(), links: z.array(z.object({ title: z.string(), url: z.string().url() })).default([]) })).default([]), costs: z.object({ tickets: z.number().optional(), meals: z.number().optional(), transport: z.number().optional() }).optional() });

router.get('/', validateQuery(querySchema), optionalAuth, async (req: Request, res: Response) => {
  const { category, city, priceModel, search, creatorId, savedBy, createdBy, limit, offset, sort, lat, lng, radius } = req.query as any;
  const userId = req.user?.userId;

  const hasLocation = lat != null && lng != null;
  const haversineExpr = hasLocation ? sql<number>`round((SELECT min(6371 * acos(cos(radians(${lat})) * cos(radians(gs.latitude)) * cos(radians(gs.longitude) - radians(${lng})) + sin(radians(${lat})) * sin(radians(gs.latitude)))) from guide_stops gs where gs.guide_id = guides.id and gs.latitude is not null and gs.longitude is not null), 2)` : sql<number>`null`;
  const selectFields: any = { id: guides.id, title: guides.title, city: guides.city, category: guides.category, creatorId: guides.creatorId, creatorInitials: guides.creatorInitials, creatorColor: guides.creatorColor, verified: guides.verified, duration: guides.duration, distance: guides.distance, priceModel: guides.priceModel, rating: guides.rating, description: guides.description, coverImageUrl: guides.coverImageUrl, isPublished: guides.isPublished, createdAt: guides.createdAt, creator: { id: users.id, displayName: users.displayName, initials: users.initials, avatarUrl: users.avatarUrl } };
  if (hasLocation) selectFields.distance_km = haversineExpr;
  let baseQuery: any = db.select(selectFields).from(guides).leftJoin(users, eq(guides.creatorId, users.id));

  // Build all WHERE conditions and apply them together with AND
  const conditions: any[] = [eq(guides.isPublished, true)];
  if (category) conditions.push(eq(guides.category, category));
  if (city) conditions.push(eq(guides.city, city));
  if (priceModel) conditions.push(eq(guides.priceModel, priceModel));
  if (creatorId) conditions.push(eq(guides.creatorId, creatorId));
  if (createdBy) conditions.push(eq(guides.creatorId, createdBy));
  if (search) { const term = `%${search}%`; conditions.push(or(like(guides.title, term), like(guides.city, term), like(guides.description, term), like(users.displayName, term))); }
  if (hasLocation) {
    const radiusKm = radius || 10;
    conditions.push(sql`(SELECT min(6371 * acos(cos(radians(${lat})) * cos(radians(gs.latitude)) * cos(radians(gs.longitude) - radians(${lng})) + sin(radians(${lat})) * sin(radians(gs.latitude)))) from guide_stops gs where gs.guide_id = guides.id and gs.latitude is not null and gs.longitude is not null) <= ${radiusKm}`);
  }

  baseQuery = baseQuery.where(and(...conditions));

  let total = 0;
  if (savedBy && userId) {
    const savedGuideIds = await db.select({ guideId: userSavedGuides.guideId }).from(userSavedGuides).where(eq(userSavedGuides.userId, savedBy));
    const ids = savedGuideIds.map(s => s.guideId);
    if (ids.length > 0) baseQuery = baseQuery.where(inArray(guides.id, ids)); else return res.json({ guides: [], total: 0 });
  } else if (savedBy && !userId) {
    throw AppError.unauthorized('Login to filter by saved guides');
  }

  const totalResult = await db.select({ count: sql<number>`count(*)` }).from(baseQuery.as('subq'));
  total = Number(totalResult[0]?.count) || 0;

  if (hasLocation) {
    baseQuery = baseQuery.orderBy(sql`(SELECT min(6371 * acos(cos(radians(${lat})) * cos(radians(gs.latitude)) * cos(radians(gs.longitude) - radians(${lng})) + sin(radians(${lat})) * sin(radians(gs.latitude)))) from guide_stops gs where gs.guide_id = guides.id and gs.latitude is not null and gs.longitude is not null)`);
  } else {
    switch (sort) { case 'popular': case 'rating': baseQuery = baseQuery.orderBy(desc(guides.rating)); break; case 'title': baseQuery = baseQuery.orderBy(asc(guides.title)); break; default: baseQuery = baseQuery.orderBy(desc(guides.createdAt)); }
  }

  const results = await baseQuery.limit(limit).offset(offset);

  const guideIds = results.map((g: any) => g.id);
  const stopsCount = guideIds.length > 0 ? await db.select({ guideId: guideStops.guideId, count: sql<number>`count(*)` }).from(guideStops).where(inArray(guideStops.guideId, guideIds)).groupBy(guideStops.guideId) : [];
  const stopsMap = new Map(stopsCount.map((s: any) => [s.guideId, s.count]));

  let stopsByGuide = new Map<string, any[]>();
  if (guideIds.length > 0) {
    const allStops = await db.select({ guideId: guideStops.guideId, id: guideStops.id, name: guideStops.name, description: guideStops.description, latitude: guideStops.latitude, longitude: guideStops.longitude, stopOrder: guideStops.stopOrder }).from(guideStops).where(inArray(guideStops.guideId, guideIds)).orderBy(asc(guideStops.stopOrder));
    for (const s of allStops) {
      if (!stopsByGuide.has(s.guideId)) stopsByGuide.set(s.guideId, []);
      stopsByGuide.get(s.guideId)!.push(s);
    }
  }

  let savedSet = new Set<string>();
  if (userId && guideIds.length > 0) { const saved = await db.select({ guideId: userSavedGuides.guideId }).from(userSavedGuides).where(and(inArray(userSavedGuides.guideId, guideIds), eq(userSavedGuides.userId, userId))); savedSet = new Set(saved.map((s: any) => s.guideId)); }

  const guidesWithMeta = results.map((g: any) => ({ ...g, stopsCount: stopsMap.get(g.id) || 0, isSaved: savedSet.has(g.id), stops: stopsByGuide.get(g.id) || [] }));
  res.json({ guides: guidesWithMeta, total, limit, offset });
});

router.get('/draft/current', authenticate, async (req: Request, res: Response) => { const draft = await db.select().from(guideDrafts).where(eq(guideDrafts.userId, req.user!.userId)).limit(1); res.json(draft[0] || null); });

router.post('/draft', authenticate, validateBody(saveDraftSchema), async (req: Request, res: Response) => { const userId = req.user!.userId; const data = req.body; const existing = await db.select().from(guideDrafts).where(eq(guideDrafts.userId, userId)).limit(1); if (existing.length > 0) await db.update(guideDrafts).set({ ...data, updatedAt: new Date() }).where(eq(guideDrafts.userId, userId)); else await db.insert(guideDrafts).values({ id: uuidv4(), userId, ...data }); res.json({ message: 'Draft saved' }); });

router.delete('/draft', authenticate, async (req: Request, res: Response) => { await db.delete(guideDrafts).where(eq(guideDrafts.userId, req.user!.userId)); res.json({ message: 'Draft cleared' }); });

router.get('/:id', validateParams(idParamSchema), optionalAuth, async (req: Request, res: Response) => {
  const { id } = req.params; const userId = req.user?.userId;

  const guideRows = await db.select({ guide: guides, creator: users }).from(guides).leftJoin(users, eq(guides.creatorId, users.id)).where(eq(guides.id, id)).limit(1);
  if (!guideRows.length) throw AppError.notFound('Guide not found');
  const { guide, creator } = guideRows[0];
  if (!guide.isPublished && guide.creatorId !== userId && req.user?.role !== 'admin') throw AppError.notFound('Guide not found');

  const stops = await db.select().from(guideStops).where(eq(guideStops.guideId, id)).orderBy(asc(guideStops.stopOrder));
  const costs = await db.select().from(guideCosts).where(eq(guideCosts.guideId, id));
  const nearby = await db.select().from(guideNearby).where(eq(guideNearby.guideId, id));
  const resources = await db.select().from(guideResources).where(eq(guideResources.guideId, id));

  let isSaved = false;
  if (userId) { const saved = await db.select().from(userSavedGuides).where(and(eq(userSavedGuides.userId, userId), eq(userSavedGuides.guideId, id))).limit(1); isSaved = saved.length > 0; }

  res.json({ ...guide, creator: creator ? { id: creator.id, displayName: creator.displayName, initials: creator.initials, avatarUrl: creator.avatarUrl, bio: creator.bio, location: creator.location, role: creator.role, verified: guide.verified } : null, stops, costs, nearby, resources, isSaved, isOwner: guide.creatorId === userId });
});

router.post('/', authenticate, validateBody(createGuideSchema), async (req: Request, res: Response) => {
  const userId = req.user!.userId; const data = req.body;
  const userRows = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!userRows.length) throw AppError.notFound('User not found');
  const user = userRows[0];

  const guideId = uuidv4(); const now = new Date();

  await db.transaction(async (tx) => {
    await tx.insert(guides).values({ id: guideId, title: data.title, city: data.city, category: data.category, creatorId: userId, creatorInitials: user.initials, creatorColor: user.role === 'creator' ? '#1D9E75' : '#888780', verified: user.role === 'creator' || user.role === 'admin', duration: data.duration, distance: data.distance, priceModel: data.priceModel, description: data.description, isPublished: true, publishedAt: now });
    for (let i = 0; i < data.stops.length; i++) {
      const stop = data.stops[i];
      let lat = stop.latitude, lng = stop.longitude;
      if ((!lat && !lng) && stop.name && data.city) { const geocoded = await geocodeAddress(`${stop.name}, ${data.city}`); if (geocoded) { lat = geocoded.latitude; lng = geocoded.longitude; } }
      await tx.insert(guideStops).values({ id: uuidv4(), guideId, stopOrder: i, name: stop.name, description: stop.description, latitude: lat, longitude: lng, photoUrl: stop.photoUrl, videoUrl: stop.videoUrl, customAudioUrl: stop.customAudioUrl, links: stop.links });
    }
    if (data.costs) { if (data.costs.tickets) await tx.insert(guideCosts).values({ id: uuidv4(), guideId, type: 'tickets', name: 'Tickets', price: data.costs.tickets.toString() }); if (data.costs.meals) await tx.insert(guideCosts).values({ id: uuidv4(), guideId, type: 'meals', name: 'Meals', price: data.costs.meals.toString() }); if (data.costs.transport) await tx.insert(guideCosts).values({ id: uuidv4(), guideId, type: 'transport', name: 'Transport', price: data.costs.transport.toString() }); }
    if (data.nearby) for (const n of data.nearby) await tx.insert(guideNearby).values({ id: uuidv4(), guideId, direction: n.direction, name: n.name, distance: n.distance });
    if (data.resources) for (const r of data.resources) await tx.insert(guideResources).values({ id: uuidv4(), guideId, icon: r.icon, title: r.title, url: r.url });
    await tx.delete(guideDrafts).where(eq(guideDrafts.userId, userId));
  });

  res.status(201).json({ id: guideId, message: 'Guide published' });
});

router.patch('/:id', authenticate, validateParams(idParamSchema), validateBody(updateGuideSchema), async (req: Request, res: Response) => {
  const { id } = req.params; const userId = req.user!.userId; const data = req.body;
  const guideRows = await db.select().from(guides).where(eq(guides.id, id)).limit(1);
  if (!guideRows.length) throw AppError.notFound('Guide not found');
  if (guideRows[0].creatorId !== userId && req.user!.role !== 'admin') throw AppError.forbidden('Not authorized to edit this guide');

  // Save version before update
  const currentStops = await db.select().from(guideStops).where(eq(guideStops.guideId, id)).orderBy(asc(guideStops.stopOrder));
  const versionCount = await db.select({ cnt: count() }).from(guideVersions).where(eq(guideVersions.guideId, id));
  const nextVersion = (versionCount[0]?.cnt ?? 0) + 1;
  await db.insert(guideVersions).values({
    id: uuidv4(), guideId: id, version: nextVersion,
    title: guideRows[0].title, description: guideRows[0].description, category: guideRows[0].category,
    city: guideRows[0].city, duration: guideRows[0].duration, priceModel: guideRows[0].priceModel,
    price: guideRows[0].price, coverImageUrl: guideRows[0].coverImageUrl,
    stopsSnapshot: currentStops.map((s) => ({ name: s.name, description: s.description, latitude: s.latitude, longitude: s.longitude, photoUrl: s.photoUrl, videoUrl: s.videoUrl, customAudioUrl: s.customAudioUrl, links: s.links })),
    changeNote: (req.body as any).changeNote || null,
  });

  const { stops, costs, nearby, resources, ...guideData } = data;
  await db.update(guides).set({ ...guideData, updatedAt: new Date() }).where(eq(guides.id, id));

  if (stops) { await db.delete(guideStops).where(eq(guideStops.guideId, id)); for (let i = 0; i < stops.length; i++) { const stop = stops[i]; await db.insert(guideStops).values({ id: uuidv4(), guideId: id, stopOrder: i, name: stop.name, description: stop.description, photoUrl: stop.photoUrl, videoUrl: stop.videoUrl, customAudioUrl: stop.customAudioUrl, links: stop.links }); } }
  if (costs) { await db.delete(guideCosts).where(eq(guideCosts.guideId, id)); if (costs.tickets) await db.insert(guideCosts).values({ id: uuidv4(), guideId: id, type: 'tickets', name: 'Tickets', price: costs.tickets.toString() }); if (costs.meals) await db.insert(guideCosts).values({ id: uuidv4(), guideId: id, type: 'meals', name: 'Meals', price: costs.meals.toString() }); if (costs.transport) await db.insert(guideCosts).values({ id: uuidv4(), guideId: id, type: 'transport', name: 'Transport', price: costs.transport.toString() }); }
  if (nearby) { await db.delete(guideNearby).where(eq(guideNearby.guideId, id)); for (const n of nearby) await db.insert(guideNearby).values({ id: uuidv4(), guideId: id, direction: n.direction, name: n.name, distance: n.distance }); }
  if (resources) { await db.delete(guideResources).where(eq(guideResources.guideId, id)); for (const r of resources) await db.insert(guideResources).values({ id: uuidv4(), guideId: id, icon: r.icon, title: r.title, url: r.url }); }

  res.json({ message: 'Guide updated', version: nextVersion });
});

router.delete('/:id', authenticate, validateParams(idParamSchema), async (req: Request, res: Response) => {
  const { id } = req.params; const userId = req.user!.userId;
  const guideRows = await db.select().from(guides).where(eq(guides.id, id)).limit(1);
  if (!guideRows.length) throw AppError.notFound('Guide not found');
  if (guideRows[0].creatorId !== userId && req.user!.role !== 'admin') throw AppError.forbidden('Not authorized to delete this guide');
  await db.delete(guides).where(eq(guides.id, id));
  res.json({ message: 'Guide deleted' });
});

router.get('/:id/export', validateParams(idParamSchema), async (req: Request, res: Response) => {
  const { id } = req.params;
  const format = (req.query.format as string) || 'json';

  const guideRows = await db.select({ guide: guides, creator: users }).from(guides).leftJoin(users, eq(guides.creatorId, users.id)).where(eq(guides.id, id)).limit(1);
  if (!guideRows.length) throw AppError.notFound('Guide not found');
  const { guide, creator } = guideRows[0];
  if (!guide.isPublished) throw AppError.notFound('Guide not found');

  const stops = await db.select().from(guideStops).where(eq(guideStops.guideId, id)).orderBy(asc(guideStops.stopOrder));
  const costs = await db.select().from(guideCosts).where(eq(guideCosts.guideId, id));

  const data = {
    title: guide.title, city: guide.city, description: guide.description, category: guide.category,
    duration: guide.duration, distance: guide.distance, creator: creator?.displayName || 'Unknown',
    stops: stops.map((s) => ({ name: s.name, description: s.description, latitude: s.latitude, longitude: s.longitude })),
    costs: costs.map((c) => ({ type: c.type, name: c.name, price: c.price })),
    exportedAt: new Date().toISOString(), source: 'CurioCity',
  };

  if (format === 'gpx') {
    const waypoints = stops.filter((s) => s.latitude && s.longitude).map((s) => `    <wpt lat="${s.latitude}" lon="${s.longitude}"><name>${sanitizeXml(s.name)}</name></wpt>`).join('\n');
    const trkpts = stops.filter((s) => s.latitude && s.longitude).map((s) => `      <trkpt lat="${s.latitude}" lon="${s.longitude}"><name>${sanitizeXml(s.name)}</name></trkpt>`).join('\n');
    const gpx = `<?xml version="1.0"?><gpx version="1.1" creator="CurioCity" xmlns="http://www.topografix.com/GPX/1/1"><metadata><name>${sanitizeXml(guide.title)}</name></metadata>\n${waypoints}\n  <trk><name>${sanitizeXml(guide.title)}</name><trkseg>\n${trkpts}\n    </trkseg></trk></gpx>`;
    res.setHeader('Content-Type', 'application/gpx+xml');
    res.setHeader('Content-Disposition', `attachment; filename="${guide.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.gpx"`);
    return res.send(gpx);
  }

  if (format === 'kml') {
    const placemarks = stops.filter((s) => s.latitude && s.longitude).map((s) => `      <Placemark><name>${sanitizeXml(s.name)}</name><Point><coordinates>${s.longitude},${s.latitude},0</coordinates></Point></Placemark>`).join('\n');
    const coords = stops.filter((s) => s.latitude && s.longitude).map((s) => `${s.longitude},${s.latitude},0`).join(' ');
    const kml = `<?xml version="1.0"?><kml xmlns="http://www.opengis.net/kml/2.2"><Document><name>${sanitizeXml(guide.title)}</name>\n${placemarks}\n      <Placemark><name>Route</name><LineString><coordinates>${coords}</coordinates></LineString></Placemark>\n    </Document></kml>`;
    res.setHeader('Content-Type', 'application/vnd.google-earth.kml+xml');
    res.setHeader('Content-Disposition', `attachment; filename="${guide.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.kml"`);
    return res.send(kml);
  }

  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename="${guide.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.json"`);
  res.json(data);
});

router.post('/:id/save', authenticate, validateParams(idParamSchema), async (req: Request, res: Response) => {
  const { id } = req.params; const userId = req.user!.userId;
  const guideRows = await db.select().from(guides).where(eq(guides.id, id)).limit(1);
  if (!guideRows.length) throw AppError.notFound('Guide not found');
  const existing = await db.select().from(userSavedGuides).where(and(eq(userSavedGuides.userId, userId), eq(userSavedGuides.guideId, id))).limit(1);
  if (existing.length > 0) { await db.delete(userSavedGuides).where(and(eq(userSavedGuides.userId, userId), eq(userSavedGuides.guideId, id))); return res.json({ saved: false }); }
  await db.insert(userSavedGuides).values({ id: uuidv4(), userId, guideId: id });
  res.json({ saved: true });
});

router.get('/:id/versions', authenticate, validateParams(idParamSchema), async (req: Request, res: Response) => {
  const { id } = req.params;
  const guide = await db.select().from(guides).where(eq(guides.id, id)).limit(1);
  if (!guide.length) throw AppError.notFound('Guide not found');
  if (guide[0].creatorId !== req.user!.userId) throw AppError.forbidden('Only the creator can view version history');
  const versions = await db.select().from(guideVersions).where(eq(guideVersions.guideId, id)).orderBy(desc(guideVersions.version));
  res.json({ versions });
});

router.post('/:id/versions/restore', authenticate, validateParams(idParamSchema), validateBody(z.object({ versionId: z.string().uuid() })), async (req: Request, res: Response) => {
  const { id } = req.params;
  const { versionId } = req.body;
  const guide = await db.select().from(guides).where(eq(guides.id, id)).limit(1);
  if (!guide.length) throw AppError.notFound('Guide not found');
  if (guide[0].creatorId !== req.user!.userId) throw AppError.forbidden('Only the creator can restore versions');
  const version = await db.select().from(guideVersions).where(eq(guideVersions.id, versionId)).limit(1);
  if (!version.length || version[0].guideId !== id) throw AppError.notFound('Version not found');
  const v = version[0];
  await db.update(guides).set({ title: v.title, description: v.description, category: v.category, city: v.city, duration: v.duration, priceModel: v.priceModel, price: v.price, coverImageUrl: v.coverImageUrl, updatedAt: new Date() }).where(eq(guides.id, id));
  await db.delete(guideStops).where(eq(guideStops.guideId, id));
  const stopsData = v.stopsSnapshot as any[];
  for (let i = 0; i < stopsData.length; i++) {
    await db.insert(guideStops).values({ id: uuidv4(), guideId: id, stopOrder: i + 1, name: stopsData[i].name, description: stopsData[i].description, latitude: stopsData[i].latitude, longitude: stopsData[i].longitude, photoUrl: stopsData[i].photoUrl, videoUrl: stopsData[i].videoUrl, customAudioUrl: stopsData[i].customAudioUrl, links: stopsData[i].links || [] });
  }
  res.json({ message: 'Version restored' });
});

router.get('/:id/og-image', validateParams(idParamSchema), async (req: Request, res: Response) => {
  const { id } = req.params;
  const guideRows = await db.select().from(guides).where(eq(guides.id, id)).limit(1);
  if (!guideRows.length) throw AppError.notFound('Guide not found');
  const guide = guideRows[0];
  const categoryEmoji: Record<string, string> = { food: '🍽', architecture: '🏛', history: '📜', art: '🎨', nature: '🌿', characters: '🧑', general: '📍' };
  const emoji = categoryEmoji[guide.category] || '📍';
  const title = guide.title.length > 40 ? guide.title.slice(0, 37) + '…' : guide.title;
  const city = guide.city || '';
  const rating = Number(guide.rating) > 0 ? `${Number(guide.rating).toFixed(1)}★` : '';

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#1D9E75"/>
      <stop offset="100%" style="stop-color:#158563"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <rect x="40" y="40" width="1120" height="550" rx="24" fill="white" fill-opacity="0.12"/>
  <text x="600" y="180" font-family="system-ui, -apple-system, sans-serif" font-size="120" text-anchor="middle" fill="white" fill-opacity="0.9">${emoji}</text>
  <text x="600" y="280" font-family="system-ui, -apple-system, sans-serif" font-size="52" font-weight="bold" text-anchor="middle" fill="white">${sanitizeXml(title)}</text>
  <text x="600" y="340" font-family="system-ui, -apple-system, sans-serif" font-size="28" text-anchor="middle" fill="white" fill-opacity="0.8">${sanitizeXml(city)}</text>
  ${rating ? `<text x="600" y="390" font-family="system-ui, -apple-system, sans-serif" font-size="24" text-anchor="middle" fill="#FFD43B">${rating}</text>` : ''}
  <text x="600" y="520" font-family="system-ui, -apple-system, sans-serif" font-size="22" text-anchor="middle" fill="white" fill-opacity="0.6">curiocity.app</text>
</svg>`;

  res.setHeader('Content-Type', 'image/svg+xml');
  res.setHeader('Cache-Control', 'public, max-age=86400');
  res.send(svg);
});

export { router as guidesRouter };