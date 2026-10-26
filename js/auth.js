/**
 * Tamil IPTV - Authentication & User Management Service
 * Provides secure client-side role-based access control (Admin & Regular User).
 * Only administrators can add/edit/delete channels, create users, manage devices,
 * set watch time limits, assign channel access, and reset passwords.
 */

class AuthManager {
  constructor() {
    this.STORAGE_USERS_KEY = 'tamil_iptv_users';
    this.STORAGE_SESSION_KEY = 'tamil_iptv_current_user';
    this.currentUser = null;
    this.init();
  }

  // Generate or retrieve persistent unique device ID for this client/browser
  getDeviceId() {
    let devId = null;
    if (typeof SafeStorage !== 'undefined') {
      devId = SafeStorage.getItem('tamil_iptv_device_id');
    }
    if (!devId) {
      devId = 'dev_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now().toString(36);
      if (typeof SafeStorage !== 'undefined') {
        SafeStorage.setItem('tamil_iptv_device_id', devId);
      }
    }
    return devId;
  }

  // Get human-friendly label for current device / browser
  getDeviceName() {
    const ua = (typeof navigator !== 'undefined' && navigator.userAgent) ? navigator.userAgent : '';
    let os = 'Device';
    if (/android/i.test(ua)) os = 'Android Device';
    else if (/ipad|iphone|ipod/i.test(ua)) os = 'iOS Device';
    else if (/windows nt 10/i.test(ua)) os = 'Windows 10/11 PC';
    else if (/windows/i.test(ua)) os = 'Windows PC';
    else if (/macintosh|mac os x/i.test(ua)) os = 'Mac';
    else if (/linux/i.test(ua)) os = 'Linux PC';

    let browser = 'Browser';
    if (/edg/i.test(ua)) browser = 'Edge';
    else if (/chrome/i.test(ua)) browser = 'Chrome';
    else if (/firefox/i.test(ua)) browser = 'Firefox';
    else if (/safari/i.test(ua)) browser = 'Safari';

    return `${browser} on ${os}`;
  }

  init() {
    // 1. Ensure default admin user exists and upgrade user models with new RBAC fields
    const users = this.getUsers();
    let hasAdmin = false;
    let modified = false;

    for (let u of users) {
      if (u.username.toLowerCase() === 'admin') hasAdmin = true;

      // Migrate / ensure default fields exist for all users
      if (typeof u.maxDevices === 'undefined') {
        u.maxDevices = (u.role === 'admin' ? 10 : 2);
        modified = true;
      }
      if (!Array.isArray(u.activeDevices)) {
        u.activeDevices = [];
        modified = true;
      }
      if (typeof u.dailyLimitMinutes === 'undefined') {
        u.dailyLimitMinutes = 0; // 0 = unlimited
        modified = true;
      }
      if (typeof u.watchHoursMode === 'undefined') {
        u.watchHoursMode = 'all'; // 'all' or 'custom'
        modified = true;
      }
      if (!u.watchHoursStart) {
        u.watchHoursStart = '08:00';
        modified = true;
      }
      if (!u.watchHoursEnd) {
        u.watchHoursEnd = '22:00';
        modified = true;
      }
      if (typeof u.channelAccess === 'undefined') {
        u.channelAccess = 'all'; // 'all' or 'selected'
        modified = true;
      }
      if (!Array.isArray(u.allowedChannels)) {
        u.allowedChannels = [];
        modified = true;
      }
    }
    
    if (!hasAdmin) {
      const defaultAdmin = {
        username: 'admin',
        password: 'admin', // default credentials (also accepts admin123)
        role: 'admin',
        name: 'Administrator',
        maxDevices: 10,
        activeDevices: [],
        dailyLimitMinutes: 0,
        watchHoursMode: 'all',
        watchHoursStart: '00:00',
        watchHoursEnd: '23:59',
        channelAccess: 'all',
        allowedChannels: [],
        createdAt: new Date().toISOString()
      };
      users.unshift(defaultAdmin);
      modified = true;
    }

    if (modified) {
      this.saveUsers(users);
    }

    // 2. Restore active session if valid
    try {
      if (typeof SafeStorage !== 'undefined') {
        const session = SafeStorage.getJSON(this.STORAGE_SESSION_KEY, null);
        if (session && session.username) {
          const user = this.getUser(session.username);
          if (user) {
            const currentDevId = this.getDeviceId();
            // Verify device session is still active for regular users
            if (user.role === 'admin' || (Array.isArray(user.activeDevices) && user.activeDevices.some(d => d.deviceId === currentDevId))) {
              this.currentUser = user;
            } else {
              this.clearSession();
            }
          } else {
            this.clearSession();
          }
        }
      }
    } catch (e) {
      this.currentUser = null;
    }

    // 3. Asynchronously check and sync from repository seed (data/users.json)
    this.syncFromRepoSeed();
  }

  // Merge users from repo seed data (data/users.json) if available
  async syncFromRepoSeed() {
    try {
      if (typeof fetch === 'undefined') return;
      const res = await fetch('data/users.json');
      if (res.ok) {
        const repoUsers = await res.json();
        if (Array.isArray(repoUsers) && repoUsers.length > 0) {
          const localUsers = this.getUsers();
          let modified = false;
          repoUsers.forEach(ru => {
            if (!ru || !ru.username) return;
            const idx = localUsers.findIndex(u => u.username.toLowerCase() === ru.username.toLowerCase());
            if (idx === -1) {
              localUsers.push(ru);
              modified = true;
            }
          });
          if (modified) {
            this.saveUsers(localUsers);
            if (window.app && typeof window.app.renderUsersList === 'function') {
              window.app.renderUsersList();
            }
          }
        }
      }
    } catch (e) {
      // offline / file protocol
    }
  }

  // Import incoming users array from sync payload
  importUsers(incomingUsers = []) {
    if (!Array.isArray(incomingUsers)) return { imported: 0 };
    const localUsers = this.getUsers();
    let imported = 0;
    incomingUsers.forEach(iu => {
      if (!iu || !iu.username) return;
      const idx = localUsers.findIndex(u => u.username.toLowerCase() === iu.username.toLowerCase());
      if (idx !== -1) {
        localUsers[idx] = { ...localUsers[idx], ...iu };
      } else {
        localUsers.push(iu);
        imported++;
      }
    });
    this.saveUsers(localUsers);
    return { imported, total: localUsers.length };
  }

  // Retrieve all registered users
  getUsers() {
    if (typeof SafeStorage !== 'undefined') {
      return SafeStorage.getJSON(this.STORAGE_USERS_KEY, []);
    }
    return [];
  }

  // Persist users to SafeStorage
  saveUsers(users) {
    if (typeof SafeStorage !== 'undefined') {
      SafeStorage.setJSON(this.STORAGE_USERS_KEY, users);
    }
  }

  // Find user by username (case-insensitive)
  getUser(username) {
    const users = this.getUsers();
    return users.find(u => u.username.toLowerCase() === (username || '').toLowerCase().trim());
  }

  // Authenticate user with credentials and enforce device limits & expiry
  login(username, password) {
    username = (username || '').trim();
    password = (password || '').trim();

    if (!username || !password) {
      return { success: false, message: 'Please enter both username and password.' };
    }

    const users = this.getUsers();
    const userIndex = users.findIndex(u => u.username.toLowerCase() === username.toLowerCase());
    if (userIndex === -1) {
      return { success: false, message: 'Invalid username or password.' };
    }

    const user = users[userIndex];

    // Match password (also accept 'admin123' if default admin password is 'admin')
    const isMatch = (user.password === password) || 
      (user.username.toLowerCase() === 'admin' && user.password === 'admin' && password === 'admin123');

    if (!isMatch) {
      return { success: false, message: 'Invalid username or password.' };
    }

    // 1. Account Expiration Check
    if (user.role !== 'admin' && user.expiresAt) {
      const expTime = user.expiresAt.includes('T')
        ? new Date(user.expiresAt).getTime()
        : new Date(user.expiresAt + 'T23:59:59').getTime();
      if (Date.now() > expTime) {
        const formatted = new Date(expTime).toLocaleString();
        return { 
          success: false, 
          message: `This account expired on ${formatted}. Please contact Administrator.` 
        };
      }
    }

    // 2. Device Limit Enforcement
    const currentDeviceId = this.getDeviceId();
    const currentDeviceName = this.getDeviceName();
    const maxDevices = Number(user.maxDevices) || (user.role === 'admin' ? 10 : 2);
    let activeDevices = Array.isArray(user.activeDevices) ? user.activeDevices : [];

    const existingDeviceIndex = activeDevices.findIndex(d => d.deviceId === currentDeviceId);

    if (existingDeviceIndex !== -1) {
      // Device is already registered - update last active timestamp
      activeDevices[existingDeviceIndex].lastActive = new Date().toISOString();
      activeDevices[existingDeviceIndex].deviceName = currentDeviceName;
    } else {
      // New device attempting to log in
      if (activeDevices.length >= maxDevices) {
        return { 
          success: false, 
          message: `Device limit reached! Maximum allowed devices for this account is ${maxDevices}. Currently active on ${activeDevices.length} device(s). Please log out from another device or ask Administrator to reset your sessions.` 
        };
      }

      activeDevices.push({
        deviceId: currentDeviceId,
        deviceName: currentDeviceName,
        loggedInAt: new Date().toISOString(),
        lastActive: new Date().toISOString()
      });
    }

    user.activeDevices = activeDevices;
    users[userIndex] = user;
    this.saveUsers(users);

    this.currentUser = user;

    if (typeof SafeStorage !== 'undefined') {
      SafeStorage.setJSON(this.STORAGE_SESSION_KEY, {
        username: user.username,
        role: user.role,
        name: user.name,
        deviceId: currentDeviceId
      });
    }

    return { success: true, user: this.currentUser };
  }

  // End active session for current device
  logout() {
    if (this.currentUser) {
      const currentDeviceId = this.getDeviceId();
      const users = this.getUsers();
      const userIndex = users.findIndex(u => u.username.toLowerCase() === this.currentUser.username.toLowerCase());
      if (userIndex !== -1) {
        const user = users[userIndex];
        if (Array.isArray(user.activeDevices)) {
          user.activeDevices = user.activeDevices.filter(d => d.deviceId !== currentDeviceId);
          users[userIndex] = user;
          this.saveUsers(users);
        }
      }
    }
    this.currentUser = null;
    this.clearSession();
  }

  clearSession() {
    if (typeof SafeStorage !== 'undefined') {
      SafeStorage.setItem(this.STORAGE_SESSION_KEY, '');
      SafeStorage.setJSON(this.STORAGE_SESSION_KEY, null);
    }
  }

  // Real-time verification of session status (used by app heartbeat)
  checkSessionActive() {
    if (!this.currentUser) {
      return { valid: false, reason: 'No active session.' };
    }

    const user = this.getUser(this.currentUser.username);
    if (!user) {
      return { valid: false, reason: 'User account has been deleted.' };
    }

    // Keep currentUser in-memory profile synchronized
    this.currentUser = user;

    if (user.role === 'admin') {
      return { valid: true };
    }

    // Expiry check
    if (user.expiresAt) {
      const expTime = user.expiresAt.includes('T')
        ? new Date(user.expiresAt).getTime()
        : new Date(user.expiresAt + 'T23:59:59').getTime();
      if (Date.now() > expTime) {
        const formatted = new Date(expTime).toLocaleString();
        return { valid: false, reason: `Your account expired on ${formatted}. Please contact Administrator.` };
      }
    }

    // Active device check
    const currentDeviceId = this.getDeviceId();
    const hasDevice = Array.isArray(user.activeDevices) && user.activeDevices.some(d => d.deviceId === currentDeviceId);
    if (!hasDevice) {
      return { valid: false, reason: 'Your session was logged out by an administrator or revoked.' };
    }

    return { valid: true };
  }

  // Admin feature: Terminate all active device sessions for a user
  forceLogoutUser(username) {
    if (!this.isAdmin()) {
      return { success: false, message: 'Permission denied: Only administrators can logout users.' };
    }

    username = (username || '').trim().toLowerCase();
    const users = this.getUsers();
    const userIndex = users.findIndex(u => u.username.toLowerCase() === username);

    if (userIndex === -1) {
      return { success: false, message: 'User not found.' };
    }

    users[userIndex].activeDevices = [];
    users[userIndex].forceLogoutAt = Date.now();
    this.saveUsers(users);

    return { success: true, message: `All active sessions for @${username} have been logged out.` };
  }

  // Admin feature: Terminate a specific device session for a user
  logoutDevice(username, deviceId) {
    if (!this.isAdmin()) {
      return { success: false, message: 'Permission denied: Only administrators can logout devices.' };
    }

    username = (username || '').trim().toLowerCase();
    const users = this.getUsers();
    const userIndex = users.findIndex(u => u.username.toLowerCase() === username);

    if (userIndex === -1) {
      return { success: false, message: 'User not found.' };
    }

    if (Array.isArray(users[userIndex].activeDevices)) {
      users[userIndex].activeDevices = users[userIndex].activeDevices.filter(d => d.deviceId !== deviceId);
      this.saveUsers(users);
    }

    return { success: true, message: 'Device session terminated successfully.' };
  }

  // Admin feature: Update user configuration (Device limit, Watch time, Allowed channels, Expiry)
  updateUserSettings(username, updates = {}) {
    if (!this.isAdmin()) {
      return { success: false, message: 'Permission denied: Only administrators can update user settings.' };
    }

    username = (username || '').trim().toLowerCase();
    const users = this.getUsers();
    const userIndex = users.findIndex(u => u.username.toLowerCase() === username);

    if (userIndex === -1) {
      return { success: false, message: 'User not found.' };
    }

    const user = users[userIndex];

    if (typeof updates.name === 'string') user.name = updates.name.trim() || user.username;
    if (typeof updates.role === 'string' && user.username !== 'admin') {
      user.role = (updates.role === 'admin' ? 'admin' : 'user');
    }

    // Device limits
    if (typeof updates.maxDevices !== 'undefined') {
      const maxDev = parseInt(updates.maxDevices, 10);
      user.maxDevices = (!isNaN(maxDev) && maxDev >= 1) ? maxDev : 2;
    }

    // Watch time limit (daily minutes)
    if (typeof updates.dailyLimitMinutes !== 'undefined') {
      const limit = parseInt(updates.dailyLimitMinutes, 10);
      user.dailyLimitMinutes = (!isNaN(limit) && limit >= 0) ? limit : 0;
    }

    // Allowed watching hours window
    if (typeof updates.watchHoursMode === 'string') {
      user.watchHoursMode = updates.watchHoursMode === 'custom' ? 'custom' : 'all';
    }
    if (updates.watchHoursStart) user.watchHoursStart = updates.watchHoursStart;
    if (updates.watchHoursEnd) user.watchHoursEnd = updates.watchHoursEnd;

    // Account expiry
    user.expiresAt = updates.expiresAt ? updates.expiresAt : null;

    // Channel access restrictions
    if (typeof updates.channelAccess === 'string') {
      user.channelAccess = updates.channelAccess === 'selected' ? 'selected' : 'all';
    }
    if (Array.isArray(updates.allowedChannels)) {
      user.allowedChannels = updates.allowedChannels;
    }

    users[userIndex] = user;
    this.saveUsers(users);

    if (this.currentUser && this.currentUser.username.toLowerCase() === username) {
      this.currentUser = user;
    }

    return { success: true, message: `Settings for @${username} updated successfully!`, user };
  }

  // Check if currently authenticated user has admin privileges
  isAdmin() {
    return !!(this.currentUser && this.currentUser.role === 'admin');
  }

  // Check if any user is currently logged in
  isLoggedIn() {
    return !!this.currentUser;
  }

  // Get active user object
  getCurrentUser() {
    return this.currentUser;
  }

  // Admin feature: Create a new user account with complete configuration
  createUser(username, password, role = 'user', name = '', options = {}) {
    if (!this.isAdmin()) {
      return { success: false, message: 'Permission denied: Only administrators can create users.' };
    }

    username = (username || '').trim().toLowerCase();
    password = (password || '').trim();
    name = (name || '').trim() || username;

    if (!username || username.length < 3) {
      return { success: false, message: 'Username must be at least 3 characters long.' };
    }
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      return { success: false, message: 'Username can only contain alphanumeric characters and underscores.' };
    }
    if (!password || password.length < 3) {
      return { success: false, message: 'Password must be at least 3 characters long.' };
    }

    const users = this.getUsers();
    if (users.some(u => u.username.toLowerCase() === username)) {
      return { success: false, message: `Username "${username}" already exists. Please pick another name.` };
    }

    const maxDev = parseInt(options.maxDevices, 10);
    const dailyLimit = parseInt(options.dailyLimitMinutes, 10);

    const newUser = {
      username,
      password,
      role: (role === 'admin' ? 'admin' : 'user'),
      name,
      maxDevices: (!isNaN(maxDev) && maxDev >= 1) ? maxDev : 2,
      activeDevices: [],
      dailyLimitMinutes: (!isNaN(dailyLimit) && dailyLimit >= 0) ? dailyLimit : 0,
      watchHoursMode: options.watchHoursMode === 'custom' ? 'custom' : 'all',
      watchHoursStart: options.watchHoursStart || '08:00',
      watchHoursEnd: options.watchHoursEnd || '22:00',
      expiresAt: options.expiresAt || null,
      channelAccess: options.channelAccess === 'selected' ? 'selected' : 'all',
      allowedChannels: Array.isArray(options.allowedChannels) ? options.allowedChannels : [],
      createdAt: new Date().toISOString()
    };

    users.push(newUser);
    this.saveUsers(users);

    return { success: true, user: newUser };
  }

  // Change password for target user
  changePassword(targetUsername, newPassword, currentPassword = null) {
    if (!this.isLoggedIn()) {
      return { success: false, message: 'You must be logged in to change passwords.' };
    }

    targetUsername = (targetUsername || '').trim().toLowerCase();
    newPassword = (newPassword || '').trim();

    if (!newPassword || newPassword.length < 3) {
      return { success: false, message: 'New password must be at least 3 characters long.' };
    }

    const isSelf = this.currentUser.username.toLowerCase() === targetUsername;
    const isAdministrator = this.isAdmin();

    // If changing another user's password, caller MUST be admin
    if (!isSelf && !isAdministrator) {
      return { success: false, message: "Permission denied: Only administrators can reset other users' passwords." };
    }

    const users = this.getUsers();
    const userIndex = users.findIndex(u => u.username.toLowerCase() === targetUsername);
    if (userIndex === -1) {
      return { success: false, message: 'Target user not found.' };
    }

    // If self-changing password and not admin override, verify current password
    if (isSelf && currentPassword !== null) {
      const activeUser = users[userIndex];
      const matchCurrent = (activeUser.password === currentPassword) || 
        (activeUser.username === 'admin' && activeUser.password === 'admin' && currentPassword === 'admin123');
      if (!matchCurrent) {
        return { success: false, message: 'Current password does not match.' };
      }
    }

    users[userIndex].password = newPassword;
    this.saveUsers(users);

    // If active user updated their own password, keep session fresh
    if (isSelf) {
      this.currentUser = users[userIndex];
      if (typeof SafeStorage !== 'undefined') {
        SafeStorage.setJSON(this.STORAGE_SESSION_KEY, {
          username: this.currentUser.username,
          role: this.currentUser.role,
          name: this.currentUser.name,
          deviceId: this.getDeviceId()
        });
      }
    }

    return { success: true, message: `Password for "${targetUsername}" updated successfully.` };
  }

  // Admin feature: Delete a user account
  deleteUser(username) {
    if (!this.isAdmin()) {
      return { success: false, message: 'Permission denied: Only administrators can delete users.' };
    }

    username = (username || '').trim().toLowerCase();

    if (username === 'admin') {
      return { success: false, message: 'The primary system admin account cannot be deleted.' };
    }

    if (this.currentUser && this.currentUser.username.toLowerCase() === username) {
      return { success: false, message: 'You cannot delete your own currently logged-in account.' };
    }

    let users = this.getUsers();
    const beforeCount = users.length;
    users = users.filter(u => u.username.toLowerCase() !== username);

    if (users.length === beforeCount) {
      return { success: false, message: 'User not found.' };
    }

    this.saveUsers(users);
    return { success: true, message: `User "${username}" has been deleted.` };
  }
}

// Global exposure
if (typeof window !== 'undefined') {
  window.AuthManager = AuthManager;
}