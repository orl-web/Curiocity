import { config } from '../config';
import { db } from '../db';
import { guides, guideStops, guideCosts, guideNearby, guideResources, users } from '../db/schema';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import { sql } from 'drizzle-orm';

async function seed() {
  console.log('Seeding database...');

  const passwordHash = await bcrypt.hash('demo123', 12);

  const demoUsers = [
    { id: '11111111-1111-1111-1111-111111111111', email: 'demo@curiocity.app', emailVerified: true, passwordHash, displayName: 'Demo User', initials: 'DU', role: 'user' as const },
    { id: '22222222-2222-2222-2222-222222222222', email: 'creator@curiocity.app', emailVerified: true, passwordHash, displayName: 'Prof. Amara L.', initials: 'AL', role: 'creator' as const, bio: 'Art history professor specializing in Baroque architecture', location: 'Palermo, Sicily' },
  ];

  for (const user of demoUsers) {
    await db.execute(sql`INSERT INTO users (id, email, email_verified, password_hash, display_name, initials, role, bio, location) VALUES (${user.id}, ${user.email}, ${user.emailVerified}, ${user.passwordHash}, ${user.displayName}, ${user.initials}, ${user.role}, ${user.bio || null}, ${user.location || null}) ON CONFLICT (id) DO UPDATE SET email = ${user.email}`);
  }
  console.log('Users seeded');

  const seedGuides = [
    { id: 'a1111111-1111-1111-1111-111111111111', title: "Baroque hidden gems of Palermo", city: "Palermo", category: "architecture", creatorId: '22222222-2222-2222-2222-222222222222', creatorInitials: 'AL', creatorColor: '#1D9E75', verified: true, duration: "1h 30m", distance: "2.8km", priceModel: "paid" as const, rating: "4.9", description: "Five centuries of baroque excess hidden in narrow Palermitan lanes — architecture that tells stories of conquest, devotion and civic pride most tourists walk past without noticing.", isPublished: true },
    { id: 'a2222222-2222-2222-2222-222222222222', title: "Street food trail: Catania's morning market", city: "Catania", category: "food", creatorId: '22222222-2222-2222-2222-222222222222', creatorInitials: 'MG', creatorColor: '#BA7517', verified: false, duration: "45m", distance: "1.2km", priceModel: "free" as const, rating: "4.7", description: "Three stops, forty-five minutes, a lifetime of flavour memory. No reservations needed — just an empty stomach.", isPublished: true },
    { id: 'a3333333-3333-3333-3333-333333333333', title: "Gaudí's Barcelona: what the guides miss", city: "Barcelona", category: "architecture", creatorId: '22222222-2222-2222-2222-222222222222', creatorInitials: 'XE', creatorColor: '#378ADD', verified: true, duration: "2h", distance: "4km", priceModel: "paid" as const, rating: "5.0", description: "Every tourist does Sagrada Família. This route adds four stops that recontextualise everything — Gaudí's evolution from orientalist to sacred visionary.", isPublished: true },
    { id: 'a4444444-4444-4444-4444-444444444444', title: "Edo-era Tokyo: a samurai history walk", city: "Tokyo", category: "history", creatorId: '22222222-2222-2222-2222-222222222222', creatorInitials: 'KT', creatorColor: '#D4537E', verified: true, duration: "1h 45m", distance: "3.5km", priceModel: "paid" as const, rating: "4.8", description: "Four stops connecting Edo-era power, religion and daily life — the Japan that existed before modernisation rewrote everything.", isPublished: true },
  ];

  for (const guide of seedGuides) {
    await db.execute(sql`INSERT INTO guides (id, title, city, category, creator_id, creator_initials, creator_color, verified, duration, distance, price_model, rating, description, is_published) VALUES (${guide.id}, ${guide.title}, ${guide.city}, ${guide.category}, ${guide.creatorId}, ${guide.creatorInitials}, ${guide.creatorColor}, ${guide.verified}, ${guide.duration}, ${guide.distance}, ${guide.priceModel}, ${guide.rating}, ${guide.description}, ${guide.isPublished}) ON CONFLICT (id) DO NOTHING`);
  }
  console.log('Guides seeded');

  const stopsData = [
    { guideId: 'a1111111-1111-1111-1111-111111111111', stops: [
      { name: "Quattro Canti", description: "The theatrical baroque crossroads where four fountain-kings face each other — the city's original performance space.", lat: "38.11551", lng: "13.36170", photo: "https://upload.wikimedia.org/wikipedia/commons/thumb/7/77/Quattro_canti.jpg/480px-Quattro_canti.jpg", video: "https://www.youtube.com/results?search_query=Quattro+Canti+Palermo+baroque", links: [{ title: "Wikipedia", url: "https://en.wikipedia.org/wiki/Quattro_Canti" }] },
      { name: "Oratorio del Rosario", description: "Giacomo Serpotta's stucco masterpieces; look for cherubs hiding the tools of the Rosary in the ornamental chaos.", lat: "38.11762", lng: "13.35904", photo: "https://picsum.photos/seed/rosario/480/240", video: "https://www.youtube.com/results?search_query=Oratorio+Rosario+Palermo+Serpotta", links: [{ title: "Wikipedia", url: "https://en.wikipedia.org/wiki/Oratorio_del_Rosario_di_San_Domenico" }] },
      { name: "Palazzo Abatellis", description: "A Gothic-Catalan palace turned museum — it houses the most haunting medieval fresco most visitors never find.", lat: "38.11361", lng: "13.36509", photo: "https://picsum.photos/seed/abatellis/480/240", video: "https://www.youtube.com/results?search_query=Palazzo+Abatellis+Palermo", links: [{ title: "Wikipedia", url: "https://en.wikipedia.org/wiki/Palazzo_Abatellis" }] },
      { name: "Fontana Pretoria", description: "Called the Fountain of Shame by nuns — the naked figures scandalized a 16th-century convent built right next door.", lat: "38.11483", lng: "13.36221", photo: "https://picsum.photos/seed/pretoria/480/240", video: "https://www.youtube.com/results?search_query=Fontana+Pretoria+Palermo", links: [{ title: "Wikipedia", url: "https://en.wikipedia.org/wiki/Fontana_Pretoria" }] },
      { name: "La Martorana", description: "Byzantine mosaics commissioned by a Norman king who spoke Greek — a 12th-century multicultural statement in tile and gold.", lat: "38.11490", lng: "13.36208", photo: "https://picsum.photos/seed/martorana/480/240", video: "https://www.youtube.com/results?search_query=La+Martorana+Palermo+mosaics", links: [{ title: "Wikipedia", url: "https://en.wikipedia.org/wiki/Santa_Maria_dell%27Ammiraglio" }] },
    ]},
    { guideId: 'a2222222-2222-2222-2222-222222222222', stops: [
      { name: "La Pescheria fish market", description: "Built over a Roman amphitheatre — Catanians have performed this daily ritual of selling and haggling since antiquity.", lat: "37.50261", lng: "15.08742", photo: "https://picsum.photos/seed/pescheria/480/240", video: "https://www.youtube.com/results?search_query=Catania+fish+market+Pescheria", links: [{ title: "Wikipedia", url: "https://en.wikipedia.org/wiki/Pescheria_(Catania)" }] },
      { name: "Arancini at Bar Tondo", description: "The original 1961 recipe uses a ragù that still simmers in the same pot — unchanged for over sixty years.", lat: "37.50237", lng: "15.08640", photo: "https://picsum.photos/seed/arancini/480/240", video: "https://www.youtube.com/results?search_query=arancini+siciliani+catania", links: [{ title: "What is arancino?", url: "https://en.wikipedia.org/wiki/Arancini" }] },
      { name: "Granita e brioche col tuppo", description: "Dip it, don't cut it — the 'tuppo' is the round top, and this is the only acceptable Sicilian breakfast.", lat: "37.50200", lng: "15.08690", photo: "https://picsum.photos/seed/granita/480/240", video: "https://www.youtube.com/results?search_query=granita+siciliana+brioche", links: [{ title: "Wikipedia", url: "https://en.wikipedia.org/wiki/Granita" }] },
    ]},
    { guideId: 'a3333333-3333-3333-3333-333333333333', stops: [
      { name: "Sagrada Família east facade", description: "The Nativity side is the only facade Gaudí personally supervised — every other was completed long after his death.", lat: "41.40364", lng: "2.17437", photo: "https://upload.wikimedia.org/wikipedia/commons/thumb/b/be/Sagrada_Familia_01.jpg/480px-Sagrada_Familia_01.jpg", video: "https://www.youtube.com/results?search_query=Sagrada+Familia+Nativity+facade+Gaudi", links: [{ title: "Official site", url: "https://www.sagradafamilia.org" }, { title: "Wikipedia", url: "https://en.wikipedia.org/wiki/Sagrada_Fam%C3%ADlia" }] },
      { name: "Casa Vicens", description: "His very first commission, orientalist and playful — proof that Gaudí's genius didn't arrive fully formed.", lat: "41.41466", lng: "2.14866", photo: "https://picsum.photos/seed/casavicens/480/240", video: "https://www.youtube.com/results?search_query=Casa+Vicens+Gaudi+Barcelona", links: [{ title: "Wikipedia", url: "https://en.wikipedia.org/wiki/Casa_Vicens" }] },
      { name: "Palau Güell rooftop", description: "The mosaic chimneys here were the direct prototype for the Park Güell warriors — the city's best-kept secret.", lat: "41.37924", lng: "2.17440", photo: "https://picsum.photos/seed/palaugüell/480/240", video: "https://www.youtube.com/results?search_query=Palau+Güell+rooftop+Gaudi", links: [{ title: "Wikipedia", url: "https://en.wikipedia.org/wiki/Palau_G%C3%BCell" }] },
      { name: "Park Güell lower path", description: "Gaudí's planned workers' village was never built — the 'park' was a failed real estate development that became an icon.", lat: "41.41451", lng: "2.15274", photo: "https://picsum.photos/seed/parkguell/480/240", video: "https://www.youtube.com/results?search_query=Park+Güell+Gaudi+history", links: [{ title: "Wikipedia", url: "https://en.wikipedia.org/wiki/Park_G%C3%BCell" }] },
    ]},
    { guideId: 'a4444444-4444-4444-4444-444444444444', stops: [
      { name: "Yanaka cemetery", description: "The last Tokugawa shogun rests here — the man who ended 265 years of military rule almost without a battle.", lat: "35.72710", lng: "139.76383", photo: "https://picsum.photos/seed/yanaka/480/240", video: "https://www.youtube.com/results?search_query=Yanaka+cemetery+Tokyo+history", links: [{ title: "Wikipedia", url: "https://en.wikipedia.org/wiki/Yanaka_Cemetery" }] },
      { name: "Nezu Shrine", description: "Founded before Tokyo's official birth, it was already ancient when Edo was young — still active, always overlooked.", lat: "35.72039", lng: "139.76292", photo: "https://picsum.photos/seed/nezushrine/480/240", video: "https://www.youtube.com/results?search_query=Nezu+Shrine+Tokyo", links: [{ title: "Wikipedia", url: "https://en.wikipedia.org/wiki/Nezu_Shrine" }] },
      { name: "Kyu-Yasuda Garden", description: "A daimyō's strolling garden that survived earthquake, firebombing, and the property bubble that destroyed everything else.", lat: "35.69295", lng: "139.80247", photo: "https://picsum.photos/seed/yasudagarden/480/240", video: "https://www.youtube.com/results?search_query=Kyu+Yasuda+Garden+Tokyo", links: [{ title: "Wikipedia", url: "https://en.wikipedia.org/wiki/Kyu-Yasuda_Garden" }] },
      { name: "Zōjō-ji temple gate", description: "The 1605 sangedatsumon gate survived everything Tokyo threw at history — walk through it and subtract four centuries.", lat: "35.65625", lng: "139.74912", photo: "https://picsum.photos/seed/zojoji/480/240", video: "https://www.youtube.com/results?search_query=Zojoji+temple+Tokyo+gate", links: [{ title: "Wikipedia", url: "https://en.wikipedia.org/wiki/Z%C5%8Dj%C5%8D-ji" }] },
    ]},
  ];

  for (const { guideId, stops } of stopsData) {
    for (let i = 0; i < stops.length; i++) {
      const stop = stops[i];
      const id = uuidv4();
      await db.execute(sql`INSERT INTO guide_stops (id, guide_id, stop_order, name, description, latitude, longitude, photo_url, video_url, links) VALUES (${id}, ${guideId}, ${i}, ${stop.name}, ${stop.description}, ${stop.lat}, ${stop.lng}, ${stop.photo}, ${stop.video}, ${JSON.stringify(stop.links)}) ON CONFLICT (id) DO NOTHING`);
    }
  }
  console.log('Guide stops seeded');

  const costsData = [
    { guideId: 'a1111111-1111-1111-1111-111111111111', costs: [ { type: 'tickets', name: 'Oratorio del Rosario', price: '3.00' }, { type: 'tickets', name: 'Palazzo Abatellis', price: '5.00' }, { type: 'meals', name: 'Arancino + granita nearby', price: '5.00' }, { type: 'transport', name: 'All walking distance', price: '0.00' } ]},
    { guideId: 'a2222222-2222-2222-2222-222222222222', costs: [ { type: 'meals', name: 'Arancino at Bar Tondo', price: '2.00' }, { type: 'meals', name: 'Granita e brioche', price: '3.50' }, { type: 'meals', name: 'Fresh fish snack at market', price: '4.00' }, { type: 'transport', name: 'Walking distance', price: '0.00' } ]},
    { guideId: 'a3333333-3333-3333-3333-333333333333', costs: [ { type: 'tickets', name: 'Sagrada Família (fast-track)', price: '26.00' }, { type: 'tickets', name: 'Casa Vicens', price: '14.00' }, { type: 'tickets', name: 'Palau Güell', price: '12.00' }, { type: 'meals', name: 'Tapas near Eixample', price: '15.00' }, { type: 'transport', name: 'Metro L2/L5 between stops', price: '2.40' } ]},
    { guideId: 'a4444444-4444-4444-4444-444444444444', costs: [ { type: 'tickets', name: 'Nezu Shrine (free)', price: '0.00' }, { type: 'tickets', name: 'Kyu-Yasuda Garden', price: '1.50' }, { type: 'meals', name: 'Ramen in Yanaka', price: '10.00' }, { type: 'meals', name: 'Matcha at Nezu shrine cafe', price: '5.00' }, { type: 'transport', name: 'Tokyo Metro between stops', price: '3.50' } ]},
  ];

  for (const { guideId, costs } of costsData) {
    for (const cost of costs) {
      const id = uuidv4();
      await db.execute(sql`INSERT INTO guide_costs (id, guide_id, type, name, price) VALUES (${id}, ${guideId}, ${cost.type}, ${cost.name}, ${cost.price}) ON CONFLICT (id) DO NOTHING`);
    }
  }
  console.log('Guide costs seeded');

  const nearbyData = [
    { guideId: 'a1111111-1111-1111-1111-111111111111', nearby: [ { direction: '↓', name: 'Palermo Centrale', distance: '2.1km' }, { direction: '↗', name: 'Teatro Massimo', distance: '0.5km' }, { direction: '←', name: 'Mercato Ballaro', distance: '0.8km' } ]},
    { guideId: 'a2222222-2222-2222-2222-222222222222', nearby: [ { direction: '↑', name: 'Piazza del Duomo', distance: '0.2km' }, { direction: '→', name: 'Catania Centrale', distance: '1.4km' }, { direction: '↓', name: 'Porto di Catania', distance: '0.6km' } ]},
    { guideId: 'a3333333-3333-3333-3333-333333333333', nearby: [ { direction: '↓', name: 'Barceloneta Beach', distance: '2.8km' }, { direction: '←', name: 'Plaça de Catalunya', distance: '1.1km' }, { direction: '↗', name: 'Park Güell', distance: '2.2km' } ]},
    { guideId: 'a4444444-4444-4444-4444-444444444444', nearby: [ { direction: '→', name: 'Ueno Park', distance: '0.8km' }, { direction: '↙', name: 'Akihabara', distance: '2.1km' }, { direction: '↓', name: 'Tokyo Tower', distance: '0.2km' } ]},
  ];

  for (const { guideId, nearby } of nearbyData) {
    for (const n of nearby) {
      const id = uuidv4();
      await db.execute(sql`INSERT INTO guide_nearby (id, guide_id, direction, name, distance) VALUES (${id}, ${guideId}, ${n.direction}, ${n.name}, ${n.distance}) ON CONFLICT (id) DO NOTHING`);
    }
  }
  console.log('Guide nearby seeded');

  const resourcesData = [
    { guideId: 'a1111111-1111-1111-1111-111111111111', resources: [ { icon: '🌐', title: 'Visit Palermo official site', url: 'https://www.visitpalermo.it/en' }, { icon: '📖', title: 'Baroque architecture in Palermo', url: 'https://en.wikipedia.org/wiki/Baroque_architecture_in_Palermo' }, { icon: '🗺', title: 'Palermo on OpenStreetMap', url: 'https://www.openstreetmap.org/#map=15/38.1150/13.3620' } ]},
    { guideId: 'a2222222-2222-2222-2222-222222222222', resources: [ { icon: '🌐', title: 'Visit Catania', url: 'https://www.comune.catania.it/' }, { icon: '📖', title: 'Catania fish market', url: 'https://en.wikipedia.org/wiki/Pescheria_(Catania)' }, { icon: '🍽', title: 'Sicilian street food guide', url: 'https://en.wikipedia.org/wiki/Sicilian_cuisine' } ]},
    { guideId: 'a3333333-3333-3333-3333-333333333333', resources: [ { icon: '🌐', title: 'Official Sagrada Família tickets', url: 'https://www.sagradafamilia.org' }, { icon: '📖', title: 'Gaudí biography', url: 'https://en.wikipedia.org/wiki/Antoni_Gaud%C3%AD' }, { icon: '🗺', title: 'Barcelona architecture map', url: 'https://en.wikipedia.org/wiki/Modernisme' } ]},
    { guideId: 'a4444444-4444-4444-4444-444444444444', resources: [ { icon: '🌐', title: 'Tokyo Tourism official', url: 'https://www.gotokyo.org/en/' }, { icon: '📖', title: 'Edo period history', url: 'https://en.wikipedia.org/wiki/Edo_period' }, { icon: '🎌', title: 'Yanaka neighbourhood guide', url: 'https://en.wikipedia.org/wiki/Yanaka,_Tokyo' } ]},
  ];

  for (const { guideId, resources } of resourcesData) {
    for (const r of resources) {
      const id = uuidv4();
      await db.execute(sql`INSERT INTO guide_resources (id, guide_id, icon, title, url) VALUES (${id}, ${guideId}, ${r.icon}, ${r.title}, ${r.url}) ON CONFLICT (id) DO NOTHING`);
    }
  }
  console.log('Guide resources seeded');

  console.log('Seeding completed!');
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seeding failed:', err);
  process.exit(1);
});