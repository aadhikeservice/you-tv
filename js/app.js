/**
 * YOU TV - Main Application Controller
 * Manages state, playlist parsing, search, categories, favorites, EPG, and UI rendering.
 */

class TamilIPTVApp {
  constructor() {
    this.auth = (typeof AuthManager !== 'undefined') ? new AuthManager() : null;
    this.channels = [];
    this.customChannels = [];
    this.customCategories = [];
    this.deletedChannelIds = [];
    this.pendingDeleteChannelId = null;
    this.editingChannelId = null;
    this.currentChannel = null;
    this.currentCategory = 'all';
    this.searchQuery = '';
    this.favorites = [];
    this.recentChannelIds = [];
    this.isGridView = false;
    this.displayLimit = 60; // Smooth pagination limit
    this.categoryRenames = {};
    this.deletedCategoryIds = [];

    this.player = null;
    this.remote = null;

    this.init();
  }

  init() {
    try {
      // 1. Load local storage states safely
      this.loadStorage();

      // 2. Combine default and custom channels (excluding deleted channels)
      const defaults = (typeof DEFAULT_TAMIL_CHANNELS !== 'undefined' && Array.isArray(DEFAULT_TAMIL_CHANNELS))
        ? DEFAULT_TAMIL_CHANNELS
        : [];
      const combined = [...defaults, ...this.customChannels];
      this.channels = combined.filter(ch => !this.deletedChannelIds.includes(ch.id));
      this.applyCategoryOverrides();

      // 3. Initialize player with dual engine (HLS.js + 1080p Live Stream)
      try {
        this.player = new IPTVPlayer({
          videoElement: document.getElementById('main-video-player'),
          iframeElement: document.getElementById('main-iframe-player'),
          containerElement: document.getElementById('player-container'),
          osdElement: document.getElementById('player-osd'),
          statusBadge: document.getElementById('stream-status-badge')
        });

        this.player.onStreamReady = (channel) => {
          this.updatePlayerInfoUI(channel);
        };

        this.player.onPlaybackError = (channel, error) => {
          this.showPlaybackErrorUI(channel, error);
        };
      } catch (err) {
        console.error("Player initialization error:", err);
      }

      // 4. Initialize remote control & keyboard
      try {
        this.remote = new TVRemoteController(this);
      } catch (err) {
        console.warn("Remote controller initialization error:", err);
      }

      // 5. Initialize DOM event listeners
      try {
        this.bindEvents();
      } catch (err) {
        console.warn("Event binding error:", err);
      }

      // 6. Start Live Clock (Guaranteed)
      try {
        this.startClock();
      } catch (err) {
        console.warn("Clock startup error:", err);
      }

      // 7. Start EPG Progress Loop & Background Watch/Session Monitor
      try {
        this.startEPGUpdater();
        this.startWatchMonitor();
      } catch (err) {
        console.warn("EPG updater / Watch monitor error:", err);
      }

      // 8. Populate category dropdowns & render Categories & Channels
      this.populateCategorySelects();
      this.updateAuthUI();
      this.renderCategories();
      this.renderChannels();

      // 9. Autoplay channel ONLY if authenticated (After login only TV channels will play)
      try {
        if (this.auth && this.auth.isLoggedIn()) {
          const accessible = this.getUserAccessibleChannels();
          const lastWatchedId = (typeof SafeStorage !== 'undefined') 
            ? SafeStorage.getItem('tamil_iptv_last_channel') 
            : null;
          const initialChannel = accessible.find(c => c.id === lastWatchedId) || accessible[0];
          if (initialChannel) {
            this.playChannel(initialChannel);
          } else {
            this.clearPlayerUI();
          }
        } else {
          // Unauthenticated: Lock player and show login prompt
          this.showLoginRequiredUI();
        }
      } catch (err) {
        console.warn("Initial channel playback error:", err);
      }

      // 10. Register Service Worker if supported
      this.registerPWA();
    } catch (criticalErr) {
      console.error("Critical error in TamilIPTVApp.init:", criticalErr);
      // Emergency render fallback
      try {
        this.renderCategories();
        this.renderChannels();
      } catch (e) {}
    }
  }

  loadStorage() {
    try {
      const isClean = (typeof SafeStorage !== 'undefined') ? SafeStorage.getItem('tamil_iptv_clean_v4') : null;
      if (!isClean && typeof SafeStorage !== 'undefined') {
        SafeStorage.setItem('tamil_iptv_clean_v4', '1');
        SafeStorage.setJSON('tamil_iptv_custom_channels', []);
        SafeStorage.setJSON('tamil_iptv_favorites', []);
        SafeStorage.setJSON('tamil_iptv_deleted_channels', []);
        SafeStorage.setJSON('tamil_iptv_category_renames', {});
        SafeStorage.setJSON('tamil_iptv_deleted_categories', []);
        SafeStorage.setItem('tamil_iptv_last_channel', '');
        this.favorites = [];
        this.recentChannelIds = [];
        this.customChannels = [];
        this.deletedChannelIds = [];
        this.categoryRenames = {};
        this.deletedCategoryIds = [];
        return;
      }

      if (typeof SafeStorage !== 'undefined') {
        this.favorites = SafeStorage.getJSON('tamil_iptv_favorites', []);
        this.recentChannelIds = SafeStorage.getJSON('tamil_iptv_recents', []);
        this.customChannels = SafeStorage.getJSON('tamil_iptv_custom_channels', []);
        this.customCategories = SafeStorage.getJSON('tamil_iptv_custom_categories', []);
        this.deletedChannelIds = SafeStorage.getJSON('tamil_iptv_deleted_channels', []);
        this.categoryRenames = SafeStorage.getJSON('tamil_iptv_category_renames', {});
        this.deletedCategoryIds = SafeStorage.getJSON('tamil_iptv_deleted_categories', []);
      } else {
        this.favorites = [];
        this.recentChannelIds = [];
        this.customChannels = [];
        this.customCategories = [];
        this.deletedChannelIds = [];
        this.categoryRenames = {};
        this.deletedCategoryIds = [];
      }
    } catch (e) {
      this.favorites = [];
      this.recentChannelIds = [];
      this.customChannels = [];
      this.customCategories = [];
      this.deletedChannelIds = [];
      this.categoryRenames = {};
      this.deletedCategoryIds = [];
    }
  }

  saveStorage() {
    try {
      if (typeof SafeStorage !== 'undefined') {
        SafeStorage.setJSON('tamil_iptv_favorites', this.favorites);
        SafeStorage.setJSON('tamil_iptv_recents', this.recentChannelIds);
        SafeStorage.setJSON('tamil_iptv_custom_channels', this.customChannels.slice(0, 500));
        SafeStorage.setJSON('tamil_iptv_custom_categories', this.customCategories);
        SafeStorage.setJSON('tamil_iptv_deleted_channels', this.deletedChannelIds);
        SafeStorage.setJSON('tamil_iptv_category_renames', this.categoryRenames);
        SafeStorage.setJSON('tamil_iptv_deleted_categories', this.deletedCategoryIds);
      }
    } catch (e) {
      console.warn("Storage quota limit reached, saving in-memory:", e);
    }
  }

  applyCategoryOverrides() {
    if (!Array.isArray(this.channels)) return;
    this.channels.forEach(ch => {
      if (this.deletedCategoryIds.includes(ch.category)) {
        ch.category = 'general';
        ch.categoryName = 'General';
      }
      if (this.categoryRenames[ch.category]) {
        ch.categoryName = this.categoryRenames[ch.category];
      }
    });
  }

  bindEvents() {
    // Search input
    const searchInput = document.getElementById('channel-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.searchQuery = e.target.value.trim().toLowerCase();
        this.displayLimit = 60;
        this.renderChannels();
      });
      document.getElementById('clear-search-btn')?.addEventListener('click', () => {
        searchInput.value = '';
        this.searchQuery = '';
        this.displayLimit = 60;
        this.renderChannels();
      });
    }

    // View toggle (List vs Grid)
    document.getElementById('toggle-view-btn')?.addEventListener('click', () => {
      this.isGridView = !this.isGridView;
      this.updateViewModeUI();
    });

    // Player controls
    document.getElementById('btn-play-pause')?.addEventListener('click', () => {
      if (!this.auth || !this.auth.isLoggedIn()) {
        this.showLoginRequiredUI();
        this.openModal('login-modal');
        return;
      }
      this.player.togglePlay();
    });
    document.getElementById('btn-prev-channel')?.addEventListener('click', () => this.prevChannel());
    document.getElementById('btn-next-channel')?.addEventListener('click', () => this.nextChannel());
    document.getElementById('btn-fullscreen')?.addEventListener('click', () => this.player.toggleFullscreen());
    document.getElementById('btn-pip')?.addEventListener('click', () => this.player.togglePiP());
    document.getElementById('btn-aspect-ratio')?.addEventListener('click', () => {
      const mode = this.player.cycleAspectRatio();
      this.remote.showToast(`Aspect: ${mode}`);
    });

    // Stream Mode Switchers (Live Feed, HLS, Proxy)
    document.getElementById('src-mode-live')?.addEventListener('click', () => {
      if (!this.auth || !this.auth.isLoggedIn()) { this.openModal('login-modal'); return; }
      if (this.currentChannel) this.player.playLiveFeed(this.currentChannel);
    });
    document.getElementById('src-mode-hls')?.addEventListener('click', () => {
      if (!this.auth || !this.auth.isLoggedIn()) { this.openModal('login-modal'); return; }
      if (this.currentChannel) this.player.playHLSStream(this.currentChannel, false);
    });
    document.getElementById('src-mode-proxy')?.addEventListener('click', () => {
      if (!this.auth || !this.auth.isLoggedIn()) { this.openModal('login-modal'); return; }
      if (this.currentChannel) this.player.playHLSStream(this.currentChannel, true);
    });

    // VLC & Copy URL buttons
    document.getElementById('btn-open-vlc')?.addEventListener('click', () => {
      this.player.openInVLC();
    });
    document.getElementById('btn-copy-stream-url')?.addEventListener('click', () => {
      this.player.copyStreamUrl();
    });

    // Error Overlay Fallback buttons
    document.getElementById('btn-switch-to-live-feed')?.addEventListener('click', () => {
      this.player.hideErrorBanner();
      if (this.currentChannel) this.player.playLiveFeed(this.currentChannel);
    });
    document.getElementById('btn-retry-with-proxy')?.addEventListener('click', () => {
      this.player.cycleProxy();
    });
    document.getElementById('btn-error-open-vlc')?.addEventListener('click', () => {
      this.player.openInVLC();
    });

    // Volume slider & mute
    const volumeSlider = document.getElementById('volume-slider');
    const volumeBtn = document.getElementById('btn-volume');
    if (volumeSlider) {
      volumeSlider.addEventListener('input', (e) => {
        this.player.setVolume(parseFloat(e.target.value));
      });
    }
    if (volumeBtn) {
      volumeBtn.addEventListener('click', () => this.player.toggleMute());
    }

    // Quick Load Master index.m3u header button
    document.getElementById('btn-quick-load-index-m3u')?.addEventListener('click', () => {
      this.loadM3UFromUrl('https://iptv-org.github.io/iptv/index.m3u', 'tam');
    });

    // Quick Load Tamil Local Channels (bit.ly/3h5yNZM) header button
    document.getElementById('btn-quick-load-local-m3u')?.addEventListener('click', () => {
      this.loadM3UFromUrl('https://bit.ly/3h5yNZM', 'all');
    });

    // Preset index.m3u in modal
    document.getElementById('btn-preset-index-m3u')?.addEventListener('click', () => {
      const filter = document.getElementById('m3u-filter-select')?.value || 'tam';
      this.loadM3UFromUrl('https://iptv-org.github.io/iptv/index.m3u', filter);
    });

    // Preset Tamil Local Channels in modal
    document.getElementById('btn-preset-local-m3u')?.addEventListener('click', () => {
      this.loadM3UFromUrl('https://bit.ly/3h5yNZM', 'all');
    });

    // Modal buttons
    document.getElementById('btn-open-remote')?.addEventListener('click', () => {
      this.remote?.toggleVirtualRemote() || this.openModal('virtual-remote-modal');
    });
    document.getElementById('btn-open-import')?.addEventListener('click', () => this.openModal('import-m3u-modal'));
    document.getElementById('btn-open-add-channel')?.addEventListener('click', () => this.openModal('add-channel-modal'));
    document.getElementById('btn-open-epg')?.addEventListener('click', () => this.openEPGModal());
    document.getElementById('btn-open-settings')?.addEventListener('click', () => this.openModal('settings-modal'));
    document.getElementById('btn-open-shortcuts')?.addEventListener('click', () => this.openModal('shortcuts-modal'));

    // Modal close buttons
    document.querySelectorAll('.close-modal-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.remote?.closeAllModals();
        if (typeof closeAppModal === 'function') closeAppModal();
      });
    });

    // Close modal on backdrop click
    document.querySelectorAll('.app-modal').forEach(modal => {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          this.remote?.closeAllModals();
          if (typeof closeAppModal === 'function') closeAppModal();
        }
      });
    });

    // M3U file upload
    const m3uFileInput = document.getElementById('m3u-file-input');
    if (m3uFileInput) {
      m3uFileInput.addEventListener('change', (e) => this.handleFileUpload(e));
    }

    // M3U URL form
    document.getElementById('import-m3u-url-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const url = document.getElementById('m3u-url-input').value.trim();
      const filter = document.getElementById('m3u-filter-select')?.value || 'all';
      if (url) this.loadM3UFromUrl(url, filter);
    });

    // Add Custom Channel form
    document.getElementById('add-channel-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleAddCustomChannel();
    });

    // Export M3U buttons
    document.getElementById('btn-export-m3u')?.addEventListener('click', () => {
      PlaylistParser.exportToM3U(this.channels, "tamil_live_tv_all.m3u");
      this.remote.showToast("Exported all channels to M3U!");
    });
    document.getElementById('btn-export-favs')?.addEventListener('click', () => {
      const favChannels = this.channels.filter(c => this.favorites.includes(c.id));
      if (favChannels.length === 0) {
        this.remote.showToast("No favorite channels to export!");
        return;
      }
      PlaylistParser.exportToM3U(favChannels, "tamil_favorites.m3u");
      this.remote.showToast(`Exported ${favChannels.length} favorites to M3U!`);
    });

    // Edit Channel triggers & form
    document.getElementById('btn-edit-current')?.addEventListener('click', () => {
      if (this.currentChannel) {
        this.openEditChannelModal(this.currentChannel.id);
      } else {
        this.remote?.showToast("No channel currently playing to edit.");
      }
    });

    document.getElementById('edit-channel-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleSaveEditedChannel();
    });

    // Logo preview in Edit Channel modal
    document.getElementById('edit-ch-logo')?.addEventListener('input', (e) => {
      const preview = document.getElementById('edit-logo-preview');
      if (preview) {
        preview.src = e.target.value.trim() || generateChannelLogoSvg('TV', '', '#06b6d4');
      }
    });

    // Inline category toggle for Add Channel
    document.getElementById('custom-ch-category')?.addEventListener('change', (e) => {
      const box = document.getElementById('add-ch-inline-new-cat');
      if (box) {
        if (e.target.value === '__new__') {
          box.classList.remove('hidden');
        } else {
          box.classList.add('hidden');
        }
      }
    });

    // Inline category toggle for Edit Channel
    document.getElementById('edit-ch-category')?.addEventListener('change', (e) => {
      const box = document.getElementById('edit-ch-inline-new-cat');
      if (box) {
        if (e.target.value === '__new__') {
          box.classList.remove('hidden');
        } else {
          box.classList.add('hidden');
        }
      }
    });

    // Quick add category buttons from Add and Edit modals
    document.getElementById('btn-add-quick-add-cat')?.addEventListener('click', () => {
      this.openModal('add-category-modal');
    });
    document.getElementById('btn-edit-quick-add-cat')?.addEventListener('click', () => {
      this.openModal('add-category-modal');
    });

    // Add Category triggers & form
    document.getElementById('btn-open-add-category')?.addEventListener('click', () => {
      this.openModal('add-category-modal');
    });

    document.getElementById('add-category-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = document.getElementById('new-cat-name')?.value;
      const tamil = document.getElementById('new-cat-tamil')?.value;
      if (this.handleAddCategory(name, tamil)) {
        document.getElementById('add-category-form')?.reset();
      }
    });

    // Manage Categories button
    document.getElementById('btn-open-manage-categories')?.addEventListener('click', () => {
      this.openManageCategoriesModal();
    });

    // Edit Category form submit
    document.getElementById('edit-category-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleSaveEditedCategory();
    });

    // Delete Category confirm button
    document.getElementById('btn-confirm-delete-cat')?.addEventListener('click', () => {
      this.handleConfirmDeleteCategory();
    });

    // Preset category chips in Add Category modal
    document.querySelectorAll('.preset-cat-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const nameInput = document.getElementById('new-cat-name');
        const tamilInput = document.getElementById('new-cat-tamil');
        if (nameInput) nameInput.value = chip.getAttribute('data-name') || '';
        if (tamilInput) tamilInput.value = chip.getAttribute('data-tamil') || '';
      });
    });

    // Delete Channel Modal buttons
    document.getElementById('btn-delete-current')?.addEventListener('click', () => {
      if (this.currentChannel) {
        this.confirmDeleteChannel(this.currentChannel.id);
      }
    });
    document.getElementById('btn-cancel-delete')?.addEventListener('click', () => {
      this.closeModal('delete-channel-modal');
    });
    document.getElementById('btn-confirm-delete')?.addEventListener('click', () => {
      if (this.pendingDeleteChannelId) {
        this.deleteChannel(this.pendingDeleteChannelId);
        this.closeModal('delete-channel-modal');
      }
    });

    // Delete All Channels triggers & modal buttons
    document.getElementById('btn-delete-all-channels')?.addEventListener('click', () => {
      this.confirmDeleteAllChannels();
    });
    document.getElementById('btn-delete-all-grid')?.addEventListener('click', () => {
      this.confirmDeleteAllChannels();
    });
    document.getElementById('btn-delete-all-settings')?.addEventListener('click', () => {
      this.confirmDeleteAllChannels();
    });
    document.getElementById('btn-cancel-delete-all')?.addEventListener('click', () => {
      this.closeModal('delete-all-channels-modal');
    });
    document.getElementById('btn-confirm-delete-all')?.addEventListener('click', () => {
      this.deleteAllChannels();
      this.closeModal('delete-all-channels-modal');
    });

    // Authentication & User Management events
    document.addEventListener('click', (e) => {
      const dropdown = document.getElementById('user-profile-dropdown');
      const profileBtn = document.getElementById('btn-user-profile-menu');
      if (dropdown && !dropdown.classList.contains('hidden')) {
        if (!dropdown.contains(e.target) && !profileBtn?.contains(e.target)) {
          dropdown.classList.add('hidden');
        }
      }
    });

    // =========================================================================
    // FULL LOGIN SCREEN EVENT LISTENERS
    // =========================================================================

    // Password visibility toggles across screen and modals
    document.querySelectorAll('.btn-toggle-screen-pw').forEach(btn => {
      btn.addEventListener('click', () => {
        const targetId = btn.getAttribute('data-target');
        const input = document.getElementById(targetId);
        if (input) {
          input.type = input.type === 'password' ? 'text' : 'password';
        }
      });
    });

    // Screen Primary Tabs (User Login vs Admin Portal)
    const screenTabUserBtn = document.getElementById('screen-tab-user-btn');
    const screenTabAdminBtn = document.getElementById('screen-tab-admin-btn');
    const screenUserPanel = document.getElementById('screen-user-panel');
    const screenAdminPanel = document.getElementById('screen-admin-panel');

    const switchScreenToUser = () => {
      screenTabUserBtn?.classList.add('bg-rose-600', 'text-white', 'shadow-md', 'shadow-rose-600/30');
      screenTabUserBtn?.classList.remove('text-slate-400');
      screenTabAdminBtn?.classList.remove('bg-amber-600', 'text-white', 'shadow-md', 'shadow-amber-600/30');
      screenTabAdminBtn?.classList.add('text-slate-400');

      screenUserPanel?.classList.remove('hidden');
      screenAdminPanel?.classList.add('hidden');

      document.getElementById('screen-user-error')?.classList.add('hidden');
      document.getElementById('screen-admin-error')?.classList.add('hidden');
      document.getElementById('screen-adduser-error')?.classList.add('hidden');
      document.getElementById('screen-adduser-success')?.classList.add('hidden');
    };

    const switchScreenToAdmin = () => {
      screenTabAdminBtn?.classList.add('bg-amber-600', 'text-white', 'shadow-md', 'shadow-amber-600/30');
      screenTabAdminBtn?.classList.remove('text-slate-400');
      screenTabUserBtn?.classList.remove('bg-rose-600', 'text-white', 'shadow-md', 'shadow-rose-600/30');
      screenTabUserBtn?.classList.add('text-slate-400');

      screenAdminPanel?.classList.remove('hidden');
      screenUserPanel?.classList.add('hidden');

      document.getElementById('screen-user-error')?.classList.add('hidden');
      document.getElementById('screen-admin-error')?.classList.add('hidden');
      document.getElementById('screen-adduser-error')?.classList.add('hidden');
      document.getElementById('screen-adduser-success')?.classList.add('hidden');
    };

    screenTabUserBtn?.addEventListener('click', switchScreenToUser);
    screenTabAdminBtn?.addEventListener('click', switchScreenToAdmin);

    // Admin Portal Subtabs: Sign In vs Add User
    const adminSubtabSignIn = document.getElementById('admin-subtab-signin');
    const adminSubtabAddUser = document.getElementById('admin-subtab-adduser');
    const adminSubviewSignIn = document.getElementById('admin-subview-signin');
    const adminSubviewAddUser = document.getElementById('admin-subview-adduser');

    const switchAdminSubToSignIn = () => {
      adminSubtabSignIn?.classList.add('bg-amber-600', 'text-white', 'shadow');
      adminSubtabSignIn?.classList.remove('text-slate-400');
      adminSubtabAddUser?.classList.remove('bg-emerald-600', 'text-white', 'shadow');
      adminSubtabAddUser?.classList.add('text-slate-400');

      adminSubviewSignIn?.classList.remove('hidden');
      adminSubviewAddUser?.classList.add('hidden');

      document.getElementById('screen-admin-error')?.classList.add('hidden');
      document.getElementById('screen-adduser-error')?.classList.add('hidden');
      document.getElementById('screen-adduser-success')?.classList.add('hidden');
    };

    const switchAdminSubToAddUser = () => {
      adminSubtabAddUser?.classList.add('bg-emerald-600', 'text-white', 'shadow');
      adminSubtabAddUser?.classList.remove('text-slate-400');
      adminSubtabSignIn?.classList.remove('bg-amber-600', 'text-white', 'shadow');
      adminSubtabSignIn?.classList.add('text-slate-400');

      adminSubviewAddUser?.classList.remove('hidden');
      adminSubviewSignIn?.classList.add('hidden');

      document.getElementById('screen-admin-error')?.classList.add('hidden');
      document.getElementById('screen-adduser-error')?.classList.add('hidden');
      document.getElementById('screen-adduser-success')?.classList.add('hidden');
    };

    adminSubtabSignIn?.addEventListener('click', switchAdminSubToSignIn);
    adminSubtabAddUser?.addEventListener('click', switchAdminSubToAddUser);
    document.getElementById('btn-screen-back-to-admin-signin')?.addEventListener('click', switchAdminSubToSignIn);

    // Autofill default admin on screen
    document.getElementById('btn-screen-autofill-admin')?.addEventListener('click', () => {
      const u = document.getElementById('screen-admin-username');
      const p = document.getElementById('screen-admin-password');
      if (u) u.value = 'admin';
      if (p) p.value = 'admin';
    });

    // Screen User Login Form Submit
    document.getElementById('screen-user-login-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const u = document.getElementById('screen-user-username')?.value;
      const p = document.getElementById('screen-user-password')?.value;
      const errBox = document.getElementById('screen-user-error');
      const errText = document.getElementById('screen-user-error-text');
      this.executeLogin(u, p, errBox, errText);
    });

    // Screen Admin Login Form Submit (Only Admin can log in via Admin Portal)
    document.getElementById('screen-admin-login-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const u = document.getElementById('screen-admin-username')?.value;
      const p = document.getElementById('screen-admin-password')?.value;
      const errBox = document.getElementById('screen-admin-error');
      const errText = document.getElementById('screen-admin-error-text');
      this.executeLogin(u, p, errBox, errText, { requireAdmin: true });
    });

    // Screen Admin Add User Form Submit
    document.getElementById('screen-admin-adduser-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleScreenAdminAddUser();
    });

    // =========================================================================
    // MODAL LOGIN FORM EVENT LISTENERS
    // =========================================================================

    document.getElementById('login-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleLogin();
    });

    document.getElementById('btn-toggle-login-password')?.addEventListener('click', () => {
      const input = document.getElementById('login-password');
      if (input) {
        input.type = input.type === 'password' ? 'text' : 'password';
      }
    });

    // Create user from User Management modal
    document.getElementById('create-user-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleCreateUser();
    });

    // Edit user from Edit User modal
    document.getElementById('edit-user-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleEditUserSubmit();
    });

    document.getElementById('change-password-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleChangePasswordSubmit();
    });

    // Settings open & restore deleted channels
    document.getElementById('btn-open-settings')?.addEventListener('click', () => {
      this.updateSettingsUI();
    });
    document.getElementById('btn-restore-deleted-channels')?.addEventListener('click', () => {
      this.restoreAllDeletedChannels();
    });

    // Settings checkboxes
    const corsCheckbox = document.getElementById('setting-cors-proxy');
    if (corsCheckbox) {
      corsCheckbox.checked = this.player?.corsProxyEnabled ?? true;
      corsCheckbox.addEventListener('change', (e) => {
        if (this.player) this.player.corsProxyEnabled = e.target.checked;
        if (typeof SafeStorage !== 'undefined') {
          SafeStorage.setItem('tamil_iptv_cors_proxy', e.target.checked);
        }
        this.remote?.showToast(`CORS Proxy ${e.target.checked ? 'Enabled' : 'Disabled'}`);
      });
    }

    document.getElementById('btn-reset-channels')?.addEventListener('click', () => {
      if (confirm("Reset application to clean state? All channels and settings will be cleared.")) {
        this.customChannels = [];
        this.deletedChannelIds = [];
        this.favorites = [];
        this.saveStorage();
        this.channels = [];
        this.clearPlayerUI();
        this.renderCategories();
        this.renderChannels();
        this.updateSettingsUI();
        this.remote.showToast("Reset to clean state. Add channels or import M3U to start watching!");
      }
    });

    document.getElementById('btn-clear-favorites')?.addEventListener('click', () => {
      if (confirm("Clear all favorites?")) {
        this.favorites = [];
        this.saveStorage();
        this.renderCategories();
        this.renderChannels();
        this.remote.showToast("Favorites cleared.");
      }
    });
  }

  // Live Digital Clock & Date
  startClock() {
    const clockEl = document.getElementById('live-clock');
    const dateEl = document.getElementById('live-date');
    if (!clockEl) return;

    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    const update = () => {
      const now = new Date();
      let hours = now.getHours();
      const minutes = now.getMinutes().toString().padStart(2, '0');
      const seconds = now.getSeconds().toString().padStart(2, '0');
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12;
      if (hours === 0) hours = 12;

      clockEl.textContent = `${hours.toString().padStart(2, '0')}:${minutes}:${seconds} ${ampm} IST`;

      if (dateEl) {
        const dayName = days[now.getDay()];
        const day = now.getDate();
        const monthName = months[now.getMonth()];
        const year = now.getFullYear();
        dateEl.textContent = `${dayName}, ${day} ${monthName} ${year}`;
      }
    };

    update();
    setInterval(update, 1000);
  }

  // Periodic EPG updater
  startEPGUpdater() {
    setInterval(() => {
      if (this.currentChannel) {
        this.updateEPGNowNextUI(this.currentChannel);
      }
      // Update progress bars on currently visible channel items
      this.updateVisibleChannelProgress();
    }, 10000);
  }

  // Show Locked / Login Required UI on Player
  showLoginRequiredUI() {
    // 1. Destroy player instance to stop audio/video streaming
    if (this.player) {
      try { this.player.destroy(); } catch (e) {}
    }

    // 2. Hide error banner & empty placeholder
    const errorBanner = document.getElementById('player-error-banner');
    if (errorBanner) errorBanner.classList.add('hidden');
    const emptyPlaceholder = document.getElementById('player-empty-placeholder');
    if (emptyPlaceholder) {
      emptyPlaceholder.classList.add('hidden');
      emptyPlaceholder.classList.remove('flex');
    }

    // 3. Display Login Required overlay
    const loginOverlay = document.getElementById('player-login-required-overlay');
    if (loginOverlay) {
      loginOverlay.classList.remove('hidden');
      loginOverlay.classList.add('flex');
    }

    // 4. Update title & OSD
    document.title = "🔒 Login Required - YOU TV";
    const statusBadge = document.getElementById('stream-status-badge');
    if (statusBadge) {
      statusBadge.textContent = "LOCKED";
      statusBadge.className = "px-2.5 py-1 rounded-full text-xs font-bold tracking-wider uppercase bg-rose-600 text-white shadow-sm";
    }
    const nameEl = document.getElementById('player-channel-name');
    if (nameEl) nameEl.textContent = "Sign In Required to Watch";
    const tamilEl = document.getElementById('player-channel-tamil-name');
    if (tamilEl) tamilEl.textContent = "Please sign in to stream live TV channels";
  }

  // Get channels accessible by the currently logged-in user
  getUserAccessibleChannels() {
    const user = this.auth ? this.auth.getCurrentUser() : null;
    if (!user || user.role === 'admin' || user.channelAccess !== 'selected') {
      return this.channels;
    }
    const allowed = Array.isArray(user.allowedChannels) ? user.allowedChannels : [];
    return this.channels.filter(ch => allowed.includes(ch.id));
  }

  // Helper date key for tracking daily watch time
  getTodayDateKey() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  // Get total watched seconds today for a user
  getUserWatchedSecondsToday(username) {
    if (!username) return 0;
    const key = `tamil_iptv_watch_${username}_${this.getTodayDateKey()}`;
    return parseInt(SafeStorage.getItem(key, '0'), 10) || 0;
  }

  // Increment watched seconds today for a user
  incrementUserWatchedSeconds(username, seconds) {
    if (!username) return 0;
    const key = `tamil_iptv_watch_${username}_${this.getTodayDateKey()}`;
    const current = this.getUserWatchedSecondsToday(username);
    const next = current + seconds;
    SafeStorage.setItem(key, String(next));
    return next;
  }

  // Check if current user is allowed to watch a channel
  canUserWatchChannel(channel) {
    if (!this.auth || !this.auth.isLoggedIn()) {
      return { allowed: false, reason: "Please sign in to stream live TV channels." };
    }

    const user = this.auth.getCurrentUser();
    if (!user) return { allowed: false, reason: "No active user session." };

    // Admin has full unconstrained access
    if (user.role === 'admin') {
      return { allowed: true };
    }

    // 1. Account Expiry Check
    if (user.expiresAt) {
      const expTime = user.expiresAt.includes('T')
        ? new Date(user.expiresAt).getTime()
        : new Date(user.expiresAt + 'T23:59:59').getTime();
      if (Date.now() > expTime) {
        const formatted = new Date(expTime).toLocaleString();
        return { 
          allowed: false, 
          reason: `Your account expired on ${formatted}. Please contact Administrator.` 
        };
      }
    }

    // 2. Channel Restriction Check
    if (user.channelAccess === 'selected') {
      const allowed = Array.isArray(user.allowedChannels) ? user.allowedChannels : [];
      if (!channel || !allowed.includes(channel.id)) {
        return { 
          allowed: false, 
          reason: `Channel "${channel ? channel.name : 'Unknown'}" is not included in your assigned channel list. Contact Administrator.` 
        };
      }
    }

    // 3. Allowed Hours Window Check
    if (user.watchHoursMode === 'custom' && user.watchHoursStart && user.watchHoursEnd) {
      const now = new Date();
      const curH = String(now.getHours()).padStart(2, '0');
      const curM = String(now.getMinutes()).padStart(2, '0');
      const curTime = `${curH}:${curM}`;

      const start = user.watchHoursStart;
      const end = user.watchHoursEnd;

      let inWindow = false;
      if (start <= end) {
        inWindow = (curTime >= start && curTime <= end);
      } else {
        // Overnight window (e.g. 21:00 to 06:00)
        inWindow = (curTime >= start || curTime <= end);
      }

      if (!inWindow) {
        return { 
          allowed: false, 
          reason: `Viewing is only allowed between ${start} and ${end}. Current time: ${curTime}.` 
        };
      }
    }

    // 4. Daily Watch Time Limit Check
    if (user.dailyLimitMinutes && Number(user.dailyLimitMinutes) > 0) {
      const maxSeconds = Number(user.dailyLimitMinutes) * 60;
      const watchedSeconds = this.getUserWatchedSecondsToday(user.username);
      if (watchedSeconds >= maxSeconds) {
        return { 
          allowed: false, 
          reason: `Daily watch limit of ${user.dailyLimitMinutes} minutes has been reached for today.` 
        };
      }
    }

    return { allowed: true };
  }

  // Background Watch Monitor & Session Heartbeat
  startWatchMonitor() {
    if (this._watchMonitorInterval) clearInterval(this._watchMonitorInterval);

    this._watchMonitorInterval = setInterval(() => {
      // 1. Session status check (Force logout check)
      if (this.auth && this.auth.isLoggedIn()) {
        const sessionCheck = this.auth.checkSessionActive();
        if (!sessionCheck.valid) {
          try { this.player?.destroy(); } catch (e) {}
          this.auth.logout();
          this.showLoginRequiredUI();
          this.updateAuthUI();
          this.renderCategories();
          this.renderChannels();
          if (this.remote) {
            this.remote.showToast(sessionCheck.reason || "Your session was terminated by an administrator.", 7000);
          }
          alert(sessionCheck.reason || "Your session was terminated by an administrator.");
          return;
        }
      }

      // 2. Watch time monitor (only if logged in as regular user and currently playing)
      const user = this.auth ? this.auth.getCurrentUser() : null;
      if (!user || user.role === 'admin') return;

      const isPlaying = this.player && (
        (this.player.video && !this.player.video.paused && !this.player.video.ended) ||
        (this.player.iframe && this.player.iframe.style.display !== 'none')
      );

      if (isPlaying && this.currentChannel) {
        this.incrementUserWatchedSeconds(user.username, 3);

        const check = this.canUserWatchChannel(this.currentChannel);
        if (!check.allowed) {
          try { this.player.destroy(); } catch (e) {}
          this.showLoginRequiredUI();
          if (this.remote) {
            this.remote.showToast(`⛔ Playback Stopped: ${check.reason}`, 8000);
          }
          alert(`Viewing Restriction:\n\n${check.reason}`);
        }
      }
    }, 3000);
  }

  // Play a specific channel
  playChannel(channel) {
    if (!channel) return;

    // Strict Enforcement: After login only TV channels will play
    if (!this.auth || !this.auth.isLoggedIn()) {
      this.showLoginRequiredUI();
      this.openModal('login-modal');
      return;
    }

    // Verify watch permissions: Allowed hours, daily limits, channel permissions, and account expiry
    const watchCheck = this.canUserWatchChannel(channel);
    if (!watchCheck.allowed) {
      if (this.remote) {
        this.remote.showToast(`⛔ ${watchCheck.reason}`, 6000);
      }
      alert(`Playback Restricted:\n\n${watchCheck.reason}`);
      return;
    }

    this.currentChannel = channel;
    if (typeof SafeStorage !== 'undefined') {
      SafeStorage.setItem('tamil_iptv_last_channel', channel.id);
    }

    // Track recently watched
    this.recentChannelIds = [channel.id, ...this.recentChannelIds.filter(id => id !== channel.id)].slice(0, 15);
    this.saveStorage();

    // Update document title
    document.title = `[LIVE] ${channel.name} - YOU TV`;

    // Hide empty placeholder & login required overlay
    const placeholder = document.getElementById('player-empty-placeholder');
    if (placeholder) {
      placeholder.classList.add('hidden');
      placeholder.classList.remove('flex');
    }
    const loginOverlay = document.getElementById('player-login-required-overlay');
    if (loginOverlay) {
      loginOverlay.classList.add('hidden');
      loginOverlay.classList.remove('flex');
    }

    // Reset status badge
    const statusBadge = document.getElementById('stream-status-badge');
    if (statusBadge) {
      statusBadge.textContent = "LIVE";
      statusBadge.className = "px-2.5 py-1 rounded-full text-xs font-bold tracking-wider uppercase bg-emerald-500/90 text-white shadow-sm";
    }

    // Load in player
    this.player.loadChannel(channel);

    // Update UI elements
    this.updatePlayerInfoUI(channel);
    this.highlightActiveChannel(channel.id);
  }

  // Update Player UI with Channel & EPG Data
  updatePlayerInfoUI(channel) {
    if (!channel) return;

    // Channel name & details
    document.getElementById('player-channel-name').textContent = channel.name;
    document.getElementById('player-channel-tamil-name').textContent = channel.tamilName || '';
    const chNumEl = document.getElementById('player-channel-number');
    if (chNumEl) {
      chNumEl.textContent = '';
      chNumEl.classList.add('hidden');
    }
    document.getElementById('player-channel-category').textContent = channel.categoryName || channel.category.toUpperCase();

    // Favorite icon state
    const isFav = this.favorites.includes(channel.id);
    const favBtn = document.getElementById('btn-favorite-current');
    if (favBtn) {
      favBtn.innerHTML = isFav 
        ? `<svg class="w-5 h-5 text-amber-400 fill-amber-400" viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`
        : `<svg class="w-5 h-5 text-slate-400 hover:text-white" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`;
    }

    // Dynamic ambient glow
    const ambientGlow = document.getElementById('player-ambient-glow');
    if (ambientGlow) {
      ambientGlow.style.background = `radial-gradient(circle, ${channel.color || '#3b82f6'}33 0%, rgba(15, 23, 42, 0) 70%)`;
    }

    // Channel logo
    const logoImg = document.getElementById('player-channel-logo');
    if (logoImg) {
      logoImg.src = channel.logo || generateChannelLogoSvg(channel.name, channel.tamilName, channel.color);
      logoImg.onerror = () => {
        logoImg.src = generateChannelLogoSvg(channel.name, channel.tamilName, channel.color);
      };
    }

    // Update EPG Now & Next
    this.updateEPGNowNextUI(channel);
  }

  updateEPGNowNextUI(channel) {
    const epg = EPGManager.getCurrentProgram(channel);
    if (!epg) return;

    // Player bar EPG
    const nowTitleEl = document.getElementById('epg-now-title');
    const nowTimeEl = document.getElementById('epg-now-time');
    const nowProgressEl = document.getElementById('epg-now-progress');
    const nextTitleEl = document.getElementById('epg-next-title');

    if (nowTitleEl) nowTitleEl.textContent = epg.now.title;
    if (nowTimeEl) nowTimeEl.textContent = `${epg.now.startTime} - ${epg.now.endTime} (${epg.now.remainingMinutes}m left)`;
    if (nowProgressEl) nowProgressEl.style.width = `${epg.now.progress}%`;
    if (nextTitleEl) nextTitleEl.textContent = `Next: ${epg.next.title} (${epg.next.startTime})`;

    // OSD EPG
    const osdTitle = document.getElementById('osd-program-title');
    const osdDesc = document.getElementById('osd-program-desc');
    const osdTime = document.getElementById('osd-program-time');
    const osdProgress = document.getElementById('osd-program-progress');
    const osdChName = document.getElementById('osd-channel-name');
    const osdChNum = document.getElementById('osd-channel-num');

    if (osdTitle) osdTitle.textContent = epg.now.title;
    if (osdDesc) osdDesc.textContent = epg.now.desc || '';
    if (osdTime) osdTime.textContent = `${epg.now.startTime} - ${epg.now.endTime}`;
    if (osdProgress) osdProgress.style.width = `${epg.now.progress}%`;
    if (osdChName) osdChName.textContent = channel.name;
    if (osdChNum) {
      osdChNum.textContent = '';
      osdChNum.classList.add('hidden');
    }
  }

  showPlaybackErrorUI(channel, error) {
    // User requested: if connection issue don't show screenshot 2 options
    const banner = document.getElementById('player-error-banner');
    if (banner) {
      banner.classList.add('hidden');
      banner.classList.remove('flex');
    }
    const statusBadge = document.getElementById('stream-status-badge');
    if (statusBadge) {
      statusBadge.textContent = "OFFLINE";
      statusBadge.className = "px-2.5 py-1 rounded-full text-xs font-bold tracking-wider uppercase bg-rose-600 text-white shadow-sm";
    }
  }

  // Channel flipping
  nextChannel() {
    const list = this.getFilteredChannels();
    if (list.length === 0) return;
    const currentIndex = list.findIndex(c => c.id === this.currentChannel?.id);
    const nextIndex = (currentIndex + 1) % list.length;
    this.playChannel(list[nextIndex]);
  }

  prevChannel() {
    const list = this.getFilteredChannels();
    if (list.length === 0) return;
    const currentIndex = list.findIndex(c => c.id === this.currentChannel?.id);
    const prevIndex = (currentIndex - 1 + list.length) % list.length;
    this.playChannel(list[prevIndex]);
  }

  tuneToChannelNumber(num) {
    if (!this.auth || !this.auth.isLoggedIn()) {
      this.showLoginRequiredUI();
      this.openModal('login-modal');
      return;
    }
    const accessible = this.getUserAccessibleChannels();
    const target = accessible.find(c => String(c.num).toLowerCase() === String(num).toLowerCase()) || (typeof num === 'number' ? accessible[num - 1] : null);
    if (target) {
      this.playChannel(target);
      this.remote.showToast(`Tuned to ${target.name} (CH ${target.num})`);
    } else {
      this.remote.showToast(`Channel ${num} not found or not permitted`);
    }
  }

  // Filter channels based on category and search
  getFilteredChannels() {
    const accessible = this.getUserAccessibleChannels();
    return accessible.filter(ch => {
      // Category match
      let matchesCat = true;
      if (this.currentCategory === 'favorites') {
        matchesCat = this.favorites.includes(ch.id);
      } else if (this.currentCategory === 'custom') {
        matchesCat = ch.isCustom || false;
      } else if (this.currentCategory !== 'all') {
        matchesCat = ch.category === this.currentCategory;
      }

      // Search match
      let matchesSearch = true;
      if (this.searchQuery) {
        const query = this.searchQuery;
        const nameMatch = ch.name.toLowerCase().includes(query);
        const tamilMatch = (ch.tamilName || '').toLowerCase().includes(query);
        const numMatch = ch.num.toString() === query;
        const catMatch = (ch.category || '').toLowerCase().includes(query);
        matchesSearch = nameMatch || tamilMatch || numMatch || catMatch;
      }

      return matchesCat && matchesSearch;
    });
  }

  setCategory(catId) {
    this.currentCategory = catId || 'all';
    this.displayLimit = 60;
    this.renderCategories();
    this.renderChannels();
  }

  // Render Category Tabs
  renderCategories() {
    const container = document.getElementById('category-tabs-container');
    if (!container) return;

    const accessible = this.getUserAccessibleChannels();
    const categories = getChannelCategories(accessible, this.customCategories);
    const isAdmin = !!(this.auth && this.auth.isAdmin());

    if (categories.length === 0) {
      container.innerHTML = `
        <div class="flex items-center space-x-2 text-xs text-slate-500 py-1 px-2 font-medium">
          <span>No categories yet - Add a channel to begin</span>
        </div>
      `;
      return;
    }

    container.innerHTML = categories.map(cat => {
      const isActive = this.currentCategory === cat.id;
      const isSystem = cat.id === 'all' || cat.id === 'favorites';

      return `
        <div class="cat-pill-item inline-flex items-center rounded-full transition-all duration-200 ${
          isActive 
            ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/30 ring-2 ring-rose-400/50' 
            : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700 hover:text-white border border-slate-700/50'
        }">
          <button type="button" data-cat="${cat.id}" title="${cat.name}" class="cat-pill flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold whitespace-nowrap cursor-pointer">
            <span>${cat.name}</span>
            <span class="text-[10px] opacity-75 font-mono px-1.5 py-0.5 rounded-full ${isActive ? 'bg-black/25' : 'bg-slate-900/60'}">(${cat.count})</span>
          </button>
          ${isAdmin && !isSystem ? `
            <div class="inline-flex items-center pr-1.5 space-x-0.5">
              <button type="button" data-edit-cat="${cat.id}" data-cat-name="${cat.name}" title="Edit Category" class="cat-edit-btn p-1 rounded-full text-slate-400 hover:text-amber-300 hover:bg-black/30 transition-colors cursor-pointer">
                <svg class="w-3 h-3" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
              </button>
              <button type="button" data-delete-cat="${cat.id}" data-cat-name="${cat.name}" data-cat-count="${cat.count}" title="Delete Category" class="cat-delete-btn p-1 rounded-full text-slate-400 hover:text-rose-300 hover:bg-black/30 transition-colors cursor-pointer">
                <svg class="w-3 h-3" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
              </button>
            </div>
          ` : ''}
        </div>
      `;
    }).join('');

    // Click handler for category pills
    container.querySelectorAll('.cat-pill').forEach(btn => {
      btn.addEventListener('click', () => {
        const catId = btn.getAttribute('data-cat');
        this.setCategory(catId);
      });
    });

    // Click handlers for Edit & Delete category buttons on pill
    container.querySelectorAll('.cat-edit-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const catId = btn.getAttribute('data-edit-cat');
        const catName = btn.getAttribute('data-cat-name');
        this.openEditCategoryModal(catId, catName);
      });
    });

    container.querySelectorAll('.cat-delete-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const catId = btn.getAttribute('data-delete-cat');
        const catName = btn.getAttribute('data-cat-name');
        const catCount = btn.getAttribute('data-cat-count');
        this.openDeleteCategoryModal(catId, catName, catCount);
      });
    });
  }

  // Render Channel List or Grid
  renderChannels() {
    const listContainer = document.getElementById('channels-list');
    const gridContainer = document.getElementById('channels-grid');
    const countBadge = document.getElementById('channels-count-badge');

    const filtered = this.getFilteredChannels();

    if (countBadge) {
      countBadge.textContent = `${filtered.length} Channels`;
    }

    if (filtered.length === 0) {
      const hasDeleted = this.deletedChannelIds && this.deletedChannelIds.length > 0;
      const isAdmin = this.auth ? this.auth.isAdmin() : false;
      const emptyState = `
        <div class="flex flex-col items-center justify-center py-16 px-4 text-center text-slate-400 space-y-3.5">
          <div class="w-14 h-14 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-rose-500 shadow-lg">
            <svg class="w-7 h-7" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="2" y="7" width="20" height="15" rx="2" ry="2"></rect><polyline points="17 2 12 7 7 2"></polyline></svg>
          </div>
          <div>
            <p class="text-sm font-semibold text-slate-300">No Channels Available</p>
            <p class="text-xs text-slate-500 mt-1">${hasDeleted ? `${this.deletedChannelIds.length} channel(s) are currently deleted and hidden.` : (isAdmin ? 'Add a custom channel or import an M3U playlist to start watching.' : 'Please contact administrator to add channels.')}</p>
          </div>
          ${isAdmin ? `
          <div class="flex flex-wrap items-center justify-center gap-2 pt-1">
            <button onclick="openAppModal('import-m3u-modal')" class="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-lg shadow-rose-950 transition-all flex items-center space-x-1.5 cursor-pointer">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
              <span>Import M3U</span>
            </button>
            <button onclick="openAppModal('add-channel-modal')" class="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs border border-slate-700 transition-all flex items-center space-x-1.5 cursor-pointer">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
              <span>Add Channel</span>
            </button>
            ${hasDeleted ? `
              <button class="btn-empty-restore-all px-3.5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs shadow-lg shadow-emerald-950 transition-all flex items-center space-x-1.5 cursor-pointer">
                <span>Restore All</span>
              </button>
            ` : ''}
          </div>
          ` : ''}
        </div>
      `;
      if (listContainer) listContainer.innerHTML = emptyState;
      if (gridContainer) gridContainer.innerHTML = emptyState;

      document.querySelectorAll('.btn-empty-restore-all').forEach(btn => {
        btn.onclick = () => this.restoreAllDeletedChannels();
      });
      return;
    }

    // Paginate for smooth rendering of large playlists (e.g. index.m3u)
    const displayed = filtered.slice(0, this.displayLimit);
    const hasMore = filtered.length > this.displayLimit;

    // Render Side List View
    if (listContainer) {
      let listHtml = displayed.map(ch => {
        const isActive = this.currentChannel?.id === ch.id;
        const isFav = this.favorites.includes(ch.id);
        const isAdmin = this.auth ? this.auth.isAdmin() : false;
        const epg = EPGManager.getCurrentProgram(ch);
        const nowTitle = epg?.now?.title || "24x7 Live Transmission";
        const progress = epg?.now?.progress || 0;

        if (this.isGridView) {
          return `
            <div data-channel-id="${ch.id}" class="channel-item group bg-slate-900/80 hover:bg-slate-800 border ${
              isActive 
                ? 'border-rose-500 ring-2 ring-rose-500/40 shadow-lg shadow-rose-950/50 bg-rose-950/20' 
                : 'border-slate-800 hover:border-slate-700'
            } rounded-2xl p-3 flex flex-col justify-between transition-all duration-200 cursor-pointer hover:-translate-y-0.5">
              <div class="flex items-start justify-between gap-1">
                <div class="w-14 h-11 bg-slate-950 rounded-xl p-1.5 border border-slate-800 flex items-center justify-center flex-shrink-0">
                  <img src="${ch.logo || generateChannelLogoSvg(ch.name, ch.tamilName, ch.color)}" 
                       alt="${ch.name}" 
                       class="max-w-full max-h-full object-contain"
                       onerror="this.src='${generateChannelLogoSvg(ch.name, ch.tamilName, ch.color)}'"/>
                </div>
                <div class="flex items-center space-x-1">
                  <span class="text-[10px] font-bold text-slate-400 bg-slate-800/90 px-1.5 py-0.5 rounded font-mono">CH ${ch.num}</span>
                  <button data-fav-id="${ch.id}" title="${isFav ? 'Remove from favorites' : 'Add to favorites'}" class="fav-toggle-btn p-1 text-slate-500 hover:text-amber-400 cursor-pointer">
                    ${isFav 
                      ? `<svg class="w-4 h-4 text-amber-400 fill-amber-400" viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>` 
                      : `<svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`
                    }
                  </button>
                  ${isAdmin ? `
                  <button data-edit-id="${ch.id}" title="Edit Channel (${ch.name})" class="edit-channel-btn p-1 text-slate-500 hover:text-cyan-400 hover:bg-slate-800 rounded transition-colors cursor-pointer">
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                  </button>
                  <button data-delete-id="${ch.id}" title="Delete Channel (${ch.name})" class="delete-channel-btn p-1 text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 rounded transition-colors cursor-pointer">
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                  </button>
                  ` : ''}
                </div>
              </div>
              <div class="mt-2.5">
                <h3 class="text-xs font-bold text-white group-hover:text-rose-400 transition-colors truncate">${ch.name}</h3>
                <div class="mt-1 flex items-center justify-between text-[10px] text-slate-500">
                  <span class="capitalize truncate">${ch.categoryName || ch.category}</span>
                  ${isActive ? `
                  <span class="text-rose-400 flex items-center space-x-1 font-bold">
                    <span class="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></span>
                    <span>PLAYING</span>
                  </span>
                  ` : `
                  <span class="text-emerald-400 flex items-center space-x-1 font-semibold">
                    <span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                    <span>LIVE</span>
                  </span>
                  `}
                </div>
              </div>
            </div>
          `;
        }

        return `
          <div data-channel-id="${ch.id}" class="channel-item group relative flex items-center justify-between p-2.5 rounded-xl transition-all duration-200 cursor-pointer border ${
            isActive 
              ? 'bg-rose-950/40 border-rose-500/80 shadow-md shadow-rose-900/20' 
              : 'bg-slate-900/60 hover:bg-slate-800/80 border-slate-800/80 hover:border-slate-700'
          }">
            <div class="flex items-center space-x-3 overflow-hidden flex-1">
              <!-- Channel Logo / Avatar -->
              <div class="relative w-12 h-12 flex-shrink-0 bg-slate-950 rounded-lg overflow-hidden border border-slate-800 flex items-center justify-center p-1">
                <img src="${ch.logo || generateChannelLogoSvg(ch.name, ch.tamilName, ch.color)}" 
                     alt="${ch.name}" 
                     class="max-w-full max-h-full object-contain"
                     onerror="this.src='${generateChannelLogoSvg(ch.name, ch.tamilName, ch.color)}'"/>
                ${isActive ? '<span class="absolute top-1 left-1 w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>' : ''}
              </div>

              <!-- Channel Text info -->
              <div class="flex-1 min-w-0 pr-2">
                <div class="flex items-center space-x-1.5">
                  <span class="text-[10px] font-bold text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded">CH ${ch.num}</span>
                  <h4 class="text-sm font-bold text-white truncate group-hover:text-rose-400 transition-colors">${ch.name}</h4>
                  ${ch.badge ? `<span class="text-[9px] font-extrabold uppercase px-1 rounded bg-slate-800 text-rose-400">${ch.badge}</span>` : ''}
                </div>
                <div class="text-xs text-rose-300/80 font-medium truncate mt-0.5">${ch.tamilName || ''}</div>
                <div class="text-[11px] text-slate-400 truncate mt-0.5 flex items-center space-x-1">
                  <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  <span class="truncate">${nowTitle}</span>
                </div>
                <!-- EPG Mini Progress -->
                <div class="w-full bg-slate-800 h-1 rounded-full overflow-hidden mt-1.5">
                  <div class="channel-progress-bar bg-rose-500 h-full rounded-full transition-all duration-500" style="width: ${progress}%"></div>
                </div>
              </div>
            </div>

            <!-- Action buttons -->
            <div class="flex items-center space-x-1 pl-2">
              <button data-fav-id="${ch.id}" title="${isFav ? 'Remove from favorites' : 'Add to favorites'}" class="fav-toggle-btn p-1.5 rounded-lg text-slate-500 hover:text-amber-400 hover:bg-slate-800 transition-colors cursor-pointer">
                ${isFav 
                  ? `<svg class="w-4 h-4 text-amber-400 fill-amber-400" viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>` 
                  : `<svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`
                }
              </button>
              ${isAdmin ? `
              <button data-edit-id="${ch.id}" title="Edit Channel (${ch.name})" class="edit-channel-btn p-1.5 rounded-lg text-slate-500 hover:text-cyan-400 hover:bg-slate-800 transition-colors cursor-pointer">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
              </button>
              <button data-delete-id="${ch.id}" title="Delete Channel (${ch.name})" class="delete-channel-btn p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 transition-colors cursor-pointer">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
              </button>
              ` : ''}
            </div>
          </div>
        `;
      }).join('');

      if (hasMore) {
        listHtml += `
          <button id="btn-load-more-list" class="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-rose-400 font-bold text-xs mt-2 transition-all flex items-center justify-center space-x-1 shadow">
            <span>Load More (+60 Channels)</span>
            <span class="text-slate-500 font-normal">[Showing ${displayed.length} of ${filtered.length}]</span>
          </button>
        `;
      }

      listContainer.innerHTML = listHtml;
    }

    // Render Grid View
    if (gridContainer) {
      let gridHtml = displayed.map(ch => {
        const isActive = this.currentChannel?.id === ch.id;
        const isFav = this.favorites.includes(ch.id);
        const isAdmin = this.auth ? this.auth.isAdmin() : false;
        const epg = EPGManager.getCurrentProgram(ch);

        return `
          <div data-channel-id="${ch.id}" class="channel-item group bg-slate-900/80 hover:bg-slate-800 border ${
            isActive ? 'border-rose-500 ring-2 ring-rose-500/30' : 'border-slate-800 hover:border-slate-700'
          } rounded-2xl p-4 flex flex-col justify-between transition-all duration-200 cursor-pointer shadow-lg hover:shadow-xl hover:-translate-y-1">
            <div class="flex items-start justify-between">
              <div class="w-16 h-12 bg-slate-950 rounded-xl p-1.5 border border-slate-800 flex items-center justify-center">
                <img src="${ch.logo || generateChannelLogoSvg(ch.name, ch.tamilName, ch.color)}" 
                     alt="${ch.name}" 
                     class="max-w-full max-h-full object-contain"
                     onerror="this.src='${generateChannelLogoSvg(ch.name, ch.tamilName, ch.color)}'"/>
              </div>
              <div class="flex items-center space-x-1">
                <span class="text-xs font-bold text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full">CH ${ch.num}</span>
                <button data-fav-id="${ch.id}" title="${isFav ? 'Remove from favorites' : 'Add to favorites'}" class="fav-toggle-btn p-1 text-slate-500 hover:text-amber-400 cursor-pointer">
                  ${isFav 
                    ? `<svg class="w-4 h-4 text-amber-400 fill-amber-400" viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>` 
                    : `<svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`
                  }
                </button>
                ${isAdmin ? `
                <button data-edit-id="${ch.id}" title="Edit Channel (${ch.name})" class="edit-channel-btn p-1 text-slate-500 hover:text-cyan-400 hover:bg-slate-800 rounded transition-colors cursor-pointer">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                </button>
                <button data-delete-id="${ch.id}" title="Delete Channel (${ch.name})" class="delete-channel-btn p-1 text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 rounded transition-colors cursor-pointer">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                </button>
                ` : ''}
              </div>
            </div>

            <div class="mt-3">
              <h3 class="text-base font-bold text-white group-hover:text-rose-400 transition-colors truncate">${ch.name}</h3>
              <p class="text-xs text-rose-300 font-medium truncate">${ch.tamilName || ''}</p>
              <div class="mt-2 text-xs text-slate-400 bg-slate-950/60 p-2 rounded-lg border border-slate-800/80">
                <div class="font-medium text-slate-300 truncate">${epg?.now?.title || 'Live Program'}</div>
                <div class="text-[10px] text-slate-500 mt-0.5">${epg?.now?.startTime || ''} - ${epg?.now?.endTime || ''}</div>
              </div>
            </div>

            <div class="mt-3 flex items-center justify-between pt-2 border-t border-slate-800/80 text-[11px] text-slate-500">
              <span class="capitalize">${ch.categoryName || ch.category}</span>
              <span class="text-emerald-400 flex items-center space-x-1 font-semibold">
                <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>LIVE</span>
              </span>
            </div>
          </div>
        `;
      }).join('');

      if (hasMore) {
        gridHtml += `
          <div class="col-span-full py-4 text-center">
            <button id="btn-load-more-grid" class="px-6 py-3 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-lg shadow-rose-600/30 transition-all">
              Load More Channels (+60) [Showing ${displayed.length} of ${filtered.length}]
            </button>
          </div>
        `;
      }

      gridContainer.innerHTML = gridHtml;
    }

    // Attach Load More handlers
    document.getElementById('btn-load-more-list')?.addEventListener('click', () => {
      this.displayLimit += 60;
      this.renderChannels();
    });
    document.getElementById('btn-load-more-grid')?.addEventListener('click', () => {
      this.displayLimit += 60;
      this.renderChannels();
    });

    // Attach click events to channel items
    document.querySelectorAll('.channel-item').forEach(el => {
      el.addEventListener('click', (e) => {
        // Prevent trigger if clicking favorite, edit, or delete button
        if (e.target.closest('.fav-toggle-btn') || e.target.closest('.delete-channel-btn') || e.target.closest('.edit-channel-btn')) return;
        
        // Strict enforcement: After login only TV channels will play
        if (!this.auth || !this.auth.isLoggedIn()) {
          this.showLoginRequiredUI();
          this.openModal('login-modal');
          return;
        }

        const channelId = el.getAttribute('data-channel-id');
        const ch = this.channels.find(c => c.id === channelId);
        if (ch) {
          this.playChannel(ch);
          this.highlightActiveChannel(ch.id);
        }
      });
    });

    // Attach click events to favorite buttons
    document.querySelectorAll('.fav-toggle-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const favId = btn.getAttribute('data-fav-id');
        this.toggleFavorite(favId);
      });
    });

    // Attach click events to edit channel buttons
    document.querySelectorAll('.edit-channel-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const editId = btn.getAttribute('data-edit-id');
        this.openEditChannelModal(editId);
      });
    });

    // Attach click events to delete channel buttons
    document.querySelectorAll('.delete-channel-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const delId = btn.getAttribute('data-delete-id');
        this.confirmDeleteChannel(delId);
      });
    });
  }

  // Update channel list progress bars in real time
  updateVisibleChannelProgress() {
    document.querySelectorAll('#channels-list .channel-item').forEach(el => {
      const channelId = el.getAttribute('data-channel-id');
      const ch = this.channels.find(c => c.id === channelId);
      if (ch) {
        const epg = EPGManager.getCurrentProgram(ch);
        const bar = el.querySelector('.channel-progress-bar');
        if (bar && epg) {
          bar.style.width = `${epg.now.progress}%`;
        }
      }
    });
  }

  // Highlight active channel in lists
  highlightActiveChannel(channelId) {
    document.querySelectorAll('.channel-item').forEach(el => {
      if (el.getAttribute('data-channel-id') === channelId) {
        el.classList.add('bg-rose-950/40', 'border-rose-500/80', 'ring-2', 'ring-rose-500/30');
      } else {
        el.classList.remove('bg-rose-950/40', 'border-rose-500/80', 'ring-2', 'ring-rose-500/30');
      }
    });
  }

  // Toggle favorite channel
  toggleFavorite(channelId) {
    if (!this.auth || !this.auth.isLoggedIn()) {
      this.openModal('login-modal');
      return;
    }
    if (this.favorites.includes(channelId)) {
      this.favorites = this.favorites.filter(id => id !== channelId);
      this.remote.showToast("Removed from favorites");
    } else {
      this.favorites.push(channelId);
      this.remote.showToast("Added to ⭐ favorites!");
    }
    this.saveStorage();
    this.renderCategories();
    this.renderChannels();

    if (this.currentChannel?.id === channelId) {
      this.updatePlayerInfoUI(this.currentChannel);
    }
  }

  // Open Delete Channel Confirmation Dialog
  confirmDeleteChannel(channelId) {
    if (!this.auth || !this.auth.isAdmin()) {
      alert("Administrator access required to delete channels. Please sign in as Admin.");
      this.openModal('login-modal');
      return;
    }

    const ch = this.channels.find(c => c.id === channelId);
    if (!ch) return;

    this.pendingDeleteChannelId = channelId;

    const modal = document.getElementById('delete-channel-modal');
    if (!modal) {
      if (confirm(`Are you sure you want to delete "${ch.name}"?`)) {
        this.deleteChannel(channelId);
      }
      return;
    }

    const nameEl = document.getElementById('delete-channel-name');
    const tamilEl = document.getElementById('delete-channel-tamil');
    const numEl = document.getElementById('delete-channel-num');
    const catEl = document.getElementById('delete-channel-cat');

    if (nameEl) nameEl.textContent = ch.name;
    if (tamilEl) tamilEl.textContent = ch.tamilName || '';
    if (numEl) numEl.textContent = `CH ${ch.num.toString().padStart(2, '0')}`;
    if (catEl) catEl.textContent = ch.categoryName || ch.category;

    modal.classList.remove('hidden');
    modal.classList.add('flex', 'active');
    modal.style.setProperty('display', 'flex', 'important');
    modal.style.zIndex = '99999';
  }

  // Delete Channel (hides default channels or deletes custom channels)
  deleteChannel(channelId) {
    const ch = this.channels.find(c => c.id === channelId);
    const channelName = ch ? ch.name : 'Channel';

    // If deleted channel is currently playing, switch to next channel
    if (this.currentChannel?.id === channelId) {
      const remaining = this.channels.filter(c => c.id !== channelId);
      if (remaining.length > 0) {
        this.playChannel(remaining[0]);
      } else {
        this.clearPlayerUI();
      }
    }

    // Add to deletedChannelIds if not already there
    if (!this.deletedChannelIds.includes(channelId)) {
      this.deletedChannelIds.push(channelId);
    }

    // Remove from custom channels if custom
    this.customChannels = this.customChannels.filter(c => c.id !== channelId);

    // Remove from favorites if starred
    this.favorites = this.favorites.filter(id => id !== channelId);

    // Remove from active channels list
    this.channels = this.channels.filter(c => c.id !== channelId);

    this.saveStorage();
    this.renderCategories();
    this.renderChannels();
    this.updateSettingsUI();

    if (this.remote) {
      this.remote.showToast(`Deleted "${channelName}"`, 4500, () => {
        this.restoreChannel(channelId);
      }, "Undo");
    }
  }

  // Clear player state when no channels remain
  clearPlayerUI() {
    this.currentChannel = null;
    if (this.player) {
      try {
        this.player.destroy();
      } catch (e) {}
    }

    const chName = document.getElementById('player-channel-name');
    if (chName) chName.textContent = "No Channels Available";
    const tamilName = document.getElementById('player-channel-tamil-name');
    if (tamilName) tamilName.textContent = "";
    const chNum = document.getElementById('player-channel-number');
    if (chNum) chNum.textContent = "";
    const chCat = document.getElementById('player-channel-category');
    if (chCat) chCat.textContent = "OFFLINE";
    const epgNow = document.getElementById('epg-now-title');
    if (epgNow) epgNow.textContent = "No active transmission";
    const epgNext = document.getElementById('epg-next-title');
    if (epgNext) epgNext.textContent = "--";
    const epgTime = document.getElementById('epg-now-time');
    if (epgTime) epgTime.textContent = "--";
    const epgProgress = document.getElementById('epg-now-progress');
    if (epgProgress) epgProgress.style.width = "0%";
    const logoImg = document.getElementById('player-channel-logo');
    if (logoImg) logoImg.src = "";
    document.title = "YOU TV - Live TV";

    // Show login required overlay if unauthenticated, else show empty placeholder
    if (!this.auth || !this.auth.isLoggedIn()) {
      this.showLoginRequiredUI();
      return;
    }

    const placeholder = document.getElementById('player-empty-placeholder');
    if (placeholder) {
      placeholder.classList.remove('hidden');
      placeholder.classList.add('flex');
    }
  }

  // Open Delete All Confirmation Dialog
  confirmDeleteAllChannels() {
    if (!this.auth || !this.auth.isAdmin()) {
      alert("Administrator access required to delete channels. Please sign in as Admin.");
      this.openModal('login-modal');
      return;
    }

    const totalCount = this.channels.length;
    if (totalCount === 0) {
      if (this.remote) this.remote.showToast("No channels to delete.");
      return;
    }

    const modal = document.getElementById('delete-all-channels-modal');
    if (!modal) {
      if (confirm(`Are you sure you want to delete all ${totalCount} channels?`)) {
        this.deleteAllChannels();
      }
      return;
    }

    const countEl = document.getElementById('delete-all-count-badge');
    const descEl = document.getElementById('delete-all-desc');
    if (countEl) countEl.textContent = `${totalCount} Channels`;
    if (descEl) {
      descEl.textContent = `This will delete all ${totalCount} channels from your TV guide and stop playback. You can restore them anytime from Settings.`;
    }

    modal.classList.remove('hidden');
    modal.classList.add('flex', 'active');
    modal.style.setProperty('display', 'flex', 'important');
    modal.style.zIndex = '99999';
  }

  // Delete all channels
  deleteAllChannels() {
    const count = this.channels.length;
    if (count === 0) return;

    const previousDeleted = [...this.deletedChannelIds];

    // Gather all channel IDs
    const defaults = (typeof DEFAULT_TAMIL_CHANNELS !== 'undefined' && Array.isArray(DEFAULT_TAMIL_CHANNELS))
      ? DEFAULT_TAMIL_CHANNELS
      : [];
    const allKnownIds = [...defaults, ...this.customChannels, ...this.channels].map(c => c.id);

    // Add all IDs to deletedChannelIds
    this.deletedChannelIds = Array.from(new Set([...this.deletedChannelIds, ...allKnownIds]));

    // Empty active channels
    this.channels = [];
    this.customChannels = [];
    this.favorites = [];

    this.saveStorage();
    this.clearPlayerUI();
    this.renderCategories();
    this.renderChannels();
    this.updateSettingsUI();

    if (this.remote) {
      this.remote.showToast(`Deleted all ${count} channels`, 5000, () => {
        this.deletedChannelIds = previousDeleted;
        this.restoreAllDeletedChannels();
      }, "Undo");
    }
  }

  // Restore single deleted channel
  restoreChannel(channelId) {
    this.deletedChannelIds = this.deletedChannelIds.filter(id => id !== channelId);
    this.saveStorage();

    const defaults = (typeof DEFAULT_TAMIL_CHANNELS !== 'undefined' && Array.isArray(DEFAULT_TAMIL_CHANNELS))
      ? DEFAULT_TAMIL_CHANNELS
      : [];
    const combined = [...defaults, ...this.customChannels];
    this.channels = combined.filter(ch => !this.deletedChannelIds.includes(ch.id));

    this.renderCategories();
    this.renderChannels();
    this.updateSettingsUI();

    if (this.remote) {
      this.remote.showToast("Channel restored! ✅");
    }
  }

  // Restore all deleted channels
  restoreAllDeletedChannels() {
    const count = this.deletedChannelIds.length;
    if (count === 0) {
      if (this.remote) this.remote.showToast("No deleted channels to restore.");
      return;
    }

    this.deletedChannelIds = [];
    this.saveStorage();

    const defaults = (typeof DEFAULT_TAMIL_CHANNELS !== 'undefined' && Array.isArray(DEFAULT_TAMIL_CHANNELS))
      ? DEFAULT_TAMIL_CHANNELS
      : [];
    this.channels = [...defaults, ...this.customChannels];

    this.renderCategories();
    this.renderChannels();
    this.updateSettingsUI();

    if (this.channels.length > 0 && !this.currentChannel) {
      this.playChannel(this.channels[0]);
    }

    if (this.remote) {
      this.remote.showToast(`Restored all ${count} deleted channels! ✅`);
    }
  }

  // Update Settings UI counters and buttons
  updateSettingsUI() {
    const textEl = document.getElementById('setting-deleted-count-text');
    const btnRestore = document.getElementById('btn-restore-deleted-channels');
    const btnDeleteAll = document.getElementById('btn-delete-all-settings');

    const count = this.deletedChannelIds ? this.deletedChannelIds.length : 0;
    if (textEl) {
      textEl.textContent = `${count} channel(s) deleted and hidden.`;
    }
    if (btnRestore) {
      btnRestore.textContent = count > 0 ? `Restore All (${count})` : 'Restore All';
      btnRestore.disabled = count === 0;
      if (count === 0) {
        btnRestore.classList.add('opacity-50', 'cursor-not-allowed');
      } else {
        btnRestore.classList.remove('opacity-50', 'cursor-not-allowed');
      }
    }
    if (btnDeleteAll) {
      btnDeleteAll.disabled = this.channels.length === 0;
      if (this.channels.length === 0) {
        btnDeleteAll.classList.add('opacity-50', 'cursor-not-allowed');
      } else {
        btnDeleteAll.classList.remove('opacity-50', 'cursor-not-allowed');
      }
    }
  }

  // Switch between List and Grid views (Seamless theater mode with responsive grid)
  updateViewModeUI() {
    const listSection = document.getElementById('channels-list-section');
    const playerWrapper = document.getElementById('player-column-wrapper');
    const channelsWrapper = document.getElementById('channels-column-wrapper');
    const channelsList = document.getElementById('channels-list');
    const viewBtnText = document.getElementById('toggle-view-text');

    if (this.isGridView) {
      if (listSection) {
        listSection.className = "flex flex-col space-y-6 flex-1 transition-all duration-300";
      }
      if (playerWrapper) {
        playerWrapper.className = "w-full max-w-5xl mx-auto flex flex-col space-y-4 transition-all duration-300";
      }
      if (channelsWrapper) {
        channelsWrapper.className = "w-full flex flex-col space-y-3 transition-all duration-300";
      }
      if (channelsList) {
        channelsList.className = "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 max-h-[calc(100vh-180px)] overflow-y-auto pr-1";
      }
      if (viewBtnText) viewBtnText.textContent = "List View";
    } else {
      if (listSection) {
        listSection.className = "grid grid-cols-1 xl:grid-cols-12 gap-5 flex-1 transition-all duration-300";
      }
      if (playerWrapper) {
        playerWrapper.className = "xl:col-span-8 flex flex-col space-y-4 transition-all duration-300";
      }
      if (channelsWrapper) {
        channelsWrapper.className = "xl:col-span-4 flex flex-col space-y-3 transition-all duration-300";
      }
      if (channelsList) {
        channelsList.className = "space-y-2 max-h-[calc(100vh-220px)] overflow-y-auto pr-1";
      }
      if (viewBtnText) viewBtnText.textContent = "Grid View";
    }

    this.renderChannels();
  }

  // Toggle Guide View (EPG - Disabled per user request)
  toggleGuideView() {
    return;
  }

  // Open Full EPG Modal (Disabled per user request)
  openEPGModal() {
    return;
  }

  // Handle M3U file upload from local computer
  handleFileUpload(event) {
    if (!this.auth || !this.auth.isAdmin()) {
      alert("Administrator access required to import playlists. Please sign in as Admin.");
      this.openModal('login-modal');
      return;
    }

    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target.result;
      const parsedChannels = PlaylistParser.parse(content);
      if (parsedChannels.length === 0) {
        alert("Could not find any valid channels in this M3U file.");
        return;
      }

      this.customChannels = [...this.customChannels, ...parsedChannels];
      this.channels = [...this.customChannels];
      this.saveStorage();
      this.currentCategory = 'all';
      this.renderCategories();
      this.renderChannels();
      this.remote.closeAllModals();
      this.remote.showToast(`Imported ${parsedChannels.length} channels successfully!`);
      if (parsedChannels.length > 0) {
        this.playChannel(parsedChannels[0]);
      }
    };
    reader.readAsText(file);
  }

  // Load M3U from remote URL with optional filter
  async loadM3UFromUrl(url, filter = 'tam') {
    if (!this.auth || !this.auth.isAdmin()) {
      alert("Administrator access required to import playlists. Please sign in as Admin.");
      this.openModal('login-modal');
      return;
    }

    const isLocalBitly = url.includes('3h5yNZM') || url.includes('playlist-tamil-local');
    const filename = isLocalBitly ? 'Tamil Local Channels (bit.ly/3h5yNZM)' : (url.split('/').pop() || 'playlist.m3u');
    this.remote.showToast(`Loading ${filename}...`);

    const statusEl = document.getElementById('import-status-text');
    const msgEl = document.getElementById('import-status-msg');
    if (statusEl && msgEl) {
      msgEl.textContent = `Downloading ${filename}... (this may take a few moments for large master lists)`;
      statusEl.classList.remove('hidden');
    }

    try {
      let text = null;

      // Handle bit.ly/3h5yNZM or local playlist with GitHub raw + local bundled fallback
      if (isLocalBitly) {
        const rawGithubUrl = 'https://raw.githubusercontent.com/prabhacap/IPTV/master/playlist-tamil-local.m3u';
        // 1. Attempt direct raw GitHub
        try {
          const response = await fetch(rawGithubUrl);
          if (response.ok) {
            text = await response.text();
          }
        } catch (fetchErr) {
          console.warn("Direct fetch from GitHub failed, trying local bundled playlist...", fetchErr);
        }

        // 2. Fallback to bundled local playlist
        if (!text) {
          try {
            const localResp = await fetch('./playlists/tamil_local.m3u');
            if (localResp.ok) {
              text = await localResp.text();
            }
          } catch (localErr) {
            console.warn("Local playlist fetch failed, trying corsproxy...", localErr);
          }
        }

        // 3. Fallback to CORS proxy
        if (!text) {
          const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(rawGithubUrl)}`;
          const proxyResp = await fetch(proxyUrl);
          if (proxyResp.ok) text = await proxyResp.text();
        }
      } else {
        let fetchUrl = url;
        if (this.player.corsProxyEnabled && !url.includes('corsproxy.io')) {
          fetchUrl = `https://corsproxy.io/?${encodeURIComponent(url)}`;
        }

        const response = await fetch(fetchUrl);
        if (!response.ok) throw new Error(`HTTP error ${response.status}`);
        text = await response.text();
      }

      if (!text) throw new Error("Could not retrieve playlist content");
      
      if (msgEl) msgEl.textContent = "Parsing channels & metadata...";
      
      const activeFilter = isLocalBitly ? 'all' : filter;
      let parsedChannels = PlaylistParser.parse(text, activeFilter);

      // If 'tam' was requested but returned 0 (e.g. non-tagged playlist), fallback to all
      if (parsedChannels.length === 0 && activeFilter !== 'all') {
        if (msgEl) msgEl.textContent = "No specific language tag found, parsing all entries...";
        parsedChannels = PlaylistParser.parse(text, 'all');
      }

      if (parsedChannels.length === 0) {
        alert("No valid channel entries found in the provided M3U URL.");
        if (statusEl) statusEl.classList.add('hidden');
        return;
      }

      // Ensure local playlist channels are categorised into 'local'
      if (isLocalBitly) {
        parsedChannels.forEach(ch => {
          if (!ch.category || ch.category === 'custom') {
            ch.category = 'local';
            ch.categoryName = 'Tamil Local';
          }
        });
      }

      // Filter out duplicates by streamUrl
      const existingUrls = new Set(this.channels.map(c => c.streamUrl));
      const uniqueNew = parsedChannels.filter(c => !existingUrls.has(c.streamUrl));
      const toAdd = uniqueNew.length > 0 ? uniqueNew : parsedChannels;

      this.customChannels = [...this.customChannels, ...toAdd];
      this.channels = [...this.customChannels];
      this.saveStorage();
      this.currentCategory = 'all';
      this.displayLimit = 60; // reset pagination
      this.renderCategories();
      this.renderChannels();
      this.remote.closeAllModals();

      if (statusEl) statusEl.classList.add('hidden');
      this.remote.showToast(`Imported ${toAdd.length} channels (${isLocalBitly ? 'Tamil Local' : filename})!`);

      // Play the first channel immediately so channel runs
      if (toAdd.length > 0) {
        this.playChannel(toAdd[0]);
      }
    } catch (err) {
      console.error("Error loading M3U URL:", err);
      if (statusEl) statusEl.classList.add('hidden');
      alert(`Failed to load playlist URL: ${err.message}. Note: For restricted CDNs, you can enable CORS proxy in Settings.`);
    }
  }

  // Populate category dropdowns for Add Channel and Edit Channel
  populateCategorySelects(selectedForAdd = null, selectedForEdit = null) {
    const baseCategories = [
      { id: 'local', name: 'Tamil Local', tamil: 'Tamil Local' },
      { id: 'entertainment', name: 'Entertainment', tamil: 'Entertainment' },
      { id: 'news', name: 'News', tamil: 'News' },
      { id: 'movies', name: 'Movies', tamil: 'Movies' },
      { id: 'music', name: 'Music', tamil: 'Music' },
      { id: 'comedy', name: 'Comedy', tamil: 'Comedy' },
      { id: 'devotional', name: 'Devotional', tamil: 'Devotional' },
      { id: 'kids', name: 'Kids', tamil: 'Kids' },
      { id: 'sports', name: 'Sports', tamil: 'Sports' },
      { id: 'srilanka', name: 'Sri Lanka & Global', tamil: 'Sri Lanka & Global' }
    ];

    const catMap = new Map();
    baseCategories.forEach(c => {
      if (!this.deletedCategoryIds.includes(c.id)) {
        const renamed = this.categoryRenames[c.id] || c.name;
        catMap.set(c.id, { id: c.id, name: renamed, tamil: renamed });
      }
    });

    // Merge custom categories
    if (Array.isArray(this.customCategories)) {
      this.customCategories.forEach(c => {
        if (c && c.id && !this.deletedCategoryIds.includes(c.id)) {
          const renamed = this.categoryRenames[c.id] || c.name || c.id;
          catMap.set(c.id, { 
            id: c.id, 
            name: renamed, 
            tamil: renamed 
          });
        }
      });
    }

    // Merge any categories currently present in channels
    if (Array.isArray(this.channels)) {
      this.channels.forEach(ch => {
        if (ch.category && !this.deletedCategoryIds.includes(ch.category) && !catMap.has(ch.category)) {
          const renamed = this.categoryRenames[ch.category] || ch.categoryName || ch.category;
          catMap.set(ch.category, { 
            id: ch.category, 
            name: renamed, 
            tamil: renamed 
          });
        }
      });
    }

    const optionsHtml = Array.from(catMap.values()).map(cat => {
      return `<option value="${cat.id}">${cat.name}</option>`;
    }).join('') + `<option value="__new__">+ Create New Category...</option>`;

    const addSelect = document.getElementById('custom-ch-category');
    const editSelect = document.getElementById('edit-ch-category');

    if (addSelect) {
      const prevVal = selectedForAdd || addSelect.value || 'local';
      addSelect.innerHTML = optionsHtml;
      if (catMap.has(prevVal) || prevVal === '__new__') {
        addSelect.value = prevVal;
      }
    }

    if (editSelect) {
      const prevVal = selectedForEdit || editSelect.value || 'local';
      editSelect.innerHTML = optionsHtml;
      if (catMap.has(prevVal) || prevVal === '__new__') {
        editSelect.value = prevVal;
      }
    }
  }

  // Open Manage Categories Modal
  openManageCategoriesModal() {
    if (!this.auth || !this.auth.isAdmin()) {
      alert("Administrator access required to manage categories. Please sign in as Admin.");
      this.openModal('login-modal');
      return;
    }
    this.renderManageCategoriesList();
    this.openModal('manage-categories-modal');
  }

  // Render Category List inside Manage Categories Modal
  renderManageCategoriesList() {
    const listContainer = document.getElementById('manage-categories-list');
    if (!listContainer) return;

    const accessible = this.getUserAccessibleChannels();
    const categories = getChannelCategories(accessible, this.customCategories)
      .filter(c => c.id !== 'all' && c.id !== 'favorites');

    const countLabel = document.getElementById('manage-categories-count-label');
    if (countLabel) countLabel.textContent = `${categories.length} Categories`;

    if (categories.length === 0) {
      listContainer.innerHTML = `
        <div class="p-6 text-center text-xs text-slate-500">
          No custom or content categories available. Click "+ Add New Category" above to create one.
        </div>
      `;
      return;
    }

    listContainer.innerHTML = categories.map(cat => {
      return `
        <div class="flex items-center justify-between p-3 rounded-xl bg-slate-900/70 hover:bg-slate-900 border border-slate-800 transition-all">
          <div class="flex items-center space-x-3">
            <div class="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center font-bold text-xs text-slate-300">
              ${(cat.name || 'C').substring(0, 2).toUpperCase()}
            </div>
            <div>
              <div class="font-bold text-white text-xs">${cat.name}</div>
              <div class="text-[11px] text-slate-400 font-mono">${cat.count} channel(s)</div>
            </div>
          </div>
          <div class="flex items-center space-x-2">
            <button type="button" onclick="window.app.openEditCategoryModal('${cat.id}', '${cat.name.replace(/'/g, "\\'")}')" class="px-2.5 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-semibold flex items-center space-x-1 transition-all cursor-pointer">
              <svg class="w-3 h-3" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
              <span>Edit</span>
            </button>
            <button type="button" onclick="window.app.openDeleteCategoryModal('${cat.id}', '${cat.name.replace(/'/g, "\\'")}', ${cat.count})" class="px-2.5 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 text-xs font-semibold flex items-center space-x-1 transition-all cursor-pointer">
              <svg class="w-3 h-3" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
              <span>Delete</span>
            </button>
          </div>
        </div>
      `;
    }).join('');
  }

  // Open Edit Category Modal
  openEditCategoryModal(catId, catName = '') {
    if (!this.auth || !this.auth.isAdmin()) {
      alert("Administrator access required to edit categories. Please sign in as Admin.");
      this.openModal('login-modal');
      return;
    }

    if (catId === 'all' || catId === 'favorites') {
      if (this.remote) this.remote.showToast("System categories cannot be edited.");
      return;
    }

    const idInput = document.getElementById('edit-cat-id');
    const nameInput = document.getElementById('edit-cat-name');
    if (idInput) idInput.value = catId;
    if (nameInput) nameInput.value = catName || catId;

    this.openModal('edit-category-modal');
  }

  // Save changes from Edit Category Modal
  handleSaveEditedCategory() {
    if (!this.auth || !this.auth.isAdmin()) {
      alert("Administrator access required to edit categories. Please sign in as Admin.");
      this.openModal('login-modal');
      return;
    }

    const idInput = document.getElementById('edit-cat-id');
    const nameInput = document.getElementById('edit-cat-name');
    const catId = idInput ? idInput.value.trim() : '';
    const newName = nameInput ? nameInput.value.trim() : '';

    if (!catId || !newName) {
      alert("Category name is required.");
      return;
    }

    // Record rename
    this.categoryRenames[catId] = newName;

    // Update in channels
    this.channels.forEach(ch => {
      if (ch.category === catId) {
        ch.categoryName = newName;
      }
    });
    this.customChannels.forEach(ch => {
      if (ch.category === catId) {
        ch.categoryName = newName;
      }
    });

    // Update in customCategories if present
    const customCat = this.customCategories.find(c => c.id === catId);
    if (customCat) {
      customCat.name = newName;
      customCat.tamil = newName;
      customCat.tamilName = newName;
    }

    this.saveStorage();
    this.populateCategorySelects();
    this.renderCategories();
    this.renderChannels();
    this.renderManageCategoriesList();
    this.closeModal('edit-category-modal');

    if (this.remote) {
      this.remote.showToast(`Category updated to "${newName}"!`);
    }
  }

  // Open Delete Category Confirmation Modal
  openDeleteCategoryModal(catId, catName = '', catCount = null) {
    if (!this.auth || !this.auth.isAdmin()) {
      alert("Administrator access required to delete categories. Please sign in as Admin.");
      this.openModal('login-modal');
      return;
    }

    if (catId === 'all' || catId === 'favorites') {
      if (this.remote) this.remote.showToast("System categories cannot be deleted.");
      return;
    }

    const actualCount = catCount !== null 
      ? catCount 
      : this.channels.filter(c => c.category === catId).length;

    const idInput = document.getElementById('delete-cat-id');
    const nameDisplay = document.getElementById('delete-cat-name-display');
    const countDisplay = document.getElementById('delete-cat-channel-count');

    if (idInput) idInput.value = catId;
    if (nameDisplay) nameDisplay.textContent = catName || catId;
    if (countDisplay) countDisplay.textContent = `${actualCount}`;

    this.openModal('delete-category-modal');
  }

  // Confirm and Execute Category Deletion
  handleConfirmDeleteCategory() {
    if (!this.auth || !this.auth.isAdmin()) {
      alert("Administrator access required to delete categories. Please sign in as Admin.");
      this.openModal('login-modal');
      return;
    }

    const idInput = document.getElementById('delete-cat-id');
    const catId = idInput ? idInput.value.trim() : '';
    if (!catId) return;

    if (!this.deletedCategoryIds.includes(catId)) {
      this.deletedCategoryIds.push(catId);
    }
    delete this.categoryRenames[catId];

    // Remove from customCategories
    this.customCategories = this.customCategories.filter(c => c.id !== catId);

    // Reassign all channels in this category to 'general'
    let movedCount = 0;
    this.channels.forEach(ch => {
      if (ch.category === catId) {
        ch.category = 'general';
        ch.categoryName = 'General';
        movedCount++;
      }
    });
    this.customChannels.forEach(ch => {
      if (ch.category === catId) {
        ch.category = 'general';
        ch.categoryName = 'General';
      }
    });

    if (this.currentCategory === catId) {
      this.currentCategory = 'all';
    }

    this.saveStorage();
    this.populateCategorySelects();
    this.renderCategories();
    this.renderChannels();
    this.renderManageCategoriesList();
    this.closeModal('delete-category-modal');

    if (this.remote) {
      this.remote.showToast(`Category deleted. ${movedCount} channel(s) moved to General.`);
    }
  }

  // Add custom category
  handleAddCategory(name, tamilName) {
    if (!this.auth || !this.auth.isAdmin()) {
      alert("Administrator access required to add categories. Please sign in as Admin.");
      this.openModal('login-modal');
      return false;
    }

    name = (name || '').trim();
    tamilName = (tamilName || '').trim() || name;
    if (!name) {
      alert("Please enter a category name.");
      return false;
    }

    const catId = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || `cat-${Date.now()}`;
    
    // Check if already exists in this.customCategories
    const existingIndex = this.customCategories.findIndex(c => c.id === catId || c.name.toLowerCase() === name.toLowerCase());
    const catObj = { id: catId, name, tamil: tamilName, tamilName };
    if (existingIndex >= 0) {
      this.customCategories[existingIndex] = catObj;
    } else {
      this.customCategories.push(catObj);
    }

    this.saveStorage();
    this.populateCategorySelects(catId, catId);
    this.renderCategories();

    // Select category tab
    this.setCategory(catId);
    this.closeModal('add-category-modal');

    if (this.remote) {
      this.remote.showToast(`Category "${name}" created! ✅`);
    }
    return true;
  }

  // Open Edit Channel Modal
  openEditChannelModal(channelId) {
    if (!this.auth || !this.auth.isAdmin()) {
      alert("Administrator access required to edit channels. Please sign in as Admin.");
      this.openModal('login-modal');
      return;
    }

    const ch = this.channels.find(c => c.id === channelId);
    if (!ch) {
      if (this.remote) this.remote.showToast("Channel not found.");
      return;
    }

    this.editingChannelId = channelId;

    // Populate inputs
    const idInput = document.getElementById('edit-ch-id');
    const nameInput = document.getElementById('edit-ch-name');
    const numInput = document.getElementById('edit-ch-num');
    const tamilInput = document.getElementById('edit-ch-tamil-name');
    const streamInput = document.getElementById('edit-ch-stream-url');
    const logoInput = document.getElementById('edit-ch-logo');
    const logoPreview = document.getElementById('edit-logo-preview');
    const inlineCatBox = document.getElementById('edit-ch-inline-new-cat');
    const inlineName = document.getElementById('edit-inline-cat-name');
    const inlineTamil = document.getElementById('edit-inline-cat-tamil');

    if (idInput) idInput.value = ch.id;
    if (nameInput) nameInput.value = ch.name || '';
    if (numInput) numInput.value = ch.num || '';
    if (tamilInput) tamilInput.value = ch.tamilName || '';
    if (streamInput) streamInput.value = ch.streamUrl || '';
    if (logoInput) logoInput.value = ch.logo || '';
    if (logoPreview) {
      logoPreview.src = ch.logo || generateChannelLogoSvg(ch.name, ch.tamilName, ch.color);
    }
    if (inlineCatBox) inlineCatBox.classList.add('hidden');
    if (inlineName) inlineName.value = '';
    if (inlineTamil) inlineTamil.value = '';

    // Populate category dropdown and select channel's category
    this.populateCategorySelects(null, ch.category);

    this.openModal('edit-channel-modal');
  }

  // Save changes from Edit Channel Modal
  handleSaveEditedChannel() {
    if (!this.auth || !this.auth.isAdmin()) {
      alert("Administrator access required to edit channels. Please sign in as Admin.");
      this.openModal('login-modal');
      return;
    }

    const idInput = document.getElementById('edit-ch-id');
    const nameInput = document.getElementById('edit-ch-name');
    const numInput = document.getElementById('edit-ch-num');
    const tamilInput = document.getElementById('edit-ch-tamil-name');
    const streamInput = document.getElementById('edit-ch-stream-url');
    const categorySelect = document.getElementById('edit-ch-category');
    const logoInput = document.getElementById('edit-ch-logo');

    const channelId = idInput?.value || this.editingChannelId;
    const chIndex = this.channels.findIndex(c => c.id === channelId);
    if (chIndex === -1) {
      alert("Channel not found to update.");
      return;
    }

    const name = nameInput ? nameInput.value.trim() : '';
    const streamUrl = streamInput ? streamInput.value.trim() : '';
    const num = numInput && numInput.value.trim() ? numInput.value.trim() : this.channels[chIndex].num;
    const tamilName = tamilInput ? tamilInput.value.trim() : '';
    let category = categorySelect ? categorySelect.value : this.channels[chIndex].category;
    const logo = logoInput ? logoInput.value.trim() : '';

    if (!name || !streamUrl) {
      alert("Channel Name and Stream URL are required.");
      return;
    }

    // Check if inline new category was selected
    if (category === '__new__') {
      const newCatName = document.getElementById('edit-inline-cat-name')?.value.trim();
      const newCatTamil = document.getElementById('edit-inline-cat-tamil')?.value.trim();
      if (newCatName) {
        const catId = newCatName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || `cat-${Date.now()}`;
        if (!this.customCategories.some(c => c.id === catId)) {
          this.customCategories.push({ id: catId, name: newCatName, tamil: newCatTamil || newCatName, tamilName: newCatTamil || newCatName });
        }
        category = catId;
      } else {
        category = this.channels[chIndex].category || 'local';
      }
    }

    // Determine category display name
    const matchedCat = this.customCategories.find(c => c.id === category);
    const categoryName = matchedCat ? (matchedCat.tamilName || matchedCat.name) : category;

    const oldStreamUrl = this.channels[chIndex].streamUrl;
    const isCurrentPlaying = this.currentChannel && this.currentChannel.id === channelId;

    // Update channel object
    const updatedChannel = {
      ...this.channels[chIndex],
      name,
      num,
      tamilName: tamilName || name,
      streamUrl,
      category,
      categoryName,
      logo,
      isCustom: true // Mark as custom so it persists in customChannels
    };

    this.channels[chIndex] = updatedChannel;

    // Also update customChannels list
    const customIdx = this.customChannels.findIndex(c => c.id === channelId);
    if (customIdx >= 0) {
      this.customChannels[customIdx] = updatedChannel;
    } else {
      this.customChannels.push(updatedChannel);
    }

    this.saveStorage();
    this.populateCategorySelects();
    this.renderCategories();
    this.renderChannels();
    this.closeModal('edit-channel-modal');

    // If this channel is currently playing, update UI & player
    if (isCurrentPlaying) {
      this.currentChannel = updatedChannel;
      this.updatePlayerInfoUI(updatedChannel);
      // If stream URL changed, reload stream
      if (oldStreamUrl !== streamUrl) {
        this.playChannel(updatedChannel);
      }
    }

    if (this.remote) {
      this.remote.showToast(`Updated "${name}" successfully! ✅`);
    }
  }

  // Add single custom channel
  handleAddCustomChannel() {
    if (!this.auth || !this.auth.isAdmin()) {
      alert("Administrator access required to add channels. Please sign in as Admin.");
      this.openModal('login-modal');
      return;
    }

    const nameInput = document.getElementById('custom-ch-name');
    const tamilInput = document.getElementById('custom-ch-tamil-name');
    const streamInput = document.getElementById('custom-ch-stream-url');
    const categoryInput = document.getElementById('custom-ch-category');
    const logoInput = document.getElementById('custom-ch-logo');

    const name = nameInput ? nameInput.value.trim() : '';
    const tamilName = tamilInput ? tamilInput.value.trim() : '';
    const streamUrl = streamInput ? streamInput.value.trim() : '';
    let category = categoryInput ? categoryInput.value : 'local';
    const logoUrl = logoInput ? logoInput.value.trim() : '';

    if (!name || !streamUrl) {
      alert("Channel Name and Stream URL are required.");
      return;
    }

    // Check if inline new category was specified
    if (category === '__new__') {
      const newCatName = document.getElementById('add-inline-cat-name')?.value.trim();
      const newCatTamil = document.getElementById('add-inline-cat-tamil')?.value.trim();
      if (newCatName) {
        const catId = newCatName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || `cat-${Date.now()}`;
        if (!this.customCategories.some(c => c.id === catId)) {
          this.customCategories.push({ id: catId, name: newCatName, tamil: newCatTamil || newCatName, tamilName: newCatTamil || newCatName });
        }
        category = catId;
      } else {
        category = 'local';
      }
    }

    // Determine category display name
    const matchedCat = this.customCategories.find(c => c.id === category);
    const categoryName = matchedCat ? (matchedCat.name || matchedCat.id) : (category === 'local' ? 'Tamil Local' : category);

    const numInput = document.getElementById('custom-ch-num');
    const customNum = numInput ? numInput.value.trim() : '';
    const maxNum = this.channels.reduce((max, c) => Math.max(max, parseInt(c.num, 10) || 0), 0);
    const nextNum = Math.max(maxNum, 100) + 1;
    const finalNum = customNum || nextNum;

    const newChannel = {
      id: `custom-${Date.now()}`,
      num: finalNum,
      name: name,
      tamilName: name, // alternative name disabled
      category: category,
      categoryName: categoryName,
      logo: logoUrl,
      streamUrl: streamUrl,
      badge: "CUSTOM",
      isCustom: true,
      description: "User added custom live channel.",
      epgSchedule: []
    };

    this.customChannels.push(newChannel);
    this.channels.push(newChannel);
    this.saveStorage();
    this.populateCategorySelects();
    this.currentCategory = category || 'all';
    this.displayLimit = 60;
    this.renderCategories();
    this.renderChannels();
    this.closeModal('add-channel-modal');

    // Reset inline box if open
    const inlineBox = document.getElementById('add-ch-inline-new-cat');
    if (inlineBox) inlineBox.classList.add('hidden');

    if (this.remote) {
      this.remote.closeAllModals();
      this.remote.showToast(`Channel "${name}" added!`);
    } else {
      document.querySelectorAll('.app-modal').forEach(m => {
        m.classList.add('hidden');
        m.classList.remove('flex', 'active');
        m.style.setProperty('display', 'none', 'important');
      });
    }

    this.playChannel(newChannel);
    document.getElementById('add-channel-form')?.reset();
  }

  // Update Authentication UI (Screen visibility, Header pill, dropdown menu, Admin controls visibility)
  updateAuthUI() {
    const isLoggedIn = !!(this.auth && this.auth.isLoggedIn());
    const loginScreen = document.getElementById('login-screen-view');
    const mainLayout = document.getElementById('app-main-layout');

    if (isLoggedIn) {
      if (loginScreen) {
        loginScreen.classList.add('hidden');
        loginScreen.classList.remove('flex');
      }
      if (mainLayout) {
        mainLayout.classList.remove('hidden');
        mainLayout.classList.add('flex');
      }
    } else {
      if (loginScreen) {
        loginScreen.classList.remove('hidden');
        loginScreen.classList.add('flex');
      }
      if (mainLayout) {
        mainLayout.classList.add('hidden');
        mainLayout.classList.remove('flex');
      }
      if (this.player) {
        try { this.player.destroy(); } catch (e) {}
      }
    }

    const authContainer = document.getElementById('auth-header-container');
    const user = this.auth ? this.auth.getCurrentUser() : null;
    const isAdmin = this.auth ? this.auth.isAdmin() : false;

    if (authContainer) {
      if (user) {
        const isUserAdmin = user.role === 'admin';
        authContainer.innerHTML = `
          <div class="relative">
            <button id="btn-user-profile-menu" class="px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border ${isUserAdmin ? 'border-rose-500/50' : 'border-cyan-500/50'} text-white font-bold text-xs flex items-center space-x-2 cursor-pointer transition-all shadow-sm">
              <div class="w-6 h-6 rounded-lg ${isUserAdmin ? 'bg-rose-600/30 text-rose-400 border border-rose-500/40' : 'bg-cyan-600/30 text-cyan-400 border border-cyan-500/40'} flex items-center justify-center text-xs">
                ${isUserAdmin 
                  ? `<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>`
                  : `<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>`
                }
              </div>
              <div class="text-left leading-none hidden sm:block">
                <span class="block text-xs text-white max-w-[85px] truncate">${user.name || user.username}</span>
                <span class="text-[9px] ${isUserAdmin ? 'text-rose-400' : 'text-cyan-400'} font-extrabold uppercase tracking-wider">${user.role}</span>
              </div>
              <svg class="w-3 h-3 text-slate-400" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"></polyline></svg>
            </button>

            <!-- Dropdown Menu -->
            <div id="user-profile-dropdown" class="hidden absolute right-0 mt-2 w-56 rounded-2xl bg-slate-900/95 border border-slate-800 shadow-2xl backdrop-blur-md p-1.5 z-50 text-xs">
              <div class="px-3 py-2 border-b border-slate-800/80 mb-1">
                <div class="font-bold text-white truncate">${user.name || user.username}</div>
                <div class="text-[11px] text-slate-400 font-mono">@${user.username} • <span class="capitalize font-semibold ${isUserAdmin ? 'text-rose-400' : 'text-cyan-400'}">${user.role}</span></div>
              </div>

              ${isUserAdmin ? `
                <button id="btn-menu-manage-users" class="w-full text-left px-3 py-2 rounded-xl text-rose-300 hover:text-white hover:bg-rose-950/40 flex items-center space-x-2 transition-colors cursor-pointer font-medium">
                  <svg class="w-4 h-4 text-rose-400" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                  <span>Manage Users</span>
                </button>
              ` : ''}

              <button id="btn-menu-change-pw" class="w-full text-left px-3 py-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 flex items-center space-x-2 transition-colors cursor-pointer font-medium">
                <svg class="w-4 h-4 text-cyan-400" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                <span>${isUserAdmin ? 'Change Admin Password' : 'Change Password'}</span>
              </button>

              <div class="border-t border-slate-800/80 my-1"></div>

              <button id="btn-menu-logout" class="w-full text-left px-3 py-2 rounded-xl text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 flex items-center space-x-2 transition-colors cursor-pointer font-semibold">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        `;

        // Toggle dropdown
        const toggleBtn = document.getElementById('btn-user-profile-menu');
        const dropdown = document.getElementById('user-profile-dropdown');
        if (toggleBtn && dropdown) {
          toggleBtn.onclick = (e) => {
            e.stopPropagation();
            dropdown.classList.toggle('hidden');
          };
        }

        document.getElementById('btn-menu-manage-users')?.addEventListener('click', () => {
          dropdown?.classList.add('hidden');
          this.openUserManagementModal();
        });
        document.getElementById('btn-menu-change-pw')?.addEventListener('click', () => {
          dropdown?.classList.add('hidden');
          this.openChangePasswordModal(user.username);
        });
        document.getElementById('btn-menu-logout')?.addEventListener('click', () => {
          dropdown?.classList.add('hidden');
          this.handleLogout();
        });
      } else {
        authContainer.innerHTML = `
          <button id="btn-open-login" onclick="openAppModal('login-modal')" class="px-3 py-1.5 rounded-xl bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white font-bold text-xs shadow-md shadow-rose-950 flex items-center space-x-1.5 cursor-pointer transition-all">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path><polyline points="10 17 15 12 10 7"></polyline><line x1="15" y1="12" x2="3" y2="12"></line></svg>
            <span>Login</span>
          </button>
        `;
      }
    }

    // Toggle Admin-only Controls Visibility in Header & Toolbars
    const addChannelBtn = document.getElementById('btn-open-add-channel');
    const importBtn = document.getElementById('btn-open-import');
    const addCategoryBtn = document.getElementById('btn-open-add-category');
    const manageCategoriesBtn = document.getElementById('btn-open-manage-categories');
    const editCurrentBtn = document.getElementById('btn-edit-current');
    const deleteCurrentBtn = document.getElementById('btn-delete-current');
    const deleteAllBtn = document.getElementById('btn-delete-all-settings');
    const epgBtn = document.getElementById('btn-open-epg');
    const settingsBtn = document.getElementById('btn-open-settings');
    const deleteAllChannelsBtn = document.getElementById('btn-delete-all-channels');
    const exportM3uBtn = document.getElementById('btn-export-m3u');
    const sidebarSep = document.getElementById('sidebar-action-sep');
    const deleteAllGridBtn = document.getElementById('btn-delete-all-grid');

    if (addChannelBtn) addChannelBtn.style.display = isAdmin ? 'inline-flex' : 'none';
    if (importBtn) importBtn.style.display = isAdmin ? 'inline-flex' : 'none';
    if (addCategoryBtn) addCategoryBtn.style.display = isAdmin ? 'inline-flex' : 'none';
    if (manageCategoriesBtn) manageCategoriesBtn.style.display = isAdmin ? 'inline-flex' : 'none';
    if (editCurrentBtn) editCurrentBtn.style.display = isAdmin ? 'inline-flex' : 'none';
    if (deleteCurrentBtn) deleteCurrentBtn.style.display = isAdmin ? 'inline-flex' : 'none';
    if (deleteAllBtn) deleteAllBtn.style.display = isAdmin ? 'inline-block' : 'none';
    if (epgBtn) epgBtn.style.display = isAdmin ? 'inline-flex' : 'none';
    if (settingsBtn) settingsBtn.style.display = isAdmin ? 'inline-flex' : 'none';
    if (deleteAllChannelsBtn) deleteAllChannelsBtn.style.display = isAdmin ? 'inline-flex' : 'none';
    if (exportM3uBtn) exportM3uBtn.style.display = isAdmin ? 'inline-flex' : 'none';
    if (sidebarSep) sidebarSep.style.display = isAdmin ? 'inline' : 'none';
    if (deleteAllGridBtn) deleteAllGridBtn.style.display = isAdmin ? 'inline-flex' : 'none';

    // Hide Screenshot 1 controls from User Login & disable EPG / Shortcuts options
    const sourceBar = document.getElementById('player-stream-source-bar');
    if (sourceBar) {
      if (isAdmin) {
        sourceBar.classList.remove('hidden');
        sourceBar.classList.add('flex');
      } else {
        sourceBar.classList.add('hidden');
        sourceBar.classList.remove('flex');
      }
    }
    const epgStrip = document.getElementById('player-epg-strip');
    if (epgStrip) {
      epgStrip.classList.add('hidden');
      epgStrip.classList.remove('flex');
    }
    const shortcutsBtn = document.getElementById('btn-open-shortcuts');
    if (shortcutsBtn) shortcutsBtn.style.display = 'none';
    if (epgBtn) epgBtn.style.display = 'none';

    this.renderChannels();
  }

  // Generic Execute Login
  executeLogin(username, password, errorAlertEl, errorTextEl, options = {}) {
    username = (username || '').trim();
    password = (password || '').trim();

    if (!this.auth) {
      alert("Auth system unavailable.");
      return;
    }

    // Strict Enforcement: Admin portal only allows admin role to log in
    if (options.requireAdmin) {
      const targetUser = this.auth.getUser(username);
      if (targetUser && targetUser.role !== 'admin') {
        if (errorAlertEl && errorTextEl) {
          errorTextEl.textContent = 'Access Denied: Only Administrator accounts can log in via Admin Portal. Please use the User Login page.';
          errorAlertEl.classList.remove('hidden');
        } else {
          alert('Access Denied: Only Administrator accounts can log in via Admin Portal. Please use the User Login page.');
        }
        return;
      }
    }

    const res = this.auth.login(username, password);
    if (!res.success) {
      if (errorAlertEl && errorTextEl) {
        errorTextEl.textContent = res.message || 'Invalid username or password.';
        errorAlertEl.classList.remove('hidden');
      } else {
        alert(res.message || 'Invalid credentials');
      }
      return;
    }

    // Post-authentication guard for Admin Portal
    if (options.requireAdmin && res.user.role !== 'admin') {
      this.auth.logout();
      if (errorAlertEl && errorTextEl) {
        errorTextEl.textContent = 'Access Denied: Only Administrator accounts can log in via Admin Portal. Please use the User Login page.';
        errorAlertEl.classList.remove('hidden');
      } else {
        alert('Access Denied: Only Administrator accounts can log in via Admin Portal. Please use the User Login page.');
      }
      return;
    }

    // Login successful
    if (errorAlertEl) errorAlertEl.classList.add('hidden');
    this.closeModal('login-modal');

    // Reset login forms
    document.getElementById('screen-user-login-form')?.reset();
    document.getElementById('screen-admin-login-form')?.reset();
    document.getElementById('login-form')?.reset();

    // Transition from login screen to main app layout
    this.updateAuthUI();
    this.renderCategories();
    this.renderChannels();

    // Auto-play channel upon login (After login only TV channels will play)
    const accessible = this.getUserAccessibleChannels();
    if (accessible && accessible.length > 0) {
      const lastWatchedId = (typeof SafeStorage !== 'undefined') 
        ? SafeStorage.getItem('tamil_iptv_last_channel') 
        : null;
      const targetChannel = accessible.find(c => c.id === lastWatchedId) || accessible[0];
      if (targetChannel) {
        this.playChannel(targetChannel);
      }
    } else {
      this.clearPlayerUI();
    }

    if (this.remote) {
      this.remote.showToast(`Welcome back, ${res.user.name || res.user.username}! (${res.user.role.toUpperCase()}) ✅`);
    }
  }

  // Handle Login from Modal
  handleLogin() {
    const uInput = document.getElementById('login-username');
    const pInput = document.getElementById('login-password');
    const errorAlert = document.getElementById('login-error-alert');
    const errorText = document.getElementById('login-error-text');

    const username = uInput ? uInput.value.trim() : '';
    const password = pInput ? pInput.value.trim() : '';
    this.executeLogin(username, password, errorAlert, errorText);
  }

  // Handle Screen Admin Add User (EXCLUSIVELY in the Admin page)
  handleScreenAdminAddUser() {
    const adminPwInput = document.getElementById('screen-adduser-adminpw');
    const uInput = document.getElementById('screen-adduser-username');
    const pInput = document.getElementById('screen-adduser-password');
    const nameInput = document.getElementById('screen-adduser-name');
    const roleInput = document.getElementById('screen-adduser-role');

    const errorAlert = document.getElementById('screen-adduser-error');
    const errorText = document.getElementById('screen-adduser-error-text');
    const successAlert = document.getElementById('screen-adduser-success');
    const successText = document.getElementById('screen-adduser-success-text');

    const adminPw = adminPwInput ? adminPwInput.value.trim() : '';
    const username = uInput ? uInput.value.trim() : '';
    const password = pInput ? pInput.value.trim() : '';
    const name = nameInput ? nameInput.value.trim() : '';
    const role = roleInput ? roleInput.value : 'user';

    if (!this.auth) return;

    const res = this.auth.createFromLogin(adminPw, username, password, role, name);

    if (!res.success) {
      if (successAlert) successAlert.classList.add('hidden');
      if (errorAlert && errorText) {
        errorText.textContent = res.message;
        errorAlert.classList.remove('hidden');
      } else {
        alert(res.message);
      }
      return;
    }

    // Successfully created user
    if (errorAlert) errorAlert.classList.add('hidden');
    if (successAlert && successText) {
      successText.textContent = `User "${username}" (${role.toUpperCase()}) created successfully!`;
      successAlert.classList.remove('hidden');
    }

    document.getElementById('screen-admin-adduser-form')?.reset();

    // Prefill the new credentials into the appropriate login form
    if (role === 'admin') {
      const screenAdminU = document.getElementById('screen-admin-username');
      const screenAdminP = document.getElementById('screen-admin-password');
      if (screenAdminU) screenAdminU.value = username;
      if (screenAdminP) screenAdminP.value = password;
      setTimeout(() => {
        document.getElementById('admin-subtab-signin')?.click();
      }, 1200);
    } else {
      const screenUserU = document.getElementById('screen-user-username');
      const screenUserP = document.getElementById('screen-user-password');
      if (screenUserU) screenUserU.value = username;
      if (screenUserP) screenUserP.value = password;
      setTimeout(() => {
        document.getElementById('screen-tab-user-btn')?.click();
      }, 1200);
    }

    // Refresh User Management list if open
    this.renderUsersList();

    if (this.remote) {
      this.remote.showToast(`User "${username}" created successfully! ✅`);
    }
  }

  // Handle Logout (Returns to Login Page)
  handleLogout() {
    if (this.auth) {
      this.auth.logout();
    }
    this.currentChannel = null;
    if (this.player) {
      try { this.player.destroy(); } catch (e) {}
    }
    this.showLoginRequiredUI();
    this.updateAuthUI();

    if (this.remote) {
      this.remote.closeAllModals();
      this.remote.showToast("Signed out. Returned to Login Page.");
    } else {
      document.querySelectorAll('.app-modal').forEach(m => {
        m.classList.add('hidden');
        m.classList.remove('flex', 'active');
        m.style.setProperty('display', 'none', 'important');
      });
    }
  }

  // Handle creating a user directly from the Login Modal
  handleCreateUserFromLogin() {
    const adminPwInput = document.getElementById('login-new-admin-pw');
    const uInput = document.getElementById('login-new-username');
    const pInput = document.getElementById('login-new-user-pw');
    const nameInput = document.getElementById('login-new-display-name');
    const roleInput = document.getElementById('login-new-user-role');

    const errorAlert = document.getElementById('login-error-alert');
    const errorText = document.getElementById('login-error-text');
    const successAlert = document.getElementById('login-success-alert');
    const successText = document.getElementById('login-success-text');

    const adminPw = adminPwInput ? adminPwInput.value.trim() : '';
    const username = uInput ? uInput.value.trim() : '';
    const password = pInput ? pInput.value.trim() : '';
    const name = nameInput ? nameInput.value.trim() : '';
    const role = roleInput ? roleInput.value : 'user';

    if (!this.auth) return;

    const res = this.auth.createFromLogin(adminPw, username, password, role, name);

    if (!res.success) {
      if (successAlert) successAlert.classList.add('hidden');
      if (errorAlert && errorText) {
        errorText.textContent = res.message;
        errorAlert.classList.remove('hidden');
      } else {
        alert(res.message);
      }
      return;
    }

    // Successfully created user
    if (errorAlert) errorAlert.classList.add('hidden');
    if (successAlert && successText) {
      successText.textContent = `User "${username}" created successfully! Switching to Sign In...`;
      successAlert.classList.remove('hidden');
    }

    // Prefill the login form with new credentials
    const loginU = document.getElementById('login-username');
    const loginP = document.getElementById('login-password');
    if (loginU) loginU.value = username;
    if (loginP) loginP.value = password;

    document.getElementById('login-add-user-form')?.reset();

    // Auto-switch back to Sign In tab after short pause
    setTimeout(() => {
      document.getElementById('tab-btn-signin')?.click();
      if (successAlert) successAlert.classList.add('hidden');
    }, 1200);

    // Refresh User Management list if rendered
    this.renderUsersList();

    if (this.remote) {
      this.remote.showToast(`User "${username}" created successfully! ✅`);
    }
  }

  // Open User Management Modal (Admin Only)
  openUserManagementModal() {
    if (!this.auth || !this.auth.isAdmin()) {
      alert("Permission denied: Only administrators can access user management.");
      return;
    }

    // Populate channel checklist for create user form
    const createChecklist = document.getElementById('new-user-channels-checklist');
    const updateCreateSelectedCount = () => {
      const countEl = document.getElementById('new-user-channels-selected-count');
      if (!createChecklist || !countEl) return;
      const checkedBoxes = createChecklist.querySelectorAll('input[type="checkbox"]:checked');
      countEl.textContent = `${checkedBoxes.length} of ${this.channels.length} channels selected`;
    };

    if (createChecklist) {
      createChecklist.innerHTML = this.channels.map(ch => `
        <label data-search="${ch.name.toLowerCase()} ${ch.num} ${(ch.category||'').toLowerCase()}" class="new-user-channel-item flex items-center space-x-2 p-1.5 rounded-lg hover:bg-slate-800/80 cursor-pointer">
          <input type="checkbox" name="new-user-channel" value="${ch.id}" checked class="rounded text-emerald-500 focus:ring-0 bg-slate-950 border-slate-700 cursor-pointer">
          <span class="text-[10px] font-mono text-cyan-400 bg-cyan-950/60 px-1 py-0.2 rounded border border-cyan-800/60">CH ${ch.num}</span>
          <span class="text-white truncate flex-1">${ch.name}</span>
          <span class="text-[10px] text-slate-500 uppercase">${ch.category || 'general'}</span>
        </label>
      `).join('');

      createChecklist.querySelectorAll('input[type="checkbox"]').forEach(box => {
        box.onchange = updateCreateSelectedCount;
      });
      updateCreateSelectedCount();
    }

    // Real-time Channel Search in Add User panel
    const newSearchInput = document.getElementById('new-user-channel-search');
    if (newSearchInput) {
      newSearchInput.value = '';
      newSearchInput.oninput = () => {
        const query = newSearchInput.value.toLowerCase().trim();
        const items = createChecklist?.querySelectorAll('.new-user-channel-item');
        items?.forEach(item => {
          const text = item.getAttribute('data-search') || '';
          item.style.display = text.includes(query) ? 'flex' : 'none';
        });
      };
    }

    // Toggle watch hours window in create user
    const modeSelect = document.getElementById('new-user-watch-mode');
    const hoursWindow = document.getElementById('new-user-hours-window');
    if (modeSelect && hoursWindow) {
      modeSelect.onchange = () => {
        hoursWindow.classList.toggle('hidden', modeSelect.value !== 'custom');
      };
    }

    // Toggle channels picker in create user
    const accessSelect = document.getElementById('new-user-channel-access');
    const channelsPicker = document.getElementById('new-user-channels-picker');
    if (accessSelect && channelsPicker) {
      accessSelect.onchange = () => {
        channelsPicker.classList.toggle('hidden', accessSelect.value !== 'selected');
      };
    }

    document.getElementById('btn-new-user-select-all')?.addEventListener('click', () => {
      createChecklist?.querySelectorAll('input[type="checkbox"]').forEach(b => { b.checked = true; });
      updateCreateSelectedCount();
    });
    document.getElementById('btn-new-user-clear-all')?.addEventListener('click', () => {
      createChecklist?.querySelectorAll('input[type="checkbox"]').forEach(b => { b.checked = false; });
      updateCreateSelectedCount();
    });

    // Wire up Change Admin Password quick button
    document.getElementById('btn-admin-change-own-pw')?.addEventListener('click', () => {
      this.openChangePasswordModal('admin');
    });

    this.renderUsersList();
    this.openModal('user-management-modal');
  }

  // Render User Management table/list
  renderUsersList() {
    const container = document.getElementById('users-list-container');
    const countBadge = document.getElementById('users-count-badge');
    if (!container || !this.auth) return;

    const users = this.auth.getUsers();
    if (countBadge) countBadge.textContent = `${users.length} Users`;

    const currentUser = this.auth.getCurrentUser();

    container.innerHTML = users.map(u => {
      const isCurrentActive = currentUser && currentUser.username.toLowerCase() === u.username.toLowerCase();
      const isSystemAdmin = u.username.toLowerCase() === 'admin';
      const isRoleAdmin = u.role === 'admin';
      const activeDevices = Array.isArray(u.activeDevices) ? u.activeDevices : [];
      const maxDevices = Number(u.maxDevices) || (isRoleAdmin ? 10 : 2);
      const activeCount = activeDevices.length;
      
      const channelAccess = u.channelAccess === 'selected' 
        ? `${(u.allowedChannels || []).length} Channels Assigned` 
        : 'All Channels';

      const watchLimit = (u.dailyLimitMinutes && Number(u.dailyLimitMinutes) > 0)
        ? `${u.dailyLimitMinutes} min/day`
        : 'Unlimited';

      const watchHours = u.watchHoursMode === 'custom'
        ? `${u.watchHoursStart || '08:00'} - ${u.watchHoursEnd || '22:00'}`
        : '24/7';

      return `
        <div class="p-3.5 bg-slate-950/70 border border-slate-800 rounded-2xl flex flex-col space-y-2.5 transition-all hover:border-slate-700">
          <div class="flex items-center justify-between">
            <div class="flex items-center space-x-3 overflow-hidden flex-1">
              <div class="w-10 h-10 rounded-xl ${isRoleAdmin ? 'bg-rose-950/80 border-rose-600/40 text-rose-400' : 'bg-cyan-950/80 border-cyan-600/40 text-cyan-400'} border flex items-center justify-center font-bold text-xs uppercase flex-shrink-0">
                ${u.username.substring(0, 2)}
              </div>
              <div class="min-w-0 pr-2">
                <div class="flex items-center space-x-2">
                  <span class="text-xs font-bold text-white truncate">${u.name || u.username}</span>
                  <span class="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded ${isRoleAdmin ? 'bg-rose-900/60 text-rose-300' : 'bg-cyan-900/60 text-cyan-300'}">${u.role}</span>
                  ${isCurrentActive ? '<span class="text-[9px] bg-emerald-950 text-emerald-400 border border-emerald-800 px-1.5 py-0.2 rounded font-semibold">YOU</span>' : ''}
                </div>
                <div class="text-[11px] text-slate-400 font-mono mt-0.5">@${u.username} • Created: ${new Date(u.createdAt || Date.now()).toLocaleDateString()}</div>
              </div>
            </div>

            <div class="flex items-center space-x-1.5 pl-2">
              <button data-action="edit-user" data-username="${u.username}" class="btn-user-edit px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-cyan-300 hover:text-cyan-200 border border-slate-800 text-[11px] font-semibold transition-colors flex items-center space-x-1 cursor-pointer" title="Edit Settings for @${u.username}">
                <svg class="w-3 h-3" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
                <span>Edit</span>
              </button>
              <button data-action="change-pw" data-username="${u.username}" class="btn-user-change-pw px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 text-[11px] font-semibold transition-colors flex items-center space-x-1 cursor-pointer" title="Change Password for @${u.username}">
                <svg class="w-3 h-3" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                <span>Password</span>
              </button>
              ${(!isSystemAdmin && !isCurrentActive) ? `
                <button data-action="delete-user" data-username="${u.username}" class="btn-user-delete px-2 py-1 rounded-lg bg-rose-950/40 hover:bg-rose-950 text-rose-400 hover:text-rose-300 border border-rose-900/40 text-[11px] transition-colors cursor-pointer" title="Delete user @${u.username}">
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                </button>
              ` : ''}
            </div>
          </div>

          <!-- User Stats / Settings Badges -->
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 border-t border-slate-800/60 text-[11px]">
            <div class="flex items-center justify-between p-2 rounded-xl bg-slate-900/60 border border-slate-800/60">
              <span class="text-slate-400">Devices:</span>
              <div class="flex items-center space-x-1.5">
                <span class="font-mono font-bold ${activeCount >= maxDevices ? 'text-amber-400' : 'text-emerald-400'}">${activeCount} / ${maxDevices}</span>
                ${activeCount > 0 ? `
                  <button data-action="force-logout" data-username="${u.username}" class="btn-user-quick-logout text-[10px] px-1.5 py-0.5 rounded bg-rose-950/80 hover:bg-rose-900 text-rose-300 border border-rose-800/80 cursor-pointer" title="Disconnect all active devices">Logout</button>
                ` : ''}
              </div>
            </div>

            <div class="flex items-center justify-between p-2 rounded-xl bg-slate-900/60 border border-slate-800/60">
              <span class="text-slate-400">Time:</span>
              <span class="font-mono text-white truncate max-w-[110px]" title="${watchLimit} • ${watchHours}">${watchLimit} • ${watchHours}</span>
            </div>

            <div class="flex items-center justify-between p-2 rounded-xl bg-slate-900/60 border border-slate-800/60">
              <span class="text-slate-400">Channels:</span>
              <span class="font-semibold text-cyan-400 truncate max-w-[110px]" title="${channelAccess}">${channelAccess}</span>
            </div>
          </div>

          <!-- Active Devices List if any -->
          ${activeCount > 0 ? `
            <div class="p-2 rounded-xl bg-slate-900/40 border border-slate-800/40 space-y-1">
              <div class="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Active Device Sessions:</div>
              <div class="space-y-1">
                ${activeDevices.map(dev => `
                  <div class="flex items-center justify-between text-[11px] text-slate-300 bg-slate-950/60 px-2 py-1 rounded-lg border border-slate-800/50">
                    <div class="flex items-center space-x-1.5 truncate">
                      <svg class="w-3 h-3 text-emerald-400 flex-shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>
                      <span class="truncate">${dev.deviceName || 'Device'}</span>
                    </div>
                    <button data-username="${u.username}" data-deviceid="${dev.deviceId}" class="btn-logout-single-device text-[10px] text-rose-400 hover:text-rose-300 hover:underline cursor-pointer flex-shrink-0 ml-2">Logout</button>
                  </div>
                `).join('')}
              </div>
            </div>
          ` : ''}
        </div>
      `;
    }).join('');

    // Attach click events
    container.querySelectorAll('.btn-user-edit').forEach(btn => {
      btn.onclick = () => {
        const username = btn.getAttribute('data-username');
        this.openEditUserModal(username);
      };
    });

    container.querySelectorAll('.btn-user-change-pw').forEach(btn => {
      btn.onclick = () => {
        const username = btn.getAttribute('data-username');
        this.openChangePasswordModal(username);
      };
    });

    container.querySelectorAll('.btn-user-quick-logout').forEach(btn => {
      btn.onclick = () => {
        const username = btn.getAttribute('data-username');
        if (confirm(`Logout all active devices for user "${username}"?`)) {
          const res = this.auth.forceLogoutUser(username);
          if (res.success) {
            this.renderUsersList();
            if (this.remote) this.remote.showToast(res.message);
          } else {
            alert(res.message);
          }
        }
      };
    });

    container.querySelectorAll('.btn-logout-single-device').forEach(btn => {
      btn.onclick = () => {
        const username = btn.getAttribute('data-username');
        const deviceId = btn.getAttribute('data-deviceid');
        const res = this.auth.logoutDevice(username, deviceId);
        if (res.success) {
          this.renderUsersList();
          if (this.remote) this.remote.showToast(res.message);
        } else {
          alert(res.message);
        }
      };
    });

    container.querySelectorAll('.btn-user-delete').forEach(btn => {
      btn.onclick = () => {
        const username = btn.getAttribute('data-username');
        if (confirm(`Are you sure you want to delete user "${username}"?`)) {
          const res = this.auth.deleteUser(username);
          if (res.success) {
            this.renderUsersList();
            if (this.remote) this.remote.showToast(res.message);
          } else {
            alert(res.message);
          }
        }
      };
    });
  }

  // Handle Admin creating a new user
  handleCreateUser() {
    const uInput = document.getElementById('new-user-username');
    const pInput = document.getElementById('new-user-password');
    const nInput = document.getElementById('new-user-name');
    const rInput = document.getElementById('new-user-role');
    const dInput = document.getElementById('new-user-max-devices');
    const limitInput = document.getElementById('new-user-daily-limit');
    const modeInput = document.getElementById('new-user-watch-mode');
    const startInput = document.getElementById('new-user-hours-start');
    const endInput = document.getElementById('new-user-hours-end');
    const expiryInput = document.getElementById('new-user-expiry');
    const accessInput = document.getElementById('new-user-channel-access');
    const checklistEl = document.getElementById('new-user-channels-checklist');

    const username = uInput ? uInput.value.trim() : '';
    const password = pInput ? pInput.value.trim() : '';
    const name = nInput ? nInput.value.trim() : '';
    const role = rInput ? rInput.value : 'user';

    const selectedChannels = [];
    if (checklistEl) {
      checklistEl.querySelectorAll('input[type="checkbox"]:checked').forEach(box => {
        selectedChannels.push(box.value);
      });
    }

    const options = {
      maxDevices: dInput ? parseInt(dInput.value, 10) : 2,
      dailyLimitMinutes: limitInput ? parseInt(limitInput.value, 10) : 0,
      watchHoursMode: modeInput ? modeInput.value : 'all',
      watchHoursStart: startInput ? startInput.value : '08:00',
      watchHoursEnd: endInput ? endInput.value : '22:00',
      expiresAt: expiryInput ? (expiryInput.value || null) : null,
      channelAccess: accessInput ? accessInput.value : 'all',
      allowedChannels: selectedChannels
    };

    if (!this.auth) return;

    const res = this.auth.createUser(username, password, role, name, options);
    if (!res.success) {
      alert(res.message);
      return;
    }

    document.getElementById('create-user-form')?.reset();
    this.renderUsersList();
    if (this.remote) {
      this.remote.showToast(`User "${username}" created successfully! ✅`);
    }
  }

  // Open Edit User Modal (Admin Only)
  openEditUserModal(username) {
    if (!this.auth || !this.auth.isAdmin()) {
      alert("Permission denied: Only administrators can edit user configurations.");
      return;
    }

    const user = this.auth.getUser(username);
    if (!user) {
      alert("User not found.");
      return;
    }

    const titleEl = document.getElementById('edit-user-title-name');
    const uInput = document.getElementById('edit-user-username');
    const nInput = document.getElementById('edit-user-name');
    const rInput = document.getElementById('edit-user-role');
    const dInput = document.getElementById('edit-user-max-devices');
    const summaryEl = document.getElementById('edit-user-active-devices-summary');
    const devicesListEl = document.getElementById('edit-user-devices-list');
    const forceLogoutBtn = document.getElementById('btn-edit-force-logout');

    const limitInput = document.getElementById('edit-user-daily-limit');
    const modeInput = document.getElementById('edit-user-watch-mode');
    const windowRow = document.getElementById('edit-user-hours-window');
    const startInput = document.getElementById('edit-user-hours-start');
    const endInput = document.getElementById('edit-user-hours-end');
    const expiryInput = document.getElementById('edit-user-expiry');

    const accessInput = document.getElementById('edit-user-channel-access');
    const pickerRow = document.getElementById('edit-user-channels-picker');
    const checklistEl = document.getElementById('edit-user-channels-checklist');
    const countEl = document.getElementById('edit-user-channels-selected-count');

    if (titleEl) titleEl.textContent = `@${user.username}`;
    if (uInput) uInput.value = user.username;
    if (nInput) nInput.value = user.name || user.username;
    if (rInput) {
      rInput.value = user.role || 'user';
      rInput.disabled = (user.username === 'admin');
    }
    if (dInput) dInput.value = user.maxDevices || 2;

    const activeDevices = Array.isArray(user.activeDevices) ? user.activeDevices : [];
    if (summaryEl) {
      summaryEl.textContent = `${activeDevices.length} Active / ${user.maxDevices || 2} Max Allowed`;
    }

    if (devicesListEl) {
      if (activeDevices.length === 0) {
        devicesListEl.innerHTML = `<div class="text-[11px] text-slate-500 italic p-1">No active devices currently logged in.</div>`;
      } else {
        devicesListEl.innerHTML = activeDevices.map(dev => `
          <div class="flex items-center justify-between text-xs bg-slate-950/80 px-2.5 py-1.5 rounded-xl border border-slate-800">
            <div>
              <span class="font-medium text-white">${dev.deviceName || 'Device'}</span>
              <span class="text-[10px] text-slate-500 font-mono ml-1.5">Last active: ${new Date(dev.lastActive || Date.now()).toLocaleTimeString()}</span>
            </div>
            <button type="button" data-deviceid="${dev.deviceId}" class="btn-edit-logout-device px-2 py-0.5 rounded bg-rose-950 text-rose-300 hover:text-white border border-rose-800 text-[10px] font-bold cursor-pointer">Logout Device</button>
          </div>
        `).join('');

        devicesListEl.querySelectorAll('.btn-edit-logout-device').forEach(b => {
          b.onclick = () => {
            const devId = b.getAttribute('data-deviceid');
            this.auth.logoutDevice(user.username, devId);
            this.openEditUserModal(user.username);
            this.renderUsersList();
          };
        });
      }
    }

    if (forceLogoutBtn) {
      forceLogoutBtn.onclick = () => {
        if (confirm(`Logout all active devices for @${user.username}?`)) {
          this.auth.forceLogoutUser(user.username);
          this.openEditUserModal(user.username);
          this.renderUsersList();
          if (this.remote) this.remote.showToast(`All devices logged out for @${user.username}`);
        }
      };
    }

    // Watch Time & Hours
    if (limitInput) limitInput.value = user.dailyLimitMinutes || 0;
    if (modeInput) {
      modeInput.value = user.watchHoursMode || 'all';
      if (windowRow) windowRow.classList.toggle('hidden', user.watchHoursMode !== 'custom');
      modeInput.onchange = () => {
        if (windowRow) windowRow.classList.toggle('hidden', modeInput.value !== 'custom');
      };
    }
    if (startInput) startInput.value = user.watchHoursStart || '08:00';
    if (endInput) endInput.value = user.watchHoursEnd || '22:00';
    if (expiryInput) expiryInput.value = user.expiresAt || '';

    // Permitted Channels Checklist
    const allowedSet = new Set(Array.isArray(user.allowedChannels) ? user.allowedChannels : []);
    if (accessInput) {
      accessInput.value = user.channelAccess || 'all';
      if (pickerRow) pickerRow.classList.toggle('hidden', user.channelAccess !== 'selected');
      accessInput.onchange = () => {
        if (pickerRow) pickerRow.classList.toggle('hidden', accessInput.value !== 'selected');
      };
    }

    const updateSelectedCount = () => {
      if (!checklistEl || !countEl) return;
      const checkedBoxes = checklistEl.querySelectorAll('input[type="checkbox"]:checked');
      countEl.textContent = `${checkedBoxes.length} of ${this.channels.length} channels selected`;
    };

    if (checklistEl) {
      checklistEl.innerHTML = this.channels.map(ch => {
        const isChecked = allowedSet.has(ch.id);
        const searchStr = `${ch.name} ${ch.num} ${ch.category || ''}`.toLowerCase();
        return `
          <label data-search="${searchStr}" class="edit-user-channel-item flex items-center space-x-2.5 p-1.5 rounded-lg hover:bg-slate-800/80 cursor-pointer border border-slate-900 transition-colors">
            <input type="checkbox" name="edit-user-channel" value="${ch.id}" ${isChecked ? 'checked' : ''} class="rounded text-cyan-500 focus:ring-0 bg-slate-950 border-slate-700 cursor-pointer">
            <span class="text-[10px] font-mono text-cyan-400 bg-cyan-950/60 px-1 py-0.2 rounded border border-cyan-800/60">CH ${ch.num}</span>
            <span class="font-medium text-slate-200 truncate flex-1">${ch.name}</span>
            <span class="text-[10px] text-slate-500 uppercase">${ch.category || 'general'}</span>
          </label>
        `;
      }).join('');

      checklistEl.querySelectorAll('input[type="checkbox"]').forEach(box => {
        box.onchange = updateSelectedCount;
      });
      updateSelectedCount();
    }

    // Real-time Channel Search in Edit User panel
    const editSearchInput = document.getElementById('edit-user-channel-search');
    if (editSearchInput) {
      editSearchInput.value = '';
      editSearchInput.oninput = () => {
        const query = editSearchInput.value.toLowerCase().trim();
        const items = checklistEl?.querySelectorAll('.edit-user-channel-item');
        items?.forEach(item => {
          const text = item.getAttribute('data-search') || '';
          item.style.display = text.includes(query) ? 'flex' : 'none';
        });
      };
    }

    document.getElementById('btn-edit-user-select-all')?.addEventListener('click', () => {
      checklistEl?.querySelectorAll('input[type="checkbox"]').forEach(b => { b.checked = true; });
      updateSelectedCount();
    });

    document.getElementById('btn-edit-user-clear-all')?.addEventListener('click', () => {
      checklistEl?.querySelectorAll('input[type="checkbox"]').forEach(b => { b.checked = false; });
      updateSelectedCount();
    });

    this.openModal('edit-user-modal');
  }

  // Handle Edit User Form Submission
  handleEditUserSubmit() {
    const uInput = document.getElementById('edit-user-username');
    const nInput = document.getElementById('edit-user-name');
    const rInput = document.getElementById('edit-user-role');
    const dInput = document.getElementById('edit-user-max-devices');
    const limitInput = document.getElementById('edit-user-daily-limit');
    const modeInput = document.getElementById('edit-user-watch-mode');
    const startInput = document.getElementById('edit-user-hours-start');
    const endInput = document.getElementById('edit-user-hours-end');
    const expiryInput = document.getElementById('edit-user-expiry');
    const accessInput = document.getElementById('edit-user-channel-access');
    const checklistEl = document.getElementById('edit-user-channels-checklist');

    const username = uInput ? uInput.value : '';
    if (!username) return;

    const selectedChannels = [];
    if (checklistEl) {
      checklistEl.querySelectorAll('input[type="checkbox"]:checked').forEach(box => {
        selectedChannels.push(box.value);
      });
    }

    const updates = {
      name: nInput ? nInput.value.trim() : username,
      role: rInput ? rInput.value : 'user',
      maxDevices: dInput ? parseInt(dInput.value, 10) : 2,
      dailyLimitMinutes: limitInput ? parseInt(limitInput.value, 10) : 0,
      watchHoursMode: modeInput ? modeInput.value : 'all',
      watchHoursStart: startInput ? startInput.value : '08:00',
      watchHoursEnd: endInput ? endInput.value : '22:00',
      expiresAt: expiryInput ? (expiryInput.value || null) : null,
      channelAccess: accessInput ? accessInput.value : 'all',
      allowedChannels: selectedChannels
    };

    const res = this.auth.updateUserSettings(username, updates);
    if (!res.success) {
      alert(res.message);
      return;
    }

    this.closeModal('edit-user-modal');
    this.renderUsersList();
    this.renderCategories();
    this.renderChannels();

    if (this.remote) {
      this.remote.showToast(res.message);
    }
  }

  // Open Change Password Modal for target user
  openChangePasswordModal(targetUsername = null) {
    if (!this.auth || !this.auth.isLoggedIn()) {
      this.openModal('login-modal');
      return;
    }

    const currentUser = this.auth.getCurrentUser();
    const target = targetUsername || currentUser.username;
    const isSelf = currentUser.username.toLowerCase() === target.toLowerCase();
    const isAdmin = this.auth.isAdmin();
    const isTargetAdmin = target.toLowerCase() === 'admin';

    const targetInput = document.getElementById('change-pw-target-username');
    const badgeEl = document.getElementById('change-pw-user-badge');
    const currentRow = document.getElementById('change-pw-current-row');
    const currentInput = document.getElementById('change-pw-current');
    const newInput = document.getElementById('change-pw-new');
    const confirmInput = document.getElementById('change-pw-confirm');
    const subtitle = document.getElementById('change-pw-subtitle');

    if (targetInput) targetInput.value = target;
    if (badgeEl) badgeEl.textContent = `@${target}`;

    if (subtitle) {
      if (isTargetAdmin && isSelf) {
        subtitle.textContent = 'Updating Administrator master security password';
      } else if (isSelf) {
        subtitle.textContent = 'Updating your personal password';
      } else {
        subtitle.textContent = `Admin reset password for user @${target}`;
      }
    }

    // If admin is resetting another user's password, current password is not needed
    if (currentRow) {
      if (isSelf) {
        currentRow.classList.remove('hidden');
        if (currentInput) currentInput.required = true;
      } else {
        currentRow.classList.add('hidden');
        if (currentInput) {
          currentInput.required = false;
          currentInput.value = '';
        }
      }
    }

    if (currentInput) currentInput.value = '';
    if (newInput) newInput.value = '';
    if (confirmInput) confirmInput.value = '';

    this.openModal('change-password-modal');
  }

  // Handle Change Password Form Submission
  handleChangePasswordSubmit() {
    const targetInput = document.getElementById('change-pw-target-username');
    const currentInput = document.getElementById('change-pw-current');
    const newInput = document.getElementById('change-pw-new');
    const confirmInput = document.getElementById('change-pw-confirm');

    const target = targetInput ? targetInput.value : '';
    const current = currentInput ? currentInput.value.trim() : null;
    const newPw = newInput ? newInput.value.trim() : '';
    const confirmPw = confirmInput ? confirmInput.value.trim() : '';

    if (!newPw) {
      alert("Please enter a new password.");
      return;
    }

    if (newPw !== confirmPw) {
      alert("New password and confirmation do not match.");
      return;
    }

    const res = this.auth.changePassword(target, newPw, current);
    if (!res.success) {
      alert(res.message);
      return;
    }

    this.closeModal('change-password-modal');
    document.getElementById('change-password-form')?.reset();

    if (this.remote) {
      this.remote.showToast(res.message);
    }
  }

  // Modal helpers
  openModal(modalId) {
    if ((modalId === 'settings-modal' || modalId === 'epg-modal' || modalId === 'user-management-modal' || modalId === 'edit-user-modal') && this.auth && !this.auth.isAdmin()) {
      if (this.remote) {
        this.remote.showToast(modalId === 'epg-modal' ? "EPG Guide is disabled for users." : (modalId === 'settings-modal' ? "Settings is disabled for users." : "Permission denied: Admin access required."));
      }
      return;
    }
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.remove('hidden');
      modal.classList.add('flex', 'active');
      modal.style.setProperty('display', 'flex', 'important');
      modal.style.zIndex = '99999';
    }
  }

  closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.add('hidden');
      modal.classList.remove('flex', 'active');
      modal.style.setProperty('display', 'none', 'important');
    }
  }

  // Register PWA service worker
  registerPWA() {
    if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
      navigator.serviceWorker.register('./service-worker.js').catch(err => {
        console.log("Service worker registration skipped on local/file:", err);
      });
    }
  }
}

// Bulletproof Application Bootstrapper
function bootTamilIPTV() {
  if (window.app) return;
  try {
    console.log("⚡ Booting YOU TV Application...");
    window.app = new TamilIPTVApp();
  } catch (err) {
    console.error("Fatal error booting TamilIPTVApp:", err);
  }
}

// Immediate execution if DOM is ready, or bind to events
if (document.readyState === 'complete' || document.readyState === 'interactive') {
  bootTamilIPTV();
} else {
  document.addEventListener('DOMContentLoaded', bootTamilIPTV);
  window.addEventListener('load', bootTamilIPTV);
}
