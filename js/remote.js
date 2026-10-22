/**
 * Tamil IPTV - TV Remote & Keyboard Navigation Controller
 * Supports authentic TV remote simulation, numeric channel dialing, and hotkeys.
 */

class TVRemoteController {
  constructor(app) {
    this.app = app;
    this.digitBuffer = "";
    this.digitTimeout = null;
    this.channelDialOverlay = document.getElementById('channel-dial-overlay');
    this.dialNumberText = document.getElementById('dial-number-text');

    this.bindKeyboardShortcuts();
    this.bindVirtualRemoteButtons();
  }

  // Keyboard navigation
  bindKeyboardShortcuts() {
    window.addEventListener('keydown', (e) => {
      // Ignore keystrokes when typing inside inputs or textareas
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) {
        return;
      }

      // Numeric channel dialing (0-9)
      if (e.key >= '0' && e.key <= '9') {
        e.preventDefault();
        if (this.app.auth && !this.app.auth.isLoggedIn()) {
          this.app.showLoginRequiredUI();
          this.app.openModal('login-modal');
          return;
        }
        this.handleDigitInput(e.key);
        return;
      }

      switch (e.code) {
        case 'ArrowUp':
        case 'KeyW':
          e.preventDefault();
          this.app.prevChannel();
          break;

        case 'ArrowDown':
        case 'KeyS':
          e.preventDefault();
          this.app.nextChannel();
          break;

        case 'ArrowRight':
          e.preventDefault();
          if (this.app.player) {
            const newVol = Math.min(1, this.app.player.videoElement.volume + 0.1);
            this.app.player.setVolume(newVol);
            this.showToast(`Volume: ${Math.round(newVol * 100)}%`);
          }
          break;

        case 'ArrowLeft':
          e.preventDefault();
          if (this.app.player) {
            const newVol = Math.max(0, this.app.player.videoElement.volume - 0.1);
            this.app.player.setVolume(newVol);
            this.showToast(`Volume: ${Math.round(newVol * 100)}%`);
          }
          break;

        case 'Space':
        case 'KeyK':
          e.preventDefault();
          if (this.app.auth && !this.app.auth.isLoggedIn()) {
            this.app.showLoginRequiredUI();
            this.app.openModal('login-modal');
            return;
          }
          if (this.app.player) this.app.player.togglePlay();
          break;

        case 'KeyF':
          e.preventDefault();
          if (this.app.player) this.app.player.toggleFullscreen();
          break;

        case 'KeyM':
          e.preventDefault();
          if (this.app.player) {
            this.app.player.toggleMute();
            this.showToast(this.app.player.videoElement.muted ? "Muted 🔇" : "Unmuted 🔊");
          }
          break;

        case 'KeyP':
          e.preventDefault();
          if (this.app.player) this.app.player.togglePiP();
          break;

        case 'KeyA':
          e.preventDefault();
          if (this.app.player) {
            const mode = this.app.player.cycleAspectRatio();
            this.showToast(`Aspect: ${mode}`);
          }
          break;

        case 'KeyR':
          e.preventDefault();
          this.toggleVirtualRemote();
          break;

        case 'Escape':
          this.closeAllModals();
          break;

        default:
          break;
      }
    });
  }

  // Handle number pad dialing e.g. "14" -> Channel 14
  handleDigitInput(digit) {
    this.digitBuffer += digit;
    this.showDialOverlay(this.digitBuffer);

    clearTimeout(this.digitTimeout);
    this.digitTimeout = setTimeout(() => {
      const targetChNum = parseInt(this.digitBuffer, 10);
      this.digitBuffer = "";
      this.hideDialOverlay();

      if (!isNaN(targetChNum)) {
        this.app.tuneToChannelNumber(targetChNum);
      }
    }, 1200);
  }

  showDialOverlay(numberStr) {
    if (!this.channelDialOverlay || !this.dialNumberText) return;
    this.dialNumberText.textContent = `CH ${numberStr.padStart(2, '0')}`;
    this.channelDialOverlay.classList.remove('hidden');
    this.channelDialOverlay.classList.remove('opacity-0');
    this.channelDialOverlay.classList.add('opacity-100');
  }

  hideDialOverlay() {
    if (!this.channelDialOverlay) return;
    this.channelDialOverlay.classList.add('opacity-0');
    setTimeout(() => {
      this.channelDialOverlay.classList.add('hidden');
    }, 300);
  }

  // Bind Virtual Remote Drawer buttons
  bindVirtualRemoteButtons() {
    const remoteEl = document.getElementById('virtual-remote-modal');
    if (!remoteEl) return;

    // Digits 0-9
    remoteEl.querySelectorAll('[data-remote-num]').forEach(btn => {
      btn.addEventListener('click', () => {
        if (this.app.auth && !this.app.auth.isLoggedIn()) {
          this.app.showLoginRequiredUI();
          this.app.openModal('login-modal');
          return;
        }
        const num = btn.getAttribute('data-remote-num');
        this.handleDigitInput(num);
      });
    });

    // D-Pad and standard controls
    const bindBtn = (id, callback) => {
      const btn = document.getElementById(id);
      if (btn) btn.addEventListener('click', callback);
    };

    bindBtn('remote-ch-up', () => this.app.prevChannel());
    bindBtn('remote-ch-down', () => this.app.nextChannel());
    bindBtn('remote-vol-up', () => {
      if (this.app.player) {
        const newVol = Math.min(1, this.app.player.videoElement.volume + 0.1);
        this.app.player.setVolume(newVol);
        this.showToast(`Volume: ${Math.round(newVol * 100)}%`);
      }
    });
    bindBtn('remote-vol-down', () => {
      if (this.app.player) {
        const newVol = Math.max(0, this.app.player.videoElement.volume - 0.1);
        this.app.player.setVolume(newVol);
        this.showToast(`Volume: ${Math.round(newVol * 100)}%`);
      }
    });
    bindBtn('remote-mute', () => {
      if (this.app.player) this.app.player.toggleMute();
    });
    bindBtn('remote-power', () => {
      if (this.app.auth && !this.app.auth.isLoggedIn()) {
        this.app.showLoginRequiredUI();
        this.app.openModal('login-modal');
        return;
      }
      if (this.app.player) this.app.player.togglePlay();
    });
    bindBtn('remote-fullscreen', () => {
      if (this.app.player) this.app.player.toggleFullscreen();
    });
    bindBtn('remote-epg', () => {
      this.app.toggleGuideView();
    });
    bindBtn('remote-info', () => {
      if (this.app.player) this.app.player.showOSD();
    });
  }

  toggleVirtualRemote() {
    const modal = document.getElementById('virtual-remote-modal');
    if (!modal) return;
    if (modal.classList.contains('hidden') || modal.style.display === 'none') {
      modal.classList.remove('hidden');
      modal.classList.add('flex', 'active');
      modal.style.setProperty('display', 'flex', 'important');
      modal.style.zIndex = '99999';
    } else {
      modal.classList.add('hidden');
      modal.classList.remove('flex', 'active');
      modal.style.setProperty('display', 'none', 'important');
    }
  }

  closeAllModals() {
    document.querySelectorAll('.app-modal').forEach(m => {
      m.classList.add('hidden');
      m.classList.remove('flex', 'active');
      m.style.setProperty('display', 'none', 'important');
    });
  }

  showToast(message, duration = 3000, actionCallback = null, actionText = 'Undo') {
    let toast = document.getElementById('app-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'app-toast';
      document.body.appendChild(toast);
    }
    toast.className = 'fixed bottom-8 left-1/2 -translate-x-1/2 z-50 bg-slate-900/95 text-white border border-slate-700/80 px-4 py-2.5 rounded-xl shadow-2xl backdrop-blur-md text-sm font-medium transition-all duration-300 flex items-center space-x-3 opacity-0 translate-y-2 ' + (actionCallback ? 'pointer-events-auto' : 'pointer-events-none');
    
    toast.innerHTML = `
      <span>${message}</span>
      ${actionCallback ? `<button id="toast-action-btn" class="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition-colors shadow shadow-rose-950 cursor-pointer">${actionText}</button>` : ''}
    `;

    if (actionCallback) {
      const btn = toast.querySelector('#toast-action-btn');
      if (btn) {
        btn.onclick = () => {
          actionCallback();
          toast.classList.add('opacity-0', 'translate-y-2');
          toast.classList.remove('opacity-100', 'translate-y-0');
        };
      }
    }

    toast.classList.remove('opacity-0', 'translate-y-2');
    toast.classList.add('opacity-100', 'translate-y-0');

    clearTimeout(this.toastTimeout);
    this.toastTimeout = setTimeout(() => {
      toast.classList.add('opacity-0', 'translate-y-2');
      toast.classList.remove('opacity-100', 'translate-y-0');
    }, duration);
  }
}
