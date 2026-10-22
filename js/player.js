/**
 * Tamil IPTV - Professional Video Player Engine (Dual Engine: HLS.js + Official 1080p Live Stream)
 * Powered by HLS.js, YouTube Live embed engine, multi-proxy fallback, VLC launcher, and stream recovery.
 */

class IPTVPlayer {
  constructor(options = {}) {
    this.videoElement = options.videoElement;
    this.iframeElement = options.iframeElement;
    this.containerElement = options.containerElement;
    this.osdElement = options.osdElement;
    this.statusBadge = options.statusBadge;
    this.hls = null;
    this.currentChannel = null;
    this.currentStreamIndex = 0; // 0 = primary, 1 = fallback
    this.currentMode = 'live'; // 'live', 'hls', 'proxy'
    this.aspectRatios = ['ratio-16-9', 'ratio-fill', 'ratio-4-3', 'ratio-original'];
    this.currentAspectRatioIndex = 0;
    this.osdTimeout = null;
    this.retryTimeout = null;
    this.hlsWatchdogTimeout = null;
    this.retryCount = 0;
    this.maxRetries = 2;
    // Default to Direct HLS for 0-latency and preservation of relative chunk resolution
    this.corsProxyEnabled = (typeof SafeStorage !== 'undefined' ? SafeStorage.getItem('tamil_iptv_cors_proxy') : 'false') === 'true';
    this.corsProxies = [
      "https://corsproxy.io/?",
      "https://api.allorigins.win/raw?url=",
      "https://api.codetabs.com/v1/proxy?quest="
    ];
    this.currentProxyIndex = 0;

    try {
      this.initEvents();
    } catch (e) {
      console.warn("Failed to init player events:", e);
    }
  }

  initEvents() {
    if (!this.videoElement) return;

    // Save volume changes safely
    this.videoElement.addEventListener('volumechange', () => {
      if (typeof SafeStorage !== 'undefined') {
        SafeStorage.setItem('tamil_iptv_volume', this.videoElement.volume);
        SafeStorage.setItem('tamil_iptv_muted', this.videoElement.muted);
      }
      if (this.onVolumeChange) {
        this.onVolumeChange(this.videoElement.volume, this.videoElement.muted);
      }
    });

    // Always default to unmuted and full volume for automatic audio playback
    this.videoElement.muted = false;
    if (typeof SafeStorage !== 'undefined') {
      const savedVol = SafeStorage.getItem('tamil_iptv_volume');
      if (savedVol !== null && !isNaN(parseFloat(savedVol)) && parseFloat(savedVol) > 0) {
        this.videoElement.volume = parseFloat(savedVol);
      } else {
        this.videoElement.volume = 1.0;
      }
    } else {
      this.videoElement.volume = 1.0;
    }

    // Video events for status monitoring
    this.videoElement.addEventListener('waiting', () => {
      if (this.currentMode !== 'live') {
        this.updateStatus('BUFFERING', 'bg-amber-500/80 text-amber-200');
      }
    });

    this.videoElement.addEventListener('playing', () => {
      clearTimeout(this.hlsWatchdogTimeout);
      this.updateStatus('LIVE (HLS)', 'bg-emerald-500/90 text-white animate-pulse');
      this.retryCount = 0;
      this.showOSD();
      if (this.onStreamReady) this.onStreamReady(this.currentChannel);
    });

    this.videoElement.addEventListener('error', (e) => {
      console.warn("Video element native error:", e);
      if (this.currentMode !== 'live') {
        this.handlePlaybackError("Native Video Error");
      }
    });

    // Auto OSD show on mouse movement in container
    if (this.containerElement) {
      this.containerElement.addEventListener('mousemove', () => {
        this.showOSD();
      });
      this.containerElement.addEventListener('mouseleave', () => {
        this.hideOSD();
      });
    }
  }

  getLiveFeedUrl(channel) {
    if (!channel) return null;
    if (channel.youtubeUrl) return channel.youtubeUrl;
    if (channel.youtubeVideoId) {
      return `https://www.youtube-nocookie.com/embed/${channel.youtubeVideoId}?autoplay=1&mute=0&rel=0`;
    }
    if (channel.youtubeChannelId) {
      return `https://www.youtube-nocookie.com/embed/live_stream?channel=${channel.youtubeChannelId}&autoplay=1&mute=0`;
    }
    return null;
  }

  getLiveWatchUrl(channel) {
    if (!channel) return null;
    if (channel.youtubeLiveWatchUrl) return channel.youtubeLiveWatchUrl;
    if (channel.youtubeChannelId) return `https://www.youtube.com/channel/${channel.youtubeChannelId}/live`;
    if (channel.youtubeUrl) return channel.youtubeUrl;
    return null;
  }

  // Primary entry point to load and play a channel
  loadChannel(channel, mode = 'auto') {
    if (!channel) return;

    this.currentChannel = channel;
    this.currentStreamIndex = 0;
    this.retryCount = 0;
    clearTimeout(this.retryTimeout);
    clearTimeout(this.hlsWatchdogTimeout);
    this.hideErrorBanner();

    if (mode === 'live') {
      this.playLiveFeed(channel);
      return;
    }

    if (mode === 'proxy') {
      this.playHLSStream(channel, true);
      return;
    }

    // Default: try Direct HLS first for 0-latency playback
    this.currentMode = 'hls';
    this.updateSourceModeUI();
    this.showOSD();
    this.playHLSStream(channel, false);
  }

  // Mode 1: Play verified YouTube Embed (if channel provides a valid embed URL or channel ID)
  playLiveFeed(channel) {
    if (!channel) return;
    this.currentMode = 'live';
    this.updateSourceModeUI();
    clearTimeout(this.hlsWatchdogTimeout);
    this.hideErrorBanner();

    // Stop and hide video element
    if (this.hls) {
      this.hls.destroy();
      this.hls = null;
    }
    if (this.videoElement) {
      this.videoElement.pause();
      this.videoElement.src = '';
      this.videoElement.classList.add('hidden');
    }

    const liveEmbedUrl = this.getLiveFeedUrl(channel);
    const liveWatchUrl = this.getLiveWatchUrl(channel);

    if (this.iframeElement && liveEmbedUrl) {
      this.iframeElement.classList.remove('hidden');
      this.iframeElement.src = liveEmbedUrl;
      this.updateStatus('🔴 LIVE FEED (1080p)', 'bg-rose-600 text-white font-black animate-pulse shadow-rose-600/50');
      this.showOSD();
      if (this.onStreamReady) this.onStreamReady(channel);
      return;
    }

    // If embed not available but official stream link exists, open in new tab
    if (liveWatchUrl) {
      window.open(liveWatchUrl, '_blank');
      this.updateStatus('YOUTUBE LIVE ↗', 'bg-rose-600 text-white font-bold');
      if (window.app && window.app.remote) {
        window.app.remote.showToast("Opening Official YouTube Live Feed ↗");
      }
      return;
    }

    // Otherwise fallback to direct HLS
    this.playHLSStream(channel, false);
  }

  // Mode 2 & 3: Play HLS .m3u8 stream (Direct or via CORS Proxy)
  playHLSStream(channel, useProxy = false) {
    if (!channel) return;
    this.currentMode = useProxy ? 'proxy' : 'hls';
    this.updateSourceModeUI();

    // Stop and hide iframe
    if (this.iframeElement) {
      this.iframeElement.src = '';
      this.iframeElement.classList.add('hidden');
    }

    if (this.videoElement) {
      this.videoElement.classList.remove('hidden');
    }

    let streamUrl = this.currentStreamIndex === 0 
      ? channel.streamUrl 
      : (channel.fallbackStreamUrl || channel.streamUrl);

    if (!streamUrl) {
      this.handlePlaybackError("No stream URL available");
      return;
    }

    this.updateStatus(useProxy ? 'CONNECTING (PROXY)...' : 'CONNECTING (HLS)...', 'bg-blue-600 text-white animate-pulse');
    this.showOSD();

    // Destroy existing Hls instance
    if (this.hls) {
      this.hls.destroy();
      this.hls = null;
    }

    // Check HLS.js support (MSE)
    if (window.Hls && window.Hls.isSupported()) {
      const hlsConfig = {
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 60,
        maxBufferLength: 30,
        maxMaxBufferLength: 60,
        manifestLoadingTimeOut: 12000,
        manifestLoadingMaxRetry: 2,
        levelLoadingTimeOut: 12000,
        fragLoadingTimeOut: 15000,
        xhrSetup: function(xhr, url) {
          xhr.withCredentials = false;
        }
      };

      if (useProxy) {
        const proxyPrefix = this.corsProxies[this.currentProxyIndex % this.corsProxies.length];
        class CorsProxyLoader extends window.Hls.DefaultConfig.loader {
          constructor(config) {
            super(config);
            const origLoad = this.load.bind(this);
            this.load = function (context, config, callbacks) {
              const origUrl = context.url;
              if (origUrl && !origUrl.startsWith(proxyPrefix) && !origUrl.includes('corsproxy.io') && !origUrl.includes('allorigins')) {
                context.url = `${proxyPrefix}${encodeURIComponent(origUrl)}`;
              }
              return origLoad(context, config, {
                ...callbacks,
                onSuccess: function (response, stats, ctx, networkDetails) {
                  // Restore context.url to origUrl so relative child references resolve against the real domain!
                  if (ctx) ctx.url = origUrl;
                  if (callbacks.onSuccess) callbacks.onSuccess(response, stats, ctx, networkDetails);
                }
              });
            };
          }
        }
        hlsConfig.loader = CorsProxyLoader;
      }

      this.hls = new window.Hls(hlsConfig);

      this.hls.on(window.Hls.Events.ERROR, (event, data) => {
        if (data.fatal) {
          console.warn("HLS fatal error:", data.type, data.details);
          switch (data.type) {
            case window.Hls.ErrorTypes.NETWORK_ERROR:
              console.log("HLS network/CORS error. Auto-recovering / trying fallback...");
              this.handlePlaybackError("Network Connection Error");
              break;
            case window.Hls.ErrorTypes.MEDIA_ERROR:
              console.log("HLS media error, attempting media recovery...");
              this.hls.recoverMediaError();
              break;
            default:
              this.handlePlaybackError("Fatal Stream Error");
              break;
          }
        }
      });

      this.hls.on(window.Hls.Events.MANIFEST_PARSED, (event, data) => {
        // Automatically play with audio (not muted)
        this.videoElement.muted = false;
        if (!this.videoElement.volume || this.videoElement.volume === 0) {
          this.videoElement.volume = 1.0;
        }

        const playPromise = this.videoElement.play();
        if (playPromise !== undefined) {
          playPromise.catch(err => {
            console.log("Browser policy requested gesture before unmuted audio. Muting temporarily & attaching unmute listener:", err);
            this.videoElement.muted = true;
            this.videoElement.play().then(() => {
              const unmuteHandler = () => {
                if (this.videoElement) {
                  this.videoElement.muted = false;
                  if (!this.videoElement.volume || this.videoElement.volume === 0) {
                    this.videoElement.volume = 1.0;
                  }
                  if (this.onVolumeChange) this.onVolumeChange(this.videoElement.volume, false);
                }
                document.removeEventListener('click', unmuteHandler);
                document.removeEventListener('keydown', unmuteHandler);
                document.removeEventListener('touchstart', unmuteHandler);
              };
              document.addEventListener('click', unmuteHandler, { once: true });
              document.addEventListener('keydown', unmuteHandler, { once: true });
              document.addEventListener('touchstart', unmuteHandler, { once: true });
            }).catch(() => {});
          });
        }

        if (this.onLevelsLoaded && data.levels) {
          this.onLevelsLoaded(data.levels);
        }
      });

      // Pass the REAL streamUrl to loadSource so base URL resolution is always intact!
      this.hls.loadSource(streamUrl);
      this.hls.attachMedia(this.videoElement);

    } else if (this.videoElement && this.videoElement.canPlayType('application/vnd.apple.mpegurl')) {
      // Native HLS (Safari, iOS, TV browsers)
      this.videoElement.muted = false;
      this.videoElement.src = streamUrl;
      this.videoElement.load();
      this.videoElement.play().catch(err => {
        console.log("Native auto-play unmuted blocked, falling back with gesture listener:", err);
        this.videoElement.muted = true;
        this.videoElement.play().catch(() => {});
        const unmuteHandler = () => {
          if (this.videoElement) this.videoElement.muted = false;
        };
        document.addEventListener('click', unmuteHandler, { once: true });
      });
    } else if (this.videoElement) {
      // Fallback direct src
      this.videoElement.muted = false;
      this.videoElement.src = streamUrl;
      this.videoElement.load();
      this.videoElement.play().catch(() => {});
    }
  }

  // Handle stream errors and auto-failover
  handlePlaybackError(errorMsg) {
    clearTimeout(this.hlsWatchdogTimeout);

    // Failover Step 1: If on primary stream, try fallback stream on direct HLS
    if (this.currentStreamIndex === 0 && this.currentChannel && this.currentChannel.fallbackStreamUrl) {
      console.log("Primary direct stream failed. Trying fallback stream...");
      this.currentStreamIndex = 1;
      this.playHLSStream(this.currentChannel, false);
      return;
    }

    // Failover Step 2: Try CORS proxy on primary stream
    if (this.currentMode === 'hls') {
      console.log("Direct stream failed. Retrying with CORS proxy...");
      this.currentStreamIndex = 0;
      this.playHLSStream(this.currentChannel, true);
      return;
    }

    // Failover Step 3: If proxy on primary failed, try proxy on fallback stream
    if (this.currentMode === 'proxy' && this.currentStreamIndex === 0 && this.currentChannel && this.currentChannel.fallbackStreamUrl) {
      console.log("Primary proxy failed. Trying fallback with proxy...");
      this.currentStreamIndex = 1;
      this.playHLSStream(this.currentChannel, true);
      return;
    }

    // Failover Step 4: If HLS streams are offline and channel has YouTube live feed, switch automatically!
    const liveEmbedUrl = this.getLiveFeedUrl(this.currentChannel);
    if (this.currentMode !== 'live' && liveEmbedUrl && this.retryCount === 0) {
      console.log("HLS offline. Switching automatically to Official Live Feed...");
      this.retryCount++;
      if (window.app && window.app.remote) {
        window.app.remote.showToast("Switching to Official Live Feed...");
      }
      this.playLiveFeed(this.currentChannel);
      return;
    }

    // Connection issue: do not show popup overlay with options (per user request)
    this.updateStatus('OFFLINE', 'bg-rose-600 text-white font-bold');
    this.showErrorBanner(this.currentChannel, errorMsg);
  }

  showErrorBanner(channel, errorMsg) {
    // User requested: if connection issue don't show screenshot 2 options
    this.hideErrorBanner();
    if (window.app && window.app.remote && channel) {
      window.app.remote.showToast(`${channel.name} is currently offline.`, 2500);
    }
  }

  hideErrorBanner() {
    const banner = document.getElementById('player-error-banner');
    if (banner) {
      banner.classList.add('hidden');
      banner.classList.remove('flex');
    }
  }

  // Cycle proxy when user clicks retry
  cycleProxy() {
    this.currentProxyIndex = (this.currentProxyIndex + 1) % this.corsProxies.length;
    this.hideErrorBanner();
    if (this.currentChannel) {
      if (window.app && window.app.remote) {
        window.app.remote.showToast(`Retrying with Proxy #${this.currentProxyIndex + 1}...`);
      }
      this.playHLSStream(this.currentChannel, true);
    }
  }

  // Update source switcher UI active states
  updateSourceModeUI() {
    const btnLive = document.getElementById('src-mode-live');
    const btnHls = document.getElementById('src-mode-hls');
    const btnProxy = document.getElementById('src-mode-proxy');

    const setActive = (btn, active) => {
      if (!btn) return;
      if (active) {
        btn.className = "px-2.5 py-1 rounded-lg bg-rose-600 text-white font-bold text-xs flex items-center space-x-1 shadow transition-all ring-1 ring-rose-400";
      } else {
        btn.className = "px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-semibold text-xs flex items-center space-x-1 transition-all";
      }
    };

    setActive(btnLive, this.currentMode === 'live');
    setActive(btnHls, this.currentMode === 'hls');
    setActive(btnProxy, this.currentMode === 'proxy');
  }

  // Open stream in external VLC Media Player (1-click download of .m3u)
  openInVLC() {
    if (!this.currentChannel) return;
    const ch = this.currentChannel;
    const streamUrl = ch.streamUrl || ch.fallbackStreamUrl;
    if (!streamUrl) {
      alert("No stream URL available to open in VLC.");
      return;
    }

    const m3uContent = `#EXTM3U\n#EXTINF:-1 tvg-id="${ch.id}" tvg-name="${ch.name}",${ch.name}\n${streamUrl}\n`;
    const blob = new Blob([m3uContent], { type: 'audio/x-mpegurl;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${ch.id || 'tamil_channel'}.m3u`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    if (window.app && window.app.remote) {
      window.app.remote.showToast("M3U downloaded! Open with VLC Media Player.");
    }
  }

  // Copy raw stream URL to clipboard
  copyStreamUrl() {
    if (!this.currentChannel) return;
    const streamUrl = this.currentChannel.streamUrl || this.currentChannel.fallbackStreamUrl || "";
    if (navigator.clipboard && streamUrl) {
      navigator.clipboard.writeText(streamUrl).then(() => {
        if (window.app && window.app.remote) {
          window.app.remote.showToast("Stream link copied to clipboard!");
        }
      });
    } else {
      prompt("Copy Stream URL:", streamUrl);
    }
  }

  // Play / Pause toggle
  togglePlay() {
    if (this.currentMode === 'live') {
      // Toggle iframe visibility or reload
      if (this.iframeElement) {
        if (this.iframeElement.classList.contains('hidden')) {
          this.iframeElement.classList.remove('hidden');
          this.updateStatus('🔴 LIVE FEED (1080p)', 'bg-rose-600 text-white animate-pulse');
        } else {
          this.iframeElement.classList.add('hidden');
          this.updateStatus('PAUSED', 'bg-slate-700 text-slate-300');
        }
      }
      return;
    }

    if (!this.videoElement) return;
    if (this.videoElement.paused) {
      this.videoElement.play().catch(() => {});
    } else {
      this.videoElement.pause();
      this.updateStatus('PAUSED', 'bg-slate-700 text-slate-300');
    }
  }

  // Volume controls
  setVolume(volume) {
    if (!this.videoElement) return;
    this.videoElement.volume = Math.max(0, Math.min(1, volume));
    if (this.videoElement.muted && volume > 0) {
      this.videoElement.muted = false;
    }
  }

  toggleMute() {
    if (!this.videoElement) return;
    this.videoElement.muted = !this.videoElement.muted;
  }

  // Fullscreen toggle
  toggleFullscreen() {
    const target = this.containerElement || this.videoElement;
    if (!document.fullscreenElement) {
      if (target.requestFullscreen) {
        target.requestFullscreen().catch(() => {});
      } else if (target.webkitRequestFullscreen) {
        target.webkitRequestFullscreen();
      } else if (this.videoElement && this.videoElement.webkitEnterFullscreen) {
        this.videoElement.webkitEnterFullscreen(); // iOS Safari
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
    }
  }

  // Picture in picture (PiP)
  togglePiP() {
    if (this.currentMode === 'live') {
      alert("Picture-in-Picture for YouTube live is available directly in the YouTube player controls (bottom-right of video).");
      return;
    }
    if (!document.pictureInPictureEnabled) {
      alert("Picture-in-Picture is not supported in this browser.");
      return;
    }
    if (document.pictureInPictureElement) {
      document.exitPictureInPicture().catch(() => {});
    } else if (this.videoElement) {
      this.videoElement.requestPictureInPicture().catch(err => {
        console.warn("PiP error:", err);
      });
    }
  }

  // Aspect ratio switcher
  cycleAspectRatio() {
    this.currentAspectRatioIndex = (this.currentAspectRatioIndex + 1) % this.aspectRatios.length;
    const currentClass = this.aspectRatios[this.currentAspectRatioIndex];

    this.aspectRatios.forEach(cls => {
      this.videoElement?.classList.remove(cls);
      this.iframeElement?.classList.remove(cls);
    });

    this.videoElement?.classList.add(currentClass);
    this.iframeElement?.classList.add(currentClass);

    const labels = {
      'ratio-16-9': '16:9 Widescreen',
      'ratio-fill': 'Fill Screen (Zoom)',
      'ratio-4-3': '4:3 Classic',
      'ratio-original': 'Original Aspect'
    };

    return labels[currentClass];
  }

  // Update status badge UI
  updateStatus(text, badgeClasses) {
    if (!this.statusBadge) return;
    this.statusBadge.textContent = text;
    this.statusBadge.className = `px-2.5 py-1 rounded-full text-xs font-bold tracking-wider uppercase transition-all duration-300 shadow-sm ${badgeClasses}`;
  }

  // On-Screen Display (OSD) management
  showOSD() {
    if (!this.osdElement) return;
    this.osdElement.classList.remove('opacity-0', 'pointer-events-none');
    this.osdElement.classList.add('opacity-100');

    clearTimeout(this.osdTimeout);
    this.osdTimeout = setTimeout(() => {
      this.hideOSD();
    }, 4500);
  }

  hideOSD() {
    if (!this.osdElement) return;
    this.osdElement.classList.add('opacity-0', 'pointer-events-none');
    this.osdElement.classList.remove('opacity-100');
  }

  // Cleanup
  destroy() {
    clearTimeout(this.retryTimeout);
    clearTimeout(this.osdTimeout);
    clearTimeout(this.hlsWatchdogTimeout);
    if (this.hls) {
      this.hls.destroy();
      this.hls = null;
    }
    if (this.videoElement) {
      this.videoElement.src = '';
    }
    if (this.iframeElement) {
      this.iframeElement.src = '';
    }
  }
}
