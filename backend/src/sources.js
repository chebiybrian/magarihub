// External car-listing sources for the aggregator (meta-search).
//
// HOW THIS WORKS
// Each source has:
//   - id, name, brand color, country tag
//   - buildSearchUrl(params): a correct deep link that opens that platform
//     already filtered to the buyer's search (make, model, price, etc.)
//   - fetch (optional): if you ever get an official API/feed for a source,
//     add an async fetch(params) that returns listings in the unified shape.
//     Until then, the aggregator returns the deep link so the user searches there in one tap.
//
// The unified listing shape (what the frontend expects):
//   { source, sourceName, sourceColor, title, priceKes, year, county,
//     imageUrl, url, external: true/false }

// Turn "Toyota Vitz 2016" style params into a clean query string
function q(params) {
  return [params.make, params.model, params.q].filter(Boolean).join(' ').trim();
}
const enc = encodeURIComponent;

const SOURCES = [
  {
    id: 'jiji',
    name: 'Jiji Kenya',
    color: '#00a651',
    country: 'Kenya',
    note: 'Largest classifieds — private sellers & dealers',
    buildSearchUrl: (p) => {
      const term = q(p);
      return `https://jiji.co.ke/cars${term ? `?query=${enc(term)}` : ''}`;
    },
  },
  {
    id: 'kaiandkaro',
    name: 'Kai & Karo',
    color: '#e2001a',
    country: 'Kenya',
    note: 'Inspected & financed used cars',
    buildSearchUrl: (p) => {
      const term = q(p);
      return `https://www.kaiandkaro.com/cars${term ? `?search=${enc(term)}` : ''}`;
    },
  },
  {
    id: 'facebook',
    name: 'Facebook Marketplace',
    color: '#1877f2',
    country: 'Kenya',
    note: 'Local private sellers near you',
    buildSearchUrl: (p) => {
      const term = q(p) || 'car';
      // Nairobi marketplace vehicle search; buyer can change location on FB
      let url = `https://www.facebook.com/marketplace/nairobi/search?query=${enc(term)}`;
      if (p.maxPrice) url += `&maxPrice=${Math.round(Number(p.maxPrice))}`;
      return url;
    },
  },
  {
    id: 'beforward',
    name: 'BeForward',
    color: '#ff6a00',
    country: 'Import (Japan)',
    note: 'Japanese imports shipped to Mombasa',
    buildSearchUrl: (p) => {
      // BeForward uses path segments for make/model
      const make = p.make ? enc(p.make.toLowerCase()) : '';
      const model = p.model ? enc(p.model.toLowerCase()) : '';
      if (make && model) return `https://www.beforward.jp/used-cars/${make}/${model}/`;
      if (make) return `https://www.beforward.jp/used-cars/${make}/`;
      const term = q(p);
      return `https://www.beforward.jp/used-cars/?keyword=${enc(term)}`;
    },
  },
  {
    id: 'sbtjapan',
    name: 'SBT Japan',
    color: '#c8102e',
    country: 'Import (Japan)',
    note: 'Japanese imports, RHD for Kenya',
    buildSearchUrl: (p) => {
      const term = q(p);
      return `https://www.sbtjapan.com/used-cars/${term ? `?keyword=${enc(term)}` : ''}`;
    },
  },
  {
    id: 'topcar',
    name: 'Topcar Kenya',
    color: '#111827',
    country: 'Kenya',
    note: 'Dealer & showroom listings',
    buildSearchUrl: (p) => {
      const term = q(p);
      return `https://www.topcar.co.ke/vehicles-for-sale${term ? `?q=${enc(term)}` : ''}`;
    },
  },
  {
    id: 'pigiame',
    name: 'PigiaMe',
    color: '#ff5a00',
    country: 'Kenya',
    note: 'Classifieds — cars & parts',
    buildSearchUrl: (p) => {
      const term = q(p);
      return `https://www.pigiame.co.ke/cars-trucks${term ? `?q=${enc(term)}` : ''}`;
    },
  },
  {
    id: 'autochek',
    name: 'AutoChek',
    color: '#00b37e',
    country: 'Kenya',
    note: 'Inspected cars with financing',
    buildSearchUrl: (p) => {
      const term = q(p);
      return `https://autochek.africa/ke/cars-for-sale${term ? `?query=${enc(term)}` : ''}`;
    },
  },
  {
    id: 'carsawa',
    name: 'Carsawa',
    color: '#6d28d9',
    country: 'Kenya',
    note: 'Instant offers & dealer stock',
    buildSearchUrl: (p) => {
      const term = q(p);
      return `https://carsawa.co.ke/cars${term ? `?search=${enc(term)}` : ''}`;
    },
  },
  {
    id: 'cheki',
    name: 'Cheki / Sokoni',
    color: '#e11d48',
    country: 'Kenya',
    note: 'Long-running car marketplace',
    buildSearchUrl: (p) => {
      const term = q(p);
      return `https://sokoni.cheki.co.ke/cars-for-sale${term ? `?q=${enc(term)}` : ''}`;
    },
  },
  {
    id: 'automark',
    name: 'Automark',
    color: '#0f766e',
    country: 'Kenya',
    note: 'Trusted dealer network (CFAO)',
    buildSearchUrl: (p) => {
      const term = q(p);
      return `https://automark.co.ke/vehicles${term ? `?q=${enc(term)}` : ''}`;
    },
  },
  {
    id: 'copart',
    name: 'Copart',
    color: '#1d4ed8',
    country: 'Import (USA)',
    note: 'US salvage & clean-title auctions',
    buildSearchUrl: (p) => {
      const term = q(p) || 'cars';
      return `https://www.copart.com/lotSearchResults/?query=${enc(term)}`;
    },
  },
  {
    id: 'carfromjapan',
    name: 'Car From Japan',
    color: '#dc2626',
    country: 'Import (Japan)',
    note: 'Direct Japanese imports to Kenya',
    buildSearchUrl: (p) => {
      const make = p.make ? enc(p.make.toLowerCase()) : '';
      if (make) return `https://carfromjapan.com/cheap-used-${make}-for-sale`;
      const term = q(p);
      return `https://carfromjapan.com/search?keyword=${enc(term)}`;
    },
  },
];

// Returns one "search on this platform" card per external source.
// Each is a real deep link pre-filtered to the buyer's search.
function externalSearchLinks(params) {
  return SOURCES.map((s) => ({
    source: s.id,
    sourceName: s.name,
    sourceColor: s.color,
    country: s.country,
    note: s.note,
    url: s.buildSearchUrl(params),
    external: true,
  }));
}

module.exports = { SOURCES, externalSearchLinks };
