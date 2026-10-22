/**
 * Tamil IPTV - M3U / M3U8 Playlist Parser and Exporter
 * Supports standard IPTV Extended M3U playlists with tvg attributes, group titles, and logos.
 * Handles massive master playlists (e.g. iptv-org/index.m3u) with progressive parsing and smart language/country filtering.
 */

const PlaylistParser = {
  // Parse raw M3U text into an array of channel objects
  parse(m3uText, filter = 'all') {
    if (!m3uText || typeof m3uText !== 'string') return [];

    const lines = m3uText.split(/\r?\n/);
    const channels = [];
    let currentChannel = null;
    let channelNumberCounter = 100;

    const lowerFilter = (filter || 'all').toLowerCase();

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      if (!line) continue;

      if (line.startsWith('#EXTINF:')) {
        currentChannel = this.parseExtInf(line, channelNumberCounter++);
      } else if (line.startsWith('#')) {
        // Additional tags or comments, ignore
        continue;
      } else if (currentChannel && (line.startsWith('http://') || line.startsWith('https://') || line.startsWith('rtmp://'))) {
        currentChannel.streamUrl = line;

        // Categorize if missing
        if (!currentChannel.category) {
          currentChannel.category = this.detectCategory(currentChannel.name, currentChannel.groupTitle);
        }

        // Apply filtering if specified
        let matchesFilter = true;
        if (lowerFilter === 'tam' || lowerFilter === 'tamil') {
          matchesFilter = this.isTamilChannel(currentChannel);
        } else if (lowerFilter === 'in' || lowerFilter === 'india') {
          matchesFilter = this.isIndianChannel(currentChannel);
        }

        if (matchesFilter) {
          channels.push(currentChannel);
        }

        currentChannel = null;
      }
    }

    return channels;
  },

  // Check if a parsed channel is Tamil
  isTamilChannel(ch) {
    if (!ch) return false;
    const lang = (ch.tvgLanguage || '').toLowerCase();
    const id = (ch.tvgId || '').toLowerCase();
    const name = (ch.name || '').toLowerCase();
    const group = (ch.groupTitle || '').toLowerCase();

    // Check language tag
    if (lang === 'tam' || lang.includes('tam')) return true;

    // Check Tamil unicode characters in name
    if (/[\u0B80-\u0BFF]/.test(ch.name)) return true;

    // Check known Tamil TV keywords
    const tamilKeywords = [
      'tamil', 'tamizh', 'sun tv', 'vijay', 'zee tamil', 'kalaignar', 'jaya', 'raj tv',
      'polimer', 'thanthi', 'puthiya thalaimurai', 'news7', 'news18 tamil', 'sun news',
      'sathiyam', 'murasu', 'ktv', 'adithya', 'chutti', 'isaiaruvi', 'shakthi', 'dan tv',
      'vasanth', 'vendhar', 'captain', 'mega tv', 'podhigai', 'deepam', 'nethra', 'vasantham',
      'puthuyugam', 'makkal tv', 'lotus news', 'cauvery news', 'tamilan tv', 'moon tv',
      'win tv', 'pepper', 'velicham', 'malar tv', 'mk tv', 'mk six', 'arra tv', 'thalam',
      'imayam', 'vaanavil', 'local', 'regional'
    ];

    return tamilKeywords.some(kw => name.includes(kw) || id.includes(kw) || group.includes(kw));
  },

  // Check if a parsed channel is Indian
  isIndianChannel(ch) {
    if (!ch) return false;
    const country = (ch.tvgCountry || '').toUpperCase();
    const id = (ch.tvgId || '').toLowerCase();
    if (country === 'IN' || id.endsWith('.in')) return true;
    return this.isTamilChannel(ch);
  },

  // Parse a single #EXTINF line
  parseExtInf(extInfLine, fallbackNumber) {
    // Example: #EXTINF:-1 tvg-id="PolimerNews.in" tvg-name="Polimer News" tvg-logo="https://..." tvg-country="IN" tvg-language="tam" group-title="News",Polimer News
    const commaIndex = extInfLine.lastIndexOf(',');
    let channelName = "Channel";
    if (commaIndex !== -1) {
      channelName = extInfLine.substring(commaIndex + 1).trim();
    }

    // Extract attributes using regex
    const getAttr = (attr) => {
      const match = extInfLine.match(new RegExp(`${attr}="([^"]*)"`, 'i'));
      return match ? match[1] : null;
    };

    const tvgId = getAttr('tvg-id') || '';
    const tvgName = getAttr('tvg-name') || channelName;
    const tvgLogo = getAttr('tvg-logo') || '';
    const groupTitle = getAttr('group-title') || getAttr('group') || '';
    const tvgCountry = getAttr('tvg-country') || '';
    const tvgLanguage = getAttr('tvg-language') || '';
    const tvgChno = getAttr('tvg-chno');

    const cleanId = (tvgId || channelName).toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');

    // Smart auto-enrichment: Check if channel matches any known curated channel
    let matchedCurated = null;
    if (typeof DEFAULT_TAMIL_CHANNELS !== 'undefined' && Array.isArray(DEFAULT_TAMIL_CHANNELS)) {
      const lowerName = (channelName || tvgName).toLowerCase();
      matchedCurated = DEFAULT_TAMIL_CHANNELS.find(k => {
        const kName = k.name.toLowerCase();
        return lowerName.includes(kName) || kName.includes(lowerName) || (k.id && cleanId.includes(k.id));
      });
    }

    return {
      id: `iptv-${cleanId}-${Math.floor(Math.random() * 100000)}`,
      num: tvgChno ? parseInt(tvgChno, 10) : fallbackNumber,
      name: channelName || tvgName,
      tamilName: matchedCurated?.tamilName || this.extractOrInferTamilName(channelName),
      tvgId: tvgId,
      tvgCountry: tvgCountry,
      tvgLanguage: tvgLanguage,
      logo: tvgLogo || matchedCurated?.logo || '',
      groupTitle: groupTitle,
      category: matchedCurated?.category || this.mapGroupToCategory(groupTitle, channelName),
      categoryName: matchedCurated?.categoryName || '',
      badge: matchedCurated?.badge || (tvgCountry ? tvgCountry.toUpperCase() : "IPTV"),
      color: matchedCurated?.color || '#3b82f6',
      youtubeChannelId: matchedCurated?.youtubeChannelId || null,
      youtubeUrl: matchedCurated?.youtubeUrl || null,
      fallbackStreamUrl: matchedCurated?.fallbackStreamUrl || null,
      isCustom: true,
      description: `${channelName} (${groupTitle || tvgCountry || 'General IPTV'})`,
      epgSchedule: matchedCurated?.epgSchedule || []
    };
  },

  // Map playlist group title to standard categories
  mapGroupToCategory(group, name = '') {
    const combined = `${group} ${name}`.toLowerCase();

    if (combined.includes('local') || combined.includes('regional')) return 'local';
    if (combined.includes('news')) return 'news';
    if (combined.includes('movie') || combined.includes('cinema') || combined.includes('film')) return 'movies';
    if (combined.includes('music') || combined.includes('song')) return 'music';
    if (combined.includes('comedy')) return 'comedy';
    if (combined.includes('bhakthi') || combined.includes('devotional') || combined.includes('spirit') || combined.includes('relig')) return 'devotional';
    if (combined.includes('kid') || combined.includes('cartoon') || combined.includes('animation') || combined.includes('child')) return 'kids';
    if (combined.includes('sri lanka') || combined.includes('lanka') || combined.includes('eelam')) return 'srilanka';
    if (combined.includes('entert') || combined.includes('general')) return 'entertainment';

    return 'custom';
  },

  // Detect category from name heuristics
  detectCategory(name, group = '') {
    return this.mapGroupToCategory(group, name);
  },

  extractOrInferTamilName(name) {
    // If name already contains Tamil Unicode characters
    if (/[\u0B80-\u0BFF]/.test(name)) {
      return name;
    }
    return "";
  },

  // Export a list of channels as a downloadable .m3u file
  exportToM3U(channels, filename = "you_tv_playlist.m3u") {
    let content = "#EXTM3U\n";
    content += "#PLAYLIST: YOU TV Playlist\n";
    content += "#DESCRIPTION: Curated Live Television channels with logos and EPG tags\n\n";

    channels.forEach((ch, idx) => {
      const tvgName = (ch.name || "Channel").replace(/"/g, "'");
      const tvgLogo = ch.logo || "";
      const groupTitle = ch.categoryName || ch.category || "Tamil";
      const tvgId = ch.tvgId || ch.id;
      const chNo = ch.num || idx + 1;

      content += `#EXTINF:-1 tvg-id="${tvgId}" tvg-name="${tvgName}" tvg-logo="${tvgLogo}" tvg-chno="${chNo}" group-title="${groupTitle}",${ch.name}\n`;
      content += `${ch.streamUrl || ch.fallbackStreamUrl || ''}\n\n`;
    });

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
};
