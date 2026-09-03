import { config } from '../config';
import { db } from '../db';
import { guides, guideStops, guideCosts, guideNearby, guideResources, users } from '../db/schema';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import { sql } from 'drizzle-orm';

async function seedGuides() {
  console.log('Seeding 10 new guides...');

  const passwordHash = await bcrypt.hash('demo123', 12);

  const creators = [
    { id: '33333333-3333-3333-3333-333333333333', email: 'marco@curiocity.app', passwordHash, displayName: 'Marco Bianchi', initials: 'MB', role: 'creator' as const, bio: 'Roman historian and food enthusiast', location: 'Rome, Italy' },
    { id: '44444444-4444-4444-4444-444444444444', email: 'sophie@curiocity.app', passwordHash, displayName: 'Sophie Durand', initials: 'SD', role: 'creator' as const, bio: 'Parisian art critic and walking tour guide', location: 'Paris, France' },
    { id: '55555555-5555-5555-5555-555555555555', email: 'yuki@curiocity.app', passwordHash, displayName: 'Yuki Tanaka', initials: 'YT', role: 'creator' as const, bio: 'Japanese culture writer and Kyoto local', location: 'Kyoto, Japan' },
  ];

  for (const c of creators) {
    await db.execute(sql`INSERT INTO users (id, email, email_verified, password_hash, display_name, initials, role, bio, location) VALUES (${c.id}, ${c.email}, true, ${c.passwordHash}, ${c.displayName}, ${c.initials}, ${c.role}, ${c.bio}, ${c.location}) ON CONFLICT (email) DO NOTHING`);
  }

  const newGuides = [
    {
      id: 'b1111111-1111-1111-1111-111111111111', title: 'Ancient Rome: Fall of an Empire', city: 'Rome', category: 'history',
      creatorId: '33333333-3333-3333-3333-333333333333', creatorInitials: 'MB', creatorColor: '#D4537E', verified: true,
      duration: '2h', distance: '3.2km', priceModel: 'paid', rating: '4.9', price: 99,
      description: 'Walk through the ruins where emperors ruled, senators plotted, and gladiators died. Five stops that trace the arc of Roman power from republic to collapse.',
      stops: [
        { name: 'Colosseum', lat: '41.89021', lng: '12.49223', desc: 'Fifty thousand Romans roared here. The hypogeum underground held lions, tigers, and condemned men moments before the sand swallowed them.' },
        { name: 'Roman Forum', lat: '41.89246', lng: '12.48532', desc: 'The senate house where Caesar fell. Stand where Cicero spoke and Augustus built an empire from a republic.' },
        { name: 'Palatine Hill', lat: '41.88926', lng: '12.48734', desc: 'Where Romulus supposedly founded Rome in 753 BC. Later, emperors built palaces here so vast they gave us the word "palace".' },
        { name: 'Circus Maximus', lat: '41.88608', lng: '12.48493', desc: '250,000 spectators watched chariot races here. The track is now a public park — but the shape of the original is still visible.' },
        { name: 'Bocca della Verità', lat: '41.88834', lng: '12.48293', desc: 'An ancient drain cover that became a lie detector. Medieval Romans believed it would bite the hand of any liar.' },
      ],
      costs: [
        { type: 'tickets', name: 'Colosseum + Forum combo', price: '16.00' },
        { type: 'meals', name: 'Supplì at Antico Forno', price: '3.00' },
        { type: 'transport', name: 'All walking', price: '0.00' },
      ],
      nearby: [
        { direction: '↑', name: 'Trevi Fountain', distance: '1.1km' },
        { direction: '→', name: 'Circus Maximus', distance: '0.3km' },
        { direction: '←', name: 'Capitoline Museums', distance: '0.5km' },
      ],
      resources: [
        { icon: '🌐', title: 'Roma Pass official', url: 'https://www.romapass.it' },
        { icon: '📖', title: 'Roman Empire timeline', url: 'https://en.wikipedia.org/wiki/Roman_Empire' },
      ],
    },
    {
      id: 'b2222222-2222-2222-2222-222222222222', title: 'Montmartre: Bohemian Paris', city: 'Paris', category: 'art',
      creatorId: '44444444-4444-4444-4444-444444444444', creatorInitials: 'SD', creatorColor: '#378ADD', verified: true,
      duration: '1h 30m', distance: '2.1km', priceModel: 'free', rating: '4.7', price: 0,
      description: 'Where Picasso, Van Gogh, and Toulouse-Lautrec drank, painted, and changed art forever. The hill that made modern art.',
      stops: [
        { name: 'Place du Tertre', lat: '48.88645', lng: '2.34110', desc: 'Artists still paint here exactly as they did in 1900. The square has been an open-air studio for over four centuries.' },
        { name: 'Sacré-Cœur', lat: '48.88671', lng: '2.34310', desc: 'Built as national penance after the Franco-Prussian War. The white travertine self-cleans — it gets whiter when it rains.' },
        { name: 'Au Lapin Agile', lat: '48.88636', lng: '2.34141', desc: 'The cabaret where Picasso paid for meals with paintings. Those paintings are now worth millions.' },
        { name: 'Rue Lepic', lat: '48.88580', lng: '2.33650', desc: 'The winding street from Amélie. The Moulin de la Galette at the top is the last working windmill in Paris.' },
        { name: 'Les Deux Moulins', lat: '48.88430', lng: '2.33650', desc: 'The café where Amélie worked. In reality, it is a perfectly ordinary neighborhood bar — which is precisely what makes it special.' },
      ],
      costs: [
        { type: 'meals', name: 'Crêpe from street vendor', price: '5.00' },
        { type: 'meals', name: 'Coffee at Deux Moulins', price: '4.50' },
        { type: 'transport', name: 'Metro Abbesses', price: '2.15' },
      ],
      nearby: [
        { direction: '↓', name: 'Moulin Rouge', distance: '0.9km' },
        { direction: '→', name: 'Gare du Nord', distance: '1.5km' },
        { direction: '↑', name: 'Père Lachaise', distance: '2.3km' },
      ],
      resources: [
        { icon: '🌐', title: 'Montmartre official', url: 'https://www.montmartre-guide.com' },
        { icon: '📖', title: 'Bohemian Paris history', url: 'https://en.wikipedia.org/wiki/Montmartre' },
      ],
    },
    {
      id: 'b3333333-3333-3333-3333-333333333333', title: 'Amsterdam Canal Ring Walk', city: 'Amsterdam', category: 'architecture',
      creatorId: '22222222-2222-2222-2222-222222222222', creatorInitials: 'AL', creatorColor: '#1D9E75', verified: true,
      duration: '1h 45m', distance: '3.8km', priceModel: 'paid', rating: '4.8', price: 99,
      description: 'A UNESCO World Heritage waterway built by draining a swamp. Four centuries of merchant wealth frozen in brick and gables.',
      stops: [
        { name: 'Central Station', lat: '52.37913', lng: '4.89802', desc: 'Built on 68 million poles driven into swamp. The station was deliberately placed here to connect the old city with the new harbor.' },
        { name: 'Begijnhof', lat: '52.37510', lng: '4.89240', desc: 'A hidden courtyard of a medieval beguine community. The wooden houses here are the oldest in Amsterdam — from 1425.' },
        { name: 'Nine Streets', lat: '52.37300', lng: '4.88800', desc: 'Nine small streets crossing the three main canals. Each was built to connect a different guild to its waterfront warehouse.' },
        { name: 'Houseboat Museum', lat: '52.37150', lng: '4.88500', desc: 'A decommissioned cargo barge turned home. Amsterdammers live on 2,500 houseboats — this is what it actually looks like.' },
        { name: 'Skinny Bridge', lat: '52.36950', lng: '4.89800', desc: 'The narrowest bridge on the canals. Legend says the mayor threw his keys in the Amstel here — look for them at the bottom.' },
      ],
      costs: [
        { type: 'tickets', name: 'Houseboat Museum', price: '5.00' },
        { type: 'meals', name: 'Stroopwafel from Albert Cuyp', price: '3.50' },
        { type: 'transport', name: 'All walking', price: '0.00' },
      ],
      nearby: [
        { direction: '↑', name: 'Anne Frank House', distance: '0.8km' },
        { direction: '→', name: 'NEMO Museum', distance: '1.2km' },
        { direction: '↓', name: 'Vondelpark', distance: '1.5km' },
      ],
      resources: [
        { icon: '🌐', title: 'Amsterdam canals', url: 'https://www.iamsterdam.com/en/see-and-do/culture/canals' },
        { icon: '📖', title: 'UNESCO Canal Ring', url: 'https://whc.unesco.org/en/list/1349' },
      ],
    },
    {
      id: 'b4444444-4444-4444-4444-444444444444', title: 'Lisbon Alfama: Fado & Soul', city: 'Lisbon', category: 'food',
      creatorId: '33333333-3333-3333-3333-333333333333', creatorInitials: 'MB', creatorColor: '#D4537E', verified: true,
      duration: '1h 15m', distance: '1.8km', priceModel: 'free', rating: '4.6', price: 0,
      description: 'The oldest neighborhood in Lisbon survived the 1755 earthquake almost intact. Taste the food, hear the fado, feel the soul.',
      stops: [
        { name: 'Miradouro da Graça', lat: '38.71630', lng: '-9.13050', desc: 'The viewpoint where Lisboetas come at sunset. Watch the light turn the city gold and the castle shadows stretch across the rooftops.' },
        { name: 'São Jorge Castle', lat: '38.71390', lng: '-9.13340', desc: 'Moorish fortification from 11th century. The walls still show where Roman, Visigoth, and Arab armies left their marks.' },
        { name: 'Fado Museum', lat: '38.71050', lng: '-9.13200', desc: 'Fado was born in these streets. The museum explains how sailors\' longing for home became a musical genre that defines Portugal.' },
        { name: 'Taberna da Rua das Flores', lat: '38.70980', lng: '-9.13500', desc: 'Tiny restaurant with no menu — the chef tells you what he cooked today. The petiscos (tapas) are the best in Alfama.' },
        { name: 'Praça do Comércio', lat: '38.70740', lng: '-9.13640', desc: 'The grand waterfront square where Portuguese explorers once stood before sailing to India and Brazil.' },
      ],
      costs: [
        { type: 'meals', name: 'Pastel de nata', price: '1.20' },
        { type: 'meals', name: 'Ginjinha shot', price: '1.50' },
        { type: 'meals', name: 'Bifana pork sandwich', price: '3.00' },
        { type: 'transport', name: 'Tram 28 (optional)', price: '3.00' },
      ],
      nearby: [
        { direction: '↓', name: 'Santa Justa Lift', distance: '0.6km' },
        { direction: '→', name: 'National Pantheon', distance: '0.3km' },
        { direction: '↑', name: 'Lisbon Cathedral', distance: '0.4km' },
      ],
      resources: [
        { icon: '🌐', title: 'Visit Lisboa', url: 'https://www.visitlisboa.com' },
        { icon: '📖', title: 'Alfama history', url: 'https://en.wikipedia.org/wiki/Alfama' },
      ],
    },
    {
      id: 'b5555555-5555-5555-5555-555555555555', title: 'Florence: Renaissance Trail', city: 'Florence', category: 'art',
      creatorId: '44444444-4444-4444-4444-444444444444', creatorInitials: 'SD', creatorColor: '#378ADD', verified: true,
      duration: '2h 30m', distance: '2.9km', priceModel: 'paid', rating: '5.0', price: 99,
      description: 'Where the Renaissance was born. Follow the Medici money that funded Michelangelo, Botticelli, and Brunelleschi.',
      stops: [
        { name: 'Florence Cathedral', lat: '43.77310', lng: '11.25580', desc: 'Brunelleschi\'s dome was an engineering miracle — 4 million bricks, no scaffolding, no precedent. Still the largest brick dome ever built.' },
        { name: 'Galleria dell\'Accademia', lat: '43.77600', lng: '11.25850', desc: 'Where Michelangelo\'s David stands. He was carved from a block two other sculptors had abandoned as flawed.' },
        { name: 'Ponte Vecchio', lat: '43.76790', lng: '11.25310', desc: 'The only bridge Hitler refused to destroy. Goldsmiths have worked here since 1593 — the smell of solder still hangs in the air.' },
        { name: 'Piazzale degli Uffizi', lat: '43.76770', lng: '11.25530', desc: 'The courtyard of the Uffizi was once the Medici government offices. Now it houses the world\'s greatest collection of Renaissance art.' },
        { name: 'San Lorenzo Market', lat: '43.77480', lng: '11.25350', desc: 'The Medici parish church and its market. Brunelleschi designed the basilica; the market has sold leather since the 14th century.' },
      ],
      costs: [
        { type: 'tickets', name: 'Duomo climb', price: '18.00' },
        { type: 'tickets', name: 'Accademia (David)', price: '16.00' },
        { type: 'meals', name: 'Lampredotto sandwich', price: '5.00' },
        { type: 'transport', name: 'All walking', price: '0.00' },
      ],
      nearby: [
        { direction: '↑', name: 'Palazzo Pitti', distance: '0.5km' },
        { direction: '→', name: 'Santa Croce', distance: '0.7km' },
        { direction: '↓', name: 'Boboli Gardens', distance: '0.6km' },
      ],
      resources: [
        { icon: '🌐', title: 'Uffizi Gallery', url: 'https://www.uffizi.it' },
        { icon: '📖', title: 'Renaissance in Florence', url: 'https://en.wikipedia.org/wiki/Florence' },
      ],
    },
    {
      id: 'b6666666-6666-6666-6666-666666666666', title: 'Prague: Old Town Mysteries', city: 'Prague', category: 'history',
      creatorId: '22222222-2222-2222-2222-222222222222', creatorInitials: 'AL', creatorColor: '#1D9E75', verified: true,
      duration: '1h 30m', distance: '2.4km', priceModel: 'free', rating: '4.5', price: 0,
      description: 'The city that survived WWII almost intact. Medieval streets, astronomical clocks, and legends that refuse to die.',
      stops: [
        { name: 'Astronomical Clock', lat: '50.08651', lng: '14.42125', desc: 'Every hour, the 600-year-old clock shows the Twelve Apostles walking past. The maker was blinded so he could never build another.' },
        { name: 'Old Town Square', lat: '50.08747', lng: '14.42125', desc: 'Jan Hus was burned here in 1415 for trying to reform the Church. His statue still faces the church that condemned him.' },
        { name: 'Klementinum Library', lat: '50.08620', lng: '14.41800', desc: 'One of the oldest libraries in Europe. The baroque ceiling frescoes depict the path from ignorance to knowledge.' },
        { name: 'Charles Bridge', lat: '50.08650', lng: '14.41140', desc: 'Built in 1357 by King Charles IV. The foundation stone was laid at exactly 5:31 AM — the moment of his birth, by astrological calculation.' },
        { name: 'Lennon Wall', lat: '50.08520', lng: '14.40750', desc: 'A communist-era wall that became a symbol of peace after John Lennon\'s death. Painted over by police, it always comes back.' },
      ],
      costs: [
        { type: 'meals', name: 'Trdelník pastry', price: '4.00' },
        { type: 'meals', name: 'Czech beer at local pub', price: '2.50' },
        { type: 'transport', name: 'All walking', price: '0.00' },
      ],
      nearby: [
        { direction: '↑', name: 'Prague Castle', distance: '1.2km' },
        { direction: '→', name: 'Powder Gate', distance: '0.2km' },
        { direction: '↓', name: 'Dancing House', distance: '1.0km' },
      ],
      resources: [
        { icon: '🌐', title: 'Prague official', url: 'https://www.prague.eu' },
        { icon: '📖', title: 'Prague history', url: 'https://en.wikipedia.org/wiki/Prague' },
      ],
    },
    {
      id: 'b7777777-7777-7777-7777-777777777777', title: 'Vienna Coffee House Circuit', city: 'Vienna', category: 'food',
      creatorId: '33333333-3333-3333-3333-333333333333', creatorInitials: 'MB', creatorColor: '#D4537E', verified: true,
      duration: '1h 15m', distance: '1.5km', priceModel: 'paid', rating: '4.7', price: 99,
      description: 'Vienna\'s coffee houses are UNESCO-listed cultural institutions. Sip where Freud, Klimt, and Trotsky argued over the future.',
      stops: [
        { name: 'Café Central', lat: '48.20950', lng: '16.35830', desc: 'Where Leon Trotsky played chess while planning the Russian Revolution. The piano in the corner has been playing since 1870.' },
        { name: 'Café Sacher', lat: '48.20360', lng: '16.36600', desc: 'Home of the original Sachertorte since 1832. The recipe remains a closely guarded secret — lawsuits have been filed over imitations.' },
        { name: 'Hofburg Palace', lat: '48.20700', lng: '16.36330', desc: 'The Habsburg winter residence for 600 years. Over 2,500 rooms — and the famous Lipizzaner white horses perform in the riding school.' },
        { name: 'Café Hawelka', lat: '48.20240', lng: '16.35400', desc: 'The artists\' café of the 1960s. Bukowski drank here, Warhol visited. The baked potatoes at midnight are legendary.' },
        { name: 'Naschmarkt', lat: '48.20050', lng: '16.35700', desc: 'Vienna\'s largest market since the 16th century. Over 120 stalls selling everything from kaiserschmarrn to Turkish spice.' },
      ],
      costs: [
        { type: 'meals', name: 'Sachertorte at Sacher', price: '7.50' },
        { type: 'meals', name: 'Melange coffee at Central', price: '5.50' },
        { type: 'meals', name: 'Baked potatoes at Hawelka', price: '8.00' },
        { type: 'transport', name: 'All walking', price: '0.00' },
      ],
      nearby: [
        { direction: '↑', name: 'Stephansdom', distance: '0.3km' },
        { direction: '→', name: 'Albertina Museum', distance: '0.4km' },
        { direction: '↓', name: 'Belvedere Palace', distance: '1.2km' },
      ],
      resources: [
        { icon: '🌐', title: 'Vienna tourism', url: 'https://www.wien.info' },
        { icon: '📖', title: 'Viennese coffee house', url: 'https://en.wikipedia.org/wiki/Viennese_coffee_house' },
      ],
    },
    {
      id: 'b8888888-8888-8888-8888-888888888888', title: 'Athens: Birth of Democracy', city: 'Athens', category: 'history',
      creatorId: '44444444-4444-4444-4444-444444444444', creatorInitials: 'SD', creatorColor: '#378ADD', verified: true,
      duration: '2h', distance: '2.8km', priceModel: 'paid', rating: '4.9', price: 99,
      description: 'Where democracy, philosophy, and theatre were invented. Walk the same stones as Socrates and Pericles.',
      stops: [
        { name: 'Acropolis', lat: '37.97153', lng: '23.72567', desc: 'The Parthenon took 15 years to build. Every column leans slightly inward — an optical trick that makes the building appear perfectly straight.' },
        { name: 'Acropolis Museum', lat: '37.96840', lng: '23.72830', desc: 'The glass floor reveals the ancient streets below. The caryatid hall holds five of the six maiden columns — one is in the British Museum.' },
        { name: 'Ancient Agora', lat: '37.97370', lng: '23.72640', desc: 'Where Socrates debated and democracy was practiced daily. The Stoa of Attalos has been perfectly reconstructed as a museum.' },
        { name: 'Plaka District', lat: '37.97300', lng: '23.72750', desc: 'The oldest neighborhood in Athens. Narrow streets, neoclassical houses, and tavernas that haven\'t changed in decades.' },
        { name: 'Temple of Olympian Zeus', lat: '37.96950', lng: '23.73300', desc: 'Started in the 6th century BC, finished by the Romans 600 years later. Only 15 of the original 104 columns remain.' },
      ],
      costs: [
        { type: 'tickets', name: 'Acropolis combo ticket', price: '30.00' },
        { type: 'meals', name: 'Souvlaki at Kostas', price: '3.50' },
        { type: 'meals', name: 'Frappé at local café', price: '3.00' },
        { type: 'transport', name: 'All walking', price: '0.00' },
      ],
      nearby: [
        { direction: '↑', name: 'National Garden', distance: '0.5km' },
        { direction: '→', name: 'Panathenaic Stadium', distance: '0.8km' },
        { direction: '↓', name: 'Monastiraki Market', distance: '0.3km' },
      ],
      resources: [
        { icon: '🌐', title: 'Visit Athens', url: 'https://www.visitgreece.gr' },
        { icon: '📖', title: 'Ancient Athens', url: 'https://en.wikipedia.org/wiki/Athens' },
      ],
    },
    {
      id: 'b9999999-9999-9999-9999-999999999999', title: 'Dublin Literary Pub Crawl', city: 'Dublin', category: 'history',
      creatorId: '22222222-2222-2222-2222-222222222222', creatorInitials: 'AL', creatorColor: '#1D9E75', verified: true,
      duration: '1h 45m', distance: '2.2km', priceModel: 'free', rating: '4.6', price: 0,
      description: 'Where Joyce, Wilde, Beckett, and Yeats drank, wrote, and redefined literature. Every pub has a ghost story.',
      stops: [
        { name: 'Trinity College', lat: '53.34380', lng: '-6.25460', desc: 'Founded in 1592. The Long Room library holds 200,000 of the oldest books. The Book of Kells is here — an illuminated manuscript from 800 AD.' },
        { name: 'The Duke Pub', lat: '53.34530', lng: '-6.25380', desc: 'Where Oscar Wilde studied at Trinity and probably first drank. The ceilings are painted with scenes from his plays.' },
        { name: 'Mulligan\'s', lat: '53.34750', lng: '-6.25850', desc: 'Operating since 1782. Joyce mentioned it in Ulysses. The bar staff have been pouring pints here for over 200 years.' },
        { name: 'Sweny\'s Pharmacy', lat: '53.34400', lng: '-6.26000', desc: 'The pharmacy from Ulysses where Leopold Bloom buys lemon soap. It still sells the soap — and hosts daily Joyce readings.' },
        { name: 'The Brazen Head', lat: '53.34600', lng: '-6.26500', desc: 'Dublin\'s oldest pub, established 1198. Ireland\'s first parliament met here. Jonathan Swift, Daniel O\'Connell, and James Joyce all drank here.' },
      ],
      costs: [
        { type: 'meals', name: 'Guinness at Mulligan\'s', price: '5.50' },
        { type: 'meals', name: 'Fish and chips at Leo Burdock\'s', price: '12.00' },
        { type: 'transport', name: 'All walking', price: '0.00' },
      ],
      nearby: [
        { direction: '↑', name: 'GPO (1916 Rising)', distance: '0.5km' },
        { direction: '→', name: 'Temple Bar', distance: '0.4km' },
        { direction: '↓', name: 'St. Stephen\'s Green', distance: '0.7km' },
      ],
      resources: [
        { icon: '🌐', title: 'Dublin tourism', url: 'https://www.dublin.ie' },
        { icon: '📖', title: 'Irish literary revival', url: 'https://en.wikipedia.org/wiki/Irish_Literary_Renaissance' },
      ],
    },
    {
      id: 'baaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', title: 'Kyoto Temple Circuit', city: 'Kyoto', category: 'nature',
      creatorId: '55555555-5555-5555-5555-555555555555', creatorInitials: 'YT', creatorColor: '#BA7517', verified: true,
      duration: '3h', distance: '4.5km', priceModel: 'paid', rating: '4.8', price: 99,
      description: 'Seven centuries of Zen Buddhist architecture in the former imperial capital. Each temple tells a different story of impermanence.',
      stops: [
        { name: 'Kinkaku-ji (Golden Pavilion)', lat: '35.03940', lng: '135.72920', desc: 'The top two floors are covered entirely in gold leaf. A monk burned it down in 1950 out of jealousy — the current building is a 1955 reconstruction.' },
        { name: 'Ryōan-ji', lat: '35.03480', lng: '135.71880', desc: 'The most famous Zen rock garden: 15 stones on white gravel. No matter where you stand, one stone is always hidden from view.' },
        { name: 'Nijo Castle', lat: '35.01420', lng: '135.74820', desc: 'The "nightingale floors" were designed to chirp when walked on — an alarm system against assassins. The Shogun slept here safely.' },
        { name: 'Fushimi Inari Shrine', lat: '34.96710', lng: '135.77270', desc: '10,000 vermillion torii gates wind up the mountain. Each was donated by a business hoping for prosperity — some cost over $10,000.' },
        { name: 'Kiyomizu-dera', lat: '34.99490', lng: '135.78500', desc: 'Built without a single nail. The wooden stage juts out 13 meters over the valley. In spring, 1,500 cherry trees frame the view.' },
      ],
      costs: [
        { type: 'tickets', name: 'Kinkaku-ji', price: '4.00' },
        { type: 'tickets', name: 'Ryōan-ji', price: '5.00' },
        { type: 'tickets', name: 'Nijo Castle', price: '8.00' },
        { type: 'meals', name: 'Matcha and wagashi', price: '6.00' },
        { type: 'transport', name: 'Bus day pass', price: '7.00' },
      ],
      nearby: [
        { direction: '↑', name: 'Kyoto Imperial Palace', distance: '1.5km' },
        { direction: '→', name: 'Gion District', distance: '2.0km' },
        { direction: '↓', name: 'Kyoto Station', distance: '3.0km' },
      ],
      resources: [
        { icon: '🌐', title: 'Kyoto tourism', url: 'https://www.kyoto.travel/en' },
        { icon: '📖', title: 'Zen Buddhism', url: 'https://en.wikipedia.org/wiki/Zen' },
      ],
    },
    {
      id: 'c1111111-1111-1111-1111-111111111111', title: 'Roman Food Tour: Trastevere', city: 'Rome', category: 'food',
      creatorId: '33333333-3333-3333-3333-333333333333', creatorInitials: 'MB', creatorColor: '#D4537E', verified: true,
      duration: '2h', distance: '2.5km', priceModel: 'free', rating: '4.8', price: 0,
      description: 'Eat your way through Trastevere like a local. Four centuries of Roman cuisine in one neighborhood — from supplì to cacio e pepe.',
      stops: [
        { name: 'Testaccio Market', lat: '41.88293', lng: '12.47233', desc: 'The oldest food market in Rome. Every stall has been here for generations. Start with a supplì at the corner fry shop.' },
        { name: 'Da Enzo al 29', lat: '41.88754', lng: '12.47240', desc: 'The most famous trattoria in Trastevere. The cacio e pepe here is the benchmark every other Roman restaurant is measured against.' },
        { name: 'Antico Forno Roscioli', lat: '41.89011', lng: '12.47890', desc: 'A bakery since 1824. The pizza bianca is made with the same recipe and the same wood-fired oven used for two centuries.' },
        { name: 'Piazza Trilussa', lat: '41.88870', lng: '12.47110', desc: 'The heart of Trastevere nightlife. Street musicians play here every night, and the fountain has been here since 1889.' },
        { name: 'Gianicolo Hill', lat: '41.88780', lng: '12.46310', desc: 'The best sunset view in Rome. Every day at noon, a cannon fires from here — you can set your watch by it.' },
      ],
      costs: [
        { type: 'meals', name: 'Supplì + pizza bianca', price: '5.00' },
        { type: 'meals', name: 'Pasta at Da Enzo', price: '12.00' },
        { type: 'meals', name: 'Gelato at Fatamorgana', price: '4.50' },
        { type: 'transport', name: 'All walking', price: '0.00' },
      ],
      nearby: [
        { direction: '↑', name: 'Vatican Museums', distance: '1.8km' },
        { direction: '→', name: 'Piazza Navona', distance: '1.2km' },
        { direction: '↓', name: 'Testaccio', distance: '0.8km' },
      ],
      resources: [
        { icon: '🌐', title: 'Rome food guide', url: 'https://www.eater.com/maps/best-restaurants-rome' },
        { icon: '📖', title: 'Roman cuisine history', url: 'https://en.wikipedia.org/wiki/Roman_cuisine' },
      ],
    },
    {
      id: 'c2222222-2222-2222-2222-222222222222', title: 'Baroque Rome: Bernini & Borromini', city: 'Rome', category: 'architecture',
      creatorId: '44444444-4444-4444-4444-444444444444', creatorInitials: 'SD', creatorColor: '#378ADD', verified: true,
      duration: '2h 30m', distance: '3.5km', priceModel: 'paid', rating: '4.7', price: 99,
      description: 'The rivalry that defined Baroque Rome. Follow the two architects who competed to build the most dramatic churches in the city.',
      stops: [
        { name: 'Piazza Navona', lat: '41.89916', lng: '12.47307', desc: 'Bernini\'s Fountain of the Four Rivers vs. Borromini\'s church across the square. The obelisk is said to be Bernini\'s middle finger pointing at Borromini.' },
        { name: 'Sant\'Ivo alla Sapienza', lat: '41.89611', lng: '12.47410', desc: 'Borromini\'s masterpiece of concave and convex curves. The spiral lantern on top was so original that no one copied it for 300 years.' },
        { name: 'San Carlo alle Quattro Fontane', lat: '41.90260', lng: '12.48710', desc: 'Borromini\'s first independent commission. The undulating facade was scandalous — straight lines were the rule until he broke every one.' },
        { name: 'Sant\'Andrea al Quirinale', lat: '41.90090', lng: '12.48910', desc: 'Bernini\'s response to Borromini. A perfect oval with an illusion of infinite depth. Bernini called it his most satisfying work.' },
        { name: 'Trevi Fountain', lat: '41.90093', lng: '12.48331', desc: 'Nicola Salvi won the commission over Borromini. The fountain is actually the facade of a palace — a theatrical trick of Baroque architecture.' },
      ],
      costs: [
        { type: 'meals', name: 'Coffee at Sant\'Eustachio', price: '4.50' },
        { type: 'meals', name: 'Pizza al taglio at Bonci', price: '5.00' },
        { type: 'transport', name: 'All walking', price: '0.00' },
      ],
      nearby: [
        { direction: '↑', name: 'Pantheon', distance: '0.2km' },
        { direction: '→', name: 'Spanish Steps', distance: '0.8km' },
        { direction: '↓', name: 'Colosseum', distance: '1.5km' },
      ],
      resources: [
        { icon: '🌐', title: 'Rome architecture', url: 'https://www.rome.net/baroque-architecture' },
        { icon: '📖', title: 'Bernini vs Borromini', url: 'https://en.wikipedia.org/wiki/Bernini%E2%80%93Borromini_rivalry' },
      ],
    },
    {
      id: 'c3333333-3333-3333-3333-333333333333', title: 'Vatican Museums & Sistine Chapel', city: 'Rome', category: 'art',
      creatorId: '44444444-4444-4444-4444-444444444444', creatorInitials: 'SD', creatorColor: '#378ADD', verified: true,
      duration: '3h', distance: '2.8km', priceModel: 'paid', rating: '4.9', price: 99,
      description: 'The world\'s largest collection of art under one roof. Navigate the Vatican like a pro and skip the worst crowds.',
      stops: [
        { name: 'Pinecone Courtyard', lat: '41.90651', lng: '12.45740', desc: 'Start here to avoid the main entrance rush. The bronze pinecone is Roman, from the 1st century AD, and is twice your height.' },
        { name: 'Gallery of Maps', lat: '41.90690', lng: '12.45510', desc: '120 meters of ceiling frescoes depicting every region of Italy. The maps are so accurate that you can still navigate by them today.' },
        { name: 'Raphael Rooms', lat: '41.90620', lng: '12.45400', desc: 'Four rooms of Raphael\'s greatest frescoes. The School of Athens here has Plato pointing up and Aristotle pointing down — a summary of Western philosophy.' },
        { name: 'Sistine Chapel', lat: '41.90650', lng: '12.45450', desc: 'Michelangelo painted the ceiling lying on his back for four years. The Creation of Adam\'s finger almost touching is the most reproduced image in art history.' },
        { name: 'St. Peter\'s Basilica', lat: '41.90216', lng: '12.45388', desc: 'The largest church in Christendom. Michelangelo designed the dome at age 71 — it took 11 years to build and changed Rome\'s skyline forever.' },
      ],
      costs: [
        { type: 'tickets', name: 'Vatican Museums + Sistine', price: '17.00' },
        { type: 'meals', name: 'Lunch near Vatican', price: '15.00' },
        { type: 'transport', name: 'Metro line A', price: '1.50' },
      ],
      nearby: [
        { direction: '↑', name: 'Castel Sant\'Angelo', distance: '0.5km' },
        { direction: '→', name: 'Piazza Navona', distance: '1.5km' },
        { direction: '↓', name: 'Trastevere', distance: '1.2km' },
      ],
      resources: [
        { icon: '🌐', title: 'Vatican Museums', url: 'https://www.museivaticani.va' },
        { icon: '📖', title: 'Sistine Chapel ceiling', url: 'https://en.wikipedia.org/wiki/Sistine_Chapel_ceiling' },
      ],
    },
    {
      id: 'c4444444-4444-4444-4444-444444444444', title: 'Appian Way: Walking Through Ruins', city: 'Rome', category: 'nature',
      creatorId: '33333333-3333-3333-3333-333333333333', creatorInitials: 'MB', creatorColor: '#D4537E', verified: true,
      duration: '2h 30m', distance: '5km', priceModel: 'free', rating: '4.6', price: 0,
      description: 'The Queen of Roads — walk on 2,000-year-old cobblestones through pine-lined ruins and underground catacombs.',
      stops: [
        { name: 'Porta San Sebastiano', lat: '41.87930', lng: '12.50430', desc: 'The best-preserved gate in the Aurelian Walls. Built in the 5th century, it still blocks the road exactly as it did when Goths attacked.' },
        { name: 'Villa of the Quintilii', lat: '41.84860', lng: '12.54050', desc: 'A 3rd-century emperor\'s villa so beautiful that Commodus murdered its owners to claim it. The ruins stretch for 20 hectares.' },
        { name: 'Catacombs of San Callisto', lat: '41.85670', lng: '12.53290', desc: '20 kilometers of underground tunnels holding 500,000 bodies. The Popes hid here during persecutions — you can see their tomb markers.' },
        { name: 'Circus of Maxentius', lat: '41.85120', lng: '12.54000', desc: 'The best-preserved Roman circus. You can still see the spina (central barrier) and the starting gates where chariots lined up.' },
        { name: 'Tomb of Cecilia Metella', lat: '41.85370', lng: '12.53710', desc: 'A 1st-century tomb so massive medieval Romans turned it into a fortress. The bas-relief frieze of skulls and bones is hauntingly beautiful.' },
      ],
      costs: [
        { type: 'tickets', name: 'Catacombs entry', price: '8.00' },
        { type: 'meals', name: 'Supper at Cecilia Metella', price: '12.00' },
        { type: 'transport', name: 'Bus 118', price: '1.50' },
      ],
      nearby: [
        { direction: '↑', name: 'Colosseum', distance: '3.5km' },
        { direction: '→', name: 'Ciampino Airport', distance: '5km' },
        { direction: '↓', name: 'Marino', distance: '8km' },
      ],
      resources: [
        { icon: '🌐', title: 'Appian Way Regional Park', url: 'https://www.parcoappiaantica.it' },
        { icon: '📖', title: 'Appian Way history', url: 'https://en.wikipedia.org/wiki/Appian_Way' },
      ],
    },
    {
      id: 'c5555555-5555-5555-5555-555555555555', title: 'Secret Rome: Hidden Characters', city: 'Rome', category: 'characters',
      creatorId: '22222222-2222-2222-2222-222222222222', creatorInitials: 'AL', creatorColor: '#1D9E75', verified: true,
      duration: '1h 45m', distance: '2.2km', priceModel: 'paid', rating: '4.5', price: 99,
      description: 'Meet the eccentrics, madmen, and geniuses who made Rome what it is. Five characters who left their mark on the Eternal City.',
      stops: [
        { name: 'Keats-Shelley House', lat: '41.90660', lng: '12.48230', desc: 'John Keats died here at 25, coughing up blood from tuberculosis. The Spanish Steps were his last view — the apartment is now a museum.' },
        { name: 'Piazza di Spagna', lat: '41.90600', lng: '12.48230', desc: 'Where Grand Tour artists gathered in the 18th century. The steps were designed by Francesco de Sanctis in 1723 — 135 steps of Roman drama.' },
        { name: 'Caffè Greco', lat: '41.90370', lng: '12.48100', desc: 'Rome\'s oldest café, open since 1760. Casanova, Goethe, Keats, Byron, and Liszt all drank here. The walls are covered in their portraits.' },
        { name: 'Pantheon', lat: '41.89860', lng: '12.47690', desc: 'Raphael is buried here — the only artist honored in a building of emperors. The oculus is open to the sky; when it rains, the floor drains through ancient holes.' },
        { name: 'Campo de\' Fiori', lat: '41.89570', lng: '12.47250', desc: 'Giordano Bruno was burned at the stake here in 1600 for suggesting the universe was infinite. His statue still faces the Vatican in silent protest.' },
      ],
      costs: [
        { type: 'tickets', name: 'Keats-Shelley House', price: '6.00' },
        { type: 'meals', name: 'Coffee at Caffè Greco', price: '7.00' },
        { type: 'meals', name: 'Aperitivo at Campo de\' Fiori', price: '8.00' },
        { type: 'transport', name: 'All walking', price: '0.00' },
      ],
      nearby: [
        { direction: '↑', name: 'Villa Borghese', distance: '1.0km' },
        { direction: '→', name: 'Trevi Fountain', distance: '0.5km' },
        { direction: '↓', name: 'Largo Argentina', distance: '0.6km' },
      ],
      resources: [
        { icon: '🌐', title: 'Secret Rome tours', url: 'https://www.secretrome.it' },
        { icon: '📖', title: 'Rome characters', url: 'https://en.wikipedia.org/wiki/Rome' },
      ],
    },
  ];

  for (const guide of newGuides) {
    await db.execute(sql`INSERT INTO guides (id, title, city, category, creator_id, creator_initials, creator_color, verified, duration, distance, price_model, price, rating, description, is_published) VALUES (${guide.id}, ${guide.title}, ${guide.city}, ${guide.category}, ${guide.creatorId}, ${guide.creatorInitials}, ${guide.creatorColor}, ${guide.verified}, ${guide.duration}, ${guide.distance}, ${guide.priceModel}, ${guide.price}, ${guide.rating}, ${guide.description}, true) ON CONFLICT (id) DO NOTHING`);

    for (let i = 0; i < guide.stops.length; i++) {
      const stop = guide.stops[i];
      const stopId = uuidv4();
      await db.execute(sql`INSERT INTO guide_stops (id, guide_id, stop_order, name, description, latitude, longitude) VALUES (${stopId}, ${guide.id}, ${i}, ${stop.name}, ${stop.desc}, ${stop.lat}, ${stop.lng}) ON CONFLICT (id) DO NOTHING`);
    }

    for (const cost of guide.costs) {
      const costId = uuidv4();
      await db.execute(sql`INSERT INTO guide_costs (id, guide_id, type, name, price) VALUES (${costId}, ${guide.id}, ${cost.type}, ${cost.name}, ${cost.price}) ON CONFLICT (id) DO NOTHING`);
    }

    for (const n of guide.nearby) {
      const nearId = uuidv4();
      await db.execute(sql`INSERT INTO guide_nearby (id, guide_id, direction, name, distance) VALUES (${nearId}, ${guide.id}, ${n.direction}, ${n.name}, ${n.distance}) ON CONFLICT (id) DO NOTHING`);
    }

    for (const r of guide.resources) {
      const resId = uuidv4();
      await db.execute(sql`INSERT INTO guide_resources (id, guide_id, icon, title, url) VALUES (${resId}, ${guide.id}, ${r.icon}, ${r.title}, ${r.url}) ON CONFLICT (id) DO NOTHING`);
    }
  }

  console.log('14 guides seeded successfully!');
  process.exit(0);
}

seedGuides().catch((err) => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
