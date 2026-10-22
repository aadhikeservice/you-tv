/**
 * Tamil IPTV - Curated Channel Catalog & EPG Database
 * Starts empty - live channels and categories run only after adding/importing.
 */

// Memory fallback cache if localStorage is blocked by browser file:// policy
const _inMemoryStorage = {};

const SafeStorage = {
  getItem(key, fallback = null) {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const val = window.localStorage.getItem(key);
        return val !== null ? val : (_inMemoryStorage[key] ?? fallback);
      }
    } catch (e) {
      // In-memory fallback
    }
    return _inMemoryStorage[key] ?? fallback;
  },
  setItem(key, value) {
    try {
      _inMemoryStorage[key] = String(value);
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, String(value));
      }
    } catch (e) {
      // Storage restricted, fallback memory used
    }
  },
  getJSON(key, fallback = []) {
    try {
      const raw = this.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      return fallback;
    }
  },
  setJSON(key, value) {
    try {
      this.setItem(key, JSON.stringify(value));
    } catch (e) {}
  }
};

// Default channels list (starts empty - channels run only after adding/importing)
const DEFAULT_TAMIL_CHANNELS = [];

// Provide helper to get categories and counts dynamically from loaded channels and custom categories
function getChannelCategories(channels = [], customCategories = []) {
  const categories = [];

  const favs = (typeof SafeStorage !== 'undefined') ? SafeStorage.getJSON('tamil_iptv_favorites', []) : [];
  const favCount = (Array.isArray(channels)) ? channels.filter(c => favs.includes(c.id)).length : 0;

  if (Array.isArray(channels) && channels.length > 0) {
    categories.push({ id: 'all', name: 'All Channels', tamil: 'All Channels', icon: 'tv', count: channels.length });
  }

  if (favCount > 0) {
    categories.push({ id: 'favorites', name: 'Favorites', tamil: 'Favorites', icon: 'star', count: favCount });
  }

  // Known category metadata for English labels
  const knownCategoryMeta = {
    'news': { name: 'News', tamil: 'News' },
    'local': { name: 'Tamil Local', tamil: 'Tamil Local' },
    'entertainment': { name: 'Entertainment', tamil: 'Entertainment' },
    'movies': { name: 'Movies', tamil: 'Movies' },
    'music': { name: 'Music', tamil: 'Music' },
    'comedy': { name: 'Comedy', tamil: 'Comedy' },
    'devotional': { name: 'Devotional', tamil: 'Devotional' },
    'kids': { name: 'Kids & Info', tamil: 'Kids & Info' },
    'sports': { name: 'Sports', tamil: 'Sports' },
    'srilanka': { name: 'Sri Lanka & Global', tamil: 'Sri Lanka & Global' },
    'custom': { name: 'Custom M3U', tamil: 'Custom M3U' },
    'general': { name: 'General', tamil: 'General' }
  };

  // Group channels dynamically by category
  const catGroups = {};

  // Seed with user custom categories so they always show
  if (Array.isArray(customCategories)) {
    customCategories.forEach(c => {
      if (!c || !c.id) return;
      const key = c.id.toString().trim().toLowerCase();
      catGroups[key] = {
        id: key,
        name: c.name || key,
        tamil: c.tamil || c.tamilName || c.name || key,
        count: 0,
        isCustomCat: true
      };
    });
  }

  // Count channels in categories
  if (Array.isArray(channels)) {
    channels.forEach(ch => {
      let catKey = (ch.category || 'general').toString().trim().toLowerCase();
      if (!catKey) catKey = 'general';
      if (!catGroups[catKey]) {
        const meta = knownCategoryMeta[catKey];
        const displayName = ch.categoryName || (meta ? meta.name : (ch.category || catKey));
        const displayTamil = meta ? meta.tamil : (ch.categoryName || ch.category || catKey);
        catGroups[catKey] = {
          id: catKey,
          name: displayName,
          tamil: displayTamil,
          count: 0
        };
      }
      catGroups[catKey].count++;
    });
  }

  // Append all populated categories (or user-created categories)
  Object.values(catGroups).forEach(cat => {
    if (cat.count > 0 || cat.isCustomCat) {
      categories.push(cat);
    }
  });

  return categories;
}

// Generate inline SVG logo avatar for channel as crisp fallback
function generateChannelLogoSvg(name, tamilName, color = '#2563eb') {
  const safeName = name || 'TV';
  const initials = safeName.split(' ').map(w => w[0]).join('').substring(0, 3).toUpperCase();
  const safeColor = color || '#3b82f6';
  return `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="160" height="90" viewBox="0 0 160 90">
    <defs>
      <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${encodeURIComponent(safeColor)}" stop-opacity="0.85" />
        <stop offset="100%" stop-color="#0f172a" />
      </linearGradient>
    </defs>
    <rect width="160" height="90" rx="8" fill="url(%23grad)"/>
    <text x="80" y="44" font-family="system-ui, -apple-system, sans-serif" font-size="20" font-weight="900" fill="%23ffffff" text-anchor="middle" dominant-baseline="central">${encodeURIComponent(initials)}</text>
    <text x="80" y="68" font-family="system-ui, -apple-system, sans-serif" font-size="11" font-weight="600" fill="%2394a3b8" text-anchor="middle" dominant-baseline="central">${encodeURIComponent(safeName.substring(0, 15))}</text>
  </svg>`;
}
