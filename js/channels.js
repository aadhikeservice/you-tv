/**
 * YOU TV - Curated Channel Catalog & EPG Database
 * Pre-populated with curated live channels across all categories.
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

// Default channels list (All 103 live channels)
const DEFAULT_TAMIL_CHANNELS = [
    {
        "id":  "puthiya-thalaimurai",
        "num":  "1",
        "name":  "Puthiya Thalaimurai",
        "tamilName":  "Puthiya Thalaimurai",
        "category":  "news",
        "categoryName":  "News",
        "logo":  "https://upload.wikimedia.org/wikipedia/en/thumb/e/e0/Puthiya_Thalaimurai_TV_Logo.png/220px-Puthiya_Thalaimurai_TV_Logo.png",
        "streamUrl":  "https://segment.yuppcdn.net/240122/puthiya/playlist.m3u8",
        "badge":  "HD",
        "isCustom":  false,
        "description":  "24/7 Live streaming broadcast."
    },
    {
        "id":  "polimer-news",
        "num":  "2",
        "name":  "Polimer News",
        "tamilName":  "Polimer News",
        "category":  "news",
        "categoryName":  "News",
        "logo":  "https://upload.wikimedia.org/wikipedia/en/thumb/9/94/Polimer_News_logo.png/220px-Polimer_News_logo.png",
        "streamUrl":  "https://segment.yuppcdn.net/110322/polimernews/playlist.m3u8",
        "badge":  "HD",
        "isCustom":  false,
        "description":  "24/7 Live streaming broadcast."
    },
    {
        "id":  "thanthi-tv",
        "num":  "3",
        "name":  "Thanthi TV",
        "tamilName":  "Thanthi TV",
        "category":  "news",
        "categoryName":  "News",
        "logo":  "https://upload.wikimedia.org/wikipedia/en/thumb/f/f3/Thanthi_TV_logo.png/220px-Thanthi_TV_logo.png",
        "streamUrl":  "https://vidcdn.vidgyor.com/thanthi-origin/liveabr/thanthi-origin/live1/playlist.m3u8",
        "badge":  "HD",
        "isCustom":  false,
        "description":  "24/7 Live streaming broadcast."
    },
    {
        "id":  "news7-tamil",
        "num":  "4",
        "name":  "News7 Tamil",
        "tamilName":  "News7 Tamil",
        "category":  "news",
        "categoryName":  "News",
        "logo":  "https://upload.wikimedia.org/wikipedia/en/thumb/7/7f/News7_Tamil_logo.png/220px-News7_Tamil_logo.png",
        "streamUrl":  "https://segment.yuppcdn.net/110322/news7/playlist.m3u8",
        "badge":  "HD",
        "isCustom":  false,
        "description":  "24/7 Live streaming broadcast."
    },
    {
        "id":  "news18-tamilnadu",
        "num":  "5",
        "name":  "News18 Tamil Nadu",
        "tamilName":  "News18 Tamil Nadu",
        "category":  "news",
        "categoryName":  "News",
        "logo":  "https://upload.wikimedia.org/wikipedia/commons/thumb/c/cf/News18_Tamil_Nadu_Logo.png/220px-News18_Tamil_Nadu_Logo.png",
        "streamUrl":  "https://nw18live.cdn.jio.com/bpk-tv/News18_Tamil_Nadu_NW18_MOB/output01/index.m3u8",
        "badge":  "HD",
        "isCustom":  false,
        "description":  "24/7 Live streaming broadcast."
    },
    {
        "id":  "sun-news",
        "num":  "6",
        "name":  "Sun News",
        "tamilName":  "Sun News",
        "category":  "news",
        "categoryName":  "News",
        "logo":  "https://upload.wikimedia.org/wikipedia/en/thumb/f/f6/Sun_News_logo.png/220px-Sun_News_logo.png",
        "streamUrl":  "https://segment.yuppcdn.net/110322/sunnews/playlist.m3u8",
        "badge":  "HD",
        "isCustom":  false,
        "description":  "24/7 Live streaming broadcast."
    },
    {
        "id":  "kalaignar-seithigal",
        "num":  "7",
        "name":  "Kalaignar Seithigal",
        "tamilName":  "Kalaignar Seithigal",
        "category":  "news",
        "categoryName":  "News",
        "logo":  "https://upload.wikimedia.org/wikipedia/en/thumb/d/d7/Kalaignar_Seithigal.png/220px-Kalaignar_Seithigal.png",
        "streamUrl":  "https://segment.yuppcdn.net/110322/kalaignarseithigal/playlist.m3u8",
        "badge":  "HD",
        "isCustom":  false,
        "description":  "24/7 Live streaming broadcast."
    },
    {
        "id":  "sathiyam-tv",
        "num":  "8",
        "name":  "Sathiyam TV",
        "tamilName":  "Sathiyam TV",
        "category":  "news",
        "categoryName":  "News",
        "logo":  "https://upload.wikimedia.org/wikipedia/en/thumb/4/4e/Sathiyam_TV_Logo.png/220px-Sathiyam_TV_Logo.png",
        "streamUrl":  "https://segment.yuppcdn.net/110322/sathiyam/playlist.m3u8",
        "badge":  "HD",
        "isCustom":  false,
        "description":  "24/7 Live streaming broadcast."
    },
    {
        "id":  "dd-podhigai",
        "num":  "9",
        "name":  "DD Podhigai",
        "tamilName":  "DD Podhigai",
        "category":  "news",
        "categoryName":  "News",
        "logo":  "https://upload.wikimedia.org/wikipedia/en/thumb/6/6d/Doordarshan_Podhigai_Logo.png/220px-Doordarshan_Podhigai_Logo.png",
        "streamUrl":  "https://segment.yuppcdn.net/110322/ddpodhigai/playlist.m3u8",
        "badge":  "HD",
        "isCustom":  false,
        "description":  "24/7 Live streaming broadcast."
    },
    {
        "id":  "news-j",
        "num":  "10",
        "name":  "News J",
        "tamilName":  "News J",
        "category":  "news",
        "categoryName":  "News",
        "logo":  "https://upload.wikimedia.org/wikipedia/en/thumb/0/07/News_J_logo.png/220px-News_J_logo.png",
        "streamUrl":  "https://segment.yuppcdn.net/110322/newsj/playlist.m3u8",
        "badge":  "HD",
        "isCustom":  false,
        "description":  "24/7 Live streaming broadcast."
    },
    {
        "id":  "malaimurasu-tv",
        "num":  "11",
        "name":  "Malaimurasu Seithigal",
        "tamilName":  "Malaimurasu Seithigal",
        "category":  "news",
        "categoryName":  "News",
        "logo":  "https://upload.wikimedia.org/wikipedia/en/thumb/e/eb/Malai_Murasu_logo.png/220px-Malai_Murasu_logo.png",
        "streamUrl":  "https://segment.yuppcdn.net/110322/malaimurasu/playlist.m3u8",
        "badge":  "HD",
        "isCustom":  false,
        "description":  "24/7 Live streaming broadcast."
    },
    {
        "id":  "ibc-tamil-news",
        "num":  "12",
        "name":  "IBC Tamil News",
        "tamilName":  "IBC Tamil News",
        "category":  "news",
        "categoryName":  "News",
        "logo":  "https://upload.wikimedia.org/wikipedia/en/thumb/c/c5/IBC_Tamil_Logo.png/220px-IBC_Tamil_Logo.png",
        "streamUrl":  "https://segment.yuppcdn.net/110322/ibctamil/playlist.m3u8",
        "badge":  "HD",
        "isCustom":  false,
        "description":  "24/7 Live streaming broadcast."
    },
    {
        "id":  "sun-tv",
        "num":  "13",
        "name":  "Sun TV",
        "tamilName":  "Sun TV",
        "category":  "entertainment",
        "categoryName":  "Entertainment",
        "logo":  "https://upload.wikimedia.org/wikipedia/en/thumb/8/87/Sun_TV_logo.png/220px-Sun_TV_logo.png",
        "streamUrl":  "https://segment.yuppcdn.net/110322/suntv/playlist.m3u8",
        "badge":  "HD",
        "isCustom":  false,
        "description":  "24/7 Live streaming broadcast."
    },
    {
        "id":  "star-vijay",
        "num":  "14",
        "name":  "Star Vijay",
        "tamilName":  "Star Vijay",
        "category":  "entertainment",
        "categoryName":  "Entertainment",
        "logo":  "https://upload.wikimedia.org/wikipedia/en/thumb/0/0a/Star_Vijay_logo.png/220px-Star_Vijay_logo.png",
        "streamUrl":  "https://segment.yuppcdn.net/110322/starvijay/playlist.m3u8",
        "badge":  "HD",
        "isCustom":  false,
        "description":  "24/7 Live streaming broadcast."
    },
    {
        "id":  "zee-tamil",
        "num":  "15",
        "name":  "Zee Tamil",
        "tamilName":  "Zee Tamil",
        "category":  "entertainment",
        "categoryName":  "Entertainment",
        "logo":  "https://upload.wikimedia.org/wikipedia/en/thumb/5/52/Zee_Tamil_logo_2017.png/220px-Zee_Tamil_logo_2017.png",
        "streamUrl":  "https://segment.yuppcdn.net/110322/zeetamil/playlist.m3u8",
        "badge":  "HD",
        "isCustom":  false,
        "description":  "24/7 Live streaming broadcast."
    },
    {
        "id":  "kalaignar-tv",
        "num":  "16",
        "name":  "Kalaignar TV",
        "tamilName":  "Kalaignar TV",
        "category":  "entertainment",
        "categoryName":  "Entertainment",
        "logo":  "https://upload.wikimedia.org/wikipedia/en/thumb/f/f7/Kalaignar_TV_logo.png/220px-Kalaignar_TV_logo.png",
        "streamUrl":  "https://segment.yuppcdn.net/110322/kalaignartv/playlist.m3u8",
        "badge":  "HD",
        "isCustom":  false,
        "description":  "24/7 Live streaming broadcast."
    },
    {
        "id":  "jaya-tv",
        "num":  "17",
        "name":  "Jaya TV",
        "tamilName":  "Jaya TV",
        "category":  "entertainment",
        "categoryName":  "Entertainment",
        "logo":  "https://upload.wikimedia.org/wikipedia/en/thumb/0/06/Jaya_TV_logo.png/220px-Jaya_TV_logo.png",
        "streamUrl":  "https://segment.yuppcdn.net/110322/jayatv/playlist.m3u8",
        "badge":  "HD",
        "isCustom":  false,
        "description":  "24/7 Live streaming broadcast."
    },
    {
        "id":  "raj-tv",
        "num":  "18",
        "name":  "Raj TV",
        "tamilName":  "Raj TV",
        "category":  "entertainment",
        "categoryName":  "Entertainment",
        "logo":  "https://upload.wikimedia.org/wikipedia/en/thumb/e/e4/Raj_TV_Logo.png/220px-Raj_TV_Logo.png",
        "streamUrl":  "https://segment.yuppcdn.net/110322/rajtv/playlist.m3u8",
        "badge":  "HD",
        "isCustom":  false,
        "description":  "24/7 Live streaming broadcast."
    },
    {
        "id":  "captain-tv",
        "num":  "19",
        "name":  "Captain TV",
        "tamilName":  "Captain TV",
        "category":  "entertainment",
        "categoryName":  "Entertainment",
        "logo":  "https://upload.wikimedia.org/wikipedia/en/thumb/f/f6/Captain_TV_logo.png/220px-Captain_TV_logo.png",
        "streamUrl":  "https://segment.yuppcdn.net/110322/captaintv/playlist.m3u8",
        "badge":  "HD",
        "isCustom":  false,
        "description":  "24/7 Live streaming broadcast."
    },
    {
        "id":  "mega-tv",
        "num":  "20",
        "name":  "Mega TV",
        "tamilName":  "Mega TV",
        "category":  "entertainment",
        "categoryName":  "Entertainment",
        "logo":  "https://upload.wikimedia.org/wikipedia/en/thumb/0/0e/Mega_TV_logo.png/220px-Mega_TV_logo.png",
        "streamUrl":  "https://segment.yuppcdn.net/110322/megatv/playlist.m3u8",
        "badge":  "HD",
        "isCustom":  false,
        "description":  "24/7 Live streaming broadcast."
    },
    {
        "id":  "vasanth-tv",
        "num":  "21",
        "name":  "Vasanth TV",
        "tamilName":  "Vasanth TV",
        "category":  "entertainment",
        "categoryName":  "Entertainment",
        "logo":  "https://upload.wikimedia.org/wikipedia/en/thumb/4/4c/Vasanth_TV_logo.png/220px-Vasanth_TV_logo.png",
        "streamUrl":  "https://segment.yuppcdn.net/110322/vasanthtv/playlist.m3u8",
        "badge":  "HD",
        "isCustom":  false,
        "description":  "24/7 Live streaming broadcast."
    },
    {
        "id":  "vendhar-tv",
        "num":  "22",
        "name":  "Vendhar TV",
        "tamilName":  "Vendhar TV",
        "category":  "entertainment",
        "categoryName":  "Entertainment",
        "logo":  "https://upload.wikimedia.org/wikipedia/en/thumb/0/0d/Vendhar_TV_logo.png/220px-Vendhar_TV_logo.png",
        "streamUrl":  "https://segment.yuppcdn.net/110322/vendhartv/playlist.m3u8",
        "badge":  "HD",
        "isCustom":  false,
        "description":  "24/7 Live streaming broadcast."
    },
    {
        "id":  "ktv",
        "num":  "23",
        "name":  "KTV",
        "tamilName":  "KTV",
        "category":  "movies",
        "categoryName":  "Movies",
        "logo":  "https://upload.wikimedia.org/wikipedia/en/thumb/8/82/KTV_Tamil_logo.png/220px-KTV_Tamil_logo.png",
        "streamUrl":  "https://segment.yuppcdn.net/110322/ktv/playlist.m3u8",
        "badge":  "HD",
        "isCustom":  false,
        "description":  "24/7 Live streaming broadcast."
    },
    {
        "id":  "vijay-super",
        "num":  "24",
        "name":  "Vijay Super",
        "tamilName":  "Vijay Super",
        "category":  "movies",
        "categoryName":  "Movies",
        "logo":  "https://upload.wikimedia.org/wikipedia/en/thumb/0/07/Vijay_Super_logo.png/220px-Vijay_Super_logo.png",
        "streamUrl":  "https://segment.yuppcdn.net/110322/vijaysuper/playlist.m3u8",
        "badge":  "HD",
        "isCustom":  false,
        "description":  "24/7 Live streaming broadcast."
    },
    {
        "id":  "zee-thirai",
        "num":  "25",
        "name":  "Zee Thirai",
        "tamilName":  "Zee Thirai",
        "category":  "movies",
        "categoryName":  "Movies",
        "logo":  "https://upload.wikimedia.org/wikipedia/en/thumb/2/29/Zee_Thirai_Logo.png/220px-Zee_Thirai_Logo.png",
        "streamUrl":  "https://segment.yuppcdn.net/110322/zeethirai/playlist.m3u8",
        "badge":  "HD",
        "isCustom":  false,
        "description":  "24/7 Live streaming broadcast."
    },
    {
        "id":  "murasu-tv",
        "num":  "26",
        "name":  "Murasu TV",
        "tamilName":  "Murasu TV",
        "category":  "movies",
        "categoryName":  "Movies",
        "logo":  "https://upload.wikimedia.org/wikipedia/en/thumb/0/05/Murasu_TV_logo.png/220px-Murasu_TV_logo.png",
        "streamUrl":  "https://segment.yuppcdn.net/110322/murasutv/playlist.m3u8",
        "badge":  "HD",
        "isCustom":  false,
        "description":  "24/7 Live streaming broadcast."
    },
    {
        "id":  "raj-digital-plus",
        "num":  "27",
        "name":  "Raj Digital Plus",
        "tamilName":  "Raj Digital Plus",
        "category":  "movies",
        "categoryName":  "Movies",
        "logo":  "https://upload.wikimedia.org/wikipedia/en/thumb/2/2f/Raj_Digital_Plus_logo.png/220px-Raj_Digital_Plus_logo.png",
        "streamUrl":  "https://segment.yuppcdn.net/110322/rajdigital/playlist.m3u8",
        "badge":  "HD",
        "isCustom":  false,
        "description":  "24/7 Live streaming broadcast."
    },
    {
        "id":  "j-movie",
        "num":  "28",
        "name":  "J Movie",
        "tamilName":  "J Movie",
        "category":  "movies",
        "categoryName":  "Movies",
        "logo":  "https://upload.wikimedia.org/wikipedia/en/thumb/d/d4/J_Movies_logo.png/220px-J_Movies_logo.png",
        "streamUrl":  "https://segment.yuppcdn.net/110322/jmovies/playlist.m3u8",
        "badge":  "HD",
        "isCustom":  false,
        "description":  "24/7 Live streaming broadcast."
    },
    {
        "id":  "sun-music",
        "num":  "29",
        "name":  "Sun Music",
        "tamilName":  "Sun Music",
        "category":  "music",
        "categoryName":  "Music",
        "logo":  "https://upload.wikimedia.org/wikipedia/en/thumb/6/6f/Sun_Music_logo.png/220px-Sun_Music_logo.png",
        "streamUrl":  "https://segment.yuppcdn.net/110322/sunmusic/playlist.m3u8",
        "badge":  "HD",
        "isCustom":  false,
        "description":  "24/7 Live streaming broadcast."
    },
    {
        "id":  "isaiaruvi",
        "num":  "30",
        "name":  "Isaiaruvi",
        "tamilName":  "Isaiaruvi",
        "category":  "music",
        "categoryName":  "Music",
        "logo":  "https://upload.wikimedia.org/wikipedia/en/thumb/e/eb/Isaiaruvi_logo.png/220px-Isaiaruvi_logo.png",
        "streamUrl":  "https://segment.yuppcdn.net/110322/isaiaruvi/playlist.m3u8",
        "badge":  "HD",
        "isCustom":  false,
        "description":  "24/7 Live streaming broadcast."
    },
    {
        "id":  "raj-musix-tamil",
        "num":  "31",
        "name":  "Raj Musix",
        "tamilName":  "Raj Musix",
        "category":  "music",
        "categoryName":  "Music",
        "logo":  "https://upload.wikimedia.org/wikipedia/en/thumb/9/94/Raj_Musix_Tamil_logo.png/220px-Raj_Musix_Tamil_logo.png",
        "streamUrl":  "https://segment.yuppcdn.net/110322/rajmusix/playlist.m3u8",
        "badge":  "HD",
        "isCustom":  false,
        "description":  "24/7 Live streaming broadcast."
    },
    {
        "id":  "jaya-max",
        "num":  "32",
        "name":  "Jaya Max",
        "tamilName":  "Jaya Max",
        "category":  "music",
        "categoryName":  "Music",
        "logo":  "https://upload.wikimedia.org/wikipedia/en/thumb/f/f3/Jaya_Max_logo.png/220px-Jaya_Max_logo.png",
        "streamUrl":  "https://segment.yuppcdn.net/110322/jayamax/playlist.m3u8",
        "badge":  "HD",
        "isCustom":  false,
        "description":  "24/7 Live streaming broadcast."
    },
    {
        "id":  "7s-music",
        "num":  "33",
        "name":  "7S Music",
        "tamilName":  "7S Music",
        "category":  "music",
        "categoryName":  "Music",
        "logo":  "https://upload.wikimedia.org/wikipedia/commons/thumb/c/cd/Tamil_Cinema_Logo.png/220px-Tamil_Cinema_Logo.png",
        "streamUrl":  "https://segment.yuppcdn.net/110322/7smusic/playlist.m3u8",
        "badge":  "HD",
        "isCustom":  false,
        "description":  "24/7 Live streaming broadcast."
    },
    {
        "id":  "adithya-tv",
        "num":  "34",
        "name":  "Adithya TV",
        "tamilName":  "Adithya TV",
        "category":  "comedy",
        "categoryName":  "Comedy",
        "logo":  "https://upload.wikimedia.org/wikipedia/en/thumb/9/91/Adithya_TV_logo.png/220px-Adithya_TV_logo.png",
        "streamUrl":  "https://segment.yuppcdn.net/110322/adithyatv/playlist.m3u8",
        "badge":  "HD",
        "isCustom":  false,
        "description":  "24/7 Live streaming broadcast."
    },
    {
        "id":  "sirippoli",
        "num":  "35",
        "name":  "Sirippoli",
        "tamilName":  "Sirippoli",
        "category":  "comedy",
        "categoryName":  "Comedy",
        "logo":  "https://upload.wikimedia.org/wikipedia/en/thumb/4/47/Sirippoli_logo.png/220px-Sirippoli_logo.png",
        "streamUrl":  "https://segment.yuppcdn.net/110322/sirippoli/playlist.m3u8",
        "badge":  "HD",
        "isCustom":  false,
        "description":  "24/7 Live streaming broadcast."
    },
    {
        "id":  "sri-sankara-tv",
        "num":  "36",
        "name":  "Sri Sankara TV",
        "tamilName":  "Sri Sankara TV",
        "category":  "devotional",
        "categoryName":  "Devotional",
        "logo":  "https://upload.wikimedia.org/wikipedia/en/thumb/d/d7/Sri_Sankara_TV_logo.png/220px-Sri_Sankara_TV_logo.png",
        "streamUrl":  "https://segment.yuppcdn.net/110322/srisankara/playlist.m3u8",
        "badge":  "HD",
        "isCustom":  false,
        "description":  "24/7 Live streaming broadcast."
    },
    {
        "id":  "svbc-tamil",
        "num":  "37",
        "name":  "SVBC Tamil",
        "tamilName":  "SVBC Tamil",
        "category":  "devotional",
        "categoryName":  "Devotional",
        "logo":  "https://upload.wikimedia.org/wikipedia/en/thumb/c/ca/SVBC_Logo.png/220px-SVBC_Logo.png",
        "streamUrl":  "https://segment.yuppcdn.net/110322/svbctamil/playlist.m3u8",
        "badge":  "HD",
        "isCustom":  false,
        "description":  "24/7 Live streaming broadcast."
    },
    {
        "id":  "sai-tv",
        "num":  "38",
        "name":  "Sai TV",
        "tamilName":  "Sai TV",
        "category":  "devotional",
        "categoryName":  "Devotional",
        "logo":  "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e0/Shirdi_Sai_Baba.jpg/220px-Shirdi_Sai_Baba.jpg",
        "streamUrl":  "https://segment.yuppcdn.net/110322/saitv/playlist.m3u8",
        "badge":  "HD",
        "isCustom":  false,
        "description":  "24/7 Live streaming broadcast."
    },
    {
        "id":  "madha-tv",
        "num":  "39",
        "name":  "Madha TV",
        "tamilName":  "Madha TV",
        "category":  "devotional",
        "categoryName":  "Devotional",
        "logo":  "https://upload.wikimedia.org/wikipedia/en/thumb/d/d6/Madha_TV_logo.png/220px-Madha_TV_logo.png",
        "streamUrl":  "https://segment.yuppcdn.net/110322/madhatv/playlist.m3u8",
        "badge":  "HD",
        "isCustom":  false,
        "description":  "24/7 Live streaming broadcast."
    },
    {
        "id":  "angel-tv",
        "num":  "40",
        "name":  "Angel TV",
        "tamilName":  "Angel TV",
        "category":  "devotional",
        "categoryName":  "Devotional",
        "logo":  "https://upload.wikimedia.org/wikipedia/en/thumb/9/93/Angel_TV_logo.png/220px-Angel_TV_logo.png",
        "streamUrl":  "https://segment.yuppcdn.net/110322/angeltv/playlist.m3u8",
        "badge":  "HD",
        "isCustom":  false,
        "description":  "24/7 Live streaming broadcast."
    },
    {
        "id":  "nambikkai-tv",
        "num":  "41",
        "name":  "Nambikkai TV",
        "tamilName":  "Nambikkai TV",
        "category":  "devotional",
        "categoryName":  "Devotional",
        "logo":  "https://upload.wikimedia.org/wikipedia/commons/thumb/1/18/Tamil_Nambikkai.png/220px-Tamil_Nambikkai.png",
        "streamUrl":  "https://segment.yuppcdn.net/110322/nambikkaitv/playlist.m3u8",
        "badge":  "HD",
        "isCustom":  false,
        "description":  "24/7 Live streaming broadcast."
    },
    {
        "id":  "chutti-tv",
        "num":  "42",
        "name":  "Chutti TV",
        "tamilName":  "Chutti TV",
        "category":  "kids",
        "categoryName":  "Kids \u0026 Info",
        "logo":  "https://upload.wikimedia.org/wikipedia/en/thumb/d/da/Chutti_TV_logo.png/220px-Chutti_TV_logo.png",
        "streamUrl":  "https://segment.yuppcdn.net/110322/chuttitv/playlist.m3u8",
        "badge":  "HD",
        "isCustom":  false,
        "description":  "24/7 Live streaming broadcast."
    },
    {
        "id":  "chithiram-tv",
        "num":  "43",
        "name":  "Chithiram TV",
        "tamilName":  "Chithiram TV",
        "category":  "kids",
        "categoryName":  "Kids \u0026 Info",
        "logo":  "https://upload.wikimedia.org/wikipedia/en/thumb/f/f0/Chithiram_TV_logo.png/220px-Chithiram_TV_logo.png",
        "streamUrl":  "https://segment.yuppcdn.net/110322/chithiram/playlist.m3u8",
        "badge":  "HD",
        "isCustom":  false,
        "description":  "24/7 Live streaming broadcast."
    },
    {
        "id":  "discovery-tamil",
        "num":  "44",
        "name":  "Discovery Channel Tamil",
        "tamilName":  "Discovery Channel Tamil",
        "category":  "kids",
        "categoryName":  "Kids \u0026 Info",
        "logo":  "https://upload.wikimedia.org/wikipedia/commons/thumb/2/22/Discovery_Channel_logo_2019.svg/220px-Discovery_Channel_logo_2019.svg.png",
        "streamUrl":  "https://segment.yuppcdn.net/110322/discoverytamil/playlist.m3u8",
        "badge":  "HD",
        "isCustom":  false,
        "description":  "24/7 Live streaming broadcast."
    },
    {
        "id":  "history-tv18-tamil",
        "num":  "45",
        "name":  "History TV18 Tamil",
        "tamilName":  "History TV18 Tamil",
        "category":  "kids",
        "categoryName":  "Kids \u0026 Info",
        "logo":  "https://upload.wikimedia.org/wikipedia/commons/thumb/0/05/History_TV18_logo.png/220px-History_TV18_logo.png",
        "streamUrl":  "https://segment.yuppcdn.net/110322/historytamil/playlist.m3u8",
        "badge":  "HD",
        "isCustom":  false,
        "description":  "24/7 Live streaming broadcast."
    },
    {
        "id":  "shakthi-tv",
        "num":  "46",
        "name":  "Shakthi TV",
        "tamilName":  "Shakthi TV",
        "category":  "srilanka",
        "categoryName":  "Sri Lanka \u0026 Global",
        "logo":  "https://upload.wikimedia.org/wikipedia/en/thumb/0/07/Shakthi_TV_logo.png/220px-Shakthi_TV_logo.png",
        "streamUrl":  "https://segment.yuppcdn.net/110322/shakthitv/playlist.m3u8",
        "badge":  "HD",
        "isCustom":  false,
        "description":  "24/7 Live streaming broadcast."
    },
    {
        "id":  "dan-tv",
        "num":  "47",
        "name":  "DAN Tamil Oli",
        "tamilName":  "DAN Tamil Oli",
        "category":  "srilanka",
        "categoryName":  "Sri Lanka \u0026 Global",
        "logo":  "https://upload.wikimedia.org/wikipedia/en/thumb/d/d4/DAN_TV_logo.png/220px-DAN_TV_logo.png",
        "streamUrl":  "https://segment.yuppcdn.net/110322/dantv/playlist.m3u8",
        "badge":  "HD",
        "isCustom":  false,
        "description":  "24/7 Live streaming broadcast."
    },
    {
        "id":  "nethra-tv",
        "num":  "48",
        "name":  "Nethra TV",
        "tamilName":  "Nethra TV",
        "category":  "srilanka",
        "categoryName":  "Sri Lanka \u0026 Global",
        "logo":  "https://upload.wikimedia.org/wikipedia/en/thumb/e/e0/Nethra_TV_logo.png/220px-Nethra_TV_logo.png",
        "streamUrl":  "https://segment.yuppcdn.net/110322/nethratv/playlist.m3u8",
        "badge":  "HD",
        "isCustom":  false,
        "description":  "24/7 Live streaming broadcast."
    },
    {
        "id":  "vasantham-tv",
        "num":  "49",
        "name":  "Vasantham TV",
        "tamilName":  "Vasantham TV",
        "category":  "srilanka",
        "categoryName":  "Sri Lanka \u0026 Global",
        "logo":  "https://upload.wikimedia.org/wikipedia/en/thumb/8/87/Vasantham_TV_logo.png/220px-Vasantham_TV_logo.png",
        "streamUrl":  "https://segment.yuppcdn.net/110322/vasantham/playlist.m3u8",
        "badge":  "HD",
        "isCustom":  false,
        "description":  "24/7 Live streaming broadcast."
    },
    {
        "id":  "deepam-tv",
        "num":  "50",
        "name":  "Deepam TV",
        "tamilName":  "Deepam TV",
        "category":  "srilanka",
        "categoryName":  "Sri Lanka \u0026 Global",
        "logo":  "https://upload.wikimedia.org/wikipedia/commons/thumb/6/65/Deepam_Tamil_Icon.png/220px-Deepam_Tamil_Icon.png",
        "streamUrl":  "https://segment.yuppcdn.net/110322/deepamtv/playlist.m3u8",
        "badge":  "HD",
        "isCustom":  false,
        "description":  "24/7 Live streaming broadcast."
    },
    {
        "id":  "puthuyugam-tv",
        "num":  "51",
        "name":  "Puthuyugam TV",
        "tamilName":  "Puthuyugam TV",
        "category":  "local",
        "categoryName":  "Tamil Local",
        "logo":  "https://upload.wikimedia.org/wikipedia/en/thumb/8/87/Puthuyugam_TV_logo.png/220px-Puthuyugam_TV_logo.png",
        "streamUrl":  "https://d35j504z0x2vu2.cloudfront.net/v1/master/0bc8e8376bd8417a1b6761138aa41c26c7309312/puthuyugam/index.m3u8",
        "badge":  "HD",
        "isCustom":  false,
        "description":  "24/7 Live streaming broadcast."
    },
    {
        "id":  "makkal-tv",
        "num":  "52",
        "name":  "Makkal TV",
        "tamilName":  "Makkal TV",
        "category":  "local",
        "categoryName":  "Tamil Local",
        "logo":  "https://upload.wikimedia.org/wikipedia/en/thumb/9/90/Makkal_TV_logo.png/220px-Makkal_TV_logo.png",
        "streamUrl":  "https://d35j504z0x2vu2.cloudfront.net/v1/master/0bc8e8376bd8417a1b6761138aa41c26c7309312/makkal-tv/index.m3u8",
        "badge":  "HD",
        "isCustom":  false,
        "description":  "24/7 Live streaming broadcast."
    },
    {
        "id":  "lotus-news",
        "num":  "53",
        "name":  "Lotus News",
        "tamilName":  "Lotus News",
        "category":  "local",
        "categoryName":  "Tamil Local",
        "logo":  "https://upload.wikimedia.org/wikipedia/en/thumb/2/2a/Lotus_News_logo.png/220px-Lotus_News_logo.png",
        "streamUrl":  "https://stream.lotusnews.tv/live/index.m3u8",
        "badge":  "HD",
        "isCustom":  false,
        "description":  "24/7 Live streaming broadcast."
    },
    {
        "id":  "cauvery-news",
        "num":  "54",
        "name":  "Cauvery News",
        "tamilName":  "Cauvery News",
        "category":  "local",
        "categoryName":  "Tamil Local",
        "logo":  "https://upload.wikimedia.org/wikipedia/en/thumb/7/7b/Cauvery_News_Logo.png/220px-Cauvery_News_Logo.png",
        "streamUrl":  "https://live.cauverynews.tv/hls/live.m3u8",
        "badge":  "HD",
        "isCustom":  false,
        "description":  "24/7 Live streaming broadcast."
    },
    {
        "id":  "tamilan-tv",
        "num":  "55",
        "name":  "Tamilan TV",
        "tamilName":  "Tamilan TV",
        "category":  "local",
        "categoryName":  "Tamil Local",
        "logo":  "https://upload.wikimedia.org/wikipedia/en/thumb/6/6f/Tamilan_Television_Logo.png/220px-Tamilan_Television_Logo.png",
        "streamUrl":  "https://segment.yuppcdn.net/110322/tamilantv/playlist.m3u8",
        "badge":  "HD",
        "isCustom":  false,
        "description":  "24/7 Live streaming broadcast."
    },
    {
        "id":  "moon-tv",
        "num":  "56",
        "name":  "Moon TV",
        "tamilName":  "Moon TV",
        "category":  "local",
        "categoryName":  "Tamil Local",
        "logo":  "https://upload.wikimedia.org/wikipedia/en/thumb/2/2e/Moon_TV_Logo.png/220px-Moon_TV_Logo.png",
        "streamUrl":  "https://stream.moontv.in/live/stream.m3u8",
        "badge":  "HD",
        "isCustom":  false,
        "description":  "24/7 Live streaming broadcast."
    },
    {
        "id":  "win-tv",
        "num":  "57",
        "name":  "Win TV",
        "tamilName":  "Win TV",
        "category":  "local",
        "categoryName":  "Tamil Local",
        "logo":  "https://upload.wikimedia.org/wikipedia/en/thumb/9/93/Win_TV_logo.png/220px-Win_TV_logo.png",
        "streamUrl":  "https://live.wintv.in/hls/stream.m3u8",
        "badge":  "HD",
        "isCustom":  false,
        "description":  "24/7 Live streaming broadcast."
    },
    {
        "id":  "pepper-tv",
        "num":  "58",
        "name":  "Pepper TV",
        "tamilName":  "Pepper TV",
        "category":  "local",
        "categoryName":  "Tamil Local",
        "logo":  "https://upload.wikimedia.org/wikipedia/en/thumb/b/b3/Peppers_TV_logo.png/220px-Peppers_TV_logo.png",
        "streamUrl":  "https://stream.pepperstv.in/live/index.m3u8",
        "badge":  "HD",
        "isCustom":  false,
        "description":  "24/7 Live streaming broadcast."
    },
    {
        "id":  "velicham-tv",
        "num":  "59",
        "name":  "Velicham TV",
        "tamilName":  "Velicham TV",
        "category":  "local",
        "categoryName":  "Tamil Local",
        "logo":  "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/Velicham_TV.png/220px-Velicham_TV.png",
        "streamUrl":  "https://live.velichamtv.com/hls/live.m3u8",
        "badge":  "HD",
        "isCustom":  false,
        "description":  "24/7 Live streaming broadcast."
    },
    {
        "id":  "thalam-tv",
        "num":  "60",
        "name":  "Thalam TV",
        "tamilName":  "Thalam TV",
        "category":  "local",
        "categoryName":  "Tamil Local",
        "logo":  "https://upload.wikimedia.org/wikipedia/commons/thumb/6/69/Thalam_TV.png/220px-Thalam_TV.png",
        "streamUrl":  "https://live.thalamtv.com/hls/live.m3u8",
        "badge":  "HD",
        "isCustom":  false,
        "description":  "24/7 Live streaming broadcast."
    },
    {
        "id":  "mk-tv",
        "num":  "61",
        "name":  "MK TV",
        "tamilName":  "MK TV",
        "category":  "local",
        "categoryName":  "Tamil Local",
        "logo":  "https://upload.wikimedia.org/wikipedia/commons/thumb/3/37/MK_TV_logo.png/220px-MK_TV_logo.png",
        "streamUrl":  "https://live.mktv.in/hls/live.m3u8",
        "badge":  "HD",
        "isCustom":  false,
        "description":  "24/7 Live streaming broadcast."
    },
    {
        "id":  "PuthuyugamTV.in",
        "num":  "62",
        "name":  "Puthuyugam TV",
        "tamilName":  "Puthuyugam TV",
        "category":  "local",
        "categoryName":  "Tamil Local",
        "logo":  "https://upload.wikimedia.org/wikipedia/en/thumb/8/87/Puthuyugam_TV_logo.png/220px-Puthuyugam_TV_logo.png",
        "streamUrl":  "https://d35j504z0x2vu2.cloudfront.net/v1/master/0bc8e8376bd8417a1b6761138aa41c26c7309312/puthuyugam/index.m3u8",
        "badge":  "HD",
        "isCustom":  false,
        "description":  "24/7 Live streaming broadcast."
    },
    {
        "id":  "MakkalTV.in",
        "num":  "63",
        "name":  "Makkal TV",
        "tamilName":  "Makkal TV",
        "category":  "local",
        "categoryName":  "Tamil Local",
        "logo":  "https://upload.wikimedia.org/wikipedia/en/thumb/9/90/Makkal_TV_logo.png/220px-Makkal_TV_logo.png",
        "streamUrl":  "https://d35j504z0x2vu2.cloudfront.net/v1/master/0bc8e8376bd8417a1b6761138aa41c26c7309312/makkal-tv/index.m3u8",
        "badge":  "HD",
        "isCustom":  false,
        "description":  "24/7 Live streaming broadcast."
    },
    {
        "id":  "LotusNews.in",
        "num":  "64",
        "name":  "Lotus News",
        "tamilName":  "Lotus News",
        "category":  "local",
        "categoryName":  "Tamil Local",
        "logo":  "https://upload.wikimedia.org/wikipedia/en/thumb/2/2a/Lotus_News_logo.png/220px-Lotus_News_logo.png",
        "streamUrl":  "https://stream.lotusnews.tv/live/index.m3u8",
        "badge":  "HD",
        "isCustom":  false,
        "description":  "24/7 Live streaming broadcast."
    },
    {
        "id":  "CauveryNews.in",
        "num":  "65",
        "name":  "Cauvery News",
        "tamilName":  "Cauvery News",
        "category":  "local",
        "categoryName":  "Tamil Local",
        "logo":  "https://upload.wikimedia.org/wikipedia/en/thumb/7/7b/Cauvery_News_Logo.png/220px-Cauvery_News_Logo.png",
        "streamUrl":  "https://live.cauverynews.tv/hls/live.m3u8",
        "badge":  "HD",
        "isCustom":  false,
        "description":  "24/7 Live streaming broadcast."
    },
    {
        "id":  "TamilanTV.in",
        "num":  "66",
        "name":  "Tamilan TV",
        "tamilName":  "Tamilan TV",
        "category":  "local",
        "categoryName":  "Tamil Local",
        "logo":  "https://upload.wikimedia.org/wikipedia/en/thumb/6/6f/Tamilan_Television_Logo.png/220px-Tamilan_Television_Logo.png",
        "streamUrl":  "https://segment.yuppcdn.net/110322/tamilantv/playlist.m3u8",
        "badge":  "HD",
        "isCustom":  false,
        "description":  "24/7 Live streaming broadcast."
    },
    {
        "id":  "MoonTV.in",
        "num":  "67",
        "name":  "Moon TV",
        "tamilName":  "Moon TV",
        "category":  "local",
        "categoryName":  "Tamil Local",
        "logo":  "https://upload.wikimedia.org/wikipedia/en/thumb/2/2e/Moon_TV_Logo.png/220px-Moon_TV_Logo.png",
        "streamUrl":  "https://stream.moontv.in/live/stream.m3u8",
        "badge":  "HD",
        "isCustom":  false,
        "description":  "24/7 Live streaming broadcast."
    },
    {
        "id":  "WinTV.in",
        "num":  "68",
        "name":  "Win TV",
        "tamilName":  "Win TV",
        "category":  "local",
        "categoryName":  "Tamil Local",
        "logo":  "https://upload.wikimedia.org/wikipedia/en/thumb/9/93/Win_TV_logo.png/220px-Win_TV_logo.png",
        "streamUrl":  "https://live.wintv.in/hls/stream.m3u8",
        "badge":  "HD",
        "isCustom":  false,
        "description":  "24/7 Live streaming broadcast."
    },
    {
        "id":  "PepperTV.in",
        "num":  "69",
        "name":  "Pepper TV",
        "tamilName":  "Pepper TV",
        "category":  "local",
        "categoryName":  "Tamil Local",
        "logo":  "https://upload.wikimedia.org/wikipedia/en/thumb/b/b3/Peppers_TV_logo.png/220px-Peppers_TV_logo.png",
        "streamUrl":  "https://stream.pepperstv.in/live/index.m3u8",
        "badge":  "HD",
        "isCustom":  false,
        "description":  "24/7 Live streaming broadcast."
    },
    {
        "id":  "VelichamTV.in",
        "num":  "70",
        "name":  "Velicham TV",
        "tamilName":  "Velicham TV",
        "category":  "local",
        "categoryName":  "Tamil Local",
        "logo":  "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/Velicham_TV.png/220px-Velicham_TV.png",
        "streamUrl":  "https://live.velichamtv.com/hls/live.m3u8",
        "badge":  "HD",
        "isCustom":  false,
        "description":  "24/7 Live streaming broadcast."
    },
    {
        "id":  "MalarTV.in",
        "num":  "71",
        "name":  "Malar TV",
        "tamilName":  "Malar TV",
        "category":  "local",
        "categoryName":  "Tamil Local",
        "logo":  "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d4/Malar_TV_logo.png/220px-Malar_TV_logo.png",
        "streamUrl":  "https://stream.malartv.com/live/index.m3u8",
        "badge":  "HD",
        "isCustom":  false,
        "description":  "24/7 Live streaming broadcast."
    },
    {
        "id":  "MKTV.in",
        "num":  "72",
        "name":  "MK TV",
        "tamilName":  "MK TV",
        "category":  "local",
        "categoryName":  "Tamil Local",
        "logo":  "https://upload.wikimedia.org/wikipedia/commons/thumb/3/37/MK_TV_logo.png/220px-MK_TV_logo.png",
        "streamUrl":  "https://live.mktv.in/hls/live.m3u8",
        "badge":  "HD",
        "isCustom":  false,
        "description":  "24/7 Live streaming broadcast."
    },
    {
        "id":  "MKSix.in",
        "num":  "73",
        "name":  "MK Six",
        "tamilName":  "MK Six",
        "category":  "local",
        "categoryName":  "Tamil Local",
        "logo":  "https://upload.wikimedia.org/wikipedia/commons/thumb/3/37/MK_TV_logo.png/220px-MK_TV_logo.png",
        "streamUrl":  "https://live.mktv.in/hls/mksix.m3u8",
        "badge":  "HD",
        "isCustom":  false,
        "description":  "24/7 Live streaming broadcast."
    },
    {
        "id":  "ArraTV.in",
        "num":  "74",
        "name":  "Arra TV",
        "tamilName":  "Arra TV",
        "category":  "local",
        "categoryName":  "Tamil Local",
        "logo":  "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1a/Arra_TV.png/220px-Arra_TV.png",
        "streamUrl":  "https://stream.arratv.com/live/index.m3u8",
        "badge":  "HD",
        "isCustom":  false,
        "description":  "24/7 Live streaming broadcast."
    },
    {
        "id":  "VendharTV.in",
        "num":  "75",
        "name":  "Vendhar TV",
        "tamilName":  "Vendhar TV",
        "category":  "local",
        "categoryName":  "Tamil Local",
        "logo":  "https://upload.wikimedia.org/wikipedia/en/thumb/0/05/Vendhar_TV_logo.png/220px-Vendhar_TV_logo.png",
        "streamUrl":  "https://segment.yuppcdn.net/110322/vendhartv/playlist.m3u8",
        "badge":  "HD",
        "isCustom":  false,
        "description":  "24/7 Live streaming broadcast."
    },
    {
        "id":  "CaptainNews.in",
        "num":  "76",
        "name":  "Captain News",
        "tamilName":  "Captain News",
        "category":  "local",
        "categoryName":  "Tamil Local",
        "logo":  "https://upload.wikimedia.org/wikipedia/en/thumb/0/05/Captain_News_logo.png/220px-Captain_News_logo.png",
        "streamUrl":  "https://segment.yuppcdn.net/110322/captainnews/playlist.m3u8",
        "badge":  "HD",
        "isCustom":  false,
        "description":  "24/7 Live streaming broadcast."
    },
    {
        "id":  "CaptainTV.in",
        "num":  "77",
        "name":  "Captain TV",
        "tamilName":  "Captain TV",
        "category":  "local",
        "categoryName":  "Tamil Local",
        "logo":  "https://upload.wikimedia.org/wikipedia/en/thumb/d/d4/Captain_TV_logo.png/220px-Captain_TV_logo.png",
        "streamUrl":  "https://segment.yuppcdn.net/110322/captaintv/playlist.m3u8",
        "badge":  "HD",
        "isCustom":  false,
        "description":  "24/7 Live streaming broadcast."
    },
    {
        "id":  "MegaTV.in",
        "num":  "78",
        "name":  "Mega TV",
        "tamilName":  "Mega TV",
        "category":  "local",
        "categoryName":  "Tamil Local",
        "logo":  "https://upload.wikimedia.org/wikipedia/en/thumb/3/30/Mega_TV_logo.png/220px-Mega_TV_logo.png",
        "streamUrl":  "https://segment.yuppcdn.net/110322/megatv/playlist.m3u8",
        "badge":  "HD",
        "isCustom":  false,
        "description":  "24/7 Live streaming broadcast."
    },
    {
        "id":  "Mega24.in",
        "num":  "79",
        "name":  "Mega 24",
        "tamilName":  "Mega 24",
        "category":  "local",
        "categoryName":  "Tamil Local",
        "logo":  "https://upload.wikimedia.org/wikipedia/en/thumb/3/30/Mega_TV_logo.png/220px-Mega_TV_logo.png",
        "streamUrl":  "https://segment.yuppcdn.net/110322/mega24/playlist.m3u8",
        "badge":  "HD",
        "isCustom":  false,
        "description":  "24/7 Live streaming broadcast."
    },
    {
        "id":  "ThalamTV.in",
        "num":  "80",
        "name":  "Thalam TV",
        "tamilName":  "Thalam TV",
        "category":  "local",
        "categoryName":  "Tamil Local",
        "logo":  "https://upload.wikimedia.org/wikipedia/commons/thumb/6/69/Thalam_TV.png/220px-Thalam_TV.png",
        "streamUrl":  "https://live.thalamtv.com/hls/live.m3u8",
        "badge":  "HD",
        "isCustom":  false,
        "description":  "24/7 Live streaming broadcast."
    },
    {
        "id":  "ImayamTV.in",
        "num":  "81",
        "name":  "Imayam TV",
        "tamilName":  "Imayam TV",
        "category":  "local",
        "categoryName":  "Tamil Local",
        "logo":  "https://upload.wikimedia.org/wikipedia/en/thumb/3/32/Imayam_TV_logo.png/220px-Imayam_TV_logo.png",
        "streamUrl":  "https://live.imayamtv.com/hls/live.m3u8",
        "badge":  "HD",
        "isCustom":  false,
        "description":  "24/7 Live streaming broadcast."
    },
    {
        "id":  "VaanavilTV.in",
        "num":  "82",
        "name":  "Vaanavil TV",
        "tamilName":  "Vaanavil TV",
        "category":  "local",
        "categoryName":  "Tamil Local",
        "logo":  "https://upload.wikimedia.org/wikipedia/commons/thumb/f/fa/Vaanavil_TV.png/220px-Vaanavil_TV.png",
        "streamUrl":  "https://live.vaanaviltv.com/hls/live.m3u8",
        "badge":  "HD",
        "isCustom":  false,
        "description":  "24/7 Live streaming broadcast."
    },
    {
        "id":  "VasanthTV.in",
        "num":  "83",
        "name":  "Vasanth TV",
        "tamilName":  "Vasanth TV",
        "category":  "local",
        "categoryName":  "Tamil Local",
        "logo":  "https://upload.wikimedia.org/wikipedia/en/thumb/5/5a/Vasanth_TV_logo.png/220px-Vasanth_TV_logo.png",
        "streamUrl":  "https://segment.yuppcdn.net/110322/vasanthtv/playlist.m3u8",
        "badge":  "HD",
        "isCustom":  false,
        "description":  "24/7 Live streaming broadcast."
    },
    {
        "id":  "StarTamilTV.in",
        "num":  "84",
        "name":  "Star Tamil TV",
        "tamilName":  "Star Tamil TV",
        "category":  "local",
        "categoryName":  "Tamil Local",
        "logo":  "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/Star_Tamil.png/220px-Star_Tamil.png",
        "streamUrl":  "https://live.startamil.tv/hls/stream.m3u8",
        "badge":  "HD",
        "isCustom":  false,
        "description":  "24/7 Live streaming broadcast."
    },
    {
        "id":  "GTVTamil.in",
        "num":  "85",
        "name":  "GTV Tamil",
        "tamilName":  "GTV Tamil",
        "category":  "local",
        "categoryName":  "Tamil Local",
        "logo":  "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a2/GTV_Tamil.png/220px-GTV_Tamil.png",
        "streamUrl":  "https://live.gtvtamil.com/hls/live.m3u8",
        "badge":  "HD",
        "isCustom":  false,
        "description":  "24/7 Live streaming broadcast."
    },
    {
        "id":  "TVI.in",
        "num":  "86",
        "name":  "TVI Tamil Vision",
        "tamilName":  "TVI Tamil Vision",
        "category":  "local",
        "categoryName":  "Tamil Local",
        "logo":  "https://upload.wikimedia.org/wikipedia/en/thumb/7/77/Tamil_Vision_International_logo.png/220px-Tamil_Vision_International_logo.png",
        "streamUrl":  "https://live.tvi.ca/hls/stream.m3u8",
        "badge":  "HD",
        "isCustom":  false,
        "description":  "24/7 Live streaming broadcast."
    },
    {
        "id":  "PolimerNews.in",
        "num":  "87",
        "name":  "Polimer News",
        "tamilName":  "Polimer News",
        "category":  "local",
        "categoryName":  "Tamil Local",
        "logo":  "https://upload.wikimedia.org/wikipedia/en/thumb/9/94/Polimer_News_logo.png/220px-Polimer_News_logo.png",
        "streamUrl":  "https://segment.yuppcdn.net/110322/polimernews/playlist.m3u8",
        "badge":  "HD",
        "isCustom":  false,
        "description":  "24/7 Live streaming broadcast."
    },
    {
        "id":  "ThanthiTV.in",
        "num":  "88",
        "name":  "Thanthi TV",
        "tamilName":  "Thanthi TV",
        "category":  "local",
        "categoryName":  "Tamil Local",
        "logo":  "https://upload.wikimedia.org/wikipedia/en/thumb/f/f3/Thanthi_TV_logo.png/220px-Thanthi_TV_logo.png",
        "streamUrl":  "https://vidcdn.vidgyor.com/thanthi-origin/liveabr/thanthi-origin/live1/playlist.m3u8",
        "badge":  "HD",
        "isCustom":  false,
        "description":  "24/7 Live streaming broadcast."
    },
    {
        "id":  "PuthiyaThalaimurai.in",
        "num":  "89",
        "name":  "Puthiya Thalaimurai",
        "tamilName":  "Puthiya Thalaimurai",
        "category":  "local",
        "categoryName":  "Tamil Local",
        "logo":  "https://upload.wikimedia.org/wikipedia/en/thumb/e/e0/Puthiya_Thalaimurai_TV_Logo.png/220px-Puthiya_Thalaimurai_TV_Logo.png",
        "streamUrl":  "https://d35j504z0x2vu2.cloudfront.net/v1/master/0bc8e8376bd8417a1b6761138aa41c26c7309312/news-tamil-24x7/index.m3u8",
        "badge":  "HD",
        "isCustom":  false,
        "description":  "24/7 Live streaming broadcast."
    },
    {
        "id":  "News7Tamil.in",
        "num":  "90",
        "name":  "News7 Tamil",
        "tamilName":  "News7 Tamil",
        "category":  "local",
        "categoryName":  "Tamil Local",
        "logo":  "https://upload.wikimedia.org/wikipedia/en/thumb/7/7f/News7_Tamil_logo.png/220px-News7_Tamil_logo.png",
        "streamUrl":  "https://segment.yuppcdn.net/110322/news7/playlist.m3u8",
        "badge":  "HD",
        "isCustom":  false,
        "description":  "24/7 Live streaming broadcast."
    },
    {
        "id":  "SunNews.in",
        "num":  "91",
        "name":  "Sun News",
        "tamilName":  "Sun News",
        "category":  "local",
        "categoryName":  "Tamil Local",
        "logo":  "https://upload.wikimedia.org/wikipedia/en/thumb/f/f6/Sun_News_logo.png/220px-Sun_News_logo.png",
        "streamUrl":  "https://segment.yuppcdn.net/110322/sunnews/playlist.m3u8",
        "badge":  "HD",
        "isCustom":  false,
        "description":  "24/7 Live streaming broadcast."
    },
    {
        "id":  "News18Tamil.in",
        "num":  "92",
        "name":  "News18 Tamil Nadu",
        "tamilName":  "News18 Tamil Nadu",
        "category":  "local",
        "categoryName":  "Tamil Local",
        "logo":  "https://upload.wikimedia.org/wikipedia/commons/thumb/c/cf/News18_Tamil_Nadu_Logo.png/220px-News18_Tamil_Nadu_Logo.png",
        "streamUrl":  "https://nw18live.cdn.jio.com/bpk-tv/News18_Tamil_Nadu_NW18_MOB/output01/index.m3u8",
        "badge":  "HD",
        "isCustom":  false,
        "description":  "24/7 Live streaming broadcast."
    },
    {
        "id":  "SathiyamTV.in",
        "num":  "93",
        "name":  "Sathiyam TV",
        "tamilName":  "Sathiyam TV",
        "category":  "local",
        "categoryName":  "Tamil Local",
        "logo":  "https://upload.wikimedia.org/wikipedia/en/thumb/4/4e/Sathiyam_TV_Logo.png/220px-Sathiyam_TV_Logo.png",
        "streamUrl":  "https://segment.yuppcdn.net/110322/sathiyam/playlist.m3u8",
        "badge":  "HD",
        "isCustom":  false,
        "description":  "24/7 Live streaming broadcast."
    },
    {
        "id":  "NewsJ.in",
        "num":  "94",
        "name":  "News J",
        "tamilName":  "News J",
        "category":  "local",
        "categoryName":  "Tamil Local",
        "logo":  "https://upload.wikimedia.org/wikipedia/en/thumb/0/07/News_J_logo.png/220px-News_J_logo.png",
        "streamUrl":  "https://segment.yuppcdn.net/110322/newsj/playlist.m3u8",
        "badge":  "HD",
        "isCustom":  false,
        "description":  "24/7 Live streaming broadcast."
    },
    {
        "id":  "Malaimurasu.in",
        "num":  "95",
        "name":  "Malaimurasu",
        "tamilName":  "Malaimurasu",
        "category":  "local",
        "categoryName":  "Tamil Local",
        "logo":  "https://upload.wikimedia.org/wikipedia/en/thumb/e/eb/Malai_Murasu_logo.png/220px-Malai_Murasu_logo.png",
        "streamUrl":  "https://segment.yuppcdn.net/110322/malaimurasu/playlist.m3u8",
        "badge":  "HD",
        "isCustom":  false,
        "description":  "24/7 Live streaming broadcast."
    },
    {
        "id":  "KalaignarSeithigal.in",
        "num":  "96",
        "name":  "Kalaignar Seithigal",
        "tamilName":  "Kalaignar Seithigal",
        "category":  "local",
        "categoryName":  "Tamil Local",
        "logo":  "https://upload.wikimedia.org/wikipedia/en/thumb/d/d7/Kalaignar_Seithigal.png/220px-Kalaignar_Seithigal.png",
        "streamUrl":  "https://segment.yuppcdn.net/110322/kalaignarseithigal/playlist.m3u8",
        "badge":  "HD",
        "isCustom":  false,
        "description":  "24/7 Live streaming broadcast."
    },
    {
        "id":  "DDPodhigai.in",
        "num":  "97",
        "name":  "DD Podhigai",
        "tamilName":  "DD Podhigai",
        "category":  "local",
        "categoryName":  "Tamil Local",
        "logo":  "https://upload.wikimedia.org/wikipedia/en/thumb/6/6d/Doordarshan_Podhigai_Logo.png/220px-Doordarshan_Podhigai_Logo.png",
        "streamUrl":  "https://segment.yuppcdn.net/110322/ddpodhigai/playlist.m3u8",
        "badge":  "HD",
        "isCustom":  false,
        "description":  "24/7 Live streaming broadcast."
    },
    {
        "id":  "ShakthiTV.lk",
        "num":  "98",
        "name":  "Shakthi TV",
        "tamilName":  "Shakthi TV",
        "category":  "local",
        "categoryName":  "Tamil Local",
        "logo":  "https://upload.wikimedia.org/wikipedia/en/thumb/8/87/Shakthi_TV_logo.png/220px-Shakthi_TV_logo.png",
        "streamUrl":  "https://segment.yuppcdn.net/110322/shakthitv/playlist.m3u8",
        "badge":  "HD",
        "isCustom":  false,
        "description":  "24/7 Live streaming broadcast."
    },
    {
        "id":  "IBCTamil.uk",
        "num":  "99",
        "name":  "IBC Tamil",
        "tamilName":  "IBC Tamil",
        "category":  "local",
        "categoryName":  "Tamil Local",
        "logo":  "https://upload.wikimedia.org/wikipedia/en/thumb/c/c5/IBC_Tamil_Logo.png/220px-IBC_Tamil_Logo.png",
        "streamUrl":  "https://segment.yuppcdn.net/110322/ibctamil/playlist.m3u8",
        "badge":  "HD",
        "isCustom":  false,
        "description":  "24/7 Live streaming broadcast."
    },
    {
        "id":  "DeepamTV.eu",
        "num":  "100",
        "name":  "Deepam TV",
        "tamilName":  "Deepam TV",
        "category":  "local",
        "categoryName":  "Tamil Local",
        "logo":  "https://upload.wikimedia.org/wikipedia/en/thumb/5/5a/Deepam_TV_logo.png/220px-Deepam_TV_logo.png",
        "streamUrl":  "https://segment.yuppcdn.net/110322/deepamtv/playlist.m3u8",
        "badge":  "HD",
        "isCustom":  false,
        "description":  "24/7 Live streaming broadcast."
    },
    {
        "id":  "DanTamilOli.lk",
        "num":  "101",
        "name":  "Dan Tamil Oli",
        "tamilName":  "Dan Tamil Oli",
        "category":  "local",
        "categoryName":  "Tamil Local",
        "logo":  "https://upload.wikimedia.org/wikipedia/en/thumb/8/80/Dan_TV_logo.png/220px-Dan_TV_logo.png",
        "streamUrl":  "https://segment.yuppcdn.net/110322/dantamiloli/playlist.m3u8",
        "badge":  "HD",
        "isCustom":  false,
        "description":  "24/7 Live streaming broadcast."
    },
    {
        "id":  "NethraTV.lk",
        "num":  "102",
        "name":  "Nethra TV",
        "tamilName":  "Nethra TV",
        "category":  "local",
        "categoryName":  "Tamil Local",
        "logo":  "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c3/Nethra_TV.png/220px-Nethra_TV.png",
        "streamUrl":  "https://segment.yuppcdn.net/110322/nethratv/playlist.m3u8",
        "badge":  "HD",
        "isCustom":  false,
        "description":  "24/7 Live streaming broadcast."
    },
    {
        "id":  "VasanthamTV.lk",
        "num":  "103",
        "name":  "Vasantham TV",
        "tamilName":  "Vasantham TV",
        "category":  "local",
        "categoryName":  "Tamil Local",
        "logo":  "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4b/Vasantham_TV.png/220px-Vasantham_TV.png",
        "streamUrl":  "https://segment.yuppcdn.net/110322/vasanthamtv/playlist.m3u8",
        "badge":  "HD",
        "isCustom":  false,
        "description":  "24/7 Live streaming broadcast."
    }
];

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

  const renames = (typeof SafeStorage !== 'undefined') ? SafeStorage.getJSON('tamil_iptv_category_renames', {}) : {};
  const deleted = (typeof SafeStorage !== 'undefined') ? SafeStorage.getJSON('tamil_iptv_deleted_categories', []) : [];

  // Group channels dynamically by category
  const catGroups = {};

  // Seed with user custom categories so they always show
  if (Array.isArray(customCategories)) {
    customCategories.forEach(c => {
      if (!c || !c.id || deleted.includes(c.id)) return;
      const key = c.id.toString().trim().toLowerCase();
      const displayName = renames[key] || c.name || key;
      catGroups[key] = {
        id: key,
        name: displayName,
        tamil: displayName,
        count: 0,
        isCustomCat: true
      };
    });
  }

  // Count channels in categories
  if (Array.isArray(channels)) {
    channels.forEach(ch => {
      let catKey = (ch.category || 'general').toString().trim().toLowerCase();
      if (!catKey || deleted.includes(catKey)) catKey = 'general';
      if (!catGroups[catKey]) {
        const meta = knownCategoryMeta[catKey];
        const displayName = renames[catKey] || ch.categoryName || (meta ? meta.name : (ch.category || catKey));
        catGroups[catKey] = {
          id: catKey,
          name: displayName,
          tamil: displayName,
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