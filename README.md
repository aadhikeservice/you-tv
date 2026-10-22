# 📺 தமிழ் Live TV - Tamil IPTV Player & Guide

A sleek, responsive, cinema-grade **Tamil Live TV IPTV Application** designed for Windows PC, Mac, Android, Smart TVs, and mobile browsers.

---

## ✨ Features

- **70+ Curated Tamil Live Television & Local Channels**:
  - 📰 **News (செய்திகள்)**: Puthiya Thalaimurai, Polimer News, Thanthi TV, News7 Tamil, Sun News, News18 Tamil Nadu, Kalaignar Seithigal, Sathiyam TV, DD Podhigai, News J, Malaimurasu, IBC Tamil News.
  - 📡 **Tamil Local & Cable (உள்ளூர் - bit.ly/3h5yNZM)**: Puthuyugam TV, Makkal TV, Lotus News, Cauvery News, Tamilan TV, Moon TV, Win TV, Pepper TV, Velicham TV, Malar TV, MK TV, MK Six, Arra TV, Vendhar TV, Captain TV, Captain News, Mega TV, Mega 24, Thalam TV, Imayam TV, Vaanavil TV, Vasanth TV, Star Tamil TV.
  - 🎬 **Entertainment (பொழுதுபோக்கு)**: Sun TV, Star Vijay, Zee Tamil, Kalaignar TV, Jaya TV, Raj TV, Captain TV, Mega TV, Vasanth TV, Vendhar TV, Shakthi TV, Dan TV, Deepam TV, Nethra TV, Vasantham TV.
  - 🍿 **Movies (திரைப்படங்கள்)**: KTV, Vijay Super, Zee Thirai, Murasu TV, Raj Digital Plus, J Movie.
  - 🎵 **Music (இசை)**: Sun Music, Isaiaruvi, Raj Musix, Jaya Max, 7S Music.
  - 😂 **Comedy (நகைச்சுவை)**: Adithya TV, Sirippoli.
  - 🛕 **Devotional (பக்தி)**: Sri Sankara TV, SVBC Tamil (Tirupati Balaji Live), Sai TV, Madha TV (Velankanni), Angel TV, Nambikkai TV.
  - 👶 **Kids & Learning (சிறுவர் & அறிவு)**: Chutti TV, Chithiram TV, Discovery Channel Tamil, History TV18 Tamil.
  - 🇱🇰 **Sri Lanka & Global (இலங்கை & புலம் பெயர்)**: Shakthi TV, Dan Tamil Oli, Nethra TV, Vasantham TV, Deepam TV Europe.

- **Dual-Engine Cinema Player (1080p Live Stream + HLS.js)**:
  - **Zero-CORS Official 1080p Live Stream**: Directly embeds official 24/7 high-definition broadcasts for top channels (Puthiya Thalaimurai, Polimer News, Thanthi TV, News7 Tamil, Sun News, News18 Tamil Nadu, Kalaignar, Sathiyam TV, News J, Malaimurasu, etc.) without browser CORS blocking.
  - **HLS.js Direct & CORS Proxy Engine**: MediaSource Extensions player with intelligent full-chunk proxy routing (`corsproxy.io`) for raw broadcast `.m3u8` streams.
  - **Auto-Failover Watchdog**: If a raw HLS stream stalls or encounters browser CORS errors, the player seamlessly recovers to the official 1080p live stream within 4 seconds.
  - **1-Click "Open in VLC"**: Downloads an instant `.m3u` file to launch restricted broadcast feeds directly in VLC Media Player (free from browser CORS restrictions).
  - Picture-in-Picture (PiP) and Fullscreen theater mode with dynamic ambient glow matching channel colors.
  - Aspect ratio switcher: `16:9 Widescreen`, `Fill Screen / Zoom`, `4:3 Classic`, `Original`.
  - Stream mode switcher: `🔴 Live Feed (1080p)`, `⚡ HLS (.m3u8)`, `🛡️ Proxy HLS`, `📺 Open in VLC`.

- **Real-Time Electronic Program Guide (EPG)**:
  - Automatic dynamic "Now Playing" and "Up Next" tracker based on current time.
  - Show progress bar with live remaining time calculation.
  - Full 24-hour daily timeline guide modal for every channel.

- **Full M3U / M3U8 Playlist Support**:
  - Built-in M3U playlist parser (`#EXTINF`, `tvg-logo`, `group-title`, `tvg-chno`, `tvg-language`, `tvg-country`).
  - **1-Click Master Playlist Loader**: Pre-configured with **`https://iptv-org.github.io/iptv/index.m3u`** with smart regional and Tamil channel filtering.
  - Import external IPTV playlists via remote URL (`tam.m3u`, `in.m3u`, custom provider URLs).
  - Upload local `.m3u` / `.m3u8` playlist files directly.
  - Export all channels or favorite channels as a `.m3u` playlist for use in VLC, Kodi, or TiviMate.

- **Custom Channel Adder**:
  - Add your own custom Tamil streams with Name, Tamil script title, stream URL, logo, and category.

- **Favorites & Watch History**:
  - ⭐ One-click favorite starring with instant category filtering.
  - 🕒 Tracks recently watched channels automatically in `localStorage`.

- **Virtual TV Remote & Numeric Dialing**:
  - Authentic TV On-Screen Display (OSD): Type `0` `4` on your keyboard to instantly tune to Channel 4.
  - D-Pad navigation, Channel Rockers (CH+ / CH-), Volume Rockers, and Power toggles.

---

## 🚀 How to Run

### Option 1: Instant Launch (No Installation Required!)
Simply double-click **`start-app.bat`** or double-click **`index.html`** in File Explorer (`D:\Web\tamil-iptv\index.html`). It will open instantly in Google Chrome, Microsoft Edge, or Mozilla Firefox.

### Option 2: Run with any Local Web Server
You can also host or serve the directory using any web server:
```powershell
# Using Python (if installed)
cd D:\Web\tamil-iptv
python -m http.server 3000

# Using Node / npx (if installed)
npx serve .
```

---

## ⌨️ TV Remote & Keyboard Shortcuts

| Key | Action |
|---|---|
| `↑` or `W` | **Previous Channel** (CH -) |
| `↓` or `S` | **Next Channel** (CH +) |
| `0` to `9` | **Direct Channel Number Jump** (e.g. `1`, `4` -> Channel 14) |
| `Space` or `K` | **Play / Pause** |
| `←` / `→` | **Volume Down / Up** |
| `M` | **Toggle Mute / Unmute** |
| `F` | **Toggle Fullscreen Mode** |
| `P` | **Toggle Picture-in-Picture (PiP)** |
| `A` | **Cycle Aspect Ratio** (16:9, Fill, 4:3, Original) |
| `G` | **Open EPG TV Guide Timeline** |
| `R` | **Open Virtual TV Remote Control** |
| `Esc` | **Close active modal or overlay** |

---

## 📁 Pre-bundled Playlists Included

- `playlists/tamil_local.m3u`: Comprehensive Tamil Local & Regional Cable channels (`https://bit.ly/3h5yNZM`).
- `playlists/tamil_default.m3u`: Complete 70+ channel master playlist.
- `playlists/tamil_news.m3u`: 24/7 dedicated Tamil news playlist.

---

## 🛠️ Project Structure

```
d:\Web\tamil-iptv\
├── index.html               # Main Single-Page IPTV Application
├── start-app.bat            # 1-Click Windows Launcher
├── service-worker.js        # Offline PWA Caching Engine
├── README.md                # Documentation & User Guide
├── css/
│   └── style.css            # Dark cinema styling, glassmorphism, animations
├── js/
│   ├── app.js               # Application state, UI events, categories, search
│   ├── channels.js          # Catalog of 50+ Tamil channels with logos & EPG
│   ├── epg.js               # Dynamic Electronic Program Guide engine
│   ├── player.js            # Video engine with HLS.js, PiP, aspect ratio, fallback
│   ├── playlist-parser.js   # M3U / M3U8 parser and exporter
│   └── remote.js            # Virtual remote & keyboard dialing controller
├── playlists/
│   ├── tamil_default.m3u    # Master M3U playlist file
│   └── tamil_news.m3u       # Tamil News M3U playlist file
└── assets/
    ├── manifest.json        # Progressive Web App manifest
    └── icons/
        ├── icon-192.svg     # App icon (192x192)
        └── icon-512.svg     # App icon (512x512)
```
